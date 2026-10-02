<template>
  <div class="be-avatar-picker">
    <button
      type="button"
      class="be-avatar-picker__trigger"
      :disabled="saving"
      :title="t('bookExpert.avatarPickTitle')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
      <ScanFace v-else class="h-4 w-4" />
      <span>{{ t('bookExpert.avatarPick') }}</span>
    </button>
    <div v-if="open" class="be-avatar-picker__panel" role="dialog" :aria-label="t('bookExpert.avatarPickTitle')">
      <p class="be-avatar-picker__hint">{{ t('bookExpert.avatarPickHint') }}</p>
      <div class="be-avatar-picker__grid">
        <button
          v-for="preset in BOOK_EXPERT_AVATAR_PRESETS"
          :key="preset.id"
          type="button"
          class="be-avatar-picker__item"
          :class="{ 'be-avatar-picker__item--active': currentUrl === preset.url }"
          :title="t(`bookExpert.avatarPresets.${preset.labelKey}`)"
          :disabled="saving"
          @click="selectPreset(preset)"
        >
          <img :src="preset.url" alt="" loading="lazy" />
        </button>
      </div>
    </div>
    <div v-if="open" class="be-avatar-picker__backdrop" @click="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, ScanFace } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { ApiError, bookExpertApi } from '@/api'
import {
  BOOK_EXPERT_AVATAR_PRESETS,
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

const currentUrl = computed(() => String(props.coverUrl || '').trim())

async function selectPreset(preset: BookExpertAvatarPreset) {
  if (saving.value) return
  saving.value = true
  try {
    const result = await bookExpertApi.setExpertCoverUrl(
      props.expertId,
      props.userId,
      preset.url,
    )
    const coverUrl =
      String(result?.cover_url ?? result?.expert?.cover_url ?? preset.url).trim() || preset.url
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
.be-avatar-picker {
  position: relative;
}
.be-avatar-picker__trigger {
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
.be-avatar-picker__trigger:hover:not(:disabled) {
  color: var(--be-fg, #e7e9ea);
  border-color: rgba(29, 155, 240, 0.55);
  background: rgba(29, 155, 240, 0.08);
}
.be-avatar-picker__trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.be-avatar-picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
}
.be-avatar-picker__panel {
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
.be-avatar-picker__hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--be-fg-muted, #71767b);
}
.be-avatar-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.be-avatar-picker__item {
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(15, 20, 25, 0.5);
  transition: border-color 0.15s, transform 0.15s;
}
.be-avatar-picker__item:hover:not(:disabled) {
  border-color: rgba(29, 155, 240, 0.5);
  transform: scale(1.03);
}
.be-avatar-picker__item--active {
  border-color: #1d9bf0;
  box-shadow: 0 0 0 1px rgba(29, 155, 240, 0.35);
}
.be-avatar-picker__item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.be-avatar-picker__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
