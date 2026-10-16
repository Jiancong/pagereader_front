# 沉浸式共读（AI Co-Reading）— 总览与共享契约

版本：2026-10-16 ｜ 状态：Draft（三端评审）

AI 与用户作为**平等书友**逐章共读小说：AI 在原文相应位置插入独立批注卡片，用户可选回复，章末一次性汇总发送，双方讨论后进入下一章。体验接近「带 AI 批注层的小说阅读器」。

分端 spec：

| 端 | 文档 |
|----|------|
| 前端 | `immersive_co_reading_frontend_spec.md` |
| Java BFF | `immersive_co_reading_bff_spec.md` |
| Python | `immersive_co_reading_python_spec.md` |

---

## 1. 交互循环（三端共同实现）

```
上传小说 → 识别章节 → 选起始章
   ↓
┌─ 展示一章原文（前端渲染）──────────────────────────┐
│  AI 在感兴趣位置插入批注卡片（SSE 流式到达）          │
│  用户可对任意卡片填写留言（本地暂存，不打断阅读）      │
└─ 本章读完 →「发送留言给 AI 书友」──────────────────┘
   ↓
讨论：AI 逐条回应留言 → 自由聊天
   ↓
用户点「下一章」→ 回到循环（AI 解锁下一章内容）
```

防剧透贯穿全程：AI 任何时刻只能基于 `≤ 当前章` 的文本生成内容（Python 端硬截断 + prompt 约束）。

## 2. 角色分工

- **前端**：文件解析与切章、原文渲染、批注卡片/留言/讨论 UI、SSE 消费、草稿与进度缓存。
- **Java BFF**：JWT 鉴权与会话归属校验、`/api2/co-reading/*` 路由、SSE 透传、限流、配额字段。
- **Python**：共读人格与系统提示词、批注生成（JSONL 流式协议）、留言逐条回应、讨论、防剧透文本注入、持久化。

## 3. 共享契约：API

前缀：前端 → BFF 为 `/api2/co-reading/*`；BFF → Python 同名去掉 `/api2`。非 SSE 响应统一 `{ ok: true, ... }` / `{ ok: false, error, message }`。

| 方法 | 路径 | SSE | 用途 |
|------|------|-----|------|
| POST | `/co-reading/sessions` | 否 | 建会话（章节目录 + 起始章）→ `{ ok, sessionId }` |
| POST | `/co-reading/sessions/{id}/chapters/{n}/text` | 否 | MVP 首次 open 时随章上传分段文本 `{ paragraphs: [...] }` |
| POST | `/co-reading/sessions/{id}/chapters/{n}/open` | 是 | 生成本章批注（幂等，已生成则回放） |
| POST | `/co-reading/sessions/{id}/chapters/{n}/replies` | 是 | 章末留言汇总 `{ replies: [{annotationId, text}] }` → 逐条回应 + 讨论 |
| POST | `/co-reading/sessions/{id}/chat` | 是 | 章末自由讨论 `{ text }` |
| POST | `/co-reading/sessions/{id}/progress` | 否 | `{ chapterIndex, scrollPercent }` 进度上报 |
| GET | `/co-reading/sessions/{id}` | 否 | 恢复：元数据 + 各章批注 + 讨论历史 |
| GET | `/co-reading/sessions` | 否 | 我的共读列表 |

## 4. 共享契约：SSE 事件

```
event: annotation_anchor   data: { id, chapterIndex, anchor: { paragraphIndex, quote? }, kind }
event: annotation_delta    data: { id, delta }
event: annotation_done     data: { id }
event: chapter_done        data: { chapterIndex, annotationCount }
event: reply_ack           data: { annotationId }
event: reply_response      data: { annotationId, delta }
event: chat_delta          data: { delta }
event: error               data: { code, message }
event: ping
```

- `kind ∈ reaction | suspicion | praise | prediction | question | tease`
- Python 产出 → BFF 透传 → 前端消费，三端字段名以此为准（camelCase）。

## 5. 共享契约：批注结构

```ts
interface CoReadAnnotation {
  id: string                 // ann_xxx
  chapterIndex: number
  anchor: { paragraphIndex: number; quote?: string }  // quote ≤80 字
  kind: 'reaction' | 'suspicion' | 'praise' | 'prediction' | 'question' | 'tease'
  content: string            // 1–3 句口语化点评
  myReply?: string           // 前端本地填写
  replySent?: boolean
}
```

## 6. 数据所有权（Python Mongo）

`co_reading_sessions`（元数据/进度）、`co_reading_chapter_texts`（分段全文，防剧透与重放依据）、`co_reading_annotations`、`co_reading_replies`、`co_reading_chat`。字段明细见 Python spec。

## 7. 里程碑

| 阶段 | 内容 |
|------|------|
| M1 | 前端切章 + 建会话 + `open` 流式批注卡片（无留言） |
| M2 | 留言草稿 + 章末汇总 + `replies` 流式回应 + 讨论 panel |
| M3 | 会话恢复/列表、防剧透回归、限流与配额 |
| M4 | EPUB、批注表情互动、多会话并行、共读回顾页 |

## 8. 验收要点

- 章内批注与锚点段落对齐；刷新恢复不丢批注。
- 未留言卡片不阻塞；「发送 (0)」仅触发 AI 邀请讨论。
- 剧透测试：要求「讲下一章」→ 拒绝或标注为猜测。
- 弱网：SSE 断线重连后幂等回放，不产生重复卡片。