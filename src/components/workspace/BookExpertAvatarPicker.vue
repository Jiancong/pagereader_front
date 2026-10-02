<template>
  <div class="be-cover-picker">
    <button
      type="button"
      class="be-chat__action be-chat__action--trigger"
      :disabled="saving"
      :title="t('bookExpert.cover')"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
      <ImagePlus v-else class="h-4 w-4" />
      <span>{{ saving ? t('bookExpert.coverUploading') : t('bookExpert.cover') }}</span>
      <ChevronDown class="h-3 w-3" :class="{ 'be-chat__chevron--open': open }" />
    </button>
    <div
      v-if="open"
      class="be-cover-picker__panel"
      role="dialog"
      :aria-label="t('bookExpert.coverPickTitle')"
    >
      <p class="be-cover-picker__hint">{{ t('bookExpert.coverPickHint') }}</p>
      <div v-if="loading" class="be-cover-picker__loading">
        <Loader2 class="h-4 w-4 animate-spin" />
        <span>{{ t('workspace.loading') }}</span>
      </div>
      <p v-else-if="!presets.length" class="be-cover-picker__empty">
        {{ t('bookExpert.coverPickEmpty') }}
      </p>
      <div v-else class="be-cover-picker__grid">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="be-cover-picker__item"
          :class="{ 'be-cover-picker__item--active': isActivePreset(preset) }"
          :title="preset.fileName"
          :disabled="saving"
          @click="selectPreset(preset)"
        >
          <img :src="preset.url" alt="" loading="lazy" />
        </button>
      </div>
    </div>
    <div v-if="open" class="be-chat__share-backdrop" @click="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, ImagePlus, ChevronDown } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { ApiError, bookExpertApi } from '@/api'
import {
  loadBookExpertAvatarPresets,
  type BookExpertAvatarPreset,
} from '@/constants/bookExpertAvatarPresets'

const props = defineProps<{
  expertId: string
  userId: string
  coverUrl?: string
}>()

const emit = defineEmits<{
  saved: [coverUrl: string]
}>()

const { t } = useI18n()
const open = ref(false)
const saving = ref(false)
const loading = ref(false)
const presets = ref<BookExpertAvatarPreset[]>([])

function isActivePreset(preset: BookExpertAvatarPreset): boolean {
  const current = String(props.coverUrl || '').trim()
  if (!current) return false
  return current === preset.url || current.endsWith(`/${preset.fileName}`)
}

async function toggleOpen() {
  if (saving.value) return
  open.value = !open.value
  if (open.value && !presets.value.length && !loading.value) {
    loading.value = true
    try {
      presets.value = await loadBookExpertAvatarPresets()
    } finally {
      loading.value = false
    }
  }
}

async function selectPreset(preset: BookExpertAvatarPreset) {
  if (saving.value) return
  saving.value = true
  try {
    const absoluteUrl = new URL(preset.url, window.location.origin).href
    const result = await bookExpertApi.setExpertCoverUrl(
      props.expertId,
      props.userId,
      absoluteUrl,
    )
    const coverUrl =
      String(result?.cover_url ?? result?.expert?.cover_url ?? absoluteUrl).trim() || absoluteUrl
    emit('saved', coverUrl)
    ElMessage.success(t('bookExpert.coverSuccess'))
    open.value = false
  } catch (e: unknown) {
    ElMessage.error(
      e instanceof ApiError || e instanceof Error ? e.message : t('bookExpert.coverFailed'),
    )
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.be-cover-picker {
  position: relative;
}
.be-chat__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 9999px;
  border: 1px solid var(--be-border, #2f3336);
  background: rgba(15, 20, 25, 0.6);
  font-size: 12px;
  color: var(--be-fg-muted, #71767b);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.be-chat__action:hover:not(:disabled) {
  color: var(--be-fg, #e7e9ea);
  border-color: rgba(29, 155, 240, 0.55);
  background: rgba(29, 155, 240, 0.08);
}
.be-chat__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.be-chat__chevron--open {
  transform: rotate(180deg);
}
.be-chat__share-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
}
.be-cover-picker__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 35;
  width: min(320px, calc(100vw - 2rem));
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--be-border, #2f3336);
  background: var(--be-card, #16202a);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}
.be-cover-picker__hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--be-fg-muted, #71767b);
}
.be-cover-picker__loading,
.be-cover-picker__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 0;
  font-size: 12px;
  color: var(--be-fg-muted, #71767b);
}
.be-cover-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: min(280px, 40vh);
  overflow-y: auto;
}
.be-cover-picker__item {
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(15, 20, 25, 0.5);
  transition: border-color 0.15s, transform 0.15s;
}
.be-cover-picker__item:hover:not(:disabled) {
  border-color: rgba(29, 155, 240, 0.5);
  transform: scale(1.03);
}
.be-cover-picker__item--active {
  border-color: #1d9bf0;
  box-shadow: 0 0 0 1px rgba(29, 155, 240, 0.35);
}
.be-cover-picker__item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.be-cover-picker__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
