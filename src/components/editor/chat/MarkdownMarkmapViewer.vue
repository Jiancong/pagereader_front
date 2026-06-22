<template>
  <div class="markdown-markmap-viewer">
    <svg ref="svgRef" class="markdown-markmap-viewer__svg" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import { Transformer } from "markmap-lib"
import { Markmap } from "markmap-view"

type MarkmapTreeNode = {
  content: string
  children: MarkmapTreeNode[]
  payload?: Record<string, unknown>
}

const props = defineProps<{
  markdown: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const transformer = new Transformer()
let markmap: Markmap | null = null
let resizeObserver: ResizeObserver | null = null
let toggleClickHandler: ((event: Event) => void) | null = null

const EXPAND_BTN_SIZE = 16

function wrapNodeBody(content: string, depth: number) {
  const trimmed = content.trim()
  if (!trimmed) return ""

  const hasBlockHtml = /<(h[1-6]|p|ul|ol|div|table|pre|blockquote)\b/i.test(trimmed)
  let body = trimmed
  if (!hasBlockHtml) {
    const tag = depth <= 1 ? "h1" : depth === 2 ? "h2" : "p"
    body = `<${tag} class="markmap-node-lead">${trimmed}</${tag}>`
  }

  return `<div class="markmap-node-card"><div class="markdown-body markmap-node-body">${body}</div></div>`
}

function wrapTreeForCardStyle(node: MarkmapTreeNode, depth = 0): MarkmapTreeNode {
  return {
    ...node,
    content: wrapNodeBody(node.content, depth),
    children: node.children.map((child) => wrapTreeForCardStyle(child, depth + 1)),
  }
}

function updateToggleLabels() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((node) => {
    const circle = node.querySelector("circle")
    if (!circle) {
      node.querySelector(".markmap-toggle-label")?.remove()
      node.querySelector(".markmap-expand-btn")?.remove()
      return
    }

    const isFold = node.classList.contains("markmap-fold")
    const cx = Number(circle.getAttribute("cx") ?? 0)
    const cy = Number(circle.getAttribute("cy") ?? 0)

    let btn = node.querySelector<SVGRectElement>(".markmap-expand-btn")
    if (!btn) {
      btn = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      btn.setAttribute("class", "markmap-expand-btn")
      btn.setAttribute("pointer-events", "none")
      circle.insertAdjacentElement("afterend", btn)
    }

    btn.setAttribute("x", String(cx - EXPAND_BTN_SIZE / 2))
    btn.setAttribute("y", String(cy - EXPAND_BTN_SIZE / 2))
    btn.setAttribute("width", String(EXPAND_BTN_SIZE))
    btn.setAttribute("height", String(EXPAND_BTN_SIZE))
    btn.setAttribute("rx", "3")
    btn.classList.toggle("markmap-expand-btn--fold", isFold)

    circle.setAttribute("r", String(EXPAND_BTN_SIZE / 2 + 2))
    circle.setAttribute("fill", "transparent")
    circle.setAttribute("stroke", "transparent")
    circle.setAttribute("stroke-width", "0")

    let label = node.querySelector<SVGTextElement>(".markmap-toggle-label")
    if (!label) {
      label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("class", "markmap-toggle-label")
      label.setAttribute("text-anchor", "middle")
      label.setAttribute("dominant-baseline", "central")
      label.setAttribute("pointer-events", "none")
      node.appendChild(label)
    }

    label.textContent = isFold ? "+" : "−"
    label.setAttribute("x", String(cx))
    label.setAttribute("y", String(cy))
    label.classList.toggle("markmap-toggle-label--fold", isFold)
  })
}

function scheduleToggleLabels() {
  void nextTick(() => {
    requestAnimationFrame(updateToggleLabels)
  })
}

function renderMarkmap() {
  const svg = svgRef.value
  const markdown = props.markdown.trim()
  if (!svg || !markdown) return

  const { root } = transformer.transform(markdown)
  const styledRoot = wrapTreeForCardStyle(root as MarkmapTreeNode)
  if (!markmap) {
    markmap = Markmap.create(svg, {
      autoFit: true,
      color: () => "rgba(15, 22, 30, 0.18)",
      duration: 180,
      embedGlobalCSS: true,
      // 默认只展示前 2 层（根 + 一级分支），更深层级点击 + 展开
      initialExpandLevel: 2,
      maxWidth: 640,
      nodeMinHeight: 24,
      paddingX: 18,
      spacingHorizontal: 108,
      spacingVertical: 28,
    })

    toggleClickHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(".markmap-node circle")) scheduleToggleLabels()
    }
    svg.addEventListener("click", toggleClickHandler)
  }

  markmap.setData(styledRoot)
  void nextTick(async () => {
    markmap?.fit()
    scheduleToggleLabels()
  })
}

watch(
  () => props.markdown,
  () => {
    void nextTick(renderMarkmap)
  },
  { immediate: true },
)

watch(
  svgRef,
  (svg) => {
    resizeObserver?.disconnect()
    if (!svg) return
    void nextTick(renderMarkmap)
    resizeObserver = new ResizeObserver(() => {
      markmap?.fit()
      scheduleToggleLabels()
    })
    resizeObserver.observe(svg)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (svgRef.value && toggleClickHandler) {
    svgRef.value.removeEventListener("click", toggleClickHandler)
  }
  markmap?.destroy()
})
</script>

<style lang="scss">
.markdown-markmap-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 560px;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
  background: #f3f4f6;
}

.markdown-markmap-viewer__svg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  cursor: grab;
  font-family:
    Inter,
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;

  --markmap-circle-open-bg: #fff;
  --markmap-text-color: #0f161e;
  --markmap-a-color: #2563eb;
  --markmap-a-hover-color: #1d4ed8;
  --markmap-font: 400 14px/1.55 Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.markdown-markmap-viewer__svg:active {
  cursor: grabbing;
}

.markdown-markmap-viewer__svg .markmap-link {
  stroke: rgba(15, 22, 30, 0.14);
  stroke-width: 1.5px;
}

.markdown-markmap-viewer__svg .markmap-node > circle {
  cursor: pointer;
}

.markdown-markmap-viewer__svg .markmap-expand-btn {
  fill: #fff;
  stroke: rgba(15, 22, 30, 0.14);
  stroke-width: 1px;
}

.markdown-markmap-viewer__svg .markmap-expand-btn--fold {
  fill: rgba(15, 22, 30, 0.04);
}

.markdown-markmap-viewer__svg .markmap-toggle-label {
  fill: rgba(15, 22, 30, 0.56);
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
  user-select: none;
}

.markdown-markmap-viewer__svg .markmap-toggle-label--fold {
  fill: rgba(15, 22, 30, 0.72);
}

.markdown-markmap-viewer__svg .markmap-foreign {
  color: #0f161e;
  overflow: visible;
}

.markdown-markmap-viewer__svg .markmap-foreign > div > div {
  display: block !important;
  width: 100%;
}

.markdown-markmap-viewer__svg .markmap-node-card {
  box-sizing: border-box;
  border: 1px solid rgba(15, 22, 30, 0.08);
  border-radius: 6px;
  background: #fff;
  box-shadow: none;
  padding: 12px 16px;
  color: #0f161e;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}

.markdown-markmap-viewer__svg .markmap-node-body {
  color: inherit;
  font-size: 14px;
}

.markdown-markmap-viewer__svg .markmap-node-body h1,
.markdown-markmap-viewer__svg .markmap-node-body h2,
.markdown-markmap-viewer__svg .markmap-node-body h3,
.markdown-markmap-viewer__svg .markmap-node-body .markmap-node-lead {
  margin: 0;
  color: #0f161e;
  font-weight: 700;
  line-height: 1.35;
}

.markdown-markmap-viewer__svg .markmap-node-body h1,
.markdown-markmap-viewer__svg .markmap-node-body h1.markmap-node-lead {
  font-size: 18px;
}

.markdown-markmap-viewer__svg .markmap-node-body h2,
.markdown-markmap-viewer__svg .markmap-node-body h2.markmap-node-lead {
  font-size: 16px;
}

.markdown-markmap-viewer__svg .markmap-node-body h3 {
  font-size: 15px;
}

.markdown-markmap-viewer__svg .markmap-node-body p {
  margin: 0.55em 0;
}

.markdown-markmap-viewer__svg .markmap-node-body p:first-child,
.markdown-markmap-viewer__svg .markmap-node-body h1:first-child,
.markdown-markmap-viewer__svg .markmap-node-body h2:first-child,
.markdown-markmap-viewer__svg .markmap-node-body h3:first-child {
  margin-top: 0;
}

.markdown-markmap-viewer__svg .markmap-node-body p:last-child,
.markdown-markmap-viewer__svg .markmap-node-body ul:last-child,
.markdown-markmap-viewer__svg .markmap-node-body ol:last-child {
  margin-bottom: 0;
}

.markdown-markmap-viewer__svg .markmap-node-body ul,
.markdown-markmap-viewer__svg .markmap-node-body ol {
  margin: 0.55em 0;
  padding-left: 1.35em;
}

.markdown-markmap-viewer__svg .markmap-node-body li {
  margin: 0.28em 0;
}

.markdown-markmap-viewer__svg .markmap-node-body li::marker {
  color: rgba(15, 22, 30, 0.42);
}

.markdown-markmap-viewer__svg .markmap-node-body strong {
  font-weight: 700;
  color: #0f161e;
}

.markdown-markmap-viewer__svg .markmap-node-body em {
  font-style: italic;
}

.markdown-markmap-viewer__svg .markmap-node-body a {
  color: #2563eb;
  text-decoration: none;
}

.markdown-markmap-viewer__svg .markmap-node-body a:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.markdown-markmap-viewer__svg .markmap-node-body code {
  padding: 0.12em 0.35em;
  border-radius: 4px;
  background: rgba(15, 22, 30, 0.05);
  color: #334155;
  font-size: 0.92em;
}
</style>
