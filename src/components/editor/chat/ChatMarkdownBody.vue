<template>
  <div class="chat-markdown-body" :class="rootClass">
    <template v-for="(seg, i) in segments" :key="i">
      <div
        v-if="seg.type === 'markdown'"
        class="chat-md-segment markdown-body"
        v-html="htmlForMarkdown(seg.text)"
      />
      <div v-else-if="seg.type === 'mermaid'" class="chat-mermaid-segment">
        <MermaidBlock :code="seg.code" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import "katex/dist/katex.min.css";
import MermaidBlock from "./MermaidBlock.vue";
import {
  markdownFragmentToChatHtml,
  normalizeChatMessageContent,
} from "@/utils/chatMarkdownPipeline";
import { splitMarkdownWithMermaid } from "@/utils/splitMarkdownMermaid";

const props = withDefaults(
  defineProps<{
    content: unknown;
    rootClass?: string;
  }>(),
  { rootClass: "" }
);

const segments = computed(() => {
  const raw = normalizeChatMessageContent(props.content);
  return splitMarkdownWithMermaid(raw);
});

function htmlForMarkdown(text: string): string {
  if (!text || !String(text).trim()) return "";
  return markdownFragmentToChatHtml(text);
}
</script>

<style scoped lang="scss">
.chat-mermaid-segment {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.chat-md-math) {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}

:deep(.chat-md-math--display) {
  display: block;
  margin: 12px 0;
  overflow-x: auto;
  text-align: center;
}

:deep(.chat-md-math .katex) {
  font-size: 1.05em;
}

:deep(.chat-md-math--display .katex) {
  font-size: 1.12em;
}
</style>
