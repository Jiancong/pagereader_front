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
        ref="articleRef"
        class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-card px-4 py-5 sm:px-6 sm:py-7"
        :style="contentFontStyle"
        @contextmenu.prevent="onNovelContextMenu"
        @click="onNovelContentClick"
      >
        <h1 v-if="activeSection" class="mb-6 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          {{ activeSection.label }}
        </h1>
        <div v-if="activeSection" class="novel-guide-content space-y-4">
          <NovelGuideOutlineList
            v-if="activeSection.kind === 'outline' && activeSection.outlineItems?.length"
            :items="activeSection.outlineItems"
            :jumpable-titles="chapterTitleSet"
            @jump="jumpToChapterFromOutline"
          />
          <template v-else>
            <div
              v-for="(turn, turnIndex) in activeSectionTurns"
              :key="`${activeSection.id}-${turnIndex}`"
              class="novel-speaker-turn"
            >
              <ChatMarkdownBody
                :content="turn"
                root-class="novel-guide-markdown"
              />
            </div>
          </template>
        </div>
      </article>

      <ChatHistoryRail
        v-if="projectId"
        v-model:collapsed="chatCollapsed"
        :items="chatItems"
        :loading="chatLoading"
        :pending-term="chatPendingQuestion"
        :streaming-content="chatStreamingContent"
        @submit-question="askNovelAgent"
        @open-detail="openChatDetail"
      />
    </div>

    <div v-else class="space-y-4 p-4 sm:p-6">
      <div
        v-for="(turn, turnIndex) in fullMarkdownTurns"
        :key="`full-${turnIndex}`"
        class="novel-speaker-turn"
      >
        <ChatMarkdownBody :content="turn" root-class="novel-guide-markdown" />
      </div>
    </div>

    <NovelAnnotationMenu
      :show="annotMenuVisible"
      :x="annotMenuX"
      :y="annotMenuY"
      :mode="annotMenuMode"
      :selection-text="annotSelectionText"
      :current-note="annotCurrentNote"
      @highlight="onMenuHighlight"
      @submit-note="onMenuSubmitNote"
      @edit-note="onMenuEdit"
      @delete="onMenuDelete"
      @close="closeAnnotMenu"
    />

    <el-dialog
      v-model="chatDetailVisible"
      class="novel-chat-dialog"
      modal-class="novel-chat-dialog-overlay"
      :title="chatDetailTitle"
      width="min(760px, calc(100vw - 2rem))"
    >
      <div class="novel-chat-dialog-content">
        <ChatMarkdownBody :content="chatDetailContent" root-class="novel-guide-markdown" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import ChatHistoryRail from "@/components/editor/chat/ChatHistoryRail.vue"
import NovelAnnotationMenu from "@/components/workspace/NovelAnnotationMenu.vue"
import NovelGuideOutlineList from "@/components/workspace/NovelGuideOutlineList.vue"
import { annotationApi, projectApi } from "@/api"
import { getCurrentUserId, getToken } from "@/api/token"
import { appendProjectConversationMessage, getProjectConversationHistory } from "@/api/feed"
import type { ConversationHistoryVo, ProjectAnnotation } from "@/api/types"
import { sendAgentChatWithStream } from "@/request/agent"
import { buildFontFamilyCss, ensureExportFontsReady } from "@/composables/useFontLoader"
import { useNovelGuidePlayAll } from "@/composables/useNovelGuidePlayAll"
import { downloadMarkdownFile, sanitizeDownloadBasename } from "@/utils/downloadMarkdownFile"
import { buildNovelGuideOutline } from "@/utils/novelGuideSections"
import type { NovelGuideOutlineItem } from "@/utils/novelGuideSections"
import { normalizeNovelGuideMarkdown } from "@/utils/novelMarkdownHeadings"
import {
  restoreHighlights,
  resolveAnnotationIdFromTarget,
  selectionToCharOffset,
} from "@/utils/novelAnnotationRange"
import {
  collectNovelGuideScrollTargets,
  isNovelGuideMobileViewport,
  pickScrollTargetByProgress,
  scrollElementToViewportCenter,
  waitForNovelGuideLayout,
} from "@/utils/novelGuideScrollSync"
import { splitOutlineSpeakerTurns } from "@/utils/outlineStream"
import type { NovelResult } from "@/utils/novelStream"

const props = withDefaults(
  defineProps<{
    result: NovelResult
    projectId?: string
    canUploadCover?: boolean
  }>(),
  {
    projectId: "",
    canUploadCover: true,
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
const articleRef = ref<HTMLElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const coverUploading = ref(false)
type NovelChatItem = { id: string | number; role: "user" | "assistant"; content: string; term?: string }
const chatCollapsed = ref(false)
const chatItems = ref<NovelChatItem[]>([])
const chatLoading = ref(false)
const chatPendingQuestion = ref("")
const chatStreamingContent = ref("")
const chatDetailVisible = ref(false)
const chatDetailTitle = ref("")
const chatDetailContent = ref("")
let lastPlaybackScrollTarget: HTMLElement | null = null
let playbackPageStartedAt = 0
let playbackPageEstimateMs = 60_000

// ===== 划线 / 想法 =====
const annotMenuVisible = ref(false)
const annotMenuX = ref(0)
const annotMenuY = ref(0)
const annotMenuMode = ref<"create" | "edit">("create")
const annotSelectionText = ref("")
const annotCurrentNote = ref("")
const annotTargetId = ref<string>("")
/** 当前章节缓存的 annotations，恢复高亮 + 点击 mark 时定位 */
const sectionAnnotations = ref<ProjectAnnotation[]>([])
/** create 模式下临时记录选区偏移（点击 mark 后选区已丢失，故不依赖 Range） */
let pendingSelection: { start: number; end: number; text: string } | null = null

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

const activeSectionTurns = computed(() => {
  if (activeSection.value?.kind === "outline" && activeSection.value.outlineItems?.length) {
    return []
  }
  const markdown = normalizeNovelGuideMarkdown(activeSection.value?.markdown || "")
  const turns = splitOutlineSpeakerTurns(markdown)
  return turns.length ? turns : markdown ? [markdown] : []
})

const chapterTitleSet = computed(() => {
  const titles = new Set<string>()
  for (const section of outline.value.sections) {
    if (section.kind === "chapter") titles.add(section.label.trim())
  }
  return titles
})

function jumpToChapterFromOutline(item: NovelGuideOutlineItem) {
  const target = outline.value.sections.find(
    (section) => section.kind === "chapter" && section.label.trim() === item.title.trim(),
  )
  if (target) selectSection(target.id)
}

const fullMarkdownTurns = computed(() => {
  const markdown = props.result.markdown || ""
  const turns = splitOutlineSpeakerTurns(markdown)
  return turns.length ? turns : markdown ? [markdown] : []
})

const activeSectionIndex = computed(() =>
  outline.value.sections.findIndex((section) => section.id === activeSectionId.value),
)

const showCoverUpload = computed(
  () => props.canUploadCover && Boolean(String(props.projectId || "").trim()),
)

const contentFontStyle = computed(() => ({
  fontFamily: NOVEL_SERIF_FONT,
}))

function resetPlaybackScrollSync() {
  lastPlaybackScrollTarget = null
}

function shouldAutoScrollDuringPlayback() {
  // 移动版 stacked 布局；桌面端分栏时不自动滚，避免干扰阅读
  return isNovelGuideMobileViewport()
}

function scrollArticleToPlaybackProgress(currentTime: number, duration: number) {
  if (!shouldAutoScrollDuringPlayback()) return

  const article = articleRef.value
  if (!article) return

  const targets = collectNovelGuideScrollTargets(article)
  if (!targets.length) return

  let progress = 0
  if (Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)) {
    progress = Math.min(1, Math.max(0, currentTime / duration))
  } else if (playbackPageStartedAt > 0 && playbackPageEstimateMs > 0) {
    progress = Math.min(
      1,
      Math.max(0, (performance.now() - playbackPageStartedAt) / playbackPageEstimateMs),
    )
  }

  const target = pickScrollTargetByProgress(targets, progress)
  if (!target) return

  if (target !== lastPlaybackScrollTarget) {
    lastPlaybackScrollTarget = target
    scrollElementToViewportCenter(target)
  }
}

async function scrollArticleToSectionStart() {
  if (!shouldAutoScrollDuringPlayback()) return

  await nextTick()
  await waitForNovelGuideLayout()

  const article = articleRef.value
  if (!article) return

  const targets = collectNovelGuideScrollTargets(article)
  const target = targets[0]
  if (!target) return

  lastPlaybackScrollTarget = target
  scrollElementToViewportCenter(target, "auto")
}

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
  onBeforePlayPage: (page) => {
    resetPlaybackScrollSync()
    playbackPageStartedAt = performance.now()
    const section = outline.value.sections[page - 1]
    const textLen = (section?.markdown?.length ?? 0) + (section?.label?.length ?? 0)
    // 中文 TTS 粗估 ~5 字/秒，限制在 15s–3min
    playbackPageEstimateMs = Math.max(15_000, Math.min(180_000, textLen * 200))
    void scrollArticleToSectionStart()
  },
  onPageTimeUpdate: (_page, currentTime, duration) => {
    scrollArticleToPlaybackProgress(currentTime, duration)
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

// ===== 划线 / 想法：菜单与持久化 =====
function isAnnotationEnabled(): boolean {
  return Boolean(String(props.projectId || "").trim()) && Boolean(getToken())
}

function onNovelContextMenu(event: MouseEvent) {
  if (!isAnnotationEnabled()) return
  const article = articleRef.value
  if (!article) return
  const selection = window.getSelection()
  const range = selection ? selectionToCharOffset(selection, article) : null
  if (!range) {
    ElMessage.info(t("workspace.novelAnnotateSelectFirst"))
    return
  }
  pendingSelection = range
  annotSelectionText.value = range.text.slice(0, 200)
  annotMenuMode.value = "create"
  annotCurrentNote.value = ""
  annotTargetId.value = ""
  annotMenuX.value = clampMenuX(event.clientX)
  annotMenuY.value = clampMenuY(event.clientY)
  annotMenuVisible.value = true
}

function clampMenuX(x: number): number {
  const max = window.innerWidth - 24
  return Math.max(8, Math.min(x, max))
}

function clampMenuY(y: number): number {
  const max = window.innerHeight - 24
  return Math.max(8, Math.min(y, max))
}

function onNovelContentClick(event: MouseEvent) {
  if (!isAnnotationEnabled()) return
  const id = resolveAnnotationIdFromTarget(event.target)
  if (!id) {
    if (annotMenuVisible.value) closeAnnotMenu()
    return
  }
  const ann = sectionAnnotations.value.find((a) => a.id === id)
  if (!ann) return
  annotTargetId.value = id
  annotMenuMode.value = "edit"
  annotCurrentNote.value = ann.note ?? ""
  annotSelectionText.value = ann.selectedText.slice(0, 200)
  annotMenuX.value = clampMenuX(event.clientX)
  annotMenuY.value = clampMenuY(event.clientY)
  annotMenuVisible.value = true
}

function closeAnnotMenu() {
  annotMenuVisible.value = false
  pendingSelection = null
}

function onAnnotMenuPointerDown(event: PointerEvent) {
  if (!annotMenuVisible.value) return
  const target = event.target as Element | null
  if (target?.closest?.(".novel-annot-menu")) return
  closeAnnotMenu()
}

async function onMenuHighlight() {
  await createAnnotationFromSelection("")
}

async function onMenuSubmitNote(note: string) {
  // edit 模式下「保存」即更新现有 note
  if (annotMenuMode.value === "edit") {
    await updateAnnotationNote(note)
    return
  }
  await createAnnotationFromSelection(note)
}

async function createAnnotationFromSelection(note: string) {
  const projectId = String(props.projectId || "").trim()
  const sectionId = activeSectionId.value
  const sel = pendingSelection
  if (!projectId || !sectionId || !sel) return
  try {
    const created = await annotationApi.createAnnotation(projectId, {
      sectionId,
      startOffset: sel.start,
      endOffset: sel.end,
      selectedText: sel.text,
      note: note || undefined,
    })
    sectionAnnotations.value = [...sectionAnnotations.value, created]
    void nextTick(() => applySectionHighlights())
    ElMessage.success(t("workspace.novelAnnotateSaved"))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("workspace.novelAnnotateSaveFailed"))
  }
}

async function updateAnnotationNote(note: string) {
  const projectId = String(props.projectId || "").trim()
  const id = annotTargetId.value
  if (!projectId || !id) return
  try {
    const updated = await annotationApi.updateAnnotation(projectId, id, {
      note: note || undefined,
    })
    sectionAnnotations.value = sectionAnnotations.value.map((a) =>
      a.id === id ? { ...a, note: updated.note } : a,
    )
    void nextTick(() => applySectionHighlights())
    ElMessage.success(t("workspace.novelAnnotateSaved"))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("workspace.novelAnnotateSaveFailed"))
  }
}

async function onMenuEdit() {
  // 编辑入口走菜单内联输入框；提交时 submit-note 事件由 onMenuSubmitNote 处理。
}

async function onMenuDelete() {
  const projectId = String(props.projectId || "").trim()
  const id = annotTargetId.value
  if (!projectId || !id) return
  try {
    await annotationApi.deleteAnnotation(projectId, id)
    sectionAnnotations.value = sectionAnnotations.value.filter((a) => a.id !== id)
    void nextTick(() => applySectionHighlights())
    ElMessage.success(t("workspace.novelAnnotateDeleted"))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("workspace.novelAnnotateDeleteFailed"))
  }
}

async function loadSectionAnnotations(sectionId: string) {
  const projectId = String(props.projectId || "").trim()
  if (!projectId || !getToken()) {
    sectionAnnotations.value = []
    return
  }
  try {
    sectionAnnotations.value = await annotationApi.listAnnotations(projectId, sectionId)
  } catch {
    sectionAnnotations.value = []
  }
}

function applySectionHighlights() {
  const article = articleRef.value
  if (!article) return
  restoreHighlights(article, sectionAnnotations.value)
}

watch(ttsPlayAllActive, (active) => {
  if (!active) resetPlaybackScrollSync()
})

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

// 切换章节时加载该章节的划线并恢复高亮（等 markdown 渲染完成）
watch(
  activeSectionId,
  async (sectionId) => {
    if (!sectionId) {
      sectionAnnotations.value = []
      return
    }
    await loadSectionAnnotations(sectionId)
    await nextTick()
    await waitForNovelGuideLayout()
    applySectionHighlights()
  },
  { immediate: true },
)

function novelChatHistoryFromRows(rows: ConversationHistoryVo[]): NovelChatItem[] {
  return rows
    .filter((row) => {
      const meta = row.metadata as Record<string, unknown> | undefined
      return meta?.intent === "novel_related_search" || meta?.type === "novel_related_search"
    })
    .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: String(row.markdown || row.content || "").trim(),
      term: row.role === "assistant" ? String((row.metadata as Record<string, unknown>)?.question || "") : undefined,
    }))
    .filter((item) => item.content)
}

async function loadNovelChatHistory() {
  if (!props.projectId) return
  try {
    chatItems.value = novelChatHistoryFromRows(await getProjectConversationHistory(props.projectId))
  } catch {
    // 历史读取失败不阻断导读正文。
  }
}

function getEventText(data: Record<string, unknown>): string {
  const value = data.response ?? data.message ?? data.full_text ?? data.content ?? data.delta ?? data.text ?? data.chunk
  return value == null ? "" : String(value)
}

function openChatDetail(payload: { term?: string; content: string }) {
  chatDetailTitle.value = payload.term || t("workspace.chatHistory")
  chatDetailContent.value = payload.content
  chatDetailVisible.value = true
}

async function askNovelAgent(question: string) {
  const userId = getCurrentUserId()
  const section = activeSection.value
  if (!userId || !props.projectId || !section || chatLoading.value) {
    ElMessage.warning("请登录并选择文档章节后再提问")
    return
  }

  const sectionText = section.markdown.slice(0, 12_000)
  const message = [
    `请仅根据文档导读《${props.result.title || "当前文档"}》及当前章节回答问题。`,
    `当前章节：${section.label}`,
    `章节内容：\n${sectionText}`,
    `用户问题：${question}`,
  ].join("\n\n")
  const sessionId = `novel-related-${Date.now()}`
  let finalContent = ""
  chatLoading.value = true
  chatPendingQuestion.value = question
  chatStreamingContent.value = ""

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      }

      void sendAgentChatWithStream(
        {
          message,
          userId: String(userId),
          projectId: props.projectId,
          sessionId,
          isAgent: true,
          intent: "novel_related_search",
          locale: "zh-CN",
          extra_body: {
            intent: "novel_related_search",
            question,
            novelTitle: props.result.title,
            sectionId: section.id,
            sectionTitle: section.label,
            sectionContent: sectionText,
            novelDataUrl: props.result.novelDataUrl,
          },
        },
        (eventData) => {
          const event = String(eventData.event || "").toLowerCase()
          const data = (eventData.data || {}) as Record<string, unknown>
          const text = getEventText(data)
          if (event === "llm_text_stream_delta" && text) {
            chatStreamingContent.value += text
          } else if ((event === "knowledge_response" || event === "chat_response" || event === "llm_text_stream_end") && text) {
            chatStreamingContent.value = text
          }
          // Document RAG commonly ends with knowledge_response instead of a
          // separate complete event; otherwise the rail remains loading forever.
          if (
            event === "knowledge_response" ||
            event === "chat_response" ||
            event === "complete"
          ) finish()
          if (event === "error") fail(new Error(String(data.message || data.error || "agent stream error")))
        },
        fail,
        finish,
        180_000,
      ).catch(fail)
    })
    finalContent = chatStreamingContent.value.trim()
    if (!finalContent) throw new Error("empty agent response")

    const now = Date.now()
    chatItems.value.push(
      { id: `novel-user-${now}`, role: "user", content: question },
      { id: `novel-ai-${now}`, role: "assistant", content: finalContent, term: question },
    )
    await Promise.all([
      appendProjectConversationMessage(props.projectId, {
        sessionId,
        role: "user",
        content: question,
        metadata: { intent: "novel_related_search", type: "novel_related_search", question, sectionId: section.id, sectionTitle: section.label },
      }),
      appendProjectConversationMessage(props.projectId, {
        sessionId,
        role: "assistant",
        content: finalContent,
        markdown: finalContent,
        metadata: { intent: "novel_related_search", type: "novel_related_search", question, sectionId: section.id, sectionTitle: section.label },
      }),
    ])
  } catch {
    if (!finalContent && !chatStreamingContent.value.trim()) ElMessage.error("Agent 暂未返回有效回答，请稍后重试")
  } finally {
    chatLoading.value = false
    chatPendingQuestion.value = ""
    chatStreamingContent.value = ""
  }
}

onMounted(() => {
  void ensureExportFontsReady("SimSun")
  void loadNovelChatHistory()
  window.addEventListener("pointerdown", onAnnotMenuPointerDown, true)
  window.addEventListener("scroll", closeAnnotMenuOnScroll, true)
  window.addEventListener("resize", closeAnnotMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onAnnotMenuPointerDown, true)
  window.removeEventListener("scroll", closeAnnotMenuOnScroll, true)
  window.removeEventListener("resize", closeAnnotMenu)
})

function closeAnnotMenuOnScroll() {
  if (annotMenuVisible.value) closeAnnotMenu()
}
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
  font-size: 1.2em;
}

.novel-speaker-turn + .novel-speaker-turn {
  margin-top: 1rem;
}

.novel-speaker-turn :deep(.markdown-body),
.novel-speaker-turn :deep(.markdown-body p) {
  display: block;
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

/* 划线高亮 */
:deep(mark.novel-annotation) {
  background-color: rgba(255, 224, 130, 0.65);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(255, 213, 79, 0.85);
  }
}

:deep(mark.novel-annotation--noted) {
  background-color: rgba(255, 183, 77, 0.55);
  border-bottom: 2px solid rgba(255, 152, 0, 0.7);
}
</style>

<style lang="scss">
.novel-chat-dialog-overlay {
  background: rgba(4, 7, 14, 0.72) !important;
  backdrop-filter: blur(5px);
}

.el-dialog.novel-chat-dialog {
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 1rem;
  background: #14161e;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.52);

  .el-dialog__header {
    display: flex;
    align-items: center;
    min-height: 3.5rem;
    margin: 0;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.025);
  }

  .el-dialog__title {
    overflow: hidden;
    color: rgba(255, 255, 255, 0.94);
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .el-dialog__headerbtn {
    top: 0;
    right: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    color: rgba(255, 255, 255, 0.6);

    &:hover {
      color: #fff;
    }
  }

  .el-dialog__body {
    max-height: min(68vh, 660px);
    padding: 1.25rem 1.5rem 1.5rem;
    overflow-y: auto;
    color: rgba(255, 255, 255, 0.9);
  }
}

.novel-chat-dialog-content {
  font-family: "Noto Serif SC", "Songti SC", SimSun, serif;

  .markdown-body {
    color: inherit;
    font-size: 1rem;
    line-height: 1.8;
  }

  .markdown-body h1,
  .markdown-body h2,
  .markdown-body h3,
  .markdown-body strong {
    color: #fff;
  }

  .markdown-body code {
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 0.25rem;
    background: rgba(148, 163, 184, 0.14);
    color: #c4d4ff;
  }
}
</style>
