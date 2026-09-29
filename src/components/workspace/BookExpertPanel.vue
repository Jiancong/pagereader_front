<template>
  <div class="book-expert-panel">
    <div class="be-panel__head">
      <div class="be-panel__title-row">
        <h2 class="be-panel__title">{{ t('bookExpert.panelTitle') }}</h2>
        <button
          v-if="userId"
          type="button"
          class="be-panel__create-btn"
          :disabled="distilling"
          @click="$emit('open-distill')"
        >
          <Sparkles class="h-4 w-4" />
          {{ t('bookExpert.createExpert') }}
        </button>
      </div>
      <p class="be-panel__subtitle">{{ t('bookExpert.panelSubtitle') }}</p>
      <div class="be-panel__search">
        <Search class="be-panel__search-icon" />
        <input
          v-model="keyword"
          type="text"
          class="be-panel__search-input"
          :placeholder="t('bookExpert.searchPlaceholder')"
        />
      </div>
    </div>

    <div v-if="loading" class="be-panel__loading">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>{{ t('common.loading') }}</span>
    </div>
    <div v-else-if="listError" class="be-panel__error">{{ listError }}</div>

    <div v-else class="be-panel__body">
      <section v-if="myExperts.length" class="be-panel__section">
        <h3 class="be-panel__section-title">{{ t('bookExpert.myExperts') }}</h3>
        <ul class="be-panel__list">
          <li
            v-for="expert in myExperts"
            :key="expert.expert_id"
            class="be-expert-row"
            :class="{ 'is-active': activeExpertId === expert.expert_id }"
            @click="onSelect(expert)"
          >
            <div class="be-expert-row__icon"><BookOpen class="h-4 w-4" /></div>
            <div class="be-expert-row__meta">
              <p class="be-expert-row__name">{{ expert.expert_name }}</p>
              <p v-if="expert.book_title" class="be-expert-row__book">{{ expert.book_title }}</p>
            </div>
            <div class="be-expert-row__actions" @click.stop>
              <button
                v-if="isOwner(expert)"
                type="button"
                class="be-expert-row__btn"
                :title="expert.visibility === 'public' ? t('bookExpert.unpublish') : t('bookExpert.publish')"
                @click="onTogglePublish(expert)"
              >
                <Globe v-if="expert.visibility === 'private'" class="h-4 w-4" />
                <Lock v-else class="h-4 w-4" />
              </button>
              <button
                v-if="isOwner(expert)"
                type="button"
                class="be-expert-row__btn be-expert-row__btn--danger"
                :title="t('bookExpert.delete')"
                @click="onDelete(expert)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="publicExperts.length" class="be-panel__section">
        <h3 class="be-panel__section-title">{{ t('bookExpert.publicExperts') }}</h3>
        <ul class="be-panel__list">
          <li
            v-for="expert in publicExperts"
            :key="expert.expert_id"
            class="be-expert-row"
            :class="{ 'is-active': activeExpertId === expert.expert_id }"
            @click="onSelect(expert)"
          >
            <div class="be-expert-row__icon"><BookOpen class="h-4 w-4" /></div>
            <div class="be-expert-row__meta">
              <p class="be-expert-row__name">{{ expert.expert_name }}</p>
              <p v-if="expert.book_title" class="be-expert-row__book">{{ expert.book_title }}</p>
            </div>
          </li>
        </ul>
      </section>

      <p v-if="!myExperts.length && !publicExperts.length" class="be-panel__empty">
        {{ t('bookExpert.emptyHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Sparkles, BookOpen, Loader2, Search, Globe, Lock, Trash2 } from 'lucide-vue-next'
import { useBookExpertStore } from '@/stores/bookExpert'
import type { BookExpertSummary } from '@/api/types'

const props = defineProps<{ userId: string | null; activeExpertId: string | null }>()
const emit = defineEmits<{
  'select-expert': [expert: BookExpertSummary]
  'open-distill': []
}>()

const { t } = useI18n()
const store = useBookExpertStore()

const keyword = ref('')

const loading = computed(() => store.loadingList)
const listError = computed(() => store.listError)
const distilling = computed(() => store.distill.phase === 'running')

const myExperts = computed(() => {
  const list = props.userId
    ? store.experts.filter(
        (e) => e.owner_user_id === String(props.userId) && e.visibility === 'private',
      )
    : []
  return filterByKeyword(list)
})

const publicExperts = computed(() =>
  filterByKeyword(store.experts.filter((e) => e.visibility === 'public')),
)

function filterByKeyword(list: BookExpertSummary[]): BookExpertSummary[] {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(
    (e) =>
      e.expert_name.toLowerCase().includes(kw) ||
      (e.book_title ?? '').toLowerCase().includes(kw),
  )
}

function isOwner(expert: BookExpertSummary): boolean {
  return props.userId != null && expert.owner_user_id === String(props.userId)
}

function onSelect(expert: BookExpertSummary) {
  store.selectExpert(expert)
  emit('select-expert', expert)
}

async function onTogglePublish(expert: BookExpertSummary) {
  if (!props.userId) return
  const makePublic = expert.visibility !== 'public'
  try {
    await store.publishExpert(expert.expert_id, props.userId, makePublic)
    ElMessage.success(makePublic ? t('bookExpert.published') : t('bookExpert.unpublished'))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  }
}

async function onDelete(expert: BookExpertSummary) {
  if (!props.userId) return
  try {
    await ElMessageBox.confirm(
      t('bookExpert.deleteConfirm', { name: expert.expert_name }),
      t('bookExpert.delete'),
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await store.deleteExpert(expert.expert_id, props.userId)
    ElMessage.success(t('bookExpert.deleted'))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  }
}

async function load() {
  if (props.userId) await store.fetchExperts(props.userId)
}

onMounted(load)
watch(() => props.userId, load)
</script>

<style scoped>
.book-expert-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.be-panel__head { padding: 4px 0 12px; border-bottom: 1px solid hsl(var(--border)); }
.be-panel__title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.be-panel__title { font-size: 18px; font-weight: 700; color: hsl(var(--foreground)); }
.be-panel__create-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 10px; font-size: 13px; font-weight: 600;
  border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
}
.be-panel__create-btn:hover:not(:disabled) { background: hsl(var(--primary) / 0.9); }
.be-panel__create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.be-panel__subtitle { margin-top: 4px; font-size: 13px; color: hsl(var(--muted-foreground)); }
.be-panel__search { position: relative; margin-top: 12px; }
.be-panel__search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: hsl(var(--muted-foreground));
}
.be-panel__search-input {
  width: 100%; padding: 8px 12px 8px 32px; border-radius: 10px;
  border: 1px solid hsl(var(--border)); background: hsl(var(--secondary) / 0.4);
  font-size: 13px; color: hsl(var(--foreground));
}
.be-panel__search-input:focus { outline: none; border-color: hsl(var(--primary)); }
.be-panel__loading, .be-panel__error, .be-panel__empty {
  padding: 24px; text-align: center; font-size: 14px; color: hsl(var(--muted-foreground));
}
.be-panel__error { color: #ef4444; }
.be-panel__body { flex: 1; min-height: 0; overflow-y: auto; padding-top: 12px; }
.be-panel__section + .be-panel__section { margin-top: 20px; }
.be-panel__section-title {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: hsl(var(--muted-foreground)); margin-bottom: 8px;
}
.be-panel__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.be-expert-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 10px; cursor: pointer; transition: background 0.15s;
  border: 1px solid transparent;
}
.be-expert-row:hover { background: hsl(var(--secondary) / 0.6); }
.be-expert-row.is-active { background: hsl(var(--primary) / 0.1); border-color: hsl(var(--primary) / 0.3); }
.be-expert-row__icon {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; background: hsl(var(--secondary));
  color: hsl(var(--foreground));
}
.be-expert-row__meta { min-width: 0; flex: 1; }
.be-expert-row__name { font-size: 14px; font-weight: 500; color: hsl(var(--foreground)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-expert-row__book { font-size: 12px; color: hsl(var(--muted-foreground)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-expert-row__actions { display: flex; gap: 4px; flex-shrink: 0; }
.be-expert-row__btn {
  border: none; background: transparent; padding: 6px; border-radius: 8px;
  color: hsl(var(--muted-foreground)); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.be-expert-row__btn:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
.be-expert-row__btn--danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
</style>
