# Book Expert 预设形象（Avatar Presets）— 后端 Spec

> 前端：`BookExpertChat` 顶栏「选择形象」从预设图选中 thumbnail，写入专家 `cover_url`（与封面上传同字段）。  
> **Python 已支持** JSON 设 URL；**Java BFF 目前仅 multipart 上传**，见 §1。

## 0. 现状

| 层 | 能力 |
|----|------|
| Python | `POST /api/book-experts/{expertId}/cover` body `{ "userId", "coverUrl" }` → 校验 owner → 写 `expert.cover_url` |
| Java BFF | `POST /api2/book-experts/{expertId}/cover` **仅** `multipart/form-data` 字段 `file` → OSS → 再 JSON 转发 Python |
| 前端 | `setExpertCoverUrl`（`src/api/bookExpert.ts`）：先尝试 JSON；若 BFF 返回 415/400 等，则 **fetch 预设 URL → multipart 上传**（兼容现网） |

预设图列表：`public/book-expert/avatars/` + 同目录 `manifest.json` 的 `files` 数组；前端打开「封面」下拉时拉取清单（见该目录 README）。

## 1.（推荐）BFF：同路径支持 JSON 设封面 URL

与 multipart **并列**，不破坏现有上传：

```
POST /api2/book-experts/{expertId}/cover
Content-Type: application/json
Authorization: JWT

{ "userId": "4", "coverUrl": "https://page2top.oss.../presets/expert-01.png" }
```

- **鉴权**：必须登录；`userId` 以 JWT 为准，忽略或覆盖 body 中的 userId（与 sessions 代理一致）。
- **校验**：
  - `coverUrl` 必填，`http://` 或 `https://`；
  - 可选白名单：仅允许自家 OSS 域名 + 配置的 CDN（防 SSRF 存库后 og:image 被滥用）。
- **流程**：`proxyJsonPost` → Python `POST /api/book-experts/{expertId}/cover`（已有）。
- **响应**：透传 `{ ok, expert: { cover_url, ... } }`。
- **计费**：0 分。

实现参考（伪代码）：

```java
@PostMapping(value = "/{expertId}/cover", consumes = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<Map<String, Object>> setExpertCoverUrlJson(...) {
    // JWT userId, validate coverUrl, proxy to Python
}
```

`consumes = MULTIPART` 与 `consumes = APPLICATION_JSON` 可共存于同一 path。

## 2.（可选）预设图清单 API

便于运营换图、统一走 OSS，无需发版前端：

```
GET /api2/book-experts/avatar-presets
```

- **鉴权**：可匿名或登录均可（只读）。
- **响应**：

```json
{
  "ok": true,
  "presets": [
    { "id": "scholar-m", "label": "学者", "coverUrl": "https://.../presets/scholar-m.png" }
  ]
}
```

- BFF 可静态配置或读 Nacos；Python **不必**存表（Phase 1）。
- 若图片只在 OSS：上传一次到 `book-experts/presets/*.png`，CDN 回源即可。

## 3. Python

**无变更**（已有 `set_cover`）。若 BFF 加 URL 白名单，Python 仍可只校验 `http(s)`。

## 4. 安全与产品

- 预设 URL 直存时：建议 BFF 限制 host，避免用户篡改 JSON 写入任意外链（专家公开页 og:image）。
- multipart 回退路径会把第三方 PNG **复制到项目 OSS**，与现封面上传一致，可接受。
- `cover_url` 与「上传封面」共用字段；侧栏专家历史、公开页、聊天顶栏均读同一字段。

## 5. 联调清单

- [ ] owner 选预设 → `GET /book-experts/{id}` 中 `cover_url` 更新
- [ ] 刷新专家聊天页 / 侧栏缩略图一致
- [ ] JSON 路径：curl JSON body 成功；multipart 仍可用
- [ ] 非 owner 调 cover → 403

### curl（JSON，BFF 实现 §1 后）

```bash
curl -X POST "https://page2.top/api2/book-experts/{expertId}/cover" \
  -H "Authorization: <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"4","coverUrl":"https://page2top.oss-cn-hongkong.aliyuncs.com/book-experts/presets/01.png"}'
```
