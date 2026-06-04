<template>
  <section id="generator" class="py-20">
    <div class="mx-auto max-w-4xl px-6">
      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        <!-- Tabs -->
        <div class="flex border-b border-border">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
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
          <!-- Quick Start Mode -->
          <div v-if="activeTab === 'quick'" class="space-y-6">
            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">
                描述你想要的 PPT 主题
              </label>
              <div class="relative">
                <textarea
                  v-model="prompt"
                  rows="4"
                  class="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="例如：关于人工智能在医疗领域应用的商业计划书，需要包含市场分析、技术方案、竞争优势和财务预测..."
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
                  {{ isLoading ? '生成中...' : '生成 PPT' }}
                </button>
              </div>
            </div>

            <!-- Quick Start Buttons -->
            <div>
              <p class="mb-3 text-sm text-muted-foreground">快速开始：</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="example in quickExamples"
                  :key="example"
                  @click="prompt = example"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {{ example }}
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Mode -->
          <div v-else class="space-y-6">
            <div
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="handleDrop"
              :class="[
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              ]"
            >
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload class="h-8 w-8 text-primary" />
              </div>
              <p class="mb-2 text-lg font-medium text-foreground">
                拖放文件到这里
              </p>
              <p class="mb-4 text-sm text-muted-foreground">
                支持 PDF、Word、TXT、Markdown 格式
              </p>
              <label class="cursor-pointer rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                选择文件
                <input
                  type="file"
                  class="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  @change="handleFileSelect"
                />
              </label>
            </div>

            <!-- Selected File -->
            <div v-if="selectedFile" class="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium text-foreground">
                  {{ selectedFile.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ formatFileSize(selectedFile.size) }}
                </p>
              </div>
              <button
                @click="selectedFile = null"
                class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <button
              @click="analyzeDocument"
              :disabled="isLoading || !selectedFile"
              :class="[
                'flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-medium transition-all',
                isLoading || !selectedFile
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              ]"
            >
              <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
              <FileSearch v-else class="h-5 w-5" />
              {{ isLoading ? '分析中...' : '分析并生成 PPT' }}
            </button>
          </div>

          <!-- Generated Slides Preview -->
          <div v-if="slides.length > 0" class="mt-8 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">生成的大纲</h3>
              <button
                @click="downloadPPT"
                :disabled="isDownloading"
                class="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin" />
                <Download v-else class="h-4 w-4" />
                {{ isDownloading ? '下载中...' : '下载 PPTX' }}
              </button>
            </div>
            
            <div class="space-y-3">
              <div
                v-for="(slide, index) in slides"
                :key="index"
                class="rounded-lg border border-border bg-background p-4"
              >
                <div class="mb-2 flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                    {{ index + 1 }}
                  </span>
                  <h4 class="font-medium text-foreground">{{ slide.title }}</h4>
                </div>
                <ul class="space-y-1 pl-8">
                  <li
                    v-for="(point, pointIndex) in slide.points"
                    :key="pointIndex"
                    class="text-sm text-muted-foreground"
                  >
                    {{ point }}
                  </li>
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
import { ref, markRaw } from 'vue'
import { 
  Sparkles, 
  Upload, 
  FileText, 
  FileSearch, 
  Download, 
  Loader2, 
  X,
  MessageSquare,
  FileUp
} from 'lucide-vue-next'
const emit = defineEmits(['start'])

const activeTab = ref('quick')
const prompt = ref('')
const isLoading = ref(false)
const isDownloading = ref(false)
const isDragging = ref(false)
const selectedFile = ref(null)
const slides = ref([])

const tabs = [
  { id: 'quick', label: '一句话生成', icon: markRaw(MessageSquare) },
  { id: 'upload', label: '上传资料分析', icon: markRaw(FileUp) }
]

const quickExamples = [
  '商业计划书',
  '项目汇报',
  '产品介绍',
  '年终总结',
  '技术分享'
]

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    selectedFile.value = files[0]
  }
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    selectedFile.value = files[0]
  }
}

// 落地页仅作引导：点击生成/分析 → 交由父级处理（登录或进入工作区）
const generatePPT = () => {
  emit('start', { mode: 'prompt', prompt: prompt.value })
}

const analyzeDocument = () => {
  emit('start', { mode: 'upload' })
}

const downloadPPT = () => {
  emit('start', { mode: 'prompt', prompt: prompt.value })
}
</script>
