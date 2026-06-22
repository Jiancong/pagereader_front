<template>
  <div class="markdown-markmap-viewer">
    <svg ref="svgRef" class="markdown-markmap-viewer__svg" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import { Transformer } from "markmap-lib"
import { Markmap } from "markmap-view"

const props = defineProps<{
  markdown: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const transformer = new Transformer()
let markmap: Markmap | null = null
let resizeObserver: ResizeObserver | null = null
let toggleClickHandler: ((event: Event) => void) | null = null

function updateToggleLabels() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((node) => {
    const circle = node.querySelector("circle")
    if (!circle) {
      node.querySelector(".markmap-toggle-label")?.remove()
      return
    }

    const isFold = node.classList.contains("markmap-fold")
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
    const cx = circle.getAttribute("cx") ?? "0"
    const cy = circle.getAttribute("cy") ?? "0"
    label.setAttribute("x", cx)
    label.setAttribute("y", cy)
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
  if (!markmap) {
    markmap = Markmap.create(svg, {
      autoFit: true,
      color: () => "#78a886",
      duration: 180,
      // 默认只展示前 2 层（根 + 一级分支），更深层级点击 + 展开
      initialExpandLevel: 2,
      maxWidth: 640,
      nodeMinHeight: 20,
      paddingX: 18,
      spacingHorizontal: 96,
      spacingVertical: 22,
    })

    toggleClickHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(".markmap-node circle")) scheduleToggleLabels()
    }
    svg.addEventListener("click", toggleClickHandler)
  }

  markmap.setData(root)
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
  background:
    radial-gradient(circle at 18% 26%, rgba(120, 168, 134, 0.12), transparent 24%),
    linear-gradient(180deg, #f7f8f6 0%, #eef1ee 100%);
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
}

.markdown-markmap-viewer__svg:active {
  cursor: grabbing;
}

.markdown-markmap-viewer__svg .markmap-link {
  stroke: rgba(120, 168, 134, 0.46);
  stroke-width: 2px;
}

.markdown-markmap-viewer__svg .markmap-node > circle {
  cursor: pointer;
  fill: #f7fbf7;
  stroke: #78a886;
  stroke-width: 2px;
}

.markdown-markmap-viewer__svg .markmap-node.markmap-fold > circle {
  fill: #78a886;
}

.markdown-markmap-viewer__svg .markmap-toggle-label {
  fill: #78a886;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
  user-select: none;
}

.markdown-markmap-viewer__svg .markmap-node.markmap-fold > .markmap-toggle-label {
  fill: #fff;
}

.markdown-markmap-viewer__svg .markmap-node > text,
.markdown-markmap-viewer__svg .markmap-node > foreignObject {
  color: #27332b;
  fill: #27332b;
  font-size: 14px;
  font-weight: 500;
}

.markdown-markmap-viewer__svg .markmap-node > foreignObject > div {
  border: 1px solid rgba(120, 168, 134, 0.45);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(39, 51, 43, 0.08);
  padding: 10px 12px;
  line-height: 1.55;
  white-space: normal;
  word-break: break-word;
}

.markdown-markmap-viewer__svg .markmap-foreign p {
  margin: 0.35em 0;
}

.markdown-markmap-viewer__svg .markmap-foreign p:first-child {
  margin-top: 0;
}

.markdown-markmap-viewer__svg .markmap-foreign p:last-child {
  margin-bottom: 0;
}

.markdown-markmap-viewer__svg .markmap-foreign ul,
.markdown-markmap-viewer__svg .markmap-foreign ol {
  margin: 0.35em 0;
  padding-left: 1.25em;
}

.markdown-markmap-viewer__svg .markmap-foreign li {
  margin: 0.2em 0;
}

.markdown-markmap-viewer__svg .markmap-foreign strong {
  font-weight: 700;
}

.markdown-markmap-viewer__svg .markmap-foreign em {
  font-style: italic;
}
</style>
