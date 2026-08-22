// SSE 被网关断开时，轮询 Project / 对话历史拉取已落库的生成结果。
// Local LLM 等长任务可能 30 分钟～3 小时，默认最长轮询 4 小时。
// @author hc @date 2026-08-09

import { getProject, getProjectConversationHistory } from "@/api/feed"
import type { PptQueue } from "@/api/types"
import type { ProjectVo } from "@/api/types"
import {
  isBookCardStreamPayload,
  parseBookCardStreamPayload,
  type BookCardResult,
} from "@/utils/bookCardStream"
import { resolveNovelFromHistory, type NovelResult } from "@/utils/novelStream"
import { resolveOutlineFromHistory, type OutlineResult } from "@/utils/outlineStream"
import { collectDeckUrls } from "@/utils/projectCommunity"
import { resolvePptDataFromStreamComplete, type PptStreamCompleteResult } from "@/utils/pptCompletePayload"

/** 断线后轮询最长等待（Local LLM 可达 3 小时，留 1 小时余量） */
export const GENERATION_POLL_MAX_WAIT_MS = 4 * 60 * 60 * 1000

/** 默认轮询间隔 */
export const GENERATION_POLL_INTERVAL_MS = 10_000

export interface PollProjectPptOptions {
  /** 最长轮询毫秒，默认 4 小时 */
  maxWaitMs?: number
  /** 轮询间隔毫秒，默认 10 秒 */
  intervalMs?: number
  signal?: AbortSignal
}

export type GenerationPollResult =
  | { kind: "ppt"; ppt: PptStreamCompleteResult }
  | { kind: "novel"; novel: NovelResult }
  | { kind: "outline"; outline: OutlineResult }
  | { kind: "card"; card: BookCardResult }

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

function tryParseJson(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw !== "string") return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function pickBookCardPayloadFromHistory(history: unknown[]): unknown | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i]
    if (!row || typeof row !== "object") continue
    const rec = row as Record<string, unknown>
    if (rec.role !== "assistant") continue

    const meta = tryParseJson(rec.metadata)
    if (meta && isBookCardStreamPayload(meta)) return meta

    const content = tryParseJson(rec.content)
    if (content && isBookCardStreamPayload(content)) return content
  }
  return null
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

async function loadProjectContext(projectId: string): Promise<{
  project: ProjectVo
  history: unknown[]
}> {
  const [project, history] = await Promise.all([
    getProject(projectId),
    getProjectConversationHistory(projectId).catch(() => []),
  ])
  return { project, history }
}

/** 按 queue 从 Project / 历史拉取已落库的生成结果 */
export async function fetchProjectGenerationIfReady(
  projectId: string,
  queue?: PptQueue,
): Promise<GenerationPollResult | null> {
  const { project, history } = await loadProjectContext(projectId)

  if (!queue || queue === "DOCUMENT" || queue === "CARD") {
    const ppt = await fetchProjectPptIfReady(projectId)
    if (ppt?.pptData && queue !== "CARD") {
      return { kind: "ppt", ppt }
    }
  }

  if (!queue || queue === "NOVEL") {
    const novel = await resolveNovelFromHistory(history, project)
    if (novel?.markdown) return { kind: "novel", novel }
  }

  if (!queue || queue === "OUTLINE") {
    const outline = await resolveOutlineFromHistory(history, project)
    if (outline?.markdown || outline?.sections?.length) {
      return { kind: "outline", outline }
    }
  }

  if (!queue || queue === "CARD") {
    const cardPayload = pickBookCardPayloadFromHistory(history)
    const card = cardPayload ? parseBookCardStreamPayload(cardPayload) : null
    if (card) return { kind: "card", card }

    if (queue === "CARD") {
      const ppt = await fetchProjectPptIfReady(projectId)
      if (ppt?.pptData) return { kind: "ppt", ppt }
    }
  }

  if (!queue) {
    const ppt = await fetchProjectPptIfReady(projectId)
    if (ppt?.pptData) return { kind: "ppt", ppt }
  }

  return null
}

/** SSE 提前断开时轮询，直到 deck 就绪或超时 */
export async function pollProjectPptAfterStreamDisconnect(
  projectId: string,
  options: PollProjectPptOptions = {},
): Promise<PptStreamCompleteResult | null> {
  const result = await pollProjectGenerationAfterStreamDisconnect(projectId, "DOCUMENT", options)
  return result?.kind === "ppt" ? result.ppt : null
}

/** SSE 提前断开时轮询，直到对应 queue 的产物就绪或超时 */
export async function pollProjectGenerationAfterStreamDisconnect(
  projectId: string,
  queue?: PptQueue,
  options: PollProjectPptOptions = {},
): Promise<GenerationPollResult | null> {
  const maxWaitMs = options.maxWaitMs ?? GENERATION_POLL_MAX_WAIT_MS
  const intervalMs = options.intervalMs ?? GENERATION_POLL_INTERVAL_MS
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
    const resolved = await fetchProjectGenerationIfReady(projectId, queue)
    if (resolved) return resolved
    await sleep(Math.min(intervalMs, deadline - Date.now()), options.signal)
  }
  return null
}
