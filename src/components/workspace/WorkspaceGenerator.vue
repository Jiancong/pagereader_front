<template>
  <div :class="(activeTask.pptData || activeTask.cardResult || activeTask.novelResult) ? 'mx-auto w-full min-w-0 max-w-[min(100%,96rem)]' : 'mx-auto w-full min-w-0 max-w-3xl'">
    <!-- Tab 切换：两套任务状态独立，可并行生成 -->
    <div class="mb-4 flex w-full justify-center sm:mb-8">
        <div class="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-border bg-secondary/30 p-1 sm:flex-nowrap sm:gap-0 sm:p-1.5">
          <button :class="tabClass('upload')" @click="activeTab = 'upload'">
            <Upload class="h-4 w-4" />
            {{ t('workspace.tabUpload') }}
            <span
              v-if="ragTask.isGenerating && activeTab !== 'upload'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          <button :class="tabClass('prompt')" @click="activeTab = 'prompt'">
            <MessageSquare class="h-4 w-4" />
            {{ t('workspace.tabQuick') }}
            <span
              v-if="promptTask.isGenerating && activeTab !== 'prompt'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          <button :class="tabClass('youtube')" @click="activeTab = 'youtube'">
            <Youtube class="h-4 w-4" />
            {{ t('workspace.tabYoutube') }}
            <span
              v-if="youtubeTask.isGenerating && activeTab !== 'youtube'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
        </div>
    </div>

    <!-- 已生成：小说导读 -->
    <WorkspaceNovelResult
      v-if="activeTask.novelResult"
      :result="activeTask.novelResult"
      @close="resetActiveTask"
    />

    <!-- 已生成：卡片模式结果 -->
    <WorkspaceCardResult
      v-else-if="activeTask.cardResult"
      :result="activeTask.cardResult"
      @close="resetActiveTask"
    />

    <!-- 已生成：展示当前标签对应任务的 PptViewer -->
    <div v-else-if="activeTask.pptData" class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <PptViewer
        :ppt-data="activeTask.pptData"
        :project-id="activeTask.projectId"
        :markdown="activeTask.markdown"
        can-upload-cover
        @close="resetActiveTask"
        @update:ppt-data="(d) => (activeTask.pptData = d)"
      />
    </div>

    <template v-else>
      <div class="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3 sm:px-5">
        <p class="text-sm font-medium text-foreground">{{ t('workspace.queueLabel') }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="CARD" class="accent-primary" />
            <span>{{ t('workspace.queueCard') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageCardCredits') }})</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="DOCUMENT" class="accent-primary" />
            <span>{{ t('workspace.queueDocument') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageDocumentCredits') }})</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="NOVEL" class="accent-primary" />
            <span>{{ t('workspace.queueNovel') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageNovelCredits') }})</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.queueHint') }}</p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <!-- RAG 上传分析 -->
        <div v-if="activeTab === 'upload'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t(workspaceCopyKey('uploadTitle')) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t(workspaceCopyKey('uploadHint')) }}</p>
          </div>
          <div
            class="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/50"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.txt,.md" class="hidden" @change="onFileChange" />
            <div v-if="hasAttachedDoc" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center">
              <FileText class="hidden h-10 w-10 text-primary sm:block" />
              <div class="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <FileText class="h-10 w-10 flex-shrink-0 text-primary sm:hidden" />
              <div class="min-w-0 flex-1 text-left">
                <p class="break-words font-medium text-foreground">{{ attachedDocName }}</p>
                <p v-if="attachedDocSizeLabel" class="text-sm text-muted-foreground">{{ attachedDocSizeLabel }}</p>
                <p v-if="cloudDocument" class="text-xs text-muted-foreground">{{ t('workspace.fromCloudLibrary') }}</p>
              </div>
              <button type="button" class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary" @click.stop="clearAttachedDoc">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
              </div>
            </div>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.pickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadFormatsShort') }}</p>
            </template>
          </div>
          <div v-if="hasAttachedDoc" class="mt-6">
            <label class="mb-2 block text-sm font-medium text-foreground">{{ t(workspaceCopyKey('uploadPromptLabel')) }}</label>
            <p class="mb-2 text-xs text-muted-foreground">{{ t(workspaceCopyKey('uploadPromptHint')) }}</p>
            <textarea
              v-model="uploadPrompt"
              :placeholder="t(workspaceCopyKey('uploadPromptPlaceholder'))"
              :disabled="ragTask.isGenerating"
              class="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <button
            :disabled="!hasAttachedDoc || !uploadPrompt.trim() || ragTask.isGenerating"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onAnalyze"
          >
            <Loader2 v-if="ragTask.isGenerating" class="h-5 w-5 animate-spin" />
            <Sparkles v-else class="h-5 w-5" />
            {{ ragTask.isGenerating ? t('workspace.analyzingDoc') : t(workspaceCopyKey('analyzeAndGenerate')) }}
          </button>
        </div>

        <!-- 一句话 / 联网搜索 -->
        <div v-else-if="activeTab === 'prompt'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t(workspaceCopyKey('promptTitle')) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t(workspaceCopyKey('promptHint')) }}</p>
          </div>
          <form class="space-y-4" @submit.prevent="onPromptSubmit">
            <textarea
              v-model="input"
              :placeholder="t(workspaceCopyKey('promptPlaceholder'))"
              class="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              :disabled="promptTask.isGenerating || !input.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="promptTask.isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ promptTask.isGenerating ? t('workspace.generating') : t(workspaceCopyKey('generateDeck')) }}
            </button>
          </form>
        </div>

        <!-- YouTube 视频生成 PPT -->
        <div v-else class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t('workspace.youtubeTitle') }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.youtubeHint') }}</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.youtubeUrlLabel') }}</label>
              <input
                v-model="youtubeUrl"
                type="url"
                inputmode="url"
                :disabled="youtubeTask.isGenerating"
                class="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                :placeholder="t('workspace.youtubeUrlPlaceholder')"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.youtubePromptLabel') }}</label>
              <p class="mb-2 text-xs text-muted-foreground">{{ t('workspace.youtubePromptHint') }}</p>
              <textarea
                v-model="youtubePrompt"
                :disabled="youtubeTask.isGenerating"
                class="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                :placeholder="t('workspace.youtubePromptPlaceholder')"
              />
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                :disabled="!isYoutubeUrlValid || transcriptLoading || youtubeTask.isGenerating"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                @click="onPreviewYoutubeTranscript"
              >
                <Loader2 v-if="transcriptLoading" class="h-4 w-4 animate-spin" />
                {{ transcriptLoading ? t('workspace.youtubeTranscriptLoading') : t('workspace.youtubeTranscriptPreview') }}
              </button>
              <button
                v-if="youtubeTask.isGenerating"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                @click="onCancelYoutube"
              >
                {{ t('workspace.youtubeCancel') }}
              </button>
            </div>

            <div
              v-if="transcriptPreview?.success"
              class="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground"
            >
              <p class="font-medium">{{ transcriptPreview.title || transcriptPreview.video_id }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ t('workspace.youtubeTranscriptMeta', {
                  language: transcriptPreview.language || '-',
                  sections: transcriptPreview.section_count ?? 0,
                  chars: transcriptPreview.char_count ?? 0,
                }) }}
              </p>
              <pre
                v-if="transcriptPreview.script_preview"
                class="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background/70 p-3 text-xs text-muted-foreground"
              >{{ transcriptPreview.script_preview }}</pre>
            </div>

            <button
              type="button"
              :disabled="!isYoutubeUrlValid || !youtubePrompt.trim() || youtubeTask.isGenerating"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="onYoutubeSubmit"
            >
              <Loader2 v-if="youtubeTask.isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ youtubeTask.isGenerating ? t('workspace.generating') : t('workspace.youtubeGenerate') }}
            </button>
          </div>
        </div>

        <!-- 错误（当前标签任务） -->
        <div v-if="activeTask.errorMsg" class="border-t border-border bg-red-500/10 px-6 py-4 text-sm text-red-400 sm:px-8">
          <p>{{ activeTask.errorMsg }}</p>
          <RouterLink
            v-if="activeTask.showCreditsCta"
            to="/pricing"
            class="mt-2 inline-block font-medium text-primary hover:underline"
          >
            {{ t('workspace.creditsInsufficientCta') }}
          </RouterLink>
        </div>

        <!-- 进度（当前标签任务） -->
        <div v-if="activeTask.logs.length || activeTask.isGenerating || activeTask.elapsedMs != null" class="border-t border-border bg-secondary/20 p-6 sm:p-8">
          <h4 class="mb-3 flex items-center justify-between gap-3 font-semibold text-foreground">
            <span class="flex items-center gap-2">
              <span v-if="activeTask.isGenerating" class="relative flex h-2.5 w-2.5">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              {{ t('workspace.progressTitle') }}
            </span>
            <span
              v-if="activeElapsedDisplay"
              class="shrink-0 font-mono text-sm font-normal tabular-nums text-muted-foreground"
            >
              {{ t('workspace.elapsedTime', { time: activeElapsedDisplay }) }}
            </span>
          </h4>
          <div v-if="activeTask.isGenerating" class="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div class="flex items-center gap-3">
              <Loader2 class="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
              <p class="flex-1 text-sm font-medium text-foreground">
                {{ activeTask.logs.length ? activeTask.logs[activeTask.logs.length - 1] : t('workspace.preparing') }}
              </p>
            </div>
            <div class="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div class="ppt-indeterminate-bar" />
            </div>
          </div>
          <div class="space-y-1 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            <p
              v-for="(line, i) in activeLastLogs"
              :key="i"
              class="truncate"
              :class="i === activeLastLogs.length - 1 ? 'text-foreground' : 'opacity-50'"
            >
              {{ line }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, reactive, watch, onBeforeUnmount } from "vue"
import { RouterLink } from "vue-router"
import { useI18n } from "vue-i18n"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X, Youtube } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import WorkspaceCardResult from "@/components/workspace/WorkspaceCardResult.vue"
import WorkspaceNovelResult from "@/components/workspace/WorkspaceNovelResult.vue"
import {
  isBookCardStreamPayload,
  parseBookCardStreamPayload,
  type BookCardResult,
} from "@/utils/bookCardStream"
import {
  isNovelStreamPayload,
  resolveNovelFromStreamComplete,
  persistNovelCompleteToHistory,
  type NovelResult,
} from "@/utils/novelStream"
import {
  authApi,
  fileApi,
  agentApi,
  subscribeApi,
  isLoggedIn,
  ApiError,
  isCreditsInsufficient,
  isCreditsInsufficientMessage,
  canAffordQueue,
} from "../../api"
import type { PptQueue, YoutubeTranscriptResult } from "@/api/types"
import { resolvePptDataFromStreamComplete, isPptStreamPayload } from "@/utils/pptCompletePayload"
import { notifyCreditsRefresh } from "@/composables/useCreditsRefresh"
import type { UploadedDocument } from "@/utils/pptDocumentRag"
import { formatBytes } from "@/utils/userAssets"
import {
  gtmGenerateStart,
  gtmGenerateComplete,
  gtmGenerateFail,
  gtmAssetAttach,
  gtmFileExt,
} from "@/composables/useGtmDataLayer"

const emit = defineEmits<{
  "project-started": [projectId: string]
  "project-complete": [projectId: string]
}>()

const { t } = useI18n()

const props = defineProps<{ initialPrompt?: string }>()

type GeneratorTask = {
  isGenerating: boolean
  logs: string[]
  errorMsg: string | null
  pptData: any
  markdown: string
  cardResult: BookCardResult | null
  novelResult: NovelResult | null
  projectId: string
  queue: PptQueue
  showCreditsCta: boolean
  streamRequestId: string | null
  /** 点击生成时记录；complete 时写入总耗时 */
  timerStartAt: number | null
  elapsedMs: number | null
}

function createTask(defaultQueue: PptQueue): GeneratorTask {
  return {
    isGenerating: false,
    logs: [],
    errorMsg: null,
    pptData: null,
    markdown: "",
    cardResult: null,
    novelResult: null,
    projectId: "",
    queue: defaultQueue,
    showCreditsCta: false,
    streamRequestId: null,
    timerStartAt: null,
    elapsedMs: null,
  }
}

/** 一句话 / 联网搜索：独立任务 */
const promptTask = reactive<GeneratorTask>(createTask("CARD"))
/** RAG 文档分析：独立任务 */
const ragTask = reactive<GeneratorTask>(createTask("DOCUMENT"))
/** YouTube 视频生成 PPT：独立任务 */
const youtubeTask = reactive<GeneratorTask>(createTask("DOCUMENT"))

const activeTab = ref<"prompt" | "upload" | "youtube">("upload")
const input = ref(props.initialPrompt || "")
const youtubeUrl = ref("")
const youtubePrompt = ref("")
const transcriptPreview = ref<YoutubeTranscriptResult | null>(null)
const transcriptLoading = ref(false)
let youtubeAbort: AbortController | null = null
const uploadedFile = ref<File | null>(null)
const cloudDocument = ref<UploadedDocument | null>(null)
const cloudDocumentSize = ref<number | undefined>(undefined)
const uploadPrompt = ref("")
const fileInput = ref<HTMLInputElement | null>(null)

const hasAttachedDoc = computed(() => Boolean(uploadedFile.value || cloudDocument.value))
const attachedDocName = computed(
  () => uploadedFile.value?.name || cloudDocument.value?.name || "",
)
const attachedDocSizeLabel = computed(() => {
  if (uploadedFile.value) return `${(uploadedFile.value.size / 1024 / 1024).toFixed(2)} MB`
  if (cloudDocumentSize.value != null) return formatBytes(cloudDocumentSize.value)
  return ""
})

const activeTask = computed(() => {
  if (activeTab.value === "prompt") return promptTask
  if (activeTab.value === "youtube") return youtubeTask
  return ragTask
})
const isYoutubeUrlValid = computed(() => agentApi.isLikelyYoutubeUrl(youtubeUrl.value))
const isCardMode = computed(() => activeTask.value.queue === "CARD")
const isNovelMode = computed(() => activeTask.value.queue === "NOVEL")
const activeLastLogs = computed(() => activeTask.value.logs.slice(-3))

function workspaceCopyKey(suffix: string): string {
  if (isNovelMode.value) return `workspace.${suffix}Novel`
  return isCardMode.value ? `workspace.${suffix}Card` : `workspace.${suffix}`
}

const timerNow = ref(Date.now())
let timerTickId: ReturnType<typeof setInterval> | null = null

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`
  return `${s}s`
}

function ensureTimerTick() {
  if (timerTickId != null) return
  timerTickId = setInterval(() => {
    timerNow.value = Date.now()
  }, 1000)
}

function stopTimerTickIfIdle() {
  if (promptTask.isGenerating || ragTask.isGenerating || youtubeTask.isGenerating) return
  if (timerTickId != null) {
    clearInterval(timerTickId)
    timerTickId = null
  }
}

function stopTaskTimer(task: GeneratorTask) {
  if (task.timerStartAt != null && task.elapsedMs == null) {
    task.elapsedMs = Date.now() - task.timerStartAt
  }
  stopTimerTickIfIdle()
}

const activeElapsedDisplay = computed(() => {
  const task = activeTask.value
  if (task.elapsedMs != null) return formatElapsed(task.elapsedMs)
  if (task.isGenerating && task.timerStartAt != null) {
    return formatElapsed(timerNow.value - task.timerStartAt)
  }
  return null
})

const tabClass = (tab: "prompt" | "upload" | "youtube") => [
  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm",
  activeTab.value === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
]

const appendLog = (task: GeneratorTask, line: string) => task.logs.push(line)

async function handleNovelStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  stopTaskTimer(task)
  appendLog(task, t("workspace.loadingNovel"))
  try {
    const resolved = await resolveNovelFromStreamComplete(data)
    if (resolved?.markdown) {
      task.novelResult = resolved
      appendLog(task, resolved.message || t("workspace.novelResultReady"))
      await persistNovelCompleteToHistory(task.projectId, data)
      gtmGenerateComplete(mode, task.queue, task.projectId)
      emit("project-complete", task.projectId)
    } else {
      task.errorMsg = t("workspace.novelResultEmpty")
      gtmGenerateFail(mode, "other")
    }
  } catch {
    task.errorMsg = t("workspace.loadNovelFailed")
    gtmGenerateFail(mode, "network")
  } finally {
    await refreshCreditsBar()
  }
}

async function handlePptStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  stopTaskTimer(task)
  appendLog(task, t("workspace.loadingPpt"))
  try {
    const resolved = await resolvePptDataFromStreamComplete(data)
    if (resolved) {
      task.pptData = resolved.pptData
      task.markdown = resolved.markdown || ""
      if (resolved.projectId) task.projectId = resolved.projectId
      gtmGenerateComplete(mode, task.queue, task.projectId)
      emit("project-complete", task.projectId)
    } else {
      task.errorMsg = t("workspace.completeNoPptData")
      gtmGenerateFail(mode, "other")
    }
  } catch {
    task.errorMsg = t("workspace.loadPptFailed")
    gtmGenerateFail(mode, "network")
  } finally {
    await refreshCreditsBar()
  }
}

async function handleCardStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  const parsed = parseBookCardStreamPayload(data)
  if (!parsed) {
    task.errorMsg = t("workspace.cardResultEmpty")
    gtmGenerateFail(mode, "other")
    return
  }
  stopTaskTimer(task)
  task.cardResult = parsed
  const doneLine = parsed.message || t("workspace.cardResultReady")
  appendLog(task, doneLine)
  gtmGenerateComplete(mode, task.queue, task.projectId)
  emit("project-complete", task.projectId)
  await refreshCreditsBar()
}

const refreshCreditsBar = () => notifyCreditsRefresh().catch(() => {})

const applyStreamError = (task: GeneratorTask, msg: string, mode: "prompt" | "upload") => {
  if (isCreditsInsufficientMessage(msg)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
    gtmGenerateFail(mode, "credits")
  } else {
    task.errorMsg = msg
    gtmGenerateFail(mode, "other")
  }
}

/** 生成前拉取最新余额并校验（GET /subscribe/my/status） */
async function ensureCreditsForTask(task: GeneratorTask): Promise<boolean> {
  try {
    const status = await subscribeApi.getMyStatus()
    if (!canAffordQueue(status, task.queue)) {
      task.showCreditsCta = true
      task.errorMsg = t("workspace.creditsInsufficient")
      await refreshCreditsBar()
      return false
    }
    await refreshCreditsBar()
    return true
  } catch {
    return true
  }
}

function docBaseName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(0, dot) : base
}

/** 按当前 RAG 任务 queue，填充上传分析默认诉求（随 Card / Document 模式切换） */
function applyDefaultUploadPrompt() {
  if (!hasAttachedDoc.value) return
  const key =
    ragTask.queue === "CARD"
      ? "workspace.uploadPromptDefaultCard"
      : ragTask.queue === "NOVEL"
        ? "workspace.uploadPromptDefaultNovel"
        : "workspace.uploadPromptDefault"
  uploadPrompt.value = t(key)
}

watch(
  () => ragTask.queue,
  () => {
    if (activeTab.value === "upload") applyDefaultUploadPrompt()
  },
)

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) {
    cloudDocument.value = null
    cloudDocumentSize.value = undefined
    uploadedFile.value = f
    applyDefaultUploadPrompt()
  }
}

const clearAttachedDoc = () => {
  uploadedFile.value = null
  cloudDocument.value = null
  cloudDocumentSize.value = undefined
  uploadPrompt.value = ""
  if (fileInput.value) fileInput.value.value = ""
}

function attachCloudDocument(payload: { doc: UploadedDocument; size?: number }) {
  if (!payload?.doc?.url) return
  uploadedFile.value = null
  if (fileInput.value) fileInput.value.value = ""
  cloudDocument.value = payload.doc
  cloudDocumentSize.value = payload.size
  activeTab.value = "upload"
  applyDefaultUploadPrompt()
  gtmAssetAttach(gtmFileExt(payload.doc.name || ""))
}

const resolveUserId = async (): Promise<string | null> => {
  if (!isLoggedIn()) return null
  try {
    const d = await authApi.getCurrentDetail()
    return d?.id != null ? String(d.id) : null
  } catch {
    return null
  }
}

const toText = (data: unknown): string => {
  if (typeof data === "string") return data
  const o = data as Record<string, unknown> | null
  if (!o || typeof o !== "object") return String(data)
  if (typeof o.response === "string" && o.response.trim()) return o.response
  if (typeof o.message === "string") return o.message
  if (typeof o.text === "string") return o.text
  if (typeof o.data === "string") return o.data
  if (o.phase != null) return `Phase ${o.phase}${o.current_slide != null ? `: ${o.current_slide}/${o.total_slides ?? "?"}` : ""}`
  if (o.status === "in_progress") return String(o.progress_status || "生成中...")
  return ""
}

const runYoutubeStream = async (task: GeneratorTask, youtubeUrlValue: string, message: string) => {
  const streamRequestId = String(Date.now())
  task.streamRequestId = streamRequestId
  youtubeAbort?.abort()
  youtubeAbort = new AbortController()

  await agentApi.youtubePptStream(
    {
      youtube_url: youtubeUrlValue,
      project_id: task.projectId,
      message,
      queue: agentApi.mapPptQueueToBffQueue(task.queue),
      stream_request_id: streamRequestId,
    },
    {
      onStarted: () => {
        emit("project-started", task.projectId)
        refreshCreditsBar()
      },
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(task, line)
      },
      onEvent: async (event, data) => {
        if (task.cardResult || task.pptData) return
        if (event === "ppt_ping") {
          appendLog(task, t("workspace.youtubeStillGenerating"))
          return
        }
        if (event === "ppt_complete" || (event === "design_complete" && isPptStreamPayload(data))) {
          await handlePptStreamComplete(task, data, "upload")
          return
        }
        if (event === "design_complete" && isBookCardStreamPayload(data)) {
          await handleCardStreamComplete(task, data, "upload")
        }
      },
      onComplete: async (data: unknown) => {
        if (task.pptData || task.cardResult) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        if (isPptStreamPayload(o)) {
          await handlePptStreamComplete(task, data, "upload")
          return
        }
        if (isBookCardStreamPayload(o)) {
          await handleCardStreamComplete(task, data, "upload")
        }
      },
      onError: (msg: string) => {
        stopTaskTimer(task)
        applyStreamError(task, msg, "upload")
        refreshCreditsBar()
      },
    },
    youtubeAbort.signal,
  )
}

const runStream = async (
  task: GeneratorTask,
  message: string,
  documents?: any[],
  projectName?: string,
  mode: "prompt" | "upload" = "prompt",
) => {
  const userId = await resolveUserId()
  if (!userId) {
    task.errorMsg = t("workspace.loginRequiredGenerate")
    task.isGenerating = false
    return
  }
  await agentApi.chatStream(
    {
      message,
      userId,
      projectId: task.projectId,
      sessionId: task.projectId,
      isAgent: true,
      queue: task.queue,
      uploaded_documents: documents,
      ...(projectName ? { projectName } : {}),
    },
    {
      onStarted: () => {
        emit("project-started", task.projectId)
        refreshCreditsBar()
      },
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(task, line)
      },
      onEvent: async (event, data) => {
        if (task.cardResult || task.pptData || task.novelResult) return
        if (event === "novel_complete" || (event === "complete" && isNovelStreamPayload(data))) {
          await handleNovelStreamComplete(task, data, mode)
          return
        }
        if (event === "ppt_complete" || (event === "design_complete" && isPptStreamPayload(data))) {
          await handlePptStreamComplete(task, data, mode)
          return
        }
        if (event === "design_complete" && isBookCardStreamPayload(data)) {
          await handleCardStreamComplete(task, data, mode)
        }
      },
      onComplete: async (data: unknown) => {
        if (task.pptData || task.cardResult || task.novelResult) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        if (isNovelStreamPayload(o)) {
          await handleNovelStreamComplete(task, data, mode)
          return
        }
        if (isPptStreamPayload(o)) {
          await handlePptStreamComplete(task, data, mode)
          return
        }
        if (isBookCardStreamPayload(o)) {
          await handleCardStreamComplete(task, data, mode)
        }
      },
      onError: (msg: string) => {
        stopTaskTimer(task)
        applyStreamError(task, msg, mode)
        refreshCreditsBar()
      },
    },
  )
}

const newProjectId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`

const startTask = (task: GeneratorTask) => {
  task.errorMsg = null
  task.showCreditsCta = false
  task.pptData = null
  task.markdown = ""
  task.cardResult = null
  task.novelResult = null
  task.projectId = newProjectId()
  task.streamRequestId = null
  task.logs = []
  task.timerStartAt = Date.now()
  task.elapsedMs = null
  task.isGenerating = true
  timerNow.value = Date.now()
  ensureTimerTick()
}

const handleGenerateError = (task: GeneratorTask, e: unknown, mode: "prompt" | "upload" = "prompt") => {
  if (isCreditsInsufficient(e)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
    gtmGenerateFail(mode, "credits")
    refreshCreditsBar()
    return
  }
  task.errorMsg = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
  gtmGenerateFail(mode, "other")
}

const onPromptSubmit = async () => {
  if (!input.value.trim() || promptTask.isGenerating) return
  startTask(promptTask)
  if (!(await ensureCreditsForTask(promptTask))) {
    stopTaskTimer(promptTask)
    promptTask.isGenerating = false
    gtmGenerateFail("prompt", "credits")
    return
  }
  gtmGenerateStart("prompt", promptTask.queue)
  try {
    await runStream(promptTask, input.value.trim(), undefined, undefined, "prompt")
  } catch (e: unknown) {
    handleGenerateError(promptTask, e, "prompt")
  } finally {
    stopTaskTimer(promptTask)
    promptTask.isGenerating = false
    await refreshCreditsBar()
  }
}

const onAnalyze = async () => {
  if (!hasAttachedDoc.value || ragTask.isGenerating) return
  const message = uploadPrompt.value.trim()
  if (!message) return
  startTask(ragTask)
  if (!(await ensureCreditsForTask(ragTask))) {
    stopTaskTimer(ragTask)
    ragTask.isGenerating = false
    gtmGenerateFail("upload", "credits")
    return
  }
  const docSource = cloudDocument.value ? "cloud" : "local"
  gtmGenerateStart("upload", ragTask.queue, docSource)
  try {
    let doc: UploadedDocument
    if (cloudDocument.value) {
      doc = cloudDocument.value
      appendLog(ragTask, t("workspace.uploadDoneAnalyzing"))
    } else if (uploadedFile.value) {
      appendLog(ragTask, t("workspace.uploadingDoc"))
      doc = await fileApi.uploadDocument(uploadedFile.value)
      appendLog(ragTask, t("workspace.uploadDoneAnalyzing"))
    } else {
      return
    }
    await runStream(ragTask, message, [doc], docBaseName(doc.name || ""), "upload")
  } catch (e: unknown) {
    handleGenerateError(ragTask, e, "upload")
  } finally {
    stopTaskTimer(ragTask)
    ragTask.isGenerating = false
    await refreshCreditsBar()
  }
}

function applyDefaultYoutubePrompt() {
  if (!youtubePrompt.value.trim()) {
    youtubePrompt.value = t("workspace.youtubePromptDefault")
  }
}

watch(activeTab, (tab) => {
  if (tab === "youtube") applyDefaultYoutubePrompt()
})

const onPreviewYoutubeTranscript = async () => {
  if (!isYoutubeUrlValid.value || transcriptLoading.value || youtubeTask.isGenerating) return
  transcriptPreview.value = null
  transcriptLoading.value = true
  youtubeTask.errorMsg = null
  try {
    if (!(await resolveUserId())) {
      youtubeTask.errorMsg = t("workspace.loginRequiredGenerate")
      return
    }
    const projectId = youtubeTask.projectId || newProjectId()
    if (!youtubeTask.projectId) youtubeTask.projectId = projectId
    transcriptPreview.value = await agentApi.fetchYoutubeTranscript({
      youtube_url: youtubeUrl.value.trim(),
      project_id: projectId,
    })
  } catch (e: unknown) {
    youtubeTask.errorMsg = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
  } finally {
    transcriptLoading.value = false
  }
}

const onCancelYoutube = async () => {
  if (!youtubeTask.isGenerating) return
  youtubeAbort?.abort()
  const projectId = youtubeTask.projectId
  const streamRequestId = youtubeTask.streamRequestId
  if (projectId && streamRequestId) {
    try {
      await agentApi.cancelChatStream({
        project_id: projectId,
        stream_request_id: streamRequestId,
      })
    } catch {
      /* ignore cancel failures */
    }
  }
  stopTaskTimer(youtubeTask)
  youtubeTask.isGenerating = false
  appendLog(youtubeTask, t("workspace.youtubeCanceled"))
}

const onYoutubeSubmit = async () => {
  if (!isYoutubeUrlValid.value || !youtubePrompt.value.trim() || youtubeTask.isGenerating) return
  startTask(youtubeTask)
  if (!(await ensureCreditsForTask(youtubeTask))) {
    stopTaskTimer(youtubeTask)
    youtubeTask.isGenerating = false
    gtmGenerateFail("upload", "credits")
    return
  }
  gtmGenerateStart("upload", youtubeTask.queue)
  try {
    await runYoutubeStream(youtubeTask, youtubeUrl.value.trim(), youtubePrompt.value.trim())
  } catch (e: unknown) {
    if ((e as Error)?.name === "AbortError") return
    handleGenerateError(youtubeTask, e, "upload")
  } finally {
    stopTaskTimer(youtubeTask)
    youtubeTask.isGenerating = false
    youtubeAbort = null
    await refreshCreditsBar()
  }
}

onBeforeUnmount(() => {
  youtubeAbort?.abort()
  if (timerTickId != null) clearInterval(timerTickId)
})

const resetActiveTask = () => {
  activeTask.value.pptData = null
  activeTask.value.markdown = ""
  activeTask.value.cardResult = null
  activeTask.value.novelResult = null
  activeTask.value.projectId = ""
}

defineExpose({ attachCloudDocument })
</script>

<style scoped>
@keyframes ppt-indeterminate {
  0% { left: -40%; width: 40%; }
  50% { width: 55%; }
  100% { left: 100%; width: 40%; }
}
.ppt-indeterminate-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 9999px;
  background: linear-gradient(90deg, transparent, #1d9bf0, #1d9bf0, transparent);
  animation: ppt-indeterminate 1.4s ease-in-out infinite;
}
</style>
