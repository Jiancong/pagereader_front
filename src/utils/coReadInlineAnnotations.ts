// 共读批注：段落内 marker + hover 浮层（不撑开 EPUB 分页）
// @author hc @date 2026-10-16

import type { CoReadAnnotation } from "@/types/coReading"

const STYLE_ID = "co-read-inline-styles"
const INLINE_ATTR = "data-co-read-inline-root"

export function collectParagraphAnchors(body: HTMLElement): HTMLElement[] {
  const nodes = body.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6, pre")
  const blocks: HTMLElement[] = []
  nodes.forEach((el) => {
    const text = (el.textContent || "").trim()
    if (text) blocks.push(el as HTMLElement)
  })
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
}

export interface CoReadInlineStatus {
  loading?: boolean
  intro?: string
  errorCode?: string
  emptyHint?: string
  onRetry?: () => void
}

export interface SyncCoReadInlineOptions {
  annotations: CoReadAnnotation[]
  labels: CoReadInlineLabels
  dark?: boolean
  status?: CoReadInlineStatus
  onDraft: (annotationId: string, text: string) => void
}

function ensureStyles(doc: Document, dark: boolean) {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement("style")
  style.id = STYLE_ID
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
.co-read-inline-retry{margin-left:8px;padding:0;border:none;background:none;color:${accent};font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;pointer-events:auto}
.co-read-inline-host{position:relative;display:inline;vertical-align:baseline;white-space:nowrap;margin:0 0 0 .15em;line-height:inherit}
.co-read-inline-marker{
  display:inline-flex;align-items:center;justify-content:center;
  width:1.35em;height:1.35em;padding:0;margin:0 0 0 .12em;border:none;border-radius:8px;
  background:linear-gradient(145deg,${dark ? "#3b82f6" : "#2563eb"},${dark ? "#6366f1" : "#4f46e5"});
  color:#fff;line-height:0;cursor:pointer;vertical-align:-0.15em;
  box-shadow:0 0 0 2px ${dark ? "rgba(147,197,253,.35)" : "rgba(37,99,235,.25)"},0 2px 8px rgba(37,99,235,.45);
  transition:transform .12s,box-shadow .12s;animation:co-read-marker-pulse 2.2s ease-in-out infinite
}
.co-read-inline-marker svg{width:.85em;height:.85em;display:block;fill:currentColor}
.co-read-inline-marker:hover,.co-read-inline-host:focus-within .co-read-inline-marker{
  transform:scale(1.12);box-shadow:0 0 0 3px rgba(96,165,250,.55),0 4px 14px rgba(37,99,235,.55)
}
@keyframes co-read-marker-pulse{0%,100%{box-shadow:0 0 0 2px ${dark ? "rgba(147,197,253,.35)" : "rgba(37,99,235,.25)"},0 2px 8px rgba(37,99,235,.4)}50%{box-shadow:0 0 0 4px rgba(96,165,250,.45),0 2px 12px rgba(37,99,235,.55)}}
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
.co-read-inline-host:hover .co-read-inline-popover,
.co-read-inline-host:focus-within .co-read-inline-popover{
  visibility:visible;opacity:1;pointer-events:auto
}
.co-read-inline-popover--below{bottom:auto;top:calc(100% + 8px)}
.co-read-inline-ann__head{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${accent};margin:0 0 8px}
.co-read-inline-ann__quote{margin:0 0 8px;padding-left:10px;border-left:3px solid ${accent};font-size:12px;font-style:italic;color:${muted};word-wrap:break-word;overflow-wrap:anywhere}
.co-read-inline-ann__body{margin:0 0 8px;white-space:pre-wrap;font-size:13px;word-wrap:break-word;overflow-wrap:anywhere}
.co-read-inline-ann__reply-label{display:block;margin:8px 0 4px;font-size:10px;color:${muted}}
.co-read-inline-ann__reply{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid ${dark ? "#374151" : "#d1d5db"};background:${dark ? "#0a0a0a" : "#fff"};color:${text};padding:8px 10px;font-size:12px;resize:vertical;min-height:48px;max-width:100%}
.co-read-inline-ann__reply:disabled{opacity:.55}
`
  doc.head.appendChild(style)
}

function clearInlineHosts(body: HTMLElement) {
  body.querySelectorAll(`[${INLINE_ATTR}]`).forEach((el) => el.remove())
  body.querySelectorAll(".co-read-inline-status").forEach((el) => el.remove())
}

function kindLabel(labels: CoReadInlineLabels, kind: string): string {
  const v = labels.kind(kind)
  return v || labels.annotationTitle
}

function renderStatus(doc: Document, body: HTMLElement, labels: CoReadInlineLabels, status: CoReadInlineStatus) {
  if (!status.loading && !status.intro && !status.errorCode && !status.emptyHint) return
  const box = doc.createElement("div")
  box.className = "co-read-inline-status"
  box.setAttribute(INLINE_ATTR, "status")

  if (status.errorCode === "generation_interrupted") {
    const msg = doc.createElement("span")
    msg.textContent = labels.generationFailed || "Failed"
    box.appendChild(msg)
    if (status.onRetry && labels.retryPage) {
      const btn = doc.createElement("button")
      btn.type = "button"
      btn.className = "co-read-inline-retry"
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
    return
  }
  body.appendChild(box)
}

function stopReaderNav(e: Event) {
  e.stopPropagation()
}

function renderAnnotationMarker(
  doc: Document,
  ann: CoReadAnnotation,
  labels: CoReadInlineLabels,
  onDraft: (id: string, text: string) => void,
): HTMLElement {
  const host = doc.createElement("span")
  host.className = "co-read-inline-host"
  host.setAttribute(INLINE_ATTR, ann.id)

  const btn = doc.createElement("button")
  btn.type = "button"
  btn.className = "co-read-inline-marker"
  const label = kindLabel(labels, ann.kind)
  btn.title = `${labels.annotationTitle}: ${label}`
  btn.setAttribute("aria-label", btn.title)
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>'
  btn.addEventListener("click", stopReaderNav)
  btn.addEventListener("mousedown", stopReaderNav)
  host.appendChild(btn)

  const pop = doc.createElement("div")
  pop.className = "co-read-inline-popover"
  pop.setAttribute("role", "tooltip")

  const head = doc.createElement("div")
  head.className = "co-read-inline-ann__head"
  head.textContent = label
  if (ann.streaming) head.textContent += ` · ${labels.streaming}`
  pop.appendChild(head)

  if (ann.anchor.quote) {
    const q = doc.createElement("blockquote")
    q.className = "co-read-inline-ann__quote"
    q.textContent = ann.anchor.quote
    pop.appendChild(q)
  }

  const body = doc.createElement("p")
  body.className = "co-read-inline-ann__body"
  body.textContent = ann.content || ""
  pop.appendChild(body)

  const replyLabel = doc.createElement("label")
  replyLabel.className = "co-read-inline-ann__reply-label"
  replyLabel.textContent = labels.myReply
  pop.appendChild(replyLabel)

  const ta = doc.createElement("textarea")
  ta.className = "co-read-inline-ann__reply"
  ta.rows = 2
  ta.placeholder = labels.replyPlaceholder
  ta.value = ann.myReply || ""
  ta.disabled = !!ann.replySent
  ta.addEventListener("input", () => onDraft(ann.id, ta.value))
  ta.addEventListener("mousedown", stopReaderNav)
  ta.addEventListener("click", stopReaderNav)
  pop.appendChild(ta)

  if (ann.replySent) {
    const sent = doc.createElement("p")
    sent.style.fontSize = "11px"
    sent.style.color = "#9ca3af"
    sent.style.margin = "4px 0 0"
    sent.textContent = labels.replySent
    pop.appendChild(sent)
  }

  host.appendChild(pop)

  btn.addEventListener("mouseenter", () => {
    const rect = pop.getBoundingClientRect()
    const docEl = doc.documentElement
    if (rect.top < 8) {
      pop.classList.add("co-read-inline-popover--below")
    } else {
      pop.classList.remove("co-read-inline-popover--below")
    }
    void docEl
  })

  return host
}

/** 与 POST /page 切段一致：仅用 paragraph_index 定位段落（不在全书 DOM 里搜 quote） */
function paragraphForAnnotation(anchors: HTMLElement[], ann: CoReadAnnotation): HTMLElement | null {
  const idx = Math.max(0, ann.anchor.paragraphIndex)
  if (anchors[idx]) return anchors[idx]
  return anchors.length ? anchors[Math.min(idx, anchors.length - 1)] : null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** 后端 quote 可能被截断；用前若干词做空白容错匹配 */
function findQuoteMatchEnd(rawText: string, quote: string): number {
  const words = quote
    .replace(/\u00a0/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return -1
  for (let n = words.length; n >= 2; n--) {
    const part = words.slice(0, n).map(escapeRegExp).join("\\s+")
    const re = new RegExp(part, "i")
    const m = rawText.match(re)
    if (m && m.index !== undefined) return m.index + m[0].length
  }
  const single = escapeRegExp(words[0])
  const m = rawText.match(new RegExp(single, "i"))
  if (m && m.index !== undefined) return m.index + m[0].length
  return -1
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

/** 在 anchor.quote 结束位置插入 marker（仅在该 paragraph_index 段落内查找） */
function insertMarkerAfterQuote(para: HTMLElement, quote: string, marker: HTMLElement): boolean {
  const raw = para.textContent || ""
  const end = findQuoteMatchEnd(raw, quote)
  if (end < 0) return false
  return insertMarkerAtTextOffset(para, end, marker)
}

function quoteMatchEndForSort(para: HTMLElement, quote: string | undefined): number {
  if (!quote?.trim()) return -1
  return findQuoteMatchEnd(para.textContent || "", quote)
}

/** 在 body 内按 paragraph_index + quote 挂载 marker（不插入块级批注，避免挤版） */
export function syncCoReadInlineAnnotations(body: HTMLElement, opts: SyncCoReadInlineOptions) {
  const doc = body.ownerDocument
  if (!doc) return
  ensureStyles(doc, !!opts.dark)
  clearInlineHosts(body)

  renderStatus(doc, body, opts.labels, opts.status || {})

  const anchors = collectParagraphAnchors(body)
  if (!anchors.length) return

  const items = opts.annotations
    .map((ann) => ({ ann, para: paragraphForAnnotation(anchors, ann) }))
    .filter((x): x is { ann: CoReadAnnotation; para: HTMLElement } => Boolean(x.para))

  items.sort((a, b) => {
    const ea = quoteMatchEndForSort(a.para, a.ann.anchor.quote) ?? -1
    const eb = quoteMatchEndForSort(b.para, b.ann.anchor.quote) ?? -1
    return eb - ea
  })

  for (const { ann, para } of items) {
    const marker = renderAnnotationMarker(doc, ann, opts.labels, opts.onDraft)
    const quote = ann.anchor.quote?.trim()
    if (quote && insertMarkerAfterQuote(para, quote, marker)) continue
    para.appendChild(marker)
  }
}
