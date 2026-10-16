<template>
  <section class="local-reader-upload">
    <div class="local-reader-upload__header">
      <h3 class="local-reader-upload__title">{{ t('reader.localTitle') }}</h3>
      <p class="local-reader-upload__hint">{{ t('reader.localHint') }}</p>
      <div class="local-reader-upload__modes" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="uploadMode === 'read'"
          :class="['local-reader-upload__mode', uploadMode === 'read' ? 'local-reader-upload__mode--active' : '']"
          @click="uploadMode = 'read'"
        >
          {{ t('reader.modeOnlineRead') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="uploadMode === 'coRead'"
          :class="['local-reader-upload__mode', uploadMode === 'coRead' ? 'local-reader-upload__mode--active' : '']"
          @click="uploadMode = 'coRead'"
        >
          {{ t('reader.modeCoRead') }}
        </button>
      </div>
    </div>

    <div
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      :class="[
        'local-reader-upload__dropzone',
        isDragging ? 'local-reader-upload__dropzone--active' : '',
      ]"
      @click="fileInputRef?.click()"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="fileAccept"
        class="hidden"
        @change="handleSelect"
      />
      <div v-if="selectedFile" class="local-reader-upload__picked">
        <BookOpen class="local-reader-upload__picked-icon" />
        <div class="local-reader-upload__picked-meta">
          <p class="local-reader-upload__picked-name">{{ selectedFile.name }}</p>
          <p v-if="sizeLabel" class="local-reader-upload__picked-size">{{ sizeLabel }}</p>
        </div>
        <button type="button" class="local-reader-upload__clear" @click.stop="clearFile">
          <X class="h-5 w-5" />
        </button>
      </div>
      <template v-else>
        <BookOpen class="local-reader-upload__empty-icon" />
        <p class="local-reader-upload__empty-title">{{ emptyPickLabel }}</p>
        <p class="local-reader-upload__empty-formats">{{ emptyFormatsLabel }}</p>
      </template>
    </div>

    <button
      type="button"
      class="local-reader-upload__start"
      :disabled="!selectedFile || starting"
      @click="onStart"
    >
      <Loader2 v-if="starting" class="h-5 w-5 animate-spin" />
      <BookHeart v-else-if="uploadMode === 'coRead'" class="h-5 w-5" />
      <BookOpen v-else class="h-5 w-5" />
      {{ startButtonLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BookOpen, BookHeart, X, Loader2 } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { isLoggedIn } from '@/api'
import { useReaderFileStore } from '@/stores/reader'
import { useCoReadFileStore } from '@/stores/coReadFile'
import { useCoReadingStore } from '@/stores/coReading'
import { detectCoReadFormat, parseCoReadFile } from '@/utils/coReadChapter'

const props = withDefaults(
  defineProps<{
    /** Navigate to reader-open after picking a file (default). Set false to only emit. */
    autoOpen?: boolean
  }>(),
  { autoOpen: true },
)

const emit = defineEmits<{ start: [file: File]; 'open-login': [] }>()

const { t } = useI18n()
const router = useRouter()
const readerFileStore = useReaderFileStore()
const coReadFileStore = useCoReadFileStore()
const coReadingStore = useCoReadingStore()

const uploadMode = ref<'read' | 'coRead'>('read')
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const starting = ref(false)

const fileAccept = computed(() =>
  uploadMode.value === 'coRead'
    ? '.txt,.md,.markdown,.mdown,.mkd,.epub,text/plain,text/markdown,application/epub+zip'
    : '.pdf,.epub,.mobi,.azw,.azw3,.xlsx,.xls,.md,.markdown,.mdown,.mkd,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/markdown,text/plain',
)

const emptyPickLabel = computed(() =>
  uploadMode.value === 'coRead' ? t('reader.coReadPickFile') : t('reader.localPickFile'),
)
const emptyFormatsLabel = computed(() =>
  uploadMode.value === 'coRead' ? t('reader.coReadFormats') : t('reader.localFormats'),
)
const startButtonLabel = computed(() =>
  uploadMode.value === 'coRead' ? t('reader.coReadStart') : t('reader.localStart'),
)

const sizeLabel = computed(() => {
  const size = selectedFile.value?.size
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) selectedFile.value = file
}

function handleSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) selectedFile.value = file
}

function clearFile() {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function onStart() {
  if (!selectedFile.value) return
  if (selectedFile.value.size === 0) {
    ElMessage.warning(t('reader.localStart'))
    return
  }
  if (uploadMode.value === 'coRead') {
    if (!detectCoReadFormat(selectedFile.value.name)) {
      ElMessage.warning(t('coRead.unsupportedFormat'))
      return
    }
    if (!isLoggedIn()) {
      emit('open-login')
      return
    }
    starting.value = true
    try {
      coReadingStore.resetSession()
      const parsed = await parseCoReadFile(selectedFile.value)
      coReadFileStore.setParsed(
        selectedFile.value,
        parsed.chapters,
        parsed.fileHash,
        parsed.format,
      )
      coReadFileStore.setReturnTo('reader-hub')
      emit('start', selectedFile.value)
      if (props.autoOpen) {
        await router.push({ name: 'co-reading' })
      }
    } catch {
      ElMessage.error(t('coRead.parseFailed'))
    } finally {
      starting.value = false
    }
    return
  }
  readerFileStore.setFile(selectedFile.value)
  readerFileStore.setReturnNavigation("reader-hub")
  emit('start', selectedFile.value)
  if (props.autoOpen) {
    router.push({ name: "reader-open", query: { returnTo: "reader-hub" } })
  }
}
</script>

<style scoped>
.local-reader-upload {
  width: 100%;
}
.local-reader-upload__header {
  margin-bottom: 16px;
}
.local-reader-upload__modes {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding: 4px;
  border-radius: 12px;
  background: hsl(var(--secondary) / 0.5);
}
.local-reader-upload__mode {
  flex: 1;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  transition: background 0.15s, color 0.15s;
}
.local-reader-upload__mode--active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
.local-reader-upload__title {
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.local-reader-upload__hint {
  margin-top: 4px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}
.local-reader-upload__dropzone {
  cursor: pointer;
  border-radius: 12px;
  border: 2px dashed hsl(var(--border));
  background: hsl(var(--secondary) / 0.3);
  padding: 32px 24px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.local-reader-upload__dropzone:hover {
  border-color: hsl(var(--primary) / 0.5);
}
.local-reader-upload__dropzone--active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.05);
}
.local-reader-upload__picked {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}
.local-reader-upload__picked-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: hsl(var(--primary));
}
.local-reader-upload__picked-meta {
  min-width: 0;
  flex: 1;
}
.local-reader-upload__picked-name {
  word-break: break-word;
  font-weight: 500;
  color: hsl(var(--foreground));
}
.local-reader-upload__picked-size {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
.local-reader-upload__clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 4px;
  border-radius: 8px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
}
.local-reader-upload__clear:hover {
  background: hsl(var(--secondary));
}
.local-reader-upload__empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: hsl(var(--muted-foreground) / 0.5);
}
.local-reader-upload__empty-title {
  margin-top: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
}
.local-reader-upload__empty-formats {
  margin-top: 4px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}
.local-reader-upload__start {
  margin-top: 16px;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.local-reader-upload__start:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
}
.local-reader-upload__start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
