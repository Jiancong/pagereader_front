import {
  generatePageTts,
  generatePageTtsStream,
  type TtsPageInput,
} from "@/api/agent"
import { safeMediaPlay } from "@/utils/mediaPlayback"

export type TtsItemsMap = Record<number, string>

/** 每批 SSE 请求的页数窗口（含当前页），例如 current..current+10 共 11 页 */
export const TTS_PREFETCH_AHEAD = 10

/** 播放到窗口末尾前 N 页时预取下一批 */
export const TTS_PREFETCH_TRIGGER_BEFORE_END = 3

function pageNumberOf(page: string | TtsPageInput, fallback: number): number {
  if (typeof page === "object" && page.index != null) {
    const index = Number(page.index)
    if (Number.isFinite(index) && index > 0) return index
  }
  return fallback
}

/** 从 pages 列表解析全书末页（优先使用 index 字段，而非数组长度） */
export function resolveTtsTotalPages(pages: Array<string | TtsPageInput>): number {
  let max = 0
  let fallback = 0
  for (const page of pages) {
    fallback += 1
    const index = pageNumberOf(page, fallback)
    if (index > max) max = index
  }
  return max > 0 ? max : pages.length
}

/** 按 1-based 页码区间切片 TTS 请求 payload */
export function sliceTtsPagesInRange(
  pages: Array<string | TtsPageInput>,
  startInclusive: number,
  endInclusive: number,
): Array<string | TtsPageInput> {
  const start = Math.max(1, Math.floor(startInclusive))
  const end = Math.max(start, Math.floor(endInclusive))
  let fallback = 0
  return pages.filter((page) => {
    fallback += 1
    const index = pageNumberOf(page, fallback)
    return index >= start && index <= end
  })
}

export function findNextPlayableTtsPage(fromPage: number, items: TtsItemsMap): number {
  const pages = Object.keys(items)
    .map((key) => Number(key))
    .filter((page) => Number.isFinite(page) && page > fromPage)
    .sort((a, b) => a - b)
  return pages[0] ?? -1
}

export interface TtsStreamProgress {
  ready: number
  total: number
}

export interface TtsSequentialPlayerOptions {
  onItemsUpdate: (items: TtsItemsMap) => void
  onLoadingChange: (loading: boolean) => void
  onProgressChange?: (progress: TtsStreamProgress) => void
  onPlayingChange: (playing: boolean) => void
  onPlayAllActiveChange: (active: boolean) => void
  onBeforePlayPage?: (page: number) => void | Promise<void>
  onPageTimeUpdate?: (page: number, currentTime: number, duration: number) => void
  onFinished?: () => void
  onError: (message: string) => void
  onAutoplayBlocked?: () => void
}

export function createTtsSequentialPlayer(options: TtsSequentialPlayerOptions) {
  let items: TtsItemsMap = {}
  let abortController: AbortController | null = null
  let audioEl: HTMLAudioElement | null = null
  let playAllActive = false
  let playing = false
  let priorityPage = 1
  let totalPages = 0
  let readyCount = 0
  let waitingForPage: number | null = null
  let streamDone = false
  let singlePageMode = false
  let schedulePrefetch: ((currentPage: number) => void) | null = null

  function abortStream() {
    abortController?.abort()
    abortController = null
  }

  function releaseAudio() {
    if (audioEl) {
      audioEl.pause()
      audioEl.onended = null
      audioEl.onerror = null
      audioEl.ontimeupdate = null
      audioEl.onloadedmetadata = null
      audioEl.ondurationchange = null
      audioEl.onplaying = null
      audioEl = null
    }
    if (playing) {
      playing = false
      options.onPlayingChange(false)
    }
  }

  function stop() {
    abortStream()
    releaseAudio()
    playAllActive = false
    waitingForPage = null
    streamDone = false
    singlePageMode = false
    schedulePrefetch = null
    options.onPlayAllActiveChange(false)
    options.onLoadingChange(false)
  }

  function mergeItems(next: TtsItemsMap) {
    items = { ...items, ...next }
    options.onItemsUpdate({ ...items })
  }

  function updateProgress(total?: number) {
    if (total != null && total > 0) totalPages = total
    options.onProgressChange?.({ ready: readyCount, total: totalPages })
  }

  function maybeResumeWaiting(page: number) {
    if (!playAllActive) return
    if (!playing) {
      if (page === priorityPage) {
        void playPage(page)
        return
      }
      if (waitingForPage != null && page === waitingForPage) {
        waitingForPage = null
        void playPage(page)
      }
      return
    }
    if (waitingForPage != null && page === waitingForPage) {
      waitingForPage = null
      void playPage(page)
    }
  }

  function finishPlayback() {
    if (singlePageMode || !playAllActive) {
      playAllActive = false
      options.onPlayAllActiveChange(false)
    } else {
      options.onFinished?.()
    }
  }

  async function playPage(page: number) {
    if (!playAllActive) return

    const url = items[page]
    if (!url) {
      const nextReady = findNextPlayableTtsPage(page - 1, items)
      if (nextReady > 0 && items[nextReady]) {
        await playPage(nextReady)
        return
      }
      if (!streamDone) {
        waitingForPage = page
        return
      }
      finishPlayback()
      return
    }

    schedulePrefetch?.(page)

    await options.onBeforePlayPage?.(page)
    releaseAudio()
    playing = true
    options.onPlayingChange(true)

    audioEl = new Audio(url)
    const playingPage = page
    const emitPageTimeUpdate = () => {
      if (!audioEl || !playAllActive) return
      options.onPageTimeUpdate?.(playingPage, audioEl.currentTime, audioEl.duration)
    }
    audioEl.onloadedmetadata = emitPageTimeUpdate
    audioEl.ondurationchange = emitPageTimeUpdate
    audioEl.ontimeupdate = emitPageTimeUpdate
    audioEl.onplaying = emitPageTimeUpdate
    audioEl.onended = () => {
      releaseAudio()
      if (!playAllActive) return

      if (singlePageMode) {
        finishPlayback()
        return
      }

      const nextPage = findNextPlayableTtsPage(page, items)
      if (nextPage > 0) {
        void playPage(nextPage)
        return
      }

      const expectedNext = page + 1
      if (!streamDone && expectedNext <= totalPages) {
        waitingForPage = expectedNext
        return
      }

      finishPlayback()
    }
    audioEl.onerror = () => {
      stop()
      options.onError("audio playback failed")
    }

    const played = await safeMediaPlay(audioEl)
    if (played) emitPageTimeUpdate()
    if (!played) {
      stop()
      options.onAutoplayBlocked?.()
    }
  }

  async function startStream(params: {
    projectId: string
    userId: number
    pages: Array<string | TtsPageInput>
    priorityPage: number
    voice?: string
    singlePage?: boolean
  }) {
    stop()
    items = {}
    priorityPage = params.priorityPage
    totalPages = resolveTtsTotalPages(params.pages)
    readyCount = 0
    streamDone = false
    singlePageMode = Boolean(params.singlePage)
    playAllActive = true
    waitingForPage = null
    options.onPlayAllActiveChange(true)
    options.onLoadingChange(true)
    updateProgress(totalPages)

    // 保留本次请求自己的 controller。stop() 会清空全局引用，因此 catch
    // 不能再通过 abortController 判断，否则主动取消会被误报为网络错误。
    const requestController = new AbortController()
    abortController = requestController

    const endPage = totalPages
    let requestedUntil = 0
    let activeBatches = 0
    const inflightRanges = new Set<string>()

    function checkStreamDone() {
      if (requestController.signal.aborted) return
      if (requestedUntil >= endPage && activeBatches === 0) {
        streamDone = true
        options.onLoadingChange(false)

        if (waitingForPage != null && items[waitingForPage]) {
          const target = waitingForPage
          waitingForPage = null
          void playPage(target)
        }
      }
    }

    function scheduleNextIfNeeded(currentPage: number) {
      if (singlePageMode || !playAllActive || requestController.signal.aborted) return
      if (requestedUntil >= endPage) return
      const triggerAt = requestedUntil - TTS_PREFETCH_TRIGGER_BEFORE_END
      if (currentPage >= triggerAt) {
        void runBatch(requestedUntil + 1, requestedUntil + 1)
      }
    }

    schedulePrefetch = scheduleNextIfNeeded

    async function runBatch(startPage: number, batchPriority: number): Promise<void> {
      if (requestController.signal.aborted || !playAllActive) return

      const start = Math.max(1, Math.floor(startPage))
      if (start > endPage || start <= requestedUntil) return

      const end = Math.min(start + TTS_PREFETCH_AHEAD, endPage)
      const rangeKey = `${start}-${end}`
      if (inflightRanges.has(rangeKey)) return

      const batchPages = sliceTtsPagesInRange(params.pages, start, end)
      if (!batchPages.length) return

      requestedUntil = end
      inflightRanges.add(rangeKey)
      activeBatches += 1

      try {
        await generatePageTtsStream(
          {
            projectId: params.projectId,
            userId: params.userId,
            pages: batchPages,
            priorityPage: batchPriority,
            voice: params.voice,
          },
          {
            onMeta: (meta) => {
              if (requestController.signal.aborted) return
              if (meta.totalPages != null) {
                updateProgress(Math.max(meta.totalPages, totalPages))
              }
            },
            onPageReady: (data) => {
              if (requestController.signal.aborted) return
              const page = Number(data.page)
              const url = data.item?.url
              if (!Number.isFinite(page) || page <= 0 || !url) return

              const alreadyReady = Boolean(items[page])
              items[page] = url
              if (!alreadyReady) readyCount += 1
              mergeItems({ [page]: url })
              updateProgress(data.total ?? totalPages)
              maybeResumeWaiting(page)
              scheduleNextIfNeeded(page)
            },
            onComplete: (data) => {
              if (requestController.signal.aborted) return

              const updates: TtsItemsMap = {}
              for (const item of data.items ?? []) {
                if (!item.url) continue
                if (!items[item.page]) readyCount += 1
                updates[item.page] = item.url
              }
              if (Object.keys(updates).length) mergeItems(updates)

              options.onLoadingChange(false)
              checkStreamDone()
            },
            onError: (message) => {
              if (requestController.signal.aborted) return
              stop()
              options.onError(message)
            },
          },
          requestController.signal,
        )
      } catch (error) {
        // 后续预取批次不会走外层 try/catch，这里统一拦截（含 HTTP 200 业务错误体）
        if (requestController.signal.aborted) return
        stop()
        options.onError(error instanceof Error ? error.message : String(error))
      } finally {
        inflightRanges.delete(rangeKey)
        activeBatches -= 1
        checkStreamDone()
      }
    }

    try {
      await runBatch(priorityPage, priorityPage)
      if (requestController.signal.aborted) return
      if (abortController === requestController) abortController = null
      checkStreamDone()
    } catch (error) {
      // runBatch 已自行 onError；此处兜底未预期异常
      if (requestController.signal.aborted) return
      if (abortController === requestController) abortController = null
      stop()
      options.onError(error instanceof Error ? error.message : String(error))
    }
  }

  async function playFromCache(
    page: number,
    cachedItems: TtsItemsMap,
    opts?: { singlePage?: boolean },
  ) {
    stop()
    items = { ...cachedItems }
    options.onItemsUpdate({ ...items })
    priorityPage = page
    totalPages = Object.keys(items).length
    readyCount = totalPages
    streamDone = true
    singlePageMode = Boolean(opts?.singlePage)
    playAllActive = true
    options.onPlayAllActiveChange(true)
    await playPage(page)
  }

  async function ensureAllPages(params: {
    projectId: string
    userId: number
    pages: Array<string | TtsPageInput>
    voice?: string
  }): Promise<TtsItemsMap> {
    const result = await generatePageTts(params)
    const out: TtsItemsMap = {}
    for (const item of result.items ?? []) {
      if (item.url) out[item.page] = item.url
    }
    mergeItems(out)
    return out
  }

  return {
    startStream,
    playFromCache,
    ensureAllPages,
    playPage,
    stop,
    getItems: () => items,
  }
}

/** Return the first 1-based page number from a TTS payload list. */
export function firstTtsPageNumber(pages: Array<string | TtsPageInput>): number {
  for (const page of pages) {
    if (typeof page === "object" && page.index != null) {
      const index = Number(page.index)
      if (Number.isFinite(index) && index > 0) return index
    }
  }
  return 1
}

/** Slice TTS page inputs from a 1-based start page (inclusive) to the end. */
export function sliceTtsPagesFrom(
  pages: Array<string | TtsPageInput>,
  startPage: number,
): Array<string | TtsPageInput> {
  const start = Math.max(1, Math.floor(startPage))
  return pages.filter((page) => {
    if (typeof page === "string") return true
    const index = Number(page.index)
    return !Number.isFinite(index) || index >= start
  })
}

/** Pick a single page payload for non-stream immediate playback. */
export function pickTtsPageInput(
  pages: Array<string | TtsPageInput>,
  pageNumber: number,
): Array<string | TtsPageInput> {
  const match = pages.find((page) => {
    if (typeof page === "string") return pageNumber === 1
    return Number(page.index) === pageNumber
  })
  if (match) return [match]
  const index = Math.max(0, pageNumber - 1)
  return pages[index] ? [pages[index]] : []
}
