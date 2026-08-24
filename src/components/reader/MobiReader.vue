<template>
  <div class="mobi-reader">
    <div ref="containerRef" class="mobi-reader__container"></div>
    <div v-if="loading" class="mobi-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="mobi-reader__overlay mobi-reader__overlay--error">
      {{ loadError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import 'foliate-js/view.js'

const props = defineProps<{
  file: File
}>()

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

let view: any = null

// foliate-view renders each section inside an iframe. Keyboard / mouse events
// happening inside those iframes never bubble to the parent window, so the
// navigation handlers registered on `window` in ReaderView don't fire while
// the reader content has focus. We attach our own listeners to each loaded
// iframe document via the view's 'load' event and clean them up on unload.
const trackedDocs = new Set<Document>()

function onDocKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prev()
  }
}
function onDocContextMenu(e: MouseEvent) {
  e.preventDefault()
  next()
}

function attachToDoc(doc: Document) {
  if (trackedDocs.has(doc)) return
  trackedDocs.add(doc)
  doc.addEventListener('keydown', onDocKeyDown, true)
  doc.addEventListener('contextmenu', onDocContextMenu, true)
}
function detachFromDoc(doc: Document) {
  if (!trackedDocs.has(doc)) return
  trackedDocs.delete(doc)
  doc.removeEventListener('keydown', onDocKeyDown, true)
  doc.removeEventListener('contextmenu', onDocContextMenu, true)
}

function onLoad(e: Event) {
  const doc = (e as CustomEvent).detail?.doc
  if (doc) attachToDoc(doc)
}

onMounted(async () => {
  try {
    await nextTick()
    view = document.createElement('foliate-view')
    containerRef.value?.appendChild(view)

    view.addEventListener('load', onLoad)

    await view.open(props.file)
    // `open()` only sets up the book + renderer; it does not display any
    // content. We must explicitly navigate to render the first page.
    await view.next()
    loading.value = false
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (view) {
    view.removeEventListener('load', onLoad)
    for (const doc of trackedDocs) detachFromDoc(doc)
    trackedDocs.clear()
    view.close?.()
    view.remove()
    view = null
  }
})

function next() {
  view?.goRight()
}
function prev() {
  view?.goLeft()
}

defineExpose({ next, prev })
</script>

<style scoped>
.mobi-reader {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  background: #f3f4f6;
}
.mobi-reader__container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.mobi-reader__container :deep(foliate-view) {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}
.mobi-reader__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  background: #f3f4f6;
  pointer-events: none;
}
.mobi-reader__overlay--error {
  color: #dc2626;
}
</style>
