<template>
  <section class="epub-search-panel" role="search" :aria-label="t('reader.epubSearchTitle')">
    <div class="epub-search-panel__row">
      <Search class="epub-search-panel__icon h-4 w-4" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="localQuery"
        type="search"
        class="epub-search-panel__input"
        :placeholder="t('reader.epubSearchPlaceholder')"
        :disabled="loading"
        enterkeyhint="search"
        @keydown.enter.prevent="emitSearch"
        @keydown.esc.prevent="emit('close')"
      />
      <button
        type="button"
        class="epub-search-panel__btn epub-search-panel__btn--primary"
        :disabled="loading || !localQuery.trim()"
        @click="emitSearch"
      >
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        <span v-else>{{ t('reader.epubSearchGo') }}</span>
      </button>
      <button
        type="button"
        class="epub-search-panel__btn"
        :disabled="!hits.length"
        :title="t('reader.epubSearchPrev')"
        :aria-label="t('reader.epubSearchPrev')"
        @click="emit('prev')"
      >
        ‹
      </button>
      <button
        type="button"
        class="epub-search-panel__btn"
        :disabled="!hits.length"
        :title="t('reader.epubSearchNext')"
        :aria-label="t('reader.epubSearchNext')"
        @click="emit('next')"
      >
        ›
      </button>
      <button
        type="button"
        class="epub-search-panel__btn epub-search-panel__btn--close"
        :aria-label="t('reader.epubSearchClose')"
        @click="emit('close')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <p v-if="loading && progress" class="epub-search-panel__status">
      {{ t('reader.epubSearchProgress', { current: progress.sectionIndex + 1, total: progress.sectionTotal, count: progress.hitsSoFar }) }}
    </p>
    <p v-else-if="searched && !hits.length" class="epub-search-panel__status epub-search-panel__status--empty">
      {{ t('reader.epubSearchNoResults') }}
    </p>
    <p v-else-if="hits.length" class="epub-search-panel__status">
      {{ t('reader.epubSearchSummary', { index: activeIndex + 1, total: hits.length }) }}
    </p>

    <ul v-if="hits.length" class="epub-search-panel__list">
      <li v-for="(hit, i) in hits" :key="`${hit.spineIndex}-${hit.cfi}-${i}`">
        <button
          type="button"
          class="epub-search-panel__hit"
          :class="{ 'epub-search-panel__hit--active': i === activeIndex }"
          @click="emit('select', i)"
        >
          <span class="epub-search-panel__hit-meta">
            <span class="epub-search-panel__hit-chapter">{{ hit.chapterLabel }}</span>
            <span v-if="displayPage(hit)" class="epub-search-panel__hit-page">
              {{ t('reader.epubSearchPage', { page: displayPage(hit) }) }}
            </span>
          </span>
          <span class="epub-search-panel__hit-excerpt">{{ hit.excerpt }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, X, Loader2 } from 'lucide-vue-next'
import type { EpubSearchHit, EpubSearchProgress } from '@/types/epubSearch'

const props = defineProps<{
  query: string
  hits: EpubSearchHit[]
  activeIndex: number
  loading: boolean
  searched: boolean
  progress: EpubSearchProgress | null
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  search: []
  close: []
  prev: []
  next: []
  select: [index: number]
}>()

const { t } = useI18n()
const inputRef = ref<HTMLInputElement | null>(null)
const localQuery = ref(props.query)

watch(
  () => props.query,
  (v) => {
    localQuery.value = v
  },
)

watch(localQuery, (v) => emit('update:query', v))

watch(
  () => props.loading,
  async (loading, wasLoading) => {
    if (!loading && wasLoading) return
    if (!loading) {
      await nextTick()
      inputRef.value?.focus()
    }
  },
  { immediate: true },
)

function emitSearch() {
  emit('search')
}

function displayPage(hit: EpubSearchHit): number | null {
  if (hit.pageDisplay != null && hit.pageDisplay > 0) return hit.pageDisplay
  if (hit.pageHint != null && hit.pageHint > 0) return hit.pageHint
  return null
}
</script>

<style scoped>
.epub-search-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #111827;
  border-bottom: 1px solid #374151;
  color: #e5e7eb;
  max-height: min(42vh, 320px);
  box-sizing: border-box;
}
.epub-search-panel__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.epub-search-panel__icon {
  flex-shrink: 0;
  color: #9ca3af;
}
.epub-search-panel__input {
  flex: 1 1 120px;
  min-width: 0;
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #374151;
  background: #0f172a;
  color: #f3f4f6;
  font-size: 14px;
}
.epub-search-panel__input:focus {
  outline: none;
  border-color: #6366f1;
}
.epub-search-panel__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #374151;
  background: #1f2937;
  color: #e5e7eb;
  font-size: 13px;
  cursor: pointer;
}
.epub-search-panel__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.epub-search-panel__btn--primary {
  border-color: #4f46e5;
  background: #312e81;
  color: #e0e7ff;
}
.epub-search-panel__btn--close {
  padding: 6px;
}
.epub-search-panel__status {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}
.epub-search-panel__status--empty {
  color: #fbbf24;
}
.epub-search-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.epub-search-panel__hit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: #0f172a;
  color: #d1d5db;
  cursor: pointer;
  font: inherit;
}
.epub-search-panel__hit--active {
  border-color: #6366f1;
  background: #1e1b4b;
}
.epub-search-panel__hit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: #9ca3af;
}
.epub-search-panel__hit-chapter {
  font-weight: 600;
  color: #a5b4fc;
}
.epub-search-panel__hit-excerpt {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
@media (max-width: 767px) {
  .epub-search-panel {
    max-height: min(38vh, 280px);
    padding: 8px;
  }
}
</style>
