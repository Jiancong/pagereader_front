// SSE 块解析与 fetch 流消费（bookExpert / agent 共用）
// @author hc @date 2026-10-16

import { getToken } from "@/api/token"
import { ApiError } from "@/api/client"
import { getApiContextHeaders } from "@/utils/apiRequestContext"

export function safeParseSseJson(raw: string): unknown {
  const s = String(raw ?? "").trim()
  if (!s) return undefined
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

export function parseSseBlock(block: string): { event: string; data: string } | null {
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

export function buildAuthStreamHeaders(): Headers {
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

export type SseBlockHandler = (event: string, data: unknown, rawData: string) => void

export async function consumeFetchSse(
  res: Response,
  onBlock: SseBlockHandler,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    let msg = `请求失败：${res.status}`
    try {
      const parsed = JSON.parse(text) as { message?: string; msg?: string; error?: string }
      msg = parsed.message || parsed.msg || parsed.error || msg
    } catch {
      if (text) msg = text
    }
    throw new ApiError(res.status, msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined)
      break
    }
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
    let idx
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      if (!block.trim()) continue
      const parsed = parseSseBlock(block)
      if (!parsed) continue
      const event = String(parsed.event || "").trim().toLowerCase()
      const data = safeParseSseJson(parsed.data)
      onBlock(event, data, parsed.data)
    }
  }
  if (buffer.trim()) {
    const parsed = parseSseBlock(buffer)
    if (parsed) {
      const event = String(parsed.event || "").trim().toLowerCase()
      onBlock(event, safeParseSseJson(parsed.data), parsed.data)
    }
  }
}
