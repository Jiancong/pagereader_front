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
              <button class="ml-4 rounded-lg p-1 hover:bg-secondary" @click.stop="uploadedFile = null">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.pickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadFormatsShort') }}</p>
            </template>
          </div>
          <button
            :disabled="!uploadedFile || isGenerating"
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
          {{ errorMsg }}
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
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import { authApi, fileApi, agentApi, isLoggedIn, ApiError } from "../../api"
import { resolvePptDataFromStreamComplete } from "@/utils/pptCompletePayload"

const { t } = useI18n()

const props = defineProps<{ initialPrompt?: string }>()

const activeTab = ref<"prompt" | "upload">("prompt")
const input = ref(props.initialPrompt || "")
const uploadedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isGenerating = ref(false)
const logs = ref<string[]>([])
const errorMsg = ref<string | null>(null)
const pptData = ref<any>(null)
const projectId = ref<string>("")

const lastLogs = computed(() => logs.value.slice(-3))

const tabClass = (tab: "prompt" | "upload") => [
  "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
  activeTab.value === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
]

const appendLog = (line: string) => logs.value.push(line)

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) uploadedFile.value = f
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

const runStream = async (message: string, documents?: any[]) => {
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
      sessionId: agentApi.getOrCreateSessionId(),
      isAgent: true,
      uploaded_documents: documents,
    },
    {
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

const startCommon = () => {
  errorMsg.value = null
  pptData.value = null
  logs.value = []
  isGenerating.value = true
}

const onPromptSubmit = async () => {
  if (!input.value.trim() || isGenerating.value) return
  startCommon()
  try {
    await runStream(input.value.trim())
  } catch (e: any) {
    errorMsg.value = e instanceof ApiError ? e.message : e?.message || t("workspace.generateFailed")
  } finally {
    isGenerating.value = false
  }
}

const onAnalyze = async () => {
  if (!uploadedFile.value || isGenerating.value) return
  startCommon()
  try {
    appendLog(t("workspace.uploadingDoc"))
    const doc = await fileApi.uploadDocument(uploadedFile.value)
    appendLog(t("workspace.uploadDoneAnalyzing"))
    await runStream(t("workspace.docGeneratePrompt", { name: doc.name }), [doc])
  } catch (e: any) {
    errorMsg.value = e instanceof ApiError ? e.message : e?.message || t("workspace.generateFailed")
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
