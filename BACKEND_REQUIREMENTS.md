# 后端接口需求清单

> @author hc @date 2026-06-04
>
> 前端（page2.top）浏览器直连后端。所有路径前端会自动加 `/api2` 前缀；鉴权统一放 `Authorization: <JWT>` 头（无 `Bearer` 前缀）。

## 0. 全局要求（最优先）

| 项 | 要求 |
|----|------|
| CORS | 放行来源 `https://page2.top`（及调试用 `http://localhost:3000`）；允许头含 `Authorization`、`Content-Type`、`X-Project-Id`、`X-Session-Id`；允许方法 `GET/POST/PUT/DELETE/OPTIONS`；预检 `OPTIONS` 返回 200 |
| 统一响应 | JSON 接口返回 `{ code, message, data }`，`code=0` 成功，非 0 为业务错误 |
| 401 | token 失效返回 HTTP 401，前端清 token 并提示重新登录 |

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

## 5. Explore / 项目预览（已存在，确认即可）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/www/model/feed/stream` | `{page,pageSize,sort}` → `{page,total,pageSize,data:[FeedItem]}`；匿名可访问；item 需含 `id/projectId/name/imageUrl/imageUrls/authorNickname/viewCount/favoriteCount` |
| GET | `/project/{id}` | 项目详情 `ProjectVo` |
| GET | `/project/{id}/conversation/history` | `[{id,role,content,imageUrls,...}]`，图片放 `imageUrls`，前端用于预览 |

> 前端已按 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §7 处理：有 `projectId` 才打开 `/project/{id}`；manifest 无 `projectId` 时走「新建生成」而非误用数字 `id`。

## 6. 划词追问（PptViewer 内置，可选）

PptViewer 的「划词追问」也走 `POST /api2/agent/chat-stream`，并带 `X-Project-Id` / `X-Session-Id` 头。不需要该功能可忽略；需要则确认接口能处理此类上下文请求。

---

## 最需先做

1. **chat-stream 收到请求时**：按 `projectId` upsert Project，标题取 `uploaded_documents[0].name`（去后缀），并写入首条 user 对话（见 **2.1**）
2. 新增 `GET /api2/project/user/list`（第 2 节），且分析开始后列表即可查到
3. 规范 `chat-stream` 的 `complete` 返回 PptData + **同一** `projectId`（第 3 节），并提供真实样例
4. `GET /project/{id}/conversation/history` 能返回该次上传分析的完整对话

**前端集成**：见 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §2.1 / §10（chat-stream 发出后刷新历史、Explore 打开规则等，**已实现**）。
