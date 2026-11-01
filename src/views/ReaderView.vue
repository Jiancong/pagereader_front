<template>
  <div
    class="reader-view"
    :class="{
      'reader-view--epub': isEpub,
      'reader-view--mobi': isMobi,
      'reader-view--pdf': isPdf,
      'reader-view--night': isDark,
      'reader-view--co-read-immersive': coReadMode && !coReadChromeVisible,
    }"
    @contextmenu="onContextMenu"
    @wheel="onWheel"
  >
    <!-- 沉浸共读模式下的右上角轻量悬浮唤醒丸（不占布局高度，点击可临时呼出工具栏或退出伴读） -->
    <div v-if="coReadMode" class="reader-view__co-read-fab">
      <button
        type="button"
        class="reader-view__co-read-fab-btn"
        :title="coReadChromeVisible ? t('reader.moreTools') : t('reader.moreTools')"
        @click.stop="coReadChromeVisible = !coReadChromeVisible"
      >
        <MoreHorizontal class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="reader-view__co-read-fab-btn reader-view__co-read-fab-btn--exit"
        :title="t('reader.modeCoRead')"
        @click.stop="onTogglePageCoRead"
      >
        <BookHeart class="h-4 w-4" />
      </button>
      <button
        v-if="
          coReadChatOpen ||
          coReadStore.phase === 'discussing' ||
          coReadStore.chatMessages.length > 0
        "
        type="button"
        class="reader-view__co-read-fab-btn"
        :title="t('coRead.chatPanelChat')"
        @click.stop="coReadChatOpen = !coReadChatOpen"
      >
        <MessageCircle class="h-4 w-4" />
      </button>
    </div>
    <!-- 顶部工具栏 -->
    <header class="reader-view__toolbar">
      <div class="reader-view__toolbar-row">
        <div class="reader-view__head">
          <button class="rv-btn rv-btn--back" @click="goBack" :aria-label="t('reader.back')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            <span class="rv-btn__label">{{ t('reader.back') }}</span>
          </button>
          <div class="reader-view__title-block">
            <div class="reader-view__title" :title="headerTitle">{{ headerTitle }}</div>
          </div>
        </div>
        <button
          v-if="hasSource && (isPdf || isEpub || isMobi || isMarkdown)"
          type="button"
          class="rv-btn rv-btn--sm rv-btn--mobile-tools"
          :aria-label="t('reader.moreTools')"
          :aria-expanded="mobileToolsOpen"
          @click="mobileToolsOpen = !mobileToolsOpen"
        >
          <MoreHorizontal class="h-5 w-5" />
        </button>
      </div>

      <div
        class="reader-view__controls"
        :class="{ 'reader-view__controls--mobile-open': mobileToolsOpen }"
      >
        <div v-if="hasSource && (isPdf || isEpub || isMobi || isXlsx || isMarkdown)" class="rv-field rv-field--pages">
          <button class="rv-btn rv-btn--sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
          <input
            v-model.number="pageInput"
            class="rv-page-input"
            type="number"
            min="1"
            :max="pageCount"
            :aria-label="t('reader.page')"
            @change="goToPage(pageInput)"
            @keyup.enter="goToPage(pageInput)"
          />
          <span class="rv-page-total">/ {{ pageCount || '—' }}</span>
          <button class="rv-btn rv-btn--sm" :disabled="!pageCount || currentPage >= pageCount" @click="goToPage(currentPage + 1)">›</button>
        </div>

        <div v-if="hasSource && (isPdf || isEpub || isMobi || isXlsx || isMarkdown)" class="rv-field rv-field--zoom">
          <button class="rv-btn rv-btn--sm" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="rv-zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button class="rv-btn rv-btn--sm" @click="zoomIn" :disabled="scale >= 3">+</button>
        </div>

        <button
          v-if="hasSource && (isPdf || isEpub || isMobi || isMarkdown)"
          type="button"
          class="rv-btn rv-btn--sm rv-btn--theme"
          :class="{ 'rv-btn--theme-on': isDark }"
          :title="isDark ? t('reader.colorThemeLight') : t('reader.colorThemeDark')"
          :aria-label="isDark ? t('reader.colorThemeLight') : t('reader.colorThemeDark')"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
          <span class="rv-btn--theme-label">{{ isDark ? t('reader.colorThemeLight') : t('reader.colorThemeDark') }}</span>
        </button>

        <button
          v-if="showTtsControls"
          class="rv-btn rv-btn--sm rv-btn--tts"
          :class="{ 'rv-btn--tts-active': speaking && !paused, 'rv-btn--loading': ttsLoading }"
          :disabled="ttsLoading || ttsBusy"
          :title="ttsLoading ? t('reader.ttsLoading') : (speaking ? (paused ? t('reader.ttsResume') : t('reader.ttsPause')) : t('reader.ttsStart'))"
          @click="onToggleTts"
        >
          <Loader2 v-if="ttsLoading" class="h-4 w-4 animate-spin" />
          <Pause v-else-if="speaking && !paused" class="h-4 w-4" />
          <Play v-else-if="paused" class="h-4 w-4" />
          <Volume2 v-else class="h-4 w-4" />
          <span class="rv-btn--tts-label">{{ ttsLoading ? t('reader.ttsLoading') : (speaking ? (paused ? t('reader.ttsResume') : t('reader.ttsPause')) : t('reader.ttsStart')) }}</span>
        </button>

        <select
          v-if="showTtsControls && ttsVoices.length > 1"
          class="rv-btn rv-btn--sm rv-tts-voice-select"
          :value="ttsSelectedVoiceURI"
          :title="t('reader.ttsVoice')"
          @change="onSelectTtsVoice"
        >
          <option v-for="v in ttsVoices" :key="v.voiceURI" :value="v.voiceURI">
            {{ v.name }} ({{ v.lang }})
          </option>
        </select>

        <button
          v-if="showTtsControls"
          class="rv-btn rv-btn--sm rv-btn--auto-advance"
          :class="{ 'rv-btn--auto-advance--on': ttsAutoAdvance }"
          :title="t('reader.ttsAutoAdvanceHint')"
          @click="ttsAutoAdvance = !ttsAutoAdvance"
        >
          <Repeat class="h-4 w-4" />
          <span class="rv-btn--auto-advance-label">{{ t('reader.ttsAutoAdvance') }}</span>
        </button>

        <button
          v-if="canToggleCoRead"
          type="button"
          class="rv-btn rv-btn--sm rv-btn--co-read"
          :class="{ 'rv-btn--co-read--on': coReadMode }"
          :disabled="coReadBusy"
          :title="t('reader.coReadToggleHint')"
          @click="onTogglePageCoRead"
        >
          <Loader2 v-if="coReadBusy" class="h-4 w-4 animate-spin" />
          <BookHeart v-else class="h-4 w-4" />
          <span class="rv-btn--co-read-label">{{ t('reader.modeCoRead') }}</span>
        </button>

        <button
          v-if="coReadMode && hasSource && coReadStore.phase === 'reading'"
          type="button"
          class="rv-btn rv-btn--sm"
          :disabled="coReadStore.openingChapter"
          :title="t('coRead.regeneratePage')"
          @click="mobileToolsOpen = false; onCoReadRegeneratePage()"
        >
          {{ t('coRead.regeneratePage') }}
        </button>

        <button
          v-if="hasSource && (isPdf || isEpub || isMobi || isMarkdown) && !coReadMode"
          class="rv-btn rv-btn--sm rv-btn--workspace"
          :title="t('reader.saveBookWorkspaceTitle')"
          @click="onSaveToWorkspace"
        >
          <FolderInput class="h-4 w-4" />
          <span class="rv-btn--workspace-label">{{ t('reader.saveBookWorkspace') }}</span>
        </button>
      </div>
    </header>

    <!-- 无文件：回阅读中心 -->
    <div v-if="!hasSource" class="reader-view__empty">
      <p>{{ t('reader.noFile') }}</p>
      <button class="rv-btn rv-btn--primary" @click="goBack">{{ t('reader.backToHub') }}</button>
    </div>

    <div
      v-else-if="hasKnownReader"
      class="reader-view__content"
      :class="{ 'reader-view__content--co-read-pdf': coReadShowPdfSidePanel }"
      @pointerdown.capture="mobileToolsOpen = false; coReadChromeVisible = false"
      @touchstart.capture="mobileToolsOpen = false; coReadChromeVisible = false"
    >
      <!-- PDF 阅读器 -->
      <PdfReader
        v-if="isPdf"
        ref="pdfReaderRef"
        :object-url="objectUrl"
        :scale="scale"
        :color-theme="theme"
        @page-change="onPageChange"
        @page-count="onPageCount"
        @page-ready="onReaderPageReady"
      />

      <!-- EPUB 阅读器 -->
      <EpubReader
        v-else-if="isEpub && file"
        ref="epubReaderRef"
        :file="file"
        :scale="scale"
        :color-theme="theme"
        :co-read-inline="coReadInlinePayload"
        @page-change="onPageChange"
        @page-count="onPageCount"
        @page-ready="onReaderPageReady"
        @zoom="applyZoomDelta"
        @co-read-draft="onCoReadDraft"
        @co-read-save="handleCoReadCardSave"
        @co-read-delete="handleCoReadCardDelete"
        @co-read-chat="handleCoReadCardChat"
      />

      <!-- MOBI 阅读器 -->
      <MobiReader
        v-else-if="isMobi && file"
        ref="mobiReaderRef"
        :file="file"
        :scale="scale"
        :color-theme="theme"
        :co-read-inline="coReadInlinePayload"
        @page-change="onPageChange"
        @page-count="onPageCount"
        @page-ready="onReaderPageReady"
        @zoom="applyZoomDelta"
        @co-read-draft="onCoReadDraft"
        @co-read-save="handleCoReadCardSave"
        @co-read-delete="handleCoReadCardDelete"
        @co-read-chat="handleCoReadCardChat"
      />

      <!-- XLSX 阅读器 -->
      <XlsxReader
        v-else-if="isXlsx && file"
        ref="xlsxReaderRef"
        :file="file"
        :scale="scale"
        @page-change="onPageChange"
        @page-count="onPageCount"
      />

      <!-- Markdown / TXT 阅读器 -->
      <MarkdownReader
        v-else-if="isMarkdown && file"
        ref="markdownReaderRef"
        :file="file"
        :scale="scale"
        :color-theme="theme"
        :co-read-inline="coReadInlinePayload"
        @page-change="onPageChange"
        @page-count="onPageCount"
        @page-ready="onReaderPageReady"
        @co-read-draft="onCoReadDraft"
        @co-read-save="handleCoReadCardSave"
        @co-read-delete="handleCoReadCardDelete"
        @co-read-chat="handleCoReadCardChat"
      />

      <CoReadAnnotationStrip
        v-if="coReadShowPdfSidePanel"
        class="reader-view__co-read-side"
        :annotations="coReadChapterAnnotations"
        :intro-text="coReadStore.pageIntroText"
        :page-error="coReadStore.pageOpenError"
        :loading="coReadStore.openingChapter"
        show-regenerate
        :regenerate-disabled="coReadStore.openingChapter"
        @draft="onCoReadDraft"
        @retry="onCoReadRetryPage"
        @regenerate="onCoReadRegeneratePage"
      />
    </div>

    <!-- 未知格式 -->
    <div v-else class="reader-view__unsupported">
      <FileWarning class="reader-view__unsupported-icon" />
      <p class="reader-view__unsupported-title">{{ t('reader.unsupportedTitle') }}</p>
      <p v-if="file" class="reader-view__unsupported-file">{{ file.name }}</p>
      <button class="rv-btn rv-btn--primary" @click="goBack">{{ t('reader.back') }}</button>
    </div>

    <!-- 移动端固定底栏：翻页 + 朗读（华为等 WebView 顶部控件可能被挤出视口） -->
    <footer
      v-if="hasSource && (isPdf || isEpub || isMobi || isMarkdown)"
      class="reader-view__mobile-bar"
    >
      <button
        type="button"
        class="reader-view__mobile-bar-btn"
        :disabled="!canGoPrev"
        :aria-label="t('reader.prev')"
        @click="prevPage"
      >
        ‹ {{ t('reader.prev') }}
      </button>
      <div class="reader-view__mobile-bar-center">
        <button
          v-if="hasSource && (isPdf || isEpub || isMobi || isMarkdown)"
          type="button"
          class="reader-view__mobile-bar-btn"
          :aria-label="isDark ? t('reader.colorThemeLight') : t('reader.colorThemeDark')"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>
        <button
          v-if="showTtsControls"
          type="button"
          class="reader-view__mobile-bar-btn reader-view__mobile-bar-btn--tts"
          :class="{ 'reader-view__mobile-bar-btn--tts-active': speaking && !paused }"
          :disabled="ttsLoading || ttsBusy"
          :aria-label="t('reader.ttsStart')"
          @click="onToggleTts"
        >
          <Loader2 v-if="ttsLoading" class="h-5 w-5 animate-spin" />
          <Pause v-else-if="speaking && !paused" class="h-5 w-5" />
          <Play v-else-if="paused" class="h-5 w-5" />
          <Volume2 v-else class="h-5 w-5" />
        </button>
        <span class="reader-view__mobile-bar-page">{{ currentPage }} / {{ pageCount || '—' }}</span>
      </div>
      <button
        type="button"
        class="reader-view__mobile-bar-btn"
        :disabled="!canGoNext"
        :aria-label="t('reader.next')"
        @click="nextPage"
      >
        {{ t('reader.next') }} ›
      </button>
    </footer>

    <template v-if="coReadMode && hasSource">
      <div
        v-if="
          coReadChatOpen &&
          (coReadStore.phase === 'reading' || coReadStore.phase === 'discussing')
        "
        class="reader-view__co-read-tray"
      >
        <CoReadChatPanel
          :messages="coReadStore.chatMessages"
          :chat-loading="coReadChatLoading"
          :replies="coReadReplyRecords"
          :kind-label="coReadInlineLabels.kind"
          @send="onCoReadChatSend"
          @close="coReadChatOpen = false"
        />
      </div>
      <div
        v-else-if="
          coReadStore.phase === 'reading' &&
          coReadChapterOpenDone &&
          (coReadReplyCount > 0 || coReadChromeVisible)
        "
        class="reader-view__co-read-tray"
      >
        <CoReadReplyTray
          :reply-count="coReadReplyCount"
          :loading="coReadStore.repliesSending"
          @send="onCoReadSendReplies"
        />
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileWarning, Volume2, Pause, Play, Loader2, FolderInput, Repeat, Moon, Sun, BookHeart, MoreHorizontal, MessageCircle } from 'lucide-vue-next'
import CoReadAnnotationStrip from '@/components/coReading/CoReadAnnotationStrip.vue'
import CoReadReplyTray from '@/components/coReading/CoReadReplyTray.vue'
import CoReadChatPanel from '@/components/coReading/CoReadChatPanel.vue'
import { useCoReadingController } from '@/composables/useCoReadingController'
import { useCoReadInlineLabels } from '@/composables/useCoReadInlineLabels'
import { useCoReadingStore } from '@/stores/coReading'
import { useReaderColorTheme } from '@/composables/useReaderColorTheme'
import { ElMessage } from 'element-plus'
import PdfReader from '@/components/reader/PdfReader.vue'
import EpubReader from '@/components/reader/EpubReader.vue'
import MobiReader from '@/components/reader/MobiReader.vue'
import { useReaderFileStore } from '@/stores/reader'
import { useBrowserTts } from '@/composables/useBrowserTts'
import { isLoggedIn } from '@/api'
import { navigateAfterReaderClose } from '@/utils/readerReturnRoute'

const XlsxReader = defineAsyncComponent(() => import('@/components/reader/XlsxReader.vue'))
const MarkdownReader = defineAsyncComponent(() => import('@/components/reader/MarkdownReader.vue'))

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const store = useReaderFileStore()
const coReadStore = useCoReadingStore()
// reading / discussing 两个阶段都视为「伴读中」：讨论阶段仍保持沉浸模式与批注层，
// 否则点「再聊一句」会瞬间退出沉浸伴读（工具栏弹回、批注层卸载）
const coReadMode = computed(
  () =>
    Boolean(coReadStore.sessionId) &&
    (coReadStore.phase === 'reading' || coReadStore.phase === 'discussing'),
)
const coReadBusy = ref(false)
const canToggleCoRead = computed(
  () => hasSource.value && (isPdf.value || isEpub.value || isMobi.value || isMarkdown.value),
)
const {
  chapterAnnotations: coReadChapterAnnotations,
  replyDraftCount: coReadReplyCount,
  chapterOpenDone: coReadChapterOpenDone,
  chatLoading: coReadChatLoading,
  onDraft: onCoReadDraft,
  saveAnnotationReply: onCoReadPersistReply,
  deleteAnnotationReply: onCoReadDeleteReply,
  chatAboutAnnotation: onCoReadChatAbout,
  reportReaderPage,
  hasReportedPage: hasCoReadReportedPage,
  startPageCoRead,
  stopPageCoRead,
  onSendReplies: onCoReadSendReplies,
  onChatSend: onCoReadChatSend,
  retryCurrentPageOpen: onCoReadRetryPage,
  forceRegenerateCurrentPage: onCoReadRegeneratePage,
} = useCoReadingController()
const coReadInlineLabels = useCoReadInlineLabels()
/** 「记录」页签的数据源：已写/已发送的批注留言 */
const coReadReplyRecords = computed(() =>
  coReadChapterAnnotations.value
    .filter((a) => String(a.myReply || '').trim())
    .map((a) => ({ id: a.id, kind: a.kind, myReply: String(a.myReply || ''), replySent: a.replySent })),
)
// 进入讨论阶段（发送留言后）自动展开对话栏
watch(
  () => coReadStore.phase,
  (phase) => {
    if (phase === 'discussing') coReadChatOpen.value = true
  },
)

/** 批注卡片内「再聊一句」：打开底部对话栏继续（上下文跟随该批注） */
async function handleCoReadCardChat(annotationId: string, text: string) {
  coReadChatOpen.value = true
  await onCoReadChatAbout(annotationId, text)
}

/** 批注卡片内「保存」：优先后端持久化，失败降级本地草稿 */
async function handleCoReadCardSave(annotationId: string, text: string) {
  await onCoReadPersistReply(annotationId, text)
}

/** 批注卡片内「删除留言」：清空本地并同步删除后端记录 */
async function handleCoReadCardDelete(annotationId: string) {
  await onCoReadDeleteReply(annotationId)
}
const hasKnownReader = computed(
  () =>
    isPdf.value ||
    (isEpub.value && Boolean(file.value)) ||
    (isMobi.value && Boolean(file.value)) ||
    (isXlsx.value && Boolean(file.value)) ||
    (isMarkdown.value && Boolean(file.value)),
)
const coReadShowPdfSidePanel = computed(
  () => coReadMode.value && isPdf.value && coReadStore.phase === 'reading',
)
const coReadInlinePayload = computed(() => {
  // discussing（对话/留言讨论）阶段同样保留批注层：用户可能正点着卡片继续聊
  if (!coReadMode.value || isPdf.value) return null
  if (coReadStore.phase !== 'reading' && coReadStore.phase !== 'discussing') return null
  return {
    annotations: coReadChapterAnnotations.value,
    labels: coReadInlineLabels.value,
    status: {
      loading: coReadStore.openingChapter && coReadChapterAnnotations.value.length === 0,
      intro: coReadStore.pageIntroText || undefined,
      errorCode: coReadStore.pageOpenError || undefined,
      emptyHint:
        coReadStore.pageOpenEmpty &&
        !coReadStore.openingChapter &&
        coReadChapterAnnotations.value.length === 0 &&
        !coReadStore.pageOpenError
          ? t('coRead.noAnnotationsFromServer')
          : undefined,
      onRetry: () => {
        void onCoReadRetryPage()
      },
    },
  }
})
const { theme, isDark, toggleTheme } = useReaderColorTheme()

const file = computed(() => store.file)
const objectUrl = computed(() => store.objectUrl)
const isPdf = computed(() => store.format === 'pdf')
const isEpub = computed(() => store.format === 'epub')
const isMobi = computed(() => store.format === 'mobi')
const isXlsx = computed(() => store.format === 'xlsx')
const isMarkdown = computed(() => store.format === 'markdown')
const hasSource = computed(() => Boolean(store.file))
const headerTitle = computed(() => store.file?.name ?? '')

const scale = ref(1.2)
const mobileToolsOpen = ref(false)
/** 沉浸共读模式下默认隐藏上下工具栏，点击右上角悬浮唤醒钮才临时展开 */
const coReadChromeVisible = ref(false)
/** 沉浸共读的对话栏（记录/对话）显隐；进入讨论阶段自动展开，可手动关闭 */
const coReadChatOpen = ref(false)
const MOBILE_LAYOUT_MQ = '(max-width: 767px)'
let mobileLayoutMq: MediaQueryList | null = null

function applyMobileScalePreference() {
  if (typeof window === 'undefined') return
  if (window.matchMedia(MOBILE_LAYOUT_MQ).matches) {
    scale.value = 1
  }
}

function onMobileLayoutChange() {
  applyMobileScalePreference()
  if (!mobileLayoutMq?.matches) mobileToolsOpen.value = false
}
const pdfReaderRef = ref<InstanceType<typeof PdfReader> | null>(null)
const epubReaderRef = ref<InstanceType<typeof EpubReader> | null>(null)
const mobiReaderRef = ref<InstanceType<typeof MobiReader> | null>(null)
const xlsxReaderRef = ref<InstanceType<typeof XlsxReader> | null>(null)
const markdownReaderRef = ref<InstanceType<typeof MarkdownReader> | null>(null)
const currentPage = ref(1)
const pageCount = ref(0)
const pageInput = ref(1)

const { speaking, paused, supported: ttsSupported, voices: ttsVoices, selectedVoiceURI: ttsSelectedVoiceURI, speak: ttsSpeak, pause: ttsPause, resume: ttsResume, stop: stopTts, setSelectedVoice: ttsSetSelectedVoice } = useBrowserTts()

const ttsLoading = ref(false)
const ttsBusy = ref(false)
const ttsAutoAdvance = ref(true)
const ttsSessionActive = ref(false)
// 用于取消过期的自动翻页/跟随朗读
let ttsAdvanceToken = 0
// 标记当前翻页是否由 TTS 自动触发（避免 onPageChange 误停 TTS）
let ttsAutoTurning = false
// 页面渲染完成信号（EPUB/MOBI 异步翻页）
const pageReadySignal = ref(0)
let speakFollowTimer: ReturnType<typeof setTimeout> | null = null

const showTtsControls = computed(
  () => hasSource.value && (isPdf.value || isEpub.value || isMobi.value || isMarkdown.value),
)

const canGoPrev = computed(() => currentPage.value > 1)

const canGoNext = computed(() => {
  if (pageCount.value > 0) return currentPage.value < pageCount.value
  return !isReaderAtEnd()
})

async function getCurrentPageText(): Promise<string> {
  if (isPdf.value) return (await pdfReaderRef.value?.getPageText?.()) || ''
  if (isEpub.value) return epubReaderRef.value?.getPageText?.() || ''
  if (isMobi.value) return mobiReaderRef.value?.getPageText?.() || ''
  if (isMarkdown.value) return markdownReaderRef.value?.getPageText?.() || ''
  return ''
}

function onReaderPageReady() {
  pageReadySignal.value++
  if (coReadMode.value && currentPage.value >= 1 && !hasCoReadReportedPage(currentPage.value)) {
    void reportVisibleCoReadPage(currentPage.value)
  }
}

async function onTogglePageCoRead() {
  // 移动端点击沉浸共读后自动收起顶部展开工具栏，进入无上下栏的沉浸阅读
  mobileToolsOpen.value = false
  coReadChromeVisible.value = false
  coReadChatOpen.value = false
  if (coReadBusy.value) return
  if (coReadMode.value) {
    stopPageCoRead()
    return
  }
  const current = file.value
  if (!current) return
  if (!isLoggedIn()) {
    ElMessage.warning(t('reader.coReadLoginRequired'))
    return
  }
  coReadBusy.value = true
  try {
    await startPageCoRead(current, store.format || 'epub')
    await reportVisibleCoReadPage(currentPage.value)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('coRead.sessionFailed'))
  } finally {
    coReadBusy.value = false
  }
}

async function reportVisibleCoReadPage(page: number) {
  const text = await waitForPageTextReady()
  if (!text.trim()) return
  const activePage = currentPage.value >= 1 ? currentPage.value : Math.max(1, page)
  const total = Math.max(activePage, pageCount.value || 1)
  await reportReaderPage(activePage, total, text)
}

function isReaderAtEnd(): boolean {
  if (isPdf.value) return pdfReaderRef.value?.isAtEnd?.() ?? false
  if (isEpub.value) return epubReaderRef.value?.isAtEnd?.() ?? false
  if (isMobi.value) return mobiReaderRef.value?.isAtEnd?.() ?? false
  if (isMarkdown.value) return markdownReaderRef.value?.isAtEnd?.() ?? false
  return pageCount.value > 0 && currentPage.value >= pageCount.value
}

function waitForPageReady(fromSignal: number, timeoutMs = 5000): Promise<boolean> {
  if (pageReadySignal.value > fromSignal) return Promise.resolve(true)
  return new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (pageReadySignal.value > fromSignal) {
        clearInterval(timer)
        resolve(true)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, 50)
  })
}

async function waitForPageTextReady(maxAttempts = 20, intervalMs = 120): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const text = await getCurrentPageText()
    if (text.trim()) return text
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return ''
}

function onSelectTtsVoice(e: Event) {
  const target = e.target as HTMLSelectElement
  ttsSetSelectedVoice(target.value)
}

function scheduleSpeakFollow(delayMs = 250) {
  if (speakFollowTimer) clearTimeout(speakFollowTimer)
  const token = ttsAdvanceToken
  speakFollowTimer = setTimeout(async () => {
    if (token !== ttsAdvanceToken || !ttsSessionActive.value) return
    await speakCurrentPage()
  }, delayMs)
}

async function advanceTtsToNextPage(token: number) {
  if (token !== ttsAdvanceToken || !ttsAutoAdvance.value) return
  if (isReaderAtEnd()) {
    ttsSessionActive.value = false
    return
  }

  const beforePage = currentPage.value
  const readySignal = pageReadySignal.value
  ttsAutoTurning = true
  nextPage()

  await waitForPageReady(readySignal)
  await waitForPageTextReady()
  ttsAutoTurning = false

  if (token !== ttsAdvanceToken) return
  // 页码未变化说明已到末尾
  if (currentPage.value <= beforePage) {
    ttsSessionActive.value = false
    return
  }
  await speakCurrentPage()
}

/** 朗读当前页，读完自动翻页并继续朗读下一页（递归链式） */
async function speakCurrentPage() {
  if (!showTtsControls.value) return
  const token = ttsAdvanceToken
  ttsBusy.value = true
  ttsLoading.value = true
  try {
    const text = await waitForPageTextReady()
    if (!text.trim()) {
      if (ttsSessionActive.value) ElMessage.warning(t('reader.ttsNoText'))
      return
    }
    ttsSpeak(text, {
      lang: 'zh-CN',
      onEnd: () => {
        if (token !== ttsAdvanceToken) return
        if (!ttsAutoAdvance.value) {
          ttsSessionActive.value = false
          return
        }
        void advanceTtsToNextPage(token)
      },
      onError: () => {
        ttsAutoTurning = false
        ttsSessionActive.value = false
      },
    })
    if (!speaking.value) {
      ElMessage.warning(t('reader.ttsNoText'))
      ttsSessionActive.value = false
    }
  } catch {
    ElMessage.error(t('reader.ttsError'))
    ttsSessionActive.value = false
  } finally {
    ttsLoading.value = false
    setTimeout(() => {
      ttsBusy.value = false
    }, 400)
  }
}

async function onToggleTts() {
  if (!showTtsControls.value || ttsBusy.value) return

  if (!ttsSupported) {
    ElMessage.warning(t('reader.ttsUnsupported'))
    return
  }
  // 正在朗读且未暂停 → 暂停
  if (speaking.value && !paused.value) {
    ttsPause()
    return
  }
  // 暂停中 → 继续
  if (paused.value) {
    ttsResume()
    return
  }
  // 未开始 → 朗读当前页（带自动翻页链）
  ttsSessionActive.value = true
  await speakCurrentPage()
}

function onSaveToWorkspace() {
  if (!file.value) return
  if (!isLoggedIn()) {
    ElMessage.warning(t('reader.saveBookWorkspaceLoginRequired'))
    router.push({ name: 'reader' })
    return
  }
  store.setPreserveOnLeave(true)
  ElMessage.success(t('reader.saveBookWorkspaceSuccess'))
  router.push({ name: 'workspace', query: { tab: 'read', fromReader: '1' } })
}

function clampScale(value: number) {
  return Math.min(3, Math.max(0.5, +value.toFixed(2)))
}
function zoomIn() {
  scale.value = clampScale(scale.value + 0.2)
}
function zoomOut() {
  scale.value = clampScale(scale.value - 0.2)
}
function applyZoomDelta(delta: number) {
  scale.value = clampScale(scale.value + delta)
}
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  if (!isPdf.value && !isEpub.value && !isMobi.value && !isXlsx.value && !isMarkdown.value) return
  e.preventDefault()
  applyZoomDelta(e.deltaY > 0 ? -0.1 : 0.1)
}
function onPageChange(page: number) {
  const changed = currentPage.value !== page
  currentPage.value = page
  // 仅在真正换页时上报：同一页的重渲染/relocated 不重开批注生成，
  // 否则可见页文本微变会触发 /page + /open 反复重启（不断刷新重载的回归根因）
  if (coReadMode.value && changed) {
    void reportVisibleCoReadPage(page)
  }
  // TTS 自动翻页时不打断
  if (ttsAutoTurning) return
  // 用户手动翻页：停止当前朗读，并跟随到新页面继续
  if (changed && ttsSessionActive.value && (speaking.value || paused.value)) {
    ttsAdvanceToken++
    stopTts()
    scheduleSpeakFollow()
  }
}
function onPageCount(count: number) {
  const prev = pageCount.value
  pageCount.value = count
  if (coReadMode.value && prev < 1 && count >= 1 && currentPage.value >= 1) {
    void reportVisibleCoReadPage(currentPage.value)
  }
}
function goToPage(page: number) {
  if (!Number.isFinite(page) || !pageCount.value) return
  const target = Math.min(Math.max(Math.trunc(page), 1), pageCount.value)
  pageInput.value = target
  if (isPdf.value) {
    pdfReaderRef.value?.goToPage(target)
  } else if (isEpub.value) {
    epubReaderRef.value?.goToPage(target)
  } else if (isMobi.value) {
    mobiReaderRef.value?.goToPage(target)
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.goToPage(target)
  } else if (isMarkdown.value) {
    markdownReaderRef.value?.goToPage(target)
  }
}
watch(currentPage, (page) => {
  pageInput.value = page
})

function nextPage() {
  if (isPdf.value) {
    goToPage(currentPage.value + 1)
  } else if (isEpub.value) {
    epubReaderRef.value?.next()
  } else if (isMobi.value) {
    mobiReaderRef.value?.next()
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.next()
  } else if (isMarkdown.value) {
    markdownReaderRef.value?.next()
  }
}
function prevPage() {
  if (isPdf.value) {
    goToPage(currentPage.value - 1)
  } else if (isEpub.value) {
    epubReaderRef.value?.prev()
  } else if (isMobi.value) {
    mobiReaderRef.value?.prev()
  } else if (isXlsx.value) {
    xlsxReaderRef.value?.prev()
  } else if (isMarkdown.value) {
    markdownReaderRef.value?.prev()
  }
}

function onKeyDown(e: KeyboardEvent) {
  // XLSX uses arrow keys for in-cell cursor and cell navigation while editing.
  if (isXlsx.value) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextPage()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prevPage()
  }
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  nextPage()
}

function goBack() {
  navigateAfterReaderClose(router, {
    query: route.query,
    returnTo: store.returnTo,
    returnProjectId: store.returnProjectId,
    loggedIn: isLoggedIn(),
  })
  store.clearReturnNavigation()
}

onMounted(() => {
  if (!store.file) {
    navigateAfterReaderClose(router, {
      query: route.query,
      returnTo: store.returnTo,
      returnProjectId: store.returnProjectId,
      loggedIn: isLoggedIn(),
    })
    store.clearReturnNavigation()
    return
  }
  applyMobileScalePreference()
  mobileLayoutMq = window.matchMedia(MOBILE_LAYOUT_MQ)
  mobileLayoutMq.addEventListener('change', onMobileLayoutChange)
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  mobileLayoutMq?.removeEventListener('change', onMobileLayoutChange)
  window.removeEventListener('keydown', onKeyDown)
  ttsAdvanceToken++
  if (speakFollowTimer) clearTimeout(speakFollowTimer)
  stopTts()
  ttsSessionActive.value = false
  if (!store.preserveFileOnLeave) {
    store.revoke()
  } else {
    store.setPreserveOnLeave(false)
  }
})
</script>

<style scoped>
.reader-view {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: #3a3a3a;
  overflow: hidden;
  height: 100vh;
  height: 100dvh;
}
.reader-view--night {
  background: #0a0a0a;
}
/* 沉浸式 AI 伴读：仅在移动端默认隐藏顶部工具栏、底栏和阅读器内置底栏，
   桌面端保留顶栏（避免桌面端开启伴读时隐藏工具栏引发容器高度突变和 epub resize 重排） */
.reader-view__co-read-fab {
  display: none;
}
@media (max-width: 767px) {
  .reader-view--co-read-immersive .reader-view__toolbar,
  .reader-view--co-read-immersive .reader-view__mobile-bar,
  .reader-view--co-read-immersive :deep(.epub-reader__nav),
  .reader-view--co-read-immersive :deep(.markdown-reader__nav) {
    display: none !important;
  }
  .reader-view__co-read-fab {
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    right: 12px;
    z-index: 60;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    opacity: 0.72;
    transition: opacity 0.2s ease, background 0.2s ease;
  }
}
.reader-view__co-read-fab:hover,
.reader-view__co-read-fab:focus-within {
  opacity: 1;
  background: rgba(17, 24, 39, 0.85);
}
.reader-view__co-read-fab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
}
.reader-view__co-read-fab-btn--exit {
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.22);
}
.reader-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1f2937;
  color: #e5e7eb;
  border-bottom: 1px solid #111827;
  flex-shrink: 0;
}
.reader-view__toolbar-row {
  display: contents;
}
.rv-btn--mobile-tools {
  display: none;
}
.reader-view__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.reader-view__title-block {
  flex: 1;
  min-width: 0;
}
.reader-view__title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reader-view__subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reader-view__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.reader-view__content--co-read-pdf {
  flex-direction: row;
}
.reader-view__content--co-read-pdf > :first-child {
  flex: 1;
  min-width: 0;
}
.reader-view__co-read-side {
  flex-shrink: 0;
  width: min(100%, 360px);
  max-height: none !important;
  border-top: none !important;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
}
.reader-view__co-read-tray {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.reader-view__co-read-next {
  padding: 12px 16px;
}
.reader-view--night .reader-view__co-read-tray {
  background: #0a0a0a;
  border-top-color: #111827;
}
.reader-view--night .reader-view__co-read-side {
  border-left-color: #111827;
}
.reader-view--night .reader-view__subtitle {
  color: #9ca3af;
}
.reader-view__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.rv-btn--back {
  flex-shrink: 0;
}
.rv-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.rv-field--zoom {
  gap: 4px;
}
.rv-field--pages {
  gap: 5px;
}
.rv-page-input {
  width: 42px;
  padding: 3px 4px;
  border: 1px solid #374151;
  border-radius: 4px;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  text-align: center;
  outline: none;
}
.rv-page-total {
  min-width: 32px;
  color: #d1d5db;
  font-size: 12px;
}
.rv-zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 12px;
  color: #d1d5db;
}
.rv-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.rv-btn:hover:not(:disabled) {
  background: #1f2937;
}
.rv-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rv-btn--sm {
  padding: 2px 8px;
  font-size: 14px;
}
.rv-btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.rv-btn--tts {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  min-width: 92px;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.rv-btn--tts:hover:not(:disabled) {
  background: #1f2937;
}
.rv-btn--tts:disabled {
  opacity: 0.6;
  cursor: progress;
}
.rv-btn--tts-loading {
  cursor: progress;
}
.rv-btn--tts-active {
  border-color: #6366f1;
  color: #a5b4fc;
}
.rv-btn--tts-label {
  white-space: nowrap;
}
.rv-tts-voice-select {
  max-width: 180px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rv-tts-voice-select:hover {
  background: #1f2937;
}
.rv-tts-voice-select option {
  background: #111827;
  color: #e5e7eb;
}
.rv-btn--auto-advance {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.rv-btn--auto-advance:hover {
  background: #1f2937;
}
.rv-btn--auto-advance--on,
.rv-btn--co-read--on {
  border-color: #6366f1;
  color: #a5b4fc;
}
.rv-btn--co-read {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.rv-btn--co-read-label {
  white-space: nowrap;
}
.rv-btn--auto-advance--on:hover,
.rv-btn--co-read--on:hover {
  background: #1e1b4b;
}
.rv-btn--auto-advance-label {
  white-space: nowrap;
}
.rv-btn--theme {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.rv-btn--theme-on {
  border-color: #6366f1;
  color: #fcd34d;
}
.rv-btn--theme-label {
  white-space: nowrap;
}
@media (max-width: 900px) {
  .rv-btn--theme-label {
    display: none;
  }
}
.rv-btn--workspace {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.rv-btn--workspace:hover {
  background: #1f2937;
  border-color: #6366f1;
  color: #a5b4fc;
}
.reader-view__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 16px;
  color: #d1d5db;
  font-size: 14px;
}
.reader-view__unsupported {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: #d1d5db;
}
.reader-view__unsupported-icon {
  width: 56px;
  height: 56px;
  color: #9ca3af;
}
.reader-view__unsupported-title {
  font-size: 16px;
  font-weight: 600;
  color: #f3f4f6;
}
.reader-view__unsupported-desc {
  max-width: 480px;
  font-size: 13px;
  line-height: 1.6;
  color: #9ca3af;
}
.reader-view__unsupported-file {
  font-size: 13px;
  color: #d1d5db;
  word-break: break-all;
}

.reader-view__mobile-bar {
  display: none;
}

@media (max-width: 767px) {
  .reader-view__mobile-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-shrink: 0;
    padding: 6px 8px;
    padding-bottom: max(6px, env(safe-area-inset-bottom));
    background: #1f2937;
    border-top: 1px solid #111827;
    color: #e5e7eb;
    z-index: 10;
  }
  .reader-view__mobile-bar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 40px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #374151;
    background: #111827;
    color: #e5e7eb;
    font-size: 14px;
    cursor: pointer;
    flex: 1;
    max-width: 120px;
  }
  .reader-view__mobile-bar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .reader-view__mobile-bar-center {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .reader-view__mobile-bar-btn--tts {
    min-width: 40px;
    min-height: 40px;
    max-width: none;
    flex: none;
    border-radius: 8px;
    padding: 0;
  }
  .reader-view__mobile-bar-btn--tts-active {
    border-color: #6366f1;
    color: #a5b4fc;
    background: #1e1b4b;
  }
  .reader-view__mobile-bar-page {
    font-size: 12px;
    color: #9ca3af;
    white-space: nowrap;
  }
  /* 使用统一底栏，隐藏 EPUB 组件内重复翻页栏 */
  .reader-view--epub :deep(.epub-reader__nav) {
    display: none;
  }

  .reader-view__toolbar {
    position: relative;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 6px 8px;
    padding-top: max(6px, env(safe-area-inset-top));
  }
  .reader-view__toolbar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
  }
  .rv-btn--mobile-tools {
    display: inline-flex;
    flex-shrink: 0;
    min-width: 40px;
    min-height: 40px;
    justify-content: center;
    padding: 8px;
  }
  .reader-view__head {
    flex: 1;
    min-width: 0;
  }
  .reader-view__title {
    font-size: 13px;
  }
  .reader-view__controls {
    display: none;
    flex: none;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    overflow: visible;
    padding: 8px 0 4px;
    margin-top: 6px;
    border-top: 1px solid #374151;
  }
  .reader-view__controls--mobile-open {
    display: flex;
  }
  .reader-view__controls > * {
    flex-shrink: 0;
  }
  .reader-view__content {
    flex: 1 1 auto;
    min-height: 0;
  }
  .rv-btn--back .rv-btn__label {
    display: none;
  }
  .rv-btn--back {
    min-width: 40px;
    min-height: 40px;
    padding: 8px;
    justify-content: center;
  }
  .rv-btn--sm {
    min-width: 40px;
    min-height: 40px;
    padding: 8px 10px;
    justify-content: center;
    line-height: 1;
  }
  .rv-page-input {
    width: 48px;
    min-height: 36px;
    font-size: 14px;
  }
  /* 移动端底部已有统一翻页栏，顶部隐藏重复页码控件 */
  .rv-field--pages {
    display: none;
  }
  .rv-btn--theme-label,
  .rv-btn--tts-label,
  .rv-btn--auto-advance-label,
  .rv-btn--co-read-label,
  .rv-btn--workspace-label {
    display: none;
  }
  .rv-btn--theme,
  .rv-btn--tts,
  .rv-btn--auto-advance,
  .rv-btn--co-read,
  .rv-btn--workspace {
    min-width: 40px;
    min-height: 40px;
    padding: 8px;
    justify-content: center;
  }
  .rv-tts-voice-select {
    flex: 1 1 140px;
    min-width: 0;
    max-width: 100%;
    min-height: 40px;
    padding: 6px 8px;
    font-size: 12px;
  }
}
</style>
