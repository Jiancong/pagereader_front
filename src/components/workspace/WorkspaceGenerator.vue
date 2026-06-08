<template>
  <div :class="activeTask.pptData ? 'mx-auto w-full max-w-[min(100%,96rem)]' : 'mx-auto max-w-3xl'">
    <!-- Tab 切换：两套任务状态独立，可并行生成 -->
    <div class="mb-8 flex items-center justify-center">
        <div class="inline-flex rounded-xl border border-border bg-secondary/30 p-1.5">
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
        </div>
    </div>

    <!-- 已生成：展示当前标签对应任务的 PptViewer -->
    <div v-if="activeTask.pptData" class="rounded-2xl border border-border bg-card">
      <PptViewer
        :ppt-data="activeTask.pptData"
        :project-id="activeTask.projectId"
        @close="resetActiveTask"
        @update:ppt-data="(d) => (activeTask.pptData = d)"
      />
    </div>

    <template v-else>
      <div class="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3 sm:px-5">
        <p class="text-sm font-medium text-foreground">{{ t('workspace.queueLabel') }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="FAST" class="accent-primary" />
            <span>{{ t('workspace.queueFast') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageFastCredits') }})</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="SLOW" class="accent-primary" />
            <span>{{ t('workspace.queueSlow') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageSlowCredits') }})</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.queueHint') }}</p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <!-- 一句话 / 联网搜索 -->
        <div v-if="activeTab === 'prompt'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t('workspace.promptTitle') }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.promptHint') }}</p>
          </div>
          <form class="space-y-4" @submit.prevent="onPromptSubmit">
            <textarea
              v-model="input"
              :placeholder="t('workspace.promptPlaceholder')"
              class="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              :disabled="promptTask.isGenerating || !input.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="promptTask.isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ promptTask.isGenerating ? t('workspace.generating') : t('workspace.generateDeck') }}
            </button>
          </form>
        </div>

        <!-- RAG 上传分析 -->
        <div v-else class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t('workspace.uploadTitle') }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadHint') }}</p>
          </div>
          <div
            class="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/50"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.txt,.md" class="hidden" @change="onFileChange" />
            <div v-if="hasAttachedDoc" class="flex items-center justify-center gap-3">
              <FileText class="h-10 w-10 text-primary" />
              <div class="text-left">
                <p class="font-medium text-foreground">{{ attachedDocName }}</p>
                <p v-if="attachedDocSizeLabel" class="text-sm text-muted-foreground">{{ attachedDocSizeLabel }}</p>
                <p v-if="cloudDocument" class="text-xs text-muted-foreground">{{ t('workspace.fromCloudLibrary') }}</p>
              </div>
              <button type="button" class="ml-4 rounded-lg p-1 hover:bg-secondary" @click.stop="clearAttachedDoc">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.pickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadFormatsShort') }}</p>
            </template>
          </div>
          <div v-if="hasAttachedDoc" class="mt-6">
            <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.uploadPromptLabel') }}</label>
            <p class="mb-2 text-xs text-muted-foreground">{{ t('workspace.uploadPromptHint') }}</p>
            <textarea
              v-model="uploadPrompt"
              :placeholder="t('workspace.uploadPromptPlaceholder')"
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
            {{ ragTask.isGenerating ? t('workspace.analyzingDoc') : t('workspace.analyzeAndGenerate') }}
          </button>
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
import { ref, computed, reactive, onBeforeUnmount } from "vue"
import { RouterLink } from "vue-router"
import { useI18n } from "vue-i18n"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
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
import type { PptQueue } from "@/api/types"
import { resolvePptDataFromStreamComplete } from "@/utils/pptCompletePayload"
import { notifyCreditsRefresh } from "@/composables/useCreditsRefresh"
import type { UploadedDocument } from "@/utils/pptDocumentRag"
import { formatBytes } from "@/utils/userAssets"

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
  projectId: string
  queue: PptQueue
  showCreditsCta: boolean
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
    projectId: "",
    queue: defaultQueue,
    showCreditsCta: false,
    timerStartAt: null,
    elapsedMs: null,
  }
}

/** 一句话 / 联网搜索：独立任务 */
const promptTask = reactive<GeneratorTask>(createTask("FAST"))
/** RAG 文档分析：独立任务 */
const ragTask = reactive<GeneratorTask>(createTask("SLOW"))

const activeTab = ref<"prompt" | "upload">("prompt")
const input = ref(props.initialPrompt || "")
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

const activeTask = computed(() => (activeTab.value === "prompt" ? promptTask : ragTask))
const activeLastLogs = computed(() => activeTask.value.logs.slice(-3))

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
  if (promptTask.isGenerating || ragTask.isGenerating) return
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

const tabClass = (tab: "prompt" | "upload") => [
  "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
  activeTab.value === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
]

const appendLog = (task: GeneratorTask, line: string) => task.logs.push(line)

const refreshCreditsBar = () => notifyCreditsRefresh().catch(() => {})

const applyStreamError = (task: GeneratorTask, msg: string) => {
  if (isCreditsInsufficientMessage(msg)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
  } else {
    task.errorMsg = msg
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

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) {
    cloudDocument.value = null
    cloudDocumentSize.value = undefined
    uploadedFile.value = f
    uploadPrompt.value = t("workspace.uploadPromptDefault")
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
  uploadPrompt.value = t("workspace.docGeneratePrompt", {
    name: docBaseName(payload.doc.name || "document"),
  })
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

const runStream = async (
  task: GeneratorTask,
  message: string,
  documents?: any[],
  projectName?: string,
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
      onComplete: async (data: unknown) => {
        if (task.pptData) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        const isPptCompletion =
          o.ppt_data_url != null ||
          o.remote_url != null ||
          o.ppt_data != null ||
          o.is_ppt_response === true ||
          o.ppt_generation === true
        if (!isPptCompletion) return
        stopTaskTimer(task)
        appendLog(task, t("workspace.loadingPpt"))
        try {
          const resolved = await resolvePptDataFromStreamComplete(data)
          if (resolved) {
            task.pptData = resolved.pptData
            if (resolved.projectId) task.projectId = resolved.projectId
            emit("project-complete", task.projectId)
          } else {
            task.errorMsg = t("workspace.completeNoPptData")
          }
        } catch {
          task.errorMsg = t("workspace.loadPptFailed")
        } finally {
          refreshCreditsBar()
        }
      },
      onError: (msg: string) => {
        stopTaskTimer(task)
        applyStreamError(task, msg)
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
  task.projectId = newProjectId()
  task.logs = []
  task.timerStartAt = Date.now()
  task.elapsedMs = null
  task.isGenerating = true
  timerNow.value = Date.now()
  ensureTimerTick()
}

const handleGenerateError = (task: GeneratorTask, e: unknown) => {
  if (isCreditsInsufficient(e)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
    refreshCreditsBar()
    return
  }
  task.errorMsg = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
}

const onPromptSubmit = async () => {
  if (!input.value.trim() || promptTask.isGenerating) return
  startTask(promptTask)
  if (!(await ensureCreditsForTask(promptTask))) {
    stopTaskTimer(promptTask)
    promptTask.isGenerating = false
    return
  }
  try {
    await runStream(promptTask, input.value.trim())
  } catch (e: unknown) {
    handleGenerateError(promptTask, e)
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
    return
  }
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
    await runStream(ragTask, message, [doc], docBaseName(doc.name || ""))
  } catch (e: unknown) {
    handleGenerateError(ragTask, e)
  } finally {
    stopTaskTimer(ragTask)
    ragTask.isGenerating = false
    await refreshCreditsBar()
  }
}

onBeforeUnmount(() => {
  if (timerTickId != null) clearInterval(timerTickId)
})

const resetActiveTask = () => {
  activeTask.value.pptData = null
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
