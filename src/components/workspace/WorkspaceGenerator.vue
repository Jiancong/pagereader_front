<template>
  <div :class="pptData ? 'mx-auto w-full max-w-[min(100%,96rem)]' : 'mx-auto max-w-3xl'">
    <!-- 已生成：展示 PptViewer -->
    <div v-if="pptData" class="rounded-2xl border border-border bg-card">
      <PptViewer
        :ppt-data="pptData"
        :project-id="projectId"
        @close="reset"
        @update:ppt-data="(d) => (pptData = d)"
      />
    </div>

    <template v-else>
      <!-- Tab 切换 -->
      <div class="mb-8 flex items-center justify-center">
        <div class="inline-flex rounded-xl border border-border bg-secondary/30 p-1.5">
          <button
            :class="tabClass('prompt')"
            @click="activeTab = 'prompt'"
          >
            <MessageSquare class="h-4 w-4" /> {{ t('workspace.tabQuick') }}
          </button>
          <button
            :class="tabClass('upload')"
            @click="activeTab = 'upload'"
          >
            <Upload class="h-4 w-4" /> {{ t('workspace.tabUpload') }}
          </button>
        </div>
      </div>

      <div class="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3 sm:px-5">
        <p class="text-sm font-medium text-foreground">{{ t('workspace.queueLabel') }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="queue" type="radio" value="FAST" class="accent-primary" />
            <span>{{ t('workspace.queueFast') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageFastCredits') }})</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="queue" type="radio" value="SLOW" class="accent-primary" />
            <span>{{ t('workspace.queueSlow') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageSlowCredits') }})</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.queueHint') }}</p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <!-- prompt -->
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
              :disabled="isGenerating || !input.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ isGenerating ? t('workspace.generating') : t('workspace.generateDeck') }}
            </button>
          </form>
        </div>

        <!-- upload -->
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
            <div v-if="uploadedFile" class="flex items-center justify-center gap-3">
              <FileText class="h-10 w-10 text-primary" />
              <div class="text-left">
                <p class="font-medium text-foreground">{{ uploadedFile.name }}</p>
                <p class="text-sm text-muted-foreground">{{ (uploadedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
              <button type="button" class="ml-4 rounded-lg p-1 hover:bg-secondary" @click.stop="clearUploadedFile">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.pickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadFormatsShort') }}</p>
            </template>
          </div>
          <div v-if="uploadedFile" class="mt-6">
            <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.uploadPromptLabel') }}</label>
            <p class="mb-2 text-xs text-muted-foreground">{{ t('workspace.uploadPromptHint') }}</p>
            <textarea
              v-model="uploadPrompt"
              :placeholder="t('workspace.uploadPromptPlaceholder')"
              :disabled="isGenerating"
              class="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <button
            :disabled="!uploadedFile || !uploadPrompt.trim() || isGenerating"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onAnalyze"
          >
            <Loader2 v-if="isGenerating" class="h-5 w-5 animate-spin" />
            <Sparkles v-else class="h-5 w-5" />
            {{ isGenerating ? t('workspace.analyzingDoc') : t('workspace.analyzeAndGenerate') }}
          </button>
        </div>

        <!-- 错误 -->
        <div v-if="errorMsg" class="border-t border-border bg-red-500/10 px-6 py-4 text-sm text-red-400 sm:px-8">
          <p>{{ errorMsg }}</p>
          <RouterLink
            v-if="showCreditsCta"
            to="/pricing"
            class="mt-2 inline-block font-medium text-primary hover:underline"
          >
            {{ t('workspace.creditsInsufficientCta') }}
          </RouterLink>
        </div>

        <!-- 进度（3 行滚动 + 动画） -->
        <div v-if="logs.length || isGenerating" class="border-t border-border bg-secondary/20 p-6 sm:p-8">
          <h4 class="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <span v-if="isGenerating" class="relative flex h-2.5 w-2.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            {{ t('workspace.progressTitle') }}
          </h4>
          <div v-if="isGenerating" class="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div class="flex items-center gap-3">
              <Loader2 class="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
              <p class="flex-1 text-sm font-medium text-foreground">{{ logs.length ? logs[logs.length - 1] : t('workspace.preparing') }}</p>
            </div>
            <div class="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div class="ppt-indeterminate-bar" />
            </div>
          </div>
          <div class="space-y-1 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            <p
              v-for="(line, i) in lastLogs"
              :key="i"
              class="truncate"
              :class="i === lastLogs.length - 1 ? 'text-foreground' : 'opacity-50'"
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
import { ref, computed, watch } from "vue"
import { RouterLink } from "vue-router"
import { useI18n } from "vue-i18n"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import { authApi, fileApi, agentApi, isLoggedIn, ApiError, isCreditsInsufficient } from "../../api"
import type { PptQueue } from "@/api/types"
import { resolvePptDataFromStreamComplete } from "@/utils/pptCompletePayload"

const emit = defineEmits<{
  "project-started": [projectId: string]
  "project-complete": [projectId: string]
}>()

const { t } = useI18n()

const props = defineProps<{ initialPrompt?: string }>()

const activeTab = ref<"prompt" | "upload">("prompt")
const input = ref(props.initialPrompt || "")
const uploadedFile = ref<File | null>(null)
const uploadPrompt = ref("")
const fileInput = ref<HTMLInputElement | null>(null)
const isGenerating = ref(false)
const logs = ref<string[]>([])
const errorMsg = ref<string | null>(null)
const pptData = ref<any>(null)
const projectId = ref<string>("")
const queue = ref<PptQueue>("FAST")
const showCreditsCta = ref(false)

watch(activeTab, (tab) => {
  queue.value = tab === "upload" ? "SLOW" : "FAST"
}, { immediate: true })

const lastLogs = computed(() => logs.value.slice(-3))

const tabClass = (tab: "prompt" | "upload") => [
  "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
  activeTab.value === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
]

const appendLog = (line: string) => logs.value.push(line)

function docBaseName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(0, dot) : base
}

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) {
    uploadedFile.value = f
    uploadPrompt.value = t("workspace.uploadPromptDefault")
  }
}

const clearUploadedFile = () => {
  uploadedFile.value = null
  uploadPrompt.value = ""
  if (fileInput.value) fileInput.value.value = ""
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

const runStream = async (message: string, documents?: any[], projectName?: string) => {
  const userId = await resolveUserId()
  if (!userId) {
    errorMsg.value = t("workspace.loginRequiredGenerate")
    isGenerating.value = false
    return
  }
  await agentApi.chatStream(
    {
      message,
      userId,
      projectId: projectId.value,
      sessionId: projectId.value,
      isAgent: true,
      queue: queue.value,
      uploaded_documents: documents,
      ...(projectName ? { projectName } : {}),
    },
    {
      onStarted: () => emit("project-started", projectId.value),
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(line)
      },
      onComplete: async (data: unknown) => {
        // PPT 已加载则忽略后续的流结束事件（event: complete 仅 {status:complete}，无 url）
        if (pptData.value) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        const isPptCompletion =
          o.ppt_data_url != null ||
          o.remote_url != null ||
          o.ppt_data != null ||
          o.is_ppt_response === true ||
          o.ppt_generation === true
        // 纯流结束标志（无 PPT 数据）直接跳过，避免覆盖正常结果
        if (!isPptCompletion) return
        appendLog(t("workspace.loadingPpt"))
        try {
          const resolved = await resolvePptDataFromStreamComplete(data)
          if (resolved) {
            pptData.value = resolved.pptData
            if (resolved.projectId) projectId.value = resolved.projectId
            emit("project-complete", projectId.value)
          } else {
            errorMsg.value = t("workspace.completeNoPptData")
          }
        } catch {
          errorMsg.value = t("workspace.loadPptFailed")
        }
      },
      onError: (msg: string) => (errorMsg.value = msg),
    },
  )
}

const newProjectId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`

const startCommon = () => {
  errorMsg.value = null
  showCreditsCta.value = false
  pptData.value = null
  projectId.value = newProjectId()
  logs.value = []
  isGenerating.value = true
}

const handleGenerateError = (e: unknown) => {
  if (isCreditsInsufficient(e)) {
    showCreditsCta.value = true
    errorMsg.value = t("workspace.creditsInsufficient")
    return
  }
  errorMsg.value = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
}

const onPromptSubmit = async () => {
  if (!input.value.trim() || isGenerating.value) return
  startCommon()
  try {
    await runStream(input.value.trim())
  } catch (e: unknown) {
    handleGenerateError(e)
  } finally {
    isGenerating.value = false
  }
}

const onAnalyze = async () => {
  if (!uploadedFile.value || isGenerating.value) return
  const message = uploadPrompt.value.trim()
  if (!message) return
  startCommon()
  try {
    appendLog(t("workspace.uploadingDoc"))
    const doc = await fileApi.uploadDocument(uploadedFile.value)
    appendLog(t("workspace.uploadDoneAnalyzing"))
    await runStream(message, [doc], docBaseName(doc.name))
  } catch (e: unknown) {
    handleGenerateError(e)
  } finally {
    isGenerating.value = false
  }
}

const reset = () => {
  pptData.value = null
  projectId.value = ""
}
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
