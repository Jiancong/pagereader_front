// 沉浸式共读会话状态
// @author hc @date 2026-10-16

import { defineStore } from "pinia"
import type {
  CoReadAnnotation,
  CoReadChapter,
  CoReadChatMessage,
  CoReadSessionDetail,
  CoReadViewPhase,
} from "@/types/coReading"
import { wireChapterToStoreIndex } from "@/utils/coReadChapter"

const DRAFT_PREFIX = "page2top.coReading.draft."
const CHAT_CACHE_PREFIX = "page2top.coReading.chat."
const LAST_SESSION_KEY = "page2top.coReading.lastSession"
const CHAPTER_CACHE_MAX = 3
const CHAT_CACHE_LIMIT = 500

function draftKey(sessionId: string, chapterIndex: number) {
  return `${DRAFT_PREFIX}${sessionId}.${chapterIndex}`
}

/** 稳定键：annotationId 每次生成都会变（ann_xxx），改用 页码+归一化引文 定位同一条批注的留言 */
function stableReplyKeyOf(pageIndex: number | undefined, paragraphIndex: number, quote?: string): string {
  const q = String(quote || "")
    .replace(/\s+/g, "")
    .slice(0, 64)
  if (q) return `q${pageIndex ?? 0}_${q}`
  return `p${pageIndex ?? 0}_${paragraphIndex}`
}

function chatCacheKey(sessionId: string) {
  return `${CHAT_CACHE_PREFIX}${sessionId}`
}

const SAVED_REPLY_PREFIX = "page2top.coReading.savedReplies."

function savedReplyKey(sessionId: string) {
  return `${SAVED_REPLY_PREFIX}${sessionId}`
}

interface PersistedChatEntry {
  id: string
  chapterIndex: number
  role: "user" | "assistant"
  text: string
  annotationId?: string
  ts: number
}

export const useCoReadingStore = defineStore("co-reading", {
  state: () => ({
    phase: "idle" as CoReadViewPhase,
    sessionId: "" as string,
    fileName: "" as string,
    chapters: [] as CoReadChapter[],
    currentChapterIndex: 0,
    annotations: [] as CoReadAnnotation[],
    chatMessages: [] as CoReadChatMessage[],
    chapterTextUploaded: {} as Record<number, boolean>,
    chapterCache: {} as Record<number, CoReadChapter>,
    chapterCacheOrder: [] as number[],
    parseError: "" as string,
    sessionError: "" as string,
    openingChapter: false,
    repliesSending: false,
    chapterOpenDone: false,
    /** SSE error code，如 generation_interrupted */
    pageOpenError: "" as string,
    pageIntroText: "" as string,
    /** open 结束但无任何 annotation_*（多为后端解析 LLM 为 0 条） */
    pageOpenEmpty: false,
  }),
  getters: {
    totalChapters: (s) => s.chapters.length,
    isLastChapter: (s) => s.chapters.length > 0 && s.currentChapterIndex >= s.chapters.length - 1,
    pendingReplyCount: (s) =>
      s.annotations.filter((a) => String(a.myReply || "").trim() && !a.replySent).length,
  },
  actions: {
    resetSession() {
      this.phase = "idle"
      this.sessionId = ""
      this.fileName = ""
      this.chapters = []
      this.currentChapterIndex = 0
      this.annotations = []
      this.chatMessages = []
      this.chapterTextUploaded = {}
      this.chapterCache = {}
      this.chapterCacheOrder = []
      this.parseError = ""
      this.sessionError = ""
      this.openingChapter = false
      this.repliesSending = false
      this.chapterOpenDone = false
      this.pageOpenError = ""
      this.pageIntroText = ""
      this.pageOpenEmpty = false
    },
    setFromParse(fileName: string, chapters: CoReadChapter[]) {
      this.fileName = fileName
      this.chapters = chapters
      this.phase = "ready"
      this.currentChapterIndex = 0
      this.annotations = []
      this.chatMessages = []
    },
    setPhase(phase: CoReadViewPhase) {
      this.phase = phase
    },
    cacheChapter(chapter: CoReadChapter) {
      this.chapterCache[chapter.index] = chapter
      this.chapterCacheOrder = this.chapterCacheOrder.filter((i) => i !== chapter.index)
      this.chapterCacheOrder.push(chapter.index)
      while (this.chapterCacheOrder.length > CHAPTER_CACHE_MAX) {
        const evict = this.chapterCacheOrder.shift()
        if (evict !== undefined) delete this.chapterCache[evict]
      }
    },
    getCachedChapter(index: number): CoReadChapter | undefined {
      return this.chapterCache[index] ?? this.chapters.find((c) => c.index === index)
    },
    setSessionCreated(sessionId: string, startChapterIndex: number) {
      this.sessionId = sessionId
      this.currentChapterIndex = startChapterIndex
      try {
        localStorage.setItem(LAST_SESSION_KEY, sessionId)
      } catch {
        /* ignore */
      }
      // 会话建立时立即恢复该用户对此书的本地对话记录
      this.loadPersistedChat()
    },
    loadDraftsForChapter(chapterIndex: number) {
      if (!this.sessionId) return
      let draftMap: Record<string, string> = {}
      try {
        const raw = localStorage.getItem(draftKey(this.sessionId, chapterIndex))
        if (raw) draftMap = JSON.parse(raw) as Record<string, string>
      } catch {
        /* ignore */
      }
      let savedList: string[] = []
      try {
        const raw = localStorage.getItem(savedReplyKey(this.sessionId))
        if (raw) savedList = JSON.parse(raw) as string[]
      } catch {
        /* ignore */
      }
      const savedSet = new Set(savedList)
      this.annotations = this.annotations.map((a) => {
        if (a.chapterIndex !== chapterIndex) return a
        const stableKey = stableReplyKeyOf(a.pageIndex, a.anchor?.paragraphIndex ?? 0, a.anchor?.quote)
        // 稳定键优先；旧版按 annotationId 存的草稿兜底一次
        const draft = draftMap[stableKey] ?? draftMap[a.id] ?? ""
        const replySaved = savedSet.has(stableKey) || savedSet.has(a.id) || !!draft.trim()
        if (!draft.trim() && !a.myReply) return a
        return { ...a, myReply: draft || a.myReply, replySaved }
      })
    },
    saveDraft(annotationId: string, chapterIndex: number, text: string) {
      if (!this.sessionId) return
      const ann = this.annotations.find((a) => a.id === annotationId)
      const stableKey = ann
        ? stableReplyKeyOf(ann.pageIndex, ann.anchor?.paragraphIndex ?? 0, ann.anchor?.quote)
        : null
      if (ann) ann.myReply = text
      if (!stableKey) return
      try {
        const key = draftKey(this.sessionId, chapterIndex)
        const existing = localStorage.getItem(key)
        const map = existing ? (JSON.parse(existing) as Record<string, string>) : {}
        if (text.trim()) map[stableKey] = text
        else delete map[stableKey]
        localStorage.setItem(key, JSON.stringify(map))
      } catch {
        /* ignore */
      }
    },
    /** 删除一条已保存的留言（内容与已保存标记一并清除） */
    deleteReplyDraft(annotationId: string, chapterIndex: number) {
      if (!this.sessionId) return
      const ann = this.annotations.find((a) => a.id === annotationId)
      if (!ann) return
      const stableKey = stableReplyKeyOf(ann.pageIndex, ann.anchor?.paragraphIndex ?? 0, ann.anchor?.quote)
      ann.myReply = ""
      ann.replySaved = false
      try {
        const key = draftKey(this.sessionId, chapterIndex)
        const existing = localStorage.getItem(key)
        if (existing) {
          const map = JSON.parse(existing) as Record<string, string>
          delete map[stableKey]
          delete map[annotationId]
          localStorage.setItem(key, JSON.stringify(map))
        }
        const raw = localStorage.getItem(savedReplyKey(this.sessionId))
        if (raw) {
          const list = (JSON.parse(raw) as string[]).filter((k) => k !== stableKey && k !== annotationId)
          localStorage.setItem(savedReplyKey(this.sessionId), JSON.stringify(list))
        }
      } catch {
        /* ignore */
      }
    },
    markReplySaved(annotationId: string) {
      const ann = this.annotations.find((a) => a.id === annotationId)
      const stableKey = ann
        ? stableReplyKeyOf(ann.pageIndex, ann.anchor?.paragraphIndex ?? 0, ann.anchor?.quote)
        : null
      if (ann) ann.replySaved = true
      if (!stableKey) return
      try {
        const raw = localStorage.getItem(savedReplyKey(this.sessionId))
        const list = raw ? (JSON.parse(raw) as string[]) : []
        if (!list.includes(stableKey)) list.push(stableKey)
        localStorage.setItem(savedReplyKey(this.sessionId), JSON.stringify(list.slice(-500)))
      } catch {
        /* ignore */
      }
    },
    /** 从本地恢复「哪些留言已保存」，决定卡片重开时是 list 还是编辑态 */
    hydrateSavedReplies() {
      if (!this.sessionId) return
      try {
        const raw = localStorage.getItem(savedReplyKey(this.sessionId))
        if (!raw) return
        const list = JSON.parse(raw) as string[]
        if (!Array.isArray(list)) return
        const set = new Set(list)
        this.annotations = this.annotations.map((a) => {
          const stableKey = stableReplyKeyOf(a.pageIndex, a.anchor?.paragraphIndex ?? 0, a.anchor?.quote)
          return set.has(stableKey) || set.has(a.id) ? { ...a, replySaved: true } : a
        })
      } catch {
        /* ignore */
      }
    },
    clearPageOpenError() {
      this.pageOpenError = ""
    },
    appendPageIntro(delta: string) {
      this.pageIntroText += delta || ""
    },
    upsertAnnotation(partial: Partial<CoReadAnnotation> & { id: string }) {
      if (!partial.id) return
      const idx = this.annotations.findIndex((a) => a.id === partial.id)
      if (idx === -1) {
        const fresh: CoReadAnnotation = {
          id: partial.id,
          chapterIndex: partial.chapterIndex ?? this.currentChapterIndex,
          pageIndex: partial.pageIndex,
          anchor: partial.anchor ?? { paragraphIndex: 0 },
          kind: partial.kind ?? "reaction",
          content: partial.content ?? "",
          streaming: true,
        }
        // 新批注到达时立即套用本地草稿：刷新/重开后 annotationId 全新，
        // 只有按稳定键（页码+引文）才能找回用户之前的留言
        try {
          const raw = localStorage.getItem(draftKey(this.sessionId, fresh.chapterIndex))
          if (raw) {
            const map = JSON.parse(raw) as Record<string, string>
            const stableKey = stableReplyKeyOf(fresh.pageIndex, fresh.anchor?.paragraphIndex ?? 0, fresh.anchor?.quote)
            const draft = map[stableKey] ?? map[fresh.id]
            if (draft && draft.trim()) fresh.myReply = draft
          }
        } catch {
          /* ignore */
        }
        try {
          const raw = localStorage.getItem(savedReplyKey(this.sessionId))
          if (raw) {
            const list = JSON.parse(raw) as string[]
            const stableKey = stableReplyKeyOf(fresh.pageIndex, fresh.anchor?.paragraphIndex ?? 0, fresh.anchor?.quote)
            if (list.includes(stableKey) || list.includes(fresh.id)) fresh.replySaved = true
          }
        } catch {
          /* ignore */
        }
        this.annotations.push(fresh)
        return
      }
      const prev = this.annotations[idx]
      this.annotations[idx] = {
        ...prev,
        ...partial,
        anchor: { ...prev.anchor, ...partial.anchor },
        content: partial.content !== undefined ? partial.content : prev.content,
      }
    },
    appendAnnotationDelta(id: string, delta: string) {
      const ann = this.annotations.find((a) => a.id === id)
      if (!ann) return
      ann.content = `${ann.content || ""}${delta || ""}`
    },
    finalizeAnnotation(id: string, content?: string) {
      const ann = this.annotations.find((a) => a.id === id)
      if (ann) {
        ann.streaming = false
        if (content !== undefined && content !== "") ann.content = content
      }
    },
    markReplySent(annotationId: string) {
      const ann = this.annotations.find((a) => a.id === annotationId)
      if (ann) ann.replySent = true
    },
    clearChapterDiscussion() {
      // 保留历史记录（对话栏有「记录」页签展示），仅在显式清空时调用
    },
    /** 将当前对话写入 localStorage（按 sessionId 持久化，重开伴读自动恢复） */
    persistChat() {
      if (!this.sessionId || typeof localStorage === "undefined") return
      try {
        const list: PersistedChatEntry[] = this.chatMessages
          .filter((m) => (m.text || "").trim())
          .map((m) => ({
            id: m.id,
            chapterIndex: this.currentChapterIndex,
            role: m.role,
            text: m.text,
            annotationId: m.annotationId,
            ts: Number(m.id.split("-")[1]) || Date.now(),
          }))
        localStorage.setItem(chatCacheKey(this.sessionId), JSON.stringify(list.slice(-CHAT_CACHE_LIMIT)))
      } catch {
        /* ignore */
      }
    },
    /** 从 localStorage 恢复对话（与服务端 chatByChapter 合并，本地优先） */
    loadPersistedChat() {
      if (!this.sessionId || typeof localStorage === "undefined") return
      try {
        const raw = localStorage.getItem(chatCacheKey(this.sessionId))
        if (!raw) return
        const list = JSON.parse(raw) as PersistedChatEntry[]
        if (!Array.isArray(list)) return
        const existing = new Set(this.chatMessages.map((m) => m.id))
        for (const entry of list) {
          if (existing.has(entry.id)) continue
          this.chatMessages.push({
            id: entry.id,
            role: entry.role,
            text: entry.text,
            annotationId: entry.annotationId,
            streaming: false,
          })
        }
      } catch {
        /* ignore */
      }
    },
    appendChatDelta(role: "user" | "assistant", delta: string, opts?: { annotationId?: string; messageId?: string }) {
      const id = opts?.messageId || (role === "assistant" ? "assistant-stream" : "user-stream")
      let msg = this.chatMessages.find((m) => m.id === id && m.streaming)
      if (!msg) {
        msg = {
          id,
          role,
          text: "",
          annotationId: opts?.annotationId,
          streaming: true,
        }
        this.chatMessages.push(msg)
      }
      msg.text += delta || ""
    },
    finalizeChatStream(messageId: string) {
      const msg = this.chatMessages.find((m) => m.id === messageId)
      if (msg) msg.streaming = false
      this.persistChat()
    },
    addUserChatMessage(text: string, opts?: { annotationId?: string }) {
      this.chatMessages.push({
        id: `user-${Date.now()}`,
        role: "user",
        text,
        annotationId: opts?.annotationId,
      })
      this.persistChat()
    },
    applySessionDetail(detail: CoReadSessionDetail, localChapters?: CoReadChapter[]) {
      this.sessionId = detail.sessionId
      this.fileName = detail.fileName
      if (localChapters?.length) {
        this.chapters = localChapters
      } else if (detail.chapters?.length) {
        this.chapters = detail.chapters.map((m, i) => ({
          index: m.index ?? i,
          title: m.title,
          paragraphs: [],
          charCount: m.charCount ?? 0,
        }))
      }
      this.currentChapterIndex = Math.max(0, (detail.currentChapterIndex ?? 1) - 1)
      this.annotations = []
      const byChapter = detail.annotationsByChapter || {}
      for (const list of Object.values(byChapter)) {
        for (const a of list) {
          this.annotations.push({
            ...a,
            chapterIndex: wireChapterToStoreIndex(a.chapterIndex, a.chapterIndex),
            streaming: false,
          })
        }
      }
      this.chatMessages = []
      const chatBy = detail.chatByChapter || {}
      const chKey = String(this.currentChapterIndex + 1)
      const hist = chatBy[chKey] || chatBy[String(this.currentChapterIndex)] || []
      this.chatMessages = hist.map((m) => ({ ...m, streaming: false }))
      // 合并本地持久化的对话（跨次打开都在）；本地为主、服务端补缺
      this.loadPersistedChat()
      // 恢复已保存留言标记（决定卡片以 list 还是编辑态打开）
      this.hydrateSavedReplies()
      this.phase = "reading"
    },
    annotationsForParagraph(chapterIndex: number, paragraphIndex: number) {
      return this.annotations.filter(
        (a) =>
          a.chapterIndex === chapterIndex &&
          a.anchor.paragraphIndex === paragraphIndex,
      )
    },
  },
})
