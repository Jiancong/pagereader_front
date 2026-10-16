# 沉浸式共读 — Python 规格

版本：2026-10-16 ｜ 上游契约：`immersive_co_reading_spec.md`

Python 负责共读人格（系统提示词）、批注生成、留言回应、讨论、防剧透与持久化。

---

## 1. 数据模型（MongoDB）

```
co_reading_sessions {
  _id                       // cr_xxx
  user_id
  file_hash, file_name, format        // txt | markdown | epub
  chapters: [{ index, title, char_count }]   // 前端上报目录（不含全文）
  start_chapter, current_chapter
  status                    // active | finished
  ui_locale                 // zh | en
  created_at, updated_at
}
co_reading_chapter_texts {
  session_id, chapter_index
  paragraphs: [string]      // 分段全文（防剧透注入与幂等重放的依据）
}
co_reading_annotations {
  _id, session_id, chapter_index
  anchor: { paragraph_index, quote? }
  kind, content, created_at
}
co_reading_replies {
  _id, session_id, chapter_index, annotation_id, text, created_at
}
co_reading_chat {
  _id, session_id, chapter_index, role: user|assistant, text, created_at
}
```

索引：`sessions(user_id, status)`；`texts(session_id, chapter_index)` 唯一；`annotations(session_id, chapter_index)`。

---

## 2. API 行为

### 2.1 `POST /co-reading/sessions`

body：`{ userId, fileHash, fileName, format, chapters, startChapter, uiLocale }`。
校验（BFF 已做一层，Python 复核）：章节 ≤ 200；`fileHash` hex64。同 `user_id + file_hash` 已有 active 会话 → 直接返回该 `sessionId`（幂等）。

### 2.2 `POST .../chapters/{n}/text`

body：`{ paragraphs: [string] }`。首次写入后不可覆盖（幂等拒绝重复不同内容）；存 `co_reading_chapter_texts`。

### 2.3 `POST .../chapters/{n}/open`（SSE）

1. 取本章 `paragraphs` + **前情摘要**（前 1 章的批注摘要，≤500 字）。
2. LLM 流式生成（见 §3）；逐行解析输出协议：
   - `<ANNOTATION>{json}` → 落库 annotations → SSE `annotation_anchor`（含 anchor/kind）+ `annotation_delta`（content 分片）+ `annotation_done`；
   - `<CHAPTER_END>` → 更新 `current_chapter = n+1`（最后一章置 `status=finished`）→ SSE `chapter_done`。
3. **幂等回放**：本章已有 annotations 且无 `force` → 按库内顺序重放事件（不调 LLM）。
4. 批注数硬上限 **8** 条/章；超出即截断并 `chapter_done`。

### 2.4 `POST .../chapters/{n}/replies`（SSE）

body：`{ replies: [{ annotationId, text }] }`。
逐条：先 `reply_ack {annotationId}`，构造 prompt（§3.2）流式生成 → `reply_response {annotationId, delta}`；全部回应后追加一段 `chat_delta` 邀请讨论。落库 replies + chat。

### 2.5 `POST .../chat`（SSE）

`{ text }` → 单轮（带会话近 10 条 chat 上下文）流式 `chat_delta`；落库。**上下文仅含 `≤ current_chapter`** 的讨论。

### 2.6 `PUT .../progress`、`GET /sessions/{id}`、`GET /sessions`

- progress：更新 `current_chapter`（只前进不回退）。
- 恢复 GET：返回 sessions 文档 + 全部 annotations + replies + chat（分章分组）。
- 列表：`user_id` 下按 `updated_at` 倒序，含 `fileName / progress / status`。

---

## 3. 提示词

### 3.1 系统提示词（`prompts/co_reading_system.md`）

以产品提供的共读 prompt 原文为主体（逐章阅读 / 即时点评 / 富媒体批注 / 平等书友 / 防剧透 / 阅读边界六节），参数化注入：

| 变量 | 来源 |
|------|------|
| `{book_title}` | session.file_name（去扩展名） |
| `{chapter_index}/{chapter_total}` | 当前章 |
| `{chapter_text}` | **仅本章** paragraphs 拼接 |
| `{prev_summary}` | 前 1 章批注摘要 ≤500 字 |
| `{annotations_so_far}` | 本章已生成的批注（人格连续性） |
| `{user_replies}` | replies 阶段注入 |
| `{unread_bound}` | 硬边界声明：「你只能看到本章为止的内容」 |

**输出协议**（严格 JSONL，便于流式解析）：

```
<ANNOTATION>{"anchor_paragraph": 12, "quote": "…≤80字", "kind": "suspicion", "content": "1–3 句口语点评"}
<ANNOTATION>{…}
<CHAPTER_END>
```

- AI **不复述原文**（原文由前端渲染），仅输出批注行 + 结束标记；章首允许一行 ≤50 字引入语（作为 `chat_delta` 发出）。
- 约束在 prompt 末尾以「平台格式要求」小节追加，不改变原 prompt 语气设定。

### 3.2 留言回应提示词

system 同 §3.1（含本章批注列表），user 消息为留言数组 + 指令：

> 用户对部分批注留下了留言。请逐条回应：先以书友身份表明是否同意/被说服，允许与用户观点不同（原 prompt 第四节）；每条回应 2–4 句；全部回应完，再用一段话邀请自由讨论。

### 3.3 防剧透（双保险）

1. Prompt 层：`{unread_bound}` 声明 + 原第五节规则。
2. 数据层：`chapter_text` 只注入 `≤ current_chapter`；chat/replies 上下文同样截断。**模型在服务端永远看不到后文**。

---

## 4. 模型与成本

- 主生成：现有 LLM 通道，`temperature ≈ 0.9`（书友感），`max_tokens` 章节批注 ≤ 1500。
- 批注 3–8 条/章：prompt 内「点评数量由内容决定，没有想法就安静」，服务端硬上限兜底。
- 内容审核：批注/讨论输出过现有审核通道（如有），命中则替换为中性文案并标记。

## 5. 错误与重试

| 情况 | 行为 |
|------|------|
| LLM 中途断流 | 已落库的 annotations 保留；SSE 发 `error { code: "generation_interrupted" }`；客户端重试走幂等回放 |
| 本章文本缺失 | 400 `error: "chapter_text_missing"`（前端先调 text 接口） |
| replies 含未知 annotationId | 400 `error: "annotation_not_found"` |

## 6. 验收（Python 侧）

- `open` 幂等：二次调用不调 LLM、事件回放一致。
- 剧透测试：user 直接要求「总结全书结局」→ 拒绝或明确标注猜测（prompt 未见过后文）。
- 批注 anchor 的 `paragraph_index` 落在前端上报段落范围内（抽测）。
- 回放/断线重连不产生重复 annotations（以 `_id` 幂等）。