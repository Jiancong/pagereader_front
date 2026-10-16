// 共读批注：按 paragraph_index 插入阅读文档 DOM
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
  style.textContent = `
.co-read-inline-status,.co-read-inline-ann{margin:12px 0;padding:12px 14px;border-radius:10px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.55}
.co-read-inline-status{border:1px dashed ${dark ? "#4b5563" : "#d1d5db"};color:${dark ? "#9ca3af" : "#6b7280"};background:${dark ? "#111827" : "#f9fafb"}}
.co-read-inline-ann{border:1px solid ${dark ? "#2563eb55" : "#93c5fd"};background:${dark ? "#1e3a5f22" : "#eff6ff"};color:${dark ? "#e5e7eb" : "#1f2937"}}
.co-read-inline-ann__head{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${dark ? "#93c5fd" : "#2563eb"};margin-bottom:8px}
.co-read-inline-ann__quote{margin:0 0 8px;padding-left:10px;border-left:3px solid ${dark ? "#3b82f6" : "#93c5fd"};font-size:13px;font-style:italic;color:${dark ? "#9ca3af" : "#6b7280"}}
.co-read-inline-ann__body{margin:0;white-space:pre-wrap;font-size:14px}
.co-read-inline-ann__reply-label{display:block;margin:10px 0 4px;font-size:11px;color:${dark ? "#9ca3af" : "#6b7280"}}
.co-read-inline-ann__reply{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid ${dark ? "#374151" : "#d1d5db"};background:${dark ? "#0a0a0a" : "#fff"};color:${dark ? "#e5e7eb" : "#111"};padding:8px 10px;font-size:13px;resize:vertical;min-height:52px}
.co-read-inline-ann__reply:disabled{opacity:.55}
.co-read-inline-retry{margin-top:8px;padding:0;border:none;background:none;color:${dark ? "#93c5fd" : "#2563eb"};font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline}
.co-read-inline-group{display:block}
`
  doc.head.appendChild(style)
}

function clearInlineHosts(body: HTMLElement) {
  body.querySelectorAll(`[${INLINE_ATTR}]`).forEach((el) => el.remove())
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
    const msg = doc.createElement("div")
    msg.textContent = labels.generationFailed || "Failed"
    box.appendChild(msg)
    if (status.onRetry && labels.retryPage) {
      const btn = doc.createElement("button")
      btn.type = "button"
      btn.className = "co-read-inline-retry"
      btn.textContent = labels.retryPage
      btn.addEventListener("click", (e) => {
        e.preventDefault()
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
  body.insertBefore(box, body.firstChild)
}

function renderAnnotation(
  doc: Document,
  ann: CoReadAnnotation,
  labels: CoReadInlineLabels,
  onDraft: (id: string, text: string) => void,
): HTMLElement {
  const root = doc.createElement("div")
  root.className = "co-read-inline-ann"
  root.setAttribute(INLINE_ATTR, ann.id)

  const head = doc.createElement("div")
  head.className = "co-read-inline-ann__head"
  head.textContent = kindLabel(labels, ann.kind)
  if (ann.streaming) {
    head.textContent += ` · ${labels.streaming}`
  }
  root.appendChild(head)

  if (ann.anchor.quote) {
    const q = doc.createElement("blockquote")
    q.className = "co-read-inline-ann__quote"
    q.textContent = ann.anchor.quote
    root.appendChild(q)
  }

  const body = doc.createElement("p")
  body.className = "co-read-inline-ann__body"
  body.textContent = ann.content || ""
  root.appendChild(body)

  const label = doc.createElement("label")
  label.className = "co-read-inline-ann__reply-label"
  label.textContent = labels.myReply
  root.appendChild(label)

  const ta = doc.createElement("textarea")
  ta.className = "co-read-inline-ann__reply"
  ta.rows = 2
  ta.placeholder = labels.replyPlaceholder
  ta.value = ann.myReply || ""
  ta.disabled = !!ann.replySent
  ta.addEventListener("input", () => onDraft(ann.id, ta.value))
  root.appendChild(ta)

  if (ann.replySent) {
    const sent = doc.createElement("p")
    sent.style.fontSize = "11px"
    sent.style.color = "#9ca3af"
    sent.style.margin = "4px 0 0"
    sent.textContent = labels.replySent
    root.appendChild(sent)
  }

  return root
}

/** 在 body 内按段落索引挂载/更新批注（会先清掉旧节点） */
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
    const group = doc.createElement("div")
    group.className = "co-read-inline-group"
    group.setAttribute(INLINE_ATTR, `group-${pIdx}`)
    for (const ann of list) {
      group.appendChild(renderAnnotation(doc, ann, opts.labels, opts.onDraft))
    }
    anchor.insertAdjacentElement("afterend", group)
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
