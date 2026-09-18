<template>
  <section class="reading-history" :class="variantClass">
    <div class="reading-history__header">
      <h3 class="reading-history__title">{{ t('reader.continueTitle') }}</h3>
      <p class="reading-history__hint">{{ t('reader.continueHint') }}</p>
    </div>

    <div v-if="!logged" class="reading-history__guest">
      <p class="reading-history__guest-text">{{ t('reader.continueLoginHint') }}</p>
      <button type="button" class="reading-history__read-btn" @click="emit('open-login', 'login')">
        {{ t('reader.continueLogin') }}
      </button>
    </div>

    <template v-else>
      <div v-if="loading" class="reading-history__state">
        <Loader2 class="h-5 w-5 animate-spin" />
      </div>
      <p v-else-if="error" class="reading-history__state reading-history__state--muted">{{ error }}</p>
      <p v-else-if="!items.length" class="reading-history__state reading-history__state--muted">
        {{ t('reader.continueEmpty') }}
      </p>
      <ul v-else class="reading-history__list">
        <li v-for="item in items" :key="item.projectId" class="reading-history__item">
          <div class="reading-history__cover">
            <img
              v-if="item.thumbnailUrl"
              :src="item.thumbnailUrl"
              :alt="item.title"
              loading="lazy"
              class="reading-history__cover-img"
            />
            <BookOpen v-else class="reading-history__cover-fallback" />
          </div>
          <div class="reading-history__meta">
            <p class="reading-history__name" :title="item.title">{{ item.title }}</p>
            <p v-if="item.myProgressPercent != null" class="reading-history__progress">
              {{ t('reader.continueProgress', { percent: item.myProgressPercent }) }}
            </p>
          </div>
          <button type="button" class="reading-history__read-btn" @click="openReader(item.projectId)">
            <BookOpen class="h-4 w-4" />
            {{ t('reader.continueRead') }}
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BookOpen, Loader2 } from 'lucide-vue-next'
import { isLoggedIn } from '@/api'
import { useMyReadingList } from '@/composables/useMyReadingList'
import { gtmOpenReader } from '@/composables/useGtmDataLayer'

const props = withDefaults(
  defineProps<{
    /** dark: legacy ReaderView empty state; light: hub / workspace */
    variant?: 'dark' | 'light'
  }>(),
  { variant: 'light' },
)

const emit = defineEmits<{
  'open-login': [mode?: 'login' | 'signup']
}>()

const { t } = useI18n()
const router = useRouter()
const logged = computed(() => isLoggedIn())
const variantClass = computed(() =>
  props.variant === 'dark' ? 'reading-history--dark' : 'reading-history--light',
)

const { loading, error, items } = useMyReadingList()

function openReader(projectId: string) {
  if (!projectId) return
  gtmOpenReader(projectId)
  router.push({ name: 'project-reader', params: { projectId } })
}
</script>

<style scoped>
.reading-history {
  width: 100%;
  max-width: 640px;
}
.reading-history__header {
  margin-bottom: 12px;
}
.reading-history__title {
  font-size: 15px;
  font-weight: 600;
}
.reading-history__hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
}
.reading-history__guest {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.reading-history__guest-text {
  font-size: 13px;
  line-height: 1.5;
}
.reading-history__state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  font-size: 13px;
}
.reading-history__state--muted {
  opacity: 0.75;
}
.reading-history__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.reading-history__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.reading-history__cover {
  flex-shrink: 0;
  width: 44px;
  height: 58px;
  overflow: hidden;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reading-history__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.reading-history__cover-fallback {
  width: 22px;
  height: 22px;
  opacity: 0.5;
}
.reading-history__meta {
  min-width: 0;
  flex: 1;
}
.reading-history__name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reading-history__progress {
  margin-top: 2px;
  font-size: 11px;
  opacity: 0.75;
}
.reading-history__read-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.reading-history__read-btn:hover {
  opacity: 0.9;
}

.reading-history--light .reading-history__title {
  color: hsl(var(--foreground));
}
.reading-history--light .reading-history__hint {
  color: hsl(var(--muted-foreground));
}
.reading-history--light .reading-history__guest {
  border-color: hsl(var(--border));
  background: hsl(var(--secondary) / 0.35);
}
.reading-history--light .reading-history__guest-text {
  color: hsl(var(--muted-foreground));
}
.reading-history--light .reading-history__state {
  color: hsl(var(--muted-foreground));
}
.reading-history--light .reading-history__item {
  border-color: hsl(var(--border));
  background: hsl(var(--secondary) / 0.35);
}
.reading-history--light .reading-history__cover {
  background: hsl(var(--secondary));
}
.reading-history--light .reading-history__cover-fallback {
  color: hsl(var(--muted-foreground));
}
.reading-history--light .reading-history__name {
  color: hsl(var(--foreground));
}
.reading-history--light .reading-history__progress {
  color: hsl(var(--muted-foreground));
}
.reading-history--light .reading-history__read-btn {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.reading-history--dark .reading-history__title {
  color: #f3f4f6;
}
.reading-history--dark .reading-history__hint {
  color: #9ca3af;
}
.reading-history--dark .reading-history__guest {
  border-color: #374151;
  background: #1f2937;
}
.reading-history--dark .reading-history__guest-text {
  color: #9ca3af;
}
.reading-history--dark .reading-history__state {
  color: #9ca3af;
}
.reading-history--dark .reading-history__item {
  border-color: #374151;
  background: #1f2937;
}
.reading-history--dark .reading-history__cover {
  background: #111827;
}
.reading-history--dark .reading-history__cover-fallback {
  color: #9ca3af;
}
.reading-history--dark .reading-history__name {
  color: #e5e7eb;
}
.reading-history--dark .reading-history__progress {
  color: #9ca3af;
}
.reading-history--dark .reading-history__read-btn {
  background: #6366f1;
  color: #fff;
}
</style>
