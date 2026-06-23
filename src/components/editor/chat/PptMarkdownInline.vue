<script setup lang="ts">
import { computed } from "vue";
import "katex/dist/katex.min.css";
import {
  formatPptInlineMarkdown,
  formatPptTableCellMarkdown,
  type PptPageReference,
} from "@/utils/pptInlineMarkdown";

const props = withDefaults(
  defineProps<{
    text?: string;
    editable?: boolean;
    pageReferences?: PptPageReference[];
  }>(),
  {
    text: "",
    editable: false,
    pageReferences: () => [],
  }
);

const emit = defineEmits<{
  (e: "blur", ev: FocusEvent): void;
  (e: "ref-click", refId: string): void;
}>();

defineOptions({ inheritAttrs: false });

const renderedHtml = computed(() => {
  const text = props.text ?? "";
  if ((props.pageReferences?.length ?? 0) > 0) {
    return formatPptTableCellMarkdown(text, props.pageReferences);
  }
  return formatPptInlineMarkdown(text);
});

function onBlur(ev: FocusEvent) {
  if (props.editable) emit("blur", ev);
}

function onClick(ev: MouseEvent) {
  const target = ev.target as HTMLElement | null;
  const link = target?.closest?.("[data-ppt-ref-id]") as HTMLElement | null;
  if (!link) return;
  ev.preventDefault();
  const refId = link.getAttribute("data-ppt-ref-id");
  if (refId) emit("ref-click", refId);
}
</script>

<template>
  <span
    class="ppt-md-inline"
    v-bind="$attrs"
    :contenteditable="editable || undefined"
    v-html="renderedHtml"
    @blur="onBlur"
    @click="onClick"
  />
</template>

<style scoped lang="scss">
.ppt-md-inline :deep(.ppt-table-ref) {
  color: var(--ppt-accent, #4a90e2);
  text-decoration: none;
  cursor: pointer;
  font-size: 0.85em;
  vertical-align: super;
  line-height: 0;
  margin-left: 1px;

  &:hover {
    text-decoration: underline;
  }
}

.ppt-md-inline :deep(.ppt-table-ref + .ppt-table-ref) {
  margin-left: 2px;
}

.ppt-md-inline :deep(.ppt-table-ref--muted) {
  cursor: default;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));

  &:hover {
    text-decoration: none;
  }
}

.ppt-md-inline :deep(.ppt-inline-math) {
  display: inline-block;
  max-width: 100%;
  margin: 0 0.05em;
  vertical-align: middle;
  overflow-x: auto;
}

.ppt-md-inline :deep(.ppt-inline-math--display) {
  display: block;
  margin: 0.35em 0;
  overflow-x: auto;
}

.ppt-md-inline :deep(.katex) {
  font-size: 1em;
}
</style>
