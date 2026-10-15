# 公开专家匿名访问 — 后端修改规格（BFF + Python）

**背景**：前端公开页 `/explore/expert/{expertId}` 在用户浏览器残留**失效 JWT** 时，曾频繁出现「专家不存在或未公开」。  
**根因（已用 curl 在 production 复现）**：不是「完全未登录」本身，而是 **带了无效 `Authorization` 时 BFF 提前返回登录错误，且响应里没有 `expert`**。

---

## 1. 复现（验收必测）

以已知公开专家 `exp_39431cc0a0e4` 为例（`visibility=public`）。

### 1.1 正常：不带 Authorization（匿名）

```http
GET /api2/book-experts/exp_39431cc0a0e4?locale=en&ui_locale=en
Accept: application/json
```

**期望**：HTTP `200`，body 含 `expert` 对象，`expert.visibility === "public"`（或与 Python 约定等价值）。

### 1.2 异常（当前 production 问题）：无效 JWT

```http
GET /api2/book-experts/exp_39431cc0a0e4?locale=en&ui_locale=en
Authorization: invalid-or-expired-token
Accept: application/json
```

**当前错误行为（需改掉）**：

```json
{ "code": 900111, "message": "User not logged in", "data": null }
```

HTTP 可能仍为 `200`，但**无 `expert`** → 前端/任何客户端都会判为「不存在」。

**期望行为（本 spec 要求）**：与 §1.1 **相同**——对该 **public** 专家仍返回完整 `expert`；**不得**因 JWT 无效而短路为「未登录」且省略 body。

### 1.3 结论（给产品/后端）

| 场景 | 是否导致误报「不存在」 |
|------|------------------------|
| 用户从未登录、无 token | 通常 **否**（不带 Authorization 时接口正常） |
| 用户曾登录、token **过期/无效**（手机常见） | **是**（旧 BFF 返回 900111 + 无 expert） |
| 专家真 private / 真 404 | **否**（应明确 404 或 403，见 §4） |

前端已在公开页 **omit Authorization**（`getPublicExpertDetail`）作为缓解；**后端仍须修复**，否则其他客户端、旧版前端、或误带 token 的请求仍会失败。

---

## 2. 路由范围

前缀：`/api2/book-experts`（Java BFF → Python）。

本 spec **强制**的只读接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/book-experts/{expertId}` | 公开专家详情（分享页、SEO、爬虫） |
| GET | `/book-experts/public` | 公共广场列表 |

其它写接口（publish、like、distill…）仍可要求有效 JWT。

---

## 3. 鉴权策略（BFF Filter / 路由层）

### 3.1 原则

1. **Public read 不得依赖有效 JWT**  
   对 §2 两个 GET：在路由或 Filter 上标记为 **`optionalAuth`**（有合法 JWT 则解析 userId；无或无效则 **视为匿名**）。
2. **无效 JWT ≠ 阻断 public 读**  
   - 解析失败 / 过期：记录 debug 日志，**不要**对 public 专家返回 `900111` 且空 body。  
   - 继续按 **匿名** 调用 Python 读 `visibility=public` 的专家。
3. **有效 JWT**  
   - 公开专家：与匿名相同返回详情（可附加 `liked_by_me` 等，见 engagement spec）。  
   - 私有专家：仅 **owner**（JWT userId === owner_user_id）返回详情；否则 **404**（推荐）或 **403**（需与前端统一，见 §4）。

### 3.2 伪代码（BFF）

```
optionalUserId = resolveUserIdFromJwtOptional(request)  // 无效则 null，不抛到客户端

if (method == GET && path matches /book-experts/{id}) {
  forward to Python with userId=optionalUserId, locale, ui_locale
  return envelope with expert  // 见 §5
}

if (method == GET && path == /book-experts/public) {
  forward with userId=optionalUserId (query 里若有 userId 与 JWT 冲突时以 JWT 为准或忽略 query userId — 与现网一致即可)
  return experts[]
}
```

**禁止**：在 `optionalUserId == null` 且 expert 为 public 时返回 `900111`。

---

## 4. Python 服务行为

与 `book_expert_display_i18n_spec.md` §4.3 对齐，并补充：

### 4.1 `GET /book-experts/{expertId}`

| visibility | 调用方 | HTTP | Body |
|------------|--------|------|------|
| `public` | 匿名 / 无效 JWT / 任意用户 | 200 | 完整 `expert` + `methodology_preview` |
| `private` | owner（userId 匹配） | 200 | 完整 `expert` |
| `private` | 匿名或其它用户 | **404** | `{ "ok": false, "error": "not_found" }` 或 BFF 统一 404（勿用 900111） |
| 不存在 | 任意 | **404** | 明确 not found |

**必须字段**（公开详情）：`expert_id`, `expert_name`, `visibility`（值 `"public"`）, `methodology_preview`（详情）, `cover_url`（可选）, `book_title`（可选）, locale 相关展示字段。

### 4.2 `GET /book-experts/public`

- 仅 `visibility=public` 的专家。
- **匿名可读**；不得因无 JWT 返回空列表 + 900111。
- Query：`locale`, `ui_locale`, `page`, `pageSize`, `topicCategoryId`, `userId`（可选）, `exclude_own`（可选，需有效 owner 身份时才生效）。

---

## 5. 响应信封（与前端契约）

前端 `bookExpert.ts` 已兼容两种形态，但 **请 BFF 统一为一种**，推荐与现有 book-expert 写接口一致：

```json
{
  "ok": true,
  "expert": {
    "expert_id": "exp_…",
    "expert_name": "…",
    "book_title": "…",
    "visibility": "public",
    "methodology_preview": { … },
    "cover_url": "…",
    "open_count": 0,
    "like_count": 0
  }
}
```

列表：

```json
{
  "ok": true,
  "experts": [ … ],
  "count": 42
}
```

**不要**对 public 成功读返回：

```json
{ "code": 900111, "message": "User not logged in", "data": null }
```

若全站仍使用 `R<T>`（`code`/`data`），则 **`code === 0` 且 `data.expert` 必须存在**；`900111` 仅用于**必须登录**的写接口或私有资源且 caller 未认证。

---

## 6. 错误码约定

| 情况 | HTTP | 业务码 / body |
|------|------|----------------|
| 公开专家，匿名或坏 JWT | 200 | `ok: true`, `expert` |
| 私有专家，非 owner | 404 | `ok: false` 或 BFF 404，message 可本地化 |
| expertId 不存在 | 404 | 同上 |
| 必须登录的写接口无 JWT | 401 或 200+code | 可用 900111，但 **不得**用于 public GET |

---

## 7. 验收清单（QA）

- [ ] §1.1 curl 通过  
- [ ] §1.2 **无效 Authorization** curl 与 §1.1 **响应 body 等价**（public 专家）  
- [ ] private 专家：匿名 GET → 404，owner 带 JWT → 200  
- [ ] `GET /book-experts/public` 无 Authorization → `experts.length >= 0`，无 900111  
- [ ] 响应含 `visibility: "public"`（公开详情）  
- [ ] 前端公开页 `/explore/expert/{id}` 在「曾登录后 token 过期」账号下仍可打开（可选：临时恢复旧前端带 token 请求做回归）

---

## 8. 相关文档

- `book_expert_display_i18n_spec.md` §4.3 — 匿名可读公开专家  
- `book_expert_engagement_spec.md` — 列表/详情计数字段  
- `book_expert_public_page_errors.md` — 前端侧排查与已做缓解  

---

## 9. 版本

- 文档版本：2026-10-15  
- 前端依赖：`getPublicExpertDetail`（omitAuth）、`extractExpertFromDetailPayload`（commit ≥ `f1f9abe`）
