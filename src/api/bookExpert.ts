// 书籍专家（Book Expert）API：经 Java BFF 调用 Python 蒸馏 / 召唤
// @author hc @date 2026-09-29

import { buildUrl, ApiError } from "./client"
import { getToken } from "./token"
import { getApiContextHeaders } from "@/utils/apiRequestContext"
import { getSavedLocale } from "@/composables/useAppLocale"
import type {
  BookExpertListResult,
  BookExpertDetailResult,
  BookExpertPublishReq,
  BookExpertPublishResult,
  BookExpertDeleteResult,
  DistillRequest,
  DistillExpertCreatedEvent,
  DistillErrorEvent,
  DistillCompleteEvent,
} from "./types"

export const BOOK_EXPERT_SKILL_PREFIX = "book_expert:"

export function toBookExpertSkillName(expertId: string): string {
  return `${BOOK_EXPERT_SKILL_PREFIX}${expertId}`
}

export function parseExpertIdFromSkillName(skillName: string): string | null {
  if (!skillName || !skillName.startsWith(BOOK_EXPERT_SKILL_PREFIX)) return null
  const id = skillName.slice(BOOK_EXPERT_SKILL_PREFIX.length)
  return id || null
}

// ===== REST（经 BFF，非标准 R<T> 信封，顶层 ok 判断） =====

function authJsonHeaders(): Headers {
  const headers = new Headers()
  headers.set("Accept", "application/json")
  const token = getToken()
  if (token) headers.set("Authorization", token)
  Object.entries(getApiContextHeaders()).forEach(([key, value]) => {
    if (value) headers.set(key, value)
  })
  return headers
}

async function rawRequest<T>(
  method: string,
  path: string,
  opts: { query?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
  const headers = authJsonHeaders()
  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(opts.body)
  }
  const res = await fetch(buildUrl(path, opts.query), { method, headers, body })
  if (res.status === 401) {
    throw new ApiError(401, "未登录或登录已过期")
  }
  let parsed: unknown
  try {
    parsed = await res.json()
  } catch {
    throw new ApiError(res.status, `请求失败：${res.status}`)
  }
  const payload = parsed as { ok?: boolean; message?: string; msg?: string; error?: string } & T
  if (!res.ok || payload?.ok === false) {
    const msg = payload?.message || payload?.msg || payload?.error || `请求失败：${res.status}`
    throw new ApiError(res.status, msg)
  }
  return payload as T
}

export async function listExperts(userId: string): Promise<BookExpertListResult> {
  return rawRequest<BookExpertListResult>("GET", "/book-experts", { query: { userId } })
}

/** 仅我拥有的专家（私有 + 我发布的公共） */
export async function listMyExperts(userId: string): Promise<BookExpertListResult> {
  return rawRequest<BookExpertListResult>("GET", "/book-experts/mine", { query: { userId } })
}

/** 公共专家广场；excludeOwn=true 时排除我自己发布的（推荐流） */
export async function listPublicExperts(
  userId: string,
  excludeOwn = false,
): Promise<BookExpertListResult> {
  return rawRequest<BookExpertListResult>("GET", "/book-experts/public", {
    query: excludeOwn ? { userId, exclude_own: 1 } : { userId },
  })
}

export async function getExpert(
  expertId: string,
  userId: string,
): Promise<BookExpertDetailResult> {
  return rawRequest<BookExpertDetailResult>("GET", `/book-experts/${encodeURIComponent(expertId)}`, {
    query: { userId },
  })
}

export async function publishExpert(
  expertId: string,
  req: BookExpertPublishReq,
): Promise<BookExpertPublishResult> {
  return rawRequest<BookExpertPublishResult>(
    "POST",
    `/book-experts/${encodeURIComponent(expertId)}/publish`,
    { body: req },
  )
}

export async function deleteExpert(
  expertId: string,
  userId: string,
): Promise<BookExpertDeleteResult> {
  return rawRequest<BookExpertDeleteResult>("DELETE", `/book-experts/${encodeURIComponent(expertId)}`, {
    query: { userId },
  })
}

// ===== 蒸馏 SSE =====

export interface DistillStreamCallbacks {
  onConnected?: () => void
  onExpertCreated?: (data: DistillExpertCreatedEvent) => void
  onError?: (message: string, data?: DistillErrorEvent | unknown) => void
  onComplete?: (data: DistillCompleteEvent | unknown) => void
  onEvent?: (event: string, data: unknown, raw: string) => void
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function parseSseBlock(block: string): { event: string; data: string } | null {
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

function resolveUiLocale(): "zh" | "en" {
  return getSavedLocale() === "en" ? "en" : "zh"
}

export async function distillExpert(
  req: DistillRequest,
  cb: DistillStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<{ completed: boolean }> {
  const body: DistillRequest = {
    ...req,
    uiLocale: req.uiLocale || resolveUiLocale(),
  }

  const res = await fetch(buildUrl("/book-experts/distill"), {
    method: "POST",
    headers: authStreamHeaders(),
    body: JSON.stringify(body),
    signal,
  })

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

  cb.onConnected?.()

  let completed = false
  const dispatch = (block: string) => {
    const parsed = parseSseBlock(block)
    if (!parsed) return
    const data = safeParse(parsed.data)
    const event = String(parsed.event || "").trim().toLowerCase()
    cb.onEvent?.(event, data, parsed.data)

    if (event === "expert_created") {
      cb.onExpertCreated?.(data as DistillExpertCreatedEvent)
    } else if (event === "error") {
      const payload = data as DistillErrorEvent | string | undefined
      const msg =
        typeof payload === "string"
          ? payload
          : (payload as DistillErrorEvent)?.message || "蒸馏失败"
      cb.onError?.(msg, payload)
    } else if (event === "complete") {
      completed = true
      cb.onComplete?.(data)
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
      if (block.trim()) dispatch(block)
    }
  }
  if (buffer.trim()) dispatch(buffer)
  return { completed }
}

// ===== 召唤：复用现有 Agent Chat SSE（/api2/agent/chat-stream） =====

export interface SummonExpertChatReq {
  message: string
  expertId: string
  projectId: string
  userId: string
  streamRequestId?: string
}

export function buildSummonExpertChatBody(
  req: SummonExpertChatReq,
): Record<string, unknown> {
  return {
    message: req.message,
    isAgent: true,
    skill: true,
    skillName: toBookExpertSkillName(req.expertId),
    projectId: req.projectId,
    userId: req.userId,
    streamRequestId: req.streamRequestId ?? String(Date.now()),
  }
}
