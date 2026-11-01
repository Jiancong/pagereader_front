// 沉浸式共读：会话 / 批注 / 章末讨论（阅读 UI 在 ReaderView）
// @author hc @date 2026-10-16

import { computed, ref, onBeforeUnmount } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"
import * as coReadingApi from "@/api/coReading"
import { getSavedLocale } from "@/composables/useAppLocale"
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
  /** 翻页代际：只有最新一次 /page 成功后才能 open，避免 open 读到尚未落库的游标 */
  let pageReportGeneration = 0
  let pagePostAbort: AbortController | null = null
  /** 同页上报节流：重渲染/measure 抖动会让同页文本微变，无限重开 open 流（回归防护） */
  let lastReportAt = 0

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

  type OpenStreamResult = "ok" | "missing" | "aborted"

  /** 当前页 open 一次（SSE）。不在这里补 /page，避免和尚未返回的 page 请求交错。 */
  async function runChapterOpenStream(
    chapterIndex: number,
    opts?: { force?: boolean },
  ): Promise<OpenStreamResult> {
    if (!store.sessionId) return "aborted"
    openAbort?.abort()
    openAbort = new AbortController()
    const signal = openAbort.signal
    const expectedPage = lastReportedPage.value
    store.openingChapter = true
    if (!opts?.force) store.clearPageOpenError()
    const n = chapterApiNumber(chapterIndex)
    let replayedFromCache = false
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
      onChapterDone: (data: { annotationCount?: number; replayed?: boolean }) => {
        if (data.replayed) replayedFromCache = true
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
      if (signal.aborted) return "aborted"
      if (pageTextMissing) return "missing"
      // 若后端直接 replayed 了之前在中文界面下缓存的批注，而当前界面已切为英文，
      // 自动清掉本页中文缓存并以 force=true 按当前语言重新生成一次
      if (replayedFromCache && !opts?.force && getSavedLocale() === "en") {
        const pageAnns = store.annotations.filter(
          (a) =>
            a.chapterIndex === chapterIndex &&
            (expectedPage < 1 || a.pageIndex === undefined || a.pageIndex === expectedPage),
        )
        const hasChineseReplayed = pageAnns.some((a) => /[\u4e00-\u9fff]/.test(a.content || ""))
        if (hasChineseReplayed) {
          store.annotations = store.annotations.filter((a) => !pageAnns.includes(a))
          store.pageIntroText = ""
          store.chapterOpenDone = false
          return await runChapterOpenStream(chapterIndex, { force: true })
        }
      }
      if (!store.chapterOpenDone) store.chapterOpenDone = true
      return "ok"
    } catch (e) {
      if (signal.aborted) return "aborted"
      if (e instanceof ApiError && e.code === 429) {
        ElMessage.warning(t("coRead.rateLimited"))
      } else {
        ElMessage.error(e instanceof ApiError ? e.message : t("coRead.openFailed"))
      }
      store.chapterOpenDone = true
      return "ok"
    } finally {
      if (!signal.aborted) store.openingChapter = false
    }
  }

  function isAbortError(e: unknown): boolean {
    return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError"
  }

  async function postReaderPage(
    page: number,
    pageTotal: number,
    text: string,
  ): Promise<coReadingApi.PageReadResult | null> {
    if (!store.sessionId) return null
    pagePostAbort?.abort()
    const controller = new AbortController()
    pagePostAbort = controller
    const chapterNumber = chapterApiNumber(store.currentChapterIndex)
    return coReadingApi.reportPageRead(
      store.sessionId,
      chapterNumber,
      { pageIndex: page, pageTotal, text },
      controller.signal,
    )
  }

  /**
   * chapter_text_missing：用当前页非空正文再 await 一次 /page，stored_chars > 0 后再 open 一次。
   * 没有正文则静默，不再连打 open。
   */
  async function recoverMissingPageThenOpen(
    generation: number,
    opts?: { force?: boolean },
  ): Promise<void> {
    const report = lastPageReport
    const text = report?.text.trim() ?? ""
    if (!text || generation !== pageReportGeneration) return
    let res: coReadingApi.PageReadResult | null = null
    try {
      res = await postReaderPage(report!.page, report!.pageTotal, text)
    } catch (e) {
      if (generation !== pageReportGeneration || isAbortError(e)) return
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    if (generation !== pageReportGeneration) return
    if (!coReadingApi.pageReadStored(res)) return
    const result = await runChapterOpenStream(store.currentChapterIndex, opts)
    if (generation !== pageReportGeneration) return
    if (result === "missing") store.pageOpenError = "chapter_text_missing"
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
    const locale = getSavedLocale() === "en" ? "en" : "zh"
    const key = `${file.name}:${file.size}:${file.lastModified}:${locale}`
    // 重置上一次上报缓存，保证重开伴读时当前页必定触发上报与 open
    lastReportedPage.value = -1
    lastPageReport = null
    lastReportAt = 0
    if (store.sessionId && pageCoReadFileKey === key) {
      store.phase = "reading"
      store.currentChapterIndex = 0
      return
    }
    const rawHash = await sha256HexFile(file)
    // 英文与中文会话隔离不同 fileHash（保持 64 位合法 hex），防止英文界面下后端回放旧中文 session 缓存
    const fileHash = locale === "en" && rawHash.length >= 4 ? `${rawHash.slice(0, -2)}e1` : rawHash
    const { sessionId } = await coReadingApi.createSession({
      fileHash,
      fileName: file.name,
      format: format || "epub",
      chapters: [{ index: 0, title: file.name, charCount: Math.max(1, file.size) }],
      startChapter: 1,
      uiLocale: locale,
    })
    store.resetSession()
    store.fileName = file.name
    store.chapters = [{ index: 0, title: file.name, paragraphs: [], charCount: file.size }]
    store.setSessionCreated(sessionId, 0)
    store.phase = "reading"
    pageCoReadFileKey = key
  }

  function stopPageCoRead() {
    pageReportGeneration += 1
    pagePostAbort?.abort()
    openAbort?.abort()
    streamAbort?.abort()
    lastReportedPage.value = -1
    lastPageReport = null
    lastReportAt = 0
    store.openingChapter = false
    store.phase = "idle"
  }

  function onDraft(annotationId: string, text: string) {
    store.saveDraft(annotationId, store.currentChapterIndex, text)
  }

  /** 卡片内「保存」：优先后端持久化（挂到批注记录），失败降级本地草稿 */
  async function saveAnnotationReply(annotationId: string, text: string) {
    const body = String(text || "").trim()
    if (!annotationId || !body) return
    const ann = store.annotations.find((a) => a.id === annotationId)
    store.saveDraft(annotationId, store.currentChapterIndex, body)
    store.markReplySaved(annotationId)
    try {
      await coReadingApi.saveAnnotationNote(store.sessionId, annotationId, {
        text: body,
        quote: ann?.anchor?.quote,
        pageIndex: ann?.pageIndex,
        paragraphIndex: ann?.anchor?.paragraphIndex ?? 0,
      })
    } catch (e) {
      // 后端暂未上线/网络异常：本地草稿已兜底，不打断用户；404/405 视为接口未实现
      const code = e instanceof ApiError ? e.code : 0
      if (code !== 404 && code !== 405) {
        console.warn("[co-read] save annotation note failed, kept local draft", e)
      }
    }
  }

  /** 卡片内「删除留言」：清空本地并同步删除后端记录 */
  async function deleteAnnotationReply(annotationId: string) {
    if (!annotationId) return
    const ann = store.annotations.find((a) => a.id === annotationId)
    store.deleteReplyDraft(annotationId, store.currentChapterIndex)
    try {
      await coReadingApi.saveAnnotationNote(store.sessionId, annotationId, {
        text: "",
        quote: ann?.anchor?.quote,
        pageIndex: ann?.pageIndex,
        paragraphIndex: ann?.anchor?.paragraphIndex ?? 0,
      })
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 0
      if (code !== 404 && code !== 405) {
        console.warn("[co-read] delete annotation note failed", e)
      }
    }
  }

  /** 卡片内「再聊一句」：在该批注的卡片线程内继续对话（不跳底部面板、不切阶段） */
  async function chatAboutAnnotation(annotationId: string, text: string) {
    if (!store.sessionId) return
    const ann = store.annotations.find((a) => a.id === annotationId)
    const userText = String(text || "").trim()
    if (userText) {
      store.saveDraft(annotationId, store.currentChapterIndex, userText)
      store.markReplySaved(annotationId)
    }
    // 该批注已有线程 → 追加追问（纯文本）；首轮 → 带引文上下文
    const hasThread = store.chatMessages.some((m) => m.annotationId === annotationId)
    const quote = String(ann?.anchor?.quote || "").trim()
    const fallback = String(ann?.content || "").trim()
    const prompt = hasThread ? userText : userText || quote || fallback
    if (!prompt) return
    const composed =
      !hasThread && quote && userText && !userText.includes(quote)
        ? `${userText}\n\n「${quote}」`
        : prompt
    // 保持 reading 阶段：沉浸模式与卡片不动，对话直接发生在卡片线程里
    await onChatSend(composed, { annotationId })
  }

  function clearPageAnnotations() {
    store.annotations = store.annotations.filter((a) => a.chapterIndex !== store.currentChapterIndex)
    store.chapterOpenDone = false
    store.clearPageOpenError()
    store.pageIntroText = ""
    store.pageOpenEmpty = false
  }

  function noteReadingProgress(page: number, pageTotal: number) {
    if (!store.sessionId) return
    const now = Date.now()
    const percent = pageTotal ? Math.min(100, Math.round((page / pageTotal) * 100)) : 0
    if (now - lastProgressSentAt < 10000) return
    lastProgressSentAt = now
    void coReadingApi.reportProgress(store.sessionId, store.currentChapterIndex, percent).catch(() => undefined)
  }

  /** 等本次 /page 返回且 stored_chars > 0，再 open 一次。过期翻页不再 open。 */
  async function openIfPageStored(
    generation: number,
    res: coReadingApi.PageReadResult | null,
    opts?: { force?: boolean },
  ) {
    if (generation !== pageReportGeneration) return
    if (!coReadingApi.pageReadStored(res)) return
    const result = await runChapterOpenStream(store.currentChapterIndex, opts)
    if (generation !== pageReportGeneration) return
    if (result === "missing") await recoverMissingPageThenOpen(generation, opts)
  }

  /** 该页码是否已上报过（供渲染回调跳过同页重复上报） */
  function hasReportedPage(page: number): boolean {
    return page >= 1 && page === lastReportedPage.value
  }

  async function reportReaderPage(page: number, pageTotal: number, text: string) {
    if (!store.sessionId) return
    const body = (text || "").trim().slice(0, 8000)
    if (!body) return
    if (!Number.isFinite(page) || page < 1) return
    if (!Number.isFinite(pageTotal) || pageTotal < 1) return
    if (page === lastReportedPage.value && lastPageReport?.text === body) return
    // 同页短时间内的重复上报直接忽略：可见页文本会随滚动/重渲染微变，
    // 若放开会让 /page + /open 无限重启（表现为批注反复清空重载）
    if (page === lastReportedPage.value && Date.now() - lastReportAt < 1500) return

    const generation = ++pageReportGeneration
    openAbort?.abort()
    lastReportedPage.value = page
    lastPageReport = { page, pageTotal, text: body }
    lastReportAt = Date.now()
    clearPageAnnotations()

    let res: coReadingApi.PageReadResult | null = null
    try {
      res = await postReaderPage(page, pageTotal, body)
    } catch (e) {
      if (generation !== pageReportGeneration || isAbortError(e)) return
      lastReportedPage.value = -1
      lastPageReport = null
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    if (generation !== pageReportGeneration) return
    if (!coReadingApi.pageReadStored(res)) {
      lastReportedPage.value = -1
      lastPageReport = null
      return
    }
    noteReadingProgress(page, pageTotal)
    await openIfPageStored(generation, res)
  }

  async function retryCurrentPageOpen() {
    await regenerateCurrentPage(false)
  }

  async function forceRegenerateCurrentPage() {
    await regenerateCurrentPage(true)
  }

  async function regenerateCurrentPage(force: boolean) {
    const report = lastPageReport
    if (!store.sessionId || !report?.text.trim() || report.page < 1 || report.pageTotal < 1) return
    const generation = ++pageReportGeneration
    openAbort?.abort()
    store.annotations = store.annotations.filter(
      (a) =>
        !(
          a.chapterIndex === store.currentChapterIndex &&
          (a.pageIndex === undefined || a.pageIndex === report.page)
        ),
    )
    store.chapterOpenDone = false
    store.clearPageOpenError()
    store.pageIntroText = ""
    store.pageOpenEmpty = false

    let res: coReadingApi.PageReadResult | null = null
    try {
      res = await postReaderPage(report.page, report.pageTotal, report.text)
    } catch (e) {
      if (generation !== pageReportGeneration || isAbortError(e)) return
      ElMessage.error(e instanceof ApiError ? e.message : t("coRead.pageSyncFailed"))
      return
    }
    await openIfPageStored(generation, res, force ? { force: true } : undefined)
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

  async function onChatSend(text: string, opts?: { annotationId?: string }) {
    if (!store.sessionId) return
    chatLoading.value = true
    store.addUserChatMessage(text, { annotationId: opts?.annotationId })
    const messageId = `assistant-chat-${Date.now()}`
    try {
      await coReadingApi.sendChat(
        store.sessionId,
        text,
        {
          onChatDelta: (data) =>
            store.appendChatDelta("assistant", data.delta, {
              messageId,
              annotationId: opts?.annotationId,
            }),
          onError: (msg) => ElMessage.error(msg),
        },
        undefined,
        { annotationId: opts?.annotationId },
      )
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
    pagePostAbort?.abort()
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
    saveAnnotationReply,
    deleteAnnotationReply,
    chatAboutAnnotation,
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
    hasReportedPage,
  }
}
