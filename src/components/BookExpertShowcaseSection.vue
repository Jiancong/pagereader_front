<template>
  <section
    v-if="visible"
    id="book-expert-showcase"
    class="py-16 sm:py-20"
    aria-labelledby="book-expert-showcase-heading"
  >
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-10 text-center">
        <h2 id="book-expert-showcase-heading" class="mb-4 text-3xl font-bold text-foreground">
          {{ t('landing.bookExpert.showcaseTitle') }}
        </h2>
        <p class="mx-auto max-w-2xl text-lg text-muted-foreground">
          {{ t('landing.bookExpert.showcaseSubtitle') }}
        </p>
      </div>

      <div v-if="error" class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </div>

      <ul v-if="experts.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <li
          v-for="expert in experts"
          :key="expert.expert_id"
          class="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
        >
          <RouterLink
            :to="{ name: 'expert-community', params: { expertId: expert.expert_id } }"
            class="flex h-full flex-col text-left"
          >
            <div class="relative h-24 w-full overflow-hidden bg-accent/10 sm:h-28">
              <img
                v-if="expert.cover_url"
                :src="expert.cover_url"
                :alt="t('landing.bookExpert.cardAlt', { name: expert.expert_name })"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div v-else class="flex h-full items-center justify-center">
                <BookOpen class="h-8 w-8 text-accent" />
              </div>
            </div>
            <div class="flex flex-1 flex-col p-3">
              <h3 class="line-clamp-2 text-sm font-semibold text-foreground">{{ expert.expert_name }}</h3>
              <p v-if="expert.book_title" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {{ expert.book_title }}
              </p>
            </div>
          </RouterLink>
        </li>
      </ul>

      <div v-if="loading" class="mt-8 flex justify-center text-muted-foreground">
        <Loader2 class="h-5 w-5 animate-spin" />
      </div>

      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
          @click="$emit('explore')"
        >
          {{ t('landing.bookExpert.ctaExplore') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          @click="$emit('create')"
        >
          <Sparkles class="h-4 w-4" />
          {{ t('landing.bookExpert.ctaCreate') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loader2, Sparkles, BookOpen } from 'lucide-vue-next'
import { bookExpertApi } from '@/api'
import type { BookExpertSummary } from '@/api/types'

const props = defineProps<{ userId?: string | number | null }>()
defineEmits<{ create: []; explore: [] }>()

const { t } = useI18n()

const LANDING_EXPERT_LIMIT = 8

const experts = ref<BookExpertSummary[]>([])
const loading = ref(false)
const error = ref('')
const hasLoaded = ref(false)

const visible = computed(() => loading.value || (hasLoaded.value && experts.value.length > 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const uid = props.userId != null ? String(props.userId).trim() : ''
    const res = await bookExpertApi.listPublicExperts(uid || undefined, Boolean(uid))
    experts.value = (res?.experts ?? []).slice(0, LANDING_EXPERT_LIMIT)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('common.loadFailed')
    experts.value = []
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

watch(
  () => props.userId,
  () => {
    void load()
  },
)

onMounted(() => {
  void load()
})
</script>
