// 沉浸式共读：会话 / 批注 / 章末讨论（阅读 UI 在 ReaderView）
// @author hc @date 2026-10-16

import { computed, ref, onBeforeUnmount } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"
import * as coReadingApi from "@/api/coReading"
import { chapterApiNumber, parseCoReadFile } from "@/utils/coReadChapter"
import { ApiError } from "@/api/client"
import { useCoReadingStore } from "@/stores/coReading"
import { useCoReadFileStore } from "@/stores/coReadFile"
import { useReaderFileStore } from "@/stores/reader"
import type { CoReadAnnotationKind } from "@/types/coReading"
import type { ReaderReturnTo } from "@/utils/readerReturnRoute"

export function syncCoReadFileToReaderStore() {
  const coReadFile = useCoReadFileStore()
  const readerFile = useReaderFileStore()
  if (!coReadFile.file) return
  readerFile.setFile(coReadFile.file)
  const rt = coReadFile.returnTo
  const nav: ReaderReturnTo =
    rt === "reader-hub" || rt === "landing" || rt === "workspace" ? rt : "workspace"
  readerFile.setReturnNavigation(nav)
}

export function useCoReadingController() {
  const { t } = useI18n()
  const router = useRouter()
  const store = useCoReadingStore()
  const fileStore = useCoReadFileStore()

  const navOpen = ref(false)
  const creatingSession = ref(false)
  const chatLoading = ref(false)
  const lastReportedPage = ref(-1)
  let openAbort: AbortController | null = null
  let streamAbort: AbortController | null = null

  const currentChapter = computed(() => store.getCachedChapter(store.currentChapterIndex))
  const coReadSpineIndex = computed(() => currentChapter.value?.epubSpineIndex)
  const coReadChapterLabel = computed(() => {
    if (!store.totalChapters) return ""
    return t("coRead.chapterOf", {
      n: store.currentChapterIndex + 1,
      total: store.totalChapters,
    })
  })

  const chapterAnnotations = computed(() =>
    store.annotations.filter((a) => a.chapterIndex === store.currentChapterIndex),
  )

  const replyDraftCount = computed(() =>
    store.annotations.filter(
      (a) => a.chapterIndex === store.currentChapterIndex && String(a.myReply || "").trim(),
    ).length,
  )

  async function navigateToReaderView() {
    syncCoReadFileToReaderStore()
    const returnTo = fileStore.returnTo || "workspace"
    await router.push({
      name: "reader-open",
      query: { coRead: "1", returnTo },
    })
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

  async function openChapterStream(chapterIndex: number, opts?: { navigate?: boolean }) {
    if (!store.sessionId) return
    openAbort?.abort()
    openAbort = new AbortController()
    lastReportedPage.value = -1
    store.openingChapter = true
    store.chapterOpenDone = false
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
              kind: (data.kind as CoReadAnnotationKind) || "reaction",
              content: data.content ?? "",
              streaming: true,
            })
          },
          onAnnotationDelta: (data) => store.appendAnnotationDelta(data.id, data.delta),
          onAnnotationDone: (data) => store.finalizeAnnotation(data.id),
          onChapterDone: () => {
            store.chapterOpenDone = true
          },
          onError: (msg) => ElMessage.error(msg),
        },
        openAbort.signal,
      )
      if (!store.chapterOpenDone) store.chapterOpenDone = true
      store.phase = "reading"
      const onReader =
        router.currentRoute.value.name === "reader-open" &&
        router.currentRoute.value.query.coRead === "1"
      if (opts?.navigate ?? !onReader) {
        await navigateToReaderView()
      }
    } catch (e) {
      if (openAbort.signal.aborted) return
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.openFailed"))
      store.chapterOpenDone = true
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
      await openChapterStream(startChapterIndex)
    } catch (e) {
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.sessionFailed"))
    } finally {
      creatingSession.value = false
    }
  }

  function onDraft(annotationId: string, text: string) {
    store.saveDraft(annotationId, store.currentChapterIndex, text)
  }

  async function reportReaderPage(page: number, pageTotal: number, text: string) {
    if (!store.sessionId) return
    if (page === lastReportedPage.value) return
    lastReportedPage.value = page
    const chapterNumber = chapterApiNumber(store.currentChapterIndex)
    void coReadingApi.reportPageRead(store.sessionId, chapterNumber, {
      pageIndex: page,
      pageTotal,
      text: text.slice(0, 8000),
    })
    const percent = pageTotal ? Math.min(100, Math.round((page / pageTotal) * 100)) : 0
    void coReadingApi.reportProgress(store.sessionId, store.currentChapterIndex, percent).catch(() => undefined)
  }

  async function onSendReplies() {
    if (!store.sessionId) return
    store.repliesSending = true
    streamAbort?.abort()
    streamAbort = new AbortController()
    const n = chapterApiNumber(store.currentChapterIndex)
    const replies = store.annotations
      .filter((a) => a.chapterIndex === store.currentChapterIndex && String(a.myReply || "").trim())
      .map((a) => ({ annotationId: a.id, text: String(a.myReply).trim() }))

    store.clearChapterDiscussion()
    store.phase = "discussing"

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
            store.appendChatDelta("assistant", data.delta, {
              annotationId: data.annotationId,
              messageId: assistantId,
            })
          },
          onChatDelta: (data) => {
            assistantId = `chat-${Date.now()}`
            store.appendChatDelta("assistant", data.delta, { messageId: assistantId })
          },
          onError: (msg) => ElMessage.error(msg),
        },
        streamAbort.signal,
      )
      store.finalizeChatStream(assistantId)
    } catch (e) {
      if (!streamAbort.signal.aborted) {
        ElMessage.error(e instanceof ApiError ? e.message : t("coRead.repliesFailed"))
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
        onChatDelta: (data) => store.appendChatDelta("assistant", data.delta, { messageId }),
        onError: (msg) => ElMessage.error(msg),
      })
      store.finalizeChatStream(messageId)
    } catch (e) {
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.chatFailed"))
    } finally {
      chatLoading.value = false
    }
  }

  async function onNextChapter() {
    if (store.isLastChapter) {
      store.phase = "finished"
      await router.push({ name: "co-reading", query: { finished: "1" } })
      return
    }
    const next = store.currentChapterIndex + 1
    store.currentChapterIndex = next
    store.phase = "reading"
    await openChapterStream(next)
  }

  async function onSelectChapter(index: number) {
    navOpen.value = false
    if (index === store.currentChapterIndex) return
    store.currentChapterIndex = index
    await openChapterStream(index)
  }

  async function onPickFile(file: File) {
    store.phase = "parsing"
    try {
      const { chapters, fileHash, format } = await parseCoReadFile(file)
      fileStore.setParsed(file, chapters, fileHash, format)
      store.setFromParse(file.name, chapters)
      for (const ch of chapters) store.cacheChapter(ch)
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      if (code === "CO_READ_UNSUPPORTED") ElMessage.warning(t("coRead.unsupportedFormat"))
      else ElMessage.error(t("coRead.parseFailed"))
      store.phase = "idle"
    }
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
          ? t("coRead.sessionNotFound")
          : e instanceof ApiError
            ? e.message
            : t("coRead.sessionFailed")
    }
  }

  onBeforeUnmount(() => {
    openAbort?.abort()
    streamAbort?.abort()
  })

  return {
    store,
    fileStore,
    navOpen,
    creatingSession,
    chapterOpenDone: computed(() => store.chapterOpenDone),
    chatLoading,
    currentChapter,
    coReadSpineIndex,
    coReadChapterLabel,
    chapterAnnotations,
    replyDraftCount,
    onStartSession,
    onDraft,
    reportReaderPage,
    onSendReplies,
    onChatSend,
    onNextChapter,
    onSelectChapter,
    onPickFile,
    restoreSession,
    openChapterStream,
    navigateToReaderView,
  }
}
