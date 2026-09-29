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
  BookExpertCoverUploadResult,
  BookExpertSessionListResult,
  BookExpertSessionMessagesResult,
  BookExpertSummary,
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

/**
 * 从蒸馏 `expert_created` 事件提取专家摘要。
 * Python 把摘要在 `expert` 字段下；顶层字段仅作兼容回退。
 */
export function extractCreatedExpert(
  data: DistillExpertCreatedEvent,
  fallback: { ownerId: string; name?: string },
): BookExpertSummary {
  const s = data.expert
  return {
    expert_id: s?.expert_id ?? data.expert_id ?? "",
    expert_name: s?.expert_name ?? data.expert_name ?? fallback.name ?? "",
    book_title: s?.book_title ?? data.book_title,
    visibility: s?.visibility ?? data.visibility ?? "private",
    owner_user_id: s?.owner_user_id ?? fallback.ownerId,
  }
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
  opts: { query?: Record<string, unknown>; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers = authJsonHeaders()
  let body: BodyInit | undefined
  if (opts.form) {
    // multipart：由浏览器补 boundary，勿手动设 Content-Type
    body = opts.form
  } else if (opts.body !== undefined) {
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
  userId?: string,
): Promise<BookExpertDetailResult> {
  return rawRequest<BookExpertDetailResult>("GET", `/book-experts/${encodeURIComponent(expertId)}`, {
    query: userId ? { userId } : undefined,
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

// ===== 封面 / 会话历史（Java BFF 代理 Python；详见 docs spec） =====

const EXPERT_SESSION_KEY_PREFIX = "book_expert_session:"

/**
 * 专家会话独立 sessionId：`be-<expertId>-<uuid>`（区别于浏览器全局 sessionId）。
 * Python 端按该前缀反查 sessions 表，实现按专家隔离的会话历史。
 */
export function getOrCreateExpertSessionId(expertId: string): string {
  const eid = String(expertId || "").trim()
  if (typeof window === "undefined" || !eid) return ""
  const key = `${EXPERT_SESSION_KEY_PREFIX}${eid}`
  const prefix = `be-${eid}-`
  let id = window.localStorage.getItem(key) || ""
  if (!id.startsWith(prefix)) {
    const uuid =
      window.crypto?.randomUUID?.() ??
      `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
    id = `${prefix}${uuid}`
    window.localStorage.setItem(key, id)
  }
  return id
}

/** 恢复历史会话后，把该会话设为当前专家的默认会话（继续追问同一线程） */
export function setActiveExpertSessionId(expertId: string, sessionId: string): void {
  const eid = String(expertId || "").trim()
  const sid = String(sessionId || "").trim()
  if (typeof window === "undefined" || !eid || !sid.startsWith(`be-${eid}-`)) return
  window.localStorage.setItem(`${EXPERT_SESSION_KEY_PREFIX}${eid}`, sid)
}

/** 上传专家封面（multipart；BFF 负责转 OSS，Python 只存 cover_url） */
export async function uploadExpertCover(
  expertId: string,
  file: File,
  userId: string,
): Promise<BookExpertCoverUploadResult> {
  const form = new FormData()
  form.append("file", file)
  return rawRequest<BookExpertCoverUploadResult>(
    "POST",
    `/book-experts/${encodeURIComponent(expertId)}/cover`,
    { query: { userId }, form },
  )
}

/** 该专家的历史会话列表（owner only） */
export async function listExpertSessions(
  expertId: string,
  userId: string,
): Promise<BookExpertSessionListResult> {
  return rawRequest<BookExpertSessionListResult>(
    "GET",
    `/book-experts/${encodeURIComponent(expertId)}/sessions`,
    { query: { userId } },
  )
}

/** 单个历史会话的消息（owner only；已清洗为 role/content/timestamp） */
export async function getExpertSessionMessages(
  expertId: string,
  sessionId: string,
  userId: string,
): Promise<BookExpertSessionMessagesResult> {
  return rawRequest<BookExpertSessionMessagesResult>(
    "GET",
    `/book-experts/${encodeURIComponent(expertId)}/sessions/${encodeURIComponent(sessionId)}`,
    { query: { userId } },
  )
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
