<template>
  <div class="reader-view" @contextmenu="onContextMenu" @wheel="onWheel">
    <!-- 顶部工具栏 -->
    <header class="reader-view__toolbar">
      <button class="rv-btn" @click="goBack">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        {{ t('reader.back') }}
      </button>

      <div class="reader-view__title" :title="headerTitle">{{ headerTitle }}</div>

      <div class="reader-view__controls">
        <div v-if="hasSource && (isPdf || isEpub || isMobi || isXlsx)" class="rv-field rv-field--pages">
          <button class="rv-btn rv-btn--sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
          <input
            v-model.number="pageInput"
            class="rv-page-input"
            type="number"
            min="1"
            :max="pageCount"
            :aria-label="t('reader.page')"
            @change="goToPage(pageInput)"
            @keyup.enter="goToPage(pageInput)"
          />
          <span class="rv-page-total">/ {{ pageCount || '—' }}</span>
          <button class="rv-btn rv-btn--sm" :disabled="!pageCount || currentPage >= pageCount" @click="goToPage(currentPage + 1)">›</button>
        </div>

        <div v-if="hasSource && (isPdf || isEpub || isMobi || isXlsx)" class="rv-field rv-field--zoom">
          <button class="rv-btn rv-btn--sm" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="rv-zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button class="rv-btn rv-btn--sm" @click="zoomIn" :disabled="scale >= 3">+</button>
        </div>

        <button
          v-if="canTts"
          class="rv-btn rv-btn--sm rv-btn--tts"
          :class="{ 'rv-btn--tts-active': speaking && !paused, 'rv-btn--loading': ttsLoading }"
          :disabled="ttsLoading || ttsBusy"
          :title="ttsLoading ? t('reader.ttsLoading') : (speaking ? (paused ? t('reader.ttsResume') : t('reader.ttsPause')) : t('reader.ttsStart'))"
          @click="onToggleTts"
        >
          <Loader2 v-if="ttsLoading" class="h-4 w-4 animate-spin" />
          <Pause v-else-if="speaking && !paused" class="h-4 w-4" />
          <Play v-else-if="paused" class="h-4 w-4" />
          <Volume2 v-else class="h-4 w-4" />
          <span class="rv-btn--tts-label">{{ ttsLoading ? t('reader.ttsLoading') : (speaking ? (paused ? t('reader.ttsResume') : t('reader.ttsPause')) : t('reader.ttsStart')) }}</span>
        </button>
      </div>
    </header>

    <!-- 无文件：回阅读中心 -->
    <div v-if="!hasSource" class="reader-view__empty">
      <p>{{ t('reader.noFile') }}</p>
      <button class="rv-btn rv-btn--primary" @click="goBack">{{ t('reader.backToHub') }}</button>
    </div>

    <!-- PDF 阅读器 -->
    <PdfReader
      v-else-if="isPdf"
      ref="pdfReaderRef"
      :object-url="objectUrl"
      :scale="scale"
      @page-change="onPageChange"
      @page-count="onPageCount"
    />

    <!-- EPUB 阅读器 -->
    <EpubReader
      v-else-if="isEpub && file"
      ref="epubReaderRef"
      :file="file"
      :scale="scale"
      @page-change="onPageChange"
      @page-count="onPageCount"
      @zoom="applyZoomDelta"
    />

    <!-- MOBI 阅读器 -->
    <MobiReader
      v-else-if="isMobi && file"
      ref="mobiReaderRef"
      :file="file"
      :scale="scale"
      @page-change="onPageChange"
      @page-count="onPageCount"
      @zoom="applyZoomDelta"
    />

    <!-- XLSX 阅读器 -->
    <XlsxReader
      v-else-if="isXlsx && file"
      ref="xlsxReaderRef"
      :file="file"
      :scale="scale"
      @page-change="onPageChange"
      @page-count="onPageCount"
    />

    <!-- 未知格式 -->
    <div v-else class="reader-view__unsupported">
      <FileWarning class="reader-view__unsupported-icon" />
      <p class="reader-view__unsupported-title">{{ t('reader.unsupportedTitle') }}</p>
      <p v-if="file" class="reader-view__unsupported-file">{{ file.name }}</p>
      <button class="rv-btn rv-btn--primary" @click="goBack">{{ t('reader.back') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileWarning, Volume2, Pause, Play, Loader2 } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import PdfReader from '@/components/reader/PdfReader.vue'
import EpubReader from '@/components/reader/EpubReader.vue'
import MobiReader from '@/components/reader/MobiReader.vue'
import { useReaderFileStore } from '@/stores/reader'
import { useBrowserTts } from '@/composables/useBrowserTts'

const XlsxReader = defineAsyncComponent(() => import('@/components/reader/XlsxReader.vue'))

const router = useRouter()
const { t } = useI18n()
const store = useReaderFileStore()

const file = computed(() => store.file)
const objectUrl = computed(() => store.objectUrl)
const isPdf = computed(() => store.format === 'pdf')
const isEpub = computed(() => store.format === 'epub')
const isMobi = computed(() => store.format === 'mobi')
const isXlsx = computed(() => store.format === 'xlsx')
const hasSource = computed(() => Boolean(store.file))
const headerTitle = computed(() => store.file?.name ?? '')

const scale = ref(1.2)
const pdfReaderRef = ref<InstanceType<typeof PdfReader> | null>(null)
const epubReaderRef = ref<InstanceType<typeof EpubReader> | null>(null)
const mobiReaderRef = ref<InstanceType<typeof MobiReader> | null>(null)
const xlsxReaderRef = ref<InstanceType<typeof XlsxReader> | null>(null)
const currentPage = ref(1)
const pageCount = ref(0)
const pageInput = ref(1)

const { speaking, paused, supported: ttsSupported, speak: ttsSpeak, pause: ttsPause, resume: ttsResume, stop: stopTts } = useBrowserTts()

const ttsLoading = ref(false)
const ttsBusy = ref(false)

const canTts = computed(() => ttsSupported && hasSource.value && (isPdf.value || isEpub.value || isMobi.value))

async function getCurrentPageText(): Promise<string> {
  if (isPdf.value) return (await pdfReaderRef.value?.getPageText?.()) || ''
  if (isEpub.value) return epubReaderRef.value?.getPageText?.() || ''
  if (isMobi.value) return mobiReaderRef.value?.getPageText?.() || ''
  return ''
}

async function onToggleTts() {
  if (!canTts.value || ttsBusy.value) return

  // 浏览器不支持 speechSynthesis
  if (!ttsSupported) {
    ElMessage.warning(t('reader.ttsUnsupported'))
    return
  }

  // 正在朗读且未暂停 → 暂停
  if (speaking.value && !paused.value) {
    ttsPause()
    return
  }
  // 暂停中 → 继续
  if (paused.value) {
    ttsResume()
    return
  }
  // 未开始 → 提取当前页文本并朗读
  ttsBusy.value = true
  ttsLoading.value = true
  try {
    const text = await getCurrentPageText()
    if (!text || !text.trim()) {
      ElMessage.warning(t('reader.ttsNoText'))
      return
    }
    ttsSpeak(text, {
      lang: 'zh-CN',
      onEnd: () => {
        // 读完当前页自动翻到下一页并继续
        if (currentPage.value < pageCount.value) {
          nextPage()
          setTimeout(async () => {
            const nextText = await getCurrentPageText()
            if (nextText && nextText.trim()) ttsSpeak(nextText, { lang: 'zh-CN' })
          }, 600)
        }
      },
    })
    // 确认 speechSynthesis 确实开始
    if (!speaking.value) {
      ElMessage.warning(t('reader.ttsNoText'))
    }
  } catch {
    ElMessage.error(t('reader.ttsError'))
  } finally {
    ttsLoading.value = false
    // 短暂锁防止抖动（双击/快速连点）
    setTimeout(() => {
      ttsBusy.value = false
    }, 400)
  }
}

function clampScale(value: number) {
  return Math.min(3, Math.max(0.5, +value.toFixed(2)))
}
function zoomIn() {
  scale.value = clampScale(scale.value + 0.2)
}
function zoomOut() {
  scale.value = clampScale(scale.value - 0.2)
}
function applyZoomDelta(delta: number) {
  scale.value = clampScale(scale.value + delta)
}
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  if (!isPdf.value && !isEpub.value && !isMobi.value && !isXlsx.value) return
  e.preventDefault()
  applyZoomDelta(e.deltaY > 0 ? -0.1 : 0.1)
}
function onPageChange(page: number) {
  currentPage.value = page
}
function onPageCount(count: number) {
  pageCount.value = count
}
function goToPage(page: number) {
  if (!Number.isFinite(page) || !pageCount.value) return
  const target = Math.min(Math.max(Math.trunc(page), 1), pageCount.value)
  pageInput.value = target
  if (isPdf.value) {
    pdfReaderRef.value?.goToPage(target)
  } else if (isEpub.value) {
    epubReaderRef.value?.goToPage(target)
  } else if (isMobi.value) {
    mobiReaderRef.value?.goToPage(target)
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.goToPage(target)
  }
}
watch(currentPage, (page) => {
  pageInput.value = page
})

function nextPage() {
  if (isPdf.value) {
    goToPage(currentPage.value + 1)
  } else if (isEpub.value) {
    epubReaderRef.value?.next()
  } else if (isMobi.value) {
    mobiReaderRef.value?.next()
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.next()
  }
}
function prevPage() {
  if (isPdf.value) {
    goToPage(currentPage.value - 1)
  } else if (isEpub.value) {
    epubReaderRef.value?.prev()
  } else if (isMobi.value) {
    mobiReaderRef.value?.prev()
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.prev()
  }
}

function onKeyDown(e: KeyboardEvent) {
  // XLSX uses arrow keys for in-cell cursor and cell navigation while editing.
  if (isXlsx.value) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextPage()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prevPage()
  }
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  nextPage()
}

function goBack() {
  router.push({ name: 'reader' })
}

onMounted(() => {
  if (!store.file) {
    router.replace({ name: 'reader' })
    return
  }
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  stopTts()
  store.revoke()
})
</script>

<style scoped>
.reader-view {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: #3a3a3a;
}
.reader-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  border-bottom: 1px solid #111827;
  flex-shrink: 0;
}
.reader-view__title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reader-view__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.rv-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.rv-field--zoom {
  gap: 4px;
}
.rv-field--pages {
  gap: 5px;
}
.rv-page-input {
  width: 42px;
  padding: 3px 4px;
  border: 1px solid #374151;
  border-radius: 4px;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  text-align: center;
  outline: none;
}
.rv-page-total {
  min-width: 32px;
  color: #d1d5db;
  font-size: 12px;
}
.rv-zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.rv-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.rv-btn:hover:not(:disabled) {
  background: #1f2937;
}
.rv-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rv-btn--sm {
  padding: 2px 8px;
  font-size: 14px;
}
.rv-btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.rv-btn--tts {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  min-width: 92px;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.rv-btn--tts:hover:not(:disabled) {
  background: #1f2937;
}
.rv-btn--tts:disabled {
  opacity: 0.6;
  cursor: progress;
}
.rv-btn--tts-loading {
  cursor: progress;
}
.rv-btn--tts-active {
  border-color: #6366f1;
  color: #a5b4fc;
}
.rv-btn--tts-label {
  white-space: nowrap;
}
.reader-view__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 16px;
  color: #d1d5db;
  font-size: 14px;
}
.reader-view__unsupported {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: #d1d5db;
}
.reader-view__unsupported-icon {
  width: 56px;
  height: 56px;
  color: #9ca3af;
}
.reader-view__unsupported-title {
  font-size: 16px;
  font-weight: 600;
  color: #f3f4f6;
}
.reader-view__unsupported-desc {
  max-width: 480px;
  font-size: 13px;
  line-height: 1.6;
  color: #9ca3af;
}
.reader-view__unsupported-file {
  font-size: 13px;
  color: #d1d5db;
  word-break: break-all;
}
</style>
