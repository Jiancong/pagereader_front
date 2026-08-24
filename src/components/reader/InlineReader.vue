<template>
  <div class="inline-reader" @contextmenu="onContextMenu">
    <!-- 顶部工具栏 -->
    <header class="inline-reader__toolbar">
      <button class="ir-btn" @click="$emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        {{ t('reader.back') }}
      </button>

      <div class="inline-reader__title" :title="file?.name ?? ''">{{ file?.name ?? '' }}</div>

      <div class="inline-reader__controls">
        <div v-if="format === 'pdf'" class="ir-field ir-field--pages">
          <button class="ir-btn ir-btn--sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
          <input
            v-model.number="pageInput"
            class="ir-page-input"
            type="number"
            min="1"
            :max="pageCount"
            :aria-label="t('reader.page')"
            @change="goToPage(pageInput)"
            @keyup.enter="goToPage(pageInput)"
          />
          <span class="ir-page-total">/ {{ pageCount || '—' }}</span>
          <button class="ir-btn ir-btn--sm" :disabled="!pageCount || currentPage >= pageCount" @click="goToPage(currentPage + 1)">›</button>
        </div>

        <div v-if="format === 'pdf'" class="ir-field ir-field--zoom">
          <button class="ir-btn ir-btn--sm" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="ir-zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button class="ir-btn ir-btn--sm" @click="zoomIn" :disabled="scale >= 3">+</button>
        </div>
      </div>
    </header>

    <!-- PDF 阅读器 -->
    <PdfReader
      v-if="format === 'pdf' && objectUrl"
      ref="pdfReaderRef"
      :object-url="objectUrl"
      :scale="scale"
      @page-change="onPageChange"
      @page-count="onPageCount"
    />

    <!-- EPUB 阅读器 -->
    <EpubReader
      v-else-if="format === 'epub' && file"
      ref="epubReaderRef"
      :file="file"
    />

    <!-- MOBI 暂不支持 -->
    <div v-else-if="format === 'mobi'" class="inline-reader__unsupported">
      <FileWarning class="inline-reader__unsupported-icon" />
      <p class="inline-reader__unsupported-title">{{ t('reader.mobiUnsupportedTitle') }}</p>
      <p class="inline-reader__unsupported-desc">{{ t('reader.mobiUnsupportedDesc') }}</p>
      <p v-if="file" class="inline-reader__unsupported-file">{{ file.name }}</p>
      <button class="ir-btn ir-btn--primary" @click="$emit('back')">{{ t('reader.back') }}</button>
    </div>

    <!-- 未知格式 -->
    <div v-else class="inline-reader__unsupported">
      <FileWarning class="inline-reader__unsupported-icon" />
      <p class="inline-reader__unsupported-title">{{ t('reader.unsupportedTitle') }}</p>
      <p v-if="file" class="inline-reader__unsupported-file">{{ file.name }}</p>
      <button class="ir-btn ir-btn--primary" @click="$emit('back')">{{ t('reader.back') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileWarning } from 'lucide-vue-next'
import PdfReader from '@/components/reader/PdfReader.vue'
import EpubReader from '@/components/reader/EpubReader.vue'
import type { ReaderFormat } from '@/stores/reader'

const props = defineProps<{
  file: File
  format: ReaderFormat | ''
  objectUrl: string
}>()

defineEmits<{ (event: 'back'): void }>()

const { t } = useI18n()

const scale = ref(1.2)
const pdfReaderRef = ref<InstanceType<typeof PdfReader> | null>(null)
const epubReaderRef = ref<InstanceType<typeof EpubReader> | null>(null)
const currentPage = ref(1)
const pageCount = ref(0)
const pageInput = ref(1)

function zoomIn() {
  scale.value = Math.min(3, +(scale.value + 0.2).toFixed(2))
}
function zoomOut() {
  scale.value = Math.max(0.5, +(scale.value - 0.2).toFixed(2))
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
  pdfReaderRef.value?.goToPage(target)
}
watch(currentPage, (page) => {
  pageInput.value = page
})

function nextPage() {
  if (props.format === 'pdf') {
    goToPage(currentPage.value + 1)
  } else if (props.format === 'epub') {
    epubReaderRef.value?.next()
  }
}
function prevPage() {
  if (props.format === 'pdf') {
    goToPage(currentPage.value - 1)
  } else if (props.format === 'epub') {
    epubReaderRef.value?.prev()
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

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (props.objectUrl) URL.revokeObjectURL(props.objectUrl)
})
</script>

<style scoped>
.inline-reader {
  display: flex;
  flex-direction: column;
  height: 70vh;
  min-height: 480px;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #3a3a3a;
}
.inline-reader__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  border-bottom: 1px solid #111827;
  flex-shrink: 0;
}
.inline-reader__title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inline-reader__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.ir-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.ir-field--zoom {
  gap: 4px;
}
.ir-field--pages {
  gap: 5px;
}
.ir-page-input {
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
.ir-page-total {
  min-width: 32px;
  color: #d1d5db;
  font-size: 12px;
}
.ir-zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.ir-btn {
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
.ir-btn:hover:not(:disabled) {
  background: #1f2937;
}
.ir-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ir-btn--sm {
  padding: 2px 8px;
  font-size: 14px;
}
.ir-btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.inline-reader__unsupported {
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
.inline-reader__unsupported-icon {
  width: 56px;
  height: 56px;
  color: #9ca3af;
}
.inline-reader__unsupported-title {
  font-size: 16px;
  font-weight: 600;
  color: #f3f4f6;
}
.inline-reader__unsupported-desc {
  max-width: 480px;
  font-size: 13px;
  line-height: 1.6;
  color: #9ca3af;
}
.inline-reader__unsupported-file {
  font-size: 13px;
  color: #d1d5db;
  word-break: break-all;
}
</style>
