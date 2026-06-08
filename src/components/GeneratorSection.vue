<template>
  <section id="generator" class="py-20">
    <div class="mx-auto max-w-4xl px-6">
      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        <div class="flex border-b border-border">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="selectTab(tab.id)"
            :class="[
              'flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="p-6">
          <div v-if="activeTab === 'quick'" class="space-y-6">
            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('landing.promptLabel') }}</label>
              <div class="relative">
                <textarea
                  v-model="prompt"
                  rows="4"
                  class="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  :placeholder="t('landing.promptPlaceholder')"
                />
                <button
                  @click="generatePPT"
                  :disabled="isLoading || !prompt.trim()"
                  :class="[
                    'absolute bottom-3 right-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    isLoading || !prompt.trim()
                      ? 'cursor-not-allowed bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  ]"
                >
                  <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
                  <Sparkles v-else class="h-4 w-4" />
                  {{ isLoading ? t('landing.generating') : t('landing.generatePpt') }}
                </button>
              </div>
            </div>

            <div>
              <p class="mb-3 text-sm text-muted-foreground">{{ t('landing.quickStart') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="example in quickExamples"
                  :key="example.id"
                  type="button"
                  :title="example.prompt"
                  @click="selectQuickExample(example)"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {{ example.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="space-y-6">
            <div
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="handleDrop"
              :class="[
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
              ]"
            >
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload class="h-8 w-8 text-primary" />
              </div>
              <p class="mb-2 text-lg font-medium text-foreground">{{ t('landing.dropHere') }}</p>
              <p class="mb-4 text-sm text-muted-foreground">{{ t('landing.uploadFormats') }}</p>
              <label class="cursor-pointer rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                {{ t('landing.selectFile') }}
                <input type="file" class="hidden" accept=".pdf,.doc,.docx,.txt,.md" @change="handleFileSelect" />
              </label>
            </div>

            <div v-if="selectedFile" class="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText class="h-5 w-5 text-primary" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-foreground">{{ selectedFile.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button type="button" class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="clearSelectedFile">
                <X class="h-4 w-4" />
              </button>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('landing.uploadPromptLabel') }}</label>
              <p class="mb-2 text-xs text-muted-foreground">{{ t('landing.uploadPromptHint') }}</p>
              <textarea
                v-model="uploadPrompt"
                rows="4"
                class="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                :placeholder="t('landing.uploadPromptPlaceholder')"
              />
            </div>

            <div>
              <p class="mb-3 text-sm text-muted-foreground">{{ t('landing.uploadQuickStart') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="example in uploadExamples"
                  :key="example.id"
                  type="button"
                  :title="example.prompt"
                  @click="selectUploadExample(example)"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {{ example.label }}
                </button>
              </div>
            </div>

            <button
              @click="analyzeDocument"
              :disabled="isLoading || !selectedFile || !uploadPrompt.trim()"
              :class="[
                'flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-medium transition-all',
                isLoading || !selectedFile || !uploadPrompt.trim()
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              ]"
            >
              <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
              <FileSearch v-else class="h-5 w-5" />
              {{ isLoading ? t('landing.analyzing') : t('landing.analyzeAndGenerate') }}
            </button>
          </div>

          <div v-if="slides.length > 0" class="mt-8 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">{{ t('landing.outlineTitle') }}</h3>
              <button
                @click="downloadPPT"
                :disabled="isDownloading"
                class="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin" />
                <Download v-else class="h-4 w-4" />
                {{ isDownloading ? t('landing.downloading') : t('landing.downloadPptx') }}
              </button>
            </div>

            <div class="space-y-3">
              <div v-for="(slide, index) in slides" :key="index" class="rounded-lg border border-border bg-background p-4">
                <div class="mb-2 flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">{{ index + 1 }}</span>
                  <h4 class="font-medium text-foreground">{{ slide.title }}</h4>
                </div>
                <ul class="space-y-1 pl-8">
                  <li v-for="(point, pointIndex) in slide.points" :key="pointIndex" class="text-sm text-muted-foreground">{{ point }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, markRaw, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Upload, FileText, FileSearch, Download, Loader2, X, MessageSquare, FileUp } from 'lucide-vue-next'
import {
  gtmGenerateIntent,
  gtmGeneratorTabSelect,
  gtmQuickExampleClick,
  gtmUploadExampleClick,
  gtmFileSelected,
  LANDING_WATCH_DEMO_EVENT,
} from '@/composables/useGtmDataLayer'

const { t } = useI18n()
const emit = defineEmits(['start'])

const activeTab = ref('quick')
const prompt = ref('')
const uploadPrompt = ref('')
const isLoading = ref(false)
const isDownloading = ref(false)
const isDragging = ref(false)
const selectedFile = ref(null)
const slides = ref([])

const tabs = computed(() => [
  { id: 'quick', label: t('landing.tabQuick'), icon: markRaw(MessageSquare) },
  { id: 'upload', label: t('landing.tabUpload'), icon: markRaw(FileUp) },
])

const QUICK_EXAMPLE_IDS = [
  'math6',
  'aiHealthcare',
  'santiBook',
  'newtonLaws',
  'xiaomiSu7',
  'starbucksReport',
  'yearEnd',
  'iphone17',
  'pmInterview',
  'carbonResearch',
  'onboarding',
]

const quickExamples = computed(() =>
  QUICK_EXAMPLE_IDS.map((id) => ({
    id,
    label: t(`landing.examples.${id}.label`),
    prompt: t(`landing.examples.${id}.prompt`),
  })),
)

const UPLOAD_EXAMPLE_IDS = [
  'hongloumeng',
  'researchPaper',
  'contractReview',
  'industryReport',
  'prdReview',
  'textbookChapter',
  'meetingNotes',
  'annualReport',
  'techWhitepaper',
]

const uploadExamples = computed(() =>
  UPLOAD_EXAMPLE_IDS.map((id) => ({
    id,
    label: t(`landing.uploadExamples.${id}.label`),
    prompt: t(`landing.uploadExamples.${id}.prompt`),
  })),
)

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const applyDefaultUploadPrompt = () => {
  if (!uploadPrompt.value.trim()) {
    uploadPrompt.value = t('landing.uploadPromptDefault')
  }
}

const selectTab = (tabId) => {
  if (activeTab.value !== tabId) {
    activeTab.value = tabId
    gtmGeneratorTabSelect(tabId)
  }
}

const selectQuickExample = (example) => {
  prompt.value = example.prompt
  gtmQuickExampleClick(example.id)
}

const selectUploadExample = (example) => {
  uploadPrompt.value = example.prompt
  gtmUploadExampleClick(example.id)
}

const trackSelectedFile = (file) => {
  selectedFile.value = file
  applyDefaultUploadPrompt()
  gtmFileSelected(file)
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) trackSelectedFile(files[0])
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) trackSelectedFile(files[0])
}

const clearSelectedFile = () => {
  selectedFile.value = null
  uploadPrompt.value = ''
}

const generatePPT = () => {
  gtmGenerateIntent('prompt', Boolean(prompt.value.trim()))
  emit('start', { mode: 'prompt', prompt: prompt.value })
}
const analyzeDocument = () => {
  gtmGenerateIntent('upload', Boolean(uploadPrompt.value.trim()))
  emit('start', { mode: 'upload', prompt: uploadPrompt.value.trim() })
}
const downloadPPT = () => emit('start', { mode: 'prompt', prompt: prompt.value })

function onLandingWatchDemo() {
  selectTab('upload')
}

onMounted(() => {
  window.addEventListener(LANDING_WATCH_DEMO_EVENT, onLandingWatchDemo)
})

onBeforeUnmount(() => {
  window.removeEventListener(LANDING_WATCH_DEMO_EVENT, onLandingWatchDemo)
})
</script>
