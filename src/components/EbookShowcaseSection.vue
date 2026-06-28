<template>
  <section
    v-if="cards.length || loading"
    id="ebooks"
    class="py-20"
    aria-labelledby="ebooks-heading"
  >
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-10 text-center">
        <h2 id="ebooks-heading" class="mb-4 text-3xl font-bold text-foreground">
          {{ t('landing.ebooks.title') }}
        </h2>
        <p class="mx-auto max-w-2xl text-lg text-muted-foreground">
          {{ t('landing.ebooks.subtitle') }}
        </p>
      </div>

      <div v-if="error" class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </div>

      <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <li
          v-for="card in cards"
          :key="card.id"
          class="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
        >
          <RouterLink :to="card.to" class="flex h-full flex-col text-left">
            <div class="aspect-[3/4] w-full overflow-hidden bg-secondary/40">
              <img
                v-if="card.cover"
                :src="card.cover"
                :alt="t('landing.ebooks.cardAlt', { title: card.title })"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground"
              >
                {{ card.title }}
              </div>
            </div>
            <div class="flex flex-1 flex-col p-3">
              <h3 class="line-clamp-2 text-sm font-semibold text-foreground">{{ card.title }}</h3>
              <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ card.tagline }}</p>
            </div>
          </RouterLink>
        </li>
      </ul>

      <div v-if="loading" class="mt-8 flex justify-center text-muted-foreground">
        <Loader2 class="h-5 w-5 animate-spin" />
      </div>

      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <RouterLink
          to="/explore"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
        >
          {{ t('landing.ebooks.viewAll') }}
        </RouterLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          @click="$emit('start')"
        >
          <Sparkles class="h-4 w-4" /> {{ t('landing.ebooks.cta') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loader2, Sparkles } from 'lucide-vue-next'
import { feedApi, buildFeedStreamRequest } from '@/api'
import { feedItemShareProjectId } from '@/utils/feedOpen'
import { bookCardTagline } from '@/utils/bookSeo'

defineEmits(['start'])

const { t } = useI18n()

const cards = ref([])
const loading = ref(false)
const error = ref(null)

const buildCard = (item) => {
  const projectId = feedItemShareProjectId(item)
  if (!projectId) return null
  const title = item.name || item.nameEn || ''
  if (!title) return null
  return {
    id: item.id,
    to: { name: 'project-community', params: { projectId } },
    cover: item.imageUrl || item.imageUrls?.[0] || '',
    title,
    tagline: bookCardTagline(title),
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await feedApi.getFeedStream(buildFeedStreamRequest(1))
    cards.value = (res.data || []).map(buildCard).filter(Boolean)
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
  }
})
</script>
