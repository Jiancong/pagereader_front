<template>
  <div class="epub-reader" ref="rootRef">
    <div class="epub-reader__stage">
      <div class="epub-reader__zoom" :style="{ zoom: scale ?? 1 }">
        <div ref="viewerRef" class="epub-reader__viewer"></div>
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import ePub, { type Book, type Rendition } from 'epubjs'

const props = defineProps<{
  file: File
  scale?: number
}>()

const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
  zoom: [delta: number]
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const viewerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const currentPage = ref(1)
const pageTotal = ref(0)
const atStart = ref(true)
const atEnd = ref(false)

let book: Book | null = null
let rendition: Rendition | null = null
let resizeObserver: ResizeObserver | null = null
let originalAddEventListener: typeof window.addEventListener | null = null
let renderedWidth = 0
let renderedHeight = 0

const trackedDocs = new Set<Document>()

function currentScale() {
  const s = props.scale
  return typeof s === 'number' && s > 0 ? s : 1
}

function updatePageInfo(location: any) {
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

function attachToDoc(doc: Document) {
  if (trackedDocs.has(doc)) return
  trackedDocs.add(doc)
  doc.addEventListener('keydown', onDocKeyDown, true)
  doc.addEventListener('contextmenu', onDocContextMenu, true)
  doc.addEventListener('wheel', onDocWheel, { capture: true, passive: false })
}
function detachFromDoc(doc: Document) {
  if (!trackedDocs.has(doc)) return
  trackedDocs.delete(doc)
  doc.removeEventListener('keydown', onDocKeyDown, true)
  doc.removeEventListener('contextmenu', onDocContextMenu, true)
  doc.removeEventListener('wheel', onDocWheel, true)
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

onMounted(async () => {
  try {
    const data = await props.file.arrayBuffer()
    book = ePub(data)
    await book.ready

    const rect = viewerRef.value!.getBoundingClientRect()
    const scale = currentScale()
    const w = Math.max(1, Math.floor(rect.width / scale))
    const h = Math.max(1, Math.floor(rect.height / scale))
    renderedWidth = w
    renderedHeight = h

    installUnloadShim()
    rendition = book.renderTo(viewerRef.value!, {
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

    rendition.on('relocated', (location: any) => {
      atStart.value = location.atStart ?? false
      atEnd.value = location.atEnd ?? false
      updatePageInfo(location)
    })

    rendition.on('rendered', (_section: any, view: any) => {
      const doc = view?.document as Document | undefined
      if (doc) attachToDoc(doc)

      if (book && book.locations.length() === 0) {
        void book.locations.generate(200).then(() => {
          if (rendition) {
            const loc = rendition.currentLocation() as any
            updatePageInfo(loc)
          }
        })
      }
    })

    await rendition.display()
    loading.value = false
    await nextTick()
    uninstallUnloadShim()

    resizeObserver = new ResizeObserver(() => {
      if (rendition && viewerRef.value) {
        const s = currentScale()
        const rect = viewerRef.value.getBoundingClientRect()
        const width = Math.max(1, Math.floor(rect.width / s))
        const height = Math.max(1, Math.floor(rect.height / s))
        if (width === renderedWidth && height === renderedHeight) return
        renderedWidth = width
        renderedHeight = height
        rendition.resize(width, height)
      }
    })
    resizeObserver.observe(viewerRef.value!)
  } catch (e) {
    uninstallUnloadShim()
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  uninstallUnloadShim()
  for (const doc of trackedDocs) detachFromDoc(doc)
  trackedDocs.clear()
  resizeObserver?.disconnect()
  rendition?.destroy()
  book?.destroy()
})

function next() {
  rendition?.next()
}
function prev() {
  rendition?.prev()
}
function goToPage(page: number) {
  if (!book || !rendition || !pageTotal.value) return
  const target = Math.min(Math.max(Math.trunc(page), 1), pageTotal.value) - 1
  const cfi = book.locations.cfiFromLocation(target)
  if (cfi) rendition.display(cfi)
}

defineExpose({ next, prev, goToPage })
</script>

<style scoped>
.epub-reader {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #f3f4f6;
}
.epub-reader__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 12px;
  overflow: auto;
}
.epub-reader__zoom {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  justify-content: center;
}
.epub-reader__viewer {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 900px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
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
</style>
