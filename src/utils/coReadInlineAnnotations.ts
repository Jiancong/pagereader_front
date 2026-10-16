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
  width:1.15em;height:1.15em;padding:0;margin:0;border:none;border-radius:50%;
  background:${dark ? "rgba(37,99,235,.45)" : "rgba(37,99,235,.28)"};
  color:${accent};font-size:.55em;line-height:1;cursor:pointer;vertical-align:super;
  box-shadow:0 0 0 1px ${popBorder};transition:transform .12s,background .12s
}
.co-read-inline-marker:hover,.co-read-inline-host:focus-within .co-read-inline-marker{
  transform:scale(1.08);background:${dark ? "rgba(37,99,235,.65)" : "rgba(37,99,235,.45)"}
}
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
  btn.textContent = "●"
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

/** 在 body 内按段落索引挂载 marker（不插入块级批注，避免挤版） */
export function syncCoReadInlineAnnotations(body: HTMLElement, opts: SyncCoReadInlineOptions) {
  const doc = body.ownerDocument
  if (!doc) return
  ensureStyles(doc, !!opts.dark)
  clearInlineHosts(body)

  renderStatus(doc, body, opts.labels, opts.status || {})

  const anchors = collectParagraphAnchors(body)
  if (!anchors.length) return

  const byPara = new Map<number, CoReadAnnotation[]>()
  for (const ann of opts.annotations) {
    const p = resolveParagraphIndex(anchors, ann)
    if (!byPara.has(p)) byPara.set(p, [])
    byPara.get(p)!.push(ann)
  }

  for (const [pIdx, list] of byPara.entries()) {
    const anchor = anchors[pIdx]
    if (!anchor) continue
    for (const ann of list) {
      anchor.appendChild(renderAnnotationMarker(doc, ann, opts.labels, opts.onDraft))
    }
  }
}

function resolveParagraphIndex(anchors: HTMLElement[], ann: CoReadAnnotation): number {
  const raw = Math.max(0, ann.anchor.paragraphIndex)
  if (anchors[raw]) return raw
  const quote = ann.anchor.quote?.trim()
  if (quote) {
    const needle = quote.slice(0, 48)
    const hit = anchors.findIndex((el) => (el.textContent || "").includes(needle))
    if (hit >= 0) return hit
  }
  return Math.min(raw, anchors.length - 1)
}
