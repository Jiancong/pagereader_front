// 沉浸式共读 API（/api2/co-reading/*）
// @author hc @date 2026-10-16

import { buildUrl, ApiError, requestJsonOkPayload } from "./client"
import { buildAuthStreamHeaders, consumeFetchSse } from "@/utils/sse"
import { getSavedLocale } from "@/composables/useAppLocale"
import type {
  CoReadAnnotation,
  CoReadAnnotationKind,
  CoReadChapterMeta,
  CoReadSessionDetail,
  CoReadSessionSummary,
} from "@/types/coReading"

function resolveUiLocale(): "zh" | "en" {
  return getSavedLocale() === "en" ? "en" : "zh"
}

const WIRE_KIND_MAP: Record<string, CoReadAnnotationKind> = {
  hint: "hint",
  resonance: "resonance",
  humor: "humor",
  question: "question",
  suspicion: "suspicion",
  reaction: "reaction",
  praise: "praise",
  prediction: "prediction",
  tease: "tease",
}

export function normalizeCoReadKind(kind: unknown): CoReadAnnotationKind {
  const k = String(kind ?? "")
    .trim()
    .toLowerCase()
  return WIRE_KIND_MAP[k] ?? "reaction"
}

/** wire(annotationId/paragraph_index) → internal(id/paragraphIndex) */
function resolveParagraphIndex(d: Record<string, unknown>, anchor: Record<string, unknown>): number {
  const raw =
    anchor.paragraph_index ??
    anchor.paragraphIndex ??
    anchor.anchor_paragraph ??
    d.anchor_paragraph ??
    d.paragraph_index ??
    d.paragraphIndex ??
    0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function normalizeAnnotationAnchorEvent(data: unknown): Partial<CoReadAnnotation> & { id: string } {
  const d = (data ?? {}) as Record<string, unknown>
  const a = (d.anchor ?? {}) as Record<string, unknown>
  const paragraphIndex = resolveParagraphIndex(d, a)
  const quote =
    typeof a.quote === "string"
      ? a.quote
      : typeof d.quote === "string"
        ? d.quote
        : undefined
  return {
    id: String(d.annotationId ?? d.id ?? "").trim(),
    chapterIndex: typeof d.chapterIndex === "number" ? d.chapterIndex : undefined,
    pageIndex: typeof d.pageIndex === "number" ? d.pageIndex : undefined,
    kind: normalizeCoReadKind(d.kind),
    anchor: { paragraphIndex, quote },
    content: typeof d.content === "string" ? d.content : "",
  }
}

function normalizeAnnotationId(data: unknown): string {
  const d = data as { annotationId?: string; id?: string }
  return String(d?.annotationId ?? d?.id ?? "").trim()
}

export interface CreateCoReadSessionBody {
  fileHash: string
  fileName: string
  format: string
  chapters: CoReadChapterMeta[]
  startChapter: number
  uiLocale?: "zh" | "en"
}

export async function createSession(body: CreateCoReadSessionBody): Promise<{ sessionId: string }> {
  const payload = await requestJsonOkPayload<{ ok: true; sessionId: string }>("POST", "/co-reading/sessions", {
    ...body,
    uiLocale: body.uiLocale || resolveUiLocale(),
  })
  return { sessionId: payload.sessionId }
}

export async function uploadChapterText(
  sessionId: string,
  chapterNumber: number,
  paragraphs: string[],
): Promise<void> {
  await requestJsonOkPayload("POST", `/co-reading/sessions/${sessionId}/chapters/${chapterNumber}/text`, {
    paragraphs,
  })
}

export interface OpenChapterSseCallbacks {
  onMeta?: (data: unknown) => void
  onChatIntro?: (data: { delta: string; role?: string }) => void
  onAnnotationAnchor?: (data: Partial<CoReadAnnotation> & { id: string }) => void
  onAnnotationDelta?: (data: { id: string; delta: string; pageIndex?: number }) => void
  onAnnotationDone?: (data: { id: string; content?: string; pageIndex?: number }) => void
  onChapterDone?: (data: {
    chapterIndex: number
    annotationCount?: number
    replayed?: boolean
    nextChapter?: number
    status?: string
  }) => void
  onError?: (message: string, data?: unknown) => void
  onPing?: () => void
  /** 丢弃迟到 SSE 时可选回调 */
  shouldAcceptPage?: (pageIndex: number | undefined) => boolean
}

export async function openChapter(
  sessionId: string,
  chapterNumber: number,
  cb: OpenChapterSseCallbacks = {},
  signal?: AbortSignal,
  opts?: { force?: boolean; retryOnce?: boolean },
): Promise<void> {
  const retryOnce = opts?.retryOnce ?? true
  const acceptPage = (pageIndex: number | undefined) =>
    cb.shouldAcceptPage ? cb.shouldAcceptPage(pageIndex) : true

  const run = async () => {
    const res = await fetch(buildUrl(`/co-reading/sessions/${sessionId}/chapters/${chapterNumber}/open`), {
      method: "POST",
      credentials: "include",
      headers: buildAuthStreamHeaders(),
      body: JSON.stringify({ force: !!opts?.force }),
      signal,
    })
    await consumeFetchSse(
      res,
      (event, data) => {
        if (event === "meta") {
          cb.onMeta?.(data)
          return
        }
        if (event === "chat_delta") {
          const payload = data as { delta?: string; role?: string }
          if (payload?.delta) cb.onChatIntro?.({ delta: payload.delta, role: payload.role })
          return
        }
        if (event === "annotation_anchor") {
          const normalized = normalizeAnnotationAnchorEvent(data)
          if (!normalized.id) return
          if (!acceptPage(normalized.pageIndex)) return
          cb.onAnnotationAnchor?.(normalized)
        } else if (event === "annotation_delta") {
          const d = data as { annotationId?: string; id?: string; delta?: string; pageIndex?: number }
          const id = normalizeAnnotationId(d)
          if (!id) return
          if (!acceptPage(typeof d.pageIndex === "number" ? d.pageIndex : undefined)) return
          cb.onAnnotationDelta?.({ id, delta: String(d.delta ?? ""), pageIndex: d.pageIndex })
        } else if (event === "annotation_done") {
          const d = data as { annotationId?: string; id?: string; content?: string; pageIndex?: number }
          const id = normalizeAnnotationId(d)
          if (!id) return
          if (!acceptPage(typeof d.pageIndex === "number" ? d.pageIndex : undefined)) return
          cb.onAnnotationDone?.({ id, content: d.content, pageIndex: d.pageIndex })
        } else if (event === "chapter_done") {
          cb.onChapterDone?.(
            data as {
              chapterIndex: number
              annotationCount?: number
              replayed?: boolean
              nextChapter?: number
              status?: string
            },
          )
        } else if (event === "error") {
          const payload = data as { message?: string; code?: string }
          cb.onError?.(payload?.message || "共读批注失败", data)
        } else if (event === "ping") {
          cb.onPing?.()
        }
      },
      signal,
    )
  }
  try {
    await run()
  } catch (e) {
    if (retryOnce && !signal?.aborted) {
      await run()
      return
    }
    throw e
  }
}

export interface ReplyPayload {
  annotationId: string
  text: string
}

export interface RepliesSseCallbacks {
  onReplyAck?: (data: { annotationId: string }) => void
  onReplyResponse?: (data: { annotationId: string; delta: string }) => void
  onChatDelta?: (data: { delta: string }) => void
  onError?: (message: string, data?: unknown) => void
}

export async function sendReplies(
  sessionId: string,
  chapterNumber: number,
  replies: ReplyPayload[],
  cb: RepliesSseCallbacks = {},
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(buildUrl(`/co-reading/sessions/${sessionId}/chapters/${chapterNumber}/replies`), {
    method: "POST",
    credentials: "include",
    headers: buildAuthStreamHeaders(),
    body: JSON.stringify({ replies }),
    signal,
  })
  await consumeFetchSse(
    res,
    (event, data) => {
      if (event === "reply_ack") {
        cb.onReplyAck?.(data as { annotationId: string })
      } else if (event === "reply_response") {
        cb.onReplyResponse?.(data as { annotationId: string; delta: string })
      } else if (event === "chat_delta") {
        cb.onChatDelta?.(data as { delta: string })
      } else if (event === "error") {
        const payload = data as { message?: string }
        cb.onError?.(payload?.message || "发送留言失败", data)
      }
    },
    signal,
  )
}

export interface ChatSseCallbacks {
  onChatDelta?: (data: { delta: string }) => void
  onError?: (message: string, data?: unknown) => void
}

export async function sendChat(
  sessionId: string,
  text: string,
  cb: ChatSseCallbacks = {},
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(buildUrl(`/co-reading/sessions/${sessionId}/chat`), {
    method: "POST",
    credentials: "include",
    headers: buildAuthStreamHeaders(),
    body: JSON.stringify({ text }),
    signal,
  })
  await consumeFetchSse(
    res,
    (event, data) => {
      if (event === "chat_delta") {
        cb.onChatDelta?.(data as { delta: string })
      } else if (event === "error") {
        const payload = data as { message?: string }
        cb.onError?.(payload?.message || "讨论失败", data)
      }
    },
    signal,
  )
}

export async function reportProgress(
  sessionId: string,
  chapterIndex: number,
  scrollPercent: number,
): Promise<void> {
  await requestJsonOkPayload("POST", `/co-reading/sessions/${sessionId}/progress`, {
    chapterIndex,
    scrollPercent,
  })
}

export interface PageReadResult {
  ok: true
  page_index?: number
  pageIndex?: number
  stored_chars?: number
  storedChars?: number
  deduped?: boolean
}

/** 页正文已落库：ok 且 stored_chars > 0（兼容 camelCase） */
export function pageReadStored(res: PageReadResult | null | undefined): boolean {
  if (!res?.ok) return false
  const n = res.stored_chars ?? res.storedChars
  return typeof n === "number" && n > 0
}

/** 同步当前页文本。open 必须等本次 HTTP 响应且 pageReadStored 为真 */
export async function reportPageRead(
  sessionId: string,
  chapterNumber: number,
  payload: { pageIndex: number; pageTotal: number; text: string },
  signal?: AbortSignal,
): Promise<PageReadResult> {
  return requestJsonOkPayload<PageReadResult>(
    "POST",
    `/co-reading/sessions/${sessionId}/chapters/${chapterNumber}/page`,
    {
      pageIndex: payload.pageIndex,
      pageTotal: payload.pageTotal,
      text: payload.text,
    },
    { signal },
  )
}

export async function getSession(sessionId: string): Promise<CoReadSessionDetail> {
  const payload = await requestJsonOkPayload<
    { ok: true; session?: CoReadSessionDetail } & Partial<CoReadSessionDetail>
  >("GET", `/co-reading/sessions/${sessionId}`)
  if (payload.session) return payload.session
  if (payload.sessionId) return payload as CoReadSessionDetail
  throw new ApiError(404, "会话不存在")
}

export async function listSessions(): Promise<CoReadSessionSummary[]> {
  const payload = await requestJsonOkPayload<{ ok: true; sessions: CoReadSessionSummary[] }>(
    "GET",
    "/co-reading/sessions",
  )
  return payload.sessions ?? []
}
