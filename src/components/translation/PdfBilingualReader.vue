<template>
  <div class="pdf-bilingual-reader" ref="rootRef">
    <div v-if="loading" class="pdf-bilingual-reader__placeholder">
      {{ t('translate.loadingDoc') }}
    </div>
    <div v-else-if="loadError" class="pdf-bilingual-reader__placeholder pdf-bilingual-reader__placeholder--error">
      {{ loadError }}
    </div>

    <div v-show="!loading && !loadError" class="pdf-bilingual-reader__scroll" ref="scrollRef">
      <div
        v-for="p in pageSlots"
        :key="p.pageNum"
        class="pdf-page"
        :data-page-num="p.pageNum"
        :style="{ height: p.placeholderHeight + 'px' }"
      >
        <div class="pdf-page__inner">
          <canvas class="pdf-page__canvas"></canvas>
          <div class="pdf-page__textlayer"></div>
          <div class="pdf-page__translationlayer" v-show="targetLang"></div>
          <div v-if="p.translating" class="pdf-page__badge">{{ t('translate.translating') }}</div>
          <div v-else-if="p.translateError" class="pdf-page__badge pdf-page__badge--error">{{ t('translate.error') }}</div>
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
import { reconstructLines, type PdfLine, type PdfTextItem } from '@/utils/pdfTextReconstruct'
import {
  computeFileHash,
  buildCacheKey,
  getCachedTranslation,
  putCachedTranslation,
} from '@/utils/translationCache'
import { translateBatch } from '@/api/translation'

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker

const props = defineProps<{
  file: File
  objectUrl: string
  targetLang: string
  showOriginal: boolean
  scale: number
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const fileHash = ref('')

interface PageSlot {
  pageNum: number
  placeholderHeight: number
  rendered: boolean
  translating: boolean
  translateError: boolean
}
const pageSlots = reactive<PageSlot[]>([])

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
const pageMap = new Map<number, { viewport: pdfjsLib.PageViewport; lines: PdfLine[]; translations: string[] }>()
const renderedPages = new Set<number>()
let observer: IntersectionObserver | null = null

onMounted(async () => {
  try {
    fileHash.value = await computeFileHash(props.file)
    const task = pdfjsLib.getDocument({ url: props.objectUrl })
    loadingTask = task
    pdfDoc = await task.promise
    const numPages = pdfDoc.numPages
    // 先用默认 viewport 占位高度，避免滚动跳动
    const firstPage = await pdfDoc.getPage(1)
    const baseViewport = firstPage.getViewport({ scale: props.scale })
    const placeholderHeight = baseViewport.height
    for (let i = 1; i <= numPages; i++) {
      pageSlots.push({
        pageNum: i,
        placeholderHeight,
        rendered: false,
        translating: false,
        translateError: false,
      })
    }
    pageMap.set(1, { viewport: baseViewport, lines: [], translations: [] })
    loading.value = false
    await nextTick()
    setupObserver()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  loadingTask?.destroy().catch(() => {})
})

watch(() => props.scale, async () => {
  if (!pdfDoc) return
  // 重置已渲染页，触发重新渲染
  renderedPages.clear()
  pageMap.clear()
  const firstPage = await pdfDoc.getPage(1)
  const vp = firstPage.getViewport({ scale: props.scale })
  const ph = vp.height
  pageSlots.forEach((s) => {
    s.placeholderHeight = ph
    s.rendered = false
    s.translating = false
    s.translateError = false
  })
  pageMap.set(1, { viewport: vp, lines: [], translations: [] })
  await nextTick()
  setupObserver()
})

watch(() => props.showOriginal, () => {
  // 切换原文显示：仅切 canvas 可见性，译文层不变
  document
    .querySelectorAll<HTMLCanvasElement>('.pdf-page__canvas')
    .forEach((c) => {
      c.style.visibility = props.showOriginal ? 'visible' : 'hidden'
    })
})

function setupObserver() {
  observer?.disconnect()
  if (!scrollRef.value) return
  observer = new IntersectionObserver(
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
  const containers = scrollRef.value.querySelectorAll<HTMLElement>('.pdf-page')
  containers.forEach((c) => observer!.observe(c))
}

async function renderPage(pageNum: number) {
  if (!pdfDoc || renderedPages.has(pageNum)) return
  renderedPages.add(pageNum)
  const slot = pageSlots.find((s) => s.pageNum === pageNum)
  if (!slot) return
  const container = scrollRef.value?.querySelector<HTMLElement>(
    `.pdf-page[data-page-num="${pageNum}"]`,
  )
  if (!container) return
  const canvas = container.querySelector<HTMLCanvasElement>('.pdf-page__canvas')
  const textLayer = container.querySelector<HTMLElement>('.pdf-page__textlayer')
  const transLayer = container.querySelector<HTMLElement>('.pdf-page__translationlayer')
  if (!canvas || !textLayer || !transLayer) return

  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: props.scale })
    slot.placeholderHeight = viewport.height
    pageMap.set(pageNum, { viewport, lines: [], translations: [] })

    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = viewport.width + 'px'
    canvas.style.height = viewport.height + 'px'
    canvas.style.visibility = props.showOriginal ? 'visible' : 'hidden'
    const renderTask = page.render({
      canvas,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    })
    await renderTask.promise

    // 取文本并重建行
    const textContent = await page.getTextContent()
    const items = textContent.items as unknown as PdfTextItem[]
    const lines = reconstructLines(items)
    const entry = pageMap.get(pageNum)!
    entry.lines = lines

    // 渲染原文 textLayer（透明，便于复制）
    textLayer.style.width = viewport.width + 'px'
    textLayer.style.height = viewport.height + 'px'
    textLayer.innerHTML = ''
    lines.forEach((line) => {
      const span = document.createElement('span')
      span.textContent = line.text
      span.style.position = 'absolute'
      // PDF 坐标系 y 向上，DOM y 向下，需翻转
      span.style.left = line.x + 'px'
      span.style.top = viewport.height - line.y + 'px'
      span.style.fontSize = Math.max(8, line.height * props.scale * 0.9) + 'px'
      span.style.whiteSpace = 'nowrap'
      span.style.color = 'transparent'
      textLayer!.appendChild(span)
    })

    slot.rendered = true

    // 翻译
    void translatePage(pageNum, lines, transLayer, viewport)
  } catch (e) {
    slot.translateError = true
  }
}

async function translatePage(
  pageNum: number,
  lines: PdfLine[],
  transLayer: HTMLElement,
  viewport: pdfjsLib.PageViewport,
) {
  const slot = pageSlots.find((s) => s.pageNum === pageNum)
  if (!slot) return
  const texts = lines.map((l) => l.text).filter((s) => s.trim().length > 0)
  if (texts.length === 0 || !props.targetLang) {
    transLayer.innerHTML = ''
    return
  }
  const key = buildCacheKey(fileHash.value, pageNum, props.targetLang)
  // 缓存命中
  const cached = await getCachedTranslation(key)
  if (cached && cached.translations.length === texts.length) {
    renderTranslations(lines, cached.translations, transLayer, viewport)
    return
  }
  slot.translating = true
  try {
    const res = await translateBatch({
      texts,
      targetLang: props.targetLang,
    })
    const translations = res.translations ?? []
    if (translations.length !== texts.length) {
      throw new Error('translation length mismatch')
    }
    void putCachedTranslation(key, {
      lines: texts,
      translations,
      ts: Date.now(),
    })
    const entry = pageMap.get(pageNum)
    if (entry) entry.translations = translations
    renderTranslations(lines, translations, transLayer, viewport)
  } catch (e) {
    slot.translateError = true
  } finally {
    slot.translating = false
  }
}

function renderTranslations(
  lines: PdfLine[],
  translations: string[],
  transLayer: HTMLElement,
  viewport: pdfjsLib.PageViewport,
) {
  transLayer.innerHTML = ''
  transLayer.style.width = viewport.width + 'px'
  transLayer.style.height = viewport.height + 'px'
  const fontSize = Math.max(7, 9 * props.scale)
  lines.forEach((line, idx) => {
    const tr = translations[idx]
    if (!tr || !tr.trim()) return
    const span = document.createElement('span')
    span.textContent = tr
    span.style.position = 'absolute'
    span.style.left = line.x + 'px'
    // 译文叠在原文行下方
    span.style.top = viewport.height - line.y + line.height * props.scale + 'px'
    span.style.maxWidth = viewport.width - line.x + 'px'
    span.style.fontSize = fontSize + 'px'
    span.style.lineHeight = '1.25'
    span.style.whiteSpace = 'normal'
    span.style.wordBreak = 'break-word'
    span.style.background = 'rgba(255,255,255,0.92)'
    span.style.color = '#1a1a1a'
    span.style.padding = '0 2px'
    span.style.borderRadius = '2px'
    transLayer.appendChild(span)
  })
}

function cleanupPage(pageNum: number) {
  // 离开视口释放 canvas 内存，保留译文缓存
  const container = scrollRef.value?.querySelector<HTMLElement>(
    `.pdf-page[data-page-num="${pageNum}"]`,
  )
  const canvas = container?.querySelector<HTMLCanvasElement>('.pdf-page__canvas')
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }
  renderedPages.delete(pageNum)
}
</script>

<style scoped>
.pdf-bilingual-reader {
  height: 100%;
  width: 100%;
  background: #525659;
  overflow: hidden;
}
.pdf-bilingual-reader__scroll {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;
}
.pdf-bilingual-reader__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #e4e4e7;
  font-size: 14px;
}
.pdf-bilingual-reader__placeholder--error {
  color: #fca5a5;
}
.pdf-page {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}
.pdf-page__inner {
  position: relative;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  background: #fff;
}
.pdf-page__canvas {
  display: block;
  position: relative;
  z-index: 1;
}
.pdf-page__textlayer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: auto;
  user-select: text;
}
.pdf-page__translationlayer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.pdf-page__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  pointer-events: none;
}
.pdf-page__badge--error {
  background: rgba(220, 38, 38, 0.85);
}
</style>
