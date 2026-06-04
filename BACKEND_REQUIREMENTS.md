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

## 3. Agent 流式生成（核心）

```
POST /api2/agent/chat-stream   （SSE，Content-Type: text/event-stream）
Header: Authorization；划词追问时附加 X-Project-Id / X-Session-Id
Body: {
  message: string,
  userId: string,          // 来自 /user/current/detail 的 id
  sessionId: string,       // 浏览器生成的稳定会话 id
  isAgent: true,
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

> 需确认：feed item 的 `projectId` 是否可靠（前端用 `item.projectId || item.id` 打开预览）。

## 6. 划词追问（PptViewer 内置，可选）

PptViewer 的「划词追问」也走 `POST /api2/agent/chat-stream`，并带 `X-Project-Id` / `X-Session-Id` 头。不需要该功能可忽略；需要则确认接口能处理此类上下文请求。

---

## 最需先做

1. 新增 `GET /api2/project/user/list`（第 2 节）
2. 规范 `chat-stream` 的 `complete` 返回 PptData + projectId（第 3 节），并提供真实样例
