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

/** 默认 WebP 质量（未走体积阶梯时使用） */
export const PPT_EXPORT_WEBP_QUALITY = 0.92
/** 回退 JPEG 质量 */
export const PPT_EXPORT_JPEG_QUALITY = 0.92
/** 偏好的导出体积 ≈ 无损 PNG 的 1/2（仅用于选质量，不截断导出） */
export const PPT_EXPORT_TARGET_SIZE_RATIO = 0.5
/** @deprecated 兼容旧引用 */
export const PPT_EXPORT_IMAGE_QUALITY = PPT_EXPORT_WEBP_QUALITY
/** Chrome / Safari 常见 canvas 单边上限 */
export const PPT_EXPORT_MAX_CANVAS_DIMENSION = 32767
/** Chrome canvas 像素面积上限 */
export const PPT_EXPORT_MAX_CANVAS_AREA = 268_435_456

export type PptExportImageMime = "image/webp" | "image/jpeg"

export type PptExportImageResult = {
  blob: Blob
  mimeType: PptExportImageMime
}

let cachedExportFormat: { mimeType: PptExportImageMime; quality: number } | null = null

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mimeType: PptExportImageMime,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

/** 编码失败时常返回极小 blob；按像素面积估算最小合理体积 */
function isExportBlobTooSmall(blob: Blob, canvas: HTMLCanvasElement): boolean {
  const pixels = canvas.width * canvas.height
  if (pixels <= 4096) return blob.size < 64
  const minBytes = Math.max(2048, Math.floor(pixels / 80))
  return blob.size < minBytes
}

/** 粗估 PNG 体积（避免每张 slide 真编码 PNG） */
function estimatePngBytes(canvas: HTMLCanvasElement): number {
  return Math.max(4096, Math.floor(canvas.width * canvas.height * 0.45))
}

function canvasFitsBrowserLimits(width: number, height: number): boolean {
  return (
    width > 0 &&
    height > 0 &&
    width <= PPT_EXPORT_MAX_CANVAS_DIMENSION &&
    height <= PPT_EXPORT_MAX_CANVAS_DIMENSION &&
    width * height <= PPT_EXPORT_MAX_CANVAS_AREA
  )
}

function scaleCanvasByFactor(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  if (scale >= 1) return canvas
  const out = document.createElement("canvas")
  out.width = Math.max(1, Math.round(canvas.width * scale))
  out.height = Math.max(1, Math.round(canvas.height * scale))
  const ctx = out.getContext("2d")
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out
}

/** 仅在超出浏览器 canvas 硬限制时等比缩小，平时保持截图原始像素 */
export function scaleCanvasToFitBrowserLimits(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.width <= 0 || canvas.height <= 0) return canvas
  if (canvasFitsBrowserLimits(canvas.width, canvas.height)) return canvas

  let scale = 1
  if (canvas.width > PPT_EXPORT_MAX_CANVAS_DIMENSION) {
    scale = Math.min(scale, PPT_EXPORT_MAX_CANVAS_DIMENSION / canvas.width)
  }
  if (canvas.height > PPT_EXPORT_MAX_CANVAS_DIMENSION) {
    scale = Math.min(scale, PPT_EXPORT_MAX_CANVAS_DIMENSION / canvas.height)
  }
  const area = canvas.width * canvas.height
  if (area > PPT_EXPORT_MAX_CANVAS_AREA) {
    scale = Math.min(scale, Math.sqrt(PPT_EXPORT_MAX_CANVAS_AREA / area))
  }
  return scaleCanvasByFactor(canvas, scale)
}

/** @deprecated 使用 scaleCanvasToFitBrowserLimits */
export function fitCanvasToExportLimits(
  canvas: HTMLCanvasElement,
  _options?: {
    maxWidth?: number
    maxHeight?: number
    maxDimension?: number
  },
): HTMLCanvasElement {
  return scaleCanvasToFitBrowserLimits(canvas)
}

/** 质量阶梯（从高到低完整遍历，最后才选体积） */
const EXPORT_QUALITY_LADDER = [
  0.94, 0.92, 0.9, 0.88, 0.86, 0.84, 0.82, 0.8, 0.78, 0.75, 0.7, 0.65, 0.6, 0.5,
] as const

/**
 * 对已截好的 canvas 按指定格式编码：先保证能出图，再在可行质量中选最接近目标体积的。
 * 体积目标仅影响质量选择，不会提前中断截图/拼接流程。
 */
async function encodeForExportWithMime(
  canvas: HTMLCanvasElement,
  mimeType: PptExportImageMime,
): Promise<Blob | null> {
  const targetBytes = Math.max(
    8192,
    Math.floor(estimatePngBytes(canvas) * PPT_EXPORT_TARGET_SIZE_RATIO),
  )
  const valid: { quality: number; blob: Blob }[] = []

  for (const quality of EXPORT_QUALITY_LADDER) {
    const blob = await blobFromCanvas(canvas, mimeType, quality)
    if (blob && !isExportBlobTooSmall(blob, canvas)) {
      valid.push({ quality, blob })
    }
  }

  if (valid.length) {
    const underTarget = valid.find((entry) => entry.blob.size <= targetBytes * 1.2)
    return (underTarget ?? valid[0]).blob
  }

  const defaultQuality =
    mimeType === "image/webp" ? PPT_EXPORT_WEBP_QUALITY : PPT_EXPORT_JPEG_QUALITY
  return blobFromCanvas(canvas, mimeType, defaultQuality)
}

/** WebP 优先；编码不可用时回退 JPEG，均保证完整性 */
async function encodeImageForExport(canvas: HTMLCanvasElement): Promise<PptExportImageResult> {
  const webpBlob = await encodeForExportWithMime(canvas, "image/webp")
  if (webpBlob && !isExportBlobTooSmall(webpBlob, canvas)) {
    return { blob: webpBlob, mimeType: "image/webp" }
  }

  const jpegBlob = await encodeForExportWithMime(canvas, "image/jpeg")
  if (jpegBlob && !isExportBlobTooSmall(jpegBlob, canvas)) {
    return { blob: jpegBlob, mimeType: "image/jpeg" }
  }

  throw new Error("Image export encoding failed")
}

export async function resolvePptExportImageFormat(): Promise<{
  mimeType: PptExportImageMime
  quality: number
}> {
  if (cachedExportFormat) return cachedExportFormat

  const probe = document.createElement("canvas")
  probe.width = 64
  probe.height = 64
  const ctx = probe.getContext("2d")
  ctx?.fillRect(0, 0, 64, 64)
  const webpBlob = await blobFromCanvas(probe, "image/webp", PPT_EXPORT_WEBP_QUALITY)
  const webpOk = !!webpBlob && !isExportBlobTooSmall(webpBlob, probe)
  cachedExportFormat = webpOk
    ? { mimeType: "image/webp", quality: PPT_EXPORT_WEBP_QUALITY }
    : { mimeType: "image/jpeg", quality: PPT_EXPORT_JPEG_QUALITY }
  return cachedExportFormat
}

export function pptExportImageExtension(mimeType: PptExportImageMime): string {
  return mimeType === "image/webp" ? "webp" : "jpg"
}

/** 导出压缩：保持截图分辨率；完整性优先，体积目标仅用于选质量 */
export async function canvasToExportBlob(
  canvas: HTMLCanvasElement,
  options?: {
    quality?: number
    mimeType?: PptExportImageMime
  },
): Promise<PptExportImageResult | null> {
  const fitted = scaleCanvasToFitBrowserLimits(canvas)
  if (fitted.width <= 0 || fitted.height <= 0) return null

  if (options?.mimeType && options.quality != null) {
    const direct = await blobFromCanvas(fitted, options.mimeType, options.quality)
    if (direct && !isExportBlobTooSmall(direct, fitted)) {
      cachedExportFormat = { mimeType: options.mimeType, quality: options.quality }
      return { blob: direct, mimeType: options.mimeType }
    }
  }

  const result = await encodeImageForExport(fitted)
  cachedExportFormat = { mimeType: result.mimeType, quality: PPT_EXPORT_WEBP_QUALITY }
  return result
}

/** 长图导出：仅在拼接后超出浏览器限制时统一缩小，避免双重缩放发糊 */
export function prepareSlideCanvasesForLongExport(
  canvases: HTMLCanvasElement[],
): HTMLCanvasElement[] {
  if (!canvases.length) return canvases

  const maxW = Math.max(...canvases.map((c) => c.width))
  const totalH = canvases.reduce((sum, c) => sum + c.height, 0)
  if (canvasFitsBrowserLimits(maxW, totalH)) return canvases

  let scale = 1
  if (maxW > PPT_EXPORT_MAX_CANVAS_DIMENSION) {
    scale = Math.min(scale, PPT_EXPORT_MAX_CANVAS_DIMENSION / maxW)
  }
  if (totalH > PPT_EXPORT_MAX_CANVAS_DIMENSION) {
    scale = Math.min(scale, PPT_EXPORT_MAX_CANVAS_DIMENSION / totalH)
  }
  if (maxW * totalH > PPT_EXPORT_MAX_CANVAS_AREA) {
    scale = Math.min(scale, Math.sqrt(PPT_EXPORT_MAX_CANVAS_AREA / (maxW * totalH)))
  }
  if (scale >= 1) return canvases

  return canvases.map((c) => scaleCanvasByFactor(c, scale))
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
