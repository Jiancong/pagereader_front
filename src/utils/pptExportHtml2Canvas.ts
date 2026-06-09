/**
 * html2canvas 无法解析 color-mix() / color() / oklch() 等现代 CSS 颜色；
 * 导出前移除含这些函数的样式表，并将已计算样式内联到克隆节点。
 */

const UNSUPPORTED_COLOR_RE = /color-mix\s*\(|(?<![a-z-])color\s*\(|oklch\s*\(|lab\s*\(/i

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "fill",
  "stroke",
] as const

const LAYOUT_PROPS = [
  "display",
  "position",
  "box-sizing",
  "top",
  "right",
  "bottom",
  "left",
  "height",
  "min-height",
  "max-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-radius",
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "align-items",
  "align-self",
  "justify-content",
  "justify-items",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-column",
  "grid-row",
  "grid-area",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "text-decoration-line",
  "white-space",
  "word-break",
  "overflow-wrap",
  "opacity",
  "visibility",
  "overflow",
  "overflow-x",
  "overflow-y",
  "z-index",
  "transform",
  "object-fit",
  "object-position",
  "vertical-align",
  "list-style-type",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "box-shadow",
  "filter",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
] as const

let colorCanvas: HTMLCanvasElement | null = null

function resolveExportColor(value: string): string {
  if (!value || value === "transparent" || value === "none" || value === "currentcolor") {
    return value
  }
  if (!UNSUPPORTED_COLOR_RE.test(value)) return value

  if (!colorCanvas) {
    colorCanvas = document.createElement("canvas")
    colorCanvas.width = 1
    colorCanvas.height = 1
  }
  const ctx = colorCanvas.getContext("2d")
  if (!ctx) return value

  try {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(4)})`
  } catch {
    return value
  }
}

function sanitizeCssValue(value: string): string {
  if (!value || !UNSUPPORTED_COLOR_RE.test(value)) return value
  return value.replace(
    /color-mix\([^)]*\)|(?<![a-z-])color\([^)]*\)|oklch\([^)]*\)|lab\([^)]*\)/gi,
    (match) => resolveExportColor(match),
  )
}

/** 匹配含嵌套括号的 color-mix(...) / oklch(...) 等，避免整段删除 stylesheet */
function replaceUnsupportedColorFunctions(css: string): string {
  const NEEDLE = ["color-mix(", "oklch(", "lab(", "color("] as const
  let out = css
  let changed = true
  while (changed) {
    changed = false
    for (const needle of NEEDLE) {
      const start = out.indexOf(needle)
      if (start < 0) continue
      let depth = 0
      let end = start
      for (let i = start; i < out.length; i++) {
        const ch = out[i]
        if (ch === "(") depth++
        else if (ch === ")") {
          depth--
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
      if (end <= start) continue
      const match = out.slice(start, end)
      const replacement = resolveExportColor(match)
      out = out.slice(0, start) + replacement + out.slice(end)
      changed = true
      break
    }
  }
  return out
}

function stripUnsupportedStylesheets(clonedDoc: Document): void {
  clonedDoc.querySelectorAll("style").forEach((node) => {
    if (node.id === "ppt-export-styles") return
    const css = node.textContent ?? ""
    if (UNSUPPORTED_COLOR_RE.test(css)) {
      node.textContent = replaceUnsupportedColorFunctions(css)
    }
  })
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove())
}

function inlineExportComputedStyles(source: Element, clone: Element): void {
  if (!(clone instanceof HTMLElement || clone instanceof SVGElement)) return

  const cs = window.getComputedStyle(source)
  const style = clone.style

  for (const prop of LAYOUT_PROPS) {
    const val = cs.getPropertyValue(prop)
    if (!val) continue
    style.setProperty(prop, sanitizeCssValue(val), "important")
  }

  for (const prop of COLOR_PROPS) {
    const raw = cs.getPropertyValue(prop)
    if (!raw || raw === "none") continue
    const val = resolveExportColor(raw)
    style.setProperty(prop, val, "important")
    if (clone instanceof SVGElement && (prop === "fill" || prop === "stroke")) {
      clone.setAttribute(prop, val)
    }
  }

  const srcChildren = source.children
  const cloneChildren = clone.children
  const len = Math.min(srcChildren.length, cloneChildren.length)
  for (let i = 0; i < len; i++) {
    inlineExportComputedStyles(srcChildren[i], cloneChildren[i])
  }
}

/** 导出前锁定幻灯片 typography token，避免 html2canvas 克隆文档里 vw/cqi 重算导致字号变化 */
const PPT_EXPORT_TYPOGRAPHY_VARS = [
  "--ppt-fs-display",
  "--ppt-fs-title",
  "--ppt-fs-heading",
  "--ppt-fs-body-lg",
  "--ppt-fs-body",
  "--ppt-fs-body-sm",
  "--ppt-fs-caption",
  "--ppt-fs-quote-mark",
  "--ppt-pad-y",
  "--ppt-pad-x",
  "--ppt-gap-sm",
  "--ppt-gap-md",
  "--ppt-gap-lg",
] as const

export function pinPptExportTypography(wrapper: HTMLElement): () => void {
  const cs = getComputedStyle(wrapper)
  const saved = PPT_EXPORT_TYPOGRAPHY_VARS.map(
    (v) => [v, wrapper.style.getPropertyValue(v)] as const,
  )
  for (const v of PPT_EXPORT_TYPOGRAPHY_VARS) {
    const val = cs.getPropertyValue(v).trim()
    if (val) wrapper.style.setProperty(v, val)
  }
  return () => {
    for (const [v, prev] of saved) {
      if (prev) wrapper.style.setProperty(v, prev)
      else wrapper.style.removeProperty(v)
    }
  }
}

/** 将多张 slide 截图纵向拼接为一张长图（居中放置，宽度取最大值） */
export function stitchCanvasesVertically(
  canvases: HTMLCanvasElement[],
  options?: { gap?: number; background?: string },
): HTMLCanvasElement | null {
  if (!canvases.length) return null

  const gap = Math.max(0, options?.gap ?? 0)
  const background = options?.background ?? "#000000"
  const width = Math.max(...canvases.map((c) => c.width))
  const totalHeight =
    canvases.reduce((sum, c) => sum + c.height, 0) + gap * Math.max(0, canvases.length - 1)

  const out = document.createElement("canvas")
  out.width = width
  out.height = totalHeight
  const ctx = out.getContext("2d")
  if (!ctx) return null

  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, totalHeight)

  let y = 0
  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i]
    const x = Math.floor((width - canvas.width) / 2)
    ctx.drawImage(canvas, x, y)
    y += canvas.height
    if (i < canvases.length - 1) y += gap
  }

  return out
}

/** html2canvas onclone：移除不兼容样式表并内联计算样式 */
export function prepareHtml2CanvasClone(
  clonedDoc: Document,
  sourceRoot: HTMLElement,
  clonedRoot: HTMLElement,
): void {
  stripUnsupportedStylesheets(clonedDoc)
  inlineExportComputedStyles(sourceRoot, clonedRoot)
}
