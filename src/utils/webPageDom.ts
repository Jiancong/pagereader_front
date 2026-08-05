// 沉浸式网页翻译：HTML 清洗、资源地址绝对化与翻译单元提取。
// 清洗后的 DOM 可挂入 ShadowRoot，做到脚本与样式双向隔离；
// 翻译单元按「最深块级容器 + 连续 <br> 段落分隔」提取，
// 译文整体写回组内最长文本节点，DOM 元素结构保持不变。
// @author hc @date 2026-08-05

/** 直接移除的标签：脚本/样式/框架/表单等无法静态渲染或有安全风险的元素 */
const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "BASE",
  "IFRAME",
  "FRAME",
  "FRAMESET",
  "OBJECT",
  "EMBED",
  "APPLET",
  "FORM",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "BUTTON",
  "NOSCRIPT",
  "TEMPLATE",
  "CANVAS",
  "DIALOG",
  "PORTAL",
])

/** 块级边界：单元提取不会跨越这些标签 */
const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "LI",
  "TD",
  "TH",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "DD",
  "DT",
  "FIGCAPTION",
  "CAPTION",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "ASIDE",
  "MAIN",
  "NAV",
  "TABLE",
  "TR",
  "UL",
  "OL",
  "DL",
  "FIELDSET",
  "ADDRESS",
  "DETAILS",
  "SUMMARY",
  "FIGURE",
])

/** 代码类内容不翻译 */
const SKIP_TEXT_TAGS = new Set(["CODE", "KBD", "SAMP", "VAR", "PRE", "TEXTAREA"])

/** 单个翻译单元的字符上限，超出按文本节点边界二次切分 */
const MAX_UNIT_CHARS = 2400

export interface PreparedWebPage {
  title: string
  /** 清洗后的内容容器（.web-doc），克隆后即可挂载 */
  content: HTMLElement
}

export interface UnitNode {
  node: Text
  original: string
}

export interface WebTranslationUnit {
  /** 组内全部文本节点（含纯空白间距节点） */
  nodes: UnitNode[]
  /** 承载整段译文的节点（组内最长、且尽量不在链接内） */
  carrier: Text
  /** 合并后的待翻译文本 */
  text: string
}

function isUnsafeUrl(value: string): boolean {
  return /^\s*(javascript|vbscript|data)\s*:/i.test(value) && !/^\s*data:image\//i.test(value)
}

function absolutize(value: string, base: URL): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith("#")) return value
  if (/^(mailto|tel|javascript|data|blob):/i.test(trimmed)) return value
  try {
    return new URL(trimmed, base).href
  } catch {
    return value
  }
}

function sanitizeSrcset(value: string, base: URL): string {
  return value
    .split(",")
    .map((part) => {
      const seg = part.trim().split(/\s+/)
      if (!seg[0]) return part.trim()
      seg[0] = absolutize(seg[0], base)
      return seg.join(" ")
    })
    .join(", ")
}

const URL_ATTRS = new Set(["href", "src", "action", "formaction", "poster", "background", "longdesc", "cite"])

function sanitizeElement(el: Element, base: URL): void {
  const tag = el.tagName
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value
    if (name.startsWith("on") || name === "srcdoc") {
      el.removeAttribute(attr.name)
      continue
    }
    if (URL_ATTRS.has(name)) {
      if (isUnsafeUrl(value)) {
        el.removeAttribute(attr.name)
        continue
      }
      el.setAttribute(attr.name, absolutize(value, base))
      continue
    }
    if (name === "srcset" || name === "imagesrcset") {
      el.setAttribute(attr.name, sanitizeSrcset(value, base))
      continue
    }
    // 防止内联样式把内容钉在屏外或注入外部字体/脚本
    if (name === "style" && /(expression|url\s*\(\s*['"]?\s*javascript)/i.test(value)) {
      el.removeAttribute(attr.name)
    }
  }
  if (tag === "A") {
    el.setAttribute("target", "_blank")
    el.setAttribute("rel", "noopener noreferrer")
  }
  if (tag === "IMG") {
    if (!el.getAttribute("loading")) el.setAttribute("loading", "lazy")
    el.setAttribute("referrerpolicy", "no-referrer")
  }
  if (tag === "VIDEO" || tag === "AUDIO") {
    el.removeAttribute("autoplay")
  }
}

/**
 * 解析并清洗网页 HTML，返回标题与可直接克隆使用的内容容器。
 */
export function prepareWebPage(html: string, pageUrl: string): PreparedWebPage {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const base = new URL(pageUrl)

  // 先删后洗，避免对废弃节点做无谓处理
  doc.querySelectorAll(Array.from(DROP_TAGS).join(",")).forEach((el) => el.remove())
  const walk = (root: Element | DocumentFragment) => {
    sanitizeElement(root as Element, base)
    root.querySelectorAll("*").forEach((el) => sanitizeElement(el, base))
  }
  if (doc.body) walk(doc.body)

  const wrapper = document.createElement("div")
  wrapper.className = "web-doc"
  const source = doc.body ?? doc.documentElement
  while (source.firstChild) wrapper.appendChild(source.firstChild)
  return { title: (doc.title ?? "").trim(), content: wrapper }
}

type WalkEvent = { kind: "text"; node: Text } | { kind: "br" }

function isHiddenByInlineStyle(el: HTMLElement): boolean {
  if (el.hidden) return true
  const style = el.getAttribute("style") ?? ""
  return /display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style)
}

function hasNoTranslateFlag(el: HTMLElement): boolean {
  return el.getAttribute("translate") === "no" || el.classList.contains("notranslate")
}

/** 收集块级容器「自身」的文本事件，不进入块级/代码类子元素 */
function collectOwnEvents(container: HTMLElement): WalkEvent[] {
  const events: WalkEvent[] = []
  const visit = (node: Node, isContainer: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      events.push({ kind: "text", node: node as Text })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (!isContainer) {
      const tag = el.tagName
      if (BLOCK_TAGS.has(tag) || SKIP_TEXT_TAGS.has(tag)) return
      if (isHiddenByInlineStyle(el) || hasNoTranslateFlag(el)) return
      if (tag === "BR") {
        events.push({ kind: "br" })
        return
      }
    }
    node.childNodes.forEach((child) => visit(child, false))
  }
  visit(container, true)
  return events
}

/** 按连续 <br>（≥2）把文本事件切成段落组 */
function splitIntoParagraphGroups(events: WalkEvent[]): Text[][] {
  const groups: Text[][] = []
  let current: Text[] = []
  let brRun = 0
  for (const ev of events) {
    if (ev.kind === "br") {
      brRun += 1
      if (brRun >= 2 && current.length) {
        groups.push(current)
        current = []
      }
      continue
    }
    const value = ev.node.nodeValue ?? ""
    // 纯空白节点：保留在组内作间距，但不打断连续 <br> 计数
    if (!value.trim()) {
      if (current.length) current.push(ev.node)
      continue
    }
    current.push(ev.node)
    brRun = 0
  }
  if (current.length) groups.push(current)
  return groups
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pickCarrier(nodes: UnitNode[]): Text {
  const meaningful = nodes.filter((n) => n.original.trim().length > 0)
  const pool = meaningful.length ? meaningful : nodes
  const outsideLink = pool.filter((n) => !n.node.parentElement?.closest("a"))
  const candidates = outsideLink.length ? outsideLink : pool
  return candidates.reduce((best, cur) =>
    cur.original.length > best.original.length ? cur : best,
  ).node
}

function makeUnit(nodes: Text[]): WebTranslationUnit | null {
  const text = normalizeText(nodes.map((n) => n.nodeValue ?? "").join(" "))
  if (text.length < 2 || !/\p{L}/u.test(text)) return null
  const unitNodes: UnitNode[] = nodes.map((n) => ({ node: n, original: n.nodeValue ?? "" }))
  return { nodes: unitNodes, carrier: pickCarrier(unitNodes), text }
}

function pushGroupsAsUnits(groups: Text[][], units: WebTranslationUnit[]): void {
  for (const group of groups) {
    // 超长段落按字符预算二次切分，避免单条译文过长
    let bucket: Text[] = []
    let chars = 0
    for (const node of group) {
      const len = (node.nodeValue ?? "").length
      if (bucket.length && chars + len > MAX_UNIT_CHARS) {
        const unit = makeUnit(bucket)
        if (unit) units.push(unit)
        bucket = []
        chars = 0
      }
      bucket.push(node)
      chars += len
    }
    const unit = makeUnit(bucket)
    if (unit) units.push(unit)
  }
}

/**
 * 从（右栏克隆）内容中提取翻译单元。
 * 每个单元对应一组文本节点，译文写回后 DOM 元素结构不变。
 */
export function collectTranslationUnits(root: HTMLElement): WebTranslationUnit[] {
  const units: WebTranslationUnit[] = []
  const candidates: HTMLElement[] = [root]
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (BLOCK_TAGS.has(el.tagName)) candidates.push(el)
  })
  for (const el of candidates) {
    if (el !== root && (SKIP_TEXT_TAGS.has(el.tagName) || isHiddenByInlineStyle(el) || hasNoTranslateFlag(el))) {
      continue
    }
    pushGroupsAsUnits(splitIntoParagraphGroups(collectOwnEvents(el)), units)
  }
  return units
}

/** 把整段译文写回组内最长节点，其余节点置空，保持元素结构不变 */
export function applyUnitTranslation(unit: WebTranslationUnit, translated: string): void {
  const clean = normalizeText(translated)
  if (!clean) return
  const first = unit.nodes[0]?.original ?? ""
  const last = unit.nodes[unit.nodes.length - 1]?.original ?? ""
  const lead = /^\s/.test(first) ? " " : ""
  const trail = /\s$/.test(last) ? " " : ""
  unit.carrier.nodeValue = `${lead}${clean}${trail}`
  for (const n of unit.nodes) {
    if (n.node !== unit.carrier) n.node.nodeValue = ""
  }
}

/** 恢复单元内所有文本节点的原始内容（重新翻译前调用） */
export function restoreUnit(unit: WebTranslationUnit): void {
  for (const n of unit.nodes) n.node.nodeValue = n.original
}
