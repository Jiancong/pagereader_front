// 书籍专家（Book Expert）API：经 Java BFF 调用 Python 蒸馏 / 召唤
// @author hc @date 2026-09-29

import { buildUrl, ApiError } from "./client"
import { getToken } from "./token"
import { getApiContextHeaders } from "@/utils/apiRequestContext"
import { getSavedLocale, resolveApiLocale } from "@/composables/useAppLocale"
import type {
  BookExpertListResult,
  BookExpertDetailResult,
  BookExpertPublishReq,
  BookExpertPublishResult,
  BookExpertTopicCategoryResult,
  SupplementaryAttachmentListResult,
  SupplementaryAttachmentCreateReq,
  SupplementaryAttachmentCreateResult,
  SupplementaryAttachmentDeleteResult,
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
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    credentials: "include",
    headers,
    body,
  })
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

/**
 * 全站 visibility=public 的专家。
 * - `excludeOwn=false`：含当前用户自己发布的（验「是否已公开」用此模式）。
 * - `excludeOwn=true`（`exclude_own=1`）：去掉 owner=当前用户的条目，探索页「他人推荐」；
 *   若全站只有自己在 public，会返回 count=0，属预期，并非未发布成功。
 * 自己拥有的全部专家（含 private/public）用 {@link listMyExperts}。
 */
export async function listPublicExperts(
  userId?: string,
  excludeOwn = false,
): Promise<BookExpertListResult> {
  const uid = String(userId ?? "").trim()
  const query: Record<string, string | number> = {
    locale: resolveApiLocale(),
    ui_locale: getSavedLocale() === "en" ? "en" : "zh",
  }
  if (uid) query.userId = uid
  if (excludeOwn && uid) query.exclude_own = 1
  return rawRequest<BookExpertListResult>("GET", "/book-experts/public", {
    query,
  })
}

export async function getExpert(
  expertId: string,
  userId?: string,
): Promise<BookExpertDetailResult> {
  const query: Record<string, string> = {
    locale: resolveApiLocale(),
    ui_locale: getSavedLocale() === "en" ? "en" : "zh",
  }
  const uid = String(userId ?? "").trim()
  if (uid) query.userId = uid
  return rawRequest<BookExpertDetailResult>("GET", `/book-experts/${encodeURIComponent(expertId)}`, {
    query,
  })
}

export async function publishExpert(
  expertId: string,
  req: BookExpertPublishReq,
): Promise<BookExpertPublishResult> {
  const uid = String(req.userId || "").trim()
  const categoryId = String(req.topicCategoryId ?? req.topic_category_id ?? "").trim()
  const body: BookExpertPublishReq = { ...req, userId: uid }
  if (categoryId) {
    body.topicCategoryId = categoryId
    body.topic_category_id = categoryId
  }
  return rawRequest<BookExpertPublishResult>(
    "POST",
    `/book-experts/${encodeURIComponent(expertId)}/publish`,
    { query: uid ? { userId: uid } : undefined, body },
  )
}

/** 更新专家主题分类（owner；已 public 时用于广场筛选，与作品 PUT /project/{id}/category 对齐） */
export async function updateExpertTopicCategory(
  expertId: string,
  userId: string,
  categoryId: string,
): Promise<BookExpertTopicCategoryResult> {
  const uid = String(userId || "").trim()
  const cid = String(categoryId || "").trim()
  return rawRequest<BookExpertTopicCategoryResult>(
    "PUT",
    `/book-experts/${encodeURIComponent(expertId)}/category`,
    {
      query: uid ? { userId: uid } : undefined,
      body: { userId: uid, categoryId: cid, topicCategoryId: cid, topic_category_id: cid },
    },
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

// ===== 补充附件（详见 docs/supplementary_attachments_spec.md §5.2） =====

export async function listExpertAttachments(
  expertId: string,
  userId: string,
): Promise<SupplementaryAttachmentListResult> {
  const uid = String(userId || "").trim()
  return rawRequest<SupplementaryAttachmentListResult>(
    "GET",
    `/book-experts/${encodeURIComponent(expertId)}/attachments`,
    { query: uid ? { userId: uid } : undefined },
  )
}

export async function addExpertAttachment(
  expertId: string,
  body: SupplementaryAttachmentCreateReq,
): Promise<SupplementaryAttachmentCreateResult> {
  const uid = String(body.userId || "").trim()
  return rawRequest<SupplementaryAttachmentCreateResult>(
    "POST",
    `/book-experts/${encodeURIComponent(expertId)}/attachments`,
    { query: uid ? { userId: uid } : undefined, body },
  )
}

export async function deleteExpertAttachment(
  expertId: string,
  attachmentId: string,
  userId: string,
): Promise<SupplementaryAttachmentDeleteResult> {
  const uid = String(userId || "").trim()
  return rawRequest<SupplementaryAttachmentDeleteResult>(
    "DELETE",
    `/book-experts/${encodeURIComponent(expertId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { query: uid ? { userId: uid } : undefined },
  )
}

// ===== 封面 / 会话历史（Java BFF 代理 Python；详见 docs spec） =====

const EXPERT_SESSION_KEY_PREFIX = "book_expert_session:"

function expertSessionStorageKey(userId: string, expertId: string): string {
  const uid = String(userId || "").trim()
  const eid = String(expertId || "").trim()
  return `${EXPERT_SESSION_KEY_PREFIX}${uid}:${eid}`
}

function newExpertSessionId(expertId: string): string {
  const eid = String(expertId || "").trim()
  const prefix = `be-${eid}-`
  const uuid =
    typeof window !== "undefined" && window.crypto?.randomUUID?.()
      ? window.crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}${uuid}`
}

/**
 * 专家会话独立 sessionId：`be-<expertId>-<uuid>`（区别于浏览器全局 sessionId）。
 * 按 **登录用户 + 专家** 存 localStorage，避免同浏览器换账号或聊他人公开专家时串会话。
 */
export function getOrCreateExpertSessionId(expertId: string, userId: string): string {
  const eid = String(expertId || "").trim()
  const uid = String(userId || "").trim()
  if (typeof window === "undefined" || !eid || !uid) return ""
  const key = expertSessionStorageKey(uid, eid)
  const prefix = `be-${eid}-`
  let id = window.localStorage.getItem(key) || ""
  if (!id.startsWith(prefix)) {
    id = newExpertSessionId(eid)
    window.localStorage.setItem(key, id)
  }
  return id
}

/** 强制新建一条会话（例如首次从公共广场进入他人专家） */
export function createFreshExpertSessionId(expertId: string, userId: string): string {
  const eid = String(expertId || "").trim()
  const uid = String(userId || "").trim()
  if (typeof window === "undefined" || !eid || !uid) return ""
  const id = newExpertSessionId(eid)
  window.localStorage.setItem(expertSessionStorageKey(uid, eid), id)
  return id
}

/** 恢复历史会话后，把该会话设为当前专家的默认会话（继续追问同一线程） */
export function setActiveExpertSessionId(expertId: string, sessionId: string, userId: string): void {
  const eid = String(expertId || "").trim()
  const uid = String(userId || "").trim()
  const sid = String(sessionId || "").trim()
  if (typeof window === "undefined" || !eid || !uid || !sid.startsWith(`be-${eid}-`)) return
  window.localStorage.setItem(expertSessionStorageKey(uid, eid), sid)
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

/**
 * 将专家 cover_url 设为已有 HTTPS 图片（预设形象）。
 * 优先 JSON 直存（Python 已支持；BFF 若未开放则回退为拉取图片后 multipart 上传 OSS）。
 */
export async function setExpertCoverUrl(
  expertId: string,
  userId: string,
  coverUrl: string,
): Promise<BookExpertCoverUploadResult> {
  const url = String(coverUrl || "").trim()
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new ApiError(400, "coverUrl 必须为 http(s) 地址")
  }
  const uid = String(userId || "").trim()
  if (!uid) throw new ApiError(401, "未登录")

  try {
    return await rawRequest<BookExpertCoverUploadResult>(
      "POST",
      `/book-experts/${encodeURIComponent(expertId)}/cover`,
      { query: { userId: uid }, body: { userId: uid, coverUrl: url } },
    )
  } catch (e) {
    const code = e instanceof ApiError ? e.code : 0
    const canFallback = code === 400 || code === 404 || code === 415 || code === 406
    if (!canFallback) throw e
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new ApiError(res.status, `无法加载预设图片：${res.status}`)
  }
  const blob = await res.blob()
  const mime = (blob.type || "image/png").toLowerCase()
  if (mime && !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) {
    throw new ApiError(400, "预设图片格式不受支持")
  }
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "png"
  const file = new File([blob], `expert-avatar.${ext}`, { type: mime || "image/png" })
  return uploadExpertCover(expertId, file, uid)
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

/** 侧栏「探索专家」：汇总我所有专家下的 chat sessions（按 updatedAt 倒序） */
export interface ExpertChatHistoryItem {
  expertId: string
  expertName: string
  bookTitle?: string
  coverUrl?: string
  sessionId: string
  title?: string
  messageCount?: number
  updatedAt?: string
}

export async function loadAggregatedExpertChatHistory(
  userId: string,
): Promise<ExpertChatHistoryItem[]> {
  const uid = String(userId || "").trim()
  if (!uid) return []
  const mine = await listMyExperts(uid)
  const experts = mine.experts ?? []
  const nested = await Promise.all(
    experts.map(async (ex) => {
      const expertId = ex.expert_id
      if (!expertId) return [] as ExpertChatHistoryItem[]
      try {
        const res = await listExpertSessions(expertId, uid)
        return (res.sessions ?? []).map((s) => ({
          expertId,
          expertName: ex.expert_name || expertId,
          bookTitle: ex.book_title,
          coverUrl: ex.cover_url,
          sessionId: s.sessionId,
          title: s.title,
          messageCount: s.messageCount,
          updatedAt: s.updatedAt,
        }))
      } catch {
        return [] as ExpertChatHistoryItem[]
      }
    }),
  )
  const flat = nested.flat()
  flat.sort((a, b) => {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0
    return tb - ta
  })
  return flat
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
    credentials: "include",
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
