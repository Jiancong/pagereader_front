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
      <!-- 我的专家 -->
      <section v-if="myExperts.length" class="mb-8">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {{ t('bookExpert.myExperts') }}
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <div v-for="expert in myExperts" :key="expert.expert_id" class="group relative">
            <button
              type="button"
              class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
              @click="$emit('select-expert', expert)"
            >
              <div class="relative h-24 w-full overflow-hidden bg-primary/10 sm:h-28">
                <img
                  v-if="expert.cover_url"
                  :src="expert.cover_url"
                  :alt="expert.expert_name"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div v-else class="flex h-full items-center justify-center">
                  <BookOpen class="h-8 w-8 text-primary" />
                </div>
                <span
                  v-if="expert.visibility === 'public'"
                  class="absolute bottom-1 right-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur"
                >{{ t('bookExpert.publicBadge') }}</span>
              </div>
              <div class="flex flex-1 flex-col p-3">
                <p class="line-clamp-2 text-sm font-medium text-foreground">{{ expert.expert_name }}</p>
                <p v-if="expert.book_title" class="mt-1 line-clamp-1 text-xs text-muted-foreground">{{ expert.book_title }}</p>
              </div>
            </button>
            <button
              type="button"
              class="absolute left-2 top-2 z-10 rounded-lg bg-background/90 p-1.5 text-muted-foreground opacity-100 shadow-sm backdrop-blur transition-all hover:bg-primary/10 hover:text-primary md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              :title="expert.visibility === 'public' ? t('bookExpert.unpublish') : t('bookExpert.publish')"
              :aria-label="expert.visibility === 'public' ? t('bookExpert.unpublish') : t('bookExpert.publish')"
              :disabled="publishingId === expert.expert_id"
              @click.stop="onTogglePublish(expert)"
            >
              <Loader2 v-if="publishingId === expert.expert_id" class="h-4 w-4 animate-spin" />
              <Globe v-else-if="expert.visibility === 'public'" class="h-4 w-4" />
              <Lock v-else class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="absolute right-2 top-2 z-10 rounded-lg bg-background/90 p-1.5 text-muted-foreground opacity-100 shadow-sm backdrop-blur transition-all hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              :title="t('bookExpert.delete')"
              :aria-label="t('bookExpert.delete')"
              :disabled="deletingId === expert.expert_id"
              @click.stop="onDelete(expert)"
            >
              <Loader2 v-if="deletingId === expert.expert_id" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <!-- 公共专家（推荐流，排除自己） -->
      <section v-if="publicExperts.length">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {{ t('bookExpert.publicExperts') }}
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <button
            v-for="expert in publicExperts"
            :key="expert.expert_id"
            type="button"
            class="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
            @click="$emit('select-expert', expert)"
          >
            <div class="relative h-24 w-full overflow-hidden bg-accent/10 sm:h-28">
              <img
                v-if="expert.cover_url"
                :src="expert.cover_url"
                :alt="expert.expert_name"
                class="h-full w-full object-cover"
                loading="lazy"
              />
              <div v-else class="flex h-full items-center justify-center">
                <BookOpen class="h-8 w-8 text-accent" />
              </div>
            </div>
            <div class="flex flex-1 flex-col p-3">
              <p class="line-clamp-2 text-sm font-medium text-foreground">{{ expert.expert_name }}</p>
              <p v-if="expert.book_title" class="mt-1 line-clamp-1 text-xs text-muted-foreground">{{ expert.book_title }}</p>
            </div>
          </button>
        </div>
      </section>

      <p v-if="!myExperts.length && !publicExperts.length" class="py-12 text-center text-sm text-muted-foreground">
        {{ t('bookExpert.exploreEmpty') }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Loader2, BookOpen, Trash2, Globe, Lock } from 'lucide-vue-next'
import { bookExpertApi } from '@/api'
import type { BookExpertSummary } from '@/api/types'

const props = defineProps<{ userId: string | null }>()
const emit = defineEmits<{ 'select-expert': [expert: BookExpertSummary] }>()

const { t } = useI18n()

const myRaw = ref<BookExpertSummary[]>([])
const publicRaw = ref<BookExpertSummary[]>([])
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const deletingId = ref<string | null>(null)
const publishingId = ref<string | null>(null)

async function load() {
  if (!props.userId) return
  loading.value = true
  loadError.value = ''
  try {
    const [mine, pub] = await Promise.all([
      bookExpertApi.listMyExperts(String(props.userId)),
      bookExpertApi.listPublicExperts(String(props.userId), true),
    ])
    myRaw.value = mine?.experts ?? []
    publicRaw.value = pub?.experts ?? []
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : t('common.actionFailed')
  } finally {
    loading.value = false
  }
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

async function onDelete(expert: BookExpertSummary) {
  if (!props.userId || deletingId.value) return
  try {
    await ElMessageBox.confirm(
      t('bookExpert.deleteConfirm', { name: expert.expert_name }),
      t('bookExpert.delete'),
      { type: 'warning' },
    )
  } catch {
    return
  }
  deletingId.value = expert.expert_id
  try {
    await bookExpertApi.deleteExpert(expert.expert_id, String(props.userId))
    myRaw.value = myRaw.value.filter((e) => e.expert_id !== expert.expert_id)
    publicRaw.value = publicRaw.value.filter((e) => e.expert_id !== expert.expert_id)
    ElMessage.success(t('bookExpert.deleted'))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    deletingId.value = null
  }
}

/** 发布/取消发布（Globe=已公开，点击取消；Lock=私有，点击发布） */
async function onTogglePublish(expert: BookExpertSummary) {
  if (!props.userId || publishingId.value) return
  const makePublic = expert.visibility !== 'public'
  publishingId.value = expert.expert_id
  try {
    const res = await bookExpertApi.publishExpert(expert.expert_id, {
      userId: String(props.userId),
      public: makePublic,
    })
    const visibility = res?.visibility ?? (makePublic ? 'public' : 'private')
    myRaw.value = myRaw.value.map((e) =>
      e.expert_id === expert.expert_id ? { ...e, visibility } : e,
    )
    ElMessage.success(makePublic ? t('bookExpert.published') : t('bookExpert.unpublished'))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    publishingId.value = null
  }
}

const myExperts = computed(() => filterByKeyword(myRaw.value))
const publicExperts = computed(() => filterByKeyword(publicRaw.value))

onMounted(load)
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
