<template>
  <div class="mermaid-block-root">
    <div ref="hostRef" class="mermaid-block-svg-host" />
    <pre v-if="errorText" class="mermaid-block-error">{{ errorText }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import { ensureMermaidInitialized } from "@/utils/mermaidClient";

const props = defineProps<{
  /** Mermaid 源码（不含 ```mermaid 围栏） */
  code: string;
}>();

const hostRef = ref<HTMLElement | null>(null);
const errorText = ref<string | null>(null);

async function draw() {
  errorText.value = null;
  const el = hostRef.value;
  if (!el) return;
  const code = (props.code || "").trim();
  if (!code) {
    el.innerHTML = "";
    return;
  }
  try {
    await ensureMermaidInitialized();
    const { default: mermaid } = await import("mermaid");
    const id = `mmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const { svg } = await mermaid.render(id, code);
    el.innerHTML = svg;
  } catch (e: unknown) {
    el.innerHTML = "";
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

watch(() => props.code, () => nextTick(draw));
onMounted(() => nextTick(draw));
</script>

<style scoped lang="scss">
.mermaid-block-root {
  width: 100%;
  overflow-x: auto;
}

.mermaid-block-svg-host {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 40px;
}

.mermaid-block-svg-host :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-block-error {
  margin: 8px 0 0;
  padding: 8px 10px;
  font-size: 12px;
  color: #f87171;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
