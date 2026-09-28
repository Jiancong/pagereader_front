<template>
  <div class="markdown-reader">
    <div v-if="loading" class="markdown-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="markdown-reader__overlay markdown-reader__overlay--error">
      {{ loadError }}
    </div>
    <div
      v-else
      ref="scrollRef"
      class="markdown-reader__scroll"
      :style="{ zoom: scale ?? 1 }"
    >
      <article ref="articleRef" class="markdown-reader__article" v-html="renderedHtml"></article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

const props = defineProps<{ file: File; scale?: number }>()
const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
}>()

const { t } = useI18n()

const loading = ref(true)
const loadError = ref('')
const renderedHtml = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const articleRef = ref<HTMLElement | null>(null)

marked.setOptions({
  gfm: true,
  breaks: true,
})

function getPageText(): string {
  return articleRef.value?.innerText ?? ''
}

function isAtEnd(): boolean {
  return true
}

function next() {}
function prev() {}
function goToPage(_page: number) {}

defineExpose({ next, prev, goToPage, getPageText, isAtEnd })

onMounted(async () => {
  try {
    const text = await props.file.text()
    renderedHtml.value = marked.parse(text) as string
    loading.value = false
    emit('page-count', 1)
    emit('page-change', 1)
    await nextTick()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})
</script>

<style scoped>
.markdown-reader {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: #f3f4f6;
}
.markdown-reader__overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  background: #f3f4f6;
}
.markdown-reader__overlay--error {
  color: #dc2626;
}
.markdown-reader__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px;
}
.markdown-reader__article {
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  color: #1f2937;
  font-size: 16px;
  line-height: 1.7;
  word-break: break-word;
}
.markdown-reader__article :deep(h1),
.markdown-reader__article :deep(h2),
.markdown-reader__article :deep(h3),
.markdown-reader__article :deep(h4),
.markdown-reader__article :deep(h5),
.markdown-reader__article :deep(h6) {
  margin: 1.4em 0 0.6em;
  font-weight: 600;
  line-height: 1.3;
}
.markdown-reader__article :deep(h1) { font-size: 1.8em; }
.markdown-reader__article :deep(h2) { font-size: 1.5em; }
.markdown-reader__article :deep(h3) { font-size: 1.25em; }
.markdown-reader__article :deep(h4) { font-size: 1.1em; }
.markdown-reader__article :deep(p) {
  margin: 0.6em 0;
}
.markdown-reader__article :deep(a) {
  color: #4338ca;
  text-decoration: underline;
}
.markdown-reader__article :deep(ul),
.markdown-reader__article :deep(ol) {
  margin: 0.6em 0;
  padding-left: 1.6em;
}
.markdown-reader__article :deep(li) {
  margin: 0.2em 0;
}
.markdown-reader__article :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0.4em 1em;
  border-left: 4px solid #c7d2fe;
  background: #f5f7ff;
  color: #4b5563;
}
.markdown-reader__article :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: #f3f4f6;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
}
.markdown-reader__article :deep(pre) {
  margin: 0.8em 0;
  padding: 14px 16px;
  border-radius: 8px;
  background: #1f2937;
  color: #f9fafb;
  overflow-x: auto;
}
.markdown-reader__article :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 0.9em;
  line-height: 1.5;
}
.markdown-reader__article :deep(table) {
  width: 100%;
  margin: 0.8em 0;
  border-collapse: collapse;
  font-size: 0.95em;
}
.markdown-reader__article :deep(th),
.markdown-reader__article :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  text-align: left;
}
.markdown-reader__article :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}
.markdown-reader__article :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}
.markdown-reader__article :deep(hr) {
  margin: 1.4em 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>
