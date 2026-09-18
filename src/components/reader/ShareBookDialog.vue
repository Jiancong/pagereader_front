<template>
  <transition name="sbd-fade">
    <div v-if="open" class="sbd-overlay" @click.self="onClose">
      <div class="sbd-dialog">
        <!-- Header -->
        <header class="sbd-dialog__header">
          <h2 class="sbd-dialog__title">{{ t('reader.shareBookTitle') }}</h2>
          <button class="sbd-dialog__close" @click="onClose" aria-label="close">&times;</button>
        </header>

        <!-- Body -->
        <div class="sbd-dialog__body">
          <!-- 文件信息 -->
          <div class="sbd-file-info">
            <FileText class="sbd-file-info__icon" />
            <div class="sbd-file-info__meta">
              <span class="sbd-file-info__name">{{ fileName }}</span>
              <span class="sbd-file-info__size">{{ formattedSize }}</span>
            </div>
          </div>

          <!-- 表单 -->
          <div class="sbd-form">
            <label class="sbd-form__label">
              {{ t('reader.shareBookNameLabel') }} <span class="sbd-req">*</span>
              <input
                v-model="form.title"
                class="sbd-form__input"
                type="text"
                :placeholder="t('reader.shareBookNamePlaceholder')"
                maxlength="200"
              />
            </label>

            <label class="sbd-form__label">
              {{ t('reader.shareBookAuthorLabel') }}
              <input
                v-model="form.author"
                class="sbd-form__input"
                type="text"
                :placeholder="t('reader.shareBookAuthorPlaceholder')"
                maxlength="100"
              />
            </label>

            <label class="sbd-form__label">
              {{ t('reader.shareBookDescLabel') }}
              <textarea
                v-model="form.description"
                class="sbd-form__textarea"
                :placeholder="t('reader.shareBookDescPlaceholder')"
                rows="3"
                maxlength="500"
              ></textarea>
            </label>

            <label class="sbd-form__label">
              {{ t('reader.shareBookCategoryLabel') }}
              <select v-model="form.categoryId" class="sbd-form__select">
                <option value="">{{ t('reader.shareBookCategoryNone') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ locale === 'en' && cat.nameEn ? cat.nameEn : cat.name }}
                </option>
              </select>
            </label>
          </div>

          <!-- 免责声明 -->
          <div class="sbd-disclaimer">
            <label class="sbd-disclaimer__check">
              <input
                v-model="form.disclaimerAccepted"
                type="checkbox"
                class="sbd-disclaimer__checkbox"
              />
              <span class="sbd-disclaimer__text">
                {{ t('reader.shareBookDisclaimerAccept') }}
              </span>
            </label>
            <div class="sbd-disclaimer__body">
              {{ t('reader.shareBookDisclaimerBody') }}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="sbd-dialog__footer">
          <button class="sbd-btn sbd-btn--ghost" @click="onClose" :disabled="sharing">
            {{ t('common.cancel') }}
          </button>
          <button
            class="sbd-btn sbd-btn--primary"
            :disabled="!canSubmit || sharing"
            @click="onSubmit"
          >
            <Loader2 v-if="sharing" class="h-4 w-4 animate-spin" />
            {{ sharing ? t('reader.shareBookSharing') : t('reader.shareBookSubmit') }}
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, Loader2 } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { projectApi, isLoggedIn } from '@/api'
import type { FeedTopicCategoryDto, ShareToCommunityResult } from '@/api/types'

const props = defineProps<{
  open: boolean
  file: File | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'shared', result: ShareToCommunityResult): void
  (e: 'login-required'): void
}>()

const { t, locale } = useI18n()

const sharing = ref(false)
const categories = ref<FeedTopicCategoryDto[]>([])

const form = reactive({
  title: '',
  author: '',
  description: '',
  categoryId: '',
  disclaimerAccepted: false,
})

const fileName = computed(() => props.file?.name || '')
const formattedSize = computed(() => {
  if (!props.file) return ''
  const kb = props.file.size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
})

const canSubmit = computed(
  () =>
    form.title.trim().length > 0 &&
    form.disclaimerAccepted === true &&
    !!props.file,
)

// 打开时用文件名预填标题
watch(
  () => props.open,
  (val) => {
    if (val) {
      if (!props.file) return
      if (!form.title) {
        const name = props.file.name
        form.title = name.replace(/\.(pdf|epub|mobi)$/i, '')
      }
      loadCategories()
    }
  },
)

watch(
  () => props.file,
  (f) => {
    if (f && props.open && !form.title) {
      form.title = f.name.replace(/\.(pdf|epub|mobi)$/i, '')
    }
  },
)

async function loadCategories() {
  if (categories.value.length) return
  try {
    categories.value = await projectApi.getFeedTopicCategories()
  } catch {
    // 静默失败，分类可选
  }
}

function onClose() {
  if (sharing.value) return
  emit('close')
}

async function onSubmit() {
  if (!canSubmit.value || sharing.value) return
  if (!isLoggedIn()) {
    emit('login-required')
    return
  }
  if (!props.file) return

  sharing.value = true
  try {
    const result = await projectApi.shareBookToCommunity(props.file, {
      title: form.title.trim(),
      author: form.author.trim() || undefined,
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      disclaimerAccepted: form.disclaimerAccepted,
    })
    ElMessage.success(t('reader.shareBookSuccess'))
    emit('shared', result)
    emit('close')
    // 重置
    form.title = ''
    form.author = ''
    form.description = ''
    form.categoryId = ''
    form.disclaimerAccepted = false
  } catch (e: any) {
    ElMessage.error(e?.message || t('reader.shareBookError'))
  } finally {
    sharing.value = false
  }
}

onMounted(() => {
  if (props.open) loadCategories()
})
</script>

<style scoped>
.sbd-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.sbd-dialog {
  width: 520px;
  max-width: 92vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #1e1e2a;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.sbd-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #374151;
}

.sbd-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: #f3f4f6;
  margin: 0;
}

.sbd-dialog__close {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 24px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.sbd-dialog__close:hover {
  color: #f3f4f6;
}

.sbd-dialog__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sbd-file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 8px;
}

.sbd-file-info__icon {
  flex-shrink: 0;
  color: #a5b4fc;
}

.sbd-file-info__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sbd-file-info__name {
  font-size: 13px;
  color: #e5e7eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sbd-file-info__size {
  font-size: 11px;
  color: #6b7280;
}

.sbd-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sbd-form__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #d1d5db;
}

.sbd-req {
  color: #ef4444;
}

.sbd-form__input,
.sbd-form__textarea,
.sbd-form__select {
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  padding: 8px 10px;
  color: #e5e7eb;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.sbd-form__input:focus,
.sbd-form__textarea:focus,
.sbd-form__select:focus {
  border-color: #6366f1;
}

.sbd-form__textarea {
  resize: vertical;
  font-family: inherit;
}

.sbd-form__select option {
  background: #111827;
}

.sbd-disclaimer {
  padding: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
}

.sbd-disclaimer__check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.sbd-disclaimer__checkbox {
  margin-top: 2px;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.sbd-disclaimer__text {
  font-size: 13px;
  color: #fbbf24;
  font-weight: 500;
}

.sbd-disclaimer__body {
  margin-top: 8px;
  padding-left: 24px;
  font-size: 12px;
  line-height: 1.5;
  color: #9ca3af;
}

.sbd-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #374151;
}

.sbd-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, opacity 0.15s;
}

.sbd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sbd-btn--ghost {
  background: transparent;
  border-color: #374151;
  color: #d1d5db;
}

.sbd-btn--ghost:hover:not(:disabled) {
  background: #374151;
}

.sbd-btn--primary {
  background: #6366f1;
  color: #fff;
}

.sbd-btn--primary:hover:not(:disabled) {
  background: #4f46e5;
}

.sbd-fade-enter-active,
.sbd-fade-leave-active {
  transition: opacity 0.2s;
}

.sbd-fade-enter-from,
.sbd-fade-leave-to {
  opacity: 0;
}
</style>
