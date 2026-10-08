<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-4 sm:mb-6">
      <h2 class="text-xl font-bold text-foreground sm:text-2xl">{{ t('bookExpert.exploreTitle') }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('bookExpert.exploreSubtitle') }}</p>
    </div>

    <div class="mb-4 relative max-w-md">
      <Search class="be-explore__search-icon" />
      <input
        v-model="keyword"
        type="text"
        class="be-explore__search-input"
        :placeholder="t('bookExpert.searchPlaceholder')"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>{{ t('common.loading') }}</span>
    </div>
    <div v-else-if="loadError" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ loadError }}</div>

    <template v-else>
      <section v-if="publicExperts.length">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {{ t('bookExpert.publicExpertsFromOthers') }}
        </h3>
        <div class="grid grid-cols-4 gap-2 sm:gap-3">
          <button
            v-for="expert in publicExperts"
            :key="expert.expert_id"
            type="button"
            class="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-md"
            @click="$emit('select-expert', expert)"
          >
            <div class="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-accent/10">
              <img
                v-if="expert.cover_url"
                :src="expert.cover_url"
                :alt="expert.expert_name"
                class="max-h-full max-w-full object-contain"
                loading="lazy"
              />
              <div v-else class="flex h-full w-full items-center justify-center">
                <BookOpen class="h-7 w-7 text-accent sm:h-8 sm:w-8" />
              </div>
            </div>
            <div class="flex flex-1 flex-col p-1.5 sm:p-2">
              <p class="line-clamp-2 text-[10px] font-medium leading-snug text-foreground sm:text-xs">
                {{ expert.expert_name }}
                <span
                  v-if="isOwnExpert(expert)"
                  class="ml-0.5 inline-flex rounded bg-primary/15 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-primary sm:text-[9px]"
                >
                  {{ t('bookExpert.exploreMineBadge') }}
                </span>
              </p>
              <p v-if="expert.book_title" class="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">{{ expert.book_title }}</p>
              <BookExpertEngagementRow
                :expert="expert"
                :liking="favoritingId === expert.expert_id"
                @toggle-like="toggleLike(expert)"
              />
            </div>
          </button>
        </div>
      </section>

      <p
        v-else
        class="py-12 text-center text-sm text-muted-foreground"
      >
        {{ t('bookExpert.exploreEmptyPublic') }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Loader2, BookOpen } from 'lucide-vue-next'
import { bookExpertApi } from '@/api'
import type { BookExpertSummary } from '@/api/types'
import BookExpertEngagementRow from '@/components/workspace/BookExpertEngagementRow.vue'
import { useBookExpertLikeToggle } from '@/composables/useBookExpertLikeToggle'
import {
  localizeBookExpertSummaries,
  mapBookExpertSummariesForDisplay,
} from '@/utils/resolveBookExpertDisplay'

const props = defineProps<{ userId: string | null }>()
defineEmits<{ 'select-expert': [expert: BookExpertSummary] }>()

const { t, locale } = useI18n()
const { favoritingId, toggleLike } = useBookExpertLikeToggle(() => props.userId)

const publicRaw = ref<BookExpertSummary[]>([])
const publicLocalized = ref<BookExpertSummary[]>([])
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')

async function load() {
  if (!props.userId) return
  loading.value = true
  loadError.value = ''
  try {
    const pub = await bookExpertApi.listPublicExperts(String(props.userId))
    publicRaw.value = pub?.experts ?? []
    publicLocalized.value = mapBookExpertSummariesForDisplay(publicRaw.value, locale.value)
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : t('common.actionFailed')
    publicRaw.value = []
    publicLocalized.value = []
  } finally {
    loading.value = false
  }
  void refineDisplayLocale()
}

function filterByKeyword(list: BookExpertSummary[]): BookExpertSummary[] {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(
    (e) =>
      e.expert_name.toLowerCase().includes(kw) ||
      (e.book_title ?? '').toLowerCase().includes(kw),
  )
}

function applyDisplayLocaleSync() {
  publicLocalized.value = mapBookExpertSummariesForDisplay(publicRaw.value, locale.value)
}

/** 批量翻译可能较慢，不阻塞列表首屏。 */
async function refineDisplayLocale() {
  if (!publicRaw.value.length) return
  applyDisplayLocaleSync()
  try {
    publicLocalized.value = await localizeBookExpertSummaries(publicRaw.value, locale.value)
  } catch {
    /* 保留 sync 结果 */
  }
}

watch(locale, () => {
  applyDisplayLocaleSync()
  void refineDisplayLocale()
})

const publicExperts = computed(() => filterByKeyword(publicLocalized.value))

function isOwnExpert(expert: BookExpertSummary): boolean {
  const uid = String(props.userId ?? "").trim()
  if (!uid) return false
  return String(expert.owner_user_id ?? "") === uid
}

onMounted(load)
watch(
  () => props.userId,
  (uid) => {
    if (uid) void load()
  },
)
</script>

<style scoped>
.be-explore__search {
  position: relative;
  margin-bottom: 16px;
  max-width: 28rem;
}
.be-explore__search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
}
.be-explore__search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border-radius: 10px;
  border: 1px solid hsl(var(--foreground) / 0.35);
  background: hsl(var(--background));
  font-size: 13px;
  color: hsl(var(--foreground));
}
.be-explore__search-input::placeholder { color: hsl(var(--muted-foreground)); }
.be-explore__search-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
}
</style>
