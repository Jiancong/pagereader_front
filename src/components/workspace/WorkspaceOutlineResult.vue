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
        <button
          type="button"
          class="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          :disabled="!result.markdown"
          @click="exportMarkdown"
        >
          {{ t("workspace.outlineExportMarkdown") }}
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
            @click="activeSectionIndex = section.index"
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
          <div class="rounded-xl border border-border bg-secondary/20 p-4">
            <p class="whitespace-pre-wrap text-sm leading-7 text-foreground">{{ activeSection.text }}</p>
          </div>
        </div>
        <div v-else-if="result.markdown" class="outline-markdown">
          <ChatMarkdownBody :markdown="result.markdown" />
        </div>
      </section>
    </div>

    <div v-else-if="result.markdown" class="p-4 sm:p-6">
      <ChatMarkdownBody :markdown="result.markdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import { downloadMarkdownFile, sanitizeDownloadBasename } from "@/utils/downloadMarkdownFile"
import {
  buildYoutubeSeekUrl,
  type OutlineResult,
} from "@/utils/outlineStream"

const props = withDefaults(
  defineProps<{
    result: OutlineResult
    streaming?: boolean
  }>(),
  {
    streaming: false,
  },
)

defineEmits<{ close: [] }>()

const { t } = useI18n()
const activeSectionIndex = ref<number | null>(null)

const activeSection = computed(() => {
  const sections = props.result.sections
  if (!sections.length) return null
  const index = activeSectionIndex.value ?? sections[0]?.index ?? null
  return sections.find((section) => section.index === index) ?? sections[0] ?? null
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
  const markdown = props.result.markdown?.trim()
  if (!markdown) return
  const basename = sanitizeDownloadBasename(
    props.result.title || t("workspace.outlineResultTitle"),
  )
  downloadMarkdownFile(basename, markdown)
  ElMessage.success(t("workspace.outlineExportMarkdownSuccess"))
}
</script>

<style scoped>
.outline-markdown :deep(.markdown-body) {
  font-size: 0.95rem;
  line-height: 1.75;
}
</style>
