<template>
  <div class="workspace-novel-result overflow-hidden rounded-2xl border border-border bg-card">
    <header class="border-b border-border">
      <div class="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-primary">{{ t("workspace.novelResultBadge") }}</p>
          <h2 class="mt-1 break-words text-lg font-semibold text-foreground">
            {{ result.title || t("workspace.novelResultTitle") }}
          </h2>
          <p v-if="statsLine" class="mt-1 text-sm text-muted-foreground">{{ statsLine }}</p>
          <p v-if="result.message" class="mt-1 text-sm text-muted-foreground">{{ result.message }}</p>
        </div>
      </div>

      <div class="novel-guide-toolbar">
        <div class="novel-guide-actions">
          <button
            type="button"
            class="novel-guide-export-btn"
            :disabled="!result.markdown"
            :title="t('workspace.novelExportMarkdown')"
            @click="exportMarkdown"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11.5 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5.27 4.677l5.46 2.692a1.5 1.5 0 0 0 0 2.262l-5.46 2.692A1.5 1.5 0 0 1 3.5 11.19V4.81a1.5 1.5 0 0 1 1.77-1.133z"
              />
            </svg>
            <span>{{ t("agent.pptShare") }}</span>
          </button>

          <input
            v-if="showCoverUpload"
            ref="coverInputRef"
            type="file"
            class="novel-guide-cover-input-hidden"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onCoverFileSelected"
          />
          <button
            v-if="showCoverUpload"
            type="button"
            class="novel-guide-cover-btn"
            :disabled="coverUploading"
            :title="t('agent.pptUploadCover')"
            @click="triggerCoverUpload"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M.5 13a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V3a1.5 1.5 0 0 0-1.5-1.5h-12A1.5 1.5 0 0 0 .5 3v10zm1.5.5A.5.5 0 0 1 1 13V3a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5h-12z" />
              <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
              <path d="M14.002 13l-4-4-3 3-2-2-3 3V13h12z" />
            </svg>
            <span>{{ coverUploading ? t("agent.pptUploadCoverUploading") : t("agent.pptUploadCover") }}</span>
          </button>

          <button
            type="button"
            class="novel-guide-audio-btn novel-guide-audio-btn--all"
            :class="{
              'novel-guide-audio-btn--active': ttsPlayAllActive,
            }"
            :disabled="ttsLoading || !canPlayGuideAudio"
            :aria-label="playAllButtonTitle"
            @click="togglePlayAll"
          >
            <span class="novel-guide-audio-btn-tooltip" role="tooltip">{{ playAllButtonTitle }}</span>
            <svg
              v-if="ttsPlayAllActive"
              class="novel-guide-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg
              v-else
              class="novel-guide-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 6.5a1 1 0 0 1 1.55-.83l8 5.5a1 1 0 0 1 0 1.66l-8 5.5A1 1 0 0 1 6 17.5v-11Z" />
              <path d="M17 6.5h1.75a1 1 0 0 1 1 1v8.75a1 1 0 0 1-1 1H17V6.5Z" />
              <path d="M20.75 9.25h1.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-1.5v-5.5Z" />
            </svg>
            <span class="novel-guide-audio-btn-label">{{ t("agent.pptAudioPlayAllLabel") }}</span>
          </button>

          <a
            v-if="showPlayerLink"
            :href="playerHref"
            target="_blank"
            rel="noopener"
            class="novel-guide-player-link-btn"
            :title="t('workspace.openInPlayer')"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                d="M6.75 1h-3A2.75 2.75 0 0 0 1 3.75v8.5A2.75 2.75 0 0 0 3.75 15h6.5A2.75 2.75 0 0 0 13 12.25v-3a.75.75 0 0 0-1.5 0v3c0 .69-.56 1.25-1.25 1.25h-6.5C3.56 13.5 3 12.94 3 12.25v-8.5c0-.69.56-1.25 1.25-1.25h2.5a.75.75 0 0 0 0-1.5Z"
              />
              <path
                d="M9.5 1.75A.75.75 0 0 1 10.25 1h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.28.53l-1.22-1.22-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97-1.22-1.22A.75.75 0 0 1 9.5 1.75Z"
              />
            </svg>
          </a>

          <button
            type="button"
            class="novel-guide-close-btn"
            :title="t('workspace.novelResultClose')"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div
      v-if="outline.sections.length"
      class="flex h-[min(72vh,880px)] min-h-0 flex-col md:flex-row"
    >
      <nav
        class="novel-guide-nav max-h-56 shrink-0 overflow-y-auto border-border bg-secondary/20 md:max-h-full md:min-h-0 md:w-64 md:border-b-0 md:border-r"
        aria-label="Novel guide sections"
      >
        <p
          v-if="outline.title"
          class="border-b border-border px-4 py-3 text-sm italic leading-snug text-muted-foreground"
        >
          {{ outline.title }}
        </p>
        <button
          v-for="section in outline.sections"
          :key="section.id"
          type="button"
          class="block w-full border-b border-border/60 px-4 py-2.5 text-left text-sm leading-snug transition-colors last:border-b-0"
          :class="navItemClass(section.id)"
          @click="selectSection(section.id)"
        >
          {{ section.label }}
        </button>
      </nav>

      <article
        class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-card px-4 py-5 sm:px-6 sm:py-7"
        :style="contentFontStyle"
      >
        <h1 v-if="activeSection" class="mb-6 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          {{ activeSection.label }}
        </h1>
        <ChatMarkdownBody
          v-if="activeSection"
          :content="activeSection.markdown"
          root-class="novel-guide-markdown"
        />
      </article>
    </div>

    <div v-else class="p-4 sm:p-6">
      <ChatMarkdownBody :content="result.markdown" root-class="novel-guide-markdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import { projectApi } from "@/api"
import { buildFontFamilyCss, ensureExportFontsReady } from "@/composables/useFontLoader"
import { useNovelGuidePlayAll } from "@/composables/useNovelGuidePlayAll"
import { downloadMarkdownFile, sanitizeDownloadBasename } from "@/utils/downloadMarkdownFile"
import { buildNovelGuideOutline } from "@/utils/novelGuideSections"
import type { NovelResult } from "@/utils/novelStream"

const props = withDefaults(
  defineProps<{
    result: NovelResult
    projectId?: string
    canUploadCover?: boolean
    autoPlay?: boolean
  }>(),
  {
    projectId: "",
    canUploadCover: true,
    autoPlay: false,
  },
)

const emit = defineEmits<{
  close: []
  "cover-uploaded": [payload: { thumbnailUrl?: string; coverImageUrl?: string }]
}>()

const { t } = useI18n()

const NOVEL_SERIF_FONT = buildFontFamilyCss("SimSun, Songti SC, STSong")
const COVER_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

const activeSectionId = ref("")
const coverInputRef = ref<HTMLInputElement | null>(null)
const coverUploading = ref(false)

const outline = computed(() =>
  buildNovelGuideOutline({
    markdown: props.result.markdown,
    novelNodes: props.result.novelNodes,
    title: props.result.title,
  }),
)

const activeSection = computed(() =>
  outline.value.sections.find((section) => section.id === activeSectionId.value) ??
  outline.value.sections[0] ??
  null,
)

const activeSectionIndex = computed(() =>
  outline.value.sections.findIndex((section) => section.id === activeSectionId.value),
)

const showCoverUpload = computed(
  () => props.canUploadCover && Boolean(String(props.projectId || "").trim()),
)

const showPlayerLink = computed(() => Boolean(String(props.projectId || "").trim()))
const playerHref = computed(() => `/play/${encodeURIComponent(String(props.projectId || "").trim())}`)

const contentFontStyle = computed(() => ({
  fontFamily: NOVEL_SERIF_FONT,
}))

const {
  ttsLoading,
  ttsPlayAllActive,
  canPlayGuideAudio,
  playAllButtonTitle,
  togglePlayAll,
  stopPlayback,
} = useNovelGuidePlayAll({
  projectId: () => props.projectId,
  sections: () => outline.value.sections,
  activeSectionIndex: () => Math.max(activeSectionIndex.value, 0),
  onActiveSectionIndexChange: (index) => {
    const section = outline.value.sections[index]
    if (section) activeSectionId.value = section.id
  },
})

function navItemClass(sectionId: string) {
  return sectionId === activeSectionId.value
    ? "bg-primary font-medium text-primary-foreground"
    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
}

function selectSection(sectionId: string) {
  activeSectionId.value = sectionId
  stopPlayback()
}

function exportMarkdown() {
  const markdown = props.result.markdown?.trim()
  if (!markdown) return
  const basename = sanitizeDownloadBasename(
    props.result.title || t("workspace.novelResultTitle"),
  )
  downloadMarkdownFile(basename, markdown)
  ElMessage.success(t("workspace.novelExportMarkdownSuccess"))
}

function triggerCoverUpload() {
  if (coverUploading.value || !showCoverUpload.value) return
  coverInputRef.value?.click()
}

async function onCoverFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return

  const projectId = String(props.projectId || "").trim()
  if (!projectId) {
    ElMessage.warning(t("agent.pptShareNoProject"))
    return
  }

  const mime = (file.type || "").toLowerCase()
  if (mime && !COVER_IMAGE_TYPES.has(mime)) {
    ElMessage.warning(t("agent.pptUploadCoverInvalidType"))
    return
  }

  coverUploading.value = true
  try {
    const result = await projectApi.uploadProjectCover(projectId, file)
    const thumbnailUrl =
      String(result?.thumbnailUrl || result?.coverImageUrl || "").trim() || undefined
    emit("cover-uploaded", {
      thumbnailUrl,
      coverImageUrl: String(result?.coverImageUrl || thumbnailUrl || "").trim() || undefined,
    })
    ElMessage.success(t("agent.pptUploadCoverSuccess"))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("agent.pptUploadCoverFailed"))
  } finally {
    coverUploading.value = false
  }
}

const statsLine = computed(() => {
  const parts: string[] = []
  if (props.result.chapterCount != null) {
    parts.push(t("workspace.novelResultChapters", { n: props.result.chapterCount }))
  }
  if (props.result.characterCount != null) {
    parts.push(t("workspace.novelResultCharacters", { n: props.result.characterCount }))
  }
  if (props.result.qaCount != null) {
    parts.push(t("workspace.novelResultQa", { n: props.result.qaCount }))
  }
  return parts.join(" · ")
})

watch(
  () => outline.value.sections,
  (sections) => {
    if (!sections.length) {
      activeSectionId.value = ""
      return
    }
    if (!sections.some((section) => section.id === activeSectionId.value)) {
      activeSectionId.value = sections[0].id
    }
  },
  { immediate: true },
)

onMounted(async () => {
  void ensureExportFontsReady("SimSun")
  if (props.autoPlay) {
    await nextTick()
    void togglePlayAll()
  }
})
</script>

<style scoped lang="scss">
@import "./novelGuideToolbar.scss";

.novel-guide-nav {
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}

:deep(.novel-guide-markdown.markdown-body) {
  color: inherit;
  font-size: 1.125rem;
  line-height: 1.85;
}

@media (min-width: 640px) {
  :deep(.novel-guide-markdown.markdown-body) {
    font-size: 1.3125rem;
    line-height: 1.8;
  }
}

:deep(.novel-guide-markdown.markdown-body h2),
:deep(.novel-guide-markdown.markdown-body h3) {
  font-family: inherit;
  font-weight: 700;
  color: inherit;
}

:deep(.novel-guide-markdown.markdown-body h2) {
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  font-size: 1.375rem;
}

@media (min-width: 640px) {
  :deep(.novel-guide-markdown.markdown-body h2) {
    font-size: 1.5rem;
  }
}

:deep(.novel-guide-markdown.markdown-body h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

@media (min-width: 640px) {
  :deep(.novel-guide-markdown.markdown-body h3) {
    font-size: 1.375rem;
  }
}

:deep(.novel-guide-markdown.markdown-body p),
:deep(.novel-guide-markdown.markdown-body li) {
  font-family: inherit;
  margin: 0.65em 0;
}

:deep(.novel-guide-markdown.markdown-body strong) {
  color: inherit;
  font-weight: 700;
}

:deep(.novel-guide-markdown.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0 1rem;
  font-size: 1.0625rem;
}

@media (min-width: 640px) {
  :deep(.novel-guide-markdown.markdown-body table) {
    font-size: 1.1875rem;
  }
}

:deep(.novel-guide-markdown.markdown-body th),
:deep(.novel-guide-markdown.markdown-body td) {
  @apply border border-border px-2.5 py-2 text-left;
}

:deep(.novel-guide-markdown.markdown-body th) {
  @apply bg-secondary text-foreground;
}

:deep(.novel-guide-markdown.markdown-body img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
  border-radius: 8px;
  border: 1px solid hsl(var(--border) / 0.6);
}
</style>
