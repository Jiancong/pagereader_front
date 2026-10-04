<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="close"
    >
      <div
        class="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
          <button
            type="button"
            class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            :aria-label="t('workspace.assets.close')"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div ref="scrollRef" class="min-h-0 flex-1 overflow-y-auto px-3 py-3" @scroll.passive="onScroll">
          <p v-if="loading && !items.length" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            {{ t('workspace.assets.loading') }}
          </p>
          <p v-else-if="error" class="py-8 text-center text-xs text-red-400">{{ error }}</p>
          <p v-else-if="!items.length" class="py-10 text-center text-xs text-muted-foreground">
            {{ t('workspace.assets.noUploadedDocs') }}
          </p>
          <template v-else>
            <ul class="space-y-2">
              <li v-for="asset in items" :key="asset.fileKey">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="Boolean(disabledKeys?.has(asset.fileKey))"
                  @click="onPick(asset)"
                >
                  <FileText class="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-medium text-foreground">{{ asset.name }}</p>
                    <p class="text-[10px] text-muted-foreground">
                      <span v-if="asset.size != null">{{ formatBytes(asset.size) }}</span>
                      <span v-if="disabledKeys?.has(asset.fileKey)" class="text-primary">
                        · {{ t('workspace.attachmentsAlreadyLinked') }}
                      </span>
                    </p>
                  </div>
                  <Check
                    v-if="disabledKeys?.has(asset.fileKey)"
                    class="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                </button>
              </li>
            </ul>
            <p
              v-if="loadingMore"
              class="mt-3 flex items-center justify-center gap-2 pb-1 text-[11px] text-muted-foreground"
            >
              <Loader2 class="h-3.5 w-3.5 animate-spin" />
              {{ t('workspace.attachmentsLibraryLoadingMore') }}
            </p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, FileText, Loader2, X } from 'lucide-vue-next'
import { fileApi } from '@/api'
import type { UserAssetItem } from '@/api/types'
import { formatBytes } from '@/utils/userAssets'
import { isPptDocumentAsset } from '@/utils/pptDocumentRag'

const props = defineProps<{
  open: boolean
  userId: string | null
  title: string
  /** 作品上下文：与「我的资源」一致传 projectId；专家附件不传 */
  projectId?: string | null
  /** 已关联的 fileKey，选择时禁用 */
  disabledKeys?: Set<string>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: UserAssetItem]
}>()

const { t } = useI18n()

const PAGE_SIZE = 20

const items = ref<UserAssetItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const scrollRef = ref<HTMLElement | null>(null)
/** 防止 scroll 与 reload 并发重复拉页 */
let loadGeneration = 0

function close() {
  emit('update:open', false)
}

function filterDocuments(list: UserAssetItem[]): UserAssetItem[] {
  return list.filter((a) =>
    isPptDocumentAsset(a.name, a.url, a.contentType),
  )
}

function mergeDocumentItems(into: UserAssetItem[], batch: UserAssetItem[]) {
  for (const a of batch) {
    if (!into.some((x) => x.fileKey === a.fileKey)) into.push(a)
  }
}

async function fetchRawPage(marker?: string) {
  const uid = String(props.userId || '').trim()
  if (!uid) {
    return { items: [] as UserAssetItem[], nextMarker: null as string | null, hasMore: false }
  }
  const pid = String(props.projectId || '').trim()
  return fileApi.listUserUploadedFiles({
    userId: uid,
    pageSize: PAGE_SIZE,
    marker,
    projectId: pid || undefined,
  })
}

/** 按 OSS 分页拉取直至 hasMore=false（与 WorkspaceUserAssetsPanel 一致，避免只加载首页） */
async function loadAllDocuments(gen: number) {
  const merged: UserAssetItem[] = []
  let marker: string | undefined
  let more = true
  let first = true

  while (more) {
    if (gen !== loadGeneration) return merged
    if (first) {
      loading.value = true
      first = false
    } else {
      loadingMore.value = true
    }

    const page = await fetchRawPage(marker)
    if (gen !== loadGeneration) return merged

    mergeDocumentItems(merged, filterDocuments(page.items))
    items.value = [...merged]

    more = page.hasMore
    const next = page.nextMarker?.trim()
    if (more && !next) break
    marker = next || undefined
    if (!more) break
  }

  return merged
}

async function reload() {
  const uid = String(props.userId || '').trim()
  if (!uid) {
    items.value = []
    error.value = t('workspace.assets.loginRequired')
    return
  }

  const gen = ++loadGeneration
  error.value = ''
  items.value = []
  loading.value = true
  loadingMore.value = false

  try {
    items.value = await loadAllDocuments(gen)
  } catch (e: unknown) {
    if (gen === loadGeneration) {
      items.value = []
      error.value = e instanceof Error ? e.message : t('common.loadFailed')
    }
  } finally {
    if (gen === loadGeneration) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function onScroll(ev: Event) {
  /* 已在 reload 中拉全量；保留 hook 供后续若改回按需分页 */
  void ev
}

function onPick(asset: UserAssetItem) {
  if (props.disabledKeys?.has(asset.fileKey)) return
  emit('select', asset)
  close()
}

watch(
  () => [props.open, props.userId, props.projectId] as const,
  ([isOpen]) => {
    if (isOpen) void reload()
  },
)
</script>
