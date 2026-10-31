<template>
  <div class="epub-reader" :class="{ 'epub-reader--night': colorTheme === 'dark' }" ref="rootRef">
    <div class="epub-reader__stage">
      <div
        class="epub-reader__zoom"
        :style="epubZoomStyle"
      >
        <div ref="viewerShellRef" class="epub-reader__viewer-shell">
          <div ref="viewerRef" class="epub-reader__viewer"></div>
          <div v-if="coReadInline" ref="overlayRef" class="epub-reader__co-read-overlay"></div>
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
import type { CoReadAnnotation } from '@/types/coReading'
import {
  pageTextFromBody,
  pageTextFromVisiblePage,
  syncCoReadOverlayAnnotations,
  type CoReadInlineLabels,
  type CoReadInlineStatus,
} from '@/utils/coReadInlineAnnotations'

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

/** 移动端翻页前播放一次 3D 翻书动效，动画过半时执行真实翻页；桌面端保持瞬时翻页 */
function withPageFlip(direction: 'next' | 'prev', turn: () => void) {
  if (!isMobileViewport()) {
    turn()
    return
  }
  const el = viewerRef.value
  if (!el) {
    turn()
    return
  }
  const cls = direction === 'next' ? 'epub-flip--next' : 'epub-flip--prev'
  el.classList.remove('epub-flip--next', 'epub-flip--prev')
  // 强制回流，让连续滑动时动画能重新播放
  void el.offsetWidth
  el.classList.add(cls)
  window.setTimeout(turn, 140)
  window.setTimeout(() => el.classList.remove(cls), 360)
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
    body: {
      color: '#1f2937 !important',
      background: '#ffffff !important',
    },
    a: { color: '#2563eb !important' },
  })
  rendition.themes.register('page2-dark', {
    ...mediaRules,
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
    applyFrameSize()
    requestAnimationFrame(() => applyCoReadInline())
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

function applyCoReadInline() {
  const overlay = overlayRef.value
  if (!props.coReadInline?.labels || !overlay) return
  const body = currentViewDoc?.body
  if (!body) return
  syncCoReadOverlayAnnotations({
    body,
    host: overlay,
    annotations: props.coReadInline.annotations,
    labels: props.coReadInline.labels,
    dark: props.colorTheme === 'dark',
    status: props.coReadInline.status,
    onDraft: (id, text) => emit('co-read-draft', id, text),
  })
}

watch(
  () => props.coReadInline,
  () => {
    applyCoReadInline()
  },
  { deep: true },
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
    })
    applyEpubColorTheme()

    rendition.on('relocated', (location: any) => {
      updatePageInfo(location)
      syncEnds()
      applyCoReadInline()
    })

    rendition.on('rendered', (_section: any, view: any) => {
      const doc = view?.document as Document | undefined
      if (doc) {
        currentViewDoc = doc
        attachToDoc(doc)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const frame = measureFrame()
            const layoutW = Number(view?.layout?.width) || 0
            if (layoutW > 0 && Math.abs(layoutW - frame.width) > 8) {
              renderedWidth = 0
              renderedHeight = 0
              applyFrameSize()
              return
            }
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

    resizeObserver = new ResizeObserver(() => {
      applyFrameSize()
      requestAnimationFrame(() => applyCoReadInline())
    })
    if (viewerShellRef.value) resizeObserver.observe(viewerShellRef.value)
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

onBeforeUnmount(() => {
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

function applyFrameSize() {
  if (!rendition) return
  const size = measureFrame()
  if (Math.abs(size.width - renderedWidth) <= 2 && Math.abs(size.height - renderedHeight) <= 2) return
  renderedWidth = size.width
  renderedHeight = size.height
  rendition.resize(size.width, size.height)
}

function next() {
  withPageFlip('next', turnNext)
}
function prev() {
  withPageFlip('prev', turnPrev)
}
function turnNext() {
  if (!rendition) return
  const delta = pageTurnDelta()
  const container = managerBox()?.container
  const remain = container ? container.scrollWidth - container.scrollLeft - container.clientWidth : 0
  if (delta > 0 && remain > 8) {
    managerBox()?.scrollBy?.(Math.min(delta, remain), 0, false)
    ;(rendition as { reportLocation?: () => void }).reportLocation?.()
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
    managerBox()?.scrollBy?.(-Math.min(delta, container.scrollLeft), 0, false)
    ;(rendition as { reportLocation?: () => void }).reportLocation?.()
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
  const doc = getActiveViewDocument()
  if (!doc?.body) return ''
  // 共读/TTS 都按「当前屏」取词：epub.js 整章渲染进 iframe 多栏分屏，
  // 直接取 body 会把其它页的文本也送出去（后端批注串页、icon 定位到隐藏栏）。
  const overlay = overlayRef.value
  if (overlay) {
    try {
      // overlay 已挂载 = 共读模式：只信可见页结果。
      // 宁可返回空（本轮不上报）也不能退回整章，否则会把下一页内容发给后端。
      return pageTextFromVisiblePage(doc.body, overlay)
    } catch {
      return ''
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

defineExpose({ next, prev, goToPage, getPageText, isAtEnd: () => atEnd.value })
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
}
.epub-reader__viewer {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
/* 移动端翻书动效：3D 翻页。下一页自右缘翻入（origin 左侧），上一页自左缘翻回 */
.epub-reader__viewer.epub-flip--next {
  transform-origin: left center;
  animation: epub-flip-next 0.34s ease-in-out;
  backface-visibility: hidden;
}
.epub-reader__viewer.epub-flip--prev {
  transform-origin: right center;
  animation: epub-flip-prev 0.34s ease-in-out;
  backface-visibility: hidden;
}
@keyframes epub-flip-next {
  0% {
    transform: perspective(1600px) rotateY(0deg);
  }
  45% {
    transform: perspective(1600px) rotateY(-16deg) scale(0.985);
  }
  100% {
    transform: perspective(1600px) rotateY(0deg);
  }
}
@keyframes epub-flip-prev {
  0% {
    transform: perspective(1600px) rotateY(0deg);
  }
  45% {
    transform: perspective(1600px) rotateY(16deg) scale(0.985);
  }
  100% {
    transform: perspective(1600px) rotateY(0deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .epub-reader__viewer.epub-flip--next,
  .epub-reader__viewer.epub-flip--prev {
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
