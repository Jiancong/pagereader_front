<template>
  <div class="workspace-novel-result rounded-2xl border border-border bg-card">
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

    <div class="p-4 sm:p-6">
      <ChatMarkdownBody :content="result.markdown" root-class="workspace-novel-result-markdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import type { NovelResult } from "@/utils/novelStream"

const props = defineProps<{ result: NovelResult }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

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
</script>

<style scoped>
:deep(.workspace-novel-result-markdown.markdown-body) {
  font-size: 0.9375rem;
  line-height: 1.65;
}

:deep(.workspace-novel-result-markdown.markdown-body h2) {
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  font-size: 1.125rem;
  font-weight: 700;
}

:deep(.workspace-novel-result-markdown.markdown-body h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

:deep(.workspace-novel-result-markdown.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0 1rem;
  font-size: 0.875rem;
}

:deep(.workspace-novel-result-markdown.markdown-body th),
:deep(.workspace-novel-result-markdown.markdown-body td) {
  border: 1px solid hsl(var(--border, 220 13% 22%));
  padding: 0.5rem 0.65rem;
  text-align: left;
}
</style>
