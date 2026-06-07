<template>
  <div class="flex h-full min-h-0 flex-col">
    <div v-if="loadingQuota" class="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
      <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t('workspace.assets.loading') }}
    </div>
    <div v-else-if="quota" class="mb-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
      <div class="flex items-center justify-between gap-2 text-xs">
        <span class="font-medium text-foreground">{{ t('workspace.assets.cloudStorage') }}</span>
        <span class="text-muted-foreground">{{ quotaUsedLabel }} / {{ quotaLimitLabel }}</span>
      </div>
      <div
        class="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        :aria-valuenow="quotaPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full rounded-full bg-primary transition-all"
          :style="{ width: `${quotaPercent}%` }"
        />
      </div>
      <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{{ t('workspace.assets.usedPercent', { n: quotaPercent }) }}</span>
        <span>{{ t('workspace.assets.remaining', { size: quotaRemainingLabel }) }}</span>
      </div>
      <p v-if="statsLabel" class="mt-1 text-[11px] text-muted-foreground">{{ statsLabel }}</p>
    </div>

    <div class="mb-2 flex gap-1 rounded-lg bg-secondary/50 p-1" role="tablist" :aria-label="t('workspace.assets.title')">
      <button
        v-for="tab in sourceTabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="source === tab.id"
        :class="[
          'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          source === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="switchSource(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="loadingList && !items.length" class="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 class="h-5 w-5 animate-spin" />
      </div>
      <p v-else-if="listError" class="px-1 py-6 text-center text-xs text-red-400">{{ listError }}</p>
      <p v-else-if="!items.length" class="px-1 py-10 text-center text-xs text-muted-foreground">{{ t('workspace.assets.noAssets') }}</p>
      <div v-else class="grid grid-cols-2 gap-2">
        <div
          v-for="asset in items"
          :key="asset.fileKey"
          class="group relative overflow-hidden rounded-lg border border-border bg-card"
        >
          <button
            type="button"
            :title="t('workspace.assets.deleteAsset')"
            class="absolute right-1 top-1 z-10 rounded-md bg-background/90 p-1 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
            :disabled="deletingKey === asset.fileKey"
            @click.stop="onDelete(asset)"
          >
            <Loader2 v-if="deletingKey === asset.fileKey" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
          </button>

          <a
            v-if="asset.url"
            :href="asset.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block"
          >
            <div class="relative aspect-square overflow-hidden bg-secondary/40">
              <img
                v-if="resolveAssetPreviewUrl(asset)"
                :src="resolveAssetPreviewUrl(asset)"
                :alt="asset.name"
                loading="lazy"
                class="h-full w-full object-cover"
              />
              <div
                v-else-if="isPdfAsset(asset.name, asset.url, asset.contentType)"
                class="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <FileText class="h-8 w-8" />
                <span class="px-2 text-center text-[10px] uppercase tracking-wide">PDF</span>
              </div>
              <div v-else class="flex h-full w-full items-center justify-center text-muted-foreground">
                <File class="h-8 w-8" />
              </div>
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                <ExternalLink class="h-5 w-5 text-white" />
              </div>
            </div>
          </a>
          <div v-else class="relative aspect-square bg-secondary/40">
            <div class="flex h-full w-full items-center justify-center text-muted-foreground">
              <File class="h-8 w-8" />
            </div>
          </div>

          <div class="space-y-0.5 border-t border-border px-2 py-1.5">
            <p class="truncate text-[11px] font-medium text-foreground" :title="asset.name">{{ asset.name }}</p>
            <p v-if="asset.size != null" class="text-[10px] text-muted-foreground">{{ formatBytes(asset.size) }}</p>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="mt-3 flex justify-center pb-2">
        <button
          type="button"
          class="rounded-lg border border-border bg-secondary/50 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 disabled:opacity-50"
          :disabled="loadingMore"
          @click="loadMore"
        >
          <Loader2 v-if="loadingMore" class="mr-1 inline h-3.5 w-3.5 animate-spin" />
          {{ t('workspace.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Loader2, Trash2, FileText, File, ExternalLink } from 'lucide-vue-next'
import { fileApi } from '@/api'
import {
  formatBytes,
  isImageAsset,
  isPdfAsset,
  resolveAssetPreviewUrl,
} from '@/utils/userAssets'

const props = defineProps({
  userId: { type: [String, Number], default: null },
  projectId: { type: String, default: '' },
})

const { t } = useI18n()

const sourceTabs = computed(() => [
  { id: 'uploaded', label: t('workspace.assets.uploaded') },
  { id: 'generated', label: t('workspace.assets.generated') },
])

const source = ref('uploaded')
const items = ref([])
const nextMarker = ref(null)
const hasMore = ref(false)
const loadingList = ref(false)
const loadingMore = ref(false)
const loadingQuota = ref(false)
const listError = ref('')
const quota = ref(null)
const stats = ref(null)
const deletingKey = ref(null)

const quotaPercent = computed(() => {
  const q = quota.value
  if (!q) return 0
  const pct = Number(q.usagePercentage)
  if (Number.isFinite(pct)) return Math.min(100, Math.max(0, Math.round(pct)))
  const used = Number(q.usedBytes ?? q.used)
  const limit = Number(q.limitBytes ?? q.total)
  if (Number.isFinite(used) && Number.isFinite(limit) && limit > 0) {
    return Math.min(100, Math.max(0, Math.round((used / limit) * 100)))
  }
  return 0
})

const quotaUsedLabel = computed(() => {
  const q = quota.value
  if (!q) return '—'
  if (q.usedFormatted) return String(q.usedFormatted)
  return formatBytes(q.usedBytes ?? q.used)
})

const quotaLimitLabel = computed(() => {
  const q = quota.value
  if (!q) return '—'
  if (q.limitFormatted) return String(q.limitFormatted)
  if (q.limitGb) return `${q.limitGb} GB`
  return formatBytes(q.limitBytes ?? q.total)
})

const quotaRemainingLabel = computed(() => {
  const q = quota.value
  if (!q) return '—'
  if (q.remainingFormatted) return String(q.remainingFormatted)
  return formatBytes(q.remainingBytes)
})

const statsLabel = computed(() => {
  const s = stats.value
  if (!s) return ''
  const count = s.totalCount ?? quota.value?.totalCount
  const size = s.totalSizeFormatted ?? (s.totalBytes != null ? formatBytes(s.totalBytes) : '')
  if (count != null && size) return t('workspace.assets.totalSummary', { count, size })
  if (count != null) return t('workspace.assets.totalFiles', { count })
  if (size) return t('workspace.assets.totalSize', { size })
  return ''
})

async function loadQuota() {
  loadingQuota.value = true
  try {
    quota.value = await fileApi.getUserStorageQuota()
  } catch {
    quota.value = null
  } finally {
    loadingQuota.value = false
  }
}

async function loadStats() {
  if (!props.userId) {
    stats.value = null
    return
  }
  try {
    stats.value = await fileApi.getUserFilesStats(props.userId)
  } catch {
    stats.value = null
  }
}

async function fetchPage(marker) {
  if (!props.userId) return { items: [], nextMarker: null, hasMore: false }
  const base = {
    userId: props.userId,
    pageSize: 20,
    marker,
    projectId: props.projectId || undefined,
  }
  if (source.value === 'generated') {
    return fileApi.listUserGeneratedAssets(base)
  }
  return fileApi.listUserUploadedFiles(base)
}

async function reloadList() {
  if (!props.userId) {
    items.value = []
    hasMore.value = false
    nextMarker.value = null
    return
  }
  loadingList.value = true
  listError.value = ''
  nextMarker.value = null
  try {
    const page = await fetchPage(undefined)
    items.value = page.items
    nextMarker.value = page.nextMarker
    hasMore.value = page.hasMore
  } catch (e) {
    items.value = []
    hasMore.value = false
    listError.value = e?.message || t('common.loadFailed')
  } finally {
    loadingList.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchPage(nextMarker.value || undefined)
    items.value = [...items.value, ...page.items]
    nextMarker.value = page.nextMarker
    hasMore.value = page.hasMore
  } catch (e) {
    ElMessage.error(e?.message || t('common.loadFailed'))
  } finally {
    loadingMore.value = false
  }
}

function switchSource(next) {
  if (source.value === next) return
  source.value = next
}

async function onDelete(asset) {
  if (!asset?.fileKey || deletingKey.value) return
  if (!window.confirm(t('workspace.assets.deleteAssetConfirm', { name: asset.name }))) return
  deletingKey.value = asset.fileKey
  try {
    await fileApi.deleteUserFile(asset.fileKey)
    items.value = items.value.filter((item) => item.fileKey !== asset.fileKey)
    await Promise.all([loadQuota(), loadStats()])
    ElMessage.success(t('workspace.assets.deleteAssetSuccess'))
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    deletingKey.value = null
  }
}

async function refresh() {
  await Promise.all([loadQuota(), loadStats(), reloadList()])
}

watch(
  () => [props.userId, props.projectId, source.value],
  () => {
    reloadList()
  },
)

watch(
  () => props.userId,
  (id) => {
    if (id) {
      loadQuota()
      loadStats()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.userId) reloadList()
})

defineExpose({ refresh })
</script>
