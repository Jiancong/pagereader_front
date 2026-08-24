<template>
  <div class="epub-reader" ref="rootRef">
    <div class="epub-reader__stage">
      <div ref="viewerRef" class="epub-reader__viewer"></div>
      <div v-if="loading" class="epub-reader__overlay">{{ t('reader.loading') }}</div>
      <div v-else-if="loadError" class="epub-reader__overlay epub-reader__overlay--error">
        {{ loadError }}
      </div>
    </div>

    <div
      class="epub-reader__nav"
      :class="{ 'epub-reader__nav--hidden': loading || Boolean(loadError) }"
      :aria-hidden="loading || Boolean(loadError)"
    >
      <button class="er-btn" :disabled="atStart" @click="prev">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        {{ t('reader.prev') }}
      </button>
      <div class="epub-reader__progress">
        <div class="epub-reader__progress-bar">
          <div class="epub-reader__progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="epub-reader__progress-text">{{ progress }}%</span>
      </div>
      <button class="er-btn" :disabled="atEnd" @click="next">
        {{ t('reader.next') }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import ePub, { type Book, type Rendition } from 'epubjs'

const props = defineProps<{
  file: File
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const viewerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const progress = ref(0)
const atStart = ref(true)
const atEnd = ref(false)

let book: Book | null = null
let rendition: Rendition | null = null
let resizeObserver: ResizeObserver | null = null
let originalAddEventListener: typeof window.addEventListener | null = null
let renderedWidth = 0
let renderedHeight = 0

/**
 * epubjs 在 default manager 中调用 window.addEventListener("unload", ...) 注册卸载清理。
 * Chrome 已禁止 unload 事件并抛出 Permissions policy violation。
 * 这里在 renderTo 之前临时拦截 addEventListener，把 "unload" 重定向为 "pagehide"
 * （现代等价事件，不受 Permissions Policy 限制），renderTo 完成后恢复。
 */
function installUnloadShim() {
  originalAddEventListener = window.addEventListener.bind(window)
  window.addEventListener = ((type: any, listener?: any, options?: any) => {
    if (type === 'unload') type = 'pagehide'
    return originalAddEventListener!(type, listener, options)
  }) as typeof window.addEventListener
}
function uninstallUnloadShim() {
  if (originalAddEventListener) {
    window.addEventListener = originalAddEventListener
    originalAddEventListener = null
  }
}

onMounted(async () => {
  try {
    // blob: URL 没有 .epub 扩展名，epubjs 无法据此识别格式；
    // 直接传 ArrayBuffer，epubjs 会按二进制 EPUB 打开。
    const data = await props.file.arrayBuffer()
    book = ePub(data)
    await book.ready

    // epubjs 分页模式需要明确像素尺寸，百分比会导致空白页。
    const rect = viewerRef.value!.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    renderedWidth = w
    renderedHeight = h

    installUnloadShim()
    rendition = book.renderTo(viewerRef.value!, {
      width: w,
      height: h,
      flow: 'paginated',
      spread: 'none',
      allowScriptedContent: false,
    })

    rendition.on('relocated', (location: any) => {
      atStart.value = location.atStart ?? false
      atEnd.value = location.atEnd ?? false
      if (book && book.locations.length() > 0 && location?.start?.cfi) {
        const pct = book.locations.percentageFromCfi(location.start.cfi) * 100
        progress.value = Math.max(0, Math.min(100, Math.round(pct)))
      }
    })

    rendition.on('rendered', () => {
      if (book && book.locations.length() === 0) {
        void book.locations.generate(1024).then(() => {
          if (rendition) {
            const loc = rendition.currentLocation() as any
            if (loc?.start?.cfi && book.locations.length() > 0) {
              const pct = book.locations.percentageFromCfi(loc.start.cfi) * 100
              progress.value = Math.max(0, Math.min(100, Math.round(pct)))
            }
          }
        })
      }
    })

    await rendition.display()
    loading.value = false
    await nextTick()
    uninstallUnloadShim()

    resizeObserver = new ResizeObserver(() => {
      if (rendition && viewerRef.value) {
        const rect = viewerRef.value.getBoundingClientRect()
        const width = Math.max(1, Math.floor(rect.width))
        const height = Math.max(1, Math.floor(rect.height))
        // ResizeObserver always fires once after observe(). epubjs resize() clears
        // all views first; before its initial location is reported, it cannot
        // restore the cleared chapter and leaves an empty epub-container.
        if (width === renderedWidth && height === renderedHeight) return
        renderedWidth = width
        renderedHeight = height
        rendition.resize(width, height)
      }
    })
    resizeObserver.observe(viewerRef.value!)
  } catch (e) {
    uninstallUnloadShim()
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  uninstallUnloadShim()
  resizeObserver?.disconnect()
  rendition?.destroy()
  book?.destroy()
})

function next() {
  rendition?.next()
}
function prev() {
  rendition?.prev()
}
</script>

<style scoped>
.epub-reader {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #f3f4f6;
}
.epub-reader__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.epub-reader__viewer {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 900px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.epub-reader__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 14px;
}
.epub-reader__overlay--error {
  color: #dc2626;
}
.epub-reader__nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  flex-shrink: 0;
}
.epub-reader__nav--hidden {
  visibility: hidden;
  pointer-events: none;
}
.epub-reader__progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.epub-reader__progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #374151;
  overflow: hidden;
}
.epub-reader__progress-fill {
  height: 100%;
  background: #6366f1;
  transition: width 0.2s;
}
.epub-reader__progress-text {
  min-width: 42px;
  text-align: right;
  font-size: 12px;
  color: #d1d5db;
}
.er-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.er-btn:hover:not(:disabled) {
  background: #1f2937;
}
.er-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
