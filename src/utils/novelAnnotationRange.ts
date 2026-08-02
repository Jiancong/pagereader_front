// Novel 划线：DOM Range <-> 章节纯文本字符偏移的双向转换 + 高亮恢复
// @author hc @date 2026-07-23
//
// 关键不变量：annotation marks 不引入额外字符，因此文章 textContent 与
// 「去掉所有 mark 后」的纯文本一致。恢复高亮时先 unwrap 所有 mark，再按
// offset 区间重建，保证偏移与选区一致。

const ANNOTATION_MARK_SELECTOR = "mark.novel-annotation"
const ANNOTATION_DATA_ID = "data-annotation-id"

export interface CharOffsetRange {
  start: number
  end: number
  text: string
}

interface TextNodeMap {
  node: Text
  start: number
  length: number
}

interface PlainTextMap {
  text: string
  nodes: TextNodeMap[]
}

/** 收集 root 内所有 Text 节点（排除 script/style），记录累计字符偏移 */
function buildTextMap(root: Node): PlainTextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes: TextNodeMap[] = []
  let acc = 0
  let text = ""
  let current: Text | null
  while ((current = walker.nextNode() as Text | null)) {
    const value = current.data
    if (!value) continue
    nodes.push({ node: current, start: acc, length: value.length })
    text += value
    acc += value.length
  }
  return { text, nodes }
}

/** 在 text node 列表中定位全局字符偏移对应的 (node, localOffset) */
function locateBoundary(
  nodes: TextNodeMap[],
  offset: number,
): { node: Text; local: number } | null {
  if (!nodes.length) return null
  const last = nodes[nodes.length - 1]
  const max = last.start + last.length
  const o = Math.max(0, Math.min(offset, max))
  for (const m of nodes) {
    if (o <= m.start + m.length) {
      return { node: m.node, local: Math.max(0, o - m.start) }
    }
  }
  return { node: last.node, local: last.length }
}

/**
 * 把当前选区（必须在 root 内）转成章节纯文本的字符偏移区间。
 * 返回 null 表示选区无效或不在 root 内。
 */
export function selectionToCharOffset(
  selection: Selection,
  root: HTMLElement,
): CharOffsetRange | null {
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (range.collapsed) return null
  if (!root.contains(range.commonAncestorContainer)) return null

  const map = buildTextMap(root)
  return rangeToCharOffset(range, map)
}

/** 把任意 Range（必须在 root 内）转成字符偏移区间 */
export function rangeToCharOffset(
  range: Range,
  map: PlainTextMap,
): CharOffsetRange | null {
  const start = boundaryToOffset(range.startContainer, range.startOffset, map)
  const end = boundaryToOffset(range.endContainer, range.endOffset, map)
  if (start == null || end == null) return null
  if (end <= start) return null
  const text = map.text.slice(start, end)
  return { start, end, text }
}

function boundaryToOffset(
  container: Node,
  offset: number,
  map: PlainTextMap,
): number | null {
  // 文本节点：直接二分/线性查找
  if (container.nodeType === Node.TEXT_NODE) {
    const hit = map.nodes.find((m) => m.node === container)
    if (hit) return hit.start + Math.min(offset, hit.length)
    // 不在 map 内（如已被移除），失败
    return null
  }
  // 元素节点：offset 指向第 offset 个子节点；取该子树最接近的文本偏移
  const child = container.childNodes[offset]
  // 向前找第一个文本节点
  let probe: Node | null = child ?? container
  while (probe) {
    if (probe.nodeType === Node.TEXT_NODE) {
      const hit = map.nodes.find((m) => m.node === probe)
      if (hit) return hit.start
    }
    probe = probe.firstChild ?? probe.nextSibling
  }
  // 退而求其次：取 container 在 map 中第一个出现的后代
  for (const m of map.nodes) {
    if (container.contains(m.node)) return m.start
  }
  return null
}

/** 解包 root 内所有划线 mark，恢复纯文本（恢复高亮前调用） */
export function unwrapAllAnnotations(root: HTMLElement): void {
  const marks = Array.from(root.querySelectorAll<HTMLElement>(ANNOTATION_MARK_SELECTOR))
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    // 把 mark 的子节点移到前面，再删除 mark
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    // 合并相邻文本节点，避免后续 split/定位错乱
    parent.normalize()
  }
}

export interface RestoreOptions {
  /** 高亮色（CSS color） */
  color?: string
}

/**
 * 按 annotations 重建划线高亮。会先 unwrap 已有 mark，再按 offset 区间包裹。
 * 调用方应先按 sectionId 过滤好 annotations。
 * 返回成功恢复的数量。
 */
export function restoreHighlights(
  root: HTMLElement,
  annotations: {
    id: string
    startOffset: number
    endOffset: number
    selectedText?: string
    note?: string
  }[],
  options: RestoreOptions = {},
): number {
  unwrapAllAnnotations(root)
  if (!annotations.length) return 0

  const map = buildTextMap(root)
  const total = map.text.length

  // 倒序应用，避免包裹后改变前面文本节点结构导致偏移失效
  const sorted = [...annotations]
    .filter((a) => {
      if (!(a.endOffset > a.startOffset && a.startOffset >= 0 && a.endOffset <= total)) {
        return false
      }
      // 校验 slice 与 selectedText 一致；AI 重生成章节后旧 offset 会错位
      const stored = String(a.selectedText ?? "").trim()
      if (stored) {
        const slice = map.text.slice(a.startOffset, a.endOffset).trim()
        if (slice !== stored) {
          console.warn("[annotation] stale offset skipped", a.id, { slice, selectedText: stored })
          return false
        }
      }
      return true
    })
    .sort((a, b) => b.startOffset - a.startOffset)

  let restored = 0
  for (const ann of sorted) {
    const ok = wrapOffsets(root, map, ann.startOffset, ann.endOffset, ann.id, ann.note, options.color)
    if (ok) restored++
  }
  return restored
}

/**
 * 在 [start, end) 字符区间内包裹 mark。可能跨越多个文本节点，
 * 每个被覆盖的文本节点包一个 mark（视觉上连续）。首尾用 splitText 截断。
 */
function wrapOffsets(
  root: HTMLElement,
  map: PlainTextMap,
  startOffset: number,
  endOffset: number,
  annotationId: string,
  note: string | undefined,
  color: string | undefined,
): boolean {
  const start = locateBoundary(map.nodes, startOffset)
  const end = locateBoundary(map.nodes, endOffset)
  if (!start || !end) return false

  // 截断起点
  let startNode = start.node
  if (start.local > 0 && start.local < startNode.length) {
    startNode = startNode.splitText(start.local) as Text
  }
  // 截断终点
  let endNode = end.node
  if (end.local > 0 && end.local < endNode.length) {
    endNode.splitText(end.local)
    // endNode 仍指向区间内部分
  } else if (end.local === 0 && endNode !== startNode) {
    // 终点恰好在某节点开头，回退到上一节点末尾
    // 无需处理
  }

  // 收集 [startNode, endNode] 范围内的文本节点
  const targets: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let inRange = false
  let current: Text | null
  while ((current = walker.nextNode() as Text | null)) {
    if (current === startNode) inRange = true
    if (inRange) targets.push(current)
    if (current === endNode) break
  }

  for (let i = 0; i < targets.length; i++) {
    const textNode = targets[i]
    if (!textNode.parentNode) continue
    const mark = document.createElement("mark")
    mark.className = "novel-annotation"
    // 只在第一个 mark 上记录 id，其余 mark 仅作视觉延续
    if (i === 0) mark.setAttribute(ANNOTATION_DATA_ID, annotationId)
    if (color) mark.style.backgroundColor = color
    if (note) mark.classList.add("novel-annotation--noted")
    textNode.parentNode.insertBefore(mark, textNode)
    mark.appendChild(textNode)
  }
  return targets.length > 0
}

/** 从事件目标解析被点击的 annotation id（点击高亮 mark 时用） */
export function resolveAnnotationIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Node)) return null
  const el =
    target.nodeType === Node.ELEMENT_NODE
      ? (target as HTMLElement)
      : (target.parentElement as HTMLElement | null)
  const mark = el?.closest?.(`mark[${ANNOTATION_DATA_ID}]`) as HTMLElement | null
  return mark?.getAttribute(ANNOTATION_DATA_ID) ?? null
}
