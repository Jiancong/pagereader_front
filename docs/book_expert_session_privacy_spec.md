# Book Expert 会话隐私 — 后端实现 Spec

> **读者**：Python（`ai-design-poster`）+ Java BFF（`pagereader-backend`）  
> **目标**：专家可公开到广场，但**聊天内容仅对发起对话的登录用户可见**；公共广场进入 = 新开对话，不能看到他人（含专家 owner）的历史。  
> **前端仓库**：`pagereader_front`（行为见 §6，已与本文对齐联调）

---

## 0. 产品规则（必须满足）

| 场景 | 期望 |
|------|------|
| 用户从 **公共专家** 列表点进 **他人** 的专家 | 空白对话页，**不展示任何历史**；每次进入生成 **新的** `be-<expertId>-<uuid>` |
| 用户从侧栏 **「我的历史」** 点进 **自己制作** 的专家 | 可恢复 **该用户自己** 在该专家下的 session 与消息 |
| 专家 owner | **不能**通过 API 列出或读取 **访客** 的 session（SQL 始终按 `user_id = 请求者`） |
| 公开分享 | 只分享专家元数据/公开页，**不包含**任意用户的聊天记录 |

**sessionId 约定**

- 形态：`be-{expert_id}-{uuid}`，由前端生成。
- MySQL `sessions.session_id` = 上述值；`sessions.user_id` = **对话发起者**（≠ `expert.owner_user_id`）。

---

## 1. 现状与缺口（2026-03）

| 组件 | 现状 | 缺口 |
|------|------|------|
| `GET .../sessions/<sid>` | prefix + `row.user_id == userId` | 建议加「专家对该用户可对话」校验 |
| `GET .../sessions` / `active` | `_load_owned_expert`（仅 owner） | 与「访客自聊」文档冲突；list 应用 `_load_expert_for_chat`，SQL 仍只查请求者 |
| `ensure_book_expert_session` | 已存在 session 时不改 `user_id` | 他人持同一 `sessionId` 发消息可能 **写入同一条 session** → **必改** |
| `GET /api/history?session_id=` | 无 `user_id` 校验 | `be-*` 可被枚举读取 → **必改或 BFF 拒绝** |
| BFF `GET /api2/agent/history` | 仅传 `sessionId` | 同上 |

前端读历史：**仅 owner** 走 `GET /api2/book-experts/{expertId}/sessions/{sessionId}`（BFF 注入 JWT `userId`）。公共他人专家 **不调用** 恢复接口。

---

## 2. Python 改动（`ai-design-poster`）

### 2.1 Helper：`_load_expert_for_chat(expert_id, user_id)`

- `user_id` 必填，否则 400。
- 调用 `get_expert(expert_id, user_id=user_id)` 语义：存在且 **owner 或 visibility=public**，否则 404。

用于：`list_expert_sessions`、`get_active_expert_session`、`get_expert_session`（读消息前）。

### 2.2 `GET /api/book-experts/<expert_id>/sessions`

- 替换 `_load_owned_expert` → `_load_expert_for_chat`。
- 查询（不变）：`find_user_sessions_by_prefix(user_id, "be-{expert_id}-", limit=50)`。
- 响应：`{ "ok": true, "sessions": [...], "count": n }`（字段见 social history spec）。

### 2.3 `GET /api/book-experts/<expert_id>/sessions/active`

- 同上鉴权；返回该 **user_id** 下最近一条 `be-{expert_id}-*`。

### 2.4 `GET /api/book-experts/<expert_id>/sessions/<session_id>`

1. `_load_expert_for_chat`；
2. `session_id` 必须以 `be-{expert_id}-` 开头；
3. `get_session_row(sid)`：`user_id` 必须等于请求 `userId`，否则 **403** `forbidden`（勿用 404 便于区分「不存在」与「无权限」）；
4. 返回清洗后的 `messages[]`（role/content/timestamp）。

### 2.5 `ensure_book_expert_session`（**必改**）

文件：`utils/skills/book_expert/session_persistence.py`

```python
existing_uid = str(bucket.get("user_id") or "").strip()
incoming_uid = str(user_id or "").strip()
if existing_uid and incoming_uid and existing_uid != incoming_uid:
    # 拒绝：禁止向他人 session 追加消息
    raise SessionUserMismatch(...)
```

- DB 行若已有 `user_id`，以 DB 为准做同样校验。
- 首次创建：`user_id` = 当前请求用户；**禁止**默认写成 expert owner。

`BookExpertHandler` / `chat_stream`：捕获后返回 **403** 或 SSE `invalid_session_id`。

### 2.6 `chat_stream`（book expert 分支）

在 `resolve_book_expert_chat_session_id` 之后：

- 若 DB 已有该 `session_id` 且 `user_id` ≠ 当前用户 → **拒绝**，不写 `chat_history`。

### 2.7 `GET /api/history`（legacy）

当 `session_id.startswith("be-")`：

- 必填 query `user_id`（与 BFF 约定）；
- 仅当 `sessions.user_id == user_id` 时返回 `chat_history`；
- 否则 **403**。

非 `be-*` 会话保持现网行为，避免影响 PPT/小说。

### 2.8 落库核对

- `add_chat_message` / `save_session` 时 `sessions.user_id` = **JWT/请求用户**，不是 expert owner。
- 推荐索引：`CREATE INDEX idx_sessions_user ON sessions(user_id);`（若无）。

---

## 3. Java BFF 改动（`pagereader-backend`）

### 3.1 Book Expert sessions（保持 + 依赖 Python §2）

| 方法 | 路径 | 要求 |
|------|------|------|
| GET | `/api2/book-experts/{expertId}/sessions` | JWT 必填；转发 `?userId={jwt}` |
| GET | `/api2/book-experts/{expertId}/sessions/{sessionId}` | 同上 + `validateBookExpertSessionPrefix` |

**不要**用 query/body 里的 userId 覆盖 JWT（与 publish/distill 一致）。

### 3.2 `GET /api2/agent/history`（**建议**）

- 若 `sessionId` 以 `be-` 开头：
  - **方案 A**：要求 JWT，转发 Python `GET /api/history?session_id=&user_id={jwt}`（Python 实现 §2.7）；
  - **方案 B**（Python 未上线前）：直接 **400/403**，提示使用 book-experts sessions API。
- 禁止匿名仅凭 `sessionId` 读取 `be-*`。

### 3.3 `chat_stream` 代理

- 确认转发 body 中 `userId` = JWT 用户（覆盖客户端伪造）。
- `sessionId` / `projectId` 原样透传（专家会话为 `be-*`）。

---

## 4. 与旧文档关系

- `docs/book_expert_social_history_python_spec.md` §3.2「sessions 仅 owner」→ **以本文为准**：list/get 对 **可对话用户** 开放，但 **只返回/允许读取 `user_id = 请求者` 的行**。
- Owner **看不到**访客 session 是 SQL 设计结果，不是 API 屏蔽遗漏。

---

## 5. 冒烟清单（后端自测）

- [ ] B 打开 A 的 public 专家，新 `be-*`，发消息 → `GET .../sessions/{sid}?userId=B` 可读；`userId=A` **403**。
- [ ] B 用 A 的 sessionId 调 `chat_stream` → 403，库中无 B 的消息写入 A 的 session。
- [ ] A（owner）`GET .../sessions` → 仅 A 自己的线程，**不含** B 的 sessionId。
- [ ] `GET /api/history?session_id=be-...` 无 user_id 或 user_id 不匹配 → 403。
- [ ] `GET /api2/agent/history?sessionId=be-...` 未登录 → 401/403。

---

## 6. 前端行为（联调参考，无需后端改）

| 入口 | sessionId | 是否拉历史 |
|------|-----------|------------|
| 公共广场 · **他人**专家 | 每次 `createFreshExpertSessionId` | **否** |
| 侧栏「我的历史」· **自有**专家 | `getOrCreateExpertSessionId(userId, expertId)` | **是**（owner + 历史抽屉） |

localStorage 键：`book_expert_session:{userId}:{expertId}`。

---

## 7. 代码索引

| 层 | 文件 |
|----|------|
| Python 路由 | `routes/book_expert_routes.py` |
| Session 绑定 | `utils/skills/book_expert/session_persistence.py` |
| Handler | `utils/skills/book_expert/handler.py` |
| BFF | `pagereader-backend/.../BookExpertController.java`、`AgentController.java` |
| Python 仓库路径 | `ai-design-poster/` 下上表相对路径 |
