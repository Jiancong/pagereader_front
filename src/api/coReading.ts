// 沉浸式共读 API（/api2/co-reading/*）
// @author hc @date 2026-10-16

import { buildUrl, ApiError, requestJsonOkPayload } from "./client"
import { buildAuthStreamHeaders, consumeFetchSse } from "@/utils/sse"
import { getSavedLocale } from "@/composables/useAppLocale"
import type {
  CoReadAnnotation,
  CoReadChapterMeta,
  CoReadSessionDetail,
  CoReadSessionSummary,
} from "@/types/coReading"

function resolveUiLocale(): "zh" | "en" {
  return getSavedLocale() === "en" ? "en" : "zh"
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
  onAnnotationAnchor?: (data: Partial<CoReadAnnotation> & { id: string }) => void
  onAnnotationDelta?: (data: { id: string; delta: string }) => void
  onAnnotationDone?: (data: { id: string }) => void
  onChapterDone?: (data: { chapterIndex: number; annotationCount?: number }) => void
  onError?: (message: string, data?: unknown) => void
  onPing?: () => void
}

export async function openChapter(
  sessionId: string,
  chapterNumber: number,
  cb: OpenChapterSseCallbacks = {},
  signal?: AbortSignal,
  retryOnce = true,
): Promise<void> {
  const run = async () => {
    const res = await fetch(buildUrl(`/co-reading/sessions/${sessionId}/chapters/${chapterNumber}/open`), {
      method: "POST",
      credentials: "include",
      headers: buildAuthStreamHeaders(),
      body: JSON.stringify({}),
      signal,
    })
    await consumeFetchSse(
      res,
      (event, data) => {
        if (event === "annotation_anchor") {
          cb.onAnnotationAnchor?.(data as Partial<CoReadAnnotation> & { id: string })
        } else if (event === "annotation_delta") {
          cb.onAnnotationDelta?.(data as { id: string; delta: string })
        } else if (event === "annotation_done") {
          cb.onAnnotationDone?.(data as { id: string })
        } else if (event === "chapter_done") {
          cb.onChapterDone?.(data as { chapterIndex: number; annotationCount?: number })
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
