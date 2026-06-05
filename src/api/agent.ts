// Agent 对话流（SSE）模块
// @author hc @date 2026-06-03

import { buildUrl, ApiError } from "./client"
import { getToken } from "./token"
import type { ChatStreamReq } from "./types"

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
  if (status === "complete" || status === "ppt_complete") return status
  if (status === "error") return "error"
  if (status === "in_progress" || p.phase != null) return "progress"

  return w || wire
}

function isProgressEvent(event: string, data: unknown): boolean {
  const e = normalizeEventName(event)
  if (e === "progress" || e === "ppt_progress") return true
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

export async function chatStream(
  body: ChatStreamReq,
  cb: ChatStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "text/event-stream")
  const token = getToken()
  if (token) headers.set("Authorization", token)

  const res = await fetch(buildUrl("/agent/chat-stream"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    try {
      const body = JSON.parse(text) as { code?: number | string; message?: string; msg?: string }
      const code = body.code ?? res.status
      const msg = body.message || body.msg || text || `请求失败：${res.status}`
      throw new ApiError(code, msg)
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

    if (event === "complete" || event === "ppt_complete") {
      await cb.onComplete?.(data)
    } else if (event === "error") {
      const msg =
        typeof data === "string"
          ? data
          : (data as { message?: string })?.message ?? "生成失败"
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
