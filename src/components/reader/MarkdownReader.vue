<template>
  <div
    class="markdown-reader"
    :class="{ 'markdown-reader--night': colorTheme === 'dark' }"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <div v-if="loading" class="markdown-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="markdown-reader__overlay markdown-reader__overlay--error">
      {{ loadError }}
    </div>
    <div
      v-else
      ref="scrollRef"
      class="markdown-reader__scroll"
      :style="{ zoom: scale ?? 1 }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchEnd"
    >
      <div class="markdown-reader__shell">
        <article
          ref="articleRef"
          class="markdown-reader__article"
          v-html="currentPageHtml"
        ></article>
      </div>
    </div>

    <div
      v-if="!loading && !loadError && pageTotal > 1"
      class="markdown-reader__nav"
    >
      <button class="mr-btn" :disabled="currentPage <= 1" @click="prev">
        ‹ {{ t('reader.prev') }}
      </button>
      <span class="markdown-reader__page">{{ currentPage }} / {{ pageTotal }}</span>
      <button class="mr-btn" :disabled="currentPage >= pageTotal" @click="next">
        {{ t('reader.next') }} ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { CoReadAnnotation } from '@/types/coReading'
import {
  pageTextFromBody,
  syncCoReadInlineAnnotations,
  type CoReadInlineLabels,
  type CoReadInlineStatus,
} from '@/utils/coReadInlineAnnotations'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

import type { ReaderColorTheme } from '@/composables/useReaderColorTheme'

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
  'co-read-draft': [annotationId: string, text: string]
  'co-read-save': [annotationId: string, text: string]
  'co-read-delete': [annotationId: string]
  'co-read-chat': [annotationId: string, text: string]
}>()

const { t } = useI18n()

const loading = ref(true)
const loadError = ref('')
const pagesHtml = ref<string[]>([])
const pagesText = ref<string[]>([])
const currentPage = ref(1)
const pageTotal = computed(() => Math.max(1, pagesHtml.value.length))
const currentPageHtml = computed(() => pagesHtml.value[currentPage.value - 1] ?? '')

const scrollRef = ref<HTMLElement | null>(null)
const articleRef = ref<HTMLElement | null>(null)

marked.setOptions({
  gfm: true,
  breaks: true,
})

const PAGE_CHAR_BUDGET = 1100
const CHAPTER_HEADING_RE =
  /^\s*(第[零一二三四五六七八九十百千万0-9]+[章节回卷集部篇]|Chapter\s+\d+|CHAPTER\s+\d+|序言|序章|楔子|引子|尾声|后记|番外)(\s+.*|$)/

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 智能读取文本：优先严格 UTF-8，若含非法字节（中文常见 GBK/GB18030 .txt）自动回退 gb18030 */
async function decodeTextFile(file: File): Promise<string> {
  const buf = await (typeof file.arrayBuffer === 'function'
    ? file.arrayBuffer()
    : new Response(file).arrayBuffer())
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    try {
      return new TextDecoder('gb18030').decode(buf)
    } catch {
      return new TextDecoder('utf-8').decode(buf)
    }
  }
}

/** 将纯文本 .txt 或 Markdown 切分为带 HTML 和纯文本的书页数组 */
function buildPaginatedPages(rawText: string, fileName: string): { htmlPages: string[]; textPages: string[] } {
  const isTxt = /\.txt$/i.test(fileName || '')
  const normalized = rawText.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '')
  const blocks: { html: string; text: string }[] = []

  if (isTxt) {
    for (const rawLine of normalized.split('\n')) {
      const line = rawLine.replace(/^[\u3000\s]+/, '').trim()
      if (!line) continue
      // 超长单行按句号适度切段，避免一段数千字撑爆单页
      if (line.length > 600) {
        let chunk = ''
        for (const piece of line.split(/(?<=[。！？!?；;])/)) {
          if (chunk.length + piece.length > 360 && chunk) {
            blocks.push({ html: `<p>${escapeHtml(chunk)}</p>`, text: chunk })
            chunk = piece
          } else {
            chunk += piece
          }
        }
        if (chunk) blocks.push({ html: `<p>${escapeHtml(chunk)}</p>`, text: chunk })
        continue
      }
      if (line.length <= 60 && CHAPTER_HEADING_RE.test(line)) {
        blocks.push({ html: `<h2>${escapeHtml(line)}</h2>`, text: line })
      } else {
        blocks.push({ html: `<p>${escapeHtml(line)}</p>`, text: line })
      }
    }
  } else {
    const fullHtml = marked.parse(normalized) as string
    if (typeof document !== 'undefined') {
      const tmp = document.createElement('div')
      tmp.innerHTML = fullHtml
      for (const child of Array.from(tmp.children)) {
        const text = (child.textContent || '').trim()
        if (!text && !child.querySelector('img,hr,table,pre')) continue
        blocks.push({ html: child.outerHTML, text })
      }
    }
    if (blocks.length === 0 && fullHtml.trim()) {
      blocks.push({ html: fullHtml, text: normalized.trim() })
    }
  }

  if (blocks.length === 0) {
    return { htmlPages: ['<p></p>'], textPages: [''] }
  }

  const htmlPages: string[] = []
  const textPages: string[] = []
  let curHtml: string[] = []
  let curText: string[] = []
  let curLen = 0

  const flush = () => {
    if (!curHtml.length) return
    htmlPages.push(curHtml.join('\n'))
    textPages.push(curText.filter(Boolean).join('\n\n'))
    curHtml = []
    curText = []
    curLen = 0
  }

  for (const b of blocks) {
    const isChapterStart = b.html.startsWith('<h2>') || b.html.startsWith('<h1>')
    if (curHtml.length > 0 && (curLen + b.text.length > PAGE_CHAR_BUDGET || (isChapterStart && curLen > 240))) {
      flush()
    }
    curHtml.push(b.html)
    if (b.text) curText.push(b.text)
    curLen += Math.max(20, b.text.length)
  }
  flush()

  return { htmlPages, textPages }
}

/** 用户正在批注卡片内交互/输入时不重建 DOM，避免丢焦点 */
function articleHasInteraction(root: HTMLElement): boolean {
  if (root.querySelector('.co-read-inline-host--open, .co-read-inline-host--hover')) return true
  const doc = root.ownerDocument
  const active = doc?.activeElement
  if (active && root.contains(active)) {
    const tag = (active.tagName || '').toLowerCase()
    if (tag === 'textarea' || tag === 'input') return true
  }
  return Boolean(root.querySelector('.co-read-inline-host:focus-within'))
}

function releaseArticleInteraction() {
  const root = articleRef.value
  if (!root) return
  root.querySelectorAll('.co-read-inline-host--open, .co-read-inline-host--hover').forEach((el) => {
    el.classList.remove('co-read-inline-host--open', 'co-read-inline-host--hover')
  })
  const active = root.ownerDocument?.activeElement as HTMLElement | null
  if (active && root.contains(active) && typeof active.blur === 'function') {
    active.blur()
  }
}

function applyCoReadInline(force = false) {
  const root = articleRef.value
  if (!props.coReadInline?.labels || !root) return
  if (!force && articleHasInteraction(root)) return
  syncCoReadInlineAnnotations(root, {
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

function coReadPayloadSignature(): string {
  const p = props.coReadInline
  if (!p) return ''
  const parts: string[] = []
  for (const a of p.annotations) {
    parts.push(`${a.id}|${a.kind}|${a.anchor?.paragraphIndex ?? 0}|${a.anchor?.quote ?? ''}`)
  }
  const s = p.status
  parts.push(`status:${s?.loading ? 1 : 0}|${s?.errorCode ?? ''}|${s?.emptyHint ? 1 : 0}`)
  return parts.join('~')
}

function patchCoReadText() {
  const root = articleRef.value
  const payload = props.coReadInline
  if (!root || !payload) return
  const s = payload.status
  const statusEl = root.querySelector('.co-read-inline-status')
  if (statusEl && !s?.errorCode) {
    const intro = s?.intro || ''
    const loadingText = s?.loading ? payload.labels.loading || '' : ''
    const text = intro && loadingText ? `${intro} ${loadingText}` : intro || loadingText
    if (text && statusEl.textContent !== text) statusEl.textContent = text
  }
  for (const ann of payload.annotations) {
    const hostEl = root.querySelector(`[data-co-read-inline-root="${ann.id}"]`)
    if (!hostEl) continue
    const bodyEl = hostEl.querySelector('.co-read-pop__body')
    if (bodyEl && bodyEl.textContent !== (ann.content || '')) {
      bodyEl.textContent = ann.content || ''
    }
  }
}

watch(coReadPayloadSignature, () => applyCoReadInline(), { flush: 'post' })
watch(
  () => {
    const p = props.coReadInline
    if (!p) return ''
    let n = 0
    for (const a of p.annotations) n += (a.content || '').length
    return `${n}|${p.status?.intro?.length ?? 0}`
  },
  () => patchCoReadText(),
  { flush: 'post' },
)
watch(
  () => props.colorTheme,
  () => applyCoReadInline(true),
)

function getPageText(): string {
  const indexed = pagesText.value[currentPage.value - 1]
  if (indexed && indexed.trim()) return indexed
  const root = articleRef.value
  if (!root) return ''
  const structured = pageTextFromBody(root)
  if (structured) return structured
  return root.innerText ?? ''
}

function isAtEnd(): boolean {
  return currentPage.value >= pageTotal.value
}

// ── 拟真 3D 翻书动效 + 移动端滑动手势 ─────────────────────────────────────
let flipTurnTimer: number | null = null
let flipCleanTimer: number | null = null

function withPageFlip(direction: 'next' | 'prev', turn: () => void) {
  const el = articleRef.value
  if (!el) {
    turn()
    return
  }
  if (flipTurnTimer) {
    window.clearTimeout(flipTurnTimer)
    flipTurnTimer = null
  }
  if (flipCleanTimer) {
    window.clearTimeout(flipCleanTimer)
    flipCleanTimer = null
  }
  const cls = direction === 'next' ? 'md-flip--next' : 'md-flip--prev'
  el.classList.remove('md-flip--next', 'md-flip--prev')
  void el.offsetWidth
  el.classList.add(cls)
  flipTurnTimer = window.setTimeout(() => {
    flipTurnTimer = null
    turn()
  }, 190)
  flipCleanTimer = window.setTimeout(() => {
    flipCleanTimer = null
    el.classList.remove(cls)
  }, 440)
}

function commitPage(target: number) {
  const clamped = Math.min(Math.max(Math.trunc(target), 1), pageTotal.value)
  if (clamped === currentPage.value) return
  releaseArticleInteraction()
  currentPage.value = clamped
  if (scrollRef.value) scrollRef.value.scrollTop = 0
  emit('page-change', clamped)
  void nextTick(() => {
    applyCoReadInline(true)
    emit('page-ready')
  })
}

function next() {
  if (currentPage.value >= pageTotal.value) return
  withPageFlip('next', () => commitPage(currentPage.value + 1))
}

function prev() {
  if (currentPage.value <= 1) return
  withPageFlip('prev', () => commitPage(currentPage.value - 1))
}

function goToPage(page: number) {
  if (!Number.isFinite(page)) return
  const clamped = Math.min(Math.max(Math.trunc(page), 1), pageTotal.value)
  if (clamped === currentPage.value) return
  const dir = clamped > currentPage.value ? 'next' : 'prev'
  withPageFlip(dir, () => commitPage(clamped))
}

function onKeyDown(e: KeyboardEvent) {
  const tag = ((e.target as HTMLElement | null)?.tagName || '').toLowerCase()
  if (tag === 'textarea' || tag === 'input') return
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault()
    prev()
  }
}

const SWIPE_MIN_PX = 56
const SWIPE_MAX_MS = 1000
let touchStartX = 0
let touchStartY = 0
let touchLastX = 0
let touchLastY = 0
let touchStartAt = 0

function onTouchStart(e: TouchEvent) {
  const target = e.target as HTMLElement | null
  if (!target?.closest('.co-read-inline-host')) {
    releaseArticleInteraction()
  }
  const t0 = e.touches[0]
  if (!t0) return
  touchStartX = t0.clientX
  touchStartY = t0.clientY
  touchLastX = t0.clientX
  touchLastY = t0.clientY
  touchStartAt = Date.now()
}

function onTouchMove(e: TouchEvent) {
  const t0 = e.touches[0]
  if (!t0) return
  touchLastX = t0.clientX
  touchLastY = t0.clientY
}

function onTouchEnd(e: TouchEvent) {
  const t0 = e.changedTouches[0]
  if (t0) {
    touchLastX = t0.clientX
    touchLastY = t0.clientY
  }
  if (String(window.getSelection?.()?.toString() || '').trim()) return
  const dx = touchLastX - touchStartX
  const dy = touchLastY - touchStartY
  const dt = Date.now() - touchStartAt
  if (dt > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.6) return
  if (dx < 0) next()
  else prev()
}

defineExpose({ next, prev, goToPage, getPageText, isAtEnd })

onMounted(async () => {
  try {
    const text = await decodeTextFile(props.file)
    const { htmlPages, textPages } = buildPaginatedPages(text, props.file.name)
    pagesHtml.value = htmlPages
    pagesText.value = textPages
    currentPage.value = 1
    loading.value = false
    emit('page-count', htmlPages.length)
    emit('page-change', 1)
    await nextTick()
    applyCoReadInline(true)
    emit('page-ready')
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
  outline: none;
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
  padding: 20px;
}
.markdown-reader__shell {
  max-width: 820px;
  margin: 0 auto;
  perspective: 1800px;
}
.markdown-reader__article {
  position: relative;
  min-height: calc(100vh - 150px);
  padding: 32px 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  color: #1f2937;
  font-size: 17px;
  line-height: 1.85;
  word-break: break-word;
  transform-style: preserve-3d;
  will-change: transform, box-shadow;
}
/* 卷页折痕高光与书脊阴影遮罩 */
.markdown-reader__article::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 8;
  opacity: 0;
}
.markdown-reader__article.md-flip--next {
  transform-origin: left center;
  animation: md-flip-next 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
  backface-visibility: hidden;
}
.markdown-reader__article.md-flip--next::after {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.24) 0%,
    rgba(0, 0, 0, 0.06) 18%,
    rgba(255, 255, 255, 0.28) 46%,
    rgba(0, 0, 0, 0.18) 78%,
    rgba(0, 0, 0, 0.32) 100%
  );
  animation: md-curl-shade-next 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.markdown-reader__article.md-flip--prev {
  transform-origin: right center;
  animation: md-flip-prev 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
  backface-visibility: hidden;
}
.markdown-reader__article.md-flip--prev::after {
  background: linear-gradient(
    270deg,
    rgba(0, 0, 0, 0.24) 0%,
    rgba(0, 0, 0, 0.06) 18%,
    rgba(255, 255, 255, 0.28) 46%,
    rgba(0, 0, 0, 0.18) 78%,
    rgba(0, 0, 0, 0.32) 100%
  );
  animation: md-curl-shade-prev 0.44s cubic-bezier(0.22, 0.61, 0.36, 1);
}
@keyframes md-flip-next {
  0% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
  43% {
    transform: rotateY(-54deg) translateX(-3%) scale(0.975);
    box-shadow: 24px 0 36px -8px rgba(0, 0, 0, 0.38);
  }
  47% {
    transform: rotateY(20deg) translateX(2.5%) scale(0.985);
    box-shadow: -18px 0 28px -6px rgba(0, 0, 0, 0.28);
  }
  100% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
}
@keyframes md-flip-prev {
  0% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
  43% {
    transform: rotateY(54deg) translateX(3%) scale(0.975);
    box-shadow: -24px 0 36px -8px rgba(0, 0, 0, 0.38);
  }
  47% {
    transform: rotateY(-20deg) translateX(-2.5%) scale(0.985);
    box-shadow: 18px 0 28px -6px rgba(0, 0, 0, 0.28);
  }
  100% {
    transform: rotateY(0deg) translateX(0) scale(1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
}
@keyframes md-curl-shade-next {
  0% {
    opacity: 0;
    transform: translateX(35%);
  }
  43% {
    opacity: 0.9;
    transform: translateX(-15%);
  }
  47% {
    opacity: 0.75;
    transform: translateX(20%);
  }
  100% {
    opacity: 0;
    transform: translateX(-40%);
  }
}
@keyframes md-curl-shade-prev {
  0% {
    opacity: 0;
    transform: translateX(-35%);
  }
  43% {
    opacity: 0.9;
    transform: translateX(15%);
  }
  47% {
    opacity: 0.75;
    transform: translateX(-20%);
  }
  100% {
    opacity: 0;
    transform: translateX(40%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .markdown-reader__article.md-flip--next,
  .markdown-reader__article.md-flip--prev,
  .markdown-reader__article.md-flip--next::after,
  .markdown-reader__article.md-flip--prev::after {
    animation: none;
  }
}
.markdown-reader__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  flex-shrink: 0;
}
.markdown-reader__page {
  min-width: 72px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.mr-btn {
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
}
.mr-btn:hover:not(:disabled) {
  background: #1f2937;
}
.mr-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.markdown-reader__article :deep(h1),
.markdown-reader__article :deep(h2),
.markdown-reader__article :deep(h3),
.markdown-reader__article :deep(h4),
.markdown-reader__article :deep(h5),
.markdown-reader__article :deep(h6) {
  margin: 1.2em 0 0.6em;
  font-weight: 600;
  line-height: 1.35;
}
.markdown-reader__article :deep(h1) { font-size: 1.6em; }
.markdown-reader__article :deep(h2) { font-size: 1.35em; }
.markdown-reader__article :deep(h3) { font-size: 1.2em; }
.markdown-reader__article :deep(h4) { font-size: 1.08em; }
.markdown-reader__article :deep(p) {
  margin: 0.65em 0;
  text-indent: 2em;
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
.markdown-reader--night {
  background: #0a0a0a;
}
.markdown-reader--night .markdown-reader__overlay {
  background: #0a0a0a;
  color: #9ca3af;
}
.markdown-reader--night .markdown-reader__article {
  background: #0a0a0a;
  color: #e5e5e5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
}
.markdown-reader--night .markdown-reader__article :deep(a) {
  color: #93c5fd;
}
.markdown-reader--night .markdown-reader__article :deep(blockquote) {
  background: #171717;
  border-left-color: #4b5563;
  color: #d1d5db;
}
.markdown-reader--night .markdown-reader__article :deep(code) {
  background: #262626;
  color: #e5e5e5;
}
.markdown-reader--night .markdown-reader__article :deep(th),
.markdown-reader--night .markdown-reader__article :deep(td) {
  border-color: #374151;
}
.markdown-reader--night .markdown-reader__article :deep(th) {
  background: #171717;
}
.markdown-reader--night .markdown-reader__article :deep(hr) {
  border-top-color: #374151;
}

@media (max-width: 767px) {
  .markdown-reader__scroll {
    padding: 0;
  }
  .markdown-reader__article {
    min-height: 100%;
    padding: 20px 18px 40px;
    border-radius: 0;
    box-shadow: none;
  }
  /* 移动端已有 ReaderView 统一底栏，隐藏组件内部底栏 */
  .markdown-reader__nav {
    display: none;
  }
}
</style>
