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
      <!-- 我已公开（探索页不展示私有专家，私有仅从侧栏「我的历史」进入） -->
      <section v-if="myPublishedExperts.length" class="mb-8">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {{ t('bookExpert.myPublishedExperts') }}
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <ExpertOwnedCard
            v-for="expert in myPublishedExperts"
            :key="expert.expert_id"
            :expert="expert"
            :publishing-id="publishingId"
            :deleting-id="deletingId"
            show-public-badge
            @select="$emit('select-expert', $event)"
            @toggle-publish="onTogglePublish"
            @delete="onDelete"
          />
        </div>
      </section>

      <!-- 公共专家（他人发布，推荐流 exclude_own） -->
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

      <p
        v-if="!myPublishedExperts.length && !publicExperts.length"
        class="py-12 text-center text-sm text-muted-foreground"
      >
        {{ t('bookExpert.exploreEmptyPublic') }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Loader2, BookOpen } from 'lucide-vue-next'
import { bookExpertApi } from '@/api'
import ExpertOwnedCard from '@/components/workspace/BookExpertOwnedCard.vue'
import type { BookExpertSummary } from '@/api/types'

const props = defineProps<{ userId: string | null }>()
const emit = defineEmits<{ 'select-expert': [expert: BookExpertSummary]; 'experts-changed': [] }>()

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
    emit('experts-changed')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    deletingId.value = null
  }
}

async function onTogglePublish(expert: BookExpertSummary) {
  if (!props.userId || publishingId.value) return
  const makePublic = expert.visibility !== 'public'
  publishingId.value = expert.expert_id
  try {
    const res = await bookExpertApi.publishExpert(expert.expert_id, {
      userId: String(props.userId),
      public: makePublic,
    })
    const visibility: BookExpertSummary['visibility'] =
      res?.visibility ?? (makePublic ? 'public' : 'private')
    myRaw.value = myRaw.value.map((e) =>
      e.expert_id === expert.expert_id ? { ...e, visibility } : e,
    )
    ElMessage.success(makePublic ? t('bookExpert.published') : t('bookExpert.unpublished'))
    emit('experts-changed')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    publishingId.value = null
  }
}

const myPublishedExperts = computed(() =>
  filterByKeyword(myRaw.value.filter((e) => e.visibility === 'public')),
)
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
