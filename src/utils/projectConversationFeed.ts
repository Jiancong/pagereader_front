// 社区页「读者对话」：从 conversation history 提取可公开展示的 Q&A 时间线
import type { ConversationHistoryVo } from "@/api/types"

export interface ConversationFeedItem {
  id: string
  term: string
  question: string
  answer: string
  createTime?: string
}

function asMeta(row: ConversationHistoryVo): Record<string, unknown> | null {
  const m = row.metadata
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : null
}

function isRelatedSearchUserRow(row: ConversationHistoryVo): boolean {
  if (row.role !== "user") return false
  const meta = asMeta(row)
  if (meta?.intent === "ppt_related_search" || meta?.type === "ppt_related_search") return true
  const text = String(row.content || "")
  return /explain what\s+"[^"]+"\s+means|关于演示文稿《|请详细解释「|请结合\s*PPT《/i.test(text)
}

function extractTerm(row: ConversationHistoryVo): string {
  const meta = asMeta(row)
  const fromMeta = meta?.term
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim()
  const text = String(row.content || "")
  const en = text.match(/explain what\s+"([^"]+)"/i)
  if (en?.[1]) return en[1].trim()
  const zh = text.match(/「([^」]+)」/)
  if (zh?.[1]) return zh[1].trim()
  return text.slice(0, 48)
}

function pickAssistantAnswer(rows: ConversationHistoryVo[], fromIndex: number): string {
  for (let i = fromIndex; i < rows.length; i++) {
    const row = rows[i]
    if (row.role === "user") break
    if (row.role !== "assistant") continue
    const text = String(row.content || "").trim()
    if (text) return text
  }
  return ""
}

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

/** 提取 PPT 划词追问 Q&A，按时间升序 */
export function extractConversationFeedItems(
  history: ConversationHistoryVo[],
): ConversationFeedItem[] {
  const rows = sortHistory(history)
  const out: ConversationFeedItem[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!isRelatedSearchUserRow(row)) continue
    const term = extractTerm(row)
    const answer = pickAssistantAnswer(rows, i + 1)
    if (!term && !answer) continue
    out.push({
      id: String(row.id ?? `conv-${i}`),
      term,
      question: String(row.content || "").trim(),
      answer,
      createTime: row.createTime,
    })
  }
  return out
}
