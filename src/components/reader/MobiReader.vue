<template>
  <div class="mobi-reader" :class="{ 'mobi-reader--night': colorTheme === 'dark' }">
    <div class="mobi-reader__zoom-wrap" :style="{ zoom: scale }">
      <div ref="containerRef" class="mobi-reader__container"></div>
      <div v-if="coReadInline" ref="overlayRef" class="mobi-reader__co-read-overlay"></div>
    </div>
    <div v-if="loading" class="mobi-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="mobi-reader__overlay mobi-reader__overlay--error">
      {{ loadError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import type { ReaderColorTheme } from '@/composables/useReaderColorTheme'
import { applyReaderDocColorTheme } from '@/utils/readerNightDocStyle'
import { useI18n } from 'vue-i18n'
import 'foliate-js/view.js'
import type { CoReadAnnotation } from '@/types/coReading'
import {
  pageTextFromBody,
  pageTextFromVisiblePage,
  syncCoReadOverlayAnnotations,
  type CoReadInlineLabels,
  type CoReadInlineStatus,
} from '@/utils/coReadInlineAnnotations'

const props = withDefaults(
  defineProps<{
    file: File
    scale?: number
    colorTheme?: ReaderColorTheme
    coReadInline?: {
      annotations: CoReadAnnotation[]
      labels: CoReadInlineLabels
      status?: CoReadInlineStatus
    } | null
  }>(),
  { colorTheme: 'light', coReadInline: null },
)

const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
  'page-ready': []
  zoom: [delta: number]
  'co-read-draft': [annotationId: string, text: string]
  'co-read-save': [annotationId: string, text: string]
  'co-read-delete': [annotationId: string]
  'co-read-chat': [annotationId: string, text: string]
}>()

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

let view: any = null
let pageTotal = 0
let atEnd = false

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

function syncDocTheme(doc: Document) {
  applyReaderDocColorTheme(doc, props.colorTheme === 'dark' ? 'dark' : 'light')
}

function activeDoc(): Document | null {
  try {
    return (view?.renderer?.getContents?.()?.doc as Document | undefined) ?? null
  } catch {
    return null
  }
}

function applyCoReadInline() {
  const overlay = overlayRef.value
  const doc = activeDoc()
  if (!props.coReadInline?.labels || !overlay || !doc?.body) return
  syncCoReadOverlayAnnotations({
    body: doc.body,
    host: overlay,
    annotations: props.coReadInline.annotations,
    labels: props.coReadInline.labels,
    dark: props.colorTheme === 'dark',
    status: props.coReadInline.status,
    onDraft: (id, text) => emit('co-read-draft', id, text),
    onSaveReply: (id, text) => emit('co-read-save', id, text),
    onDeleteReply: (id) => emit('co-read-delete', id),
    onChatAbout: (id, text) => emit('co-read-chat', id, text),
  })
}

function onLoad(e: Event) {
  const doc = (e as CustomEvent).detail?.doc
  if (doc) {
    attachToDoc(doc)
    syncDocTheme(doc)
    applyCoReadInline()
  }
  emit('page-ready')
}

// 仅在批注定位结构变化时重建；流式内容/线程消息走原地 patch，避免移动端重建循环
function coReadSignature(): string {
  const p = props.coReadInline
  if (!p) return ""
  const parts = p.annotations.map(
    (a) => `${a.id}|${a.kind}|${a.anchor?.paragraphIndex ?? 0}|${a.anchor?.quote ?? ""}`,
  )
  const s = p.status
  parts.push(`status:${s?.loading ? 1 : 0}|${s?.errorCode ?? ""}|${s?.emptyHint ? 1 : 0}`)
  return parts.join("~")
}

watch(coReadSignature, () => applyCoReadInline(), { flush: 'post' })

// 流式批注正文 / 卡片内对话线程：原地更新
watch(
  () => {
    const p = props.coReadInline
    if (!p) return ""
    let n = 0
    for (const a of p.annotations) n += (a.content || "").length
    return `${n}|${p.status?.intro?.length ?? 0}`
  },
  () => {
    const overlay = overlayRef.value
    const p = props.coReadInline
    if (!overlay || !p) return
    // 批注正文原地更新
    for (const a of p.annotations) {
      const hostEl = overlay.querySelector(`[data-co-read-inline-root="${a.id}"]`)
      if (!hostEl) continue
      const bodyEl = hostEl.querySelector(".co-read-pop__body")
      if (bodyEl && bodyEl.textContent !== (a.content || "")) {
        bodyEl.textContent = a.content || ""
      }
    }
  },
  { flush: 'post' },
)

watch(
  () => props.colorTheme,
  () => {
    for (const doc of trackedDocs) syncDocTheme(doc)
    try {
      const doc: Document | undefined = view?.renderer?.getContents?.()?.doc
      if (doc) syncDocTheme(doc)
    } catch {
      /* ignore */
    }
  },
)

function onRelocate(e: Event) {
  const detail = (e as CustomEvent).detail
  const location = detail?.location
  if (!location || location.total <= 0) return
  pageTotal = location.total
  const page = location.current + 1
  atEnd = page >= location.total
  emit('page-change', page)
  emit('page-count', location.total)
  applyCoReadInline()
  emit('page-ready')
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

function getPageText(): string {
  const doc = activeDoc()
  if (!doc?.body) return ''
  // 与 EpubReader 一致：按当前可见屏取词，若过渡帧为空则回退段落文本
  const overlay = overlayRef.value
  if (overlay) {
    try {
      const visible = pageTextFromVisiblePage(doc.body, overlay)
      if (visible && visible.trim()) return visible
    } catch {
      /* ignore */
    }
  }
  const structured = pageTextFromBody(doc.body)
  if (structured) return structured
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

defineExpose({ next, prev, goToPage, getPageText, isAtEnd: () => atEnd })
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
  position: relative;
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
.mobi-reader__co-read-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
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

.mobi-reader--night {
  background: #0a0a0a;
}
.mobi-reader--night .mobi-reader__overlay {
  background: #0a0a0a;
  color: #9ca3af;
}

@media (max-width: 767px) {
  .mobi-reader {
    padding: 0;
  }
  .mobi-reader__zoom-wrap {
    width: 100%;
  }
  .mobi-reader__container {
    width: 100%;
  }
}
</style>
