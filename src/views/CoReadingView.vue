<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <button type="button" class="rounded-lg p-2 hover:bg-secondary" :title="t('coRead.back')" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-sm font-semibold sm:text-base">{{ store.fileName || t('reader.coReadTitle') }}</h1>
        <p v-if="store.totalChapters" class="text-xs text-muted-foreground">
          {{ t('coRead.chapterOf', { n: store.currentChapterIndex + 1, total: store.totalChapters }) }}
        </p>
      </div>
      <button
        v-if="store.phase === 'reading' || store.phase === 'discussing'"
        type="button"
        class="rounded-lg p-2 hover:bg-secondary"
        @click="navOpen = true"
      >
        <List class="h-5 w-5" />
      </button>
    </header>

    <div v-if="store.sessionError" class="mx-auto max-w-lg px-4 py-12 text-center">
      <p class="text-muted-foreground">{{ store.sessionError }}</p>
      <button type="button" class="mt-4 text-primary underline" @click="goBack">{{ t('coRead.back') }}</button>
    </div>

    <div v-else-if="store.phase === 'parsing'" class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 class="h-6 w-6 animate-spin" />
      {{ t('coRead.parsing') }}
    </div>

    <CoReadSetup
      v-else-if="store.phase === 'idle' || store.phase === 'ready'"
      :file-name="store.fileName"
      :chapters="store.chapters"
      :creating="creatingSession"
      @pick="onPickFile"
      @start="onStartSession"
    />

    <div v-else-if="store.phase === 'finished'" class="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <BookHeart class="h-16 w-16 text-primary" />
      <p class="text-lg font-semibold">{{ t('coRead.finishBook') }}</p>
      <button type="button" class="rounded-xl bg-primary px-6 py-2.5 text-primary-foreground" @click="goBack">
        {{ t('coRead.back') }}
      </button>
    </div>

    <template v-else-if="currentChapter">
      <div class="relative flex flex-1 min-h-0">
        <CoReadChapterNav
          :open="navOpen"
          :chapters="store.chapters"
          :current-index="store.currentChapterIndex"
          @close="navOpen = false"
          @select="onSelectChapter"
        />
        <CoReadChapterPane
          v-if="store.phase === 'reading'"
          :chapter="currentChapter"
          :annotations="chapterAnnotations"
          @draft="onDraft"
          @scroll="onScroll"
        />
      </div>

      <CoReadReplyTray
        v-if="store.phase === 'reading' && chapterOpenDone"
        :reply-count="replyDraftCount"
        :loading="store.repliesSending"
        @send="onSendReplies"
      />

      <CoReadChatPanel
        v-if="store.phase === 'discussing'"
        :messages="store.chatMessages"
        :chat-loading="chatLoading"
        @send="onChatSend"
      />

      <div
        v-if="store.phase === 'discussing'"
        class="border-t border-border bg-card px-4 py-4 sm:px-6"
      >
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
          @click="onNextChapter"
        >
          {{ store.isLastChapter ? t('coRead.finishBook') : t('coRead.nextChapter') }}
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>

      <div
        v-if="store.openingChapter"
        class="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center"
      >
        <span class="rounded-full bg-card px-4 py-2 text-xs shadow-lg">{{ t('coRead.loadingAnnotations') }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, BookHeart, ChevronRight, List, Loader2 } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import CoReadSetup from '@/components/coReading/CoReadSetup.vue'
import CoReadChapterPane from '@/components/coReading/CoReadChapterPane.vue'
import CoReadReplyTray from '@/components/coReading/CoReadReplyTray.vue'
import CoReadChatPanel from '@/components/coReading/CoReadChatPanel.vue'
import CoReadChapterNav from '@/components/coReading/CoReadChapterNav.vue'
import { useCoReadingStore } from '@/stores/coReading'
import { useCoReadFileStore } from '@/stores/coReadFile'
import * as coReadingApi from '@/api/coReading'
import { chapterApiNumber, parseCoReadFile } from '@/utils/coReadChapter'
import { ApiError } from '@/api/client'
import type { CoReadAnnotationKind } from '@/types/coReading'

defineOptions({ name: 'CoReadingView' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useCoReadingStore()
const fileStore = useCoReadFileStore()

const navOpen = ref(false)
const creatingSession = ref(false)
const chapterOpenDone = ref(false)
const chatLoading = ref(false)
const lastReportedScroll = ref(-1)
let openAbort: AbortController | null = null
let streamAbort: AbortController | null = null
let progressTimer: ReturnType<typeof setTimeout> | null = null

const currentChapter = computed(() => store.getCachedChapter(store.currentChapterIndex))

const chapterAnnotations = computed(() =>
  store.annotations.filter((a) => a.chapterIndex === store.currentChapterIndex),
)

const replyDraftCount = computed(() => {
  const withText = store.annotations.filter(
    (a) => a.chapterIndex === store.currentChapterIndex && String(a.myReply || '').trim(),
  ).length
  return withText
})

function goBack() {
  const dest = fileStore.returnTo
  if (dest === 'reader-hub') router.push({ name: 'reader' })
  else if (dest === 'landing') router.push({ name: 'landing' })
  else router.push({ name: 'workspace' })
}

async function bootstrapFromFileStore() {
  if (!fileStore.file || !fileStore.chapters.length) return
  store.setFromParse(fileStore.file.name, fileStore.chapters)
  for (const ch of fileStore.chapters) store.cacheChapter(ch)
}

async function onPickFile(file: File) {
  store.phase = 'parsing'
  store.parseError = ''
  try {
    const { chapters, fileHash, format } = await parseCoReadFile(file)
    fileStore.setParsed(file, chapters, fileHash, format)
    fileStore.setReturnTo(fileStore.returnTo || 'workspace')
    store.setFromParse(file.name, chapters)
    for (const ch of chapters) store.cacheChapter(ch)
  } catch (e) {
    const code = e instanceof Error ? e.message : ''
    if (code === 'CO_READ_UNSUPPORTED') {
      ElMessage.warning(t('coRead.unsupportedFormat'))
    } else {
      ElMessage.error(t('coRead.parseFailed'))
    }
    store.phase = 'idle'
  }
}

async function ensureChapterTextUploaded(chapterIndex: number) {
  if (!store.sessionId) return
  if (store.chapterTextUploaded[chapterIndex]) return
  const ch = store.getCachedChapter(chapterIndex)
  if (!ch) return
  const n = chapterApiNumber(chapterIndex)
  await coReadingApi.uploadChapterText(store.sessionId, n, ch.paragraphs)
  store.chapterTextUploaded[chapterIndex] = true
}

async function openChapterStream(chapterIndex: number) {
  if (!store.sessionId) return
  openAbort?.abort()
  openAbort = new AbortController()
  store.openingChapter = true
  chapterOpenDone.value = false
  store.annotations = store.annotations.filter((a) => a.chapterIndex !== chapterIndex)
  store.loadDraftsForChapter(chapterIndex)

  const n = chapterApiNumber(chapterIndex)
  try {
    await ensureChapterTextUploaded(chapterIndex)
    await coReadingApi.openChapter(
      store.sessionId,
      n,
      {
        onAnnotationAnchor: (data) => {
          store.upsertAnnotation({
            id: data.id,
            chapterIndex: data.chapterIndex ?? chapterIndex,
            anchor: data.anchor ?? { paragraphIndex: 0 },
            kind: (data.kind as CoReadAnnotationKind) || 'reaction',
            content: data.content ?? '',
            streaming: true,
          })
        },
        onAnnotationDelta: (data) => store.appendAnnotationDelta(data.id, data.delta),
        onAnnotationDone: (data) => store.finalizeAnnotation(data.id),
        onChapterDone: () => {
          chapterOpenDone.value = true
        },
        onError: (msg) => ElMessage.error(msg),
      },
      openAbort.signal,
    )
    if (!chapterOpenDone.value) chapterOpenDone.value = true
    store.phase = 'reading'
  } catch (e) {
    if (openAbort.signal.aborted) return
    const msg = e instanceof ApiError ? e.message : t('coRead.openFailed')
    ElMessage.error(msg)
    chapterOpenDone.value = true
  } finally {
    store.openingChapter = false
  }
}

async function onStartSession(startChapterIndex: number) {
  if (!fileStore.file || !fileStore.chapters.length) return
  creatingSession.value = true
  try {
    const meta = fileStore.chapters.map((c) => ({
      index: c.index,
      title: c.title,
      charCount: c.charCount,
    }))
    const { sessionId } = await coReadingApi.createSession({
      fileHash: fileStore.fileHash,
      fileName: fileStore.file.name,
      format: fileStore.format,
      chapters: meta,
      startChapter: chapterApiNumber(startChapterIndex),
    })
    store.setSessionCreated(sessionId, startChapterIndex)
    store.phase = 'reading'
    await openChapterStream(startChapterIndex)
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : t('coRead.sessionFailed')
    ElMessage.error(msg)
  } finally {
    creatingSession.value = false
  }
}

function onDraft(annotationId: string, text: string) {
  store.saveDraft(annotationId, store.currentChapterIndex, text)
}

function onScroll(percent: number) {
  if (!store.sessionId) return
  if (Math.abs(percent - lastReportedScroll.value) < 8) return
  if (progressTimer) clearTimeout(progressTimer)
  progressTimer = setTimeout(() => {
    lastReportedScroll.value = percent
    void coReadingApi.reportProgress(store.sessionId, store.currentChapterIndex, percent).catch(() => undefined)
  }, 2000)
}

async function onSendReplies() {
  if (!store.sessionId) return
  store.repliesSending = true
  streamAbort?.abort()
  streamAbort = new AbortController()
  const n = chapterApiNumber(store.currentChapterIndex)
  const replies = store.annotations
    .filter((a) => a.chapterIndex === store.currentChapterIndex && String(a.myReply || '').trim())
    .map((a) => ({ annotationId: a.id, text: String(a.myReply).trim() }))

  store.clearChapterDiscussion()
  store.phase = 'discussing'

  let assistantId = `assistant-${Date.now()}`
  try {
    await coReadingApi.sendReplies(
      store.sessionId,
      n,
      replies,
      {
        onReplyAck: (data) => store.markReplySent(data.annotationId),
        onReplyResponse: (data) => {
          assistantId = `reply-${data.annotationId}`
          store.appendChatDelta('assistant', data.delta, {
            annotationId: data.annotationId,
            messageId: assistantId,
          })
        },
        onChatDelta: (data) => {
          assistantId = `chat-${Date.now()}`
          store.appendChatDelta('assistant', data.delta, { messageId: assistantId })
        },
        onError: (msg) => ElMessage.error(msg),
      },
      streamAbort.signal,
    )
    store.finalizeChatStream(assistantId)
  } catch (e) {
    if (!streamAbort.signal.aborted) {
      ElMessage.error(e instanceof ApiError ? e.message : t('coRead.repliesFailed'))
    }
  } finally {
    store.repliesSending = false
  }
}

async function onChatSend(text: string) {
  if (!store.sessionId) return
  chatLoading.value = true
  store.addUserChatMessage(text)
  const messageId = `assistant-chat-${Date.now()}`
  try {
    await coReadingApi.sendChat(store.sessionId, text, {
      onChatDelta: (data) => store.appendChatDelta('assistant', data.delta, { messageId }),
      onError: (msg) => ElMessage.error(msg),
    })
    store.finalizeChatStream(messageId)
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : t('coRead.chatFailed'))
  } finally {
    chatLoading.value = false
  }
}

async function onNextChapter() {
  if (store.isLastChapter) {
    store.phase = 'finished'
    return
  }
  const next = store.currentChapterIndex + 1
  store.currentChapterIndex = next
  store.phase = 'reading'
  chapterOpenDone.value = false
  await openChapterStream(next)
}

function onSelectChapter(index: number) {
  navOpen.value = false
  if (index === store.currentChapterIndex) return
  store.currentChapterIndex = index
  void openChapterStream(index)
}

async function restoreSession(sessionId: string) {
  try {
    const detail = await coReadingApi.getSession(sessionId)
    store.applySessionDetail(detail, fileStore.chapters.length ? fileStore.chapters : undefined)
    for (const ch of store.chapters) {
      if (ch.paragraphs.length) store.cacheChapter(ch)
    }
    await openChapterStream(store.currentChapterIndex)
  } catch (e) {
    store.sessionError =
      e instanceof ApiError && e.code === 404
        ? t('coRead.sessionNotFound')
        : e instanceof ApiError
          ? e.message
          : t('coRead.sessionFailed')
  }
}

onMounted(async () => {
  const sessionQuery = String(route.query.session || '').trim()
  if (sessionQuery) {
    store.resetSession()
    await restoreSession(sessionQuery)
    return
  }
  if (fileStore.file && fileStore.chapters.length) {
    await bootstrapFromFileStore()
    return
  }
  store.phase = 'idle'
})

onBeforeUnmount(() => {
  openAbort?.abort()
  streamAbort?.abort()
  if (progressTimer) clearTimeout(progressTimer)
})
</script>
