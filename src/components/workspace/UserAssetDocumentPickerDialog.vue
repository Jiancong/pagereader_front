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
          <ul v-else class="space-y-2">
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
                      {{ t('workspace.attachmentsAlreadyLinked') }}
                    </span>
                  </p>
                </div>
              </button>
            </li>
          </ul>
          <div v-if="hasMore && items.length" class="mt-3 flex justify-center pb-1">
            <button
              type="button"
              class="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <Loader2 v-if="loadingMore" class="mr-1 inline h-3 w-3 animate-spin" />
              {{ t('workspace.loadMore') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, Loader2, X } from 'lucide-vue-next'
import { fileApi } from '@/api'
import type { UserAssetItem } from '@/api/types'
import { formatBytes } from '@/utils/userAssets'
import { isPptDocumentAsset } from '@/utils/pptDocumentRag'

const props = defineProps<{
  open: boolean
  userId: string | null
  title: string
  /** 已关联的 fileKey，选择时禁用 */
  disabledKeys?: Set<string>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: UserAssetItem]
}>()

const { t } = useI18n()

const items = ref<UserAssetItem[]>([])
const nextMarker = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const scrollRef = ref<HTMLElement | null>(null)

function close() {
  emit('update:open', false)
}

function filterDocuments(list: UserAssetItem[]): UserAssetItem[] {
  return list.filter((a) =>
    isPptDocumentAsset(a.name, a.url, a.contentType),
  )
}

async function fetchPage(marker?: string) {
  const uid = String(props.userId || '').trim()
  if (!uid) return { items: [] as UserAssetItem[], nextMarker: null as string | null, hasMore: false }
  const page = await fileApi.listUserUploadedFiles({
    userId: uid,
    pageSize: 30,
    marker,
  })
  return {
    items: filterDocuments(page.items),
    nextMarker: page.nextMarker ?? null,
    hasMore: page.hasMore,
  }
}

async function reload() {
  const uid = String(props.userId || '').trim()
  if (!uid) {
    items.value = []
    error.value = t('workspace.assets.loginRequired')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const page = await fetchPage(undefined)
    items.value = page.items
    nextMarker.value = page.nextMarker
    hasMore.value = page.hasMore
  } catch (e: unknown) {
    items.value = []
    error.value = e instanceof Error ? e.message : t('common.loadFailed')
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchPage(nextMarker.value || undefined)
    const merged = [...items.value]
    for (const a of page.items) {
      if (!merged.some((x) => x.fileKey === a.fileKey)) merged.push(a)
    }
    items.value = merged
    nextMarker.value = page.nextMarker
    hasMore.value = page.hasMore
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('common.loadFailed')
  } finally {
    loadingMore.value = false
  }
}

function onScroll(ev: Event) {
  const el = ev.target as HTMLElement
  if (!hasMore.value || loadingMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) void loadMore()
}

function onPick(asset: UserAssetItem) {
  if (props.disabledKeys?.has(asset.fileKey)) return
  emit('select', asset)
  close()
}

watch(
  () => [props.open, props.userId] as const,
  ([isOpen]) => {
    if (isOpen) void reload()
  },
)
</script>
