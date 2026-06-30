<template>
  <section id="generator" class="py-20">
    <div class="mx-auto w-full max-w-3xl px-6">
      <!-- Tab 切换：胶囊样式 -->
      <div class="mb-4 flex w-full justify-center sm:mb-8">
        <div class="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-border bg-secondary/30 p-1 sm:flex-nowrap sm:gap-0 sm:p-1.5">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="tabClass(tab.id)"
            @click="selectTab(tab.id)"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- 生成模式选择器（YouTube tab 隐藏） -->
      <div v-if="activeTab !== 'youtube'" class="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3 sm:px-5">
        <p class="text-sm font-medium text-foreground">{{ t('landing.queueLabel') }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <label
            v-for="mode in availableModes"
            :key="mode.value"
            class="queue-mode-option flex cursor-pointer items-center gap-2 text-sm"
          >
            <input v-model="queue" type="radio" :value="mode.value" class="accent-primary" />
            <span>{{ mode.label }}</span>
            <span class="text-muted-foreground">({{ mode.credits }})</span>
            <span class="queue-mode-tooltip" role="tooltip">{{ mode.hint }}</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{{ t('landing.queueHint') }}</p>
      </div>

      <!-- 主卡片 -->
      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div class="p-6 sm:p-8">
          <!-- 上传分析 -->
          <div v-if="activeTab === 'upload'" class="space-y-6">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-foreground">{{ t('landing.uploadTitle') }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('landing.uploadHint') }}</p>
            </div>

            <div
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="handleDrop"
              :class="[
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/50',
              ]"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                class="hidden"
                @change="handleFileSelect"
              />
              <div v-if="selectedFile" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center">
                <FileText class="h-10 w-10 flex-shrink-0 text-primary" />
                <div class="min-w-0 flex-1 text-left">
                  <p class="break-words font-medium text-foreground">{{ selectedFile.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button
                  type="button"
                  class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary"
                  @click.stop="clearSelectedFile"
                >
                  <X class="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <template v-else>
                <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p class="mt-4 font-medium text-foreground">{{ t('landing.pickFile') }}</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ t('landing.uploadFormatsShort') }}</p>
              </template>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('landing.uploadPromptLabel') }}</label>
              <p class="mb-2 text-xs text-muted-foreground">{{ t('landing.uploadPromptHint') }}</p>
              <textarea
                v-model="uploadPrompt"
                rows="4"
                class="w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  @click="selectUploadExample(example)"
                >
                  {{ example.label }}
                </button>
              </div>
            </div>

            <button
              :disabled="!selectedFile || !uploadPrompt.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="analyzeDocument"
            >
              <FileSearch class="h-5 w-5" />
              {{ t('landing.analyzeAndGenerate') }}
            </button>
          </div>

          <!-- 一句话直连生成 -->
          <div v-else-if="activeTab === 'quick'" class="space-y-6">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-foreground">{{ t('landing.promptTitle') }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('landing.promptHint') }}</p>
            </div>

            <div>
              <textarea
                v-model="prompt"
                rows="5"
                class="w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                :placeholder="t('landing.promptPlaceholder')"
              />
            </div>

            <div>
              <p class="mb-3 text-sm text-muted-foreground">{{ t('landing.quickStart') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="example in quickExamples"
                  :key="example.id"
                  type="button"
                  :title="example.prompt"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  @click="selectQuickExample(example)"
                >
                  {{ example.label }}
                </button>
              </div>
            </div>

            <button
              :disabled="!prompt.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="generatePPT"
            >
              <Sparkles class="h-5 w-5" />
              {{ t('landing.generatePpt') }}
            </button>
          </div>

          <!-- YouTube 视频 -->
          <div v-else class="space-y-6">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-foreground">{{ t('landing.youtubeTitle') }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('landing.youtubeHint') }}</p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('landing.youtubeUrlLabel') }}</label>
              <input
                v-model="youtubeUrl"
                type="url"
                inputmode="url"
                class="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                :placeholder="t('landing.youtubeUrlPlaceholder')"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('landing.youtubePromptLabel') }}</label>
              <p class="mb-2 text-xs text-muted-foreground">{{ t('landing.youtubePromptHint') }}</p>
              <textarea
                v-model="youtubePrompt"
                rows="4"
                class="w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                :placeholder="t('landing.youtubePromptPlaceholder')"
              />
            </div>

            <button
              :disabled="!isYoutubeUrlValid || !youtubePrompt.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="generateFromYoutube"
            >
              <Sparkles class="h-5 w-5" />
              {{ t('landing.youtubeGenerate') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Upload, FileText, FileSearch, X, MessageSquare, Youtube } from 'lucide-vue-next'
import {
  gtmGenerateIntent,
  gtmGeneratorTabSelect,
  gtmQuickExampleClick,
  gtmUploadExampleClick,
  gtmFileSelected,
  LANDING_WATCH_DEMO_EVENT,
} from '@/composables/useGtmDataLayer'

type TabId = 'upload' | 'quick' | 'youtube'
type QueueMode = 'CARD' | 'DOCUMENT' | 'NOVEL'

const { t } = useI18n()
const emit = defineEmits<{ start: [payload: { mode: string; prompt: string }] }>()

const activeTab = ref<TabId>('upload')
const queue = ref<QueueMode>('DOCUMENT')
const prompt = ref('')
const uploadPrompt = ref('')
const youtubeUrl = ref('')
const youtubePrompt = ref('')
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const tabs = computed(() => [
  { id: 'upload' as TabId, label: t('landing.tabUpload'), icon: markRaw(Upload) },
  { id: 'quick' as TabId, label: t('landing.tabQuick'), icon: markRaw(MessageSquare) },
  { id: 'youtube' as TabId, label: t('landing.tabYoutube'), icon: markRaw(Youtube) },
])

const QUICK_EXAMPLE_IDS = [
  'math6', 'aiHealthcare', 'santiBook', 'newtonLaws', 'xiaomiSu7',
  'starbucksReport', 'yearEnd', 'iphone17', 'pmInterview', 'carbonResearch', 'onboarding',
]

const UPLOAD_EXAMPLE_IDS = [
  'hongloumeng', 'researchPaper', 'contractReview', 'industryReport', 'prdReview',
  'textbookChapter', 'meetingNotes', 'annualReport', 'techWhitepaper',
]

const quickExamples = computed(() =>
  QUICK_EXAMPLE_IDS.map((id) => ({
    id,
    label: t(`landing.examples.${id}.label`),
    prompt: t(`landing.examples.${id}.prompt`),
  })),
)

const uploadExamples = computed(() =>
  UPLOAD_EXAMPLE_IDS.map((id) => ({
    id,
    label: t(`landing.uploadExamples.${id}.label`),
    prompt: t(`landing.uploadExamples.${id}.prompt`),
  })),
)

/** 可选生成模式：直连 tab 不显示小说导读（仅 Card / Document） */
const availableModes = computed(() => {
  const base = [
    {
      value: 'CARD' as QueueMode,
      label: t('landing.queueCard'),
      credits: t('pricing.usageCardCredits'),
      hint: t('landing.queueCardHint'),
    },
    {
      value: 'DOCUMENT' as QueueMode,
      label: t('landing.queueDocument'),
      credits: t('pricing.usageDocumentCredits'),
      hint: t('landing.queueDocumentHint'),
    },
  ]
  if (activeTab.value === 'upload') {
    base.push({
      value: 'NOVEL' as QueueMode,
      label: t('landing.queueNovel'),
      credits: t('pricing.usageNovelCredits'),
      hint: t('landing.queueNovelHint'),
    })
  }
  return base
})

const isYoutubeUrlValid = computed(() => /(?:youtube\.com|youtu\.be)/i.test(youtubeUrl.value))

const tabClass = (tab: TabId) => [
  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm',
  activeTab.value === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground',
]

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const selectTab = (tabId: TabId) => {
  if (activeTab.value !== tabId) {
    activeTab.value = tabId
    gtmGeneratorTabSelect(tabId)
  }
}

const applyDefaultUploadPrompt = () => {
  if (!uploadPrompt.value.trim()) {
    uploadPrompt.value = t('landing.uploadPromptDefault')
  }
}

const trackSelectedFile = (file: File) => {
  selectedFile.value = file
  applyDefaultUploadPrompt()
  gtmFileSelected(file)
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) trackSelectedFile(files[0])
}

const handleFileSelect = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files && files.length > 0) trackSelectedFile(files[0])
}

const clearSelectedFile = () => {
  selectedFile.value = null
  uploadPrompt.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const selectQuickExample = (example: { id: string; prompt: string }) => {
  prompt.value = example.prompt
  gtmQuickExampleClick(example.id)
}

const selectUploadExample = (example: { id: string; prompt: string }) => {
  uploadPrompt.value = example.prompt
  gtmUploadExampleClick(example.id)
}

const generatePPT = () => {
  gtmGenerateIntent('prompt', Boolean(prompt.value.trim()))
  emit('start', { mode: 'prompt', prompt: prompt.value })
}

const analyzeDocument = () => {
  gtmGenerateIntent('upload', Boolean(uploadPrompt.value.trim()))
  emit('start', { mode: 'upload', prompt: uploadPrompt.value.trim() })
}

const generateFromYoutube = () => {
  gtmGenerateIntent('upload', Boolean(youtubePrompt.value.trim()))
  emit('start', { mode: 'youtube', prompt: youtubePrompt.value.trim() || youtubeUrl.value.trim() })
}

// YouTube tab 强制 DOCUMENT 模式；切到 quick 时若为 NOVEL 降级为 CARD
watch(activeTab, (tab) => {
  if (tab === 'youtube') {
    queue.value = 'DOCUMENT'
    if (!youtubePrompt.value.trim()) youtubePrompt.value = t('landing.youtubePromptDefault')
  }
  if (tab === 'quick' && queue.value === 'NOVEL') queue.value = 'CARD'
})
</script>

<style scoped>
.queue-mode-option {
  position: relative;
}

.queue-mode-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 20;
  width: max-content;
  max-width: min(280px, 70vw);
  padding: 8px 12px;
  border: 1px solid rgba(138, 92, 246, 0.35);
  border-radius: 8px;
  background: rgba(18, 22, 32, 0.96);
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease,
    transform 0.15s ease;
}

.queue-mode-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(18, 22, 32, 0.96);
}

.queue-mode-option:hover .queue-mode-tooltip,
.queue-mode-option:focus-within .queue-mode-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
</style>
