<template>
  <div class="workspace-novel-result overflow-hidden rounded-2xl border border-border bg-card">
    <header class="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-primary">{{ t("workspace.novelResultBadge") }}</p>
        <h2 class="mt-1 break-words text-lg font-semibold text-foreground">
          {{ result.title || t("workspace.novelResultTitle") }}
        </h2>
        <p v-if="statsLine" class="mt-1 text-sm text-muted-foreground">{{ statsLine }}</p>
        <p v-if="result.message" class="mt-1 text-sm text-muted-foreground">{{ result.message }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        @click="emit('close')"
      >
        {{ t("workspace.novelResultClose") }}
      </button>
    </header>

    <div
      v-if="outline.sections.length"
      class="flex min-h-[min(72vh,880px)] flex-col md:flex-row"
    >
      <nav
        class="max-h-56 shrink-0 overflow-y-auto border-border bg-secondary/20 md:max-h-none md:w-64 md:border-b-0 md:border-r"
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
          @click="activeSectionId = section.id"
        >
          {{ section.label }}
        </button>
      </nav>

      <article
        class="min-w-0 flex-1 overflow-y-auto bg-card px-4 py-5 sm:px-6 sm:py-7"
        :style="contentFontStyle"
      >
        <h1 v-if="activeSection" class="mb-5 text-xl font-semibold leading-tight text-foreground sm:text-2xl">
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
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import { buildFontFamilyCss, ensureExportFontsReady } from "@/composables/useFontLoader"
import { buildNovelGuideOutline } from "@/utils/novelGuideSections"
import type { NovelResult } from "@/utils/novelStream"

const props = defineProps<{ result: NovelResult }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const NOVEL_SERIF_FONT = buildFontFamilyCss("SimSun, Songti SC, STSong")

const activeSectionId = ref("")

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

const contentFontStyle = computed(() => ({
  fontFamily: NOVEL_SERIF_FONT,
}))

function navItemClass(sectionId: string) {
  return sectionId === activeSectionId.value
    ? "bg-primary font-medium text-primary-foreground"
    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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

onMounted(() => {
  void ensureExportFontsReady("SimSun")
})
</script>

<style scoped>
:deep(.novel-guide-markdown.markdown-body) {
  color: inherit;
  font-size: 1rem;
  line-height: 1.75;
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
  font-size: 1.2rem;
}

:deep(.novel-guide-markdown.markdown-body h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1.05rem;
}

:deep(.novel-guide-markdown.markdown-body p),
:deep(.novel-guide-markdown.markdown-body li) {
  font-family: inherit;
}

:deep(.novel-guide-markdown.markdown-body strong) {
  color: inherit;
  font-weight: 700;
}

:deep(.novel-guide-markdown.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0 1rem;
  font-size: 0.9375rem;
}

:deep(.novel-guide-markdown.markdown-body th),
:deep(.novel-guide-markdown.markdown-body td) {
  @apply border border-border px-2.5 py-2 text-left;
}

:deep(.novel-guide-markdown.markdown-body th) {
  @apply bg-secondary text-foreground;
}
</style>
