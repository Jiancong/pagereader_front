# 沉浸式共读 — 前端规格

版本：2026-10-16 ｜ 上游契约：`immersive_co_reading_spec.md`（API / SSE / 批注结构）

技术栈与现有约定一致：Vue 3 + Pinia + vue-i18n + Tailwind；SSE 用 fetch 流读取（沿用 `bookExpert.ts` 的 `parseSseBlock` 模式）。

---

## 1. 入口

| 位置 | 改动 |
|------|------|
| 落地页 `GeneratorSection.vue` Tab 列表 | `read`（在线阅读）后新增 `{ id: 'coRead', label: t('landing.tabCoRead'), icon: BookHeart }` |
| 工作区 `WorkspaceGenerator.vue` Tab | 同上新增 co-read tab |
| 阅读中心 `ReaderHubView.vue` | `LocalReaderUploadPanel` 内增加模式选择：`在线阅读` / `沉浸式共读`（默认在线阅读） |

i18n 新键（en / zh-CN）：

```
landing.tabCoRead / workspace.tabCoRead = "Immersive Co-Reading" / "沉浸式共读"
reader.coReadTitle = "沉浸式共读"
reader.coReadSubtitle = "上传小说，AI 书友逐章陪你读，边读边批注讨论。"
reader.coReadPickFile = "选择或拖入小说文件"
reader.coReadFormats = "TXT · EPUB · Markdown"
reader.coReadStart = "开始共读"
```

**MVP 支持格式**：TXT、Markdown、EPUB；PDF 扫描件不支持（提示走在线阅读）。

---

## 2. 路由与视图

- 新路由 `/co-reading`（`meta: { requiresAuth: true }`），视图 `src/views/CoReadingView.vue`。
- `/co-reading?session=cr_xxx` 直达进行中的会话。
- 状态机：`idle → parsing → ready(章节选择) → reading → discussing → finished`。

---

## 3. 组件

```
src/components/coReading/
  CoReadSetup.vue          // 上传 + 章节识别结果 + 起始章选择
  CoReadChapterPane.vue    // 章节原文渲染（虚拟滚动，段落 id=para-{n}）
  CoReadAnnotationCard.vue // 单条批注卡片
  CoReadReplyTray.vue      // 底部托盘：已填留言数 +「发送给 AI 书友」
  CoReadChatPanel.vue      // 章末讨论（复用 book-expert 气泡样式）
  CoReadChapterNav.vue     // 章节目录 + 阅读进度
```

### 3.1 批注卡片（核心）

- 渲染在**锚点段落之后**内联插入（非侧栏）：原文引用（可展开）→ AI 点评 → `我的留言` 独立 textarea。
- SSE 流式：`annotation_anchor` 先到先挂骨架（按 `anchor.paragraphIndex` 定位），`annotation_delta` 打字机追加，`annotation_done` 落定。
- 留言仅存前端（Pinia + localStorage 草稿），**不逐条请求**；`replySent` 后置灰。

### 3.2 章末流程

1. `CoReadReplyTray` 显示「发送留言给 AI 书友 (n)」；n=0 也可发送（仅触发 AI 邀请讨论）。
2. 调 `POST .../replies`（SSE）：`reply_ack` 将对应卡片置为已回应；`reply_response` 流式渲染到讨论面板并锚回卡片；`chat_delta` 渲染自由讨论。
3. 用户点「下一章」→ `open` 下一章，回到阅读态；最后一章显示「读完啦」。

---

## 4. 文件解析与切章（前端负责，MVP 权威）

`src/utils/coReadChapter.ts`：

```ts
interface CoReadChapter { index: number; title: string; paragraphs: string[]; charCount: number }
function splitChapters(text: string): CoReadChapter[]
```

- TXT/Markdown 正则切章：`/^第[一二三…0-9]+[章回节卷部]|^Chapter\s+\d+/im` 等；无法识别则整本一章。
- EPUB：epubjs 逐 spine section 取 `textContent`，一个 section 默认一章。
- 文件 SHA-256 hash 与目录随 `POST /co-reading/sessions` 上报；**分段文本**在首次 `open` 时随 `POST .../chapters/{n}/text` 上传（≤2MB/章）。

---

## 5. API 客户端

`src/api/coReading.ts`（复用 `bookExpert.ts` 的 rawRequest + SSE 模式，SSE 解析抽到 `src/utils/sse.ts` 共用）：

| 方法 | 调用时机 |
|------|----------|
| `createSession(body)` | Setup 完成时 |
| `uploadChapterText(id, n, paragraphs)` | 首次 `open` 前 |
| `openChapter(id, n)` | 进入章节（SSE） |
| `sendReplies(id, n, replies)` | 章末汇总（SSE） |
| `sendChat(id, text)` | 讨论（SSE） |
| `reportProgress(id, chapterIndex, scrollPercent)` | 阈值变化节流 |
| `getSession(id)` / `listSessions()` | 恢复 / 列表 |

SSE 事件表见总览 §4；断线自动重连一次并依赖服务端幂等回放（重复 `annotation_anchor` 按 id 去重）。

---

## 6. 状态与持久化

- Pinia `useCoReadingStore`：会话、章节缓存（LRU 最近 3 章全文）、批注列表、草稿留言、讨论历史。
- localStorage：
  - `page2top.coReading.draft.{sessionId}.{chapterIndex}` — 留言草稿
  - `page2top.coReading.lastSession` — 快速恢复入口
- 服务端 `GET /sessions/{id}` 为权威恢复源；本地仅草稿与加速。

---

## 7. i18n（`coRead.*`，中英双语）

`annotationTitle`（AI 书友批注）、`myReplyPlaceholder`（写下你的想法，章末一起发送）、`sendReplies`（发送留言给 AI 书友 (n)）、`nextChapter`（下一章）、`finishBook`（读完啦）、`discussTitle`（章末讨论）、`spoilerNotice`（AI 只基于你已读到的进度发言）、`chapterOf`（第 {n}/{total} 章）等。

---

## 8. 验收（前端侧）

- 批注与锚点段落对齐；刷新/重进恢复完整（服务端权威）。
- 留言草稿本地留存；发送后卡片状态正确。
- SSE 断线重连不产生重复卡片。
- 未登录访问 `/co-reading` 跳登录；非本人会话 404 显示友好错误。