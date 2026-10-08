<template>
  <div class="mx-auto w-full min-w-0 max-w-3xl">
    <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div class="p-6 sm:p-8">
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-foreground">{{ t('bookExpert.panelTitle') }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ t('bookExpert.panelSubtitle') }}</p>
          <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.newExpertHint') }}</p>
        </div>

        <div v-if="expertStep === 'upload'">
          <div
            class="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/50"
            @click="expertFileInput?.click()"
          >
            <input
              ref="expertFileInput"
              type="file"
              accept=".pdf,.epub,.mobi,.azw,.azw3,.doc,.docx,.txt,.md"
              class="hidden"
              @change="onExpertFileChange"
            />
            <template v-if="hasExpertAttachedDoc">
              <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <FileText class="h-10 w-10 flex-shrink-0 text-primary" />
                <div class="min-w-0 flex-1 text-center sm:text-left">
                  <p class="break-words font-medium text-foreground">{{ expertAttachedDocName }}</p>
                  <p v-if="expertAttachedDocSizeLabel" class="mt-1 text-sm text-muted-foreground">
                    {{ expertAttachedDocSizeLabel }}
                  </p>
                  <p v-if="expertCloudDocument" class="mt-1 text-xs text-muted-foreground">
                    {{ t('workspace.fromCloudLibrary') }}
                  </p>
                </div>
                <button
                  type="button"
                  class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary"
                  @click.stop="clearExpertAttachedDoc"
                >
                  <X class="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </template>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('bookExpert.distillPickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('bookExpert.distillFormats') }}</p>
            </template>
          </div>
          <p v-if="expertFileError" class="mt-3 text-sm text-red-400">{{ expertFileError }}</p>
          <button
            type="button"
            :disabled="!hasExpertAttachedDoc || expertUploading"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onExpertNext"
          >
            <Loader2 v-if="expertUploading" class="h-5 w-5 animate-spin" />
            <Sparkles v-else class="h-5 w-5" />
            {{ expertUploading ? t('common.loading') : t('common.next') }}
          </button>
        </div>

        <div v-else-if="expertStep === 'name'" class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">
              {{ t('bookExpert.expertNameLabel') }}<span class="ml-0.5 text-red-400">*</span>
            </label>
            <input
              v-model="expertName"
              type="text"
              maxlength="40"
              class="be-distill__input"
              :placeholder="t('bookExpert.expertNamePlaceholder')"
            />
            <p v-if="!expertName.trim()" class="mt-1 text-xs text-muted-foreground">
              {{ t('bookExpert.expertNameRequiredHint') }}
            </p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">{{ t('bookExpert.bookTitleLabel') }}</label>
            <input
              v-model="expertBookTitle"
              type="text"
              maxlength="120"
              class="be-distill__input"
              :placeholder="t('bookExpert.bookTitlePlaceholder')"
            />
          </div>
          <p v-if="expertError" class="text-sm text-red-400">{{ expertError }}</p>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-border bg-transparent py-3.5 font-semibold text-foreground transition-colors hover:bg-secondary"
              @click="expertStep = 'upload'"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="!expertName.trim() || expertSubmitting"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary"
              @click="onExpertSubmit"
            >
              <Loader2 v-if="expertSubmitting" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ t('bookExpert.distillSubmit') }}
            </button>
          </div>
        </div>

        <div v-else-if="expertStep === 'progress'">
          <BookExpertDistillProgress :lines="expertDistillLogs" />
        </div>

        <div v-else-if="expertStep === 'done'" class="py-8 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles class="h-6 w-6 text-primary" />
          </div>
          <p class="mt-4 text-sm text-muted-foreground">{{ t('bookExpert.distillDone') }}</p>
          <p v-if="expertDoneName" class="mt-1 text-lg font-bold text-foreground">{{ expertDoneName }}</p>
          <p v-if="expertCreated?.book_title" class="mt-1 text-xs text-muted-foreground">《{{ expertCreated.book_title }}》</p>

          <div
            v-if="expertPreviewLoading"
            class="mx-auto mt-5 flex w-full max-w-3xl items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground"
          >
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
            {{ t('bookExpert.previewLoading') }}
          </div>
          <div
            v-else-if="expertPreview"
            class="mx-auto mt-5 w-full max-w-3xl rounded-xl border border-border bg-secondary/30 p-4 text-left sm:p-5"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('bookExpert.previewTitle') }}
            </p>
            <p v-if="expertPreview.problem" class="mt-2 text-sm leading-relaxed text-foreground">
              {{ expertPreview.problem }}
            </p>
            <div v-if="expertPreview.viewpoints.length" class="mt-3">
              <p class="text-[11px] font-semibold text-muted-foreground">{{ t('bookExpert.previewViewpoints') }}</p>
              <ul class="mt-1.5 list-disc space-y-1.5 pl-5">
                <li
                  v-for="(v, i) in expertPreview.viewpoints"
                  :key="`vp-${i}`"
                  class="text-[13px] leading-relaxed text-muted-foreground"
                >
                  {{ v }}
                </li>
              </ul>
            </div>
            <div v-if="expertPreview.principles.length" class="mt-3">
              <p class="text-[11px] font-semibold text-muted-foreground">{{ t('bookExpert.previewPrinciples') }}</p>
              <ul class="mt-1.5 list-disc space-y-1.5 pl-5">
                <li
                  v-for="(p, i) in expertPreview.principles"
                  :key="`jp-${i}`"
                  class="text-[13px] leading-relaxed text-muted-foreground"
                >
                  {{ p }}
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-border bg-transparent py-3.5 font-semibold text-foreground transition-colors hover:bg-secondary"
              @click="resetExpertFlow"
            >
              {{ t('common.close') }}
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              @click="onEnterExpert"
            >
              <Sparkles class="h-5 w-5" />
              {{ t('bookExpert.distillEnterExpert') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { Upload, Sparkles, FileText, Loader2, X } from "lucide-vue-next"
import { fileApi, bookExpertApi, ApiError, isCreditsInsufficient } from "@/api"
import { extractCreatedExpert, formatDistillProgressLine } from "@/api/bookExpert"
import BookExpertDistillProgress from "@/components/workspace/BookExpertDistillProgress.vue"
import { getOrCreateSessionId } from "@/api/agent"
import { getSavedLocale } from "@/composables/useAppLocale"
import { useBookExpertStore } from "@/stores/bookExpert"
import type { DistillUploadedDocument, BookExpertSummary } from "@/api/types"
import type { UploadedDocument } from "@/utils/pptDocumentRag"
import {
  inferPptDocumentType,
  isBookExpertDocumentAsset,
  validatePptDocumentFile,
} from "@/utils/pptDocumentRag"
import { formatBytes } from "@/utils/userAssets"
import { gtmAssetAttach, gtmFileExt } from "@/composables/useGtmDataLayer"

const props = defineProps<{
  userId?: string | number | null
}>()

const emit = defineEmits<{
  "select-expert": [expert: BookExpertSummary]
  "expert-created": [expert: BookExpertSummary]
}>()

const { t } = useI18n()
const bookExpertStore = useBookExpertStore()

const expertFileInput = ref<HTMLInputElement | null>(null)
const expertStep = ref<"upload" | "name" | "progress" | "done">("upload")
const expertPickedFile = ref<File | null>(null)
const expertCloudDocument = ref<UploadedDocument | null>(null)
const expertCloudSize = ref<number | undefined>(undefined)
const expertUploadedDoc = ref<DistillUploadedDocument | null>(null)
const expertFileError = ref("")
const expertUploading = ref(false)
const expertSubmitting = ref(false)
const expertError = ref("")
const expertName = ref("")
const expertBookTitle = ref("")
const expertDoneName = ref("")
const expertCreated = ref<BookExpertSummary | null>(null)
const expertPreview = ref<{ problem: string; viewpoints: string[]; principles: string[] } | null>(null)
const expertPreviewLoading = ref(false)
const expertDistillLogs = ref<string[]>([])
let expertAbort: AbortController | null = null

function appendExpertDistillLog(data: unknown) {
  const line = formatDistillProgressLine(data)
  if (!line) return
  const prev = expertDistillLogs.value
  if (prev.length && prev[prev.length - 1] === line) return
  const next = [...prev, line]
  expertDistillLogs.value = next.length > 40 ? next.slice(-40) : next
}

function stripLeadingNumber(s: string): string {
  return s.replace(/^\s*\d+\s*[.、)）]\s*/, "").trim()
}

async function loadExpertPreview(expertId: string) {
  if (!expertId || !props.userId) return
  expertPreview.value = null
  expertPreviewLoading.value = true
  try {
    const res = await bookExpertApi.getExpert(expertId, String(props.userId))
    const raw = res?.expert?.methodology_preview
    if (raw && typeof raw === "string") {
      expertPreview.value = { problem: raw, viewpoints: [], principles: [] }
    } else if (raw && typeof raw === "object") {
      const o = raw as { core_problem?: unknown; core_viewpoints?: unknown; judgment_principles?: unknown }
      const arr = (v: unknown): string[] =>
        Array.isArray(v)
          ? v
              .filter((x): x is string => typeof x === "string")
              .map(stripLeadingNumber)
              .filter((s) => s.length > 0)
              .slice(0, 5)
          : []
      const problem = typeof o.core_problem === "string" ? o.core_problem : ""
      const viewpoints = arr(o.core_viewpoints)
      const principles = arr(o.judgment_principles)
      if (problem || viewpoints.length || principles.length) {
        expertPreview.value = { problem, viewpoints, principles }
      }
    }
  } catch {
    /* preview optional */
  } finally {
    expertPreviewLoading.value = false
  }
}

function onExpertFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) pickExpertFile(f)
}

function pickExpertFile(f: File) {
  expertFileError.value = ""
  const v = validatePptDocumentFile(f)
  if (v === "unsupported") {
    expertFileError.value = t("workspace.uploadUnsupportedType")
    return
  }
  if (v === "too_large") {
    expertFileError.value = t("workspace.uploadTooLarge")
    return
  }
  expertPickedFile.value = f
  expertCloudDocument.value = null
  expertCloudSize.value = undefined
  expertUploadedDoc.value = null
}

const hasExpertAttachedDoc = computed(
  () => Boolean(expertPickedFile.value || expertCloudDocument.value),
)
const expertAttachedDocName = computed(
  () => expertPickedFile.value?.name || expertCloudDocument.value?.name || "",
)
const expertAttachedDocSizeLabel = computed(() => {
  if (expertCloudSize.value != null) return formatBytes(expertCloudSize.value)
  if (expertPickedFile.value) return formatBytes(expertPickedFile.value.size)
  return ""
})

function clearExpertAttachedDoc() {
  expertPickedFile.value = null
  expertCloudDocument.value = null
  expertCloudSize.value = undefined
  expertUploadedDoc.value = null
  expertFileError.value = ""
  if (expertFileInput.value) expertFileInput.value.value = ""
}

function attachCloudDocument(payload: { doc: UploadedDocument; size?: number }) {
  if (!payload?.doc?.url) return
  const doc = payload.doc
  if (!isBookExpertDocumentAsset(doc.name || "", doc.url || "", String(doc.type || ""))) {
    expertFileError.value = t("workspace.uploadUnsupportedType")
    return
  }
  expertPickedFile.value = null
  if (expertFileInput.value) expertFileInput.value.value = ""
  expertCloudDocument.value = doc
  expertCloudSize.value = payload.size
  expertUploadedDoc.value = null
  expertFileError.value = ""
  if (expertStep.value !== "upload") expertStep.value = "upload"
  gtmAssetAttach(gtmFileExt(doc.name || ""))
}

async function onExpertNext() {
  if (!hasExpertAttachedDoc.value || expertUploading.value) return
  expertUploading.value = true
  expertFileError.value = ""
  try {
    if (expertCloudDocument.value) {
      const cloud = expertCloudDocument.value
      expertUploadedDoc.value = {
        url: cloud.url,
        name: cloud.name || "document",
        type: cloud.type || inferPptDocumentType(cloud.name || ""),
      }
    } else if (expertPickedFile.value) {
      expertUploadedDoc.value = await fileApi.uploadDocument(expertPickedFile.value)
    } else {
      return
    }
    if (!expertBookTitle.value.trim()) {
      expertBookTitle.value = expertUploadedDoc.value.name.replace(/\.[^.]+$/, "")
    }
    expertStep.value = "name"
  } catch (e: unknown) {
    expertFileError.value = e instanceof Error ? e.message : t("workspace.uploadingDoc")
  } finally {
    expertUploading.value = false
  }
}

async function onExpertSubmit() {
  if (!expertUploadedDoc.value || !expertName.value.trim() || !props.userId) return
  expertSubmitting.value = true
  expertError.value = ""
  expertStep.value = "progress"
  expertDistillLogs.value = []
  bookExpertStore.startDistill()
  expertAbort?.abort()
  expertAbort = new AbortController()
  try {
    const streamRequestId = `distill-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await bookExpertApi.distillExpert(
      {
        uploaded_documents: [expertUploadedDoc.value],
        expert_name: expertName.value.trim(),
        book_title: expertBookTitle.value.trim() || undefined,
        userId: String(props.userId),
        sessionId: getOrCreateSessionId(),
        streamRequestId,
        uiLocale: getSavedLocale() === "en" ? "en" : "zh",
      },
      {
        onProgress: (data) => appendExpertDistillLog(data),
        onEvent: (event, data) => {
          if (event === "expert_created" || event === "error" || event === "complete") return
          appendExpertDistillLog(data)
        },
        onExpertCreated: (data) => {
          const expert: BookExpertSummary = extractCreatedExpert(data, {
            ownerId: String(props.userId),
            name: expertName.value.trim(),
          })
          expertCreated.value = expert
          expertDoneName.value = expert.expert_name
          bookExpertStore.onDistillSuccess(expert)
          expertStep.value = "done"
          emit("expert-created", expert)
          ElMessage.success(t("bookExpert.distillDoneToast"))
          void loadExpertPreview(expert.expert_id)
        },
        onError: (msg) => {
          bookExpertStore.onDistillError(msg)
          expertError.value = msg
          expertStep.value = "name"
        },
        onComplete: () => {
          if (expertStep.value !== "done") expertStep.value = "done"
        },
      },
      expertAbort.signal,
    )
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : (e as Error)?.message || t("bookExpert.distillFailed")
    expertError.value = isCreditsInsufficient(e) ? t("workspace.creditsInsufficient") : msg
    bookExpertStore.onDistillError(msg)
    expertStep.value = "name"
  } finally {
    expertSubmitting.value = false
  }
}

function resetExpertFlow() {
  expertStep.value = "upload"
  expertPickedFile.value = null
  expertCloudDocument.value = null
  expertCloudSize.value = undefined
  expertUploadedDoc.value = null
  expertFileError.value = ""
  expertUploading.value = false
  expertSubmitting.value = false
  expertError.value = ""
  expertName.value = ""
  expertBookTitle.value = ""
  expertDoneName.value = ""
  expertCreated.value = null
  expertPreview.value = null
  expertPreviewLoading.value = false
  expertDistillLogs.value = []
  bookExpertStore.resetDistill()
  if (expertFileInput.value) expertFileInput.value.value = ""
}

function onEnterExpert() {
  if (expertCreated.value) emit("select-expert", expertCreated.value)
  resetExpertFlow()
}

defineExpose({ attachCloudDocument, resetExpertFlow })
</script>

<style scoped>
.be-distill__input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid hsl(var(--foreground) / 0.35);
  background: hsl(var(--background));
  padding: 10px 16px;
  font-size: 14px;
  color: hsl(var(--foreground));
}
.be-distill__input::placeholder {
  color: hsl(var(--muted-foreground));
}
.be-distill__input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}
</style>
