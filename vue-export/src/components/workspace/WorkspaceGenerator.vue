<template>
  <div class="mx-auto max-w-3xl">
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
            <MessageSquare class="h-4 w-4" /> 一句话生成
          </button>
          <button
            :class="tabClass('upload')"
            @click="activeTab = 'upload'"
          >
            <Upload class="h-4 w-4" /> 上传资料分析
          </button>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <!-- prompt -->
        <div v-if="activeTab === 'prompt'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">描述你想要的演示文稿</h3>
            <p class="mt-1 text-sm text-muted-foreground">输入主题、风格和内容要求，AI 将为你生成专业的 PPT</p>
          </div>
          <form class="space-y-4" @submit.prevent="onPromptSubmit">
            <textarea
              v-model="input"
              placeholder="例如：帮我生成一个关于人工智能发展历史的 10 页 PPT..."
              class="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              :disabled="isGenerating || !input.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ isGenerating ? '正在生成...' : '生成演示文稿' }}
            </button>
          </form>
        </div>

        <!-- upload -->
        <div v-else class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">上传文档进行分析</h3>
            <p class="mt-1 text-sm text-muted-foreground">支持 PDF、Word、TXT 等格式，AI 将提取关键内容生成 PPT</p>
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
              <p class="mt-4 font-medium text-foreground">点击选择文件</p>
              <p class="mt-1 text-sm text-muted-foreground">支持 PDF, Word, TXT, Markdown</p>
            </template>
          </div>
          <button
            :disabled="!uploadedFile || isGenerating"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onAnalyze"
          >
            <Loader2 v-if="isGenerating" class="h-5 w-5 animate-spin" />
            <Sparkles v-else class="h-5 w-5" />
            {{ isGenerating ? '正在分析文档...' : '分析并生成 PPT' }}
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
            生成进度
          </h4>
          <div v-if="isGenerating" class="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div class="flex items-center gap-3">
              <Loader2 class="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
              <p class="flex-1 text-sm font-medium text-foreground">{{ logs.length ? logs[logs.length - 1] : '正在准备...' }}</p>
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
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import { authApi, fileApi, agentApi, isLoggedIn, ApiError } from "../../api"

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

const toText = (data: unknown): string =>
  typeof data === "string"
    ? data
    : (data as any)?.message ?? (data as any)?.text ?? JSON.stringify(data)

const runStream = async (message: string, documents?: any[]) => {
  const userId = await resolveUserId()
  if (!userId) {
    errorMsg.value = "请先登录后再生成"
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
      onProgress: (data: unknown) => appendLog(toText(data)),
      onComplete: (data: unknown) => {
        // complete 事件返回的就是 PptData
        const d: any = data
        if (d && typeof d === "object" && Array.isArray(d.slides)) {
          pptData.value = d
          if (d.projectId) projectId.value = String(d.projectId)
        } else if (d && typeof d === "object" && d.pptData) {
          pptData.value = d.pptData
          if (d.projectId) projectId.value = String(d.projectId)
        } else {
          appendLog("生成完成，但未识别到 PPT 数据")
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
    errorMsg.value = e instanceof ApiError ? e.message : e?.message || "生成失败"
  } finally {
    isGenerating.value = false
  }
}

const onAnalyze = async () => {
  if (!uploadedFile.value || isGenerating.value) return
  startCommon()
  try {
    appendLog("正在上传文档...")
    const doc = await fileApi.uploadDocument(uploadedFile.value)
    appendLog("文档上传完成，开始分析生成...")
    await runStream(`请根据上传的文档《${doc.name}》生成一份专业的演示文稿`, [doc])
  } catch (e: any) {
    errorMsg.value = e instanceof ApiError ? e.message : e?.message || "生成失败"
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
