<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-foreground">{{ t('workspace.exploreTitle') }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.exploreSubtitle') }}</p>
    </div>

    <div v-if="error" class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="item in items"
        :key="item.id"
        class="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
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
        <div class="flex flex-1 flex-col p-3">
          <p class="line-clamp-2 text-sm font-medium text-foreground">{{ item.name || item.nameEn || t('workspace.unnamed') }}</p>
          <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span v-if="item.authorNickname" class="truncate">{{ item.authorNickname }}</span>
            <span class="ml-auto flex items-center gap-1"><Eye class="h-3 w-3" />{{ item.viewCount ?? 0 }}</span>
            <span class="flex items-center gap-1"><Heart class="h-3 w-3" />{{ item.favoriteCount ?? 0 }}</span>
          </div>
        </div>
      </button>
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
import { Loader2, Eye, Heart } from 'lucide-vue-next'
import { feedApi } from '../../api'

defineEmits(['open'])

const { t } = useI18n()

const PAGE_SIZE = 24
const items = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref(null)

const hasMore = computed(() => items.value.length < total.value)
const cover = (item) => item.imageUrl || item.imageUrls?.[0] || ''

const load = async (p) => {
  loading.value = true
  error.value = null
  try {
    const res = await feedApi.getFeedStream({ page: p, pageSize: PAGE_SIZE, sort: 1 })
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
