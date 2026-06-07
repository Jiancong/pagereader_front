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

function pickAssistantResponse(rows: ConversationHistoryVo[], fromIndex: number): string | null {
  for (let i = fromIndex; i < rows.length; i++) {
    const row = rows[i]
    if (row.role !== "assistant") continue
    const meta = asMeta(row)
    if (meta?.intent === "ppt_generation" || meta?.type === "ppt_generation") continue
    const text = String(row.content || "").trim()
    if (isNoiseAssistantContent(text)) continue
    return text
  }
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
    }
  }

  return items
}
