<template>
  <Teleport to="body">
    <div v-if="open" class="be-distill-overlay" @click.self="onOverlayClick">
      <div class="be-distill-dialog" role="dialog" aria-modal="true">
        <header class="be-distill__header">
          <h3 class="be-distill__title">{{ t('bookExpert.distillTitle') }}</h3>
          <button type="button" class="be-distill__close" :aria-label="t('common.cancel')" @click="onClose">
            <X class="h-4 w-4" />
          </button>
        </header>

        <div class="be-distill__body">
          <section v-if="step === 'upload'" class="be-distill__step">
            <p class="be-distill__step-label">{{ t('bookExpert.distillStepUpload') }}</p>
            <div
              class="be-distill__dropzone"
              :class="{ 'is-active': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDrop"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".pdf,.epub,.mobi,.azw,.azw3,.doc,.docx,.txt,.md"
                class="hidden"
                @change="onFileChange"
              />
              <div v-if="localFile" class="be-distill__picked">
                <FileText class="h-8 w-8 flex-shrink-0 text-primary" />
                <div class="min-w-0 flex-1 text-left">
                  <p class="truncate font-medium text-foreground">{{ localFile.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatBytes(localFile.size) }}</p>
                </div>
                <button type="button" class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary" @click.stop="clearDoc">
                  <X class="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <template v-else>
                <Upload class="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p class="mt-3 font-medium text-foreground">{{ t('bookExpert.distillPickFile') }}</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ t('bookExpert.distillFormats') }}</p>
              </template>
            </div>
            <p v-if="uploadError" class="mt-2 text-sm text-red-400">{{ uploadError }}</p>
          </section>

          <section v-else-if="step === 'name'" class="be-distill__step">
            <p class="be-distill__step-label">{{ t('bookExpert.distillStepName') }}</p>
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">{{ t('bookExpert.expertNameLabel') }}</label>
                <input v-model="expertName" type="text" maxlength="40" class="be-distill__input" :placeholder="t('bookExpert.expertNamePlaceholder')" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">{{ t('bookExpert.bookTitleLabel') }}</label>
                <input v-model="bookTitle" type="text" maxlength="120" class="be-distill__input" :placeholder="t('bookExpert.bookTitlePlaceholder')" />
              </div>
            </div>
          </section>

          <section v-else-if="step === 'progress'" class="be-distill__step">
            <p class="be-distill__step-label">{{ t('bookExpert.distillStepProgress') }}</p>
            <div class="be-distill__progress">
              <Loader2 class="h-6 w-6 animate-spin text-primary" />
              <p class="mt-3 text-sm text-foreground">{{ t('bookExpert.distillRunning') }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ t('bookExpert.distillRunningHint') }}</p>
              <div class="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div class="be-distill__indeterminate" />
              </div>
            </div>
          </section>

          <section v-else-if="step === 'done'" class="be-distill__step">
            <div class="be-distill__done">
              <div class="be-distill__done-icon"><Sparkles class="h-6 w-6 text-primary" /></div>
              <p class="mt-3 font-medium text-foreground">{{ t('bookExpert.distillDone') }}</p>
              <p v-if="lastCreatedName" class="mt-1 text-sm text-muted-foreground">{{ lastCreatedName }}</p>
            </div>
          </section>

          <p v-if="errorMessage" class="be-distill__error">{{ errorMessage }}</p>
        </div>

        <footer class="be-distill__footer">
          <button type="button" class="be-distill__btn be-distill__btn--ghost" @click="onClose">
            {{ step === 'done' ? t('common.close') : t('common.cancel') }}
          </button>
          <button v-if="step === 'upload'" type="button" class="be-distill__btn be-distill__btn--primary" :disabled="!localFile || uploading" @click="goToName">
            <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
            {{ t('common.next') }}
          </button>
          <button v-else-if="step === 'name'" type="button" class="be-distill__btn be-distill__btn--primary" :disabled="!expertName.trim() || submitting" @click="onSubmit">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            {{ t('bookExpert.distillSubmit') }}
          </button>
          <button v-else-if="step === 'done'" type="button" class="be-distill__btn be-distill__btn--primary" @click="onEnterExpert">
            {{ t('bookExpert.distillEnterExpert') }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { X, Upload, FileText, Loader2, Sparkles } from 'lucide-vue-next'
import { fileApi, bookExpertApi, ApiError, isCreditsInsufficient } from '@/api'
import { useBookExpertStore } from '@/stores/bookExpert'
import { getOrCreateSessionId } from '@/api/agent'
import { getSavedLocale } from '@/composables/useAppLocale'
import { formatBytes } from '@/utils/userAssets'
import { validatePptDocumentFile } from '@/utils/pptDocumentRag'
import type { DistillUploadedDocument, BookExpertSummary } from '@/api/types'

const props = defineProps<{ open: boolean; userId: string | null }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [expert: BookExpertSummary]
  'enter-expert': [expert: BookExpertSummary]
}>()

const { t } = useI18n()
const store = useBookExpertStore()

type Step = 'upload' | 'name' | 'progress' | 'done'
const step = ref<Step>('upload')
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const localFile = ref<File | null>(null)
const uploadedDoc = ref<DistillUploadedDocument | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const expertName = ref('')
const bookTitle = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const lastCreatedName = ref('')
const lastCreatedExpert = ref<BookExpertSummary | null>(null)
let abortController: AbortController | null = null

watch(() => props.open, (open) => { if (open) reset() })

function reset() {
  step.value = 'upload'
  localFile.value = null
  uploadedDoc.value = null
  uploading.value = false
  uploadError.value = ''
  expertName.value = ''
  bookTitle.value = ''
  submitting.value = false
  errorMessage.value = ''
  lastCreatedName.value = ''
  lastCreatedExpert.value = null
  store.resetDistill()
}

function onOverlayClick() { if (step.value !== 'progress') onClose() }
function onClose() { if (step.value !== 'progress') emit('update:open', false) }

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) pickFile(f)
}
function onDrop(e: DragEvent) {
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) pickFile(f)
}
function pickFile(f: File) {
  uploadError.value = ''
  const v = validatePptDocumentFile(f)
  if (v === 'unsupported') { uploadError.value = t('workspace.uploadUnsupportedType'); return }
  if (v === 'too_large') { uploadError.value = t('workspace.uploadTooLarge'); return }
  localFile.value = f
  uploadedDoc.value = null
}
function clearDoc() {
  localFile.value = null
  uploadedDoc.value = null
  uploadError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function goToName() {
  if (!localFile.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    uploadedDoc.value = await fileApi.uploadDocument(localFile.value)
    if (!bookTitle.value.trim()) bookTitle.value = uploadedDoc.value.name.replace(/\.[^.]+$/, '')
    step.value = 'name'
  } catch (e: unknown) {
    uploadError.value = e instanceof Error ? e.message : t('workspace.uploadingDoc')
  } finally {
    uploading.value = false
  }
}

async function onSubmit() {
  if (!uploadedDoc.value || !expertName.value.trim() || !props.userId) return
  submitting.value = true
  errorMessage.value = ''
  step.value = 'progress'
  store.startDistill()
  abortController?.abort()
  abortController = new AbortController()
  try {
    const streamRequestId = `distill-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await bookExpertApi.distillExpert(
      {
        uploaded_documents: [uploadedDoc.value],
        expert_name: expertName.value.trim(),
        book_title: bookTitle.value.trim() || undefined,
        userId: props.userId,
        sessionId: getOrCreateSessionId(),
        streamRequestId,
        uiLocale: getSavedLocale() === 'en' ? 'en' : 'zh',
      },
      {
        onExpertCreated: (data) => {
          const expert: BookExpertSummary = {
            expert_id: data.expert_id,
            expert_name: data.expert_name,
            book_title: data.book_title,
            visibility: data.visibility,
            owner_user_id: props.userId as string,
          }
          lastCreatedExpert.value = expert
          lastCreatedName.value = expert.expert_name
          store.onDistillSuccess(expert)
          step.value = 'done'
          ElMessage.success(t('bookExpert.distillDoneToast'))
          emit('created', expert)
        },
        onError: (msg) => { store.onDistillError(msg); errorMessage.value = msg; step.value = 'name' },
        onComplete: () => { if (step.value !== 'done') step.value = 'done' },
      },
      abortController.signal,
    )
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : (e as Error)?.message || t('bookExpert.distillFailed')
    errorMessage.value = isCreditsInsufficient(e) ? t('workspace.creditsInsufficient') : msg
    store.onDistillError(msg)
    step.value = 'name'
  } finally {
    submitting.value = false
  }
}

function onEnterExpert() {
  if (lastCreatedExpert.value) emit('enter-expert', lastCreatedExpert.value)
  emit('update:open', false)
}
</script>

<style scoped>
.be-distill-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.5); padding: 16px;
}
.be-distill-dialog {
  width: 100%; max-width: 480px;
  background: hsl(var(--card)); border: 1px solid hsl(var(--border));
  border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex; flex-direction: column; max-height: 90vh;
}
.be-distill__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid hsl(var(--border));
}
.be-distill__title { font-size: 16px; font-weight: 600; color: hsl(var(--foreground)); }
.be-distill__close {
  border: none; background: transparent; padding: 6px; border-radius: 8px;
  color: hsl(var(--muted-foreground)); cursor: pointer; transition: background 0.15s;
}
.be-distill__close:hover { background: hsl(var(--secondary)); }
.be-distill__body { padding: 20px; overflow-y: auto; flex: 1; min-height: 0; }
.be-distill__step-label {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: hsl(var(--muted-foreground)); margin-bottom: 12px;
}
.be-distill__dropzone {
  cursor: pointer; border-radius: 12px; border: 2px dashed hsl(var(--border));
  background: hsl(var(--secondary) / 0.3); padding: 28px 20px; text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.be-distill__dropzone:hover { border-color: hsl(var(--primary) / 0.5); }
.be-distill__dropzone.is-active { border-color: hsl(var(--primary)); background: hsl(var(--primary) / 0.05); }
.be-distill__picked { display: flex; align-items: center; gap: 12px; text-align: left; }
.be-distill__input {
  width: 100%; border-radius: 12px; border: 1px solid hsl(var(--border));
  background: hsl(var(--secondary) / 0.5); padding: 10px 16px; font-size: 14px;
  color: hsl(var(--foreground));
}
.be-distill__input::placeholder { color: hsl(var(--muted-foreground) / 0.6); }
.be-distill__input:focus { outline: none; border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2); }
.be-distill__progress { text-align: center; padding: 24px 0; }
.be-distill__indeterminate {
  position: absolute; top: 0; left: 0; height: 100%; width: 40%;
  background: hsl(var(--primary)); border-radius: 9999px;
  animation: be-indeterminate 1.4s ease-in-out infinite;
}
@keyframes be-indeterminate { 0% { left: -40%; } 100% { left: 100%; } }
.be-distill__done { text-align: center; padding: 24px 0; }
.be-distill__done-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 9999px; background: hsl(var(--primary) / 0.1);
}
.be-distill__error { margin-top: 12px; font-size: 13px; color: #ef4444; }
.be-distill__footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 20px; border-top: 1px solid hsl(var(--border));
}
.be-distill__btn {
  padding: 8px 16px; border-radius: 10px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
  display: inline-flex; align-items: center; gap: 6px;
}
.be-distill__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.be-distill__btn--ghost { border: 1px solid hsl(var(--border)); background: transparent; color: hsl(var(--foreground)); }
.be-distill__btn--ghost:hover:not(:disabled) { background: hsl(var(--secondary)); }
.be-distill__btn--primary { border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.be-distill__btn--primary:hover:not(:disabled) { background: hsl(var(--primary) / 0.9); }
</style>
