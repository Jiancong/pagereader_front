// Agent 对话流（SSE）模块
// @author hc @date 2026-06-03

import { buildUrl, ApiError, postJson } from "./client"
import { getToken } from "./token"
import { getSavedLocale } from "@/composables/useAppLocale"
import { getApiContextHeaders } from "@/utils/apiRequestContext"
import type {
  ChatStreamCancelReq,
  ChatStreamReq,
  PptQueue,
  YoutubePptStreamReq,
  YoutubeTranscriptReq,
  YoutubeTranscriptResult,
} from "./types"

const SESSION_KEY = "pr_session_id"

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = window.localStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      window.crypto?.randomUUID?.() ??
      `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export interface ChatStreamCallbacks {
  onEvent?: (event: string, data: unknown, raw: string) => void
  /** SSE 连接建立、开始读流时触发（用于立刻刷新侧边栏历史） */
  onStarted?: () => void
  onProgress?: (data: unknown) => void
  onComplete?: (data: unknown) => void | Promise<void>
  onError?: (message: string, data?: unknown) => void
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function normalizeEventName(wire: string): string {
  return String(wire || "").trim().toLowerCase()
}

/** 与 BFF 一致：wire 为 message 时按 JSON 内 status/event 归一化 */
function resolveEffectiveEvent(wire: string, payload: unknown): string {
  const w = normalizeEventName(wire)
  if (!payload || typeof payload !== "object") return w || wire

  const p = payload as Record<string, unknown>
  if (w && w !== "message") return w

  const emb = p.event ?? p.type
  if (typeof emb === "string") {
    const e = normalizeEventName(emb)
    if (e) return e
  }

  const status = normalizeEventName(String(p.status ?? ""))
  if (status === "complete" || status === "ppt_complete" || status === "design_complete") {
    return status
  }
  const state = normalizeEventName(String(p.state ?? ""))
  if (state === "ppt_complete") return "ppt_complete"
  if (state === "book_card_complete") return "design_complete"
  if (status === "error") return "error"
  if (status === "in_progress" || p.phase != null) return "progress"

  return w || wire
}

function isProgressEvent(event: string, data: unknown): boolean {
  const e = normalizeEventName(event)
  if (e === "progress" || e === "ppt_progress" || e === "ppt_ping") return true
  if (data && typeof data === "object") {
    const p = data as Record<string, unknown>
    const st = normalizeEventName(String(p.status ?? ""))
    if (st === "in_progress" || p.phase != null) return true
  }
  return false
}

function parseBlock(block: string): { event: string; data: string } | null {
  let event = "message"
  const dataLines: string[] = []
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
  }
  if (dataLines.length === 0 && event === "message") return null
  return { event, data: dataLines.join("\n") }
}

function authStreamHeaders(): Headers {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "text/event-stream")
  const token = getToken()
  if (token) headers.set("Authorization", token)
  Object.entries(getApiContextHeaders()).forEach(([key, value]) => {
    if (value) headers.set(key, value)
  })
  return headers
}

async function readSseResponse(res: Response, cb: ChatStreamCallbacks = {}): Promise<void> {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    try {
      const body = JSON.parse(text) as {
        code?: number | string
        message?: string
        msg?: string
        error?: string
      }
      const code = body.code ?? res.status
      const msg = body.message || body.msg || body.error || text || `请求失败：${res.status}`
      throw new ApiError(Number(code) || res.status, msg)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new Error(text || `请求失败：${res.status}`)
    }
  }

  cb.onStarted?.()

  const dispatch = async (block: string) => {
    const parsed = parseBlock(block)
    if (!parsed) return
    const data = safeParse(parsed.data)
    const event = resolveEffectiveEvent(parsed.event, data)
    cb.onEvent?.(event, data, parsed.data)

    if (event === "complete" || event === "ppt_complete" || event === "design_complete") {
      await cb.onComplete?.(data)
    } else if (event === "error") {
      const msg =
        typeof data === "string"
          ? data
          : (data as { message?: string; error?: string })?.message ??
            (data as { error?: string })?.error ??
            "生成失败"
      cb.onError?.(msg, data)
    } else if (isProgressEvent(event, data)) {
      cb.onProgress?.(data)
    }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
    let idx
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      if (block.trim()) await dispatch(block)
    }
  }
  if (buffer.trim()) await dispatch(buffer)
}

export function mapPptQueueToBffQueue(queue: PptQueue): "FAST" | "SLOW" {
  return queue === "CARD" ? "FAST" : "SLOW"
}

export function isLikelyYoutubeUrl(raw: string): boolean {
  const t = raw.trim()
  return /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i.test(t)
}

function resolveApiLocale(): string {
  return getSavedLocale() === "en" ? "en" : "zh-CN"
}

function buildYoutubeStreamBody(req: YoutubePptStreamReq): Record<string, unknown> {
  const queue =
    req.queue === "FAST" || req.queue === "SLOW"
      ? req.queue
      : mapPptQueueToBffQueue(req.queue ?? "DOCUMENT")

  return {
    youtube_url: req.youtube_url.trim(),
    project_id: req.project_id,
    ...(req.message?.trim() ? { message: req.message.trim() } : {}),
    queue,
    stream_request_id: req.stream_request_id ?? String(Date.now()),
    locale: req.locale ?? resolveApiLocale(),
    ...(req.languages?.length ? { languages: req.languages } : {}),
  }
}

function buildYoutubeTranscriptBody(req: YoutubeTranscriptReq): Record<string, unknown> {
  return {
    youtube_url: req.youtube_url.trim(),
    project_id: req.project_id,
    locale: req.locale ?? resolveApiLocale(),
    ...(req.languages?.length ? { languages: req.languages } : {}),
  }
}

export async function youtubePptStream(
  req: YoutubePptStreamReq,
  cb: ChatStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<{ streamRequestId: string }> {
  const streamRequestId = req.stream_request_id ?? String(Date.now())
  const body = buildYoutubeStreamBody({ ...req, stream_request_id: streamRequestId })

  const res = await fetch(buildUrl("/agent/ppt/youtube-stream"), {
    method: "POST",
    headers: authStreamHeaders(),
    body: JSON.stringify(body),
    signal,
  })

  await readSseResponse(res, cb)
  return { streamRequestId }
}

export async function fetchYoutubeTranscript(
  req: YoutubeTranscriptReq,
  signal?: AbortSignal,
): Promise<YoutubeTranscriptResult> {
  const headers = authStreamHeaders()
  headers.set("Accept", "application/json")

  const res = await fetch(buildUrl("/agent/ppt/youtube-transcript"), {
    method: "POST",
    headers,
    body: JSON.stringify(buildYoutubeTranscriptBody(req)),
    signal,
  })

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiError(res.status, `请求失败：${res.status}`)
  }

  const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null

  const root = asRecord(json)
  const payload =
    root && root.code === 0 && root.data != null && typeof root.data === "object"
      ? (root.data as YoutubeTranscriptResult)
      : (json as YoutubeTranscriptResult)

  if (!res.ok || payload.success === false) {
    const msg =
      payload.error ||
      root?.message ||
      root?.msg ||
      (typeof json === "object" && json && "error" in (json as object)
        ? String((json as { error?: string }).error)
        : "") ||
      `请求失败：${res.status}`
    throw new ApiError(res.status, msg)
  }

  return payload
}

export async function cancelChatStream(
  req: ChatStreamCancelReq,
  signal?: AbortSignal,
): Promise<void> {
  const headers = authStreamHeaders()
  headers.set("Accept", "application/json")

  const res = await fetch(buildUrl("/agent/chat-stream/cancel"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      project_id: req.project_id,
      stream_request_id: req.stream_request_id,
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    try {
      const body = JSON.parse(text) as { message?: string; msg?: string; error?: string }
      throw new ApiError(
        res.status,
        body.message || body.msg || body.error || text || `请求失败：${res.status}`,
      )
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new Error(text || `请求失败：${res.status}`)
    }
  }
}

export async function chatStream(
  body: ChatStreamReq,
  cb: ChatStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(buildUrl("/agent/chat-stream"), {
    method: "POST",
    headers: authStreamHeaders(),
    body: JSON.stringify(body),
    signal,
  })

  await readSseResponse(res, cb)
}

export interface TtsPageInput {
  index?: number
  title?: string
  subtitle?: string
  text?: string
  content?: string | string[]
}

export interface TtsPageItem {
  page: number
  filename?: string
  url?: string
  localPath?: string
  textLength?: number
  error?: string
}

export interface TtsPagesResult {
  provider?: string
  items: TtsPageItem[]
}

export async function generatePageTts(params: {
  projectId: string
  userId: number
  pages: Array<string | TtsPageInput>
  voice?: string
}): Promise<TtsPagesResult> {
  return postJson<TtsPagesResult>("/agent/audio/tts/pages", {
    projectId: params.projectId,
    userId: params.userId,
    voice: params.voice ?? "zh-CN-XiaoxiaoNeural",
    pages: params.pages,
  })
}
