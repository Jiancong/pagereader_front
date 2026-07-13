<template>
  <div class="workspace-outline-result overflow-hidden rounded-2xl border border-border bg-card">
    <header class="border-b border-border px-4 py-4 sm:px-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-primary">
            {{ t("workspace.outlineResultBadge") }}
          </p>
          <h2 class="mt-1 break-words text-lg font-semibold text-foreground">
            {{ result.title || t("workspace.outlineResultTitle") }}
          </h2>
          <p v-if="metaLine" class="mt-1 text-sm text-muted-foreground">{{ metaLine }}</p>
          <p v-if="result.message" class="mt-1 text-sm text-muted-foreground">{{ result.message }}</p>
          <p v-if="streaming" class="mt-2 text-xs text-primary">{{ t("workspace.outlineStreaming") }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('close')"
        >
          {{ t("workspace.outlineResultClose") }}
        </button>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <div ref="exportMenuRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            :aria-expanded="exportMenuOpen"
            @click="exportMenuOpen = !exportMenuOpen"
          >
            <Share2 class="h-3.5 w-3.5" />
            {{ t("agent.pptShare") }}
            <ChevronDown
              class="h-3.5 w-3.5 transition-transform"
              :class="exportMenuOpen ? 'rotate-180' : ''"
            />
          </button>

          <div
            v-if="exportMenuOpen"
            class="absolute left-0 top-full z-[120] mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
            role="menu"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
              role="menuitem"
              @click="copyShareLink"
            >
              <Link2 class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="flex-1">{{ t("agent.pptShareViaLink") }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
              role="menuitem"
              :disabled="!exportableMarkdown"
              @click="exportMarkdown"
            >
              <FileText class="h-4 w-4 shrink-0 text-sky-500" />
              <span class="flex-1">{{ t("workspace.outlineExportMarkdown") }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
              role="menuitem"
              :disabled="!exportableMarkdown"
              @click="exportPdf"
            >
              <FileDown class="h-4 w-4 shrink-0 text-red-500" />
              <span class="flex-1">{{ t("agent.pptShareExportPdf") }}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          :class="ttsPlayAllActive ? 'border-primary bg-primary/10 text-primary' : ''"
          :disabled="streaming || !canPlayGuideAudio"
          :title="playAllButtonTitle"
          @click="togglePlayAll"
        >
          <Loader2 v-if="ttsLoading" class="h-3.5 w-3.5 animate-spin" />
          <Pause v-else-if="ttsPlayAllActive" class="h-3.5 w-3.5" />
          <Play v-else class="h-3.5 w-3.5" />
          {{ playAllButtonLabel }}
        </button>
        <a
          v-if="result.youtubeUrl"
          :href="result.youtubeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
        >
          {{ t("workspace.outlineOpenVideo") }}
        </a>
      </div>
    </header>

    <div v-if="result.sections.length" class="grid min-h-[420px] grid-cols-1 lg:grid-cols-[minmax(240px,32%)_minmax(0,1fr)]">
      <aside class="border-b border-border bg-secondary/20 lg:border-b-0 lg:border-r">
        <div class="max-h-[70vh] overflow-y-auto p-3">
          <button
            v-for="section in result.sections"
            :key="section.index"
            type="button"
            class="mb-2 block w-full rounded-lg border px-3 py-2 text-left transition-colors"
            :class="
              activeSection?.index === section.index
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            "
            @click="selectSection(section.index)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-medium text-foreground">{{ section.heading || section.title }}</span>
              <span v-if="section.time_hint" class="shrink-0 text-[11px] text-muted-foreground">
                {{ section.time_hint }}
              </span>
            </div>
          </button>
        </div>
      </aside>

      <section class="min-w-0 p-4 sm:p-6">
        <div v-if="activeSection" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-foreground">
              {{ activeSection.heading || activeSection.title }}
            </h3>
            <a
              v-if="seekUrl"
              :href="seekUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-medium text-primary hover:underline"
            >
              {{ t("workspace.outlineJumpToTime", { time: activeSection.time_hint || "0:00" }) }}
            </a>
          </div>
          <div class="rounded-xl border border-border bg-secondary/20 p-4 sm:p-5">
            <div
              v-for="(turn, turnIndex) in activeSectionTurns"
              :key="`${activeSection.index}-${turnIndex}`"
              class="outline-speaker-turn"
            >
              <ChatMarkdownBody
                :content="turn"
                root-class="outline-section-markdown"
              />
            </div>
          </div>
        </div>
        <div v-else-if="result.markdown" class="outline-markdown space-y-4">
          <div
            v-for="(turn, turnIndex) in fullMarkdownTurns"
            :key="`md-${turnIndex}`"
            class="outline-speaker-turn"
          >
            <ChatMarkdownBody :content="turn" root-class="outline-section-markdown" />
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="result.markdown" class="space-y-4 p-4 sm:p-6">
      <div
        v-for="(turn, turnIndex) in fullMarkdownTurns"
        :key="`full-${turnIndex}`"
        class="outline-speaker-turn"
      >
        <ChatMarkdownBody :content="turn" root-class="outline-section-markdown" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import {
  ChevronDown,
  FileDown,
  FileText,
  Link2,
  Loader2,
  Pause,
  Play,
  Share2,
} from "lucide-vue-next"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import { downloadMarkdownFile, sanitizeDownloadBasename } from "@/utils/downloadMarkdownFile"
import { useNovelGuidePlayAll } from "@/composables/useNovelGuidePlayAll"
import type { NovelGuideSection } from "@/utils/novelGuideSections"
import { markdownFragmentToChatHtml } from "@/utils/chatMarkdownPipeline"
import { buildExploreProjectShareUrl } from "@/utils/feedOpen"
import {
  buildYoutubeSeekUrl,
  formatOutlineTranscriptMarkdown,
  splitOutlineSpeakerTurns,
  type OutlineResult,
} from "@/utils/outlineStream"

const props = withDefaults(
  defineProps<{
    result: OutlineResult
    projectId?: string
    streaming?: boolean
  }>(),
  {
    projectId: "",
    streaming: false,
  },
)

defineEmits<{ close: [] }>()

const { t } = useI18n()
const activeSectionIndex = ref<number | null>(null)
const exportMenuOpen = ref(false)
const exportMenuRef = ref<HTMLElement | null>(null)

const activeSection = computed(() => {
  const sections = props.result.sections
  if (!sections.length) return null
  const index = activeSectionIndex.value ?? sections[0]?.index ?? null
  return sections.find((section) => section.index === index) ?? sections[0] ?? null
})

const activeAudioSectionIndex = computed(() =>
  Math.max(
    props.result.sections.findIndex((section) => section.index === activeSection.value?.index),
    0,
  ),
)

const audioSections = computed<NovelGuideSection[]>(() =>
  props.result.sections.map((section) => ({
    id: `outline-${section.index}`,
    kind: "generic",
    label: section.heading || section.title || `Section ${section.index}`,
    markdown: formatOutlineTranscriptMarkdown(section.text),
  })),
)

const {
  ttsLoading,
  ttsPlayAllActive,
  canPlayGuideAudio,
  playAllButtonTitle,
  togglePlayAll,
  stopPlayback,
} = useNovelGuidePlayAll({
  projectId: () => props.projectId,
  sections: () => audioSections.value,
  activeSectionIndex: () => activeAudioSectionIndex.value,
  onActiveSectionIndexChange: (index) => {
    const section = props.result.sections[index]
    if (section) activeSectionIndex.value = section.index
  },
})

const playAllButtonLabel = computed(() => {
  if (ttsLoading.value) return playAllButtonTitle.value
  return ttsPlayAllActive.value
    ? t("community.playAllStop")
    : t("community.playAll")
})

const metaLine = computed(() => {
  const parts: string[] = []
  if (props.result.sectionCount != null) {
    parts.push(t("workspace.outlineResultSections", { n: props.result.sectionCount }))
  }
  if (props.result.channelName) parts.push(props.result.channelName)
  return parts.join(" · ")
})

const seekUrl = computed(() => {
  if (!props.result.youtubeUrl || !activeSection.value?.start_seconds) return ""
  return buildYoutubeSeekUrl(props.result.youtubeUrl, activeSection.value.start_seconds)
})

const activeSectionTurns = computed(() =>
  splitOutlineSpeakerTurns(activeSection.value?.text || ""),
)

const fullMarkdownTurns = computed(() => {
  const markdown = props.result.markdown || ""
  const turns = splitOutlineSpeakerTurns(markdown)
  return turns.length ? turns : markdown ? [markdown] : []
})

const exportableMarkdown = computed(() => {
  if (!props.result.sections.length) return props.result.markdown?.trim() || ""

  const parts: string[] = []
  const title = props.result.title?.trim()
  if (title) parts.push(`# ${title}`, "")

  const metadata = [
    props.result.channelName ? `Channel: ${props.result.channelName}` : "",
    props.result.youtubeUrl ? `Source: ${props.result.youtubeUrl}` : "",
  ].filter(Boolean)
  if (metadata.length) parts.push(`> ${metadata.join(" | ")}`, "")

  for (const section of props.result.sections) {
    parts.push(
      `## ${section.heading || section.title || `Section ${section.index}`}`,
      "",
      formatOutlineTranscriptMarkdown(section.text),
      "",
    )
  }
  return parts.join("\n").trim()
})

function selectSection(index: number) {
  activeSectionIndex.value = index
  stopPlayback()
}

watch(
  () => props.result.sections,
  (sections) => {
    if (!sections.length) {
      activeSectionIndex.value = null
      return
    }
    if (
      activeSectionIndex.value == null ||
      !sections.some((section) => section.index === activeSectionIndex.value)
    ) {
      activeSectionIndex.value = sections[0]?.index ?? null
    }
  },
  { immediate: true, deep: true },
)

function exportMarkdown() {
  const markdown = exportableMarkdown.value
  if (!markdown) return
  const basename = sanitizeDownloadBasename(
    props.result.title || t("workspace.outlineResultTitle"),
  )
  downloadMarkdownFile(basename, markdown)
  exportMenuOpen.value = false
  ElMessage.success(t("workspace.outlineExportMarkdownSuccess"))
}

async function copyShareLink() {
  const projectId = String(props.projectId || "").trim()
  if (!projectId) {
    ElMessage.warning(t("agent.pptShareNoProject"))
    return
  }
  try {
    await navigator.clipboard.writeText(buildExploreProjectShareUrl(projectId))
    exportMenuOpen.value = false
    ElMessage.success(t("agent.pptShareLinkCopied"))
  } catch {
    ElMessage.error(t("agent.pptShareCopyFailed"))
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function exportPdf() {
  const markdown = exportableMarkdown.value
  if (!markdown) return

  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    ElMessage.error(t("workspace.outlineExportPdfPopupBlocked"))
    return
  }
  printWindow.opener = null

  const title = props.result.title || t("workspace.outlineResultTitle")
  const content = markdownFragmentToChatHtml(markdown)
  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      max-width: 820px;
      color: #172033;
      font-family: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.75;
    }
    h1 { margin: 0 0 20px; font-size: 24pt; line-height: 1.3; }
    h2 {
      margin: 28px 0 12px;
      break-after: avoid;
      color: #111827;
      font-size: 16pt;
      line-height: 1.4;
    }
    p { margin: 0 0 12px; orphans: 3; widows: 3; }
    strong { color: #6d28d9; }
    blockquote {
      margin: 0 0 24px;
      padding: 8px 14px;
      border-left: 3px solid #8b5cf6;
      color: #64748b;
      background: #f8fafc;
    }
    a { color: #2563eb; word-break: break-all; }
    @media print { body { max-width: none; } }
  </style>
</head>
<body>${content}</body>
</html>`)
  printWindow.document.close()
  exportMenuOpen.value = false
  window.setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (
    exportMenuOpen.value &&
    exportMenuRef.value &&
    !exportMenuRef.value.contains(event.target as Node)
  ) {
    exportMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown)
})
</script>

<style scoped>
.outline-markdown :deep(.markdown-body) {
  font-size: 0.95rem;
  line-height: 1.75;
}

:deep(.outline-section-markdown .markdown-body) {
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  line-height: 1.75rem;
}

:deep(.outline-section-markdown .markdown-body p) {
  margin: 0 0 1rem;
}

:deep(.outline-section-markdown .markdown-body p:last-child) {
  margin-bottom: 0;
}

:deep(.outline-section-markdown .markdown-body strong) {
  color: hsl(var(--primary));
  font-weight: 700;
  font-size: 1.15em;
}

.outline-speaker-turn {
  display: block;
}

.outline-speaker-turn + .outline-speaker-turn {
  margin-top: 1rem;
}

.outline-speaker-turn :deep(.markdown-body),
.outline-speaker-turn :deep(.markdown-body p) {
  display: block;
}
</style>
