// SSE 被网关断开时，轮询 Project / 对话历史拉取已落库的 PPT 结果。
// @author hc @date 2026-08-09

import { getProject, getProjectConversationHistory } from "@/api/feed"
import { collectDeckUrls } from "@/utils/projectCommunity"
import { resolvePptDataFromStreamComplete, type PptStreamCompleteResult } from "@/utils/pptCompletePayload"

export interface PollProjectPptOptions {
  /** 最长轮询毫秒，默认 30 分钟 */
  maxWaitMs?: number
  /** 轮询间隔毫秒，默认 8 秒 */
  intervalMs?: number
  signal?: AbortSignal
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

/** 从 Project + 对话历史尝试解析已生成的 PPT deck */
export async function fetchProjectPptIfReady(
  projectId: string,
): Promise<PptStreamCompleteResult | null> {
  const [proj, hist] = await Promise.all([
    getProject(projectId),
    getProjectConversationHistory(projectId).catch(() => []),
  ])
  const urls = collectDeckUrls(proj, hist)
  for (const ppt_data_url of urls) {
    const resolved = await resolvePptDataFromStreamComplete({ projectId, ppt_data_url })
    if (resolved?.pptData) return resolved
  }
  if (proj.lifecycleStatus === "COMPLETED" && proj.configFilePath) {
    const resolved = await resolvePptDataFromStreamComplete({
      projectId,
      ppt_data_url: proj.configFilePath,
    })
    if (resolved?.pptData) return resolved
  }
  return null
}

/** SSE 提前断开时轮询，直到 deck 就绪或超时 */
export async function pollProjectPptAfterStreamDisconnect(
  projectId: string,
  options: PollProjectPptOptions = {},
): Promise<PptStreamCompleteResult | null> {
  const maxWaitMs = options.maxWaitMs ?? 30 * 60_000
  const intervalMs = options.intervalMs ?? 8_000
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
    const resolved = await fetchProjectPptIfReady(projectId)
    if (resolved?.pptData) return resolved
    await sleep(Math.min(intervalMs, deadline - Date.now()), options.signal)
  }
  return null
}
