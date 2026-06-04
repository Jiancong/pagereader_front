<template>
  <div class="mx-auto max-w-5xl">
    <button
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      @click="$emit('back')"
    >
      <ArrowLeft class="h-4 w-4" /> 返回
    </button>

    <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>
    <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

    <template v-if="project">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-foreground">{{ project.name || project.title || '未命名项目' }}</h2>
          <p v-if="project.description" class="mt-1 text-sm text-muted-foreground">{{ project.description }}</p>
        </div>
        <button
          class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          @click="fork"
        >
          <Sparkles class="h-4 w-4" /> 基于它再生成
        </button>
      </div>

      <div v-if="images.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <img v-for="(src, i) in images" :key="i" :src="src" :alt="`第 ${i + 1} 页`" loading="lazy" class="w-full rounded-xl border border-border" />
      </div>
      <p v-else class="rounded-xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">该作品暂无可预览的图片</p>

      <div v-if="history.length" class="mt-8">
        <h3 class="mb-3 font-semibold text-foreground">对话记录</h3>
        <div class="space-y-3">
          <div
            v-for="h in history"
            :key="h.id"
            class="rounded-xl border border-border p-4 text-sm"
            :class="h.role === 'user' ? 'bg-secondary/30' : 'bg-card'"
          >
            <p class="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ h.role === 'user' ? '用户' : 'AI' }}</p>
            <p class="whitespace-pre-wrap break-words text-foreground">{{ h.content }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Loader2, Sparkles, ArrowLeft } from 'lucide-vue-next'
import { feedApi } from '../../api'

const props = defineProps({ projectId: { type: String, required: true } })
const emit = defineEmits(['back', 'fork'])

const project = ref(null)
const history = ref([])
const loading = ref(false)
const error = ref(null)

const images = computed(() => history.value.flatMap((h) => h.imageUrls ?? []))
const firstUserMsg = computed(() => history.value.find((h) => h.role === 'user')?.content || '')

const run = async (id) => {
  loading.value = true
  error.value = null
  project.value = null
  history.value = []
  try {
    const [proj, hist] = await Promise.all([
      feedApi.getProject(id),
      feedApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    history.value = hist
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => props.projectId, (id) => { if (id) run(id) }, { immediate: true })

const fork = () => {
  const base = project.value?.name || project.value?.title || ''
  const prompt = firstUserMsg.value || (base ? `请参考《${base}》生成一份专业的演示文稿` : '')
  emit('fork', prompt)
}
</script>
