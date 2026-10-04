# Book Expert 主题分类 — 后端实现 Spec

> **读者**：Python（`ai-design-poster` / `book_expert`）+ Java BFF（`pagereader-backend`）  
> **目标**：专家公开到广场时携带与 **作品探索 Feed** 相同的主题分类 slug（如 `education`），支持 owner 在发布前本地预选、发布时写入、已公开后修改。  
> **前端仓库**：`pagereader_front`（`BookExpertChat.vue`、`bookExpert.ts`、`pickExpertTopicCategoryId`）

---

## 0. 产品规则

| 场景 | 期望 |
|------|------|
| Owner 在专家聊天页选择「主题分类」 | 与 `ProjectPreview` 一致：分类列表来自 `GET /www/model/feed/categories`（失败时前端 fallback） |
| 专家仍为 **private** | 选择仅保存在浏览器 `sessionStorage`（key `book-expert-topic-category:{expertId}`），**不要求**后端持久化 |
| **首次发布**（`POST .../publish`，`public: true`） | 请求体携带 `topicCategoryId` / `topic_category_id`；写入专家元数据并用于公共列表筛选 |
| 已 **public** 的 expert | `PUT .../category` 更新分类（owner）；与 `PUT /project/{id}/category` 语义对齐 |
| 公共列表 | `GET .../public` 可选 `category` / `topicCategoryId` 查询参数，仅返回该 slug 的专家 |
| 非 owner | 不可改分类；summary 可读 `topic_category_id` + 展示名 |

**slug 校验**：必须与 Feed 分类表一致（与作品 `share-to-community` 的 `categoryId` 同一套）。未知 slug → `400 INVALID_CATEGORY`。

---

## 1. 现状与缺口（2026-10）

| 组件 | 现状 | 缺口 |
|------|------|------|
| `expert_summary()` / MySQL expert 行 | 无 `topic_category_id` | 持久化字段 + 迁移 |
| `POST .../publish` | 仅 `public` / visibility | 接受并保存 `topic_category_id` |
| `GET .../mine`、`GET .../public` | 返回基础 summary | 增加 `topic_category_id`、`topic_category_name`（camelCase 兼容见 §3） |
| `PUT .../category` | 不存在 | 新增 owner 接口 |
| BFF `/api2/book-experts/*` | 透传 publish | 代理 category PUT；JWT 注入 `userId` |

---

## 2. 数据模型（Python / MySQL）

在 `book_experts`（或等价表）增加：

| 列 | 类型 | 说明 |
|----|------|------|
| `topic_category_id` | `VARCHAR(64) NULL` | Feed slug，如 `education`；private 可为 NULL |
| `topic_category_name` | `VARCHAR(128) NULL` | 冗余展示名（中/英由 catalog 解析，便于列表少 join） |

**`expert_summary()` 输出**（JSON）增加：

```json
{
  "topic_category_id": "education",
  "topic_category_name": "教育"
}
```

（BFF 可同时返回 camelCase：`topicCategoryId`、`topicCategoryName`。）

**发布时**：若 body 带 `topicCategoryId` 且 `public=true`，写入上述字段；若 public 但未带分类，允许 NULL（前端会尽量预选，后端不强制）。

**取消公开**（`public: false`）：可保留分类供下次再公开，或清空 — 建议 **保留**（与作品行为一致）。

---

## 3. HTTP API（Python 或 BFF 统一前缀）

以下路径与前端 `bookExpert.ts` 对齐；BFF 建议前缀 `/api2/book-experts`。

### 3.1 `POST /book-experts/{expertId}/publish`

**Query**：`userId`（BFF 以 JWT 为准，可忽略客户端伪造）

**Body**（扩展）：

```json
{
  "userId": "123",
  "public": true,
  "topicCategoryId": "education",
  "topic_category_id": "education"
}
```

**逻辑**：

1. 校验 caller == `owner_user_id`
2. 若 `public === true` 且提供了 category，校验 slug
3. 更新 visibility + `topic_category_*`
4. Response 200：`{ "ok": true, "visibility": "public", "topic_category_id": "education", ... }`

### 3.2 `PUT /book-experts/{expertId}/category`

**Auth**：登录 + owner

**Body**：

```json
{
  "userId": "123",
  "categoryId": "education",
  "topicCategoryId": "education",
  "topic_category_id": "education"
}
```

**Response**：

```json
{
  "ok": true,
  "expert_id": "exp_xxx",
  "topic_category_id": "education",
  "topic_category_name": "教育"
}
```

**错误**：非 owner `403`；未知 slug `400`；专家不存在 `404`。

（可选）若未来专家条目进入统一 Feed 索引，在此同步更新 ES/Feed 文档 — 与 `PUT /project/{id}/category` 同等优先级。

### 3.3 `GET /book-experts/public`

**Query**（可选扩展）：

- 现有：`userId`、`exclude_own=1`、分页等
- 新增：`category` 或 `topicCategoryId` — 精确匹配 `topic_category_id`

仅 `visibility=public` 的专家参与筛选。

### 3.4 列表 / 详情

`GET /mine`、`GET /public`、`GET /{expertId}` 的 expert 对象均包含 §2 字段（无则省略或 null）。

---

## 4. Java BFF

1. **路由**：`PUT /api2/book-experts/{expertId}/category` → 转发 Python，body/query 注入 `userId` from JWT。
2. **Publish**：转发时保留 `topicCategoryId` / `topic_category_id` 字段。
3. **鉴权**：与现有 book-expert 路由相同（Cookie `pr_token` / `Authorization`）。

---

## 5. 分类 catalog

**不单独维护** expert 分类表。校验时：

- 复用 Feed 分类服务（与 `GET /www/model/feed/categories` 同源），或
- 与 project category 校验共用 allowlist 配置。

---

## 6. 前端行为（已实现，联调清单）

| 文件 | 行为 |
|------|------|
| `BookExpertChat.vue` | Owner 见主题分类；private 写 sessionStorage；public 调 `updateExpertTopicCategory` |
| `publishExpert` | 发布 / 分享至社区时附带 `topicCategoryId` |
| `pickExpertTopicCategoryId` | 从 summary 多字段解析 slug |
| `ExploreTopicCategoryPicker.vue` | 与作品下拉 UI 一致 |

**联调前**：`PUT .../category` 与 publish 带 category 会 404/忽略 — UI 仍可用本地 draft，公开后保存会失败直至后端上线。

---

## 7. 测试建议

1. Owner 选分类 → 未发布 → refresh → draft 仍在；服务端无字段。
2. 选 `education` → publish → `GET /mine` 含 `topic_category_id=education`。
3. 已 public → `PUT category` → `ai` → public 列表 `?category=ai` 可见。
4. 非 owner `PUT` → 403。
5. 非法 slug → 400。
