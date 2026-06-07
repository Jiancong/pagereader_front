import type { ConversationHistoryVo } from "@/api/types"

export interface ChatHistoryDisplayItem {
  id: string | number
  role: "user" | "assistant"
  content: string
}

type PptDeckSummary = {
  title?: string
  total_slides?: number
}

type DisplayLabels = {
  deckReady: (title: string, slides: number) => string
  relatedAsk: (term: string) => string
  noAnswer?: string
}

export type RelatedSearchSessionEntry = {
  term: string
  content: string
  error?: string
}

const NOISE_ASSISTANT_RE =
  /^(连接成功|connected|connection\s*(successful|established))$/i

const PROGRESS_ASSISTANT_RE =
  /^(starting\s+ppt\s+generation|正在生成|正在准备|generating|preparing)/i

const RELATED_SEARCH_USER_RE =
  /explain what\s+"[^"]+"\s+means|关于演示文稿《|请详细解释「|请结合\s*PPT《|In the deck\s+"/i

function sortHistory(rows: ConversationHistoryVo[]): ConversationHistoryVo[] {
  return [...rows].sort((a, b) => {
    const sa = a.sequenceNumber ?? 0
    const sb = b.sequenceNumber ?? 0
    if (sa !== sb) return sa - sb
    const ta = a.createTime ? Date.parse(a.createTime) : 0
    const tb = b.createTime ? Date.parse(b.createTime) : 0
    return ta - tb
  })
}

function asMeta(row: ConversationHistoryVo): Record<string, unknown> | null {
  const m = row.metadata
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : null
}

function isRelatedSearchRow(row: ConversationHistoryVo): boolean {
  if (row.role !== "user") return false
  const meta = asMeta(row)
  if (meta?.intent === "ppt_related_search" || meta?.type === "ppt_related_search") return true
  return RELATED_SEARCH_USER_RE.test(String(row.content || ""))
}

function extractRelatedSearchTerm(content: string): string | null {
  const text = String(content || "").trim()
  const en = text.match(/explain what\s+"([^"]+)"/i)
  if (en?.[1]) return en[1].trim()
  const zh = text.match(/「([^」]+)」/)
  if (zh?.[1]) return zh[1].trim()
  const zh2 = text.match(/《[^》]+》[^「]*「([^」]+)」/)
  if (zh2?.[1]) return zh2[1].trim()
  return null
}

function isNoiseAssistantContent(content: string): boolean {
  const text = String(content || "").trim()
  if (!text) return true
  if (NOISE_ASSISTANT_RE.test(text)) return true
  if (PROGRESS_ASSISTANT_RE.test(text)) return true
  if (/deep research/i.test(text)) return true
  if (text.length <= 16 && !/[.!?。！？\n]/.test(text)) return true
  return false
}

function assistantTextFromRow(row: ConversationHistoryVo): string | null {
  const meta = asMeta(row)
  if (meta?.intent === "ppt_generation" || meta?.type === "ppt_generation") return null

  const metaText = [meta?.response, meta?.responseContent, meta?.knowledge_response, meta?.content]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v && !isNoiseAssistantContent(v))
  if (metaText) return metaText

  const text = String(row.content || "").trim()
  if (!text || isNoiseAssistantContent(text)) return null
  return text
}

function pickAssistantResponse(rows: ConversationHistoryVo[], fromIndex: number): string | null {
  for (let i = fromIndex; i < rows.length; i++) {
    const row = rows[i]
    if (row.role === "user") break
    if (row.role !== "assistant") continue
    const text = assistantTextFromRow(row)
    if (text) return text
  }
  return null
}

function relatedUserContentMatchesTerm(
  userContent: string,
  term: string,
  relatedAsk: (term: string) => string,
): boolean {
  const normalizedTerm = term.trim().toLowerCase()
  if (!normalizedTerm) return false
  if (userContent === relatedAsk(term)) return true
  return userContent.toLowerCase().includes(normalizedTerm)
}

function sessionAssistantContent(
  entry: RelatedSearchSessionEntry,
  noAnswer?: string,
): string | null {
  const text = String(entry.content || "").trim()
  if (text) return text
  if (entry.error && noAnswer) return noAnswer
  return null
}

function buildDeckSummary(pptData: PptDeckSummary | null, labels: DisplayLabels): string | null {
  if (!pptData) return null
  const title = String(pptData.title || "").trim() || "Presentation"
  const slides = Number(pptData.total_slides)
  const count = Number.isFinite(slides) && slides > 0 ? slides : 0
  return labels.deckReady(title, count)
}

/**
 * 将后端 conversation/history 整理为右侧栏展示项：
 * - 首条：用户生成 prompt + PPT 产物摘要（非进度/连接文案）
 * - 其余：划词追问 term + 有效回答（过滤「连接成功」等）
 */
export function buildPptChatHistoryDisplay(
  history: ConversationHistoryVo[],
  pptData: PptDeckSummary | null,
  labels: DisplayLabels,
): ChatHistoryDisplayItem[] {
  if (!Array.isArray(history) || !history.length) return []

  const sorted = sortHistory(history)
  const items: ChatHistoryDisplayItem[] = []
  const seenRelatedTerms = new Set<string>()
  const seenRelatedPrompts = new Set<string>()

  const firstUser = sorted.find((r) => r.role === "user" && !isRelatedSearchRow(r))
  if (firstUser) {
    items.push({
      id: firstUser.id,
      role: "user",
      content: String(firstUser.content || "").trim(),
    })
    const deckSummary = buildDeckSummary(pptData, labels)
    if (deckSummary) {
      items.push({
        id: `${firstUser.id}-deck`,
        role: "assistant",
        content: deckSummary,
      })
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]
    if (row.role !== "user" || !isRelatedSearchRow(row)) continue

    const raw = String(row.content || "").trim()
    if (!raw || seenRelatedPrompts.has(raw)) continue
    seenRelatedPrompts.add(raw)

    const term = extractRelatedSearchTerm(raw)
    const dedupeKey = (term || raw).toLowerCase()
    if (seenRelatedTerms.has(dedupeKey)) continue
    seenRelatedTerms.add(dedupeKey)

    items.push({
      id: row.id,
      role: "user",
      content: term ? labels.relatedAsk(term) : raw,
    })

    const answer = pickAssistantResponse(sorted, i + 1)
    if (answer) {
      items.push({
        id: `${row.id}-answer`,
        role: "assistant",
        content: answer,
      })
    } else if (labels.noAnswer) {
      items.push({
        id: `${row.id}-no-answer`,
        role: "assistant",
        content: labels.noAnswer,
      })
    }
  }

  return items
}

/**
 * 将当前会话内划词追问的实时回答补进展示列表（后端未持久化时仍可显示）。
 */
export function mergeRelatedSearchAnswersIntoDisplay(
  items: ChatHistoryDisplayItem[],
  sessions: RelatedSearchSessionEntry[],
  labels: Pick<DisplayLabels, "relatedAsk" | "noAnswer">,
): ChatHistoryDisplayItem[] {
  if (!sessions.length) return items

  const result = [...items]
  const filledTerms = new Set<string>()

  for (let i = 0; i < result.length; i++) {
    const row = result[i]
    if (row.role !== "user") continue
    const next = result[i + 1]
    if (next?.role !== "assistant") continue
    for (const session of sessions) {
      if (relatedUserContentMatchesTerm(row.content, session.term, labels.relatedAsk)) {
        filledTerms.add(session.term.trim().toLowerCase())
      }
    }
  }

  for (const session of sessions) {
    const term = session.term.trim()
    if (!term) continue
    const dedupeKey = term.toLowerCase()
    const assistantContent = sessionAssistantContent(session, labels.noAnswer)
    if (!assistantContent) continue

    if (filledTerms.has(dedupeKey)) {
      for (let i = 0; i < result.length; i++) {
        const row = result[i]
        if (row.role !== "user") continue
        if (!relatedUserContentMatchesTerm(row.content, term, labels.relatedAsk)) continue
        const next = result[i + 1]
        if (next?.role === "assistant" && next.content === labels.noAnswer) {
          result[i + 1] = {
            ...next,
            content: assistantContent,
          }
        }
        break
      }
      continue
    }

    let inserted = false
    for (let i = 0; i < result.length; i++) {
      const row = result[i]
      if (row.role !== "user") continue
      if (!relatedUserContentMatchesTerm(row.content, term, labels.relatedAsk)) continue
      if (result[i + 1]?.role === "assistant") {
        filledTerms.add(dedupeKey)
        inserted = true
        break
      }
      result.splice(i + 1, 0, {
        id: `session-${dedupeKey}-answer`,
        role: "assistant",
        content: assistantContent,
      })
      filledTerms.add(dedupeKey)
      inserted = true
      break
    }

    if (!inserted) {
      result.push({
        id: `session-${dedupeKey}-user`,
        role: "user",
        content: labels.relatedAsk(term),
      })
      result.push({
        id: `session-${dedupeKey}-answer`,
        role: "assistant",
        content: assistantContent,
      })
      filledTerms.add(dedupeKey)
    }
  }

  return result
}
