<template>
  <div class="immersive-translate">
    <!-- 顶部工具栏 -->
    <header class="immersive-translate__toolbar">
      <button class="it-btn" @click="goBack">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        {{ t('translate.back') }}
      </button>

      <div class="immersive-translate__title" :title="fileName">{{ fileName }}</div>

      <div class="immersive-translate__controls">
        <label class="it-field">
          <span class="it-field__label">{{ t('translate.targetLang') }}</span>
          <select v-model="targetLang" class="it-select">
            <option v-for="opt in langOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>

        <div class="it-field it-field--zoom">
          <button class="it-btn it-btn--sm" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="it-zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button class="it-btn it-btn--sm" @click="zoomIn" :disabled="scale >= 3">+</button>
        </div>
      </div>
    </header>

    <!-- 无文件兜底 -->
    <div v-if="!file" class="immersive-translate__empty">
      <p>{{ t('translate.noFile') }}</p>
      <button class="it-btn it-btn--primary" @click="goBack">{{ t('translate.back') }}</button>
    </div>

    <!-- 阅读器 -->
    <PdfBilingualReader
      v-else
      :file="file"
      :object-url="objectUrl"
      :target-lang="targetLang"
      :show-original="true"
      :scale="scale"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PdfBilingualReader from '@/components/translation/PdfBilingualReader.vue'
import { useTranslateFileStore } from '@/stores/translateFile'

const router = useRouter()
const { t, locale } = useI18n()
const store = useTranslateFileStore()

const file = computed(() => store.file)
const objectUrl = computed(() => store.objectUrl)
const fileName = computed(() => store.file?.name ?? '')

const targetLang = ref<string>(locale.value === 'en' ? 'en' : 'zh')
const scale = ref(1.2)

const langOptions = computed(() => [
  { value: 'zh', label: t('translate.langZh') },
  { value: 'en', label: t('translate.langEn') },
  { value: 'ja', label: t('translate.langJa') },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'pt', label: 'Português' },
  { value: 'hi', label: 'हिन्दी' },
])

function zoomIn() {
  scale.value = Math.min(3, +(scale.value + 0.2).toFixed(2))
}
function zoomOut() {
  scale.value = Math.max(0.5, +(scale.value - 0.2).toFixed(2))
}
function goBack() {
  router.push({ name: 'landing' })
}

onBeforeUnmount(() => {
  store.revoke()
})
</script>

<style scoped>
.immersive-translate {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: #3a3a3a;
}
.immersive-translate__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  border-bottom: 1px solid #111827;
  flex-shrink: 0;
}
.immersive-translate__title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.immersive-translate__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.it-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.it-field__label {
  color: #9ca3af;
}
.it-select {
  background: #111827;
  color: #e5e7eb;
  border: 1px solid #374151;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
}
.it-field--toggle {
  cursor: pointer;
  user-select: none;
}
.it-field--zoom {
  gap: 4px;
}
.it-zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.it-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.it-btn:hover {
  background: #1f2937;
}
.it-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.it-btn--sm {
  padding: 2px 8px;
  font-size: 14px;
}
.it-btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.immersive-translate__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #d1d5db;
  font-size: 14px;
}
</style>
