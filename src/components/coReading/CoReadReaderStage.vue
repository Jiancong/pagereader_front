<template>
  <div class="co-read-reader-stage flex min-h-0 flex-1 flex-col">
    <EpubReader
      v-if="format === 'epub' && file"
      :key="`epub-${chapterIndex}-${epubSpineIndex ?? 0}`"
      ref="epubRef"
      :file="file"
      :initial-spine-index="epubSpineIndex"
      :color-theme="colorTheme"
      @page-change="onPageChange"
      @page-count="onPageCount"
      @page-ready="onPageReady"
    />
    <CoReadChapterPane
      v-else-if="chapter"
      :chapter="chapter"
      :annotations="annotations"
      @draft="(id, text) => emit('draft', id, text)"
      @scroll="(p) => emit('scroll', p)"
    />
    <p v-else class="p-6 text-center text-sm text-muted-foreground">{{ t('coRead.readerMissingChapter') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EpubReader from '@/components/reader/EpubReader.vue'
import CoReadChapterPane from '@/components/coReading/CoReadChapterPane.vue'
import type { CoReadAnnotation, CoReadChapter } from '@/types/coReading'
import type { CoReadFileFormat } from '@/utils/coReadChapter'
import type { ReaderColorTheme } from '@/composables/useReaderColorTheme'

const props = defineProps<{
  file: File | null
  format: CoReadFileFormat | ''
  chapter: CoReadChapter | undefined
  chapterIndex: number
  epubSpineIndex?: number
  annotations: CoReadAnnotation[]
  colorTheme?: ReaderColorTheme
}>()

const emit = defineEmits<{
  draft: [annotationId: string, text: string]
  scroll: [percent: number]
  'page-change': [payload: { page: number; pageTotal: number; text: string }]
}>()

const { t } = useI18n()
const epubRef = ref<InstanceType<typeof EpubReader> | null>(null)
const pageTotal = ref(0)

function onPageCount(count: number) {
  pageTotal.value = count
}

function onPageReady() {
  onPageChange(1)
}

function onPageChange(page: number) {
  if (!props.file || props.format !== 'epub') return
  const text = epubRef.value?.getPageText?.() ?? ''
  emit('page-change', { page, pageTotal: pageTotal.value || page, text })
}

defineExpose({ getPageText: () => epubRef.value?.getPageText?.() ?? '' })
</script>

<style scoped>
.co-read-reader-stage :deep(.epub-reader) {
  min-height: 50vh;
}
</style>
