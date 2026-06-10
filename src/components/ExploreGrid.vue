<template>
  <div class="mx-auto max-w-6xl">
    <div v-if="showHeader" class="mb-4 sm:mb-6">
      <h2 class="text-xl font-bold text-foreground sm:text-2xl">{{ t('workspace.exploreTitle') }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.exploreSubtitle') }}</p>
    </div>

    <div v-if="error" class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
      >
        <button
          type="button"
          class="flex flex-1 flex-col text-left"
          @click="$emit('open', item)"
        >
          <div class="aspect-[3/4] w-full overflow-hidden bg-secondary/40">
            <img
              v-if="cover(item)"
              :src="cover(item)"
              :alt="item.name || ''"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{{ t('workspace.noCover') }}</div>
          </div>
          <div class="flex flex-1 flex-col p-2 sm:p-3">
            <p class="line-clamp-2 text-xs font-medium text-foreground sm:text-sm">{{ item.name || item.nameEn || t('workspace.unnamed') }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground sm:mt-2 sm:gap-x-3 sm:text-xs">
              <span v-if="item.authorNickname" class="min-w-0 max-w-full truncate">{{ item.authorNickname }}</span>
              <span class="flex items-center gap-1 sm:ml-auto"><Eye class="h-3 w-3" />{{ item.viewCount ?? 0 }}</span>
              <button
                v-if="shareProjectId(item)"
                type="button"
                class="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground"
                :aria-label="t('workspace.share')"
                @click.stop="copyShareLink(item)"
              >
                <Share2 class="h-3 w-3" />
              </button>
              <button
                type="button"
                class="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground disabled:opacity-50"
                :class="item.likedByMe ? 'text-primary' : ''"
                :disabled="favoritingId === item.id"
                :aria-label="item.likedByMe ? t('workspace.unfavorite') : t('workspace.favorite')"
                :aria-pressed="Boolean(item.likedByMe)"
                @click.stop="toggleFavorite(item)"
              >
                <Loader2 v-if="favoritingId === item.id" class="h-3 w-3 animate-spin" />
                <Heart
                  v-else
                  class="h-3 w-3"
                  :class="item.likedByMe ? 'fill-current' : ''"
                />
                {{ item.favoriteCount ?? 0 }}
              </button>
            </div>
          </div>
        </button>
        <button
          v-if="canDelete(item)"
          type="button"
          :title="t('workspace.deleteProject')"
          class="absolute right-2 top-2 rounded-lg bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          :disabled="deletingId === deleteKey(item)"
          @click.stop="onDelete(item)"
        >
          <Loader2 v-if="deletingId === deleteKey(item)" class="h-4 w-4 animate-spin" />
          <Trash2 v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 class="h-5 w-5 animate-spin" />
    </div>
    <div v-else-if="hasMore" class="mt-6 flex justify-center">
      <button
        class="rounded-lg border border-border bg-secondary/50 px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
        @click="load(page + 1)"
      >
        {{ t('workspace.loadMore') }}
      </button>
    </div>
    <p v-if="!loading && !items.length && !error" class="py-12 text-center text-sm text-muted-foreground">{{ t('workspace.noWorks') }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Loader2, Eye, Heart, Trash2, Share2 } from 'lucide-vue-next'
import { feedApi } from '@/api'
import { canDeleteFeedItem, feedItemDeleteProjectId } from '@/utils/projectDelete'
import { buildExploreProjectShareUrl, feedItemShareProjectId } from '@/utils/feedOpen'

const props = defineProps({
  userId: { type: [String, Number], default: null },
  showHeader: { type: Boolean, default: true },
})

const emit = defineEmits(['open', 'deleted'])

const { t } = useI18n()

const PAGE_SIZE = 24
const items = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref(null)
const deletingId = ref(null)
const favoritingId = ref(null)

const hasMore = computed(() => items.value.length < total.value)
const cover = (item) => item.imageUrl || item.imageUrls?.[0] || ''
const canDelete = (item) => canDeleteFeedItem(item, props.userId)
const deleteKey = (item) => feedItemDeleteProjectId(item) || item.id
const shareProjectId = (item) => feedItemShareProjectId(item)

const copyShareLink = async (item) => {
  const projectId = shareProjectId(item)
  if (!projectId) {
    ElMessage.warning(t('agent.pptShareNoProject'))
    return
  }
  try {
    await navigator.clipboard.writeText(buildExploreProjectShareUrl(projectId))
    ElMessage.success(t('agent.pptShareLinkCopied'))
  } catch {
    ElMessage.error(t('agent.pptShareCopyFailed'))
  }
}

const onDelete = async (item) => {
  const projectId = feedItemDeleteProjectId(item)
  if (!projectId || !canDelete(item)) return
  if (!window.confirm(t('workspace.deleteProjectConfirm'))) return
  deletingId.value = projectId
  try {
    await feedApi.deleteProject(projectId)
    items.value = items.value.filter((i) => deleteKey(i) !== projectId)
    total.value = Math.max(0, total.value - 1)
    ElMessage.success(t('workspace.deleteProjectSuccess'))
    emit('deleted', projectId)
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    deletingId.value = null
  }
}

const toggleFavorite = async (item) => {
  if (!item?.id || favoritingId.value) return
  const action = item.likedByMe ? 'unclick' : 'click'
  favoritingId.value = item.id
  try {
    const res = await feedApi.favoriteFeedItem(item.id, action)
    item.favoriteCount = res.favoriteCount
    item.likedByMe = res.likedByMe
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    favoritingId.value = null
  }
}

const load = async (p) => {
  loading.value = true
  error.value = null
  try {
    const res = await feedApi.getFeedStream({
      page: p,
      pageSize: PAGE_SIZE,
      sort: 1,
      includeUserProjects: true,
    })
    items.value = p === 1 ? res.data : [...items.value, ...res.data]
    total.value = res.total
    page.value = p
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(() => load(1))
</script>
