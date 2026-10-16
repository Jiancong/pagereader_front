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

interface CommonOptions {
  annotations: CoReadAnnotation[]
  labels: CoReadInlineLabels
  dark?: boolean
  status?: CoReadInlineStatus
  onDraft: (annotationId: string, text: string) => void
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function quoteWords(quote: string): string[] {
  return quote
    .replace(/\u00a0/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

/** quote 可能被后端截断；用前若干词做空白容错匹配，返回 [start, end)（失败 null） */
function findQuoteMatchRange(rawText: string, quote: string): [number, number] | null {
  const words = quoteWords(quote)
  if (!words.length) return null
  for (let n = words.length; n >= 2; n--) {
    const part = words.slice(0, n).map(escapeRegExp).join("\\s+")
    const m = rawText.match(new RegExp(part, "i"))
    if (m && m.index !== undefined) return [m.index, m.index + m[0].length]
  }
  const single = words[0]
  if (single.length >= 4) {
    const m = rawText.match(new RegExp(escapeRegExp(single), "i"))
    if (m && m.index !== undefined) return [m.index, m.index + m[0].length]
  }
  return null
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
): HTMLElement {
  const pop = doc.createElement("div")
  pop.className = "co-read-pop"
  pop.setAttribute("role", "tooltip")

  const head = doc.createElement("div")
  head.className = "co-read-pop__head"
  const label = kindLabel(labels, ann.kind)
  head.textContent = label
  if (ann.streaming) head.textContent += ` · ${labels.streaming}`
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

  const replyLabel = doc.createElement("label")
  replyLabel.className = "co-read-pop__reply-label"
  replyLabel.textContent = labels.myReply
  pop.appendChild(replyLabel)

  const ta = doc.createElement("textarea")
  ta.className = "co-read-pop__reply"
  ta.rows = 2
  ta.placeholder = labels.replyPlaceholder
  ta.value = ann.myReply || ""
  ta.disabled = !!ann.replySent
  ta.addEventListener("input", () => onDraft(ann.id, ta.value))
  ta.addEventListener("mousedown", stopEvent)
  ta.addEventListener("click", stopEvent)
  pop.appendChild(ta)

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

  if (status.errorCode === "generation_interrupted") {
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
  if (doc.getElementById(OVL_STYLE_ID)) return
  const style = doc.createElement("style")
  style.id = OVL_STYLE_ID
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
@keyframes co-read-marker-pulse{0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,.3),0 2px 10px rgba(37,99,235,.45)}50%{box-shadow:0 0 0 5px rgba(96,165,250,.4),0 2px 14px rgba(37,99,235,.6)}}
.co-read-pop{
  position:absolute;width:min(320px,calc(100% - 16px));max-height:min(380px,60%);overflow:auto;
  padding:12px 14px;border-radius:12px;border:1px solid ${popBorder};
  background:${popBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  color:${text};font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;
  box-shadow:0 12px 40px rgba(0,0,0,.35);word-wrap:break-word;overflow-wrap:anywhere;
  visibility:hidden;opacity:0;pointer-events:none;transition:opacity .15s ease,visibility .15s;z-index:3
}
.co-read-host:hover .co-read-pop,.co-read-host:focus-within .co-read-pop,.co-read-pop:hover{visibility:visible;opacity:1;pointer-events:auto}
.co-read-pop--below{transform:translateY(10px)}
.co-read-pop__head{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${accent};margin:0 0 8px}
.co-read-pop__quote{margin:0 0 8px;padding-left:10px;border-left:3px solid ${accent};font-size:12px;font-style:italic;color:${muted};word-wrap:break-word;overflow-wrap:anywhere}
.co-read-pop__body{margin:0 0 8px;white-space:pre-wrap;font-size:13px;word-wrap:break-word;overflow-wrap:anywhere}
.co-read-pop__reply-label{display:block;margin:8px 0 4px;font-size:10px;color:${muted}}
.co-read-pop__reply{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid ${dark ? "#374151" : "#d1d5db"};background:${dark ? "#0a0a0a" : "#fff"};color:${text};padding:8px 10px;font-size:12px;resize:vertical;min-height:48px;max-width:100%}
.co-read-pop__reply:disabled{opacity:.55}
.co-read-pop__sent{font-size:11px;color:#9ca3af;margin:4px 0 0}
`
  doc.head.appendChild(style)
}

/** 在 body 中只读定位 quote 的 Range（不改 DOM） */
function quoteRangeIn(body: HTMLElement, quote: string): Range | null {
  const doc = body.ownerDocument
  if (!doc) return null
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  const nodes: { node: Text; start: number; end: number }[] = []
  let acc = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const len = (node.textContent || "").length
    nodes.push({ node, start: acc, end: acc + len })
    acc += len
  }
  const full = nodes.map((n) => n.node.textContent || "").join("")
  const range = findQuoteMatchRange(full, quote)
  if (!range) return null
  const at = (offset: number) => {
    for (const n of nodes) {
      if (offset >= n.start && offset <= n.end) return { node: n.node, offset: offset - n.start }
    }
    return null
  }
  const s = at(range[0])
  const e = at(range[1])
  if (!s || !e) return null
  const r = doc.createRange()
  r.setStart(s.node, s.offset)
  r.setEnd(e.node, e.offset)
  return r
}

export function syncCoReadOverlayAnnotations(opts: CoReadOverlayOptions) {
  const hostDoc = opts.host.ownerDocument
  if (!hostDoc) return
  ensureOverlayStyles(hostDoc, !!opts.dark)
  opts.host.classList.add("co-read-host")

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

  const bodyWin = opts.body.ownerDocument.defaultView
  const frame = (bodyWin?.frameElement as HTMLElement | null) ?? null
  const hostRect = opts.host.getBoundingClientRect()
  let baseX = 0
  let baseY = 0
  if (frame) {
    const fr = frame.getBoundingClientRect()
    baseX = fr.left - hostRect.left + (bodyWin?.scrollX || 0)
    baseY = fr.top - hostRect.top + (bodyWin?.scrollY || 0)
  } else {
    const br = opts.body.getBoundingClientRect()
    baseX = br.left - hostRect.left
    baseY = br.top - hostRect.top
  }
  const hostW = hostRect.width
  const hostH = hostRect.height

  for (const ann of opts.annotations) {
    const host = hostDoc.createElement("span")
    host.className = "co-read-host"
    host.setAttribute(INLINE_ATTR, ann.id)

    const quote = ann.anchor.quote?.trim() || ""
    const range = quote ? quoteRangeIn(opts.body, quote) : null
    let mx: number
    let my: number
    let lineH = 18
    if (range) {
      const rect = range.getBoundingClientRect()
      mx = baseX + rect.right
      my = baseY + rect.top
      lineH = Math.max(14, rect.height)
    } else {
      mx = hostW / 2
      my = baseY + 8
    }
    mx = Math.max(4, Math.min(mx, hostW - 26))
    my = Math.max(2, my)

    const btn = hostDoc.createElement("button")
    btn.type = "button"
    btn.className = "co-read-marker"
    const label = kindLabel(opts.labels, ann.kind)
    btn.title = `${opts.labels.annotationTitle}: ${label}`
    btn.setAttribute("aria-label", btn.title)
    btn.innerHTML = markerSvg()
    btn.style.left = `${mx}px`
    btn.style.top = `${Math.max(2, my + Math.round(lineH / 2) - 11)}px`
    btn.addEventListener("click", stopEvent)
    btn.addEventListener("mousedown", stopEvent)
    host.appendChild(btn)

    const pop = buildPopoverContent(hostDoc, ann, opts.labels, opts.onDraft)
    const popLeft = Math.max(4, Math.min(mx - 40, hostW - 324))
    if (my > hostH * 0.55) {
      pop.style.bottom = `${Math.max(8, hostH - my + 12)}px`
    } else {
      pop.classList.add("co-read-pop--below")
      pop.style.top = `${my + lineH + 12}px`
    }
    pop.style.left = `${popLeft}px`
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
.co-read-inline-host:hover .co-read-inline-popover,
.co-read-inline-host:focus-within .co-read-inline-popover{
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
    if (!loc) {
      const idx = Math.max(0, ann.anchor.paragraphIndex)
      const para = anchors[Math.min(idx, anchors.length - 1)]
      if (!para) continue
      loc = { para, end: -1 }
    }
    const host = doc.createElement("span")
    host.className = "co-read-inline-host"
    host.setAttribute(INLINE_ATTR, ann.id)

    const btn = doc.createElement("button")
    btn.type = "button"
    btn.className = "co-read-inline-marker"
    btn.title = `${opts.labels.annotationTitle}: ${kindLabel(opts.labels, ann.kind)}`
    btn.setAttribute("aria-label", btn.title)
    btn.innerHTML = markerSvg()
    btn.addEventListener("click", stopEvent)
    btn.addEventListener("mousedown", stopEvent)
    host.appendChild(btn)

    const pop = buildPopoverContent(doc, ann, opts.labels, opts.onDraft)
    pop.className = "co-read-inline-popover"
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