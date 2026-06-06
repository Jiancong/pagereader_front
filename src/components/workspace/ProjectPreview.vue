<template>
  <div :class="pptData ? 'mx-auto w-full max-w-[min(100%,96rem)]' : 'mx-auto max-w-5xl'">
    <button
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      @click="$emit('back')"
    >
      <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
    </button>

    <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>
    <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

    <template v-if="project">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-foreground">{{ project.name || project.title || t('workspace.unnamedProject') }}</h2>
          <p v-if="project.description" class="mt-1 text-sm text-muted-foreground">{{ project.description }}</p>
        </div>
        <button
          class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          @click="fork"
        >
          <Sparkles class="h-4 w-4" /> {{ t('workspace.fork') }}
        </button>
      </div>

      <div v-if="pptData" class="mb-8 rounded-2xl border border-border bg-card">
        <PptViewer
          :ppt-data="pptData"
          :project-id="projectId"
          @update:ppt-data="(d) => (pptData = d)"
        />
      </div>

      <div v-else-if="images.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <img
          v-for="(src, i) in images"
          :key="i"
          :src="src"
          :alt="t('workspace.slideAlt', { n: i + 1 })"
          loading="lazy"
          class="w-full rounded-xl border border-border"
        />
      </div>
      <p
        v-else-if="!loadingDeck"
        class="rounded-xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground"
      >
        {{ t('workspace.noPreviewImages') }}
      </p>
      <p v-else class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 class="h-5 w-5 animate-spin" /> {{ t('workspace.loadingPpt') }}
      </p>

      <div v-if="history.length" class="mt-8">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="font-semibold text-foreground">{{ t('workspace.chatHistory') }}</h3>
          <button
            type="button"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="sharing || sharedToCommunity || !canShare"
            @click="onShareToCommunity"
          >
            {{ shareButtonLabel }}
          </button>
        </div>
        <div class="space-y-3">
          <div
            v-for="h in history"
            :key="h.id"
            class="rounded-xl border border-border p-4 text-sm"
            :class="h.role === 'user' ? 'bg-secondary/30' : 'bg-card'"
          >
            <p class="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {{ h.role === 'user' ? t('workspace.roleUser') : t('workspace.roleAi') }}
            </p>
            <p class="whitespace-pre-wrap break-words text-foreground">{{ h.content }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Loader2, Sparkles, ArrowLeft } from 'lucide-vue-next'
import PptViewer from '@/components/editor/chat/PptViewer.vue'
import { projectApi } from '../../api'
import { resolvePptDataFromStreamComplete } from '@/utils/pptCompletePayload'
import {
  buildShareToCommunityBody,
  canShareToCommunity,
  isSharedToCommunity,
  looksLikeDeckJson,
} from '@/utils/projectCommunity'

const props = defineProps({
  projectId: { type: String, required: true },
  refreshKey: { type: Number, default: 0 },
})
const emit = defineEmits(['back', 'fork'])

const { t } = useI18n()

const project = ref(null)
const history = ref([])
const pptData = ref(null)
const loading = ref(false)
const loadingDeck = ref(false)
const error = ref(null)
const sharing = ref(false)

const sharedToCommunity = computed(() => isSharedToCommunity(project.value))

/** deck 已就绪：本地已加载 pptData，或 project / 对话历史里能拿到 deck JSON 地址 */
const canShare = computed(() => {
  if (pptData.value) return true
  if (canShareToCommunity(project.value)) return true
  return collectDeckUrls(project.value, history.value).length > 0
})

const shareButtonLabel = computed(() => {
  if (sharedToCommunity.value) return t('workspace.shareInCommunity')
  if (sharing.value) return t('workspace.sharing')
  return t('workspace.shareToCommunity')
})

const previewImageUrls = computed(() =>
  history.value.flatMap((h) => (h.imageUrls ?? []).filter((u) => !looksLikeDeckJson(u))),
)

const images = computed(() => {
  if (project.value?.thumbnailUrl) {
    return [project.value.thumbnailUrl, ...previewImageUrls.value]
  }
  return previewImageUrls.value
})

const firstUserMsg = computed(() => history.value.find((h) => h.role === 'user')?.content || '')

function collectDeckUrls(proj, hist) {
  const urls = []
  if (proj?.configFilePath) urls.push(proj.configFilePath)
  const assistantRows = [...hist].reverse().filter((h) => h.role === 'assistant')
  for (const row of assistantRows) {
    for (const url of row.imageUrls ?? []) {
      if (looksLikeDeckJson(url)) urls.push(url)
    }
  }
  return [...new Set(urls)]
}

async function loadPptDeck(id, proj, hist) {
  const urls = collectDeckUrls(proj, hist)
  if (!urls.length) return
  loadingDeck.value = true
  try {
    for (const ppt_data_url of urls) {
      const resolved = await resolvePptDataFromStreamComplete({ projectId: id, ppt_data_url })
      if (resolved?.pptData) {
        pptData.value = resolved.pptData
        return
      }
    }
  } catch {
    /* 无 deck 时降级为缩略图/对话历史 */
  } finally {
    loadingDeck.value = false
  }
}

const run = async (id) => {
  loading.value = true
  loadingDeck.value = false
  error.value = null
  project.value = null
  history.value = []
  pptData.value = null
  try {
    const [proj, hist] = await Promise.all([
      projectApi.getProject(id),
      projectApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    history.value = hist
    await loadPptDeck(id, proj, hist)
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
  }
}

watch(() => props.projectId, (id) => { if (id) run(id) }, { immediate: true })
watch(() => props.refreshKey, () => {
  if (props.projectId) run(props.projectId)
})

async function onShareToCommunity() {
  if (!project.value?.id || sharedToCommunity.value) return
  if (!canShare.value) {
    ElMessage.warning(t('workspace.shareWaitPpt'))
    return
  }
  sharing.value = true
  try {
    const body = buildShareToCommunityBody(project.value, history.value)
    const result = await projectApi.shareToCommunity(project.value.id, body)
    project.value = {
      ...project.value,
      ...result,
      sharedToCommunity: true,
      isPrivate: 0,
      isRecommended: 1,
    }
    ElMessage.success(t('workspace.shareToCommunitySuccess'))
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    sharing.value = false
  }
}

const fork = () => {
  const base = project.value?.name || project.value?.title || ''
  const prompt = firstUserMsg.value || (base ? t('workspace.forkPrompt', { name: base }) : '')
  emit('fork', prompt)
}
</script>
