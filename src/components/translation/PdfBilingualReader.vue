<template>
  <div class="pdf-bilingual-reader" ref="rootRef">
    <div v-if="loading" class="pdf-bilingual-reader__placeholder">
      {{ t('translate.loadingDoc') }}
    </div>
    <div v-else-if="loadError" class="pdf-bilingual-reader__placeholder pdf-bilingual-reader__placeholder--error">
      {{ loadError }}
    </div>

    <div v-show="!loading && !loadError" class="pdf-bilingual-reader__split">
      <!-- 左：原文 -->
      <div class="pdf-bilingual-reader__pane" ref="origScrollRef">
        <div class="pdf-bilingual-reader__pane-label">{{ t('translate.original') }}</div>
        <div
          v-for="p in pageSlots"
          :key="'o' + p.pageNum"
          class="pdf-page"
          :data-page-num="p.pageNum"
          :style="{ height: p.placeholderHeight + 'px' }"
        >
          <div class="pdf-page__inner">
            <canvas class="pdf-page__canvas"></canvas>
            <div class="pdf-page__textlayer"></div>
          </div>
        </div>
      </div>

      <!-- 右：译文 -->
      <div class="pdf-bilingual-reader__pane" ref="transScrollRef">
        <div class="pdf-bilingual-reader__pane-label pdf-bilingual-reader__pane-label--trans">{{ t('translate.translation') }}</div>
        <div
          v-for="p in pageSlots"
          :key="'t' + p.pageNum"
          class="pdf-page pdf-page--trans"
          :data-page-num="p.pageNum"
          :style="{ height: p.placeholderHeight + 'px' }"
        >
          <div class="pdf-page__inner pdf-page__inner--trans">
            <div class="pdf-page__translationlayer"></div>
            <div v-if="p.translating" class="pdf-page__badge">{{ t('translate.translating') }}</div>
            <div v-else-if="p.translateError" class="pdf-page__badge pdf-page__badge--error">{{ t('translate.error') }}</div>
          </div>
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
const origScrollRef = ref<HTMLElement | null>(null)
const transScrollRef = ref<HTMLElement | null>(null)
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
const currentPageNum = ref(1)

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
const pageMap = new Map<number, { viewport: pdfjsLib.PageViewport; lines: PdfLine[]; translations: string[] }>()
const renderedPages = new Set<number>()
const pageVisibility = new Map<number, number>()
let renderObserver: IntersectionObserver | null = null
let pageTrackObserver: IntersectionObserver | null = null
let syncingScroll = false

onMounted(async () => {
  try {
    fileHash.value = await computeFileHash(props.file)
    const task = pdfjsLib.getDocument({ url: props.objectUrl })
    loadingTask = task
    pdfDoc = await task.promise
    const numPages = pdfDoc.numPages
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
    setupObservers()
    setupScrollSync()
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

watch(() => props.targetLang, () => {
  pageSlots.forEach((slot) => {
    slot.translating = false
    slot.translateError = false
  })
  void translateCurrentPage()
})

watch(currentPageNum, (pageNum) => {
  pageSlots.forEach((slot) => {
    if (slot.pageNum !== pageNum) {
      slot.translating = false
      slot.translateError = false
    }
  })
  clearNonCurrentTranslationLayers()
  void translateCurrentPage()
})

watch(() => props.scale, async () => {
  if (!pdfDoc) return
  renderedPages.clear()
  pageMap.clear()
  pageVisibility.clear()
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
  setupObservers()
  void translateCurrentPage()
})

watch(() => props.showOriginal, () => {
  document
    .querySelectorAll<HTMLCanvasElement>('.pdf-page__canvas')
    .forEach((c) => {
      c.style.visibility = props.showOriginal ? 'visible' : 'hidden'
    })
})

function setupScrollSync() {
  const orig = origScrollRef.value
  const trans = transScrollRef.value
  if (!orig || !trans) return
  orig.addEventListener('scroll', () => {
    if (syncingScroll) return
    syncingScroll = true
    trans.scrollTop = orig.scrollTop
    requestAnimationFrame(() => { syncingScroll = false })
  })
  trans.addEventListener('scroll', () => {
    if (syncingScroll) return
    syncingScroll = true
    orig.scrollTop = trans.scrollTop
    requestAnimationFrame(() => { syncingScroll = false })
  })
}

function clearNonCurrentTranslationLayers() {
  if (!transScrollRef.value) return
  transScrollRef.value.querySelectorAll<HTMLElement>('.pdf-page').forEach((container) => {
    const pageNum = Number(container.dataset.pageNum)
    if (pageNum === currentPageNum.value) return
    const transLayer = container.querySelector<HTMLElement>('.pdf-page__translationlayer')
    if (transLayer) transLayer.innerHTML = ''
  })
}

function setupObservers() {
  renderObserver?.disconnect()
  pageTrackObserver?.disconnect()
  if (!origScrollRef.value) return

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
    { root: origScrollRef.value, rootMargin: '200px' },
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
      if (bestRatio > 0 && bestPage !== currentPageNum.value) {
        currentPageNum.value = bestPage
      }
    },
    { root: origScrollRef.value, threshold: [0, 0.25, 0.5, 0.75, 1] },
  )

  const containers = origScrollRef.value.querySelectorAll<HTMLElement>('.pdf-page')
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
  const container = origScrollRef.value?.querySelector<HTMLElement>(
    `.pdf-page[data-page-num="${pageNum}"]`,
  )
  if (!container) return
  const canvas = container.querySelector<HTMLCanvasElement>('.pdf-page__canvas')
  const textLayer = container.querySelector<HTMLElement>('.pdf-page__textlayer')
  if (!canvas || !textLayer) return

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

    const textContent = await page.getTextContent()
    const items = textContent.items as unknown as PdfTextItem[]
    const lines = reconstructLines(items)
    const entry = pageMap.get(pageNum)!
    entry.lines = lines

    textLayer.style.width = viewport.width + 'px'
    textLayer.style.height = viewport.height + 'px'
    textLayer.innerHTML = ''
    lines.forEach((line) => {
      const span = document.createElement('span')
      span.textContent = line.text
      span.style.position = 'absolute'
      span.style.left = line.x * props.scale + 'px'
      span.style.top = viewport.height - line.y * props.scale + 'px'
      span.style.fontSize = Math.max(8, line.height * props.scale * 0.9) + 'px'
      span.style.whiteSpace = 'nowrap'
      span.style.color = 'transparent'
      textLayer!.appendChild(span)
    })

    slot.rendered = true

    syncTransPageSize(pageNum, viewport)

    if (pageNum === currentPageNum.value) {
      void translateCurrentPage()
    }
  } catch {
    slot.translateError = true
  }
}

function syncTransPageSize(pageNum: number, viewport: pdfjsLib.PageViewport) {
  const transInner = transScrollRef.value?.querySelector<HTMLElement>(
    `.pdf-page[data-page-num="${pageNum}"] .pdf-page__inner`,
  )
  if (!transInner) return
  transInner.style.width = viewport.width + 'px'
  transInner.style.height = viewport.height + 'px'
}

function lineFontSize(line: PdfLine): number {
  return Math.max(8, line.height * props.scale * 0.9)
}

function isLineCentered(line: PdfLine, pageWidth: number): boolean {
  const mid = (line.x + line.width / 2) * props.scale
  return Math.abs(mid - pageWidth / 2) < pageWidth * 0.1
}

function fontFamilyForLang(lang: string): string {
  if (lang === 'zh') return '"Noto Serif SC", "Songti SC", "SimSun", serif'
  if (lang === 'ja') return '"Noto Serif JP", "Yu Mincho", serif'
  if (lang === 'ar') return '"Noto Naskh Arabic", "Noto Sans Arabic", serif'
  if (lang === 'hi') return '"Noto Serif Devanagari", "Noto Sans Devanagari", serif'
  return '"Noto Serif", "Times New Roman", Times, serif'
}

function fitFontSize(text: string, fontSize: number, maxWidth: number, fontFamily: string): number {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context || maxWidth <= 0) return fontSize

  context.font = `${fontSize}px ${fontFamily}`
  const width = context.measureText(text).width
  return width > maxWidth ? Math.max(6, fontSize * (maxWidth / width)) : fontSize
}

async function translateCurrentPage() {
  const pageNum = currentPageNum.value
  const slot = pageSlots.find((s) => s.pageNum === pageNum)
  const entry = pageMap.get(pageNum)
  if (!slot || !entry || !entry.lines.length || !props.targetLang) return

  const container = transScrollRef.value?.querySelector<HTMLElement>(
    `.pdf-page[data-page-num="${pageNum}"]`,
  )
  const transLayer = container?.querySelector<HTMLElement>('.pdf-page__translationlayer')
  if (!transLayer) return

  syncTransPageSize(pageNum, entry.viewport)
  await translatePage(pageNum, entry.lines, transLayer, entry.viewport)
}

const CACHE_SCHEMA = 'v3'

function cacheMatchesTexts(cached: { lines: string[]; translations: string[] }, texts: string[]): boolean {
  if (cached.translations.length !== texts.length || cached.lines.length !== texts.length) return false
  return cached.lines.every((line, i) => line === texts[i])
}

async function translatePage(
  pageNum: number,
  lines: PdfLine[],
  transLayer: HTMLElement,
  viewport: pdfjsLib.PageViewport,
) {
  const slot = pageSlots.find((s) => s.pageNum === pageNum)
  if (!slot || pageNum !== currentPageNum.value) return

  const translatable = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.text.trim().length > 0)
  const texts = translatable.map(({ line }) => line.text)

  if (texts.length === 0 || !props.targetLang) {
    transLayer.innerHTML = ''
    slot.translateError = false
    return
  }

  const key = `${buildCacheKey(fileHash.value, pageNum, props.targetLang)}:${CACHE_SCHEMA}`
  const cached = await getCachedTranslation(key)
  if (cached && cacheMatchesTexts(cached, texts)) {
    slot.translateError = false
    renderTranslations(translatable, cached.translations, transLayer, viewport)
    const entry = pageMap.get(pageNum)
    if (entry) entry.translations = cached.translations
    return
  }

  slot.translating = true
  slot.translateError = false
  try {
    const res = await translateBatch({ texts, targetLang: props.targetLang })
    const translations = res.translations ?? []
    if (translations.length !== texts.length) {
      throw new Error('translation length mismatch')
    }
    await putCachedTranslation(key, { lines: texts, translations, ts: Date.now() })
    const entry = pageMap.get(pageNum)
    if (entry) entry.translations = translations
    renderTranslations(translatable, translations, transLayer, viewport)
  } catch {
    slot.translateError = true
    transLayer.innerHTML = ''
  } finally {
    slot.translating = false
  }
}

function renderTranslations(
  translatable: Array<{ line: PdfLine; index: number }>,
  translations: string[],
  transLayer: HTMLElement,
  viewport: pdfjsLib.PageViewport,
) {
  transLayer.innerHTML = ''
  transLayer.style.width = viewport.width + 'px'
  transLayer.style.height = viewport.height + 'px'

  const fontFamily = fontFamilyForLang(props.targetLang)

  translatable.forEach(({ line }, idx) => {
    const tr = translations[idx]
    if (!tr || !tr.trim()) return

    const x = line.x * props.scale
    const width = Math.max(line.width * props.scale, 40)
    const top = viewport.height - line.y * props.scale
    const centered = isLineCentered(line, viewport.width)
    const baseFontSize = lineFontSize(line)
    const fontSize = fitFontSize(tr, baseFontSize, width, fontFamily)
    const span = document.createElement('span')
    span.textContent = tr
    span.style.position = 'absolute'
    span.style.left = x + 'px'
    span.style.top = top + 'px'
    span.style.width = width + 'px'
    span.style.fontSize = fontSize + 'px'
    span.style.lineHeight = '1'
    span.style.fontFamily = fontFamily
    span.style.color = '#000'
    span.style.fontWeight = 'normal'
    span.style.display = 'block'

    if (centered) {
      span.style.textAlign = 'center'
    } else {
      span.style.textAlign = 'left'
    }
    // Preserve the source line box: long translations shrink instead of wrapping
    // onto the next source line.
    span.style.whiteSpace = 'nowrap'

    if (props.targetLang === 'ar') {
      span.style.direction = 'rtl'
    }

    transLayer.appendChild(span)
  })
}

function cleanupPage(pageNum: number) {
  const container = origScrollRef.value?.querySelector<HTMLElement>(
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
.pdf-bilingual-reader__split {
  display: flex;
  height: 100%;
  width: 100%;
}
.pdf-bilingual-reader__pane {
  flex: 1 1 50%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 8px 12px 12px;
  position: relative;
}
.pdf-bilingual-reader__pane:nth-child(2) {
  padding: 12px 12px 12px 8px;
}
.pdf-bilingual-reader__pane-label {
  position: sticky;
  top: 0;
  z-index: 5;
  align-self: center;
  margin-bottom: 4px;
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  pointer-events: none;
}
.pdf-bilingual-reader__pane-label--trans {
  background: rgba(30, 58, 138, 0.85);
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
.pdf-page__inner--trans {
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
  pointer-events: auto;
  user-select: text;
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
