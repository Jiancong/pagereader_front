<template>
  <div class="mobi-reader">
    <div class="mobi-reader__zoom-wrap" :style="{ zoom: scale }">
      <div ref="containerRef" class="mobi-reader__container"></div>
    </div>
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
  scale?: number
}>()

const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
  zoom: [delta: number]
}>()

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

let view: any = null
let pageTotal = 0

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
function onDocWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  emit('zoom', e.deltaY > 0 ? -0.1 : 0.1)
}

function attachToDoc(doc: Document) {
  if (trackedDocs.has(doc)) return
  trackedDocs.add(doc)
  doc.addEventListener('keydown', onDocKeyDown, true)
  doc.addEventListener('contextmenu', onDocContextMenu, true)
  doc.addEventListener('wheel', onDocWheel, { capture: true, passive: false })
}
function detachFromDoc(doc: Document) {
  if (!trackedDocs.has(doc)) return
  trackedDocs.delete(doc)
  doc.removeEventListener('keydown', onDocKeyDown, true)
  doc.removeEventListener('contextmenu', onDocContextMenu, true)
  doc.removeEventListener('wheel', onDocWheel, true)
}

function onLoad(e: Event) {
  const doc = (e as CustomEvent).detail?.doc
  if (doc) attachToDoc(doc)
}

function onRelocate(e: Event) {
  const detail = (e as CustomEvent).detail
  const location = detail?.location
  if (!location || location.total <= 0) return
  pageTotal = location.total
  const page = location.current + 1
  emit('page-change', page)
  emit('page-count', location.total)
}

onMounted(async () => {
  try {
    await nextTick()
    view = document.createElement('foliate-view')
    containerRef.value?.appendChild(view)

    view.addEventListener('load', onLoad)
    view.addEventListener('relocate', onRelocate)

    await view.open(props.file)
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
    view.removeEventListener('relocate', onRelocate)
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
function goToPage(page: number) {
  if (!view || !pageTotal) return
  const target = Math.min(Math.max(Math.trunc(page), 1), pageTotal)
  const fraction = (target - 1) / pageTotal
  void view.goToFraction(fraction)
}

defineExpose({ next, prev, goToPage })
</script>

<style scoped>
.mobi-reader {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  background: #f3f4f6;
  overflow: auto;
}
.mobi-reader__zoom-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
  transform-origin: top center;
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
