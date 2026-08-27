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
        <div v-if="hasSource && (isPdf || isEpub || isMobi)" class="rv-field rv-field--pages">
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

        <div v-if="hasSource && (isPdf || isEpub || isMobi)" class="rv-field rv-field--zoom">
          <button class="rv-btn rv-btn--sm" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="rv-zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button class="rv-btn rv-btn--sm" @click="zoomIn" :disabled="scale >= 3">+</button>
        </div>
      </div>
    </header>

    <!-- 无内容兜底 -->
    <div v-if="!hasSource" class="reader-view__empty">
      <p>{{ t('reader.noFile') }}</p>
      <button class="rv-btn rv-btn--primary" @click="goBack">{{ t('reader.back') }}</button>
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileWarning } from 'lucide-vue-next'
import PdfReader from '@/components/reader/PdfReader.vue'
import EpubReader from '@/components/reader/EpubReader.vue'
import MobiReader from '@/components/reader/MobiReader.vue'
import { useReaderFileStore } from '@/stores/reader'

const router = useRouter()
const { t } = useI18n()
const store = useReaderFileStore()

const file = computed(() => store.file)
const objectUrl = computed(() => store.objectUrl)
const isPdf = computed(() => store.format === 'pdf')
const isEpub = computed(() => store.format === 'epub')
const isMobi = computed(() => store.format === 'mobi')
const hasSource = computed(() => Boolean(store.file))
const headerTitle = computed(() => store.file?.name ?? '')

const scale = ref(1.2)
const pdfReaderRef = ref<InstanceType<typeof PdfReader> | null>(null)
const epubReaderRef = ref<InstanceType<typeof EpubReader> | null>(null)
const mobiReaderRef = ref<InstanceType<typeof MobiReader> | null>(null)
const currentPage = ref(1)
const pageCount = ref(0)
const pageInput = ref(1)

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
  if (!isPdf.value && !isEpub.value && !isMobi.value) return
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
  }
}
function prevPage() {
  if (isPdf.value) {
    goToPage(currentPage.value - 1)
  } else if (isEpub.value) {
    epubReaderRef.value?.prev()
  } else if (isMobi.value) {
    mobiReaderRef.value?.prev()
  }
}

function onKeyDown(e: KeyboardEvent) {
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
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'landing' })
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
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
.reader-view__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
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
