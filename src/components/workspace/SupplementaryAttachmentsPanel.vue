<template>
  <section
    class="supp-attachments"
    :class="variant === 'embedded' ? 'supp-attachments--embedded' : 'rounded-xl border border-border bg-card/40 px-4 py-3'"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs font-medium text-foreground">{{ t(`${i18nScope}.attachmentsTitle`) }}</p>
        <p class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {{ t(`${i18nScope}.attachmentsHint`) }}
        </p>
      </div>
      <div v-if="canUpload" class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!userId || uploading || atMaxCount || !apiAvailable"
          @click="openFilePicker"
        >
          <Loader2 v-if="uploading" class="h-3.5 w-3.5 animate-spin" />
          <Paperclip v-else class="h-3.5 w-3.5" />
          {{ t(`${i18nScope}.attachmentsAdd`) }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!userId || uploading || atMaxCount || !apiAvailable"
          @click="libraryPickerOpen = true"
        >
          <FolderOpen class="h-3.5 w-3.5" />
          {{ t(`${i18nScope}.attachmentsPickFromLibrary`) }}
        </button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="acceptAttr"
      @change="onFileInputChange"
    />

    <p v-if="loadError" class="mt-2 text-[11px] text-red-400">{{ loadError }}</p>
    <p v-else-if="loading" class="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
      <Loader2 class="h-3 w-3 animate-spin" />
      {{ t(`${i18nScope}.attachmentsLoading`) }}
    </p>
    <p v-else-if="!attachments.length" class="mt-3 text-[11px] text-muted-foreground">
      {{ t(`${i18nScope}.attachmentsEmpty`) }}
    </p>

    <ul v-else class="mt-3 space-y-2">
      <li
        v-for="item in attachments"
        :key="attachmentId(item)"
        class="flex items-center gap-2 rounded-lg border border-border/80 bg-background/40 px-3 py-2"
      >
        <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
        <button
          type="button"
          class="min-w-0 flex-1 text-left transition-colors disabled:cursor-default disabled:opacity-70"
          :class="
            canOpenInReader(item)
              ? 'cursor-pointer rounded-md hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50'
              : ''
          "
          :disabled="!canOpenInReader(item) || openingReaderId === attachmentId(item)"
          :title="canOpenInReader(item) ? t(`${i18nScope}.attachmentsOpenInReader`) : undefined"
          @click="onOpenInReader(item)"
        >
          <p class="truncate text-xs font-medium text-foreground">{{ item.name }}</p>
          <p class="text-[10px] text-muted-foreground">
            <span v-if="fileSize(item)">{{ formatBytes(fileSize(item)!) }}</span>
            <span v-if="fileSize(item) && statusLabel(item)"> · </span>
            <span v-if="statusLabel(item)">{{ statusLabel(item) }}</span>
            <span v-if="openingReaderId === attachmentId(item)" class="text-primary">
              · {{ t(`${i18nScope}.attachmentsOpeningReader`) }}
            </span>
          </p>
        </button>
        <button
          v-if="item.url"
          type="button"
          class="shrink-0 text-[10px] text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="downloadingId === attachmentId(item)"
          @click="onDownload(item)"
        >
          <Loader2
            v-if="downloadingId === attachmentId(item)"
            class="inline h-3 w-3 animate-spin align-[-2px]"
          />
          {{ t(`${i18nScope}.attachmentsDownload`) }}
        </button>
        <button
          v-if="canUpload"
          type="button"
          class="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          :disabled="deletingId === attachmentId(item)"
          :title="t(`${i18nScope}.attachmentsDelete`)"
          @click="onDelete(item)"
        >
          <Loader2 v-if="deletingId === attachmentId(item)" class="h-3.5 w-3.5 animate-spin" />
          <Trash2 v-else class="h-3.5 w-3.5" />
        </button>
      </li>
    </ul>

    <p v-if="canUpload && !apiAvailable" class="mt-2 text-[10px] text-amber-600/90 dark:text-amber-400/90">
      {{ t(`${i18nScope}.attachmentsBackendPending`) }}
    </p>
    <p v-else-if="canUpload && atMaxCount" class="mt-2 text-[10px] text-muted-foreground">
      {{ t(`${i18nScope}.attachmentsMaxCount`, { n: maxCount }) }}
    </p>

    <UserAssetDocumentPickerDialog
      v-model:open="libraryPickerOpen"
      :user-id="userId"
      :project-id="scope === 'project' ? resourceId : null"
      :title="t(`${i18nScope}.attachmentsPickFromLibraryTitle`)"
      :disabled-keys="linkedFileKeys"
      @select="onPickFromLibrary"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FileText, FolderOpen, Loader2, Paperclip, Trash2 } from 'lucide-vue-next'
import { bookExpertApi, fileApi, projectApi, ApiError } from '@/api'
import UserAssetDocumentPickerDialog from '@/components/workspace/UserAssetDocumentPickerDialog.vue'
import {
  validatePptDocumentFile,
  supplementaryAttachmentBodyFromUserAsset,
} from '@/utils/pptDocumentRag'
import type { UserAssetItem } from '@/api/types'
import { formatBytes } from '@/utils/userAssets'
import {
  ensureStorageQuotaForUpload,
  StorageQuotaBlockedError,
} from '@/utils/storageQuotaCheck'
import { downloadFileFromUrl } from '@/utils/downloadRemoteFile'
import type { SupplementaryAttachment } from '@/api/types'
import { detectReaderFormatFromName, useReaderFileStore } from '@/stores/reader'
import { readerOpenRouteQuery } from '@/utils/readerReturnRoute'

const props = withDefaults(
  defineProps<{
    scope: 'project' | 'bookExpert'
    resourceId: string
    userId: string | null
    /** card：独立卡片；embedded：PptViewer 内嵌 */
    variant?: 'card' | 'embedded'
    /** 只读列表（探索页访客） */
    readOnly?: boolean
  }>(),
  {
    variant: 'card',
    readOnly: false,
  },
)

const i18nScope = computed(() => (props.scope === 'project' ? 'workspace' : 'bookExpert'))
const canUpload = computed(() => !props.readOnly)

const { t } = useI18n()
const router = useRouter()
const readerFileStore = useReaderFileStore()
const maxCount = 10

const acceptAttr =
  '.pdf,.epub,.mobi,.doc,.docx,.txt,.md,application/pdf,text/plain,text/markdown'

const fileInputRef = ref<HTMLInputElement | null>(null)
const attachments = ref<SupplementaryAttachment[]>([])
const loading = ref(false)
const loadError = ref('')
const uploading = ref(false)
const deletingId = ref('')
const downloadingId = ref('')
const openingReaderId = ref('')
const apiAvailable = ref(true)
const libraryPickerOpen = ref(false)

const atMaxCount = computed(() => attachments.value.length >= maxCount)

const linkedFileKeys = computed(() => {
  const keys = new Set<string>()
  for (const a of attachments.value) {
    const k = String(a.file_key ?? a.fileKey ?? '').trim()
    if (k) keys.add(k)
  }
  return keys
})

function attachmentId(item: SupplementaryAttachment): string {
  return String(item.attachment_id ?? item.attachmentId ?? '').trim()
}

function fileSize(item: SupplementaryAttachment): number | undefined {
  const n = item.file_size ?? item.fileSize
  return typeof n === 'number' ? n : undefined
}

function canOpenInReader(item: SupplementaryAttachment): boolean {
  return Boolean(detectReaderFormatFromName(item.name))
}

async function resolveAttachmentUrl(item: SupplementaryAttachment): Promise<string> {
  const fileKey = String(item.file_key ?? item.fileKey ?? '').trim()
  const uid = String(props.userId || '').trim()
  let url = String(item.url || '').trim()
  if (fileKey && uid) {
    const fresh = await fileApi.resolveUserUploadedFileUrl({
      userId: uid,
      fileKey,
      projectId: props.scope === 'project' ? props.resourceId : undefined,
    })
    if (fresh) url = fresh
  }
  return url
}

async function onOpenInReader(item: SupplementaryAttachment) {
  if (!canOpenInReader(item)) {
    ElMessage.warning(t(`${i18nScope.value}.attachmentsReaderUnsupported`))
    return
  }
  const aid = attachmentId(item)
  if (!aid || openingReaderId.value) return
  const scope = i18nScope.value
  const filename = String(item.name || 'document').trim() || 'document'
  openingReaderId.value = aid
  try {
    const url = await resolveAttachmentUrl(item)
    if (!url) {
      ElMessage.error(t(`${scope}.attachmentsDownloadLinkUnavailable`))
      return
    }
    await readerFileStore.loadFromUrl(url, filename)
    const returnQuery =
      props.scope === 'project' && props.readOnly
        ? readerOpenRouteQuery({ returnTo: 'project-reader', projectId: props.resourceId })
        : readerOpenRouteQuery({ returnTo: 'workspace' })
    await router.push({ name: 'reader-open', query: returnQuery })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'OSS_URL_EXPIRED') {
      ElMessage.error(t(`${scope}.attachmentsDownloadExpired`))
    } else if (msg === 'READER_UNSUPPORTED') {
      ElMessage.warning(t(`${scope}.attachmentsReaderUnsupported`))
    } else {
      ElMessage.error(t(`${scope}.attachmentsReaderOpenFailed`))
    }
  } finally {
    openingReaderId.value = ''
  }
}

function statusLabel(item: SupplementaryAttachment): string {
  const s = String(item.status ?? 'indexed').toLowerCase()
  const scope = i18nScope.value
  if (s === 'pending') return t(`${scope}.attachmentsPending`)
  if (s === 'failed') return t(`${scope}.attachmentsFailed`)
  return t(`${scope}.attachmentsIndexed`)
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function loadAttachments() {
  const rid = String(props.resourceId || '').trim()
  if (!rid) {
    attachments.value = []
    return
  }
  if (props.scope === 'bookExpert') {
    const uid = String(props.userId || '').trim()
    if (!uid) {
      attachments.value = []
      return
    }
  }
  loading.value = true
  loadError.value = ''
  try {
    const res =
      props.scope === 'project'
        ? await projectApi.listProjectAttachments(rid)
        : await bookExpertApi.listExpertAttachments(rid, String(props.userId))
    attachments.value = res?.attachments ?? []
    apiAvailable.value = true
  } catch (e: unknown) {
    const code = e instanceof ApiError ? e.code : 0
    if (code === 404) {
      attachments.value = []
      apiAvailable.value = false
      return
    }
    apiAvailable.value = true
    loadError.value = e instanceof Error ? e.message : t(`${i18nScope.value}.attachmentsLoadFailed`)
    attachments.value = []
  } finally {
    loading.value = false
  }
}

async function registerAttachment(body: {
  userId: string
  url: string
  name: string
  type: string
  fileKey: string
  fileSize: number
  contentType?: string
}) {
  const scope = i18nScope.value
  const res =
    props.scope === 'project'
      ? await projectApi.addProjectAttachment(props.resourceId, body)
      : await bookExpertApi.addExpertAttachment(props.resourceId, body)
  if (res?.attachment) {
    attachments.value = [
      res.attachment,
      ...attachments.value.filter((a) => attachmentId(a) !== attachmentId(res.attachment)),
    ]
  } else {
    await loadAttachments()
  }
  ElMessage.success(t(`${scope}.attachmentsUploadSuccess`))
}

async function onPickFromLibrary(asset: UserAssetItem) {
  if (!props.userId || uploading.value || atMaxCount.value || !canUpload.value) return
  const uid = String(props.userId)
  const body = supplementaryAttachmentBodyFromUserAsset(asset, uid)
  if (!body) {
    ElMessage.warning(t('workspace.uploadUnsupportedType'))
    return
  }
  if (linkedFileKeys.value.has(body.fileKey)) {
    ElMessage.info(t(`${i18nScope.value}.attachmentsAlreadyLinked`))
    return
  }
  const scope = i18nScope.value
  uploading.value = true
  try {
    await registerAttachment(body)
  } catch (e: unknown) {
    if (e instanceof ApiError && e.errorCode === 'duplicate_file_key') {
      await loadAttachments()
      ElMessage.info(t(`${scope}.attachmentsAlreadyLinked`))
      return
    }
    ElMessage.error(e instanceof Error ? e.message : t(`${scope}.attachmentsUploadFailed`))
  } finally {
    uploading.value = false
  }
}

async function onFileInputChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !props.userId || uploading.value || atMaxCount.value || !canUpload.value) return

  const v = validatePptDocumentFile(file)
  if (v === 'unsupported') {
    ElMessage.warning(t('workspace.uploadUnsupportedType'))
    return
  }
  if (v === 'too_large') {
    ElMessage.warning(t('workspace.uploadTooLarge'))
    return
  }

  const uid = String(props.userId)
  const scope = i18nScope.value
  uploading.value = true
  try {
    await ensureStorageQuotaForUpload(file.size, t(`${scope}.attachmentsQuotaExceeded`))
    const uploaded = await fileApi.uploadDocument(file)
    const body = {
      userId: uid,
      url: uploaded.url,
      name: uploaded.name,
      type: uploaded.type,
      fileKey: uploaded.fileKey!,
      fileSize: uploaded.fileSize ?? file.size,
      contentType: uploaded.contentType,
    }
    await registerAttachment(body)
  } catch (e: unknown) {
    if (e instanceof StorageQuotaBlockedError) {
      ElMessage.error(t(`${scope}.attachmentsQuotaExceeded`))
    } else {
      ElMessage.error(e instanceof Error ? e.message : t(`${scope}.attachmentsUploadFailed`))
    }
  } finally {
    uploading.value = false
  }
}

async function onDownload(item: SupplementaryAttachment) {
  const aid = attachmentId(item)
  if (!aid || downloadingId.value) return
  const filename = String(item.name || 'attachment').trim() || 'attachment'
  const scope = i18nScope.value
  downloadingId.value = aid
  try {
    const url = await resolveAttachmentUrl(item)
    if (!url) {
      ElMessage.error(t(`${scope}.attachmentsDownloadLinkUnavailable`))
      return
    }
    await downloadFileFromUrl(url, filename)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'OSS_URL_EXPIRED') {
      ElMessage.error(t(`${scope}.attachmentsDownloadExpired`))
    } else {
      ElMessage.error(t(`${scope}.attachmentsDownloadFailed`))
    }
  } finally {
    downloadingId.value = ''
  }
}

async function onDelete(item: SupplementaryAttachment) {
  const aid = attachmentId(item)
  if (!aid || !props.userId || deletingId.value || !canUpload.value) return
  const scope = i18nScope.value
  try {
    await ElMessageBox.confirm(
      t(`${scope}.attachmentsDeleteConfirm`, { name: item.name }),
      t(`${scope}.attachmentsDelete`),
      { type: 'warning' },
    )
  } catch {
    return
  }
  deletingId.value = aid
  try {
    if (props.scope === 'project') {
      await projectApi.deleteProjectAttachment(props.resourceId, aid)
    } else {
      await bookExpertApi.deleteExpertAttachment(props.resourceId, aid, String(props.userId))
    }
    attachments.value = attachments.value.filter((a) => attachmentId(a) !== aid)
    ElMessage.success(t(`${scope}.attachmentsDeleted`))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    deletingId.value = ''
  }
}

watch(
  () => [props.scope, props.resourceId, props.userId] as const,
  () => {
    void loadAttachments()
  },
  { immediate: true },
)

defineExpose({ reload: loadAttachments })
</script>

<style scoped>
.supp-attachments--embedded {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1rem 1.25rem 1.5rem;
}
</style>
