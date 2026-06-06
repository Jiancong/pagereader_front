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
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
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

function stripUnsupportedStylesheets(clonedDoc: Document): void {
  clonedDoc.querySelectorAll("style").forEach((node) => {
    if (node.id === "ppt-export-styles") return
    const css = node.textContent ?? ""
    if (UNSUPPORTED_COLOR_RE.test(css)) node.remove()
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

/** html2canvas onclone：移除不兼容样式表并内联计算样式 */
export function prepareHtml2CanvasClone(
  clonedDoc: Document,
  sourceRoot: HTMLElement,
  clonedRoot: HTMLElement,
): void {
  stripUnsupportedStylesheets(clonedDoc)
  inlineExportComputedStyles(sourceRoot, clonedRoot)
}
