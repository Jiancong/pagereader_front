<template>
  <div class="epub-reader" :class="{ 'epub-reader--night': colorTheme === 'dark' }" ref="rootRef">
    <div class="epub-reader__stage">
      <div
        class="epub-reader__zoom"
        :style="epubZoomStyle"
      >
        <div ref="viewerShellRef" class="epub-reader__viewer-shell">
          <div ref="viewerRef" class="epub-reader__viewer"></div>
          <div v-show="Boolean(coReadInline)" ref="overlayRef" class="epub-reader__co-read-overlay"></div>
        </div>
      </div>
      <div v-if="loading" class="epub-reader__overlay">{{ t('reader.loading') }}</div>
      <div v-else-if="loadError" class="epub-reader__overlay epub-reader__overlay--error">
        {{ loadError }}
      </div>
    </div>

    <div
      class="epub-reader__nav"
      :class="{ 'epub-reader__nav--hidden': loading || Boolean(loadError) }"
      :aria-hidden="loading || Boolean(loadError)"
    >
      <button class="er-btn" :disabled="atStart" @click="prev">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        {{ t('reader.prev') }}
      </button>
      <span class="epub-reader__page">{{ currentPage }} / {{ pageTotal || '—' }}</span>
      <button class="er-btn" :disabled="atEnd" @click="next">
        {{ t('reader.next') }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import type { ReaderColorTheme } from '@/composables/useReaderColorTheme'
import { useI18n } from 'vue-i18n'
import ePub, { type Book, type Rendition } from 'epubjs'
import {
  pageTextFromBody,
  pageTextFromVisiblePage,
  patchCoReadAnnotationThreads,
  syncCoReadOverlayAnnotations,
  type CoReadInlineLabels,
  type CoReadInlineStatus,
} from '@/utils/coReadInlineAnnotations'
import type { CoReadAnnotation, CoReadChatMessage } from '@/types/coReading'
import type { EpubSearchHit, EpubSearchProgress } from '@/types/epubSearch'

const MAX_EPUB_SEARCH_HITS = 400
const SEARCH_HIGHLIGHT_CLASS = 'epub-search-hl'
const searchHighlightStyles = {
  [`.${SEARCH_HIGHLIGHT_CLASS}`]: {
    fill: '#fbbf24',
    'fill-opacity': '0.45',
    'mix-blend-mode': 'multiply',
  },
}

const props = withDefaults(
  defineProps<{
    file: File
    scale?: number
    colorTheme?: ReaderColorTheme
    /** 打开时定位到 spine 章节（沉浸式共读按章跳转） */
    initialSpineIndex?: number
    /** 共读：批注嵌入当前页文档 */
    coReadInline?: {
      annotations: CoReadAnnotation[]
      labels: CoReadInlineLabels
      status?: CoReadInlineStatus
      chatMessages?: CoReadChatMessage[]
      chatLoading?: boolean
      /** 沉浸顶栏显隐等布局变化时递增，触发 overlay 重算 */
      layoutRevision?: number
    } | null
  }>(),
  { colorTheme: 'light', coReadInline: null },
)

const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
  'page-ready': []
  zoom: [delta: number]
  'co-read-draft': [annotationId: string, text: string]
  'co-read-save': [annotationId: string, text: string]
  'co-read-delete': [annotationId: string]
  'co-read-chat': [annotationId: string, text: string]
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const viewerShellRef = ref<HTMLElement | null>(null)
const viewerRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const currentPage = ref(1)
const pageTotal = ref(0)
const atStart = ref(true)
const atEnd = ref(false)

const epubZoomStyle = computed(() => {
  const s = props.scale ?? 1
  // iOS Safari 不支持 zoom 属性，用 transform scale 兜底
  if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('zoom', '1')) {
    return { transform: `scale(${s})`, transformOrigin: 'top center' }
  }
  return { zoom: s }
})

let book: Book | null = null
let rendition: Rendition | null = null
let resizeObserver: ResizeObserver | null = null
let originalAddEventListener: typeof window.addEventListener | null = null
let renderedWidth = 0
let renderedHeight = 0
let currentViewDoc: Document | null = null

const trackedDocs = new Set<Document>()

function currentScale() {
  const s = props.scale
  return typeof s === 'number' && s > 0 ? s : 1
}

/** epubjs locations 默认每 200 字一格，一屏会跨好多格，页码就会从 7 跳到 14。这里改按可见页计数。 */
const sectionPageTotals = new Map<number, number>()
const locationCounts = new Map<number, number>()
let locationCountsReady = false
let pendingSectionPage = 0
let pendingSectionEnd = false

function ensureLocationCounts() {
  if (locationCountsReady || !book || book.locations.length() === 0) return
  const list = (book.locations as { _locations?: string[] })._locations
  if (!list?.length) return
  locationCounts.clear()
  for (const cfi of list) {
    const m = String(cfi).match(/\/6\/(\d+)/)
    if (!m) continue
    const spineIndex = Number(m[1]) / 2 - 1
    if (spineIndex < 0) continue
    locationCounts.set(spineIndex, (locationCounts.get(spineIndex) || 0) + 1)
  }
  locationCountsReady = true
}

function pagesInSpine(index: number, locationsPerPage: number): number {
  const measured = sectionPageTotals.get(index)
  if (measured && measured > 0) return measured
  const locs = locationCounts.get(index) || 0
  if (locs <= 0) return 1
  if (!(locationsPerPage > 0)) return 1
  return Math.max(1, Math.round(locs / locationsPerPage))
}

function locationsPerVisiblePage(spineIndex: number, sectionTotal: number): number {
  ensureLocationCounts()
  const locs = locationCounts.get(spineIndex) || 0
  if (sectionTotal > 0 && locs > 0) return locs / sectionTotal
  for (const [idx, total] of sectionPageTotals) {
    const n = locationCounts.get(idx) || 0
    if (total > 0 && n > 0) return n / total
  }
  return 0
}

function bookVisualPages(spineIndex: number, pageInSection: number, sectionTotal: number) {
  const perPage = locationsPerVisiblePage(spineIndex, sectionTotal)
  const spineLen = (book?.spine as { length?: number } | undefined)?.length || spineIndex + 1
  let before = 0
  let total = 0
  for (let i = 0; i < spineLen; i++) {
    const count = i === spineIndex ? sectionTotal : pagesInSpine(i, perPage)
    if (i < spineIndex) before += count
    total += count
  }
  return { page: before + pageInSection, total: Math.max(total, before + pageInSection) }
}

function locateVisualPage(page: number): { spineIndex: number; pageInSection: number } | null {
  if (!book?.spine?.length) return null
  const perPage = locationsPerVisiblePage(0, sectionPageTotals.get(0) || 0)
  const spineLen = (book.spine as { length?: number }).length || 0
  let cursor = 0
  for (let i = 0; i < spineLen; i++) {
    const count = pagesInSpine(i, perPage)
    if (page <= cursor + count) {
      return { spineIndex: i, pageInSection: Math.max(1, page - cursor) }
    }
    cursor += count
  }
  return null
}

function updatePageInfo(location: any) {
  const spineIndex = location?.start?.index
  const displayed = location?.start?.displayed
  if (book && typeof spineIndex === 'number' && displayed?.total > 0 && displayed?.page > 0) {
    sectionPageTotals.set(spineIndex, displayed.total)
    const visual = bookVisualPages(spineIndex, displayed.page, displayed.total)
    currentPage.value = visual.page
    pageTotal.value = visual.total
    emit('page-change', visual.page)
    emit('page-count', visual.total)
    return
  }
  if (!book || book.locations.length() === 0 || !location?.start?.cfi) return
  const loc = Number(book.locations.locationFromCfi(location.start.cfi))
  if (!Number.isFinite(loc) || loc < 0) return
  const page = loc + 1
  const total = book.locations.length()
  currentPage.value = page
  pageTotal.value = total
  emit('page-change', page)
  emit('page-count', total)
}

function onDocKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prev()
  }
}
function onDocContextMenu(e: MouseEvent) {
  e.preventDefault()
  next()
}
function onDocWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  emit('zoom', e.deltaY > 0 ? -0.1 : 0.1)
}

// ── 移动端滑动翻页 + 翻书动效 ─────────────────────────────────────────────
// 注意：epub iframe 内容横向可滚动（多栏 body 超宽），手机浏览器会把横滑判定为
// 原生滚动并接管手势（touchend 可能被 touchcancel 替代）。因此：
// 1) 注入 touch-action:none 禁掉内容区原生触摸滚动，把横滑还给 JS；
// 2) touchmove 持续跟踪触点，touchcancel 也能完成翻页判定。
const SWIPE_MIN_PX = 56
const SWIPE_MAX_MS = 1000
const TOUCH_STYLE_ID = 'page2top-epub-touch-style'
let touchStartX = 0
let touchStartY = 0
let touchLastX = 0
let touchLastY = 0
let touchStartAt = 0
let touchLogged = false

function isMobileViewport(): boolean {
  try {
    return window.matchMedia('(max-width: 767px)').matches
  } catch {
    return false
  }
}

/** 禁用 iframe 内容的原生触摸滚动/手势接管，否则部分手机浏览器（如华为）横滑不派发 touchend */
function ensureTouchStyle(doc: Document) {
  if (typeof doc.getElementById !== 'function' || doc.getElementById(TOUCH_STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = TOUCH_STYLE_ID
  style.textContent = 'html, body { touch-action: none !important; }'
  ;(doc.head || doc.documentElement).appendChild(style)
}

function onDocTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  releaseOverlayInteraction()
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchLastX = t.clientX
  touchLastY = t.clientY
  touchStartAt = Date.now()
  if (!touchLogged) {
    touchLogged = true
    try {
      console.info('[Reader] touch swipe ready (mobile)')
    } catch {
      /* ignore */
    }
  }
}

function onDocTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  touchLastX = t.clientX
  touchLastY = t.clientY
}

/** 用最终触点做滑动判定；touchend / touchcancel 都走这里 */
function finishSwipe(e: TouchEvent) {
  // 正在拖选文字（划词批注/复制）时不翻页
  const doc = (e.target as Node | null)?.ownerDocument
  if (doc && String(doc.getSelection?.()?.toString() || '').trim()) return
  const dx = touchLastX - touchStartX
  const dy = touchLastY - touchStartY
  const dt = Date.now() - touchStartAt
  // 快速、明显横向的滑动才算翻页；纵向滚动与长按（选词/菜单）不触发
  if (dt > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.6) return
  // 右→左滑 = 向右翻书（下一页）；左→右滑 = 向左翻书（上一页）
  if (dx < 0) next()
  else prev()
}

function onDocTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0]
  if (t) {
    touchLastX = t.clientX
    touchLastY = t.clientY
  }
  finishSwipe(e)
}

function onDocTouchCancel(e: TouchEvent) {
  finishSwipe(e)
}

let flipTurnTimer: number | null = null
let flipCleanTimer: number | null = null

/** 翻页时播放拟真 3D 翻书动效（含卷页高光与书脊阴影），在折页中点切换真实页内容 */
function isFlipAnimating(): boolean {
  const el = viewerRef.value
  return Boolean(el?.classList.contains('epub-flip--next') || el?.classList.contains('epub-flip--prev'))
}

function withPageFlip(direction: 'next' | 'prev', turn: () => void) {
  const el = viewerRef.value
  if (!el) {
    turn()
    return
  }
  if (flipTurnTimer) {
    window.clearTimeout(flipTurnTimer)
    flipTurnTimer = null
  }
  if (flipCleanTimer) {
    window.clearTimeout(flipCleanTimer)
    flipCleanTimer = null
  }
  const cls = direction === 'next' ? 'epub-flip--next' : 'epub-flip--prev'
  el.classList.remove('epub-flip--next', 'epub-flip--prev')
  // 强制回流，让连续滑动时动画能重新播放
  void el.offsetWidth
  el.classList.add(cls)
  flipTurnTimer = window.setTimeout(() => {
    flipTurnTimer = null
    turn()
  }, 190)
  flipCleanTimer = window.setTimeout(() => {
    flipCleanTimer = null
    el.classList.remove(cls)
    // 3D rotateY 动画期间 getBoundingClientRect 被压扁；落定后再重算一次本页批注
    requestAnimationFrame(() => {
      if (props.coReadInline) applyCoReadInline(true)
      emit('page-ready')
    })
  }, 440)
}

function attachToDoc(doc: Document) {
  if (trackedDocs.has(doc)) return
  trackedDocs.add(doc)
  doc.addEventListener('keydown', onDocKeyDown, true)
  doc.addEventListener('contextmenu', onDocContextMenu, true)
  doc.addEventListener('wheel', onDocWheel, { capture: true, passive: false })
  // 移动端滑动翻页：epub 内容渲染在 iframe 内，touch 事件只能在文档内部捕获
  ensureTouchStyle(doc)
  doc.addEventListener('touchstart', onDocTouchStart, { capture: true, passive: true })
  doc.addEventListener('touchmove', onDocTouchMove, { capture: true, passive: true })
  doc.addEventListener('touchend', onDocTouchEnd, { capture: true, passive: true })
  doc.addEventListener('touchcancel', onDocTouchCancel, { capture: true, passive: true })
}
function detachFromDoc(doc: Document) {
  if (!trackedDocs.has(doc)) return
  trackedDocs.delete(doc)
  doc.removeEventListener('keydown', onDocKeyDown, true)
  doc.removeEventListener('contextmenu', onDocContextMenu, true)
  doc.removeEventListener('wheel', onDocWheel, true)
  doc.removeEventListener('touchstart', onDocTouchStart, true)
  doc.removeEventListener('touchmove', onDocTouchMove, true)
  doc.removeEventListener('touchend', onDocTouchEnd, true)
  doc.removeEventListener('touchcancel', onDocTouchCancel, true)
}

/**
 * epubjs 在 default manager 中调用 window.addEventListener("unload", ...) 注册卸载清理。
 * Chrome 已禁止 unload 事件并抛出 Permissions policy violation。
 * 这里在 renderTo 之前临时拦截 addEventListener，把 "unload" 重定向为 "pagehide"
 * （现代等价事件，不受 Permissions Policy 限制），renderTo 完成后恢复。
 */
function installUnloadShim() {
  originalAddEventListener = window.addEventListener.bind(window)
  window.addEventListener = ((type: any, listener?: any, options?: any) => {
    if (type === 'unload') type = 'pagehide'
    return originalAddEventListener!(type, listener, options)
  }) as typeof window.addEventListener
}
function uninstallUnloadShim() {
  if (originalAddEventListener) {
    window.addEventListener = originalAddEventListener
    originalAddEventListener = null
  }
}

function applyEpubColorTheme() {
  if (!rendition) return
  const mediaRules = {
    'img, svg, video': {
      'max-width': '100% !important',
      'max-height': '95vh !important',
      width: 'auto !important',
      height: 'auto !important',
    },
  }
  rendition.themes.register('page2-light', {
    ...mediaRules,
    ...searchHighlightStyles,
    body: {
      color: '#1f2937 !important',
      background: '#ffffff !important',
    },
    a: { color: '#2563eb !important' },
  })
  rendition.themes.register('page2-dark', {
    ...mediaRules,
    ...searchHighlightStyles,
    body: {
      color: '#e5e5e5 !important',
      background: '#0a0a0a !important',
    },
    p: { color: '#e5e5e5 !important' },
    a: { color: '#93c5fd !important' },
  })
  rendition.themes.select(props.colorTheme === 'dark' ? 'page2-dark' : 'page2-light')
}

watch(
  () => props.colorTheme,
  () => applyEpubColorTheme(),
)

// 缩放只改 zoom/transform，stage 尺寸不变，ResizeObserver 不会触发；必须主动按新 scale 重算视口
watch(
  () => props.scale,
  () => {
    applyFrameSize(true)
    requestAnimationFrame(() => applyCoReadInline(true))
  },
)

/**
 * epubjs 用 Range.getBoundingClientRect() 量分页宽度。CSS 多栏时这个宽度只有第一栏，
 * iframe 不会变宽，next() 会以为本章已经到头。这里改用各栏 client rect / scrollWidth 把整章撑开。
 */
function repairPaginatedColumns(view: any) {
  const contents = view?.contents
  const doc = contents?.document as Document | undefined
  const layout = view?.layout
  if (!doc?.body || !layout || typeof view.reframe !== 'function') return
  if (layout.name === 'pre-paginated') return
  const flow = layout._flow || layout.props?.flow
  if (flow && flow !== 'paginated') return

  const columnWidth = Number(layout.columnWidth) || Number(layout.width) || 0
  if (!columnWidth) return

  const origin = doc.body.getBoundingClientRect().left
  const range = doc.createRange()
  range.selectNodeContents(doc.body)
  const rects = range.getClientRects()
  const lefts: number[] = []
  let maxRight = 0
  const minJump = columnWidth * 0.55
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (r.width < 8 || r.height < 8) continue
    const left = r.left - origin
    if (r.right - origin > maxRight) maxRight = r.right - origin
    lefts.push(left)
  }
  lefts.sort((a, b) => a - b)
  const columnStarts: number[] = []
  for (const x of lefts) {
    if (!columnStarts.length || x - columnStarts[columnStarts.length - 1] >= minJump) {
      columnStarts.push(x)
    }
  }
  const diffs: number[] = []
  for (let i = 1; i < columnStarts.length; i++) diffs.push(columnStarts[i] - columnStarts[i - 1])
  diffs.sort((a, b) => a - b)
  // 栏距是相邻栏起点之差。不要再加 column-gap：epubjs 的 gap 已经算进栏宽，多加会把视口停在两栏中间。
  const stride = Math.round(diffs.length ? diffs[Math.floor(diffs.length / 2)] : columnWidth)
  const scrollW = Math.max(doc.body.scrollWidth || 0, doc.documentElement?.scrollWidth || 0)
  const contentWidth = Math.max(maxRight, scrollW)
  if (stride < columnWidth * 0.5 || contentWidth <= stride + 8) return

  layout.delta = stride
  layout.pageWidth = stride
  if (layout.props) {
    layout.props.delta = stride
    layout.props.pageWidth = stride
  }
  const pages = Math.ceil((contentWidth - 1) / stride)
  const target = pages * stride
  contents.textWidth = () => target
  if (Math.abs((view._width || 0) - target) > 2) {
    view.reframe(target, view._height || layout.height)
  }
  const manager = (rendition as { manager?: { container?: HTMLElement; scrollTo?: (x: number, y: number) => void } } | null)
    ?.manager
  const scrollLeft = manager?.container?.scrollLeft || 0
  const snapped = Math.round(scrollLeft / stride) * stride
  if (manager?.scrollTo && Math.abs(snapped - scrollLeft) > 1) {
    manager.scrollTo(snapped, 0)
  }
}

/** 用户正在与 overlay 交互（浮层打开/输入中）时，抑制全量重建，避免焦点丢失与闪烁循环 */
function overlayHasInteraction(overlay: HTMLElement): boolean {
  if (overlay.querySelector(".co-read-host--open, .co-read-host--hover")) return true
  const doc = overlay.ownerDocument
  const active = doc?.activeElement
  if (active && overlay.contains(active)) {
    const tag = (active.tagName || "").toLowerCase()
    if (tag === "textarea" || tag === "input") return true
  }
  return false
}

/** 主动结束 overlay 交互（翻页/点书页空白处调用），让随后的重建/重排能正常进行 */
function releaseOverlayInteraction() {
  const overlay = overlayRef.value
  if (!overlay) return
  overlay.querySelectorAll(".co-read-host--open, .co-read-host--hover").forEach((el) => {
    el.classList.remove("co-read-host--open", "co-read-host--hover")
  })
  const doc = overlay.ownerDocument
  const active = doc?.activeElement
  if (active && overlay.contains(active) && typeof (active as HTMLElement).blur === "function") {
    ;(active as HTMLElement).blur()
  }
}

function applyCoReadInline(force = false) {
  const overlay = overlayRef.value
  if (!overlay) return
  if (!props.coReadInline?.labels) {
    overlay.textContent = ''
    return
  }
  const body = currentViewDoc?.body || getActiveViewDocument()?.body
  if (!body) return
  // 关键：overlay 重建会销毁正在输入的 textarea 和已展开的浮层。
  // 华为等移动浏览器上这会造成「点击 icon → 重建 → 焦点异常 → 再重建」的无限刷新。
  if (!force && overlayHasInteraction(overlay)) return
  syncCoReadOverlayAnnotations({
    body,
    host: overlay,
    annotations: props.coReadInline.annotations,
    labels: props.coReadInline.labels,
    dark: props.colorTheme === 'dark',
    status: props.coReadInline.status,
    onDraft: (id, text) => emit('co-read-draft', id, text),
    onSaveReply: (id, text) => emit('co-read-save', id, text),
    onDeleteReply: (id) => emit('co-read-delete', id),
    onChatAbout: (id, text) => emit('co-read-chat', id, text),
  })
  patchCoReadThreads()
}

function patchCoReadThreads() {
  const overlay = overlayRef.value
  const payload = props.coReadInline
  if (!overlay || !payload?.chatMessages) return
  patchCoReadAnnotationThreads(overlay, payload.chatMessages, {
    chatLoading: payload.chatLoading,
    loadingHint: payload.labels.loading,
  })
}

/**
 * 只在「批注定位结构」变化时重建 overlay：id 集合、quote、paragraphIndex、kind。
 * 绝不包含 content / intro / myReply 等流式文本字段——它们每来一个 token 就变，
 * 若纳入签名会导致每 token 全量重建 DOM，在移动端表现为「一打开就不断刷新」。
 */
function coReadPayloadSignature(): string {
  const p = props.coReadInline
  if (!p) return ""
  const parts: string[] = []
  for (const a of p.annotations) {
    parts.push(`${a.id}|${a.kind}|${a.anchor?.paragraphIndex ?? 0}|${a.anchor?.quote ?? ""}`)
  }
  // 仅纳入影响浮层/状态块「存在与否」的布尔量，不纳入文本内容
  const s = p.status
  parts.push(`status:${s?.loading ? 1 : 0}|${s?.errorCode ?? ""}|${s?.emptyHint ? 1 : 0}`)
  return parts.join("~")
}

/** 原地更新流式文本（intro / 批注正文），不重建 DOM、不打断焦点 */
function patchCoReadText() {
  const overlay = overlayRef.value
  const payload = props.coReadInline
  if (!overlay || !payload) return
  // 状态条文本：仅在没有 errorCode 时原地改写，避免误删「重试」按钮
  const s = payload.status
  const statusEl = overlay.querySelector(".co-read-status")
  if (statusEl && !s?.errorCode) {
    const intro = s?.intro || ""
    const loadingText = s?.loading ? payload.labels.loading || "" : ""
    const text = intro && loadingText ? `${intro} ${loadingText}` : intro || loadingText
    if (text && statusEl.textContent !== text) statusEl.textContent = text
  }
  // 各批注浮层正文
  for (const ann of payload.annotations) {
    const hostEl = overlay.querySelector(`[data-co-read-inline-root="${ann.id}"]`)
    if (!hostEl) continue
    const bodyEl = hostEl.querySelector(".co-read-pop__body")
    if (bodyEl && bodyEl.textContent !== (ann.content || "")) {
      bodyEl.textContent = ann.content || ""
    }
  }
}

watch(
  coReadPayloadSignature,
  () => {
    applyCoReadInline()
  },
  { flush: 'post' },
)

// 流式文本变化：只做原地文本更新，绝不重建 DOM
watch(
  () => {
    const p = props.coReadInline
    if (!p) return ""
    let n = 0
    for (const a of p.annotations) n += (a.content || "").length
    return `${n}|${p.status?.intro?.length ?? 0}`
  },
  () => {
    patchCoReadText()
  },
  { flush: 'post' },
)

watch(
  () => {
    const p = props.coReadInline
    if (!p?.chatMessages) return ''
    return p.chatMessages
      .map((m) => `${m.id}|${m.text.length}|${m.streaming ? 1 : 0}|${m.annotationId ?? ''}`)
      .join(';')
      .concat(p.chatLoading ? '|loading' : '')
  },
  () => patchCoReadThreads(),
  { flush: 'post' },
)

watch(
  () => props.coReadInline?.layoutRevision ?? 0,
  () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => applyCoReadInline(true))
    })
  },
  { flush: 'post' },
)

watch(
  () => (props.coReadInline ? 1 : 0),
  (on) => {
    if (!on) return
    void nextTick(() => {
      requestAnimationFrame(() => applyCoReadInline(true))
    })
  },
  { flush: 'post' },
)

onMounted(async () => {
  try {
    // iOS Safari 旧版本 File.arrayBuffer() 可能缺失，用 slice+FileReader 兜底
    let data: ArrayBuffer
    if (typeof props.file.arrayBuffer === 'function') {
      data = await props.file.arrayBuffer()
    } else {
      data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error || new Error('FileReader error'))
        reader.readAsArrayBuffer(props.file)
      })
    }

    book = ePub(data)
    await book.ready
    // 沙箱 iframe 不允许脚本。书里的 <script> 会在 about:srcdoc 里被浏览器拒绝并刷屏，阅读用不到它们。
    book.spine.hooks.serialize.register((output: string, section: { output?: string }) => {
      if (!output || !/<script\b/i.test(output)) return
      section.output = output.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    })

    // 等待 DOM 就绪（iOS Safari 有时 onMounted 时 ref 还未挂载）
    await nextTick()
    if (!viewerRef.value) {
      throw new Error('Viewer element not ready')
    }

    const frame = await waitForMeasureFrame()
    const w = frame.width
    const h = frame.height
    renderedWidth = w
    renderedHeight = h

    installUnloadShim()
    rendition = book.renderTo(viewerRef.value, {
      width: w,
      height: h,
      flow: 'paginated',
      spread: 'none',
      allowScriptedContent: false,
    })

    // 扫描书整页都是带固定 width/height 属性的大图，约束到页面尺寸内，
    // 否则图片远超出版心被裁剪；缩放由外层容器 zoom 完成，与 epubjs 分页互不干扰。
    rendition.themes.default({
      'img, svg, video': {
        'max-width': '100% !important',
        'max-height': '95vh !important',
        width: 'auto !important',
        height: 'auto !important',
      },
      ...searchHighlightStyles,
    })
    applyEpubColorTheme()

    rendition.on('relocated', (location: any) => {
      dbg('relocated', {
        spine: location?.start?.index,
        page: location?.start?.displayed?.page,
        total: location?.start?.displayed?.total,
      })
      updatePageInfo(location)
      syncEnds()
      // 交互中（浮层打开/输入）不强制重建，避免销毁 textarea 触发键盘开合循环
      applyCoReadInline()
    })

    rendition.on('rendered', (_section: any, view: any) => {
      const doc = view?.document as Document | undefined
      if (doc) {
        currentViewDoc = doc
        attachToDoc(doc)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            repairPaginatedColumns(view)
            const pageWidth = view?.layout?.pageWidth || view?.layout?.delta
            const manager = (rendition as { manager?: { container?: HTMLElement; scrollTo?: (x: number, y: number) => void } } | null)?.manager
            if (pendingSectionEnd && pageWidth && manager?.scrollTo && manager.container) {
              const maxLeft = Math.max(0, manager.container.scrollWidth - pageWidth)
              manager.scrollTo(maxLeft, 0)
              pendingSectionEnd = false
            } else if (pendingSectionPage > 1) {
              if (pageWidth && manager?.scrollTo) manager.scrollTo((pendingSectionPage - 1) * pageWidth, 0)
              pendingSectionPage = 0
            }
            ;(rendition as { reportLocation?: () => void } | null)?.reportLocation?.()
            syncEnds()
            applyCoReadInline()
          })
        })
      }

      if (book && book.locations.length() === 0) {
        void book.locations.generate(200).then(() => {
          if (rendition) {
            const loc = rendition.currentLocation() as any
            updatePageInfo(loc)
          }
        })
      }
      emit('page-ready')
    })

    const spineIdx = props.initialSpineIndex
    if (typeof spineIdx === 'number' && spineIdx >= 0) {
      await rendition.display(spineIdx)
    } else {
      await rendition.display()
    }
    loading.value = false
    await nextTick()
    uninstallUnloadShim()
    applyFrameSize()

    resizeObserver = new ResizeObserver((entries) => {
      // 只关心尺寸真的变了；overlay 增删图标等不会改变 shell 尺寸，
      // 但某些移动浏览器会因滚动条/软键盘抖动重复回调，这里统一过滤。
      const entry = entries[0]
      const box = entry?.contentRect
      const w = box ? Math.round(box.width) : 0
      const h = box ? Math.round(box.height) : 0
      const sig = box ? `${w}x${h}` : ''
      if (sig && sig === lastShellSig) return
      const widthChanged = Math.abs(w - lastShellWidth) > 40 || lastShellWidth === 0
      if (sig) lastShellSig = sig
      if (w > 0) lastShellWidth = w
      // 移动端高度抖动（键盘/工具栏/伴读底栏）既不 resize 也不重算 overlay
      if (isMobileViewport() && !widthChanged) {
        // 移动端：顶栏/底栏收起只改变高度，仍需重算 overlay 批注 icon（不能 rendition.resize）
        if (props.coReadInline) {
          requestAnimationFrame(() => applyCoReadInline(true))
        }
        return
      }
      // 宽度显著变化（如横竖屏旋转）：强制 resize 重排多栏，不能被 800ms 冷却或 interaction 拦截
      applyFrameSize(widthChanged)
      requestAnimationFrame(() => applyCoReadInline(true))
    })
    if (viewerShellRef.value) resizeObserver.observe(viewerShellRef.value)
    window.addEventListener('orientationchange', onOrientationChange)
  } catch (e) {
    uninstallUnloadShim()
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

// iOS Safari 14 以下没有 ResizeObserver，用 window resize 兜底
if (typeof ResizeObserver === 'undefined') {
  window.addEventListener('resize', () => {
    applyFrameSize()
  })
}

let orientationSettleTimer: number | null = null
function onOrientationChange() {
  releaseOverlayInteraction()
  if (orientationSettleTimer) {
    window.clearTimeout(orientationSettleTimer)
    orientationSettleTimer = null
  }
  // 华为等手机转屏动画约 200~350ms，动画结束后再按最终视口强制重排一轮
  orientationSettleTimer = window.setTimeout(() => {
    orientationSettleTimer = null
    applyFrameSize(true)
    requestAnimationFrame(() => applyCoReadInline(true))
  }, 320)
}

onBeforeUnmount(() => {
  clearSearchHighlights()
  if (orientationSettleTimer) {
    window.clearTimeout(orientationSettleTimer)
    orientationSettleTimer = null
  }
  window.removeEventListener('orientationchange', onOrientationChange)
  uninstallUnloadShim()
  for (const doc of trackedDocs) detachFromDoc(doc)
  trackedDocs.clear()
  resizeObserver?.disconnect()
  rendition?.destroy()
  book?.destroy()
})

function managerBox(): {
  container?: HTMLElement
  layout?: { delta?: number; pageWidth?: number }
  scrollBy?: (x: number, y: number, silent?: boolean) => void
} | null {
  return (rendition as { manager?: {
    container?: HTMLElement
    layout?: { delta?: number; pageWidth?: number }
    scrollBy?: (x: number, y: number, silent?: boolean) => void
  } } | null)?.manager ?? null
}

function pageTurnDelta(): number {
  const manager = managerBox()
  const delta = Number(manager?.layout?.delta || manager?.layout?.pageWidth || 0)
  if (delta > 8) return delta
  return manager?.container?.clientWidth || 0
}

function syncEnds() {
  const container = managerBox()?.container
  const loc = rendition?.currentLocation() as { start?: { index?: number } } | undefined
  const index = loc?.start?.index
  const section = typeof index === 'number' ? book?.spine.get(index) : undefined
  const remainForward = container ? container.scrollWidth - container.scrollLeft - container.clientWidth : 0
  const remainBack = container ? container.scrollLeft : 0
  atEnd.value = remainForward <= 8 && !section?.next()
  atStart.value = remainBack <= 8 && !section?.prev()
}

/** 视口高度按阅读区算，不用 window.innerHeight，避免栏高超出底栏、末行被裁且翻页跳过这段 */
function measureFrame(): { width: number; height: number } {
  const s = currentScale()
  // 以 viewer-shell 为准（max-width 限制实际页宽）。stage 在宽屏下远大于可见页，
  // 若误用 stage 会把 column-width 设成 2000+，外层 900px 裁切后每行右侧缺字。
  const shell = viewerShellRef.value
  const shellRect = shell?.getBoundingClientRect()
  let width = Math.floor((shellRect?.width || 0) / s)
  let height = Math.floor((shellRect?.height || 0) / s)
  if (shell && width > 0) {
    const maxW = shell.ownerDocument.defaultView?.getComputedStyle(shell).maxWidth
    if (maxW && maxW !== 'none') {
      const cap = parseFloat(maxW)
      if (Number.isFinite(cap) && cap > 0) width = Math.min(width, Math.floor(cap))
    }
  }
  if (width > 40 && height > 40) return { width, height }

  const viewerRect = viewerRef.value?.getBoundingClientRect()
  width = Math.floor((viewerRect?.width || 0) / s)
  height = Math.floor((viewerRect?.height || 0) / s)
  if (width > 40 && height > 40) return { width, height }

  return {
    width: Math.max(1, Math.min(900, width || Math.floor(320 / s))),
    height: Math.max(1, height || Math.floor(480 / s)),
  }
}

async function waitForMeasureFrame(maxAttempts = 40): Promise<{ width: number; height: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    const frame = measureFrame()
    if (frame.width > 40 && frame.height > 40) return frame
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  return measureFrame()
}

/**
 * 调整 iframe 尺寸。
 * 注意：epub.js 的 rendition.onResized 会在 resize 后执行 display(location.start.cfi)，
 * 把阅读位置拉回「当前 location 起点」。若在翻页瞬间触发 resize，就会出现
 * 「翻到下一页又刷回上一页」。因此翻页静默期内直接跳过 resize，
 * 其余情况下 resize 前后保存并恢复横向位置与页码。
 */
let resizing = false
/** 翻页静默期截止时间：翻页动作后短时间内不做 resize，避免与滚动抢位置 */
let flipGuardUntil = 0
/** 最近一次已处理的尺寸签名与时间，用于阻断 ResizeObserver 反馈环 */
let lastResizeSig = ''
let lastResizeAt = 0
/** 最近一次观察到的 shell 内容尺寸，过滤重复回调 */
let lastShellSig = ''
let lastShellWidth = 0

/**
 * 翻页回滚排查探针。控制台执行 `__epubDebug(true)` 开启，
 * 复现一次翻页即可看到 relocated / resize / scroll 的完整时序。
 */
let debugEnabled = false
function dbg(tag: string, extra?: Record<string, unknown>) {
  if (!debugEnabled) return
  const m = managerBox()
  const c = m?.container
  const delta = Number(m?.layout?.delta || m?.layout?.pageWidth || 0)
  const left = c?.scrollLeft ?? -1
  const page = delta > 8 ? Math.round(left / delta) + 1 : -1
  // eslint-disable-next-line no-console
  console.log(`[epub] ${tag}`, {
    page,
    left,
    delta,
    scrollW: c?.scrollWidth ?? -1,
    clientW: c?.clientWidth ?? -1,
    guard: Math.max(0, Math.round(flipGuardUntil - Date.now())),
    ...extra,
  })
}
if (typeof window !== 'undefined') {
  ;(window as unknown as { __epubDebug?: (on: boolean) => void }).__epubDebug = (on: boolean) => {
    debugEnabled = !!on
    // eslint-disable-next-line no-console
    console.info(`[epub] debug ${debugEnabled ? 'ON' : 'OFF'}`)
  }
  // ?debug=1 时自动开启探针（配合 eruda 真机查看）
  try {
    if (/(?:^|[?&])debug=1(?:&|$)/.test(window.location.search)) debugEnabled = true
  } catch {
    /* ignore */
  }
}

function markFlipActivity() {
  flipGuardUntil = Date.now() + 600
}

function applyFrameSize(force = false) {
  if (!rendition || resizing) return
  if (!force && Date.now() < flipGuardUntil) {
    dbg('resize SKIPPED (guard)')
    return
  }
  // 用户在浮层输入或浮层展开时不重新分页
  const ov = overlayRef.value
  if (!force && ov && overlayHasInteraction(ov)) {
    dbg('resize SKIPPED (interaction)')
    return
  }
  const size = measureFrame()
  // 环形保护：同一尺寸在短时间内只处理一次，杜绝 ResizeObserver 反馈环
  const sig = `${size.width}x${size.height}`
  if (!force && sig === lastResizeSig && Date.now() - lastResizeAt < 800) {
    dbg('resize SKIPPED (same size, cooldown)')
    return
  }
  const widthDelta = Math.abs(size.width - renderedWidth)
  const heightDelta = Math.abs(size.height - renderedHeight)
  if (!force && widthDelta <= 2 && heightDelta <= 2) return

  // 移动端结构性防刷：手机上用户不会拖动窗口，视口高度变化（华为浏览器地址栏/底栏伸缩、
  // 共读底栏出现、点击 icon 弹出键盘）一律不调 rendition.resize()，
  // 只有横竖屏旋转（宽度变化 > 40px）或主动缩放（force=true）才重排，彻底断绝 resize→display 死循环。
  if (!force && isMobileViewport() && renderedWidth > 0 && widthDelta <= 40) {
    dbg('resize SKIPPED (mobile height/minor jitter)', { from: `${renderedWidth}x${renderedHeight}`, to: sig })
    return
  }
  performFrameResize()
}

/** 实际执行 resize：保存横向页码 → rendition.resize → 下一帧按新页宽还原 */
function performFrameResize() {
  if (!rendition || resizing) return
  const size = measureFrame()
  if (Math.abs(size.width - renderedWidth) <= 2 && Math.abs(size.height - renderedHeight) <= 2) return
  const sig = `${size.width}x${size.height}`
  lastResizeSig = sig
  lastResizeAt = Date.now()
  dbg('resize START', { from: `${renderedWidth}x${renderedHeight}`, to: `${size.width}x${size.height}` })
  renderedWidth = size.width
  renderedHeight = size.height

  const manager = managerBox()
  const container = manager?.container
  const savedLeft = container?.scrollLeft || 0
  const savedDelta = Number(manager?.layout?.delta || manager?.layout?.pageWidth || 0)
  const savedPage = savedDelta > 8 ? Math.round(savedLeft / savedDelta) : 0

  resizing = true
  rendition.resize(size.width, size.height)
  dbg('resize DONE (epub re-anchored)')
  // resize 是同步重新分页 + display，必须双帧修复多栏 stride 并对齐整栏，
  // 否则横屏→竖屏后 scrollLeft 停在旧横屏栏宽位置，画面会卡在两栏中间（左右各半栏）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizing = false
      try {
        const views = rendition?.views()
        const activeView: any = Array.isArray(views) ? views[0] : (views as any)?._views?.[0]
        if (activeView) repairPaginatedColumns(activeView)
      } catch {
        /* ignore */
      }
      const m = managerBox()
      const c = m?.container
      if (!c) return
      const delta = Number(m?.layout?.delta || m?.layout?.pageWidth || c.clientWidth || 0)
      if (delta > 8) {
        const maxLeft = Math.max(0, c.scrollWidth - delta)
        const rawTarget = savedPage > 0 ? savedPage * delta : Math.min(savedLeft, maxLeft)
        const snappedTarget = Math.min(maxLeft, Math.max(0, Math.round(rawTarget / delta) * delta))
        if (Math.abs(snappedTarget - c.scrollLeft) > 1) {
          dbg('resize RESTORE', { from: c.scrollLeft, to: snappedTarget })
          m?.scrollTo?.(snappedTarget, 0)
        }
        ;(rendition as { reportLocation?: () => void } | null)?.reportLocation?.()
      }
      syncEnds()
      applyCoReadInline(true)
    })
  })
}

function next() {
  dbg('next() called')
  releaseOverlayInteraction()
  markFlipActivity()
  withPageFlip('next', turnNext)
}
function prev() {
  dbg('prev() called')
  releaseOverlayInteraction()
  markFlipActivity()
  withPageFlip('prev', turnPrev)
}
function turnNext() {
  if (!rendition) return
  const delta = pageTurnDelta()
  const container = managerBox()?.container
  const remain = container ? container.scrollWidth - container.scrollLeft - container.clientWidth : 0
  if (delta > 0 && remain > 8) {
    const m = managerBox()
    const c = m?.container
    m?.scrollBy?.(Math.min(delta, remain), 0, false)
    ;(rendition as { reportLocation?: () => void }).reportLocation?.()
    // 华为等移动浏览器横向 scrollBy 后 currentLocation 的 displayed.page 偶发不进位，
    // 导致不触发 page-change、第 2 页起永远不上报伴读
    requestAnimationFrame(() => {
      if (!c) return
      const pageInSec = Math.max(1, Math.round(c.scrollLeft / delta) + 1)
      const loc = rendition?.currentLocation() as { start?: { index?: number; displayed?: { total?: number } } } | undefined
      const spineIdx = typeof loc?.start?.index === 'number' ? loc.start.index : 0
      const secTotal = Math.max(
        pageInSec,
        loc?.start?.displayed?.total || Math.max(1, Math.round(c.scrollWidth / delta)),
      )
      sectionPageTotals.set(spineIdx, secTotal)
      const visual = bookVisualPages(spineIdx, pageInSec, secTotal)
      if (visual.page !== currentPage.value) {
        currentPage.value = visual.page
        pageTotal.value = visual.total
        emit('page-change', visual.page)
        emit('page-count', visual.total)
      }
      syncEnds()
    })
    return
  }
  const loc = rendition.currentLocation() as { start?: { index?: number } } | undefined
  const index = loc?.start?.index
  const nxt = typeof index === 'number' ? book?.spine.get(index)?.next() : undefined
  if (typeof nxt?.index === 'number') {
    void rendition.display(nxt.index)
    return
  }
  void rendition.next()
}
function turnPrev() {
  if (!rendition) return
  const delta = pageTurnDelta()
  const container = managerBox()?.container
  if (delta > 0 && container && container.scrollLeft > 8) {
    const m = managerBox()
    m?.scrollBy?.(-Math.min(delta, container.scrollLeft), 0, false)
    ;(rendition as { reportLocation?: () => void }).reportLocation?.()
    requestAnimationFrame(() => {
      const pageInSec = Math.max(1, Math.round(container.scrollLeft / delta) + 1)
      const loc = rendition?.currentLocation() as { start?: { index?: number; displayed?: { total?: number } } } | undefined
      const spineIdx = typeof loc?.start?.index === 'number' ? loc.start.index : 0
      const secTotal = Math.max(
        pageInSec,
        loc?.start?.displayed?.total || Math.max(1, Math.round(container.scrollWidth / delta)),
      )
      sectionPageTotals.set(spineIdx, secTotal)
      const visual = bookVisualPages(spineIdx, pageInSec, secTotal)
      if (visual.page !== currentPage.value) {
        currentPage.value = visual.page
        pageTotal.value = visual.total
        emit('page-change', visual.page)
        emit('page-count', visual.total)
      }
      syncEnds()
    })
    return
  }
  const loc = rendition.currentLocation() as { start?: { index?: number } } | undefined
  const index = loc?.start?.index
  const previous = typeof index === 'number' ? book?.spine.get(index)?.prev() : undefined
  if (typeof previous?.index === 'number') {
    pendingSectionEnd = true
    void rendition.display(previous.index)
    return
  }
  void rendition.prev()
}
function goToPage(page: number) {
  if (!book || !rendition || !pageTotal.value) return
  markFlipActivity()
  const target = Math.min(Math.max(Math.trunc(page), 1), pageTotal.value)
  const pos = locateVisualPage(target)
  if (!pos) {
    const cfi = book.locations.cfiFromLocation(target - 1)
    if (cfi) rendition.display(cfi)
    return
  }
  const current = rendition.currentLocation() as { start?: { index?: number } } | undefined
  const manager = (rendition as { manager?: { layout?: { pageWidth?: number; delta?: number }; scrollTo?: (x: number, y: number) => void }; reportLocation?: () => void })
  if (current?.start?.index === pos.spineIndex) {
    const pageWidth = manager.manager?.layout?.pageWidth || manager.manager?.layout?.delta
    if (pageWidth && manager.manager?.scrollTo) {
      manager.manager.scrollTo((pos.pageInSection - 1) * pageWidth, 0)
      manager.reportLocation?.()
    }
    return
  }
  pendingSectionPage = pos.pageInSection
  void rendition.display(pos.spineIndex)
}

function getPageText(): string {
  // 翻书 3D 动效进行中（rotateY ±54°）时 iframe bounding rect 被压扁，
  // waitForPageTextReady 会等下一轮（动画结束后）再取真实当前页文本
  if (isFlipAnimating()) return ''
  const doc = getActiveViewDocument()
  if (!doc?.body) return ''
  // 共读/TTS 都按「当前屏」取词：用始终挂载的 viewerShellRef/viewerRef 测量可见窗口，
  // 避免刚开启伴读时 v-if="coReadInline" 的 overlayRef 尚未挂载或宽高为 0 导致返回空串。
  const hostEl = overlayRef.value || viewerShellRef.value || viewerRef.value
  if (hostEl) {
    try {
      const visible = pageTextFromVisiblePage(doc.body, hostEl)
      if (visible && visible.trim()) return visible
    } catch {
      /* 测量异常时回退整章文本，保证伴读不会静默罢工 */
    }
  }
  const structured = pageTextFromBody(doc.body)
  if (structured) return structured
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

function getActiveViewDocument(): Document | null {
  if (currentViewDoc) return currentViewDoc
  if (!rendition) return null
  try {
    const views = rendition.views()
    const view: any = Array.isArray(views) ? views[0] : (views as any)?._views?.[0]
    return (view?.document as Document | undefined) ?? null
  } catch {
    return null
  }
}

let searchHighlightCfis: string[] = []

function chapterLabelForSection(section: { href?: string; idref?: string } | null | undefined): string {
  if (!book || !section) return ''
  const href = String(section.href || '').split('#')[0]
  if (href && book.navigation) {
    const navItem = book.navigation.get(href) as { label?: string } | undefined
    if (navItem?.label) return navItem.label
  }
  return section.idref || href || ''
}

function pageHintFromCfi(cfi: string): number | null {
  if (!book || book.locations.length() === 0 || !cfi) return null
  const loc = Number(book.locations.locationFromCfi(cfi))
  if (!Number.isFinite(loc) || loc < 0) return null
  return loc + 1
}

async function searchInBook(
  query: string,
  options?: {
    signal?: AbortSignal
    onProgress?: (progress: EpubSearchProgress) => void
  },
): Promise<EpubSearchHit[]> {
  const q = query.trim()
  if (!book || !q) return []
  await book.ready
  await book.loaded.spine
  await ensureLocationIndex()

  const spine = book.spine as { length?: number; get: (i: number) => any }
  const spineLen = spine.length ?? 0
  const hits: EpubSearchHit[] = []

  for (let spineIndex = 0; spineIndex < spineLen; spineIndex++) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    options?.onProgress?.({ sectionIndex: spineIndex, sectionTotal: spineLen, hitsSoFar: hits.length })

    const section = spine.get(spineIndex)
    if (!section) continue
    await section.load(book.load.bind(book))
    if (options?.signal?.aborted) {
      section.unload()
      throw new DOMException('Aborted', 'AbortError')
    }

    const rawMatches: Array<{ cfi?: string; excerpt?: string }> =
      typeof section.search === 'function' ? section.search(q) : section.find(q)

    for (const match of rawMatches) {
      if (!match?.cfi) continue
      hits.push({
        cfi: match.cfi,
        excerpt: (match.excerpt || '').replace(/\s+/g, ' ').trim(),
        spineIndex,
        chapterLabel: chapterLabelForSection(section),
        pageHint: pageHintFromCfi(match.cfi),
        pageDisplay: null,
      })
      if (hits.length >= MAX_EPUB_SEARCH_HITS) break
    }

    section.unload()
    if (hits.length >= MAX_EPUB_SEARCH_HITS) break
  }

  return hits
}

async function ensureLocationIndex() {
  if (!book || book.locations.length() > 0) return
  await book.locations.generate(200)
}

function clearSearchHighlights() {
  if (!rendition) return
  for (const cfi of searchHighlightCfis) {
    try {
      rendition.annotations.remove(cfi, 'highlight')
    } catch {
      /* ignore stale cfi */
    }
  }
  searchHighlightCfis = []
}

function waitForRelocated(timeoutMs = 1200): Promise<void> {
  if (!rendition) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      rendition?.off('relocated', onRelocated)
      resolve()
    }
    const onRelocated = () => finish()
    rendition.on('relocated', onRelocated)
    window.setTimeout(finish, timeoutMs)
  })
}

async function goToSearchHit(hit: EpubSearchHit): Promise<number> {
  if (!rendition || !hit.cfi) return currentPage.value
  clearSearchHighlights()
  markFlipActivity()
  await rendition.display(hit.cfi)
  await waitForRelocated()
  try {
    rendition.annotations.highlight(hit.cfi, { kind: 'search' }, undefined, SEARCH_HIGHLIGHT_CLASS)
    searchHighlightCfis.push(hit.cfi)
  } catch {
    /* highlight may fail on image-only sections */
  }
  ;(rendition as { reportLocation?: () => void }).reportLocation?.()
  syncEnds()
  return currentPage.value
}

defineExpose({
  next,
  prev,
  goToPage,
  getPageText,
  isAtEnd: () => atEnd.value,
  searchInBook,
  goToSearchHit,
  clearSearchHighlights,
})
</script>

<style scoped>
.epub-reader {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f3f4f6;
}
.epub-reader__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 12px;
  overflow: hidden;
}
.epub-reader__zoom {
  flex: 1;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  /* iOS Safari 不支持 CSS zoom 属性，用 transform 兜底 */
  @supports not (zoom: 1) {
    transform-origin: top center;
  }
}
.epub-reader__viewer-shell {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-width: 900px;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  perspective: 1800px;
}
.epub-reader__viewer {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transform-style: preserve-3d;
  will-change: transform, box-shadow;
}
/* 卷页折痕高光与书脊阴影遮罩 */
.epub-reader__viewer::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 8;
  opacity: 0;
}
/* 拟真 3D 翻书动效：前半段旧页沿书脊掀起翻出，中点切换新页后从对侧铺平落定 */
.epub-reader__viewer.epub-flip--next {
  transform-origin: left center;
  animation: epub-flip-next 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
  backface-visibility: hidden;
}
.epub-reader__viewer.epub-flip--next::after {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.24) 0%,
    rgba(0, 0, 0, 0.06) 18%,
    rgba(255, 255, 255, 0.28) 46%,
    rgba(0, 0, 0, 0.18) 78%,
    rgba(0, 0, 0, 0.32) 100%
  );
  animation: epub-curl-shade-next 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.epub-reader__viewer.epub-flip--prev {
  transform-origin: right center;
  animation: epub-flip-prev 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
  backface-visibility: hidden;
}
.epub-reader__viewer.epub-flip--prev::after {
  background: linear-gradient(
    270deg,
    rgba(0, 0, 0, 0.24) 0%,
    rgba(0, 0, 0, 0.06) 18%,
    rgba(255, 255, 255, 0.28) 46%,
    rgba(0, 0, 0, 0.18) 78%,
    rgba(0, 0, 0, 0.32) 100%
  );
  animation: epub-curl-shade-prev 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
}
@keyframes epub-flip-next {
  0% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
  43% {
    transform: rotateY(-54deg) translateX(-3%) scale(0.975);
    box-shadow: 24px 0 36px -8px rgba(0, 0, 0, 0.38);
  }
  47% {
    transform: rotateY(20deg) translateX(2.5%) scale(0.985);
    box-shadow: -18px 0 28px -6px rgba(0, 0, 0, 0.28);
  }
  100% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
}
@keyframes epub-flip-prev {
  0% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
  43% {
    transform: rotateY(54deg) translateX(3%) scale(0.975);
    box-shadow: -24px 0 36px -8px rgba(0, 0, 0, 0.38);
  }
  47% {
    transform: rotateY(-20deg) translateX(-2.5%) scale(0.985);
    box-shadow: 18px 0 28px -6px rgba(0, 0, 0, 0.28);
  }
  100% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
}
@keyframes epub-curl-shade-next {
  0% {
    opacity: 0;
    transform: translateX(35%);
  }
  43% {
    opacity: 0.9;
    transform: translateX(-15%);
  }
  47% {
    opacity: 0.75;
    transform: translateX(20%);
  }
  100% {
    opacity: 0;
    transform: translateX(-40%);
  }
}
@keyframes epub-curl-shade-prev {
  0% {
    opacity: 0;
    transform: translateX(-35%);
  }
  43% {
    opacity: 0.9;
    transform: translateX(15%);
  }
  47% {
    opacity: 0.75;
    transform: translateX(-20%);
  }
  100% {
    opacity: 0;
    transform: translateX(40%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .epub-reader__viewer.epub-flip--next,
  .epub-reader__viewer.epub-flip--prev,
  .epub-reader__viewer.epub-flip--next::after,
  .epub-reader__viewer.epub-flip--prev::after {
    animation: none;
  }
}
.epub-reader__co-read-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
}
.epub-reader__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 14px;
}
.epub-reader__overlay--error {
  color: #dc2626;
}
.epub-reader__nav {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  flex-shrink: 0;
}
.epub-reader__nav--hidden {
  visibility: hidden;
  pointer-events: none;
}
.epub-reader__page {
  min-width: 72px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.er-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.er-btn:hover:not(:disabled) {
  background: #1f2937;
}
.er-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.epub-reader--night {
  background: #0a0a0a;
}
.epub-reader--night .epub-reader__viewer {
  background: #0a0a0a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
}
.epub-reader--night .epub-reader__overlay {
  background: #0a0a0a;
  color: #9ca3af;
}

@media (max-width: 767px) {
  .epub-reader__stage {
    padding: 0;
    align-items: stretch;
  }
  .epub-reader__zoom {
    width: 100%;
    max-height: none;
  }
  .epub-reader__viewer-shell {
    max-width: none;
  }
  .epub-reader__viewer {
    max-width: none;
    box-shadow: none;
    border-radius: 0;
  }
  .epub-reader__nav {
    gap: 10px;
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .er-btn {
    flex: 1;
    min-height: 48px;
    justify-content: center;
    font-size: 14px;
    padding: 10px 12px;
  }
  .epub-reader__page {
    min-width: auto;
    flex-shrink: 0;
    font-size: 13px;
    padding: 0 4px;
  }
}
</style>
