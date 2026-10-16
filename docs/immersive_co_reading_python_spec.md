# 沉浸式共读 — Python 规格

版本：**2026-10-16（逐页 open + 解析/SSE 对齐）** ｜ 上游：`immersive_co_reading_spec.md` ｜ 前端：`immersive_co_reading_frontend_spec.md`

Python 负责：共读人格（系统提示词）、**当前阅读页**批注生成、LLM 输出解析、SSE 事件序列、留言/讨论、防剧透与 Mongo 持久化。

> **核心模型（与前端 commit `28f612f` / 逐页 spec 一致）**  
> **一次 `open` = 当前一页的批注**；前端翻页顺序：`POST .../page` 同步页文本 → `POST .../open`（SSE）。  
> 该页已有批注 → **幂等重放**（不调 LLM）；无 → 调 LLM。`force=true` 仅重生成**当前页**。

---

## 1. 数据模型（MongoDB）

```
co_reading_sessions {
  _id                       // cr_xxx
  user_id
  file_hash, file_name, format        // txt | markdown | epub
  chapters: [{ index, title, char_count }]
  start_chapter, current_chapter
  status                    // active | finished
  ui_locale                 // zh | en
  created_at, updated_at
}

co_reading_chapter_texts {
  session_id, chapter_index
  paragraphs: [string]      // 整章分段（防剧透 / 章级上下文，首次 text 上传）
}

co_reading_page_texts {    // 逐页模型（与前端 POST /page 对齐）
  session_id, chapter_index, page_index   // 复合唯一
  page_total?: number
  paragraphs: [string]      // 由 page.text 按 §4.1 规则切段；open 时优先读本页
  text_raw?: string          // 可选，审计用，≤8k
  updated_at
}

co_reading_annotations {
  _id                       // ann_xxx → SSE 字段 annotationId
  session_id, chapter_index
  page_index: number        // 1-based，与阅读器页码一致；重放/过滤必需
  anchor: { paragraph_index, quote? }   // paragraph_index：相对**当前页** paragraphs 下标
  kind, content, created_at
}

co_reading_replies { ... }   // 不变
co_reading_chat { ... }      // 不变
```

索引建议：

- `texts(session_id, chapter_index)` 唯一  
- `page_texts(session_id, chapter_index, page_index)` 唯一  
- `annotations(session_id, chapter_index, page_index)`（列表 + 重放）

---

## 2. HTTP API 行为

### 2.1 `POST /co-reading/sessions`

body：`{ userId, fileHash, fileName, format, chapters, startChapter, uiLocale }`。  
校验：章节 ≤ 200；`fileHash` hex64。同 `user_id + file_hash` 已有 active 会话 → 返回已有 `sessionId`（幂等）。

### 2.2 `POST .../chapters/{n}/text`

body：`{ paragraphs: [string] }`。首次写入后不可覆盖（幂等不同内容）；存 `co_reading_chapter_texts`。

### 2.3 `POST .../chapters/{n}/page`（逐页，**open 前必调**）

body：

```json
{
  "pageIndex": 1,
  "pageTotal": 42,
  "text": "当前页可见正文…"
}
```

行为：

1. `text` 截断 ≤ 8000 字符（与前端一致）。  
2. 按 **§4.1** 将 `text` 切成 `paragraphs[]`，写入/更新 `co_reading_page_texts`（同 `(session_id, chapter_index, page_index)` 覆盖更新，保证 open 读到最新页）。  
3. 返回 `{ ok: true }`。  
4. 若 open 时找不到当前页记录 → SSE `error { code: "chapter_text_missing" }`（前端可补 page 后重试）。

### 2.4 `POST .../chapters/{n}/open`（SSE）

body（JSON，**勿用 query**；BFF 需原样转发 body）：

```json
{ "force": false }
```

流程：

1. 读取 **当前页** `co_reading_page_texts`（由最近一次 `/page` 决定 `page_index`；需在 session 或请求上下文中明确「当前页」，实现方式二选一并在 BFF/Python 文档写死）：  
   - **推荐**：session 上维护 `last_page_index` / `last_page_chapter`，由 `/page` 更新；  
   - 或 open body 扩展 `pageIndex`（若采用须在 BFF spec 同步）。  
2. 取本章 `chapter_texts.paragraphs` 作防剧透边界 + `{prev_summary}`；**生成 prompt 的正文片段以当前页 `paragraphs` 为主**。  
3. **幂等重放**：同 `(session, chapter, page_index)` 已有 annotations 且 `force != true` → 按库顺序重放 SSE（`replayed: true`），不调 LLM。  
4. 否则调 LLM（§3），**流式解析**（§4）→ 落库 → 按序发 SSE（§5）。  
5. 结束发 `chapter_done`（§5.6）。  
6. 单页批注硬上限 **8** 条；超出截断并仍 `chapter_done`。

`force: true`：删除或忽略该页旧 annotations 后重新生成（仅当前页，不影响其他页）。

### 2.5 `POST .../chapters/{n}/replies`（SSE）

不变：body `{ replies: [{ annotationId, text }] }` → `reply_ack` / `reply_response` / 末尾 `chat_delta`。

### 2.6 `POST .../chat`、`PUT .../progress`、`GET /sessions/{id}`、`GET /sessions`

与总览 spec 一致。GET 恢复时 annotations 需带 `pageIndex`（或 `page_index` 由 BFF 转 camelCase）。

---

## 3. 提示词与 LLM 输出协议

### 3.1 系统提示词（`prompts/co_reading_system.md`）

参数化注入（在原有共读 prompt 上追加「平台格式」小节，不改语气）：

| 变量 | 来源 |
|------|------|
| `{book_title}` | session.file_name |
| `{chapter_index}` / `{chapter_total}` | 当前章 |
| `{page_index}` / `{page_total}` | 当前页（逐页） |
| `{page_text}` | **当前页** paragraphs 拼接（`\n\n`） |
| `{chapter_text}` | 整章 paragraphs（仅作边界说明，勿要求模型复述） |
| `{prev_summary}` | 前情 ≤500 字 |
| `{annotations_so_far}` | 本页已生成批注（同页重试/续写时） |
| `{unread_bound}` | 只能基于已读进度 |

**模型必须输出的结构（机器可读）**：

1. **可选** 章首/页首引入：纯自然语言 **≤50 字**，**不要**包在 `<ANNOTATION>` 里；解析器将其汇总为 SSE `chat_delta`（可 1～N 条 delta，勿把 `{` 等 JSON 碎片当作 intro 发出）。  
2. 一条或多条批注：每条以标签 `<ANNOTATION>` 开头，后接 **一个 JSON 对象**（见下）。  
3. 结束：单独一行 `<CHAPTER_END>`（表示**本页 open 结束**，不是整本书结束）。

**JSON 字段（LLM 侧命名，解析时必须全部接受）**：

```json
{
  "anchor_paragraph": 0,
  "quote": "原文短引 ≤80 字",
  "kind": "humor",
  "content": "1–3 句口语批注"
}
```

别名（解析层统一映射）：

| LLM 可能写 | 存库 / SSE |
|------------|------------|
| `anchor_paragraph` | `anchor.paragraph_index` |
| `paragraph_index` / `paragraphIndex` | 同上 |
| `quote` | `anchor.quote` |
| `kind` | 小写枚举（§5.3） |

**Prompt 中明确禁止**：

- 在 `<ANNOTATION>` 外输出大段与批注无关的正文（若模型仍输出，解析器应**丢弃**或整段作为 intro 前的 chat_delta，**不得**因此跳过 `<ANNOTATION>` 解析）。  
- 复述整页原文；仅 `quote` 短引。  
- 在 JSON 外再包 markdown 代码块。

**推荐示例（单行，最不易踩坑）**：

```
<ANNOTATION>{"anchor_paragraph":0,"quote":"Your Brain On Porn","kind":"humor","content":"…"}
<CHAPTER_END>
```

**也必须支持（实测模型常犯）**：

```
<ANNOTATION>
{
  "anchor_paragraph": 0,
  "quote": "...",
  "kind": "question",
  "content": "..."
}
<ANNOTATION>
{"anchor_paragraph": 1, ...}
<CHAPTER_END>
```

即：`<ANNOTATION>` 与 `{` 之间允许空白/换行；JSON 可 pretty-print；连续多个 `<ANNOTATION>` 块。

### 3.2 留言 / 讨论

同原 spec §3.2；上下文仍限制 `≤ current_chapter`。

### 3.3 防剧透

Prompt + 数据层双保险；`page_text` / `chapter_text` 均不得包含未读章节。

---

## 4. LLM 流解析（实现要求 · **必过**）

### 4.1 页文本切段（与前端 `POST /page` 一致）

对 `page.text`：

1. `\r\n` → `\n`，NBSP → 空格。  
2. 按 `\n\s*\n+` 拆块；块内行合并为一段。  
3. 若无空行但有多段 DOM 式内容：前端会发 `\n\n`  Join 的块；**禁止**整页压成单段后再要求 anchor>0（除非整页确实一段）。  
4. `paragraph_index` 为 **0 .. len(paragraphs)-1**（相对**当前页**）。

### 4.2 解析算法（伪代码）

```
buffer = ""
for each llm_token_chunk:
  buffer += chunk
  flush_intro_lines(buffer)      // 见 4.3
  while match = find_next_annotation(buffer):
    obj = parse_json_object(...)  // 支持跨行、trim、尾逗号容错（可选）
    if obj valid:
      emit_annotation(obj)
    buffer = remainder after match
  if buffer contains "<CHAPTER_END>":
    break
log annotations_parsed=N
if N==0 and buffer had "<ANNOTATION>":
  log parse_errors with snippet   // 必打，便于排查
```

`parse_json_object`：**从第一个 `{` 做括号匹配到对称 `}`**，中间允许换行；不要要求单行 `json.loads(整行)`。

### 4.3 Intro → `chat_delta`

- 在**第一个** `<ANNOTATION>` 或 `<CHAPTER_END>` 之前的非空文本 → intro（合并后 ≤50 字校验，超出可截断）。  
- **禁止**把单独的 `{`、`[` 当作 intro 下发；若 LLM 先输出 `{` 再输出 JSON，应等待完整 `<ANNOTATION>{...}` 再解析。  
- Intro 发完后，再发各条的 `annotation_*`。

### 4.4 解析失败与日志（验收必查）

每条 open 结束必须打：

```
open LLM done chunks=… chars=… chapter_ended=… annotations_parsed=N
```

当 `N==0` 且 raw 中含 `<ANNOTATION>` 时，额外：

```
annotation_parse_failed reason=… snippet=…（脱敏 ≤200 字）
```

**禁止**在 `annotations_parsed=0` 时仍假装成功：此时只能发 intro（若有）+ `chapter_done`，且 `chapter_done.annotationCount=0`；运维应视为 P1 解析 bug。

### 4.5 落库 → SSE 顺序（每条批注）

对每条解析成功的 annotation：

1. 生成 `annotationId = ann_<uuid>`，写入 `co_reading_annotations`（含 `page_index`）。  
2. SSE **`annotation_anchor`**（必须含 `annotationId`，见 §5）。  
3. SSE **`annotation_delta`**：将 `content` 按 20～80 字分片（模拟流式；重放同样分片或一次 delta 均可）。  
4. SSE **`annotation_done`**：`{ annotationId, content? }`（完整 content 可选但推荐）。

**不得**只发 `chat_delta` + `chapter_done` 而跳过 2～4（除非 N=0）。

---

## 5. SSE 事件契约（Python → BFF → 前端）

字段 **camelCase**；BFF 透传不改名。

### 5.1 `meta`（可选首包）

```json
{ "sessionId", "chapterIndex", "projectId", "userId" }
```

### 5.2 `chat_delta`（页首引入，可选）

```json
{ "role": "assistant", "delta": "这一页全是版权…" }
```

### 5.3 `annotation_anchor`（必需字段）

```json
{
  "annotationId": "ann_xxx",
  "chapterIndex": 1,
  "pageIndex": 2,
  "kind": "humor",
  "anchor": {
    "paragraph_index": 0,
    "quote": "Your Brain On Porn"
  }
}
```

- 前端同时兼容 `paragraphIndex` / 顶层 `anchor_paragraph`，但 **Python 产出以 `annotationId` + `anchor.paragraph_index` 为准**。  
- `kind` 枚举：`reaction | suspicion | praise | prediction | question | tease | hint | resonance | humor`（小写）。

### 5.4 `annotation_delta`

```json
{ "annotationId": "ann_xxx", "pageIndex": 2, "delta": "分片文本" }
```

### 5.5 `annotation_done`

```json
{ "annotationId": "ann_xxx", "pageIndex": 2, "content": "完整批注" }
```

### 5.6 `chapter_done`

```json
{
  "chapterIndex": 1,
  "pageIndex": 2,
  "annotationCount": 3,
  "replayed": false,
  "nextChapter": 2,
  "status": "active"
}
```

- `annotationCount`：本页本次 open 下发条数（重放时为库内条数）。  
- `replayed: true`：未调 LLM 的重放。

### 5.7 `error`

```json
{ "code": "generation_interrupted | chapter_text_missing | rate_limited | upstream_unavailable", "message": "…" }
```

---

## 6. 模型与成本

- `temperature ≈ 0.9`；单页 open `max_tokens` 建议 ≤ 1500。  
- 3～8 条/页由 prompt 引导，服务端硬上限 8。  
- 内容审核（若有）命中 → 替换中性文案并仍发完整 SSE 序列。

---

## 7. 错误与重试

| 情况 | 行为 |
|------|------|
| LLM 断流 | 已落库保留；`error generation_interrupted`；客户端手动重试 open |
| 无 page 文本 | `chapter_text_missing` |
| 解析 0 条但含 `<ANNOTATION>` | 打 error 级日志；`chapter_done` count=0；**修解析器**，勿长期依赖 |
| replies 未知 id | 400 `annotation_not_found` |

---

## 8. 回归用例（针对线上问题）

### 8.1 日志中的 raw 必须解析出 3 条

输入（assistant_raw 节选）：

```
<ANNOTATION>
{ "anchor_paragraph": 0, "quote": "Your Brain On Porn", "kind": "humor", "content": "…" }
<ANNOTATION>
{ "anchor_paragraph": 1, "quote": "Internet Pornography…", "kind": "question", "content": "…" }
<CHAPTER_END>
```

期望：`annotations_parsed=2`（或 3 若含第三条），SSE 含 2～3 组 `annotation_anchor/delta/done`，**不能**仅 `chat_delta` + `chapter_done`。

### 8.2 Intro 与批注共存

```
这一页全是版权和免责声明，感觉还没进入正题呢。

<ANNOTATION>{"anchor_paragraph":7,"quote":"The information…","kind":"resonance","content":"…"}
<CHAPTER_END>
```

期望：1 条 `chat_delta`（或 2 条拼 intro）+ 1 组 annotation 事件 + `chapter_done` annotationCount=1。

### 8.3 幂等重放

同页第二次 open（无 force）→ 无 LLM；SSE 重放相同 `annotationId`；`replayed: true`。

### 8.4 anchor 范围

`anchor_paragraph` 必须在当前页 `paragraphs.length` 范围内；越界 clamp 或丢弃并打 warn（建议 clamp 到 `length-1` 以免前端挂空）。

---

## 9. Python 验收清单

- [ ] `/page` 切段与前端 `\n\n` 规则一致；open 前无 page → `chapter_text_missing`。  
- [ ] 解析器支持多行 JSON、`anchor_paragraph` 字段名。  
- [ ] 每条批注 SSE 含 **`annotationId`**，且顺序 anchor → delta(s) → done。  
- [ ] `annotations_parsed=0` 且 raw 含 `<ANNOTATION>` 时有 **parse_failed** 日志。  
- [ ] BFF curl 可见完整事件流（与 §5 一致），非仅 intro + chapter_done。  
- [ ] 防剧透 / 会话恢复 / 重放不重复 ann_id。

---

## 10. 与总览 spec 的差异说明（待同步总览）

逐页模型下，总览 §4 中 `annotation_anchor.data.id` 应统一为 **`annotationId`**；增加 **`pageIndex`**、**`replayed`**；`kind` 增加 `hint|resonance|humor`。  
`POST .../page` 写入本 spec §2.3。Java BFF 需转发 open body `{ force }` 与 page 接口。
