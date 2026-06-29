// novel_complete SSE 载荷解析与 Markdown 恢复
// @author hc

export type NovelData = {
  title?: string
  format?: string
  document_type?: string
  markdown?: string
  date?: string
  chapter_count?: number
  qa_count?: number
  character_count?: number
}

export type NovelResult = {
  title?: string
  markdown: string
  message?: string
  novelDataUrl?: string
  chapterCount?: number
  qaCount?: number
  characterCount?: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** 优先用 output_format / intent 判断，勿用 has_markdown 或 word_complete */
export function isNovelStreamPayload(payload: unknown): boolean {
  const root = asRecord(payload)
  if (!root) return false

  if (root.output_format === "novel") return true
  if (root.intent === "novel_generation") return true
  if (root.is_novel_response === true || root.novel_generation === true) return true

  const status = pickString(root.status).toLowerCase()
  const state = pickString(root.state).toLowerCase()
  if (status === "novel_complete" || state === "novel_complete") return true

  return false
}

export function isNovelMetadata(meta: unknown): boolean {
  return isNovelStreamPayload(meta)
}

function pickNovelData(obj: Record<string, unknown>): NovelData | null {
  const nested =
    asRecord(obj.novel_data) ??
    asRecord(asRecord(obj.payload)?.novel_data) ??
    asRecord(asRecord(obj.payload)?.payload)
  if (!nested) return null
  const markdown = pickString(nested.markdown)
  if (!markdown && !pickString(nested.title)) return null
  return nested as NovelData
}

function pickNovelDataUrl(obj: Record<string, unknown>): string {
  return (
    pickString(obj.novel_data_url) ||
    pickString(obj.remote_url) ||
    pickString(asRecord(obj.novel_data_artifact)?.url)
  )
}

async function fetchNovelArtifact(url: string): Promise<NovelData | null> {
  const res = await fetch(url, { credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const root = asRecord(json)
  if (!root) return null
  const payload = asRecord(root.payload) ?? root
  const data = pickNovelData(payload) ?? (payload as NovelData)
  const markdown = pickString(data?.markdown)
  if (!markdown) return null
  return data
}

/** 从 novel_complete 或历史 metadata 恢复 Markdown */
export async function getNovelMarkdown(payload: unknown): Promise<string> {
  const root = asRecord(payload)
  if (!root) return ""

  const inline = pickNovelData(root)
  if (inline?.markdown) return inline.markdown

  const url = pickNovelDataUrl(root)
  if (url) {
    const fetched = await fetchNovelArtifact(url)
    if (fetched?.markdown) return fetched.markdown
  }

  return (
    pickString(root.markdown_content) ||
    pickString(root.markdown) ||
    pickString(root.response)
  )
}

export async function resolveNovelFromStreamComplete(
  payload: unknown,
): Promise<NovelResult | null> {
  if (!isNovelStreamPayload(payload)) return null
  const root = asRecord(payload)
  if (!root) return null

  const markdown = await getNovelMarkdown(root)
  if (!markdown) return null

  const inline = pickNovelData(root)
  const title =
    pickString(inline?.title) ||
    pickString(root.title) ||
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()

  return {
    title: title || undefined,
    markdown,
    message: pickString(root.response) || pickString(root.message) || undefined,
    novelDataUrl: pickNovelDataUrl(root) || undefined,
    chapterCount: inline?.chapter_count ?? undefined,
    qaCount: inline?.qa_count ?? undefined,
    characterCount: inline?.character_count ?? undefined,
  }
}

export function pickNovelMetadataFromHistory(history: unknown[]): Record<string, unknown> | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i]
    const rec = asRecord(row)
    if (!rec) continue
    const meta = asRecord(rec.metadata)
    if (meta && isNovelMetadata(meta)) return meta
    if (rec.role === "assistant" && isNovelStreamPayload(rec)) return rec
  }
  return null
}

export async function resolveNovelFromHistory(
  history: unknown[],
): Promise<NovelResult | null> {
  const meta = pickNovelMetadataFromHistory(history)
  if (!meta) return null
  return resolveNovelFromStreamComplete(meta)
}
