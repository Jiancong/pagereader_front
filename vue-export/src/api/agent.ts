// Agent 对话流（SSE）模块
// @author hc @date 2026-06-03

import { buildUrl } from "./client"
import { getToken } from "./token"
import type { ChatStreamReq } from "./types"

const SESSION_KEY = "pr_session_id"

// 浏览器维度稳定的会话 id（同 userId+sessionId 的 PPT 只扣一次积分）
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
  // 每条 SSE 事件都会回调（event 名 + 解析后的 data + 原始字符串）
  onEvent?: (event: string, data: unknown, raw: string) => void
  onProgress?: (data: unknown) => void
  onComplete?: (data: unknown) => void
  onError?: (message: string, data?: unknown) => void
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

// 解析单个 SSE 事件块
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

// 调用 /agent/chat-stream 并消费 SSE
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
    throw new Error(text || `请求失败：${res.status}`)
  }

  const dispatch = (block: string) => {
    const parsed = parseBlock(block)
    if (!parsed) return
    const data = safeParse(parsed.data)
    cb.onEvent?.(parsed.event, data, parsed.data)
    if (parsed.event === "complete") cb.onComplete?.(data)
    else if (parsed.event === "error") {
      const msg =
        typeof data === "string"
          ? data
          : (data as { message?: string })?.message ?? "生成失败"
      cb.onError?.(msg, data)
    } else if (parsed.event === "progress" || parsed.event === "ppt_progress")
      cb.onProgress?.(data)
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
      if (block.trim()) dispatch(block)
    }
  }
  if (buffer.trim()) dispatch(buffer)
}
