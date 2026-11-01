// 共读批注：
// - Markdown：段内行内 marker + hover 浮层
// - EPUB/MOBI（iframe 分页）：只读测量 quote Range → 宿主 overlay 悬浮 marker
//   绝不改动阅读 iframe 的 DOM（epubjs 依赖原始 DOM 计算 CFI，插节点会导致 IndexSizeError）
// @author hc @date 2026-10-16

import type { CoReadAnnotation } from "@/types/coReading"

const INLINE_STYLE_ID = "co-read-inline-styles"
const OVL_STYLE_ID = "co-read-ovl-styles"
const INLINE_ATTR = "data-co-read-inline-root"

export function collectParagraphAnchors(body: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = []
  const seen = new Set<HTMLElement>()
  const push = (el: HTMLElement) => {
    if (seen.has(el)) return
    if (!(el.textContent || "").trim()) return
    seen.add(el)
    blocks.push(el)
  }
  body.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6, pre").forEach((el) => {
    push(el as HTMLElement)
  })
  if (blocks.length === 0) {
    for (const el of Array.from(body.children)) {
      if (el instanceof HTMLElement) push(el)
    }
  }
  if (blocks.length === 0 && (body.textContent || "").trim()) {
    blocks.push(body)
  }
  return blocks
}

export function pageTextFromBody(body: HTMLElement): string {
  return collectParagraphAnchors(body)
    .map((el) => (el.textContent || "").trim())
    .filter(Boolean)
    .join("\n\n")
}

export interface CoReadInlineLabels {
  kind: (kind: string) => string
  streaming: string
  myReply: string
  replyPlaceholder: string
  replySent: string
  annotationTitle: string
  loading?: string
  generationFailed?: string
  retryPage?: string
  /** 卡片内按钮文案 */
  saveReply?: string
  savedReply?: string
  chatAbout?: string
  editReply?: string
  deleteReply?: string
  closePanel?: string
}

export interface CoReadInlineStatus {
  loading?: boolean
  intro?: string
  errorCode?: string
  emptyHint?: string
  onRetry?: () => void
}

interface CommonOptions {
  annotations: CoReadAnnotation[]
  labels: CoReadInlineLabels
  dark?: boolean
  status?: CoReadInlineStatus
  onDraft: (annotationId: string, text: string) => void
  /** 保存留言（持久化到服务端/本地） */
  onSaveReply?: (annotationId: string, text: string) => void
  /** 删除已保存的留言 */
  onDeleteReply?: (annotationId: string) => void
  /** 就这条批注发起与 AI 书友的对话 */
  onChatAbout?: (annotationId: string, text: string) => void
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function quoteWords(quote: string): string[] {
  return quote
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter(Boolean)
}

/** EPUB 内文：去软连字符、折叠空白，并保留 norm 下标 → raw 下标映射 */
function buildNormIndexMap(raw: string): { norm: string; normToRaw: number[] } {
  const normToRaw: number[] = []
  let norm = ""
  let inWs = false
  for (let ri = 0; ri < raw.length; ri++) {
    const ch = raw[ri]
    if (ch === "\u00ad") continue
    let c = ch === "\u00a0" ? " " : ch
    if (/\s/.test(c)) {
      if (!inWs && norm.length > 0) {
        norm += " "
        normToRaw.push(ri)
        inWs = true
      }
    } else {
      inWs = false
      norm += c.toLowerCase()
      normToRaw.push(ri)
    }
  }
  return { norm, normToRaw }
}

/** quote 可能被后端截断；在 norm 串上匹配，返回 raw [start, end) */
function findQuoteMatchRangeRaw(rawText: string, quote: string): [number, number] | null {
  const { norm, normToRaw } = buildNormIndexMap(rawText)
  if (!norm || !normToRaw.length) return null

  const tryNormSpan = (normStart: number, normEnd: number): [number, number] | null => {
    if (normStart < 0 || normEnd <= normStart || normEnd > norm.length) return null
    const rawStart = normToRaw[normStart]
    const rawEnd = normToRaw[normEnd - 1]
    if (rawStart === undefined || rawEnd === undefined) return null
    return [rawStart, rawEnd + 1]
  }
  const findNorm = (needle: string): [number, number] | null => {
    if (!needle) return null
    const i = norm.indexOf(needle)
    if (i < 0) return null
    return tryNormSpan(i, i + needle.length)
  }

  // 中文引文没有空格，quoteWords 只会得到 1 个 token，必须按前缀逐级回退匹配，
  // 否则引文被可见页切片截断（或后端截断）时永远匹配不到。
  const qNorm = buildNormIndexMap(quote).norm
  if (!qNorm) return null
  const whole = findNorm(qNorm)
  if (whole) return whole

  // 拉丁文：按词逐步缩短，容忍引文尾部差异
  const words = quoteWords(quote)
  if (words.length >= 2) {
    for (let n = words.length - 1; n >= 2; n--) {
      const part = buildNormIndexMap(
        words.slice(0, n).map((w) => w.toLowerCase()).join(" "),
      ).norm
      const hit = findNorm(part)
      if (hit) return hit
    }
  }

  // 通用前缀回退（CJK / 无空格 / 被截断）：从长到短逐步缩短，最少保留 6 个字符
  const MIN_PREFIX = 6
  if (qNorm.length > MIN_PREFIX) {
    const steps = Math.min(12, qNorm.length - MIN_PREFIX)
    for (let s = 1; s <= steps; s++) {
      const cut = Math.round(qNorm.length - (qNorm.length - MIN_PREFIX) * (s / steps))
      if (cut < MIN_PREFIX || cut >= qNorm.length) continue
      const hit = findNorm(qNorm.slice(0, cut))
      if (hit) return hit
    }
  }
  return null
}

/** @deprecated inline 模式仍用简单匹配 */
function findQuoteMatchRange(rawText: string, quote: string): [number, number] | null {
  return findQuoteMatchRangeRaw(rawText, quote)
}

function kindLabel(labels: CoReadInlineLabels, kind: string): string {
  const v = labels.kind(kind)
  return v || labels.annotationTitle
}

function stopEvent(e: Event) {
  e.stopPropagation()
}

function buildPopoverContent(
  doc: Document,
  ann: CoReadAnnotation,
  labels: CoReadInlineLabels,
  onDraft: (id: string, text: string) => void,
  opts?: {
    onSaveReply?: (id: string, text: string) => void
    onDeleteReply?: () => void
    onChatAbout?: (id: string, text: string) => void
    onClose?: () => void
  },
): HTMLElement {
  const pop = doc.createElement("div")
  pop.className = "co-read-pop"
  pop.setAttribute("role", "dialog")

  // 头部：类型标签 + 关闭 X
  const head = doc.createElement("div")
  head.className = "co-read-pop__head"
  const label = kindLabel(labels, ann.kind)
  const headText = doc.createElement("span")
  headText.textContent = ann.streaming ? `${label} · ${labels.streaming}` : label
  head.appendChild(headText)

  const closeBtn = doc.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "co-read-pop__close"
  closeBtn.title = labels.closePanel || "Close"
  closeBtn.setAttribute("aria-label", labels.closePanel || "Close")
  closeBtn.innerHTML =
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>'
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    opts?.onClose?.()
  })
  closeBtn.addEventListener("mousedown", stopEvent)
  head.appendChild(closeBtn)
  pop.appendChild(head)

  if (ann.anchor.quote) {
    const q = doc.createElement("blockquote")
    q.className = "co-read-pop__quote"
    q.textContent = ann.anchor.quote
    pop.appendChild(q)
  }

  const body = doc.createElement("p")
  body.className = "co-read-pop__body"
  body.textContent = ann.content || ""
  pop.appendChild(body)

  // ── 我的留言：已保存则显示只读列表（list 模式），点「编辑」才回到输入框 ──
  const replyLabel = doc.createElement("div")
  replyLabel.className = "co-read-pop__reply-label"
  const replyLabelText = doc.createElement("span")
  replyLabelText.textContent = labels.myReply
  replyLabel.appendChild(replyLabelText)

  const editBtn = doc.createElement("button")
  editBtn.type = "button"
  editBtn.className = "co-read-pop__edit"
  editBtn.textContent = labels.editReply || "Edit"
  editBtn.addEventListener("mousedown", stopEvent)
  replyLabel.appendChild(editBtn)
  pop.appendChild(replyLabel)

  // 只读展示区
  const savedView = doc.createElement("div")
  savedView.className = "co-read-pop__saved"
  pop.appendChild(savedView)

  // 编辑区（textarea + 操作按钮）
  const editorWrap = doc.createElement("div")
  editorWrap.className = "co-read-pop__editor"
  pop.appendChild(editorWrap)

  const ta = doc.createElement("textarea")
  ta.className = "co-read-pop__reply"
  ta.rows = 2
  ta.placeholder = labels.replyPlaceholder
  ta.value = ann.myReply || ""
  ta.disabled = !!ann.replySent
  ta.addEventListener("input", () => onDraft(ann.id, ta.value))
  ta.addEventListener("mousedown", stopEvent)
  ta.addEventListener("click", stopEvent)
  editorWrap.appendChild(ta)

  // 操作区：常驻显示（list / edit 两态都能继续操作）
  const actions = doc.createElement("div")
  actions.className = "co-read-pop__actions"

  let editing = false

  /** 只读模式：已保存的留言以列表形式展示（点击可继续编辑，条目自带删除 ×） */
  const renderSavedView = () => {
    savedView.textContent = ""
    const text = String(ann.myReply || "").trim()
    const row = doc.createElement("div")
    row.className = "co-read-pop__saved-item"
    row.title = labels.editReply || "Edit"
    const rowText = doc.createElement("span")
    rowText.className = "co-read-pop__saved-text"
    rowText.textContent = text
    row.appendChild(rowText)

    // 删除 ×：贴在这条留言上
    const itemDelete = doc.createElement("button")
    itemDelete.type = "button"
    itemDelete.className = "co-read-pop__saved-delete"
    itemDelete.title = labels.deleteReply || "Delete note"
    itemDelete.setAttribute("aria-label", labels.deleteReply || "Delete note")
    itemDelete.innerHTML =
      '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>'
    itemDelete.addEventListener("mousedown", stopEvent)
    itemDelete.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      ta.value = ""
      onDraft(ann.id, "")
      ann.replySaved = false
      opts?.onDeleteReply?.(ann.id)
      // 删除后回到编辑态（空输入框），可重新留言
      applyMode(true)
    })
    row.appendChild(itemDelete)
    row.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      ta.value = ann.myReply || ""
      applyMode(true)
      ta.focus()
    })
    savedView.appendChild(row)
    const meta = doc.createElement("div")
    meta.className = "co-read-pop__saved-meta"
    meta.textContent = ann.replySent ? labels.replySent : labels.savedReply || "Saved"
    savedView.appendChild(meta)
  }

  /** 切换 编辑 / 只读 两种状态（操作按钮始终保留） */
  const applyMode = (nextEditing: boolean) => {
    editing = nextEditing
    const hasSaved = !!String(ann.myReply || "").trim() && (!!ann.replySaved || !!ann.replySent)
    const showEditor = editing || !hasSaved
    editorWrap.style.display = showEditor ? "" : "none"
    savedView.style.display = showEditor ? "none" : ""
    editBtn.style.display = showEditor ? "none" : ""
    replyLabelText.classList.toggle("co-read-pop__reply-label--saved", !showEditor)
    if (!showEditor) renderSavedView()
  }

  editBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    ta.value = ann.myReply || ""
    applyMode(true)
    ta.focus()
  })

  const saveBtn = doc.createElement("button")
  saveBtn.type = "button"
  saveBtn.className = "co-read-pop__btn co-read-pop__btn--primary"
  saveBtn.textContent = labels.saveReply || "Save"
  saveBtn.disabled = !!ann.replySent && !String(ann.myReply || "").trim()
  saveBtn.addEventListener("mousedown", stopEvent)
  saveBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    const text = String(ta.value || "").trim()
    // 编辑态下清空后保存 = 删除这条留言
    if (!text) {
      if (String(ann.myReply || "").trim() || ann.replySaved) {
        onDraft(ann.id, "")
        ann.replySaved = false
        opts?.onDeleteReply?.(ann.id)
      }
      applyMode(true)
      ta.focus()
      return
    }
    onDraft(ann.id, text)
    opts?.onSaveReply?.(ann.id, text)
    ann.replySaved = true
    saveBtn.classList.add("co-read-pop__btn--done")
    saveBtn.textContent = labels.savedReply || "Saved"
    window.setTimeout(() => {
      saveBtn.classList.remove("co-read-pop__btn--done")
      saveBtn.textContent = labels.saveReply || "Save"
      // 保存成功后切回只读列表模式
      applyMode(false)
    }, 700)
  })
  actions.appendChild(saveBtn)

  const chatBtn = doc.createElement("button")
  chatBtn.type = "button"
  chatBtn.className = "co-read-pop__btn"
  chatBtn.textContent = labels.chatAbout || "Chat about this"
  chatBtn.addEventListener("mousedown", stopEvent)
  chatBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    // list 态时用已保存的留言作为对话上下文
    const text = String(ta.value || ann.myReply || "").trim()
    if (text) onDraft(ann.id, text)
    opts?.onChatAbout?.(ann.id, text)
  })
  actions.appendChild(chatBtn)

  // 操作区常驻在状态区之外，确保 list 态也能「再聊一句」
  pop.appendChild(actions)

  // 初始状态：已保存过留言 → 直接 list 模式；否则编辑模式
  applyMode(false)

  if (ann.replySent) {
    const sent = doc.createElement("p")
    sent.className = "co-read-pop__sent"
    sent.textContent = labels.replySent
    pop.appendChild(sent)
  }

  return pop
}

function buildStatusContent(
  doc: Document,
  labels: CoReadInlineLabels,
  status: CoReadInlineStatus,
): HTMLElement | null {
  if (!status.loading && !status.intro && !status.errorCode && !status.emptyHint) return null
  const box = doc.createElement("div")
  box.className = "co-read-status"

  if (status.errorCode === "generation_interrupted" || status.errorCode === "chapter_text_missing") {
    const msg = doc.createElement("span")
    msg.textContent = labels.generationFailed || "Failed"
    box.appendChild(msg)
    if (status.onRetry && labels.retryPage) {
      const btn = doc.createElement("button")
      btn.type = "button"
      btn.className = "co-read-status__retry"
      btn.textContent = labels.retryPage
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        status.onRetry?.()
      })
      box.appendChild(btn)
    }
  } else if (status.loading && labels.loading) {
    box.textContent = status.intro ? `${status.intro} ${labels.loading}` : labels.loading
  } else if (status.intro) {
    box.textContent = status.intro
  } else if (status.emptyHint) {
    box.textContent = status.emptyHint
  } else {
    return null
  }
  return box
}

function markerSvg(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>'
}

/* ============ 模式 A：宿主 overlay（EPUB/MOBI iframe） ============ */

export interface CoReadOverlayOptions extends CommonOptions {
  /** 阅读 iframe 的 body（只读，用于测量 quote 位置） */
  body: HTMLElement
  /** 宿主文档中的 overlay 容器（position 非 static） */
  host: HTMLElement
}

function ensureOverlayStyles(doc: Document, dark: boolean) {
  let style = doc.getElementById(OVL_STYLE_ID) as HTMLStyleElement | null
  const existed = !!style
  if (!style) {
    style = doc.createElement("style")
    style.id = OVL_STYLE_ID
  }
  const popBg = dark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)"
  const popBorder = dark ? "rgba(147, 197, 253, 0.45)" : "rgba(147, 197, 253, 0.9)"
  const text = dark ? "#e5e7eb" : "#1f2937"
  const muted = dark ? "#9ca3af" : "#6b7280"
  const accent = dark ? "#93c5fd" : "#2563eb"
  style.textContent = `
.co-read-ovl-root{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}
.co-read-status{
  position:absolute;top:8px;left:50%;transform:translateX(-50%);
  max-width:min(440px,92%);padding:8px 12px;border-radius:999px;
  font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.45;
  border:1px dashed ${dark ? "#4b5563" : "#d1d5db"};color:${muted};
  background:${dark ? "rgba(17,24,39,.9)" : "rgba(249,250,251,.95)"};
  box-shadow:0 4px 20px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.co-read-status__retry{margin-left:8px;padding:0;border:none;background:none;color:${accent};font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;pointer-events:auto}
.co-read-marker{
  position:absolute;width:22px;height:22px;padding:0;border:none;border-radius:8px;
  display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;
  background:linear-gradient(145deg,${dark ? "#3b82f6" : "#2563eb"},${dark ? "#6366f1" : "#4f46e5"});
  color:#fff;line-height:0;
  box-shadow:0 0 0 2px rgba(255,255,255,.35),0 2px 10px rgba(37,99,235,.55);
  transition:transform .12s;animation:co-read-marker-pulse 2.2s ease-in-out infinite
}
.co-read-marker svg{width:13px;height:13px;display:block;fill:currentColor}
.co-read-marker:hover{transform:scale(1.15);z-index:2}
.co-read-hl{position:absolute;pointer-events:none;border-radius:2px;background:${dark ? "rgba(147,197,253,.28)" : "rgba(37,99,235,.18)"}}
@keyframes co-read-marker-pulse{0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,.3),0 2px 10px rgba(37,99,235,.45)}50%{box-shadow:0 0 0 5px rgba(96,165,250,.4),0 2px 14px rgba(37,99,235,.6)}}
.co-read-pop{
  position:absolute;width:min(320px,calc(100% - 16px));max-height:min(380px,60%);overflow:auto;
  padding:12px 14px;border-radius:12px;border:1px solid ${popBorder};
  background:${popBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  color:${text};font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;
  box-shadow:0 12px 40px rgba(0,0,0,.35);word-wrap:break-word;overflow-wrap:anywhere;
  visibility:hidden;opacity:0;pointer-events:none;transition:opacity .15s ease,visibility .15s;z-index:3
}
.co-read-host--open > .co-read-pop,.co-read-host--hover > .co-read-pop,.co-read-host:focus-within > .co-read-pop{visibility:visible;opacity:1;pointer-events:auto}
.co-read-pop--below{transform:translateY(10px)}
.co-read-pop__head{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${accent};margin:0 0 8px}
.co-read-pop__head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.co-read-pop__close{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:999px;background:transparent;color:${muted};cursor:pointer;line-height:0;flex-shrink:0}
.co-read-pop__close:hover{background:${dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)"};color:${text}}
.co-read-pop__actions{display:flex;align-items:center;gap:8px;margin:8px 0 0;flex-wrap:wrap}
.co-read-pop__btn{flex:1 1 auto;min-width:88px;padding:7px 10px;border-radius:8px;border:1px solid ${dark ? "#374151" : "#d1d5db"};background:${dark ? "#111827" : "#fff"};color:${text};font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap}
.co-read-pop__btn:hover{background:${dark ? "#1f2937" : "#f3f4f6"}}
.co-read-pop__btn--primary{border-color:${accent};color:${accent}}
.co-read-pop__btn--primary:hover{background:${dark ? "rgba(147,197,253,.15)" : "rgba(37,99,235,.08)"}}
.co-read-pop__btn--done{border-color:#22c55e;color:#16a34a;background:${dark ? "rgba(34,197,94,.15)" : "rgba(34,197,94,.1)"}}
.co-read-pop__quote{margin:0 0 8px;padding-left:10px;border-left:3px solid ${accent};font-size:12px;font-style:italic;color:${muted};word-wrap:break-word;overflow-wrap:anywhere}
.co-read-pop__body{margin:0 0 8px;white-space:pre-wrap;font-size:13px;word-wrap:break-word;overflow-wrap:anywhere}
.co-read-pop__reply-label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 4px;font-size:10px;color:${muted}}
.co-read-pop__edit{padding:0;border:none;background:none;color:${accent};font-size:10px;font-weight:600;cursor:pointer;text-decoration:underline}
.co-read-pop__saved{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:8px;border:1px solid ${dark ? "#374151" : "#e5e7eb"};background:${dark ? "#0a0a0a" : "#f9fafb"}}
.co-read-pop__saved-item{display:flex;align-items:flex-start;gap:6px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;color:${text};cursor:text}
.co-read-pop__saved-text{flex:1 1 auto;min-width:0}
.co-read-pop__saved-delete{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:18px;height:18px;padding:0;border:none;border-radius:999px;background:transparent;color:${muted};cursor:pointer;line-height:0;opacity:.65;transition:all .15s}
.co-read-pop__saved-delete:hover{opacity:1;background:${dark ? "rgba(239,68,68,.18)" : "rgba(239,68,68,.1)"};color:${dark ? "#f87171" : "#dc2626"}}
.co-read-pop__saved-meta{font-size:10px;color:${muted}}.co-read-pop__reply{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid ${dark ? "#374151" : "#d1d5db"};background:${dark ? "#0a0a0a" : "#fff"};color:${text};padding:8px 10px;font-size:12px;resize:vertical;min-height:48px;max-width:100%}
.co-read-pop__reply:disabled{opacity:.55}
.co-read-pop__sent{font-size:11px;color:#9ca3af;margin:4px 0 0}
`
  if (!existed) doc.head.appendChild(style)
}

function rawOffsetsToRange(doc: Document, el: HTMLElement, start: number, end: number): Range | null {
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: { node: Text; start: number; end: number }[] = []
  let acc = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const len = (node.textContent || "").length
    nodes.push({ node, start: acc, end: acc + len })
    acc += len
  }
  const at = (offset: number) => {
    for (const n of nodes) {
      if (offset >= n.start && offset <= n.end) return { node: n.node, offset: offset - n.start }
    }
    if (nodes.length && offset === acc) {
      const last = nodes[nodes.length - 1]
      return { node: last.node, offset: (last.node.textContent || "").length }
    }
    return null
  }
  const s = at(start)
  const e = at(end)
  if (!s || !e) return null
  const r = doc.createRange()
  try {
    r.setStart(s.node, s.offset)
    r.setEnd(e.node, e.offset)
    return r
  } catch {
    return null
  }
}

function quoteRangeInElement(el: HTMLElement, quote: string): Range | null {
  const doc = el.ownerDocument
  if (!doc) return null
  const raw = el.textContent || ""
  const span = findQuoteMatchRangeRaw(raw, quote)
  if (!span) return null
  return rawOffsetsToRange(doc, el, span[0], span[1])
}

/** 优先在 paragraphIndex 段落、再扫全页及 body 查找 quote Range */
function quoteRangeInBodyFallback(body: HTMLElement, ann: CoReadAnnotation): Range | null {
  const quote = ann.anchor.quote?.trim()
  if (!quote) return null
  const anchors = collectParagraphAnchors(body)
  const idx = Math.max(0, ann.anchor.paragraphIndex)
  const tryList: HTMLElement[] = []
  if (anchors[idx]) tryList.push(anchors[idx])
  for (let i = 0; i < anchors.length; i++) {
    if (i !== idx) tryList.push(anchors[i])
  }
  tryList.push(body)
  for (const el of tryList) {
    const r = quoteRangeInElement(el, quote)
    if (r) return r
  }
  return null
}

/** 在当前页可见文本中定位引文；引文若跨页被切开，取本页可见的那一段 */
function quoteRangeOnVisiblePage(
  el: HTMLElement,
  span: { start: number; end: number },
  quote: string,
): Range | null {
  const doc = el.ownerDocument
  if (!doc) return null
  const full = el.textContent || ""
  const visibleText = full.slice(span.start, span.end)
  if (!visibleText.trim()) return null

  const map = (range: [number, number]): [number, number] => [range[0] + span.start, range[1] + span.start]

  const whole = findQuoteMatchRangeRaw(visibleText, quote)
  if (whole) {
    const [s, e] = map(whole)
    const r = rawOffsetsToRange(doc, el, s, e)
    if (r) return r
  }

  // 引文跨页：本页只含其一段。用两端片段去匹配可见文本，命中即用该片段
  const words = quoteWords(quote)
  if (words.length >= 2) {
    const head = words.slice(0, Math.ceil(words.length / 2)).join(" ")
    const tail = words.slice(Math.floor(words.length / 2)).join(" ")
    for (const part of [head, tail]) {
      const m = findQuoteMatchRangeRaw(visibleText, part)
      if (!m) continue
      const [s, e] = map(m)
      const r = rawOffsetsToRange(doc, el, s, e)
      if (r) return r
    }
  }
  return null
}

interface PageParagraph {
  el: HTMLElement
  span: { start: number; end: number }
}

/** 本页可见段落及其可见字符区间（顺序与发送给后端的页面文本一致） */
function visiblePageParagraphs(body: HTMLElement, win: VisibleWindow | null): PageParagraph[] {
  const list: PageParagraph[] = []
  for (const el of collectParagraphAnchors(body)) {
    if (!win) {
      list.push({ el, span: { start: 0, end: (el.textContent || "").length } })
      continue
    }
    const span = visibleSliceSpan(el, win)
    if (!span) continue
    if (!(el.textContent || "").slice(span.start, span.end).trim()) continue
    list.push({ el, span })
  }
  return list
}

interface PinPoint {
  x: number
  y: number
  lineH: number
}

/**
 * iframe 内 Range.getClientRects() 相对 iframe 视口（少数浏览器已是顶层视口）。
 * overlay 的 left/top 是宿主 CSS 像素。两者直接相减会被钳到左上角。
 */
interface FrameMap {
  originX: number
  originY: number
  scaleX: number
  scaleY: number
  topLevel: boolean
  viewLeft: number
  viewTop: number
  viewRight: number
  viewBottom: number
}

function frameMap(doc: Document, host: HTMLElement): FrameMap {
  const hostRect = host.getBoundingClientRect()
  const toHostX = host.clientWidth / (hostRect.width || host.clientWidth || 1)
  const toHostY = host.clientHeight / (hostRect.height || host.clientHeight || 1)
  const frame = (doc.defaultView?.frameElement as HTMLElement | null) ?? null
  if (!frame) {
    return {
      originX: -hostRect.left * toHostX,
      originY: -hostRect.top * toHostY,
      scaleX: toHostX,
      scaleY: toHostY,
      topLevel: true,
      viewLeft: 0,
      viewTop: 0,
      viewRight: hostRect.width,
      viewBottom: hostRect.height,
    }
  }
  const fr = frame.getBoundingClientRect()
  const viewW = frame.clientWidth || fr.width || 1
  const viewH = frame.clientHeight || fr.height || 1
  const de = doc.documentElement.getBoundingClientRect()
  const topLevel =
    Math.abs(de.left - fr.left) < 4 &&
    Math.abs(de.top - fr.top) < 4 &&
    (Math.abs(fr.left) > 8 || Math.abs(fr.top) > 8)
  if (topLevel) {
    return {
      originX: -hostRect.left * toHostX,
      originY: -hostRect.top * toHostY,
      scaleX: toHostX,
      scaleY: toHostY,
      topLevel: true,
      viewLeft: fr.left,
      viewTop: fr.top,
      viewRight: fr.right,
      viewBottom: fr.bottom,
    }
  }
  const iframeScaleX = fr.width / viewW
  const iframeScaleY = fr.height / viewH
  return {
    originX: (fr.left - hostRect.left) * toHostX,
    originY: (fr.top - hostRect.top) * toHostY,
    scaleX: iframeScaleX * toHostX,
    scaleY: iframeScaleY * toHostY,
    topLevel: false,
    viewLeft: 0,
    viewTop: 0,
    viewRight: viewW,
    viewBottom: viewH,
  }
}

interface VisibleWindow {
  x0: number
  x1: number
  y0: number
  y1: number
}

/**
 * 当前可见「页」在 iframe Range.getClientRects() 坐标系中的窗口。
 * 直接用 frameMap(doc, host) 的精确逆变换将宿主可视区 [0, hostW] × [0, hostH]
 * 反投影回 Range 坐标系——与 pinFromClientRect 数学恒等，无论 topLevel 与否、
 * 无论 zoom 缩放多少，凡在当前页可见的文字必落在 [x0, x1] × [y0, y1] 内。
 */
function visibleWindowInFrame(doc: Document, host: HTMLElement): VisibleWindow {
  const map = frameMap(doc, host)
  const hostRect = host.getBoundingClientRect()
  const hostW = host.clientWidth || hostRect.width || 1
  const hostH = host.clientHeight || hostRect.height || 1
  const sx = map.scaleX || 1
  const sy = map.scaleY || 1
  return {
    x0: -map.originX / sx,
    x1: (hostW - map.originX) / sx,
    y0: -map.originY / sy,
    y1: (hostH - map.originY) / sy,
  }
}

function rectInVisibleWindow(r: DOMRect, win: VisibleWindow): boolean {
  if (r.width < 1 || r.height < 1) return false
  return r.right > win.x0 + 1 && r.bottom > win.y0 + 1 && r.left < win.x1 - 1 && r.top < win.y1 - 1
}

/**
 * 仅提取当前可见「页」的文本（epub.js 多栏分页下 body 文本是整章的，
 * 直接取整章会让后端为其它页生成批注、icon 也定位到隐藏栏）。
 * 跨页段落按可见窗口切片：只送本页真正可见的连续文本，避免把下一页的段尾
 * 也送出去（后端会为它生成批注，钉在段落可见末尾像凭空出现）。
 */
export function pageTextFromVisiblePage(body: HTMLElement, host: HTMLElement): string {
  const doc = body.ownerDocument
  if (!doc) return ""
  const win = visibleWindowInFrame(doc, host)
  const parts: string[] = []
  for (const el of collectParagraphAnchors(body)) {
    const t = visibleSliceOfElement(el, win)
    if (t) parts.push(t)
  }
  return parts.join("\n\n")
}

/** Range 中最后一个有实际宽高的行 rect（忽略首尾换行产生的 width=0 零宽 rect） */
function lastRectOf(range: Range): DOMRect | null {
  const rects = range.getClientRects()
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i]
    if (r.width >= 1 && r.height >= 1) return r
  }
  return null
}

/** Range 中第一个有实际宽高的行 rect（忽略首尾换行产生的 width=0 零宽 rect） */
function firstRectOf(range: Range): DOMRect | null {
  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (r.width >= 1 && r.height >= 1) return r
  }
  return null
}

/**
 * 段落在可见页内的**字符区间** [start, end)。
 * 横向分页（LTR）下文本线性流过各栏：段落的可见部分是原始文本的连续区间
 * [S, E)。「range(0, offset) 的末行 rect 在窗口内」随 offset 单调（从 true 翻到
 * false 后不再回来），「range(offset, end) 的首行 rect 在窗口内」随 offset 单调
 * （从 false 翻到 true），均可二分。返回 null 表示本页不可见。
 */
function visibleSliceSpan(el: HTMLElement, win: VisibleWindow): { start: number; end: number } | null {
  const doc = el.ownerDocument
  if (!doc) return null
  const full = el.textContent || ""
  if (!full.trim()) return null

  const prefixEndRect = (offset: number): DOMRect | null => {
    if (offset <= 0) return null
    const r = rawOffsetsToRange(doc, el, 0, offset)
    return r ? lastRectOf(r) : null
  }
  const suffixStartRect = (offset: number): DOMRect | null => {
    if (offset >= full.length) return null
    const r = rawOffsetsToRange(doc, el, offset, full.length)
    return r ? firstRectOf(r) : null
  }
  const prefixEndsInWin = (offset: number): boolean => {
    const r = prefixEndRect(offset)
    return !!r && rectInVisibleWindow(r, win)
  }
  const suffixStartsInWin = (offset: number): boolean => {
    const r = suffixStartRect(offset)
    return !!r && rectInVisibleWindow(r, win)
  }

  const total = full.length
  const headVisible = suffixStartsInWin(0)
  const tailVisible = prefixEndsInWin(total)
  if (headVisible && tailVisible) return { start: 0, end: total }

  // E：最后一个使前缀末行仍在窗口内的 offset（predicate 随 offset 单调 true→false）
  let endCut = total
  if (!tailVisible) {
    let lo = 1
    let hi = total
    endCut = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (prefixEndsInWin(mid)) {
        endCut = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    if (endCut < 0) return null
  }

  // S：第一个使后缀首行回到窗口内的 offset（predicate 随 offset 单调 false→true）
  let startCut = 0
  if (!headVisible) {
    let lo = 1
    let hi = Math.max(0, endCut - 1)
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (suffixStartsInWin(mid)) {
        startCut = mid
        hi = mid - 1
      } else {
        lo = mid + 1
      }
    }
    if (startCut <= 0) return null
  }

  return { start: startCut, end: endCut }
}

function visibleSliceOfElement(el: HTMLElement, win: VisibleWindow): string {
  const span = visibleSliceSpan(el, win)
  if (!span) return ""
  return (el.textContent || "").slice(span.start, span.end).trim()
}

/** quote 末尾右缘，坐标已换成 overlay 的 CSS 像素 */
function pinFromClientRect(r: DOMRect, map: FrameMap): PinPoint {
  return {
    x: map.originX + r.right * map.scaleX + 4,
    y: map.originY + r.top * map.scaleY,
    lineH: Math.max(14, r.height * map.scaleY),
  }
}

function pinFromRects(rects: DOMRectList | DOMRect[], doc: Document, host: HTMLElement): PinPoint | null {
  const map = frameMap(doc, host)
  const win = visibleWindowInFrame(doc, host)
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i]
    if (r.width <= 0 && r.height <= 0) continue
    // 跨栏 Range 的 rects 含隐藏栏；只取可见页窗口内的 rect 定位。
    // 找不到可见 rect 时返回 null（宁可本页不画，也不要钉到屏外坐标）
    if (rectInVisibleWindow(r, win)) return pinFromClientRect(r, map)
  }
  return null
}

/** quote 末尾：取最后一行可见 client rect 的右缘，避免整段 union box 导致 Y 偏移 */
function pinFromRange(range: Range, host: HTMLElement): PinPoint | null {
  const doc = range.startContainer.ownerDocument
  if (!doc) return null
  const fromLines = pinFromRects(range.getClientRects(), doc, host)
  if (fromLines) return fromLines
  const union = range.getBoundingClientRect()
  if (union.width > 0 || union.height > 0) return pinFromRects([union], doc, host)
  return null
}

const MARKER_SIZE = 22

/** quote 右缘同一行是否还有后续文字（有则行内 icon 会挡住它） */
function textFollowsOnSameLine(quoteRange: Range): boolean {
  const doc = quoteRange.endContainer.ownerDocument
  if (!doc?.body) return false
  const qRects = quoteRange.getClientRects()
  let q: DOMRect | null = null
  for (let i = qRects.length - 1; i >= 0; i--) {
    const r = qRects[i]
    if (r.width > 0 && r.height > 0) {
      q = r
      break
    }
  }
  if (!q) return false
  const rest = doc.createRange()
  try {
    rest.setStart(quoteRange.endContainer, quoteRange.endOffset)
    rest.setEnd(doc.body, doc.body.childNodes.length)
  } catch {
    return false
  }
  const mid = (q.top + q.bottom) / 2
  const rects = rest.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (r.width < 8 || r.height < 2) continue
    if (r.left < q.right - 1) continue
    if (mid >= r.top && mid <= r.bottom) return true
  }
  return false
}

/** 正文右内边距里的 icon 左缘；页边放不下时返回 null */
function gutterIconLeft(body: HTMLElement, host: HTMLElement): number | null {
  const doc = body.ownerDocument
  if (!doc) return null
  const padR = parseFloat(doc.defaultView?.getComputedStyle(body).paddingRight || "0") || 0
  if (padR < MARKER_SIZE + 6) return null
  const map = frameMap(doc, host)
  const br = body.getBoundingClientRect()
  return map.originX + (br.right - padR + 4) * map.scaleX
}

function appendQuoteHighlight(root: HTMLElement, hostDoc: Document, range: Range, host: HTMLElement) {
  const doc = range.startContainer.ownerDocument
  if (!doc) return
  const map = frameMap(doc, host)
  const win = visibleWindowInFrame(doc, host)
  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (r.width < 1 || r.height < 1 || !rectInVisibleWindow(r, win)) continue
    const hl = hostDoc.createElement("div")
    hl.className = "co-read-hl"
    hl.style.left = `${map.originX + r.left * map.scaleX}px`
    hl.style.top = `${map.originY + r.top * map.scaleY}px`
    hl.style.width = `${Math.max(1, r.width * map.scaleX)}px`
    hl.style.height = `${Math.max(1, r.height * map.scaleY)}px`
    root.appendChild(hl)
  }
}

export function syncCoReadOverlayAnnotations(opts: CoReadOverlayOptions) {
  const hostDoc = opts.host.ownerDocument
  if (!hostDoc) return
  ensureOverlayStyles(hostDoc, !!opts.dark)

  let root = opts.host.querySelector(":scope > .co-read-ovl-root") as HTMLElement | null
  if (!root) {
    root = hostDoc.createElement("div")
    root.className = "co-read-ovl-root"
    opts.host.appendChild(root)
  }
  root.textContent = ""

  const status = buildStatusContent(hostDoc, opts.labels, opts.status || {})
  if (status) {
    status.setAttribute(INLINE_ATTR, "status")
    root.appendChild(status)
  }

  const hostRect = opts.host.getBoundingClientRect()
  const hostW = opts.host.clientWidth || hostRect.width
  const hostH = opts.host.clientHeight || hostRect.height
  const gutterSlots: number[] = []
  const bodyDoc = opts.body.ownerDocument
  const win = bodyDoc ? visibleWindowInFrame(bodyDoc, opts.host) : null
  // 当前页可见段落（含可见字符区间），顺序与发送给后端的页面文本一致
  const pageParagraphs = visiblePageParagraphs(opts.body, win)

  for (const ann of opts.annotations) {
    const host = hostDoc.createElement("span")
    host.className = "co-read-host"
    host.setAttribute(INLINE_ATTR, ann.id)

    // 只在本页可见文本内定位引文：找不到引文说明该批注属于其它页，
    // 绝不能兜底钉到某个段落（否则 icon 会飘到标题等无关位置）
    const quote = ann.anchor.quote?.trim()
    let range: Range | null = null
    if (quote) {
      const idx = Math.max(0, ann.anchor.paragraphIndex)
      const ordered = [
        ...pageParagraphs.slice(idx, idx + 1),
        ...pageParagraphs.filter((_, i) => i !== idx),
      ]
      for (const para of ordered) {
        range = quoteRangeOnVisiblePage(para.el, para.span, quote)
        if (range) break
      }
      // 兜底：若二分切片未覆盖（如单页章节/div 容器），直接在段落或 body 中匹配 quote，
      // 再由 pinFromRange 校验其真实文字 rect 是否落在当前可见屏内
      if (!range) {
        range = quoteRangeInBodyFallback(opts.body, ann)
      }
    }
    if (!range) continue
    const pin: PinPoint | null = pinFromRange(range, opts.host)
    if (!pin) continue
    const lineH = pin.lineH
    let mx = Math.max(4, Math.min(pin.x, hostW - MARKER_SIZE - 4))
    let my = Math.max(2, pin.y + Math.round(lineH / 2) - MARKER_SIZE / 2)
    if (range && textFollowsOnSameLine(range)) {
      const gx = gutterIconLeft(opts.body, opts.host)
      if (gx != null) {
        appendQuoteHighlight(root, hostDoc, range, opts.host)
        mx = Math.max(4, Math.min(gx, hostW - MARKER_SIZE - 4))
        let gy = my
        for (let n = 0; n < 6; n++) {
          if (!gutterSlots.some((s) => Math.abs(s - gy) < MARKER_SIZE - 2)) break
          gy = Math.max(2, gy - MARKER_SIZE - 2)
        }
        gutterSlots.push(gy)
        my = gy
      } else {
        mx = Math.max(4, Math.min(pin.x - MARKER_SIZE / 2, hostW - MARKER_SIZE - 4))
        my = Math.max(2, pin.y - MARKER_SIZE + 4)
      }
    }

    const btn = hostDoc.createElement("button")
    btn.type = "button"
    btn.className = "co-read-marker"
    const label = kindLabel(opts.labels, ann.kind)
    btn.title = `${opts.labels.annotationTitle}: ${label}`
    btn.setAttribute("aria-label", btn.title)
    btn.innerHTML = markerSvg()
    btn.style.left = `${mx}px`
    btn.style.top = `${my}px`
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      const wasOpen = host.classList.contains("co-read-host--open")
      root?.querySelectorAll(".co-read-host--open").forEach((el) => {
        if (el !== host) el.classList.remove("co-read-host--open")
      })
      host.classList.toggle("co-read-host--open", !wasOpen)
    })
    btn.addEventListener("mousedown", stopEvent)
    btn.addEventListener("touchstart", stopEvent, { passive: true })
    host.appendChild(btn)

    // 桌面端 hover 浮层：鼠标离开图标后延迟关闭（260ms 宽限），
    // 让指针能移入气泡内点击 note 输入框；期间移入气泡则取消关闭。
    let hoverCloseTimer = 0
    const openByHover = () => {
      const view = hostDoc.defaultView
      if (hoverCloseTimer && view) view.clearTimeout(hoverCloseTimer)
      hoverCloseTimer = 0
      host.classList.add("co-read-host--hover")
    }
    const scheduleCloseByHover = () => {
      const view = hostDoc.defaultView
      if (hoverCloseTimer && view) view.clearTimeout(hoverCloseTimer)
      hoverCloseTimer = view
        ? view.setTimeout(() => {
            hoverCloseTimer = 0
            host.classList.remove("co-read-host--hover")
          }, 260)
        : 0
    }
    btn.addEventListener("mouseenter", openByHover)
    btn.addEventListener("mouseleave", scheduleCloseByHover)

    const pop = buildPopoverContent(hostDoc, ann, opts.labels, opts.onDraft, {
      onSaveReply: opts.onSaveReply,
      onDeleteReply: opts.onDeleteReply,
      onChatAbout: opts.onChatAbout,
      onClose: () => {
        host.classList.remove("co-read-host--open", "co-read-host--hover")
      },
    })
    const popLeft = Math.max(4, Math.min(mx - 40, hostW - 324))
    if (my > hostH * 0.55) {
      pop.style.bottom = `${Math.max(8, hostH - (my + MARKER_SIZE) + 8)}px`
    } else {
      pop.classList.add("co-read-pop--below")
      pop.style.top = `${my + MARKER_SIZE + 8}px`
    }
    pop.style.left = `${popLeft}px`
    pop.addEventListener("mouseenter", openByHover)
    pop.addEventListener("mouseleave", scheduleCloseByHover)
    host.appendChild(pop)

    root.appendChild(host)
  }
}

/* ============ 模式 B：段内行内（Markdown，无分页问题） ============ */

function ensureInlineStyles(doc: Document, dark: boolean) {
  if (doc.getElementById(INLINE_STYLE_ID)) return
  const style = doc.createElement("style")
  style.id = INLINE_STYLE_ID
  const popBg = dark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.94)"
  const popBorder = dark ? "rgba(147, 197, 253, 0.45)" : "rgba(147, 197, 253, 0.9)"
  const text = dark ? "#e5e7eb" : "#1f2937"
  const muted = dark ? "#9ca3af" : "#6b7280"
  const accent = dark ? "#93c5fd" : "#2563eb"
  style.textContent = `
.co-read-inline-status{
  position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9998;
  max-width:min(420px,92vw);margin:0;padding:8px 12px;border-radius:999px;
  font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.45;
  pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.25);
  border:1px dashed ${dark ? "#4b5563" : "#d1d5db"};color:${muted};
  background:${dark ? "rgba(17,24,39,.88)" : "rgba(249,250,251,.9)"};
}
.co-read-inline-status__retry{margin-left:8px;padding:0;border:none;background:none;color:${accent};font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;pointer-events:auto}
.co-read-inline-host{position:relative;display:inline;vertical-align:baseline;white-space:nowrap;margin:0 0 0 .15em;line-height:inherit}
.co-read-inline-marker{
  display:inline-flex;align-items:center;justify-content:center;
  width:1.35em;height:1.35em;padding:0;margin:0 0 0 .12em;border:none;border-radius:8px;
  background:linear-gradient(145deg,${dark ? "#3b82f6" : "#2563eb"},${dark ? "#6366f1" : "#4f46e5"});
  color:#fff;line-height:0;cursor:pointer;vertical-align:-0.15em;
  box-shadow:0 0 0 2px ${dark ? "rgba(147,197,253,.35)" : "rgba(37,99,235,.25)"},0 2px 8px rgba(37,99,235,.45)
}
.co-read-inline-marker svg{width:.85em;height:.85em;display:block;fill:currentColor}
.co-read-inline-popover{
  visibility:hidden;opacity:0;pointer-events:none;
  position:absolute;left:0;bottom:calc(100% + 8px);z-index:10001;
  width:min(320px,calc(100vw - 24px));max-height:min(380px,55vh);overflow:auto;
  padding:12px 14px;border-radius:12px;border:1px solid ${popBorder};
  background:${popBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  color:${text};font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;
  box-shadow:0 12px 40px rgba(0,0,0,.35);transition:opacity .15s ease,visibility .15s;
  word-wrap:break-word;overflow-wrap:anywhere
}
.co-read-inline-host--open .co-read-inline-popover,
.co-read-inline-host:focus-within .co-read-inline-popover{
  visibility:visible;opacity:1;pointer-events:auto
}
.co-read-inline-host--hover .co-read-inline-popover{
  visibility:visible;opacity:1;pointer-events:auto
}
.co-read-inline-popover--below{bottom:auto;top:calc(100% + 8px)}
`
  doc.head.appendChild(style)
}

function insertMarkerAtTextOffset(para: HTMLElement, endOffset: number, marker: HTMLElement): boolean {
  if (endOffset < 0) return false
  const doc = para.ownerDocument
  if (!doc) return false
  const walker = doc.createTreeWalker(para, NodeFilter.SHOW_TEXT)
  let pos = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const text = node.textContent || ""
    const len = text.length
    if (pos + len >= endOffset) {
      const splitAt = Math.min(len, Math.max(0, endOffset - pos))
      if (splitAt >= len) {
        const parent = node.parentNode
        if (!parent) return false
        parent.insertBefore(marker, node.nextSibling)
      } else {
        const after = node.splitText(splitAt)
        node.parentNode?.insertBefore(marker, after)
      }
      return true
    }
    pos += len
  }
  return false
}

export function syncCoReadInlineAnnotations(body: HTMLElement, opts: CommonOptions) {
  const doc = body.ownerDocument
  if (!doc) return
  ensureInlineStyles(doc, !!opts.dark)
  body.querySelectorAll(`[${INLINE_ATTR}]`).forEach((el) => el.remove())
  body.querySelectorAll(".co-read-inline-status").forEach((el) => el.remove())

  const status = buildStatusContent(doc, opts.labels, opts.status || {})
  if (status) {
    status.className = "co-read-inline-status"
    const retry = status.querySelector("button")
    if (retry) retry.className = "co-read-inline-status__retry"
    body.appendChild(status)
  }

  const anchors = collectParagraphAnchors(body)
  if (!anchors.length) return

  const byPara = new Map<HTMLElement, { end: number; marker: HTMLElement }[]>()
  for (const ann of opts.annotations) {
    let loc: { para: HTMLElement; end: number } | null = null
    const quote = ann.anchor.quote?.trim()
    if (quote) {
      for (const para of anchors) {
        const range = findQuoteMatchRange(para.textContent || "", quote)
        if (range) {
          loc = { para, end: range[1] }
          break
        }
      }
    }
    if (!loc && !quote) {
      const idx = Math.max(0, ann.anchor.paragraphIndex)
      const para = anchors[idx]
      if (para) loc = { para, end: -1 }
    }
    if (!loc) continue
    const host = doc.createElement("span")
    host.className = "co-read-inline-host"
    host.setAttribute(INLINE_ATTR, ann.id)

    const pop = buildPopoverContent(doc, ann, opts.labels, opts.onDraft, {
      onSaveReply: opts.onSaveReply,
      onDeleteReply: opts.onDeleteReply,
      onChatAbout: opts.onChatAbout,
      onClose: () => {
        host.classList.remove("co-read-inline-host--open", "co-read-inline-host--hover")
      },
    })
    pop.className = "co-read-inline-popover"

    const btn = doc.createElement("button")
    btn.type = "button"
    btn.className = "co-read-inline-marker"
    btn.title = `${opts.labels.annotationTitle}: ${kindLabel(opts.labels, ann.kind)}`
    btn.setAttribute("aria-label", btn.title)
    btn.innerHTML = markerSvg()
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      const wasOpen = host.classList.contains("co-read-inline-host--open")
      body.querySelectorAll(".co-read-inline-host--open").forEach((el) => {
        if (el !== host) el.classList.remove("co-read-inline-host--open")
      })
      if (!wasOpen) {
        // 根据按钮屏幕坐标修正气泡水平与垂直方向，防止右侧/顶部溢出被裁切
        const r = btn.getBoundingClientRect()
        const vw = doc.defaultView?.innerWidth || 360
        const popW = Math.min(320, vw - 24)
        const overflowRight = r.left + popW - (vw - 12)
        pop.style.left = overflowRight > 0 ? `${-Math.round(overflowRight)}px` : "0px"
        pop.classList.toggle("co-read-inline-popover--below", r.top < 240)
      }
      host.classList.toggle("co-read-inline-host--open", !wasOpen)
    })
    btn.addEventListener("mousedown", stopEvent)
    btn.addEventListener("touchstart", stopEvent, { passive: true })
    host.appendChild(btn)

    // 桌面端 hover 浮层：离开图标后延迟关闭，允许鼠标移入气泡写 note
    let inlineHoverTimer = 0
    const openByHoverInline = () => {
      if (inlineHoverTimer) {
        doc.defaultView?.clearTimeout(inlineHoverTimer)
        inlineHoverTimer = 0
      }
      host.classList.add("co-read-inline-host--hover")
    }
    const closeByHoverInline = () => {
      if (inlineHoverTimer) doc.defaultView?.clearTimeout(inlineHoverTimer)
      inlineHoverTimer = doc.defaultView?.setTimeout(() => {
        inlineHoverTimer = 0
        host.classList.remove("co-read-inline-host--hover")
      }, 260) ?? 0
    }
    btn.addEventListener("mouseenter", openByHoverInline)
    btn.addEventListener("mouseleave", closeByHoverInline)
    pop.addEventListener("mouseenter", openByHoverInline)
    pop.addEventListener("mouseleave", closeByHoverInline)

    host.appendChild(pop)

    const list = byPara.get(loc.para) ?? []
    list.push({ end: loc.end, marker: host })
    byPara.set(loc.para, list)
  }

  for (const [para, list] of byPara.entries()) {
    list.sort((a, b) => b.end - a.end)
    for (const { end, marker } of list) {
      if (end >= 0 && insertMarkerAtTextOffset(para, end, marker)) continue
      para.appendChild(marker)
    }
  }
}