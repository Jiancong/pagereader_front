import { onBeforeUnmount } from "vue"
import { projectApi } from "@/api"

const DEVICE_ID_KEY = "pr_device_id"
const THROTTLE_MS = 8000 // 进度节流：同页 8s 内最多上报一次
const FINISH_THRESHOLD_PERCENT = 95 // 后端逻辑对齐：≥95% 自动 FINISHED

interface ReporterOptions {
  /** 获取当前 deck 总页数 */
  getTotalSlides: () => number
  /** 是否登录（仅用于决定是否带 deviceId） */
  getIsLoggedIn?: () => boolean
}

function readOrCreateDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
      window.localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

export function useReadingProgressReporter(
  projectIdGetter: () => string,
  options: ReporterOptions,
) {
  let sessionProjectId = ""
  let sessionStartTs = 0
  let lastReportedSlide = -1
  let lastReportedTs = 0
  let accumulatedMinutes = 0
  let pendingTimer: ReturnType<typeof setTimeout> | null = null
  const deviceId = readOrCreateDeviceId()

  function clearPendingTimer() {
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
  }

  function currentPercent(slideIndex: number): number {
    const total = Math.max(1, options.getTotalSlides() || 0)
    const idx = Math.max(0, slideIndex)
    return Math.min(100, Math.round(((idx + 1) / total) * 100))
  }

  function buildPayload(percent: number, addMinutes = 0) {
    const payload: {
      progressPercent: number
      addMinutes?: number
      status?: "FINISHED"
      deviceId?: string
    } = { progressPercent: percent }
    if (addMinutes > 0) payload.addMinutes = addMinutes
    if (percent >= FINISH_THRESHOLD_PERCENT) payload.status = "FINISHED"
    // 匿名用户必须带 deviceId 才能去重；登录用户后端用 userId，但多带也无害
    const logged = options.getIsLoggedIn?.() ?? false
    if (!logged && deviceId) payload.deviceId = deviceId
    return payload
  }

  function reportEnter(id: string) {
    if (!id) return
    // 切项目前先结算上一段
    if (sessionProjectId && sessionProjectId !== id) {
      flushAccumulated()
    }
    sessionProjectId = id
    sessionStartTs = Date.now()
    lastReportedSlide = -1
    lastReportedTs = 0
    // 进入即上报一次（进度 0，addMinutes 0，让后端记录读者 UV）
    void safeReport(id, buildPayload(0, 0))
  }

  function reportSlideChange(slideIndex: number) {
    const id = projectIdGetter() || sessionProjectId
    if (!id) return
    if (slideIndex === lastReportedSlide) return
    const now = Date.now()
    if (now - lastReportedTs < THROTTLE_MS) {
      // 节流窗口内的最后一次变更也要落地，避免卡在某中间页
      clearPendingTimer()
      pendingTimer = setTimeout(() => {
        pendingTimer = null
        reportSlideChange(slideIndex)
      }, THROTTLE_MS + 50)
      return
    }
    lastReportedSlide = slideIndex
    lastReportedTs = now
    const percent = currentPercent(slideIndex)
    void safeReport(id, buildPayload(percent, 0))
  }

  /** 计算自上次上报以来的累计分钟，落库一次并清零计时 */
  function flushAccumulated() {
    const id = sessionProjectId
    if (!id || !sessionStartTs) return
    const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStartTs) / 60000))
    sessionStartTs = Date.now()
    if (elapsedMin <= 0) return
    accumulatedMinutes += elapsedMin
    const minutesToReport = accumulatedMinutes
    accumulatedMinutes = 0
    const percent =
      lastReportedSlide >= 0 ? currentPercent(lastReportedSlide) : 0
    void safeReport(id, buildPayload(percent, minutesToReport))
  }

  function reportLeave() {
    clearPendingTimer()
    flushAccumulated()
  }

  async function safeReport(id: string, payload: Parameters<typeof projectApi.reportReadingProgress>[1]) {
    try {
      await projectApi.reportReadingProgress(id, payload)
    } catch {
      // 静默：阅读进度失败不应影响阅读体验
    }
  }

  onBeforeUnmount(() => {
    clearPendingTimer()
    reportLeave()
  })

  return {
    reportEnter,
    reportSlideChange,
    reportLeave,
  }
}
