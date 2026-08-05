<template>
  <div class="web-bilingual-reader">
    <div v-if="loading" class="web-bilingual-reader__placeholder">
      {{ t('translate.loadingWeb') }}
    </div>
    <div v-else-if="loadError" class="web-bilingual-reader__placeholder web-bilingual-reader__placeholder--error">
      <span>{{ loadError }}</span>
      <button class="web-bilingual-reader__retry" type="button" @click="init">
        {{ t('translate.retry') }}
      </button>
    </div>

    <div v-show="!loading && !loadError" class="web-bilingual-reader__split">
      <!-- 左：原文 -->
      <div class="web-bilingual-reader__pane" ref="origScrollRef">
        <div class="web-bilingual-reader__pane-label">{{ t('translate.original') }}</div>
        <div class="web-bilingual-reader__host" :style="{ zoom: String(scale) }" ref="origHostRef"></div>
      </div>

      <!-- 右：译文（DOM 结构与原文一致） -->
      <div class="web-bilingual-reader__pane" ref="transScrollRef">
        <div class="web-bilingual-reader__pane-label web-bilingual-reader__pane-label--trans">{{ t('translate.translation') }}</div>
        <div class="web-bilingual-reader__host" :style="{ zoom: String(scale) }" ref="transHostRef"></div>

        <div v-if="translating" class="web-bilingual-reader__badge">
          <span class="web-bilingual-reader__spinner"></span>
          {{ t('translate.progress', { done: doneCount, total: totalCount }) }}
        </div>
        <div v-else-if="translateError" class="web-bilingual-reader__badge web-bilingual-reader__badge--error">
          <span>{{ t('translate.error') }}</span>
          <button class="web-bilingual-reader__badge-retry" type="button" @click="runTranslation">
            {{ t('translate.retry') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchWebpage } from '@/api/webpage'
import { translateBatch } from '@/api/translation'
import {
  prepareWebPage,
  collectTranslationUnits,
  applyUnitTranslation,
  type WebTranslationUnit,
} from '@/utils/webPageDom'
import {
  computeTextHash,
  getCachedTranslation,
  putCachedTranslation,
} from '@/utils/translationCache'

const props = defineProps<{
  url: string
  targetLang: string
  scale: number
}>()
const emit = defineEmits<{
  (event: 'title', title: string): void
}>()

const { t } = useI18n()

const origScrollRef = ref<HTMLElement | null>(null)
const transScrollRef = ref<HTMLElement | null>(null)
const origHostRef = ref<HTMLElement | null>(null)
const transHostRef = ref<HTMLElement | null>(null)

const loading = ref(true)
const loadError = ref('')
const translating = ref(false)
const translateError = ref(false)
const doneCount = ref(0)
const totalCount = ref(0)

/** 清洗后的原始内容，左右两栏都由它克隆，互不污染 */
let pristine: HTMLElement | null = null
let transContent: HTMLElement | null = null
let units: WebTranslationUnit[] = []
let urlHash = ''
let runToken = 0
let syncingScroll = false

const CACHE_SCHEMA = 'w1'
const MAX_BATCH_TEXTS = 40
const MAX_BATCH_CHARS = 6000
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur'])

// ShadowRoot 内的基础样式：仅兜底布局，尽量保留页面原生外观
const SHADOW_BASE_CSS = `
.web-doc{box-sizing:border-box;background:#fff;color:#000;min-height:100%;padding:28px;line-height:1.6;overflow-wrap:break-word;word-wrap:break-word}
.web-doc img,.web-doc video{max-width:100%;height:auto}
.web-doc table{max-width:100%}
.web-doc pre{white-space:pre-wrap;overflow-wrap:break-word}
`

onMounted(init)

onBeforeUnmount(() => {
  runToken += 1
})

watch(() => props.targetLang, () => {
  if (pristine) void runTranslation()
})

async function init() {
  const token = ++runToken
  loading.value = true
  loadError.value = ''
  translateError.value = false
  try {
    const { html, finalUrl } = await fetchWebpage(props.url)
    const prepared = prepareWebPage(html, finalUrl)
    urlHash = await computeTextHash(finalUrl)
    if (token !== runToken) return
    pristine = prepared.content
    emit('title', prepared.title || finalUrl)
    loading.value = false
    await nextTick()
    mountPanes()
    setupScrollSync()
    await runTranslation()
  } catch {
    if (token !== runToken) return
    loadError.value = t('translate.webFetchFailed')
    loading.value = false
  }
}

function fillShadow(shadow: ShadowRoot, content: HTMLElement, rtl: boolean) {
  shadow.innerHTML = ''
  const style = document.createElement('style')
  style.textContent = SHADOW_BASE_CSS
  shadow.appendChild(style)
  if (rtl) content.setAttribute('dir', 'rtl')
  shadow.appendChild(content)
}

function mountPanes() {
  if (!origHostRef.value || !transHostRef.value || !pristine) return
  const origShadow = origHostRef.value.shadowRoot ?? origHostRef.value.attachShadow({ mode: 'open' })
  const transShadow = transHostRef.value.shadowRoot ?? transHostRef.value.attachShadow({ mode: 'open' })
  fillShadow(origShadow, pristine.cloneNode(true) as HTMLElement, false)
  transContent = pristine.cloneNode(true) as HTMLElement
  fillShadow(transShadow, transContent, RTL_LANGS.has(props.targetLang))
}

function setupScrollSync() {
  const orig = origScrollRef.value
  const trans = transScrollRef.value
  if (!orig || !trans) return
  // 两侧内容高度不同（译文长度不同），按比例同步滚动
  const syncRatio = (from: HTMLElement, to: HTMLElement) => {
    const fromRange = from.scrollHeight - from.clientHeight
    const toRange = to.scrollHeight - to.clientHeight
    to.scrollTop = fromRange > 0 && toRange > 0 ? (from.scrollTop / fromRange) * toRange : from.scrollTop
  }
  orig.addEventListener('scroll', () => {
    if (syncingScroll) return
    syncingScroll = true
    syncRatio(orig, trans)
    requestAnimationFrame(() => { syncingScroll = false })
  })
  trans.addEventListener('scroll', () => {
    if (syncingScroll) return
    syncingScroll = true
    syncRatio(trans, orig)
    requestAnimationFrame(() => { syncingScroll = false })
  })
}

function chunkUnits(list: WebTranslationUnit[]): WebTranslationUnit[][] {
  const chunks: WebTranslationUnit[][] = []
  let current: WebTranslationUnit[] = []
  let chars = 0
  for (const unit of list) {
    if (current.length && (current.length >= MAX_BATCH_TEXTS || chars + unit.text.length > MAX_BATCH_CHARS)) {
      chunks.push(current)
      current = []
      chars = 0
    }
    current.push(unit)
    chars += unit.text.length
  }
  if (current.length) chunks.push(current)
  return chunks
}

function cacheMatches(cached: { lines: string[]; translations: string[] }, texts: string[]): boolean {
  if (cached.translations.length !== texts.length || cached.lines.length !== texts.length) return false
  return cached.lines.every((line, i) => line === texts[i])
}

async function translateChunk(chunk: WebTranslationUnit[], index: number): Promise<string[]> {
  const texts = chunk.map((unit) => unit.text)
  const key = `web:${urlHash}:${props.targetLang}:${index}:${CACHE_SCHEMA}`
  const cached = await getCachedTranslation(key)
  if (cached && cacheMatches(cached, texts)) return cached.translations

  const res = await translateBatch({ texts, targetLang: props.targetLang })
  const translations = res.translations ?? []
  if (translations.length !== texts.length) {
    throw new Error('translation length mismatch')
  }
  await putCachedTranslation(key, { lines: texts, translations, ts: Date.now() })
  return translations
}

async function runTranslation() {
  if (!pristine || !transHostRef.value) return
  const token = ++runToken
  // 重新克隆右栏内容，避免上一轮译文污染
  const transShadow = transHostRef.value.shadowRoot
  if (!transShadow) return
  transContent = pristine.cloneNode(true) as HTMLElement
  fillShadow(transShadow, transContent, RTL_LANGS.has(props.targetLang))

  units = collectTranslationUnits(transContent)
  totalCount.value = units.length
  doneCount.value = 0
  translateError.value = false
  if (!units.length || !props.targetLang) {
    translating.value = false
    return
  }

  translating.value = true
  const chunks = chunkUnits(units)
  for (let i = 0; i < chunks.length; i++) {
    if (token !== runToken) return
    try {
      const translations = await translateChunk(chunks[i], i)
      if (token !== runToken) return
      chunks[i].forEach((unit, j) => applyUnitTranslation(unit, translations[j] ?? ''))
      doneCount.value += chunks[i].length
    } catch {
      if (token !== runToken) return
      translateError.value = true
      break
    }
  }
  if (token === runToken) translating.value = false
}
</script>

<style scoped>
.web-bilingual-reader {
  height: 100%;
  width: 100%;
  background: #525659;
  overflow: hidden;
}
.web-bilingual-reader__split {
  display: flex;
  height: 100%;
  width: 100%;
}
.web-bilingual-reader__pane {
  flex: 1 1 50%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 8px 12px 12px;
  position: relative;
}
.web-bilingual-reader__pane:nth-child(2) {
  padding: 12px 12px 12px 8px;
}
.web-bilingual-reader__pane-label {
  position: sticky;
  top: 0;
  z-index: 5;
  align-self: center;
  margin-bottom: 4px;
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  pointer-events: none;
  flex-shrink: 0;
}
.web-bilingual-reader__pane-label--trans {
  background: rgba(30, 58, 138, 0.85);
}
.web-bilingual-reader__host {
  width: 100%;
  max-width: 860px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}
.web-bilingual-reader__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: #e4e4e7;
  font-size: 14px;
}
.web-bilingual-reader__placeholder--error {
  color: #fca5a5;
}
.web-bilingual-reader__retry {
  padding: 4px 14px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}
.web-bilingual-reader__retry:hover {
  background: rgba(255, 255, 255, 0.12);
}
.web-bilingual-reader__badge {
  position: sticky;
  bottom: 12px;
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 12px;
  z-index: 6;
  flex-shrink: 0;
}
.web-bilingual-reader__badge--error {
  background: rgba(220, 38, 38, 0.9);
}
.web-bilingual-reader__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: web-reader-spin 0.8s linear infinite;
}
.web-bilingual-reader__badge-retry {
  padding: 1px 8px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.web-bilingual-reader__badge-retry:hover {
  background: rgba(255, 255, 255, 0.18);
}
@keyframes web-reader-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
