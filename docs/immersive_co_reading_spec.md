# 沉浸式共读（AI Co-Reading）— 三端实现规格

版本：2026-10-16 ｜ 状态：Draft（供前端 / Java BFF / Python 评审）

AI 与用户作为**平等书友**逐章共读小说：AI 在原文相应位置插入独立批注卡片，用户可选回复，章末一次性汇总发送，双方讨论后进入下一章。核心体验接近「带 AI 批注层的小说阅读器」。

---

## 0. 入口（前端）

在现有「在线阅读」入口旁并列新增「沉浸式共读」，三处对齐：

| 位置 | 现状 | 改动 |
|------|------|------|
| 落地页 `GeneratorSection.vue` Tab 列表（`tabRead: "在线阅读"` 按钮） | `{ id: 'read', label: t('landing.tabRead'), icon: BookOpen }` | 其后新增 `{ id: 'coRead', label: t('landing.tabCoRead'), icon: BookHeart }` |
| 工作区 `WorkspaceGenerator.vue` Tab（`workspace.tabRead`） | read tab | 其后新增 co-read tab，进入共读视图 |
| 阅读中心 `ReaderHubView.vue`（`reader.hubTitle` 页面） | `LocalReaderUploadPanel` | 面板内增加模式选择：`在线阅读` / `沉浸式共读`（默认在线阅读） |

i18n 新键（en / zh-CN）：

```
landing.tabCoRead = "Immersive Co-Reading" / "沉浸式共读"
workspace.tabCoRead = 同上
reader.coReadTitle = "沉浸式共读"
reader.coReadSubtitle = "上传小说，AI 书友逐章陪你读，边读边批注讨论。"
reader.coReadPickFile = "选择或拖入小说文件"
reader.coReadFormats = "TXT · EPUB · Markdown"
reader.coReadStart = "开始共读"
coRead.* = 共读界面文案（§2.6）
```

**MVP 支持格式**：TXT、Markdown、EPUB（复用 `EpubReader` 的解析取文本能力）；PDF 扫描件不支持。

---

## 1. 交互总览（循环）

```
上传小说 → 识别章节 → 选起始章
   ↓
┌─ 展示一章原文（分页/滚动）────────────────────────┐
│  AI 在感兴趣位置插入批注卡片（SSE 流式到达）          │
│  用户可对任意卡片填写留言（本地暂存，不打断阅读）      │
└─ 本章读完 →「发送留言给 AI 书友」按钮 ──────────────┘
   ↓
讨论：AI 逐条回应留言 → 自由聊天（工作台抽屉/面板）
   ↓
用户点「下一章」→ 回到循环（AI 解锁下一章内容）
```

防剧透规则贯穿全程：AI 任何时刻只能基于 `≤ 当前章` 的文本生成内容（服务端强制截断，见 §4.3）。

---

## 2. 前端规格

### 2.1 路由与视图

- 新路由：`/co-reading`（需登录，`meta: { requiresAuth: true }`），视图 `src/views/CoReadingView.vue`。
- 会话恢复：`/co-reading?session=cr_xxx` 直达进行中的共读。
- `CoReadingView` 内部状态机：`idle → parsing → ready(章节选择) → reading → discussing → finished`。

### 2.2 组件

```
src/components/coReading/
  CoReadSetup.vue          // 上传 + 章节识别结果 + 起始章选择
  CoReadChapterPane.vue    // 章节原文渲染（虚拟滚动，段落锚点 id=para-{n}）
  CoReadAnnotationCard.vue // 单条 AI 批注卡片（§2.4）
  CoReadReplyTray.vue      // 底部托盘：已填留言数 +「发送给 AI 书友」
  CoReadChatPanel.vue      // 章末讨论（复用 book-expert 聊天气泡样式）
  CoReadChapterNav.vue     // 章节目录 + 阅读进度
```

### 2.3 文件解析与章节切分（前端优先）

- TXT/Markdown：按正则切章（`/^第[一二三…0-9]+[章回节卷部]|^Chapter\s+\d+/im` 等），`src/utils/coReadChapter.ts` 提供 `splitChapters(text): Chapter[]`（`{ index, title, paragraphs: string[], charCount }`）。
- EPUB：用 epubjs 逐 section 取 `textContent`，每个 spine section 默认一章；识别失败回退整本一章。
- 切分结果与文件 hash（SHA-256）一起发给后端建会话；后端以 **前端上报章节** 为准（MVP），Python 端保留自行切分能力用于校验/兜底。

### 2.4 批注卡片

每条 AI 批注（`annotation`）结构：

```ts
interface CoReadAnnotation {
  id: string              // ann_xxx
  chapterIndex: number
  anchor: {               // 原文定位（两者至少其一）
    paragraphIndex: number  // 段落序号（前端锚点）
    quote?: string          // ≤80 字原文引用
  }
  kind: 'reaction' | 'suspicion' | 'praise' | 'prediction' | 'question' | 'tease'
  content: string         // AI 点评（1–3 句，口语化）
  myReply?: string        // 用户留言（本地填写）
  replySent?: boolean
}
```

- 卡片渲染在**锚点段落之后**内联插入（非侧栏），含：原文引用（可展开）、AI 点评、`我的留言` 独立 textarea。
- 留言仅存前端 store（Pinia `coReading` store + localStorage 草稿），不逐条请求。
- SSE 流式生成时卡片先渲染骨架（`anchor` 先到先挂载，`content` 打字机追加）。

### 2.5 API（前端 → BFF，均 `/api2` 前缀，JWT 常规携带）

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/co-reading/sessions` | 建会话：`{ fileHash, fileName, format, chapters: [{index,title,charCount}], startChapter, uiLocale }` → `{ ok, sessionId }` |
| POST | `/co-reading/sessions/{id}/chapters/{n}/open` | 请求生成本章批注（SSE，见 §2.5.1）；重复调用幂等（已生成则直接回放事件） |
| POST | `/co-reading/sessions/{id}/chapters/{n}/replies` | 章末汇总发送：`{ replies: [{annotationId, text}] }`（SSE 返回逐条回应+讨论） |
| POST | `/co-reading/sessions/{id}/chat` | 章末自由讨论消息：`{ text }`（SSE） |
| POST | `/co-reading/sessions/{id}/progress` | `{ chapterIndex, scrollPercent }` 心跳上报（阈值变化才发） |
| GET | `/co-reading/sessions/{id}` | 恢复：会话元数据 + 各章批注 + 讨论历史 |
| GET | `/co-reading/sessions` | 我的共读列表（阅读中心「继续共读」） |

### 2.5.1 SSE 事件约定（与 book-expert distill 同风格）

```
event: annotation_anchor   data: { id, chapterIndex, anchor, kind }
event: annotation_delta    data: { id, delta }
event: annotation_done     data: { id }
event: chapter_done        data: { chapterIndex, annotationCount }
event: reply_ack           data: { annotationId }            // 留言被理解
event: reply_response      data: { annotationId, delta }     // 逐条回应（流式）
event: chat_delta          data: { delta }
event: error               data: { code, message }
event: ping
```

前端沿用 `parseSseBlock` 工具（抽到 `src/utils/sse.ts` 共用）。

### 2.6 文案键（`coRead.*`，中英双语）

`annotationTitle`（AI 书友批注）、`myReplyPlaceholder`（写下你的想法，章末一起发送）、`sendReplies`（发送留言给 AI 书友 (n)）、`nextChapter`（下一章）、`finishBook`（读完啦，生成共读回顾）、`discussTitle`（章末讨论）、`spoilerNotice`（AI 只基于你已读到的进度发言）等。

### 2.7 状态持久化

- Pinia store：当前会话、章节缓存（LRU，仅最近 3 章全文）、批注、草稿留言。
- localStorage：`page2top.coReading.draft.{sessionId}.{chapterIndex}`（留言草稿）、`page2top.coReading.lastSession`。
- 服务端为权威（恢复接口），本地仅草稿与快速恢复。

---

## 3. Java BFF 规格

### 3.1 路由

前缀 `/api2/co-reading/*`，**全部需有效 JWT**（与 book-expert 写接口一致；无公开页需求）。Filter 注入 `userId`（与现有 book-experts 相同模式），转发 Python。

| BFF | Python 上游 |
|-----|-------------|
| `POST /co-reading/sessions` | `POST /co-reading/sessions` |
| `POST /co-reading/sessions/{id}/chapters/{n}/open` | `POST .../open`（SSE 透传） |
| `POST /co-reading/sessions/{id}/chapters/{n}/replies` | `POST .../replies`（SSE 透传） |
| `POST /co-reading/sessions/{id}/chat` | `POST .../chat`（SSE 透传） |
| `POST /co-reading/sessions/{id}/progress` | `PUT .../progress` |
| `GET /co-reading/sessions/{id}`、`GET /co-reading/sessions` | 同名 GET |

### 3.2 规则

1. **归属校验**：所有 `{id}` 路由校验 `session.user_id == JWT.userId`，否则 404（不泄露存在性）。
2. **SSE 透传**：`Content-Type: text/event-stream`，禁缓冲（`X-Accel-Buffering: no`），客户端断开即向上游 cancel；超时 ≥ 5 分钟（章节生成可较长）。
3. **限流**：`open`/`replies`/`chat` 每会话每分钟 ≤ 6 次；`progress` 限 1 次/10s。
4. **信封**：非 SSE 响应统一 `{ ok: true, ... }`；错误 `{ ok: false, error, message }`（禁止用 900111 表达业务错误）。
5. **配额**：接入现有 points 体系（可选）：每章批注生成扣 1 点，余额不足返回 `error: "insufficient_points"`（前端提示）。MVP 可先免费，字段预留。

---

## 4. Python 规格

### 4.1 数据模型（MongoDB）

```
co_reading_sessions {
  _id, user_id, file_hash, file_name, format,
  chapters: [{ index, title, char_count }],     // 前端上报的目录（不含全文）
  start_chapter, current_chapter, status,        // active | finished
  ui_locale, created_at, updated_at
}
co_reading_chapter_texts {
  session_id, chapter_index, text,               // 全文（服务端留存，供防剧透截断与重放）
  paragraphs: [string]
}
co_reading_annotations {
  _id, session_id, chapter_index, anchor, kind, content, created_at
}
co_reading_replies {
  _id, session_id, chapter_index, annotation_id, text, created_at
}
co_reading_chat {
  _id, session_id, chapter_index, role: user|assistant, text, created_at
}
```

- `chapter_texts` 上传后由前端随 `open` 首次调用分片上传（`POST /co-reading/sessions/{id}/chapters/{n}/text`，body `{ paragraphs: [...] }`，BFF 校验大小 ≤ 2MB/章）；或 MVP 直接在 `open` 请求体携带本章文本（简单，推荐 MVP）。

### 4.2 系统提示词（核心）

将用户提供的共读 prompt 原文作为 **system prompt**（存 `prompts/co_reading_system.md`，参数化注入）：

- 注入变量：`{book_title}`、`{chapter_index}/{chapter_total}`、`{chapter_text}`、`{annotations_so_far}`（前文批注摘要，用于保持人格连续）、`{user_replies}`（章末发送时）、`{unread_bound}`（= 本章末尾，防剧透硬边界）。
- 输出协议（供流式解析）：AI 先输出批注 JSONL，再输出正文展示，格式：

```
<ANNOTATION>{"anchor_paragraph": 12, "quote": "…", "kind": "suspicion", "content": "…"}
正文段落……
<ANNOTATION>{…}
……
<CHAPTER_END>
```

- 章末 replies/chat 阶段：system 同上，另附 `replies` 列表，要求**逐条**以 `reply_response` 对应 annotationId 回应，再进入自由讨论；语气遵循 prompt 第四节（平等书友、允许分歧）。
- 防剧透：prompt 第五节 + 服务端双重保障——`chapter_text` 只注入 `≤ current_chapter` 的内容，模型无法看到后文（§4.3）。

### 4.3 生成流程（`open`）

1. 取本章 `paragraphs` + 前情摘要（前 1 章批注摘要，≤ 500 字）。
2. LLM（流式）按 §4.2 协议输出；服务端逐行解析：
   - `<ANNOTATION>` → 落库 `co_reading_annotations`，SSE 发 `annotation_anchor` + `annotation_delta`/`done`；
   - 正文行 → 忽略（前端自渲染原文，AI 不重复输出全文；prompt 中要求 AI **不要复述原文**，仅输出批注与 `CHAPTER_END`，减少 token）。**修正**：MVP 让 AI 只输出批注行 + 简短章首引入语；原文展示完全由前端负责。
3. `<CHAPTER_END>` → `chapter_done`，更新 `current_chapter`。
4. 幂等：本章已有 annotations 且未带 `force` → 直接回放库内数据（事件重放）。

### 4.4 留言汇总（`replies`）

逐条构入 prompt → 流式输出 `reply_response`（每条先 `reply_ack`）→ 追加一条 `chat_delta` 邀请讨论 → 全部落库。

### 4.5 安全与边界

- 输入校验：章文本 ≤ 2MB；单本 ≤ 200 章；`file_hash` 去重复用会话。
- 内容安全：沿用现有内容审核通道（如有）对批注/讨论输出过滤。
- 成本控制：批注数 3–8 条/章（prompt 中约束「点评数量由内容决定」，另加硬上限 8）。

---

## 5. 里程碑

| 阶段 | 内容 |
|------|------|
| M1 | 前端章节切分 + 建会话 + `open` 流式批注卡片（无留言） |
| M2 | 留言草稿 + 章末汇总 + `replies` 流式回应 + 讨论 panel |
| M3 | 会话恢复/列表、防剧透回归、限流与配额、共读回顾（全书读完生成总结页，可选） |
| M4 | EPUB 支持、批注表情互动、多会话并行 |

## 6. 验收要点

- 章内 AI 批注与锚点段落对齐；刷新后恢复不丢批注。
- 未发留言的卡片不阻塞；「发送 (0)」时也可仅触发 AI 邀请讨论。
- 剧透测试：让 AI「讲讲下一章」——应拒绝或仅猜测并标注猜测。
- 弱网：SSE 断线后重连重放（幂等回放）不产生重复卡片。