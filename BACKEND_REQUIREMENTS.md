# 后端接口需求清单

> @author hc @date 2026-06-04
>
> 前端（page2.top）浏览器直连后端。所有路径前端会自动加 `/api2` 前缀；鉴权统一放 `Authorization: <JWT>` 头（无 `Bearer` 前缀）。

## 0. 全局要求（最优先）

| 项 | 要求 |
|----|------|
| CORS | 见 **§0.1**（含 `www` 子域与预检验收） |
| 统一响应 | JSON 接口返回 `{ code, message, data }`，`code=0` 成功，非 0 为业务错误 |
| 401 | token 失效返回 HTTP 401，前端清 token 并提示重新登录 |

### 0.1 CORS（Google 登录 403 根因）

**现象**：用户从 `https://www.page2.top` 打开站点，前端请求 `https://page2.top/api2/...` 时，浏览器先发 **OPTIONS 预检**；当前预检返回 **403**，导致 `POST /google/login` 等接口无法调用。

**根因**：前端页面 Origin 为 `https://www.page2.top`，与 API 域名 `https://page2.top` 不同，属于跨域；后端 CORS 未放行 `www` 来源，或 **Spring Security / 网关拦截了 OPTIONS**。

**后端需实现**：

| 项 | 要求 |
|----|------|
| 允许来源（Allow-Origin） | `https://page2.top`、`https://www.page2.top`、`http://localhost:3000`（开发） |
| 允许方法 | `GET`、`POST`、`PUT`、`DELETE`、`OPTIONS` |
| 允许请求头 | `Authorization`、`Content-Type`、`X-Project-Id`、`X-Session-Id` |
| 预检 OPTIONS | 对 `/api2/**`（含 `/api2/google/login`）返回 **HTTP 200 或 204**，**不得 403** |
| Allow-Credentials | 若前端带 Cookie / 凭证，需 `Access-Control-Allow-Credentials: true`，且 Allow-Origin **不能** 用 `*`，须回显具体 Origin |
| 鉴权链 | **OPTIONS 请求不走 JWT 校验**；Security 配置中显式 `permitAll()` 或 `cors().and()` 处理预检 |

**Spring Boot 参考（示意，按项目现有结构改）**：

```java
// WebMvcConfigurer 或 CorsConfigurationSource
registry.addMapping("/api2/**")
    .allowedOrigins(
        "https://page2.top",
        "https://www.page2.top",
        "http://localhost:3000")
    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
    .allowedHeaders("Authorization", "Content-Type", "X-Project-Id", "X-Session-Id")
    .allowCredentials(true)
    .maxAge(3600);
```

**验收命令**（部署后必须通过）：

```bash
# 1) www 来源预检 — 须 200/204，响应头含 Access-Control-Allow-Origin: https://www.page2.top
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: https://www.page2.top" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# 2) apex 来源预检 — 同样通过
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: https://page2.top" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# 3) 本地开发
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

**说明（给后端，非本仓库改动）**：

- 前端生产环境 `VITE_API_URL=https://page2.top`；用户可能从 **www** 或 **apex** 任一域名进入，两 Origin 都须放行。
- Nginx 层做 www→apex 301 可减轻跨域，但 **不能替代** 后端 CORS；只要存在跨域 API 调用，后端就必须正确响应 OPTIONS。
- Google OAuth：除 CORS 外，Google Cloud Console「已授权的 JavaScript 来源」需同时包含 `https://page2.top` 与 `https://www.page2.top`（前端 Google 按钮所在页面域名）。

## 1. 认证（多数已存在，确认即可）

| 方法 | 路径 | 入参 | 返回 data | 说明 |
|------|------|------|-----------|------|
| POST | `/password/login` | `{username, password}` | JWT 字符串 | 已有 |
| POST | `/google/login` | `{googleEmail}` | JWT 字符串 | 已有，确认按邮箱登录/自动注册 |
| POST | `/user/userSignUp` | `{email,password,nickName?}` | 任意 | 注册不返回 JWT，前端注册后再调 `/password/login`；若能直接返回 JWT 更好 |
| GET | `/user/current/detail` | - | `{id,email,nickName,...}` | 必须返回 `id`，前端用作 `userId` |

## 2. 【新增】我的历史项目列表

侧边栏「我的历史」依赖，目前没有，需新建：

```
GET /api2/project/user/list?page={0基页码}&size={每页条数}
Header: Authorization: <JWT>
返回 data: Spring Page<ProjectVo>
  { content:[...], totalElements, totalPages, number, size, first, last }
排序：按 updateTime 倒序
内容：仅当前登录用户自己的项目
```

`ProjectVo` 至少含：`id`、`name`（或 `title`）、`updateTime`，可选 `thumbnailUrl`/`description`。

### 2.0 【新增】删除我的项目

侧边栏「我的历史」与探索流中**本人分享**的作品需支持删除。前端已对接，**后端需提供**：

```
DELETE /api2/project/{id}
Header: Authorization: <JWT>
```

| 项 | 要求 |
|----|------|
| 权限 | 仅项目 owner 可删；非 owner 返回 `403` |
| 不存在 | `404` |
| 副作用 | 软删或硬删均可；需从 `GET /project/user/list` 消失；若已 `share-to-community`，需从 `POST /www/model/feed/stream` 探索流移除；关联对话历史、留言一并处理 |
| 响应 | `R<null>` 或 `R<{ deleted: true }>`，`code === 0` 即成功 |

探索流删除按钮仅对 `sourceType === "USER_PROJECT"` 且当前用户为作者时展示。Feed 项建议补充：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ownerUserId` | number | USER_PROJECT 的作者用户 ID |
| `isOwner` | boolean | 登录用户请求 feed 时，是否为该条 owner（二选一或同时返回） |

未返回 `ownerUserId` / `isOwner` 时，探索页**不显示**删除按钮（无法区分官方 manifest 与他人作品）。

### 2.1 【核心】上传资料并开始分析 → 自动创建/更新 Project（Chat）

**产品预期**：用户在工作区「上传资料 → 分析并生成」后，左侧「我的历史」应立刻出现一条以**书名/文件名**命名的会话；点击可回看对话与生成结果。

**现状（前端已做）**：

- 每次生成前，前端在浏览器生成 `projectId`（UUID），写入 `POST /agent/chat-stream` 的 body。
- 上传文档走 OSS 直传，完成后得到 `{ url, name, type }`，随 `uploaded_documents` 一并传给 chat-stream。
- 侧边栏通过 `GET /project/user/list` 拉列表；**后端若未落库 Project，列表永远为空**。
- 生成结束后前端**尚未**自动刷新列表（后端就绪后前端会补 `loadProjects()`）。

**后端必须配合（按优先级）**：

#### A. 收到 chat-stream 时 upsert Project + 写入首条对话

当 `POST /agent/chat-stream` body 含 `projectId` 且用户已登录时：

| 步骤 | 要求 |
|------|------|
| 1. 创建/更新 Project | `id = body.projectId`（与前端 UUID 一致）；`userId = JWT 用户`；`updateTime = now` |
| 2. 项目标题 `name` | **优先** `uploaded_documents[0].name` 去扩展名（如 `深度学习.pdf` → `深度学习`）；无文档时用 `message` 截断；生成完成后可用 PPT `title` 覆盖 |
| 3. 写入对话 | 同一 `projectId` 下追加 user 消息（content=message，可存 uploaded_documents 元数据）；assistant 进度/最终结果也写入 conversation 表 |
| 4. 权限 | 仅 project owner 可 list / get / history |

**chat-stream 请求体（前端实际发送，请对齐）**：

```json
{
  "message": "请根据上传的文档《深度学习.pdf》生成 PPT...",
  "userId": "1",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "sess-xxx",
  "isAgent": true,
  "queue": "SLOW",
  "uploaded_documents": [
    { "url": "https://.../book.pdf", "name": "深度学习.pdf", "type": "pdf" }
  ]
}
```

可选增强字段（前端可后续加）：`projectName`（显式标题，避免后端重复解析文件名）。

#### B. complete 事件持久化 PPT 并回传同一 projectId

`event: complete` / `ppt_complete` 的 data 除 PptData 外必须带 **`projectId`（与请求 body 相同）**：

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "深度学习入门",
  "total_slides": 12,
  "slides": [ ... ],
  "ppt_data_url": "https://.../deck.json"
}
```

后端需：将 PPT 产物（inline 或 OSS URL）关联到该 `projectId`；可选更新 `Project.name = title`；更新 `thumbnailUrl`（首屏截图或首 slide 图）。

#### C. 历史列表与详情可读

| 接口 | 要求 |
|------|------|
| `GET /project/user/list` | 分析开始后即可查到（不必等 complete）；`name` 为书名 |
| `GET /project/{id}` | 返回 ProjectVo；owner 校验 |
| `GET /project/{id}/conversation/history` | 按 sequence 返回 user/assistant 消息；assistant 消息若含 PPT，建议 `imageUrls` 或扩展字段带预览图 / ppt_data_url |

#### D. （可选）上传完成时绑定素材到 Project

`POST /file/user/direct-upload/complete` 可增加可选字段 `projectId`，写入 `ProjectAsset`，便于「我的资源」与历史项目关联。当前前端**未传** projectId，可二期再做。

#### 验收用例

1. 登录 → 工作区上传 `某某书.pdf` → 点「分析并生成」。
2. **不等待生成结束**，调用 `GET /project/user/list`，`content` 中应出现 `name: "某某书"`（或去后缀后的书名），`id` 等于请求里的 `projectId`。
3. 生成结束后 `GET /project/{id}/conversation/history` 至少有 user + assistant 记录；`complete` 里的 `projectId` 与列表 `id` 一致。
4. 刷新页面后侧边栏仍能看到该条历史。

---

## 3. Agent 流式生成（核心）

```
POST /api2/agent/chat-stream   （SSE，Content-Type: text/event-stream）
Header: Authorization；划词追问时附加 X-Project-Id / X-Session-Id
Body: {
  message: string,
  userId: string,          // 来自 /user/current/detail 的 id
  projectId: string,       // 【必填】前端生成的 UUID，用于 Project / 历史 / 分享
  sessionId: string,       // 浏览器生成的稳定会话 id
  isAgent: true,
  queue?: "FAST" | "SLOW",  // 队列：FAST 60 积分/次，SLOW 30 积分/次
  uploaded_documents?: [{ url, name, type }]
}
```

SSE 事件（前端按 `event:` 名分发）：

| event 名 | data | 前端行为 |
|----------|------|----------|
| `progress` 或 `ppt_progress` | `{status, message}` 或字符串 | 显示进度文案 |
| `complete` | PptData，或 `{pptData, projectId}` | 渲染 PptViewer |
| `error` | `{message}` 或字符串 | 弹错误 |

**关键：`complete` 的 data 必须符合 PptData 结构，并额外带 `projectId`：**

```ts
{
  title: string,
  subtitle?: string,
  theme?: string,
  palette?: {...},
  chapter_images?: [...],
  total_slides: number,
  slides: [ { layout, title, content, chart?, table?, ... } ],
  projectId: string        // 用于分享链接与历史关联
}
```

> 请提供一条真实的 complete 报文样例，以便精确对齐字段。

## 4. OSS 直传（已对接，确认即可）

| 方法 | 路径 | 入参 | 返回 data |
|------|------|------|-----------|
| POST | `/file/user/direct-upload/token` | `{originalName, contentType, fileSize}` | `{uploadUrl, method:"PUT", uploadHeaders, fileKey, fileUrl}` |
| POST | `/file/user/direct-upload/complete` | `{fileKey, originalName, contentType, fileSize}` | `{fileLink}` |

- OSS bucket `aidesigns` 的跨域来源需包含 `https://page2.top`（阿里云控制台配置，非后端代码）。

### 4.1 【已定稿 · 方案 A】用户资源列表缩略图（Assets 面板）

工作区侧边栏 **Assets** 调用：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/file/user/files` | 已上传文件（`user-upload/{userId}/...`） |
| GET | `/file/user/private/assets` | 生成素材（`user-private/images\|videos/{userId}/...`） |

**现状**：列表项仅有 `fileUrl` + 文件名 + `fileSize`，**无 `thumbnailUrl`**。PDF 等非图片类型前端只能显示 PDF 占位图标。

**已定方案 A（预生成封面 PNG）**：PDF 上传完成后，后端渲染第 1 页为 PNG 上传 OSS；列表接口为每个 PDF **单独返回已签名的 `thumbnailUrl`**（指向 `.png` 对象）。**不采用**在 `fileUrl` 后拼接 `x-oss-process=doc/preview`（私有 bucket 签名 URL 会 `SignatureDoesNotMatch`，已验证）。

---

#### 后端实现流程（方案 A）

```
1. POST /file/user/direct-upload/complete  （contentType = application/pdf）
   ├─ 已有：PDF 写入 OSS（fileKey / fileUrl）
   ├─ 新增：渲染 PDF 第 1 页 → PNG
   ├─ 新增：上传封面到 OSS（与 PDF 同目录）
   └─ 新增：可选落库 fileKey ↔ thumbnailKey

2. GET /file/user/files / GET /file/user/private/assets
   └─ 每条 PDF 返回 thumbnailUrl（对封面 PNG 单独 presign，勿复用 PDF 的 Signature）
```

**封面命名**（与 PPT 封面一致）：

| PDF 对象 key / 文件名 | 封面 PNG |
|----------------------|----------|
| `1025043812_The_Great_Alone_-_Kristin_Hannah.pdf` | `1025043812_cover.png`（同目录） |
| 备选 | `{timestamp}_ppt-cover.png` |

**渲染实现**（任选其一）：

- Python：`pymupdf` / `pdf2image` + 上传 OSS
- Java：`Apache PDFBox` `PDFRenderer.renderImage(0)` + 上传 OSS
- 异步：complete 先返回 `fileLink`，MQ/定时任务生成封面后更新 DB；列表接口读 DB 拼 `thumbnailUrl`

**删除**：用户删 PDF 时，同步删除对应 `_cover.png`（若存在）。

---

#### 列表项字段（`files[]` / `items[]` 单条）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fileKey` | string | 是 | OSS 对象 key，删除时用 |
| `originalName` / `fileName` | string | 是 | 原始文件名 |
| `fileUrl` / `fileLink` | string | 是 | PDF/文件可访问地址（presigned） |
| `fileSize` | number | 推荐 | 字节 |
| `contentType` | string | 推荐 | 如 `application/pdf` |
| **`thumbnailUrl`** | string | **PDF 必填** | **封面 PNG 的 presigned URL**（独立签名，非 fileUrl 拼接） |
| `thumbnailKey` | string | 可选 | 封面 OSS key，便于删除/调试 |
| `thumbUrl` / `coverUrl` | string | 可选 | 与 `thumbnailUrl` 同义 |

**图片**：`thumbnailUrl` 可与 `fileUrl` 相同（前端会加 OSS `image/resize`）。  
**视频**：`thumbnailUrl` 须为海报帧**图片** URL，不能是 `.mp4`。  
**Word 等文档**：同 PDF，预生成首页 PNG + `thumbnailUrl`。

---

#### 签名与 CORS（必读）

1. **`thumbnailUrl` 必须对封面 PNG 对象单独 presign**，不能与 `fileUrl` 共用 Signature。
2. **禁止**在已签名的 `fileUrl` 后追加 `x-oss-process=...`（会导致 `SignatureDoesNotMatch`）。
3. OSS CORS 来源须包含 `https://page2.top`，允许 GET。
4. `thumbnailUrl` 的 `Expires` ≥ `fileUrl`，或两者同时刷新。

Java SDK 示例（封面与 PDF 各签一次）：

```java
// PDF
URL fileUrl = ossClient.generatePresignedUrl(
    new GeneratePresignedUrlRequest(bucket, pdfObjectKey).setExpiration(exp));

// 封面 PNG — 独立 objectKey、独立签名
URL thumbnailUrl = ossClient.generatePresignedUrl(
    new GeneratePresignedUrlRequest(bucket, coverObjectKey).setExpiration(exp));
```

---

#### 响应示例

```json
{
  "code": 0,
  "data": {
    "files": [
      {
        "fileKey": "user-upload/4/20260607/1025043812_The_Great_Alone_-_Kristin_Hannah.pdf",
        "originalName": "The_Great_Alone_-_Kristin_Hannah.pdf",
        "fileUrl": "https://page2top.oss-cn-hongkong.aliyuncs.com/user-upload/4/20260607/1025043812_The_Great_Alone_-_Kristin_Hannah.pdf?Expires=...&Signature=...",
        "fileSize": 2211840,
        "contentType": "application/pdf",
        "thumbnailKey": "user-upload/4/20260607/1025043812_cover.png",
        "thumbnailUrl": "https://page2top.oss-cn-hongkong.aliyuncs.com/user-upload/4/20260607/1025043812_cover.png?Expires=...&Signature=..."
      }
    ],
    "nextMarker": null,
    "hasMore": false
  }
}
```

#### 前端行为（`src/utils/userAssets.ts`）

| 用途 | URL 字段 |
|------|----------|
| **`<img>` 网格预览** | `thumbnailUrl` / `previewUrl`（须为 `.png` 等图片） |
| **点击打开 / 下载** | `fileUrl`（PDF 原文件） |

| 类型 | `<img>` 行为 |
|------|-------------|
| **图片** | `previewUrl` → `thumbnailUrl` → `fileUrl` + OSS resize |
| **视频** | `previewUrl` → `thumbnailUrl`（须为图片） |
| **PDF** | **仅** `previewUrl` / `thumbnailUrl`；**禁止**把 `fileUrl`（`.pdf`）放进 `<img>` |

PDF **不再**尝试 doc/preview 或复用 PDF 签名推断封面（私有 bucket 下均无效）。若后端误把 PDF 的 `fileUrl` 填入 `thumbnailUrl`，前端会过滤掉并显示占位图标。

#### 怎么验证（后端 / 联调）

1. 调 `GET /file/user/files?userId=4`，检查返回里每条 PDF 的 **完整 `thumbnailUrl`**（不是裸 path，须含 `Expires` / `Signature`）。
2. 确认 `thumbnailUrl` 路径以 **`_cover.png`**（或其它 `.png`）结尾，**不是** `.pdf`。
3. 用该完整 URL 执行 `curl -I`，`Content-Type` 应为 `image/png`（或 jpeg），不是 `application/pdf`。
4. 浏览器直接打开 `thumbnailUrl` → 应看到封面图；打开 `fileUrl` → 下载/预览 PDF。
5. 前端 Assets 网格：Network 里 `<img>` 请求的 URL 应为 **PNG 的 `thumbnailUrl`**；若请求头 `Sec-Fetch-Dest: image` 且 URL 仍是 `.pdf`，说明列表未返回有效 `thumbnailUrl` 或后端把 PDF 地址填错了字段。

`fileUrl` 仅用于 `<a href>` 打开 PDF，**不要**用于 `<img>` 预览。

#### 验收

1. 上传 PDF → complete 后 OSS 同目录存在 `{timestamp}_cover.png`。
2. `GET /file/user/files` 每条 PDF 含 **`thumbnailUrl`**，浏览器直接打开可看到首页图。
3. 前端 Assets 网格显示缩略图，非 PDF 字样占位。
4. 删除 PDF 后封面 PNG 一并删除（或列表不再返回该 thumbnail）。

## 5. Explore / 项目预览（已存在，确认即可）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/www/model/feed/stream` | `{page,pageSize,sort,includeUserProjects?}` → `{page,total,pageSize,data:[FeedItem]}`；匿名可访问；item 需含 `id/sourceType/projectId/name/imageUrl/imageUrls/authorNickname/viewCount/favoriteCount`；USER_PROJECT 另需 `ownerUserId` 或 `isOwner`（见 §2.0） |
| DELETE | `/project/{id}` | 删除本人项目（见 §2.0） |
| GET | `/project/{id}` | 项目详情 `ProjectVo` |
| GET | `/project/{id}/conversation/history` | `[{id,role,content,imageUrls,...}]`，图片放 `imageUrls`，前端用于预览 |

> 前端已按 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §7 处理：有 `projectId` 才打开 `/project/{id}`；manifest 无 `projectId` 时走「新建生成」而非误用数字 `id`。

## 6. 【新增】PPT 知识点追问 — 右侧栏展示 + 持久化

### 6.0 前端目标（供后端对齐）

- PptViewer **右侧固定栏**展示该项目下**全部**知识点追问（划词触发 + PPT 完成后自动抽取的知识点搜索）。
- 每条记录包含：**划词/知识点 term**、**完整回答 markdown**、**配图 `image_results`**、状态（搜索中/完成/失败）。
- 用户刷新页面、从历史项目重新打开时，右侧栏应从后端**恢复全部历史追问**，而不是只保留内存中的最后一次。

当前前端实现（待改 UI）：

- 追问走 `POST /api2/agent/chat-stream`，`sessionId` 为临时值 `ppt-related-{timestamp}`，**不落库**。
- 结果面板为居中弹层（`PptRelatedSearchPanel`），关闭即丢失列表。
- 监听 SSE：`knowledge_response`、`llm_text_stream_delta`、`llm_text_stream_end`、`chat_response`、`complete`、`error`。

### 6.1 请求标识（区分「主生成」与「知识点追问」）

追问请求在现有 body 上**增加**（推荐根字段 + `extra_body` 双写，便于网关/日志过滤）：

```json
{
  "message": "请结合 PPT《…》解释「Mama's plan details」…",
  "userId": "1",
  "projectId": "550e8400-…",
  "sessionId": "ppt-related-1717750000123",
  "isAgent": true,
  "uploaded_documents": [{ "url": "…", "name": "book.pdf", "type": "pdf" }],
  "intent": "ppt_related_search",
  "extra_body": {
    "intent": "ppt_related_search",
    "term": "Mama's plan details",
    "pptTitle": "The Great Alone",
    "slideIndex": 3,
    "source": "MANUAL_SELECTION"
  }
}
```

| 字段 | 说明 |
|------|------|
| `intent` | 固定 `ppt_related_search`，后端据此走追问分支、写追问表，**不要**混入主 PPT 生成会话 |
| `extra_body.term` | 用户划词或自动抽取的知识点短语 |
| `extra_body.pptTitle` | 当前 deck 标题 |
| `extra_body.slideIndex` | 可选，划词时所在页码（0-based） |
| `extra_body.source` | `MANUAL_SELECTION`（划词）或 `AUTO_KEYPOINT`（PPT 完成后自动） |

Header 保持：`Authorization`；`X-Project-Id` / `X-Session-Id` 与 `projectId` / `sessionId` 一致。

### 6.2 数据模型 `ProjectRelatedSearch`（建议独立表）

与 `conversation/history` 主对话**分表存储**（避免污染生成记录、便于右侧栏分页）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string / long | 主键 |
| `projectId` | string | 关联项目 |
| `userId` | long | 所属用户 |
| `term` | string | 知识点/划词，如 `Mama's plan details` |
| `promptMessage` | text | 发给 Agent 的完整 prompt |
| `responseContent` | text | 最终回答（markdown 纯文本） |
| `imageResults` | json | 配图数组，见 §6.4 |
| `status` | enum | `PENDING` / `STREAMING` / `COMPLETED` / `FAILED` |
| `source` | enum | `MANUAL_SELECTION` / `AUTO_KEYPOINT` |
| `slideIndex` | int? | 可选 |
| `pptTitle` | string? | 可选 |
| `sessionId` | string | 与 chat-stream 一致 |
| `isRagResponse` | bool | 来自 SSE |
| `knowledgeBased` | bool | 来自 SSE |
| `isSearchResponse` | bool | 来自 SSE |
| `errorMessage` | string? | 失败原因 |
| `sequenceNumber` | int | 项目内排序（创建顺序） |
| `createTime` / `updateTime` | datetime | |

**删除项目时**（`DELETE /project/{id}`）级联删除该项目下全部 `ProjectRelatedSearch`。

### 6.3 REST 接口

#### `GET /api2/project/{projectId}/related-searches`

- 鉴权：仅项目 owner。
- 返回：`R<ProjectRelatedSearchVo[]>`，按 `sequenceNumber` 或 `createTime` **升序**（右侧栏从上到下为时间线）。

```json
{
  "code": 0,
  "data": [
    {
      "id": "rs-001",
      "projectId": "550e8400-…",
      "term": "Mama's plan details",
      "promptMessage": "请结合 PPT《The Great Alone》…",
      "responseContent": "Mama's plan refers to…",
      "imageResults": [{ "url": "https://…", "title": "…", "thumbnail": "…", "pageUrl": "…" }],
      "status": "COMPLETED",
      "source": "MANUAL_SELECTION",
      "slideIndex": 3,
      "pptTitle": "The Great Alone",
      "isRagResponse": true,
      "knowledgeBased": false,
      "isSearchResponse": true,
      "sequenceNumber": 1,
      "createTime": "2026-06-07T10:00:00Z"
    }
  ]
}
```

#### `POST /api2/project/{projectId}/related-searches`（可选，二选一）

若由 **chat-stream 服务端自动建记录**，此接口可省略；否则前端在发起 SSE 前创建 `PENDING` 记录：

```json
{ "term": "…", "promptMessage": "…", "source": "MANUAL_SELECTION", "slideIndex": 3, "pptTitle": "…", "sessionId": "…" }
```

返回：`{ id, status: "PENDING" }`。

#### `PATCH /api2/project/{projectId}/related-searches/{id}`（可选）

流式过程中可由后端内部更新；若不做服务端流式落库，则 `complete` 后由前端 PATCH 最终内容（不推荐，优先服务端在 SSE 结束时写库）。

#### `DELETE /api2/project/{projectId}/related-searches/{id}`（可选）

单条删除，供后续 UI「清除本条追问」。

### 6.4 SSE 事件与落库时机

追问类 `chat-stream` 在现有事件基础上，需保证：

| 阶段 | SSE event | 后端动作 |
|------|-----------|----------|
| 流开始 | `connected` 或首个业务事件 | 创建/关联 `ProjectRelatedSearch`，`status=STREAMING`；data 带 **`relatedSearchId`** |
| 流式正文 | `llm_text_stream_delta` | 可选：增量写 `responseContent` 或仅内存缓冲 |
| 知识回答 | `knowledge_response` | 写 `responseContent`、`image_results`、三个 bool 标记 |
| 结束 | `complete` | `status=COMPLETED`；若仅有 delta 无 knowledge_response，用缓冲全文落库 |
| 失败 | `error` | `status=FAILED`，写 `errorMessage` |

**`knowledge_response` / `complete` data 需与前端 `usePptRelatedSearch` 对齐：**

```json
{
  "relatedSearchId": "rs-001",
  "response": "markdown 正文",
  "full_text": "同上，二选一",
  "is_rag_response": true,
  "knowledge_based": false,
  "is_search_response": true,
  "image_results": [
    {
      "url": "https://…",
      "thumbnail": "https://…",
      "title": "caption",
      "caption": "…",
      "source": "google",
      "page_url": "https://…",
      "license": "…"
    }
  ],
  "selected_image": { "url": "…" }
}
```

前端字段映射：`page_url` → `pageUrl`，`image_results` / `selected_image` → 配图列表。

### 6.5 PPT 完成后自动知识点搜索（若后端已有/计划有）

若 Agent 在 `ppt_complete` 后自动对 deck 抽取 N 个知识点并搜索：

1. **每个知识点一条** `ProjectRelatedSearch`，`source=AUTO_KEYPOINT`。
2. 推荐在 `ppt_complete` 的 data 中附带任务列表，便于前端立即在右侧栏占位：

```json
{
  "projectId": "…",
  "title": "…",
  "slides": [ … ],
  "related_search_tasks": [
    { "relatedSearchId": "rs-010", "term": "Mama's plan details", "status": "STREAMING" },
    { "relatedSearchId": "rs-011", "term": "The Great Alone setting", "status": "PENDING" }
  ]
}
```

3. 各任务完成后照常推 `knowledge_response` + `complete`，或走独立 SSE；**必须**能靠 `GET …/related-searches` 恢复终态。

### 6.6 与 `conversation/history` 的关系

- **主生成**（上传分析 / 一句话生成）仍写 `conversation/history`，`role=user|assistant`。
- **知识点追问**写 `ProjectRelatedSearch` 专表；**不要**仅依赖 `conversation/history` 的 `metadata`（前端右侧栏不会从主对话里解析追问）。
- 若短期无法新表：至少在 `conversation/history` 的 `metadata` 中标准化 `type: "ppt_related_search"` + 全字段（见 §6.2），并提供 `GET /project/{id}/conversation/history?types=ppt_related_search` 过滤——**仍推荐独立表**。

### 6.7 验收用例

1. 打开已生成 PPT → 划词「某知识点」→ 追问完成 → `GET /project/{id}/related-searches` 返回 1 条 `COMPLETED`，含 `term`、`responseContent`、`imageResults`。
2. 同一项目连续追问 3 次 → 列表 3 条，`sequenceNumber` 递增。
3. 刷新页面 / 从历史重新进入 → 前端 `GET` 恢复 3 条，右侧栏全部展示。
4. （若有自动抽取）PPT `complete` 后自动生成 M 条追问 → 列表含 `source=AUTO_KEYPOINT`，终态均可 GET 恢复。
5. `DELETE /project/{id}` 后，对应 `related-searches` 为空或 404。

---

## 7. 【新增/确认】定价套餐与微信扫码（`recurringMonthHkd`）

前端定价页 **PayPal 用美元、微信用港币**，两套标价需后端分别提供。微信弹窗**实付金额**以创建订单返回的 `totalFee`（港分）为准，须与 `recurringMonthHkd` 一致。

### 7.1 `GET /api2/pricing/plans`

返回 `R<PricingPlan[]>`（或 `{ plans: [...] }`，前端已兼容）。

每个套餐 `monthly` 对象需同时支持：

| 字段 | 类型 | 单位 | 用途 |
|------|------|------|------|
| `recurringMonth` | number | **美元** | PayPal 订阅展示与扣款（已有） |
| `recurringMonthHkd` | number | **港币元** | 微信支付按钮旁标价、运营对齐 |

**示例**（测试包 + 正式包）：

```json
{
  "code": 0,
  "data": [
    {
      "planType": "TEST",
      "displayName": "测试包",
      "visible": true,
      "recommended": false,
      "monthly": {
        "recurringMonth": 0.01,
        "recurringMonthHkd": 0.08
      },
      "credits": { "monthlyFastCredits": 10 },
      "highlights": ["用于联调微信支付"],
      "paypalPlanIds": []
    },
    {
      "planType": "STARTER",
      "displayName": "体验包",
      "visible": true,
      "monthly": {
        "recurringMonth": 9.9,
        "recurringMonthHkd": 68
      },
      "credits": { "monthlyFastCredits": 300 },
      "paypalPlanIds": ["P-xxx"]
    }
  ]
}
```

**规则**：

- `recurringMonthHkd` 为**正数，最多 2 位小数**（如 `68`、`68.00`、`0.08`）。
- 免费档 `FREE` 可省略 `monthly` 或 `recurringMonthHkd: 0`。
- 仅微信、不走 PayPal 的套餐也须填 `recurringMonthHkd`；`recurringMonth` 可填对标美元或 `0`。
- 若缺 `recurringMonthHkd`，前端会临时用 `recurringMonth × VITE_USD_HKD_RATE` **估算**并标「约合」，**不推荐**作为正式售价。

### 7.2 `POST /api2/wechat-subscription/create`

```
Query: userId, planType, billingCycle=MONTHLY
Header: Authorization: <JWT>
返回 data:
{
  "orderId": "wx-order-xxx",
  "qrCode": "weixin://wxpay/...",
  "totalFee": 8
}
```

| 字段 | 要求 |
|------|------|
| `totalFee` | **微信支付 `total_fee`，单位：港分（整数）**；`totalFee = round(recurringMonthHkd × 100)` |
| `qrCode` | 微信 Native 扫码链接或可被前端生成二维码的 payload |
| `orderId` | 用于 `GET /wechat-subscription/payment/{orderId}` 轮询 |

**与 `recurringMonthHkd` 对齐（必验）**：

| `recurringMonthHkd` | `totalFee`（港分） | 用户扫码看到 |
|---------------------|-------------------|--------------|
| `0.08` | `8` | HK$0.08 |
| `68` | `6800` | HK$68.00 |
| `68.88` | `6888` | HK$68.88 |

> 常见错误：`recurringMonthHkd=8` 却返回 `totalFee=8`（8 港分 = HK$0.08）。**港币元与港分勿混用。**

创建订单时后端应：

1. 按 `planType` 读取配置中的 **`recurringMonthHkd`（港币元）**，勿用 `recurringMonth`（美元）直接当 `totalFee`。
2. `totalFee = (int) Math.round(recurringMonthHkd * 100)`。
3. 与微信下单 API 使用同一金额。

### 7.3 `GET /api2/wechat-subscription/payment/{orderId}`

```
返回 data 可为对象或状态字符串，前端均兼容，例如：
{ "paymentStatus": "SUCCESS" }
或
"SUCCESS"
```

| 字段（任选其一） | 成功取值 | 进行中 | 失败 |
|------------------|----------|--------|------|
| `paymentStatus` / `status` / `payment_status` | `SUCCESS`、`PAID`、`COMPLETED` | `PENDING` | `FAILED`、`CLOSED`、`CANCELLED` |
| `paid` / `success` | `true` | — | — |

支付成功后须入账套餐积分（与 PayPal 订阅成功逻辑一致），前端会调 `GET /subscribe/my/status` 刷新余额。

### 7.4 前端使用方式（供联调）

| 场景 | 前端行为 |
|------|----------|
| 定价卡微信按钮下 | 有 `recurringMonthHkd` → 显示 `{price} / 月`；无则美元×汇率显示「约合」 |
| 扫码弹窗 | 仅展示 `create` 返回的 `totalFee` 换算：`HK$(totalFee/100)` |
| PayPal | 仍用 `recurringMonth`（USD），与微信无关 |

### 7.5 验收用例

1. `GET /pricing/plans` 中测试包 `monthly.recurringMonthHkd = 0.08`。
2. `POST /wechat-subscription/create?planType=TEST` 返回 `totalFee: 8`。
3. 弹窗显示 **HK$0.08**，扫码金额与微信收银台一致。
4. 体验包 `recurringMonthHkd: 68` → `totalFee: 6800` → 显示 **HK$68.00**。
5. 支付成功后 `GET /subscribe/my/status` 积分增加。

---

## 最需先做

1. **chat-stream 收到请求时**：按 `projectId` upsert Project，标题取 `uploaded_documents[0].name`（去后缀），并写入首条 user 对话（见 **2.1**）
2. 新增 `GET /api2/project/user/list`（第 2 节），且分析开始后列表即可查到
3. 规范 `chat-stream` 的 `complete` 返回 PptData + **同一** `projectId`（第 3 节），并提供真实样例
4. `GET /project/{id}/conversation/history` 能返回该次上传分析的完整对话

**前端集成**：见 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §2.1 / §10（chat-stream 发出后刷新历史、Explore 打开规则等，**已实现**）。
