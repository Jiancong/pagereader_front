// 沉浸式共读 — 共享类型（与 immersive_co_reading_spec.md 对齐）
// @author hc @date 2026-10-16

export type CoReadAnnotationKind =
  | "reaction"
  | "suspicion"
  | "praise"
  | "prediction"
  | "question"
  | "tease"
  | "hint"
  | "resonance"
  | "humor"

export interface CoReadChapter {
  index: number
  title: string
  paragraphs: string[]
  charCount: number
  /** EPUB spine 序号，用于原生分页阅读器定位章节 */
  epubSpineIndex?: number
}

export interface CoReadChapterMeta {
  index: number
  title: string
  charCount: number
}

export interface CoReadAnnotation {
  id: string
  chapterIndex: number
  /** 共读逐页模型：批注所属页码（1-based，与阅读器一致） */
  pageIndex?: number
  anchor: { paragraphIndex: number; quote?: string }
  kind: CoReadAnnotationKind
  content: string
  myReply?: string
  replySent?: boolean
  /** SSE 流式未完结 */
  streaming?: boolean
}

export interface CoReadChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  annotationId?: string
  streaming?: boolean
}

export interface CoReadSessionSummary {
  sessionId: string
  fileName?: string
  title?: string
  chapterCount?: number
  currentChapterIndex?: number
  updatedAt?: string
}

export interface CoReadSessionDetail {
  sessionId: string
  fileName: string
  format: string
  chapters: CoReadChapterMeta[]
  currentChapterIndex: number
  annotationsByChapter?: Record<string, CoReadAnnotation[]>
  chatByChapter?: Record<string, CoReadChatMessage[]>
}

export type CoReadViewPhase =
  | "idle"
  | "parsing"
  | "ready"
  | "reading"
  | "discussing"
  | "finished"
