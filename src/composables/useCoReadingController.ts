// 沉浸式共读：会话 / 批注 / 章末讨论（阅读 UI 在 ReaderView）
// @author hc @date 2026-10-16

import { computed, ref, onBeforeUnmount } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"
import * as coReadingApi from "@/api/coReading"
import { chapterApiNumber, parseCoReadFile, sha256HexFile, wireChapterToStoreIndex } from "@/utils/coReadChapter"
import { ApiError } from "@/api/client"
import { useCoReadingStore } from "@/stores/coReading"
import { useCoReadFileStore } from "@/stores/coReadFile"
import { useReaderFileStore } from "@/stores/reader"
import type { ReaderReturnTo } from "@/utils/readerReturnRoute"
import type { CoReadAnnotationKind } from "@/types/coReading"

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
  let lastPageReport: { page: number; pageTotal: number; text: string } | null = null
let openAbort: AbortController | null = null
let streamAbort: AbortController | null = null
let lastProgressSentAt = 0

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
    store.annotations.filter((a) => {
      if (a.chapterIndex !== store.currentChapterIndex) return false
      const page = lastReportedPage.value
      if (page >= 1 && a.pageIndex !== undefined && a.pageIndex !== page) return false
      return true
    }),
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
    if (!ch?.paragraphs.length) return
    const n = chapterApiNumber(chapterIndex)
    await coReadingApi.uploadChapterText(store.sessionId, n, ch.paragraphs)
    store.chapterTextUploaded[chapterIndex] = true
  }

  function isOnCoReadReader(): boolean {
    return (
      router.currentRoute.value.name === "reader-open" &&
      router.currentRoute.value.query.coRead === "1"
    )
  }

  function handleOpenSseError(msg: string, data?: unknown) {
    const code = String((data as { code?: string })?.code ?? "")
    if (code === "chapter_text_missing") return
    if (code === "generation_interrupted") {
      store.pageOpenError = code
      return
    }
    if (code === "rate_limited") {
      ElMessage.warning(t("coRead.rateLimited"))
      return
    }
    if (code === "upstream_unavailable") {
      ElMessage.error(t("coRead.upstreamUnavailable"))
      return
    }
    ElMessage.error(msg || t("coRead.openFailed"))
  }

  /** 当前页 open（SSE）；翻页会先 abort 上一条流 */
  async function runChapterOpenStream(chapterIndex: number, opts?: { force?: boolean }) {
    if (!store.sessionId) return
    openAbort?.abort()
    openAbort = new AbortController()
    const signal = openAbort.signal
    const expectedPage = lastReportedPage.value
    store.openingChapter = true
    if (!opts?.force) store.clearPageOpenError()
    const n = chapterApiNumber(chapterIndex)
    const callbacks = {
      shouldAcceptPage: (pageIndex?: number) =>
        pageIndex === undefined || expectedPage < 1 || pageIndex === expectedPage,
      onChatIntro: (data: { delta: string }) => store.appendPageIntro(data.delta),
      onAnnotationAnchor: (data: {
        id: string
        chapterIndex?: number
        pageIndex?: number
        anchor?: { paragraphIndex: number; quote?: string }
        kind?: CoReadAnnotationKind
        content?: string
      }) => {
        store.upsertAnnotation({
          id: data.id,
          chapterIndex: wireChapterToStoreIndex(data.chapterIndex, chapterIndex),
          pageIndex: data.pageIndex,
          anchor: data.anchor ?? { paragraphIndex: 0 },
          kind: data.kind ?? "reaction",
          content: data.content ?? "",
          streaming: true,
        })
      },
      onAnnotationDelta: (data: { id: string; delta: string }) =>
        store.appendAnnotationDelta(data.id, data.delta),
      onAnnotationDone: (data: { id: string; content?: string }) =>
        store.finalizeAnnotation(data.id, data.content),
      onChapterDone: (data: { annotationCount?: number }) => {
        store.chapterOpenDone = true
        const page = lastReportedPage.value
        const localCount = store.annotations.filter(
          (a) =>
            a.chapterIndex === chapterIndex &&
            (page < 1 || a.pageIndex === undefined || a.pageIndex === page),
        ).length
        const wireCount = typeof data.annotationCount === "number" ? data.annotationCount : null
        store.pageOpenEmpty = wireCount !== null ? wireCount === 0 : localCount === 0
      },
    }
    let pageTextMissing = false
    try {
      void ensureChapterTextUploaded(chapterIndex)
      await coReadingApi.openChapter(
        store.sessionId,
        n,
        {
          ...callbacks,
          onError: (msg, data) => {
            const code = String((data as { code?: string })?.code ?? "")
            if (code === "chapter_text_missing") {
              pageTextMissing = true
              return
            }
            handleOpenSseError(msg, data)
          },
        },
        signal,
        { force: opts?.force, retryOnce: false },
      )
      if (pageTextMissing && !signal.aborted && lastPageReport?.text) {
        await coReadingApi.reportPageRead(store.sessionId, n, {
          pageIndex: lastPageReport.page,
          pageTotal: lastPageReport.pageTotal,
          text: lastPageReport.text,
        })
        if (signal.aborted) return
        pageTextMissing = false
        await coReadingApi.openChapter(
          store.sessionId,
          n,
          {
            ...callbacks,
            onError: (msg, data) => {
              const code = String((data as { code?: string })?.code ?? "")
              if (code === "chapter_text_missing") {
                pageTextMissing = true
                return
              }
              handleOpenSseError(msg, data)
            },
          },
          signal,
          { force: opts?.force, retryOnce: false },
        )
      }
      if (pageTextMissing) {
        store.pageOpenError = "chapter_text_missing"
      }
      if (!store.chapterOpenDone) store.chapterOpenDone = true
    } catch (e) {
      if (signal.aborted) return
      if (e instanceof ApiError && e.code === 429) {
        ElMessage.warning(t("coRead.rateLimited"))
      } else {
        ElMessage.error(e instanceof ApiError ? e.message : t("coRead.openFailed"))
      }
      store.chapterOpenDone = true
    } finally {
      if (!signal.aborted) store.openingChapter = false
    }
  }

  /** 先打开书籍（ReaderView），AI 批注在后台 streaming */
  async function enterReadingChapter(chapterIndex: number) {
    if (!store.sessionId) return
    store.currentChapterIndex = chapterIndex
    store.phase = "reading"
    lastReportedPage.value = -1
    lastPageReport = null
    store.chapterOpenDone = false
    store.clearPageOpenError()
    store.pageIntroText = ""
    store.annotations = store.annotations.filter((a) => a.chapterIndex !== chapterIndex)
    store.loadDraftsForChapter(chapterIndex)

    if (!isOnCoReadReader()) {
      await navigateToReaderView()
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
      await enterReadingChapter(startChapterIndex)
    } catch (e) {
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.sessionFailed"))
    } finally {
      creatingSession.value = false
    }
  }

  let pageCoReadFileKey = ""

  /** 整本书当作一章，批注按阅读器页码走 /page + /open，不跳章、不换阅读器 */
  async function startPageCoRead(file: File, format: string) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (store.sessionId && pageCoReadFileKey === key) {
      store.phase = "reading"
      store.currentChapterIndex = 0
      return
    }
    const fileHash = await sha256HexFile(file)
    const { sessionId } = await coReadingApi.createSession({
      fileHash,
      fileName: file.name,
      format: format || "epub",
      chapters: [{ index: 0, title: file.name, charCount: Math.max(1, file.size) }],
      startChapter: 1,
    })
    store.resetSession()
    store.fileName = file.name
    store.chapters = [{ index: 0, title: file.name, paragraphs: [], charCount: file.size }]
    store.setSessionCreated(sessionId, 0)
    store.phase = "reading"
    pageCoReadFileKey = key
  }

  function stopPageCoRead() {
    openAbort?.abort()
    streamAbort?.abort()
    store.openingChapter = false
    store.phase = "idle"
  }

  function onDraft(annotationId: string, text: string) {
    store.saveDraft(annotationId, store.currentChapterIndex, text)
  }

  async function reportReaderPage(page: number, pageTotal: number, text: string) {
    if (!store.sessionId) return
    const body = text.trim().slice(0, 8000)
    if (!body) return
    if (page === lastReportedPage.value && lastPageReport?.text === body) return
    lastReportedPage.value = page
    lastPageReport = { page, pageTotal, text: body }
    const chapterNumber = chapterApiNumber(store.currentChapterIndex)
    try {
      await coReadingApi.reportPageRead(store.sessionId, chapterNumber, {
        pageIndex: page,
        pageTotal,
        text: body,
      })
    } catch (e) {
      lastReportedPage.value = -1
      lastPageReport = null
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    store.annotations = store.annotations.filter((a) => a.chapterIndex !== store.currentChapterIndex)
    store.chapterOpenDone = false
    store.clearPageOpenError()
    store.pageIntroText = ""
    store.pageOpenEmpty = false
    void runChapterOpenStream(store.currentChapterIndex)
    // progress BFF 限流 ≤1 次/10s；EPUB resize/relocated 会重复触发 page-change
    const now = Date.now()
    const percent = pageTotal ? Math.min(100, Math.round((page / pageTotal) * 100)) : 0
    if (now - lastProgressSentAt >= 10000) {
      lastProgressSentAt = now
      void coReadingApi.reportProgress(store.sessionId, store.currentChapterIndex, percent).catch(() => undefined)
    }
  }

  async function repostLastPage(): Promise<void> {
    if (!store.sessionId || !lastPageReport?.text) return
    const n = chapterApiNumber(store.currentChapterIndex)
    await coReadingApi.reportPageRead(store.sessionId, n, {
      pageIndex: lastPageReport.page,
      pageTotal: lastPageReport.pageTotal,
      text: lastPageReport.text,
    })
  }

  async function retryCurrentPageOpen() {
    if (!store.sessionId || lastReportedPage.value < 1) return
    store.clearPageOpenError()
    store.annotations = store.annotations.filter(
      (a) =>
        !(
          a.chapterIndex === store.currentChapterIndex &&
          (a.pageIndex === undefined || a.pageIndex === lastReportedPage.value)
        ),
    )
    store.chapterOpenDone = false
    store.pageIntroText = ""
    try {
      await repostLastPage()
    } catch (e) {
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    await runChapterOpenStream(store.currentChapterIndex)
  }

  async function forceRegenerateCurrentPage() {
    if (!store.sessionId || lastReportedPage.value < 1) return
    store.clearPageOpenError()
    store.annotations = store.annotations.filter(
      (a) =>
        !(
          a.chapterIndex === store.currentChapterIndex &&
          (a.pageIndex === undefined || a.pageIndex === lastReportedPage.value)
        ),
    )
    store.chapterOpenDone = false
    store.pageIntroText = ""
    try {
      await repostLastPage()
    } catch (e) {
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    await runChapterOpenStream(store.currentChapterIndex, { force: true })
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
    await enterReadingChapter(next)
  }

  async function onSelectChapter(index: number) {
    navOpen.value = false
    if (index === store.currentChapterIndex) return
    await enterReadingChapter(index)
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
      await enterReadingChapter(store.currentChapterIndex)
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
    startPageCoRead,
    stopPageCoRead,
    onSendReplies,
    onChatSend,
    onNextChapter,
    onSelectChapter,
    onPickFile,
    restoreSession,
    enterReadingChapter,
    navigateToReaderView,
    retryCurrentPageOpen,
    forceRegenerateCurrentPage,
  }
}
