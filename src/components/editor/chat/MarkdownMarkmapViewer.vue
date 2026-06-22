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
      maxWidth: 420,
      nodeMinHeight: 20,
      paddingX: 16,
      spacingHorizontal: 88,
      spacingVertical: 18,
    })
  }
  markmap.setData(root)
  void nextTick(() => markmap?.fit())
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
    resizeObserver = new ResizeObserver(() => markmap?.fit())
    resizeObserver.observe(svg)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
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
  fill: #f7fbf7;
  stroke: #78a886;
  stroke-width: 2px;
}

.markdown-markmap-viewer__svg .markmap-node > text,
.markdown-markmap-viewer__svg .markmap-node > foreignObject {
  color: #27332b;
  fill: #27332b;
  font-size: 14px;
  font-weight: 600;
}

.markdown-markmap-viewer__svg .markmap-node > foreignObject > div {
  border: 1px solid rgba(120, 168, 134, 0.45);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(39, 51, 43, 0.08);
  padding: 6px 10px;
  line-height: 1.55;
}
</style>
