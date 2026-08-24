<template>
  <div class="pdf-reader" ref="rootRef">
    <div v-if="loading" class="pdf-reader__placeholder">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="pdf-reader__placeholder pdf-reader__placeholder--error">
      {{ loadError }}
    </div>

    <div v-show="!loading && !loadError" class="pdf-reader__scroll" ref="scrollRef">
      <div
        v-for="p in pageSlots"
        :key="p.pageNum"
        class="pdf-reader__page"
        :data-page-num="p.pageNum"
        :style="{ height: p.placeholderHeight + 'px' }"
      >
        <div class="pdf-reader__page-inner">
          <canvas class="pdf-reader__canvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker

const props = defineProps<{
  objectUrl: string
  scale: number
}>()
const emit = defineEmits<{
  (event: 'page-change', page: number): void
  (event: 'page-count', count: number): void
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

interface PageSlot {
  pageNum: number
  placeholderHeight: number
}
const pageSlots = reactive<PageSlot[]>([])
const currentPageNum = ref(1)

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
const renderedPages = new Set<number>()
const pageVisibility = new Map<number, number>()
let renderObserver: IntersectionObserver | null = null
let pageTrackObserver: IntersectionObserver | null = null

onMounted(async () => {
  try {
    const task = pdfjsLib.getDocument({ url: props.objectUrl })
    loadingTask = task
    pdfDoc = await task.promise
    const numPages = pdfDoc.numPages
    const firstPage = await pdfDoc.getPage(1)
    const baseViewport = firstPage.getViewport({ scale: props.scale })
    for (let i = 1; i <= numPages; i++) {
      pageSlots.push({ pageNum: i, placeholderHeight: baseViewport.height })
    }
    emit('page-count', numPages)
    emit('page-change', currentPageNum.value)
    loading.value = false
    await nextTick()
    setupObservers()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  renderObserver?.disconnect()
  pageTrackObserver?.disconnect()
  loadingTask?.destroy().catch(() => {})
})

watch(() => props.scale, async () => {
  if (!pdfDoc) return
  renderedPages.clear()
  pageVisibility.clear()
  const firstPage = await pdfDoc.getPage(1)
  const vp = firstPage.getViewport({ scale: props.scale })
  pageSlots.forEach((s) => (s.placeholderHeight = vp.height))
  await nextTick()
  setupObservers()
})

function setupObservers() {
  renderObserver?.disconnect()
  pageTrackObserver?.disconnect()
  if (!scrollRef.value) return

  renderObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement
        const pageNum = Number(el.dataset.pageNum)
        if (!pageNum) return
        if (entry.isIntersecting) {
          void renderPage(pageNum)
        } else {
          cleanupPage(pageNum)
        }
      })
    },
    { root: scrollRef.value, rootMargin: '200px' },
  )

  pageTrackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const pageNum = Number((entry.target as HTMLElement).dataset.pageNum)
        if (!pageNum) return
        pageVisibility.set(pageNum, entry.isIntersecting ? entry.intersectionRatio : 0)
      })
      let bestPage = currentPageNum.value
      let bestRatio = 0
      pageVisibility.forEach((ratio, pageNum) => {
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestPage = pageNum
        }
      })
      if (bestPage !== currentPageNum.value) {
        currentPageNum.value = bestPage
        emit('page-change', bestPage)
      }
    },
    { root: scrollRef.value, threshold: [0.1, 0.25, 0.5, 0.75] },
  )

  const containers = scrollRef.value.querySelectorAll<HTMLElement>('.pdf-reader__page')
  containers.forEach((c) => {
    renderObserver!.observe(c)
    pageTrackObserver!.observe(c)
  })
}

async function renderPage(pageNum: number) {
  if (!pdfDoc || renderedPages.has(pageNum)) return
  renderedPages.add(pageNum)
  const slot = pageSlots.find((s) => s.pageNum === pageNum)
  if (!slot) return
  const container = scrollRef.value?.querySelector<HTMLElement>(
    `.pdf-reader__page[data-page-num="${pageNum}"]`,
  )
  const canvas = container?.querySelector<HTMLCanvasElement>('.pdf-reader__canvas')
  if (!container || !canvas) return

  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: props.scale })
    slot.placeholderHeight = viewport.height

    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = viewport.width + 'px'
    canvas.style.height = viewport.height + 'px'
    const renderTask = page.render({
      canvas,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    })
    await renderTask.promise
  } catch {
    renderedPages.delete(pageNum)
  }
}

function cleanupPage(pageNum: number) {
  const container = scrollRef.value?.querySelector<HTMLElement>(
    `.pdf-reader__page[data-page-num="${pageNum}"]`,
  )
  const canvas = container?.querySelector<HTMLCanvasElement>('.pdf-reader__canvas')
  if (canvas) {
    canvas.width = 0
    canvas.height = 0
  }
  renderedPages.delete(pageNum)
}

function goToPage(page: number) {
  const target = Math.min(Math.max(Math.trunc(page), 1), pageSlots.length)
  if (!target) return
  const pageEl = scrollRef.value?.querySelector<HTMLElement>(
    `.pdf-reader__page[data-page-num="${target}"]`,
  )
  if (!pageEl) return
  scrollRef.value!.scrollTop = pageEl.offsetTop
  currentPageNum.value = target
  emit('page-change', target)
}

defineExpose({ goToPage })
</script>

<style scoped>
.pdf-reader {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #525659;
}
.pdf-reader__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.pdf-reader__page {
  position: relative;
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: center;
}
.pdf-reader__page-inner {
  position: relative;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  background: #fff;
}
.pdf-reader__canvas {
  display: block;
}
.pdf-reader__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  font-size: 14px;
}
.pdf-reader__placeholder--error {
  color: #fca5a5;
}
</style>
