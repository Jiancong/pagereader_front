<template>
  <div class="markdown-markmap-viewer">
    <svg ref="svgRef" class="markdown-markmap-viewer__svg" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import { Markmap } from "markmap-view"
import { markdownFragmentToChatHtml } from "../../../utils/chatMarkdownPipeline"

type MarkmapTreeNode = {
  content: string
  children: MarkmapTreeNode[]
  payload?: Record<string, unknown>
}

const props = defineProps<{
  markdown: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)
let markmap: Markmap | null = null
let resizeObserver: ResizeObserver | null = null
let toggleClickHandler: ((event: Event) => void) | null = null
let nodeSelectHandler: ((event: Event) => void) | null = null
let nodeDblClickHandler: ((event: Event) => void) | null = null
let nodeHoverHandler: ((event: Event) => void) | null = null
let nodeHoverLeaveHandler: (() => void) | null = null
let selectedNodePath: string | null = null
let hoveredNodePath: string | null = null

const EXPAND_BTN_SIZE = 16
const EXPAND_HIT_SIZE = 28
const HOVER_GLOW_PAD = 12
const NODE_FOCUS_WIDTH_PADDING = 24

type MarkmapNodeRect = {
  x: number
  y: number
  width: number
  height: number
}

type MarkmapNodeDatum = {
  state?: {
    path?: string
    rect?: MarkmapNodeRect
  }
}

type MarkmapHighlightNode = NonNullable<Parameters<Markmap["setHighlight"]>[0]>

type MarkdownHeading = {
  level: number
  lineIndex: number
  text: string
}

function getMarkmapNodeFromTarget(target: Element) {
  const nodeG = target.closest(".markmap-node")
  if (!(nodeG instanceof SVGGElement)) return null
  const data = (nodeG as SVGGElement & { __data__?: MarkmapNodeDatum }).__data__
  const path = nodeG.getAttribute("data-path") ?? data?.state?.path ?? null
  if (!path) return null
  return { nodeG, data, path }
}

function applyNodeSelection() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((nodeG) => {
    const path = nodeG.getAttribute("data-path")
    nodeG.classList.toggle("markmap-node--selected", path === selectedNodePath)
  })

  if (!markmap) return

  if (!selectedNodePath) {
    void markmap.setHighlight(undefined)
    return
  }

  const selected = svg.querySelector(`.markmap-node[data-path="${selectedNodePath}"]`)
  const data = selected && (selected as SVGGElement & { __data__?: MarkmapNodeDatum }).__data__
  void markmap.setHighlight((data as Parameters<Markmap["setHighlight"]>[0]) ?? undefined)
}

function createZoomTransform(scale: number, x: number, y: number) {
  return {
    k: scale,
    x,
    y,
    invert: ([px, py]: [number, number]) =>
      [(px - x) / scale, (py - y) / scale] as [number, number],
  }
}

function getNodeFocusRect(nodeG: SVGGElement, layoutRect: MarkmapNodeRect): MarkmapNodeRect {
  const card = nodeG.querySelector(".markmap-node-card")
  if (!(card instanceof HTMLElement) || !markmap) return layoutRect

  const paddingX = markmap.options.paddingX
  const cardWidth = Math.max(card.scrollWidth, card.offsetWidth, 1)
  const cardHeight = Math.max(card.scrollHeight, card.offsetHeight, 1)

  return {
    x: layoutRect.x,
    y: layoutRect.y,
    width: Math.max(layoutRect.width, cardWidth + paddingX * 2),
    height: Math.max(layoutRect.height, cardHeight),
  }
}

async function focusNodeToScreenWidth(nodePath: string) {
  if (!markmap || !svgRef.value) return

  const selectedEl = svgRef.value.querySelector(`.markmap-node[data-path="${nodePath}"]`)
  if (!(selectedEl instanceof SVGGElement)) return

  const datum = (selectedEl as SVGGElement & { __data__?: MarkmapHighlightNode }).__data__
  const node = datum ? markmap.findElement(datum)?.data : undefined
  const layoutRect = node?.state?.rect
  if (!layoutRect?.width || !layoutRect?.height) return

  const rect = getNodeFocusRect(selectedEl, layoutRect)
  const svgNode = markmap.svg.node()
  if (!svgNode) return

  const { width: viewportWidth, height: viewportHeight } = svgNode.getBoundingClientRect()
  const innerWidth = Math.max(viewportWidth - NODE_FOCUS_WIDTH_PADDING * 2, 1)
  const scale = innerWidth / rect.width
  const x = (viewportWidth - rect.width * scale) / 2 - rect.x * scale
  const y = (viewportHeight - rect.height * scale) / 2 - rect.y * scale
  const transform = createZoomTransform(scale, x, y)

  await markmap
    .transition(markmap.svg)
    .call(markmap.zoom.transform, transform as Parameters<typeof markmap.zoom.transform>[1])
    .end()
    .catch(() => undefined)
}

function scheduleNodeSelection() {
  void nextTick(() => {
    requestAnimationFrame(applyNodeSelection)
  })
}

async function selectAndFocusNode(nodePath: string) {
  if (!markmap || !svgRef.value) return

  selectedNodePath = nodePath

  svgRef.value.querySelectorAll<SVGGElement>(".markmap-node").forEach((nodeG) => {
    const path = nodeG.getAttribute("data-path")
    nodeG.classList.toggle("markmap-node--selected", path === nodePath)
  })

  const selectedEl = svgRef.value.querySelector(`.markmap-node[data-path="${nodePath}"]`)
  const datum =
    selectedEl && (selectedEl as SVGGElement & { __data__?: MarkmapHighlightNode }).__data__

  await markmap.setHighlight(
    (datum as Parameters<Markmap["setHighlight"]>[0]) ?? undefined,
  )
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  await focusNodeToScreenWidth(nodePath)
}

function updateHoverGlow() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((nodeG) => {
    const isHover = nodeG.classList.contains("markmap-node--hover")
    const fo = nodeG.querySelector("foreignObject")
    let glow = nodeG.querySelector<SVGRectElement>(".markmap-hover-glow")

    if (!isHover || !fo) {
      glow?.remove()
      return
    }

    const x = Number(fo.getAttribute("x") ?? 18)
    const y = Number(fo.getAttribute("y") ?? 0)
    const w = Number(fo.getAttribute("width") ?? 0)
    const h = Number(fo.getAttribute("height") ?? 0)

    if (!glow) {
      glow = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      glow.setAttribute("class", "markmap-hover-glow")
      glow.setAttribute("pointer-events", "none")
      nodeG.insertBefore(glow, fo)
    }

    glow.setAttribute("x", String(x - HOVER_GLOW_PAD))
    glow.setAttribute("y", String(y - HOVER_GLOW_PAD))
    glow.setAttribute("width", String(w + HOVER_GLOW_PAD * 2))
    glow.setAttribute("height", String(h + HOVER_GLOW_PAD * 2))
    glow.setAttribute("rx", "14")
    glow.setAttribute("ry", "14")
  })
}

function applyNodeHover() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((nodeG) => {
    const path = nodeG.getAttribute("data-path")
    nodeG.classList.toggle("markmap-node--hover", path === hoveredNodePath)
  })
  updateHoverGlow()
}

function scheduleNodeHover() {
  void nextTick(() => {
    requestAnimationFrame(applyNodeHover)
  })
}

function collectMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = []
  const lines = markdown.split(/\r?\n/)
  let fenceChar: "`" | "~" | null = null

  lines.forEach((line, lineIndex) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const nextFenceChar = fenceMatch[1][0] as "`" | "~"
      fenceChar = fenceChar === nextFenceChar ? null : fenceChar ?? nextFenceChar
      return
    }
    if (fenceChar) return

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (!headingMatch) return

    headings.push({
      level: headingMatch[1].length,
      lineIndex,
      text: headingMatch[2].trim(),
    })
  })

  return headings
}

function pickChapterHeadingLevel(headings: MarkdownHeading[]) {
  const counts = Array.from({ length: 7 }, () => 0)
  headings.forEach((heading) => {
    counts[heading.level] += 1
  })

  if (counts[2] > 0 && counts[1] <= 1) return 2
  for (let level = 1; level <= 6; level += 1) {
    if (counts[level] > 1) return level
  }
  const nestedHeading = headings.find((heading) => heading.level > 1)
  return nestedHeading?.level ?? headings[0]?.level ?? 1
}

function wrapMarkdownSectionBody(markdown: string) {
  const trimmed = markdown.trim()
  if (!trimmed) return ""

  return `<div class="markmap-node-card"><div class="markdown-body markmap-node-body">${markdownFragmentToChatHtml(trimmed)}</div></div>`
}

function buildGroupedMarkdownTree(markdown: string): MarkmapTreeNode {
  const normalizedMarkdown = markdown.replace(/\r\n/g, "\n").trim()
  const headings = collectMarkdownHeadings(normalizedMarkdown)
  if (!headings.length) {
    return {
      content: wrapMarkdownSectionBody(normalizedMarkdown),
      children: [],
    }
  }

  const lines = normalizedMarkdown.split("\n")
  const chapterLevel = pickChapterHeadingLevel(headings)
  const chapterHeadings = headings.filter((heading) => heading.level === chapterLevel)
  const firstChapter = chapterHeadings[0]

  if (!firstChapter || chapterHeadings.length <= 1) {
    return {
      content: wrapMarkdownSectionBody(normalizedMarkdown),
      children: [],
    }
  }

  const rootMarkdown =
    chapterLevel > 1 ? lines.slice(0, firstChapter.lineIndex).join("\n").trim() : ""
  const rootTitle = headings.find((heading) => heading.level === 1)?.text ?? "Markdown"
  const children = chapterHeadings.map((heading, index) => {
    const nextHeading = chapterHeadings[index + 1]
    const sectionMarkdown = lines
      .slice(heading.lineIndex, nextHeading?.lineIndex ?? lines.length)
      .join("\n")
      .trim()

    return {
      content: wrapMarkdownSectionBody(sectionMarkdown),
      children: [],
    }
  })

  return {
    content: wrapMarkdownSectionBody(rootMarkdown || `# ${rootTitle}`),
    children,
  }
}

function getToggleCircleFromTarget(target: Element) {
  const directCircle = target.closest(".markmap-node circle")
  if (directCircle instanceof SVGCircleElement) return directCircle

  const hitbox = target.closest(".markmap-expand-hitbox")
  const node = hitbox?.closest(".markmap-node")
  const circle = node?.querySelector("circle")
  return circle instanceof SVGCircleElement ? circle : null
}

function forwardClickToToggleCircle(sourceEvent: Event, circle: SVGCircleElement) {
  if (!(sourceEvent.target instanceof Element)) return
  if (sourceEvent.target.closest(".markmap-node circle")) return

  sourceEvent.preventDefault()
  sourceEvent.stopImmediatePropagation()

  const mouseEvent =
    sourceEvent instanceof MouseEvent
      ? new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: sourceEvent.clientX,
          clientY: sourceEvent.clientY,
          ctrlKey: sourceEvent.ctrlKey,
          metaKey: sourceEvent.metaKey,
          shiftKey: sourceEvent.shiftKey,
          altKey: sourceEvent.altKey,
        })
      : new MouseEvent("click", { bubbles: true, cancelable: true, view: window })

  circle.dispatchEvent(mouseEvent)
}

function updateToggleLabels() {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGElement>(".markmap-node").forEach((node) => {
    const circle = node.querySelector("circle")
    if (!circle) {
      node.querySelector(".markmap-toggle-label")?.remove()
      node.querySelector(".markmap-expand-btn")?.remove()
      node.querySelector(".markmap-expand-hitbox")?.remove()
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
    }

    btn.setAttribute("x", String(cx - EXPAND_BTN_SIZE / 2))
    btn.setAttribute("y", String(cy - EXPAND_BTN_SIZE / 2))
    btn.setAttribute("width", String(EXPAND_BTN_SIZE))
    btn.setAttribute("height", String(EXPAND_BTN_SIZE))
    btn.setAttribute("rx", "3")
    btn.classList.toggle("markmap-expand-btn--fold", isFold)

    let hitbox = node.querySelector<SVGRectElement>(".markmap-expand-hitbox")
    if (!hitbox) {
      hitbox = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      hitbox.setAttribute("class", "markmap-expand-hitbox")
      hitbox.setAttribute("pointer-events", "all")
    }

    hitbox.setAttribute("x", String(cx - EXPAND_HIT_SIZE / 2))
    hitbox.setAttribute("y", String(cy - EXPAND_HIT_SIZE / 2))
    hitbox.setAttribute("width", String(EXPAND_HIT_SIZE))
    hitbox.setAttribute("height", String(EXPAND_HIT_SIZE))
    hitbox.setAttribute("rx", "6")

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

    node.appendChild(btn)
    node.appendChild(hitbox)
    node.appendChild(label)
  })
}

function scheduleToggleLabels() {
  void nextTick(() => {
    requestAnimationFrame(() => {
      updateToggleLabels()
      applyNodeSelection()
      applyNodeHover()
    })
  })
}

function renderMarkmap() {
  const svg = svgRef.value
  const markdown = props.markdown.trim()
  if (!svg || !markdown) return

  const groupedRoot = buildGroupedMarkdownTree(markdown)
  if (!markmap) {
    markmap = Markmap.create(svg, {
      autoFit: true,
      color: () => "rgba(15, 22, 30, 0.18)",
      duration: 180,
      embedGlobalCSS: true,
      // 默认只展示前 2 层（根 + 一级分支），更深层级点击 + 展开
      initialExpandLevel: 2,
      maxWidth: 720,
      nodeMinHeight: 24,
      paddingX: 18,
      spacingHorizontal: 128,
      spacingVertical: 28,
    })
    markmap.svg.on("dblclick.zoom", null)

    toggleClickHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const toggleCircle = getToggleCircleFromTarget(target)
      if (!toggleCircle) return
      forwardClickToToggleCircle(event, toggleCircle)
      scheduleToggleLabels()
    }
    svg.addEventListener("click", toggleClickHandler)

    nodeSelectHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(".markmap-node circle, .markmap-expand-hitbox")) return

      const hit = getMarkmapNodeFromTarget(target)
      if (hit) {
        selectedNodePath = hit.path
        scheduleNodeSelection()
        return
      }

      if (target.closest(".markmap-node")) return

      selectedNodePath = null
      scheduleNodeSelection()
    }
    svg.addEventListener("click", nodeSelectHandler)

    nodeDblClickHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(".markmap-node circle, .markmap-expand-hitbox")) return

      const hit = getMarkmapNodeFromTarget(target)
      if (!hit) return

      event.preventDefault()
      event.stopImmediatePropagation()
      void selectAndFocusNode(hit.path)
    }
    // markmap 节点内容在 foreignObject 内会 stopPropagation，需用捕获阶段监听双击
    svg.addEventListener("dblclick", nodeDblClickHandler, true)

    nodeHoverHandler = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const hit = getMarkmapNodeFromTarget(target)
      const nextPath = hit?.path ?? null
      if (nextPath === hoveredNodePath) return
      hoveredNodePath = nextPath
      scheduleNodeHover()
    }
    nodeHoverLeaveHandler = () => {
      if (!hoveredNodePath) return
      hoveredNodePath = null
      scheduleNodeHover()
    }
    svg.addEventListener("mouseover", nodeHoverHandler)
    svg.addEventListener("mouseleave", nodeHoverLeaveHandler)
  }

  markmap.setData(groupedRoot)
  void nextTick(async () => {
    markmap?.fit()
    scheduleToggleLabels()
  })
}

watch(
  () => props.markdown,
  () => {
    selectedNodePath = null
    hoveredNodePath = null
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
  if (svgRef.value && nodeSelectHandler) {
    svgRef.value.removeEventListener("click", nodeSelectHandler)
  }
  if (svgRef.value && nodeDblClickHandler) {
    svgRef.value.removeEventListener("dblclick", nodeDblClickHandler, true)
  }
  if (svgRef.value && nodeHoverHandler) {
    svgRef.value.removeEventListener("mouseover", nodeHoverHandler)
  }
  if (svgRef.value && nodeHoverLeaveHandler) {
    svgRef.value.removeEventListener("mouseleave", nodeHoverLeaveHandler)
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

.markdown-markmap-viewer__svg .markmap-expand-hitbox {
  fill: transparent;
  cursor: pointer;
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
  cursor: pointer;
}

.markdown-markmap-viewer__svg .markmap-highlight rect {
  fill: rgba(167, 139, 250, 0.12);
}

.markdown-markmap-viewer__svg .markmap-node--selected .markmap-node-card {
  border-color: rgba(167, 139, 250, 0.72);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 0 0 4px rgba(167, 139, 250, 0.14),
    0 10px 24px rgba(167, 139, 250, 0.12);
}

.markdown-markmap-viewer__svg .markmap-node--selected > line {
  stroke: rgba(167, 139, 250, 0.62) !important;
  stroke-width: 2px !important;
}

.markdown-markmap-viewer__svg .markmap-foreign > div {
  width: var(--markmap-max-width);
  text-align: left;
  overflow: visible;
}

.markdown-markmap-viewer__svg .markmap-foreign > div > div {
  display: inline-block !important;
  max-width: 100%;
  overflow: visible;
}

.markdown-markmap-viewer__svg .markmap-node-card {
  box-sizing: border-box;
  border: 1px solid rgba(15, 22, 30, 0.08);
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
  padding: 12px 16px;
  color: #0f161e;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
  transform-origin: left center;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.markdown-markmap-viewer__svg .markmap-hover-glow {
  fill: rgba(167, 139, 250, 0.06);
  stroke: rgba(167, 139, 250, 0.48);
  stroke-width: 1.5;
  animation: markmap-glow-breathe 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(167, 139, 250, 0.28));
}

.markdown-markmap-viewer__svg .markmap-node--hover .markmap-node-card {
  border-color: rgba(167, 139, 250, 0.82);
  animation: markmap-node-breathe 2.4s ease-in-out infinite;
}

.markdown-markmap-viewer__svg .markmap-node--selected.markmap-node--hover .markmap-node-card {
  animation: markmap-node-breathe-selected 2.4s ease-in-out infinite;
}

.markdown-markmap-viewer__svg .markmap-node--hover > line {
  stroke: rgba(167, 139, 250, 0.72) !important;
  stroke-width: 2px !important;
}

.markdown-markmap-viewer__svg .markmap-node--hover .markmap-expand-btn {
  animation: markmap-expand-breathe 2.4s ease-in-out infinite;
}

@keyframes markmap-glow-breathe {
  0%,
  100% {
    fill: rgba(167, 139, 250, 0.04);
    stroke: rgba(167, 139, 250, 0.38);
    stroke-width: 1.5;
    opacity: 0.82;
    filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.22));
  }

  50% {
    fill: rgba(167, 139, 250, 0.14);
    stroke: rgba(139, 92, 246, 0.82);
    stroke-width: 2.25;
    opacity: 1;
    filter: drop-shadow(0 0 22px rgba(167, 139, 250, 0.48));
  }
}

@keyframes markmap-node-breathe {
  0%,
  100% {
    box-shadow:
      0 0 0 0 rgba(167, 139, 250, 0),
      0 0 12px 0 rgba(167, 139, 250, 0.08);
  }

  50% {
    box-shadow:
      0 0 0 5px rgba(167, 139, 250, 0.16),
      0 0 24px 4px rgba(167, 139, 250, 0.28);
  }
}

@keyframes markmap-node-breathe-selected {
  0%,
  100% {
    box-shadow:
      0 0 0 4px rgba(167, 139, 250, 0.14),
      0 10px 24px rgba(167, 139, 250, 0.12);
  }

  50% {
    box-shadow:
      0 0 0 8px rgba(167, 139, 250, 0.22),
      0 16px 36px rgba(167, 139, 250, 0.22);
  }
}

@keyframes markmap-expand-breathe {
  0%,
  100% {
    stroke: rgba(167, 139, 250, 0.38);
    fill: #fff;
  }

  50% {
    stroke: rgba(139, 92, 246, 0.82);
    fill: rgba(245, 243, 255, 1);
  }
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
