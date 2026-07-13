import {
  generatePageTts,
  generatePageTtsStream,
  type TtsPageInput,
} from "@/api/agent"
import { safeMediaPlay } from "@/utils/mediaPlayback"

export type TtsItemsMap = Record<number, string>

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

  function abortStream() {
    abortController?.abort()
    abortController = null
  }

  function releaseAudio() {
    if (audioEl) {
      audioEl.pause()
      audioEl.onended = null
      audioEl.onerror = null
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

    await options.onBeforePlayPage?.(page)
    releaseAudio()
    playing = true
    options.onPlayingChange(true)

    audioEl = new Audio(url)
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
    totalPages = params.pages.length
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

    try {
      await generatePageTtsStream(
        {
          projectId: params.projectId,
          userId: params.userId,
          pages: params.pages,
          priorityPage: params.priorityPage,
          voice: params.voice,
        },
        {
          onMeta: (meta) => {
            if (requestController.signal.aborted) return
            if (meta.totalPages != null) updateProgress(meta.totalPages)
          },
          onPageReady: (data) => {
            if (requestController.signal.aborted) return
            const page = Number(data.page)
            const url = data.item?.url
            if (!Number.isFinite(page) || page <= 0 || !url) return
            items[page] = url
            readyCount += 1
            mergeItems({ [page]: url })
            updateProgress(data.total ?? totalPages)
            maybeResumeWaiting(page)
          },
          onComplete: (data) => {
            if (requestController.signal.aborted) return
            const merged: TtsItemsMap = {}
            for (const item of data.items ?? []) {
              if (item.url) merged[item.page] = item.url
            }
            if (Object.keys(merged).length) mergeItems(merged)
            streamDone = true
            options.onLoadingChange(false)

            if (waitingForPage != null && items[waitingForPage]) {
              const target = waitingForPage
              waitingForPage = null
              void playPage(target)
            }
          },
          onError: (message) => {
            if (requestController.signal.aborted) return
            stop()
            options.onError(message)
          },
        },
        requestController.signal,
      )
      if (requestController.signal.aborted) return
      if (abortController === requestController) abortController = null
      streamDone = true
      options.onLoadingChange(false)
    } catch (error) {
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
