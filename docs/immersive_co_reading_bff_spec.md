# 沉浸式共读 — Java BFF 规格

版本：2026-10-16 ｜ 上游契约：`immersive_co_reading_spec.md`

BFF 只做**鉴权、归属校验、路由转发、SSE 透传、限流**；不做业务逻辑，不改写 Python 业务字段。

---

## 1. 路由

前缀 `/api2/co-reading/*`，**全部需有效 JWT**（共读无公开页需求；与 book-expert 写接口一致）。Filter 解析 JWT 得 `userId` 并注入转发请求（query/body，与现有 book-experts 相同模式）。

| BFF | Python 上游 | SSE |
|-----|-------------|-----|
| `POST /co-reading/sessions` | `POST /co-reading/sessions` | 否 |
| `POST /co-reading/sessions/{id}/chapters/{n}/text` | 同名 | 否 |
| `POST /co-reading/sessions/{id}/chapters/{n}/open` | 同名 | 是 |
| `POST /co-reading/sessions/{id}/chapters/{n}/replies` | 同名 | 是 |
| `POST /co-reading/sessions/{id}/chat` | 同名 | 是 |
| `POST /co-reading/sessions/{id}/progress` | `PUT .../progress` | 否 |
| `GET /co-reading/sessions/{id}` | 同名 | 否 |
| `GET /co-reading/sessions` | 同名 | 否 |

## 2. 归属与错误

1. **归属校验**：所有 `{id}` 路由先取 Python 返回的 `session.user_id`（或 BFF 侧缓存），`session.user_id != JWT.userId` → **404** `{ ok: false, error: "not_found" }`（不泄露存在性，不用 900111）。
2. **错误信封**：非 SSE 统一 `{ ok, error, message }`；SSE 内用 `event: error` `{ code, message }`。
3. JWT 无效/过期 → 401（写接口允许 900111 语义，但**不**用于业务错误）。

## 3. SSE 透传

- `Content-Type: text/event-stream`；响应头 `X-Accel-Buffering: no`、`Cache-Control: no-cache`，禁用任何缓冲/压缩。
- 客户端断开 → 向 Python 取消上游连接（释放 LLM 流）。
- 读超时 ≥ 5 分钟（章节生成较长）；`ping` 心跳透传保持连接。
- 不缓冲整流再转发；逐块 flush。

## 4. 限流与配额

| 规则 | 值 |
|------|-----|
| `open` / `replies` / `chat` | 每会话每分钟 ≤ 6 次（按 userId+sessionId 维度） |
| `progress` | ≤ 1 次 / 10s |
| `sessions` 创建 | 每用户活跃会话 ≤ 10，超出 409 `error: "too_many_sessions"` |

**Points 配额（字段预留，MVP 可免费）**：每章 `open` 扣 1 点；余额不足返回 `{ ok: false, error: "insufficient_points" }`；成功响应附 `points_remaining` 供前端展示（可选）。

## 5. 请求大小与校验

- `chapters/{n}/text`：body ≤ 2MB，`paragraphs` 数组元素为 string；超限 413。
- `sessions`：`chapters.length ≤ 200`；`fileHash` 64 位 hex；`startChapter ∈ [1, chapters.length]`。
- `{n}` 越界 → 400 `error: "chapter_out_of_range"`。

## 6. 可观测性

- 每次转发记录：`userId, sessionId, route, duration, sse_bytes`（脱敏，不记正文）。
- Python 5xx / 超时 → BFF 返回 `{ ok: false, error: "upstream_unavailable" }` 或 SSE `error` 事件，前端据此提示重试。

## 7. 验收（BFF 侧）

- 非本人会话所有路由 404。
- SSE 无缓冲到达前端（首事件 < Python 首事件 + 200ms）。
- 客户端断开后上游连接关闭（Python 侧可见 cancel）。
- 限流触发返回 429 + `error: "rate_limited"`。