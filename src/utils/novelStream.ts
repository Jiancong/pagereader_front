// novel_complete SSE 载荷解析、history 持久化与 Markdown 恢复
// @author hc

import type { ConversationHistoryVo, ProjectVo } from "@/api/types"
import {
  appendProjectConversationMessage,
  getProjectConversationHistory,
} from "@/api/feed"

const NOVEL_LOCAL_CACHE_PREFIX = "pr_novel_cache_v1:"

export type NovelNode = {
  node_key?: string
  title?: string
  order?: number
  content_type?: string
  text?: string
  table_markdown?: string
  characters?: Array<{ name?: string; role?: string }>
  chapters?: Array<{ index?: number; title?: string; text?: string; content_type?: string }>
  chapter_count?: number
  items?: Array<{ index?: number; question?: string; answer?: string }>
  qa_count?: number
}

export type NovelData = {
  title?: string
  format?: string
  document_type?: string
  markdown?: string
  novel_nodes?: NovelNode[]
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

function parseMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata)
      return asRecord(parsed)
    } catch {
      return null
    }
  }
  return null
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

function pickNovelNodes(obj: Record<string, unknown>): NovelNode[] | null {
  const direct = obj.novel_nodes
  if (Array.isArray(direct) && direct.length > 0) return direct as NovelNode[]

  const nested = pickNovelData(obj)
  if (nested?.novel_nodes?.length) return nested.novel_nodes

  const payload = asRecord(obj.payload)
  if (payload) {
    const fromPayload = pickNovelNodes(payload)
    if (fromPayload?.length) return fromPayload
  }
  return null
}

function sortNovelNodes(nodes: NovelNode[]): NovelNode[] {
  return [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function pickTitleFromResponse(response: string): string {
  const zh = response.match(/《([^》]+)》/)
  if (zh?.[1]) return zh[1].trim()
  const en = response.match(/"([^"]+)"/)
  if (en?.[1]) return en[1].trim()
  return ""
}

/** 将 novel_nodes 结构组装为 Markdown 正文 */
export function buildMarkdownFromNovelNodes(
  nodes: NovelNode[],
  options?: { title?: string },
): string {
  if (!nodes.length) return ""

  const parts: string[] = []
  const title = pickString(options?.title)
  if (title) parts.push(`# ${title}`, "")

  for (const node of sortNovelNodes(nodes)) {
    const heading = pickString(node.title)
    if (heading) parts.push(`## ${heading}`, "")

    const contentType = pickString(node.content_type).toLowerCase()

    if (contentType === "markdown" && pickString(node.text)) {
      parts.push(pickString(node.text), "")
      continue
    }

    if (contentType === "character_table") {
      const table = pickString(node.table_markdown)
      if (table) {
        parts.push(table, "")
      } else if (Array.isArray(node.characters) && node.characters.length) {
        parts.push("| 姓名 | 角色 |", "| --- | --- |")
        for (const row of node.characters) {
          parts.push(`| ${pickString(row.name)} | ${pickString(row.role)} |`)
        }
        parts.push("")
      }
      continue
    }

    if (contentType === "chapter_list" && Array.isArray(node.chapters)) {
      for (const chapter of node.chapters) {
        const chapterTitle = pickString(chapter.title)
        if (chapterTitle) parts.push(`### ${chapterTitle}`, "")
        const text = pickString(chapter.text)
        if (text) parts.push(text, "")
      }
      continue
    }

    if (contentType === "qa_list" && Array.isArray(node.items)) {
      for (const item of node.items) {
        const q = pickString(item.question)
        const a = pickString(item.answer)
        if (q) parts.push(`### ${item.index != null ? `${item.index}. ` : ""}${q}`, "")
        if (a) parts.push(a, "")
      }
      continue
    }

    if (pickString(node.text)) parts.push(pickString(node.text), "")
  }

  return parts.join("\n").trim()
}

function pickNovelStats(root: Record<string, unknown>, nodes: NovelNode[] | null) {
  let chapterCount =
    typeof root.chapter_count === "number" ? root.chapter_count : undefined
  let qaCount = typeof root.qa_count === "number" ? root.qa_count : undefined
  let characterCount =
    typeof root.character_count === "number" ? root.character_count : undefined

  if (nodes?.length) {
    for (const node of nodes) {
      const key = pickString(node.node_key)
      if (key === "chapter_guide") {
        chapterCount =
          node.chapter_count ??
          (Array.isArray(node.chapters) ? node.chapters.length : chapterCount)
      }
      if (key === "qa") {
        qaCount = node.qa_count ?? (Array.isArray(node.items) ? node.items.length : qaCount)
      }
      if (key === "characters" && Array.isArray(node.characters)) {
        characterCount = node.characters.length
      }
    }
  }

  const inline = pickNovelData(root)
  return {
    chapterCount: chapterCount ?? inline?.chapter_count,
    qaCount: qaCount ?? inline?.qa_count,
    characterCount: characterCount ?? inline?.character_count,
  }
}

function pickNovelData(obj: Record<string, unknown>): NovelData | null {
  const nested =
    asRecord(obj.novel_data) ??
    asRecord(asRecord(obj.payload)?.novel_data) ??
    asRecord(asRecord(obj.payload)?.payload)
  if (!nested) return null
  const markdown = pickString(nested.markdown)
  const nodes = nested.novel_nodes
  if (!markdown && !pickString(nested.title) && !(Array.isArray(nodes) && nodes.length)) return null
  return nested as NovelData
}

export function looksLikeNovelArtifact(url: string): boolean {
  const s = String(url || "").toLowerCase()
  return (
    s.includes("/skill-artifacts/novel/") ||
    (s.includes("/novel/") && s.endsWith(".json"))
  )
}

function pickNovelDataUrl(obj: Record<string, unknown>): string {
  return (
    pickString(obj.novel_data_url) ||
    pickString(obj.remote_url) ||
    pickString(asRecord(obj.novel_data_artifact)?.url)
  )
}

function extractMarkdownFromResponse(response: string): string {
  const text = response.trim()
  if (!text) return ""
  const idx = text.search(/\n#\s+\S/)
  if (idx >= 0) return text.slice(idx).trim()
  if (/^#\s+\S/m.test(text)) return text
  return ""
}

function pickNovelSummaryContent(response: string): string {
  const text = response.trim()
  if (!text) return ""
  const markdownStart = text.search(/\n#\s+\S/)
  if (markdownStart > 0) return text.slice(0, markdownStart).trim()
  const firstBlock = text.split(/\n\n+/)[0]?.trim()
  return firstBlock || text.slice(0, 280)
}

function isNovelHistoryRow(rec: Record<string, unknown>): boolean {
  const meta = parseMetadataRecord(rec.metadata)
  if (meta && isNovelMetadata(meta)) return true
  if (isNovelStreamPayload(rec)) return true
  if (isNovelStreamPayload(meta)) return true

  const content = pickString(rec.content)
  if (/已生成小说导读|novel reading guide|novel guide/i.test(content)) return true
  if (/##\s*全书摘要|##\s*章节导读/i.test(content)) return true

  if (pickNovelDataUrl(rec) || pickNovelDataUrl(meta ?? {})) return true
  if (pickNovelNodes(rec)?.length) return true
  if (meta && pickNovelNodes(meta)?.length) return true
  for (const url of rec.imageUrls ?? []) {
    if (looksLikeNovelArtifact(String(url))) return true
  }
  return false
}

function mergeNovelPayloadFromHistoryRow(rec: Record<string, unknown>): Record<string, unknown> {
  const meta = parseMetadataRecord(rec.metadata) ?? {}
  const response = pickString(rec.content) || pickString(meta.response)
  const url = pickNovelDataUrl(rec) || pickNovelDataUrl(meta)
  const imageUrls = Array.isArray(rec.imageUrls) ? rec.imageUrls : []

  return {
    ...meta,
    output_format: meta.output_format ?? "novel",
    intent: meta.intent ?? "novel_generation",
    is_novel_response: meta.is_novel_response ?? true,
    novel_generation: meta.novel_generation ?? true,
    response,
    markdown:
      pickString(rec.markdown) ||
      pickString(rec.markdow) ||
      pickString(meta.markdown) ||
      pickString(meta.markdown_content),
    markdown_content:
      pickString(rec.markdown) ||
      pickString(meta.markdown_content) ||
      pickString(meta.markdown),
    novel_data_url: url || undefined,
    remote_url: url || undefined,
    novel_data_artifact: meta.novel_data_artifact ?? rec.novel_data_artifact,
    novel_data: meta.novel_data ?? rec.novel_data,
    novel_nodes: meta.novel_nodes ?? rec.novel_nodes,
    chapter_count: meta.chapter_count ?? rec.chapter_count,
    qa_count: meta.qa_count ?? rec.qa_count,
    imageUrls,
  }
}

/** 从 project + conversation/history 收集 novel OSS JSON 地址 */
export function collectNovelUrls(
  proj: ProjectVo | null | undefined,
  hist: ConversationHistoryVo[] | unknown[],
): string[] {
  const urls: string[] = []
  const cfg = String(proj?.configFilePath ?? "").trim()
  if (cfg && looksLikeNovelArtifact(cfg)) urls.push(cfg)

  const assistantRows = [...hist].reverse().filter((h) => asRecord(h)?.role === "assistant")
  for (const row of assistantRows) {
    const rec = asRecord(row)
    if (!rec) continue
    const meta = parseMetadataRecord(rec.metadata)
    const fromMeta = pickNovelDataUrl(meta ?? {})
    if (fromMeta) urls.push(fromMeta)
    const fromRow = pickNovelDataUrl(rec)
    if (fromRow) urls.push(fromRow)
    for (const url of rec.imageUrls ?? []) {
      if (url && looksLikeNovelArtifact(String(url))) urls.push(String(url))
    }
  }
  return [...new Set(urls.filter(Boolean))]
}

/** 将 novel_complete 转为可写入 conversation/history 的 assistant 消息 */
export function buildNovelHistoryAssistantRecord(
  payload: unknown,
): Omit<ConversationHistoryVo, "id" | "projectId"> | null {
  if (!isNovelStreamPayload(payload)) return null
  const root = asRecord(payload)
  if (!root) return null

  const response = pickString(root.response) || pickString(root.message)
  const url = pickNovelDataUrl(root)
  const inline = pickNovelData(root)
  const nodes = pickNovelNodes(root)
  const ossUploaded = root.novel_data_oss_uploaded === true
  const title =
    pickString(inline?.title) ||
    pickString(root.title) ||
    pickTitleFromResponse(response)

  const metadata: Record<string, unknown> = {
    is_novel_response: true,
    novel_generation: true,
    intent: root.intent ?? "novel_generation",
    sub_intent: root.sub_intent,
    output_format: root.output_format ?? "novel",
    generation_mode: root.generation_mode ?? "novel",
    document_format: root.document_format ?? "markdown",
    novel_data_oss_uploaded: root.novel_data_oss_uploaded,
    novel_data_artifact: root.novel_data_artifact,
    response,
  }
  if (url) {
    metadata.novel_data_url = url
    metadata.remote_url = url
  }
  if (inline && !ossUploaded) metadata.novel_data = inline
  if (nodes?.length) metadata.novel_nodes = nodes

  const stats = pickNovelStats(root, nodes)
  if (stats.chapterCount != null) metadata.chapter_count = stats.chapterCount
  if (stats.qaCount != null) metadata.qa_count = stats.qaCount

  const record: Omit<ConversationHistoryVo, "id" | "projectId"> = {
    role: "assistant",
    content: pickNovelSummaryContent(response) || response.slice(0, 280) || "Novel guide ready",
    metadata,
  }

  if (url) record.imageUrls = [url]

  const inlineMarkdown =
    pickString(inline?.markdown) ||
    (nodes?.length ? buildMarkdownFromNovelNodes(nodes, { title }) : "") ||
    pickString(root.markdown_content) ||
    pickString(root.markdown) ||
    extractMarkdownFromResponse(response)

  if (inlineMarkdown) {
    record.markdown = inlineMarkdown
  }

  return record
}

function historyAlreadyHasNovelGuide(history: unknown[]): boolean {
  for (const row of history) {
    const rec = asRecord(row)
    if (!rec || rec.role !== "assistant") continue

    if (pickNovelNodes(rec)?.length) return true

    const meta = parseMetadataRecord(rec.metadata)
    if (meta && pickNovelNodes(meta)?.length) return true

    if (pickNovelDataUrl(rec) || pickNovelDataUrl(meta ?? {})) return true

    const md = pickString(rec.markdown) || pickString(meta?.markdown)
    if (md && /##\s*(全书摘要|人物表|章节导读|问答)/.test(md)) return true
  }
  return false
}

/** 本地缓存 novel_complete（后端 history 未落库时的兜底，同浏览器可恢复） */
export function cacheNovelResultLocally(projectId: string, payload: unknown): void {
  if (typeof window === "undefined") return
  const id = String(projectId || "").trim()
  const root = asRecord(payload)
  if (!id || !root || !isNovelStreamPayload(root)) return

  try {
    const record = buildNovelHistoryAssistantRecord(payload)
    window.localStorage.setItem(
      `${NOVEL_LOCAL_CACHE_PREFIX}${id}`,
      JSON.stringify({
        payload: root,
        record,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* quota / private mode */
  }
}

function readNovelPayloadFromLocalCache(projectId: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null
  const id = String(projectId || "").trim()
  if (!id) return null
  try {
    const raw = window.localStorage.getItem(`${NOVEL_LOCAL_CACHE_PREFIX}${id}`)
    if (!raw) return null
    const parsed = asRecord(JSON.parse(raw))
    if (!parsed) return null
    return asRecord(parsed.payload) ?? asRecord(parsed.record)
  } catch {
    return null
  }
}

/** novel_complete 完成后写入 conversation/history（后端未落库时的兜底） */
export async function persistNovelCompleteToHistory(
  projectId: string,
  payload: unknown,
): Promise<boolean> {
  const id = String(projectId || "").trim()
  if (!id || !isNovelStreamPayload(payload)) return false

  cacheNovelResultLocally(id, payload)

  try {
    const hist = await getProjectConversationHistory(id).catch(() => [])
    if (historyAlreadyHasNovelGuide(hist)) return true

    const record = buildNovelHistoryAssistantRecord(payload)
    if (!record) return false

    await appendProjectConversationMessage(id, record)
    return true
  } catch (error) {
    console.warn("[novel] failed to persist assistant message to conversation/history", error)
    return false
  }
}

async function fetchNovelArtifactPayload(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const root = asRecord(json)
  if (!root) return null
  return asRecord(root.payload) ?? root
}

async function fetchNovelArtifact(url: string): Promise<NovelData | null> {
  const payload = await fetchNovelArtifactPayload(url)
  if (!payload) return null
  const data = pickNovelData({ payload, novel_data: payload, ...payload }) ?? (payload as NovelData)
  if (pickString(data.markdown) || data.novel_nodes?.length || pickString(data.title)) return data
  return null
}

/** 从 novel_complete 或历史 metadata 恢复 Markdown */
export async function getNovelMarkdown(payload: unknown): Promise<string> {
  const root = asRecord(payload)
  if (!root) return ""

  const response = pickString(root.response)
  const title =
    pickString(root.title) ||
    pickTitleFromResponse(response) ||
    pickString(pickNovelData(root)?.title)

  const inlineNodes = pickNovelNodes(root)
  if (inlineNodes?.length) {
    const fromNodes = buildMarkdownFromNovelNodes(inlineNodes, { title })
    if (fromNodes) return fromNodes
  }

  const inline = pickNovelData(root)
  if (inline?.markdown) return inline.markdown
  if (inline?.novel_nodes?.length) {
    const fromNodes = buildMarkdownFromNovelNodes(inline.novel_nodes, { title })
    if (fromNodes) return fromNodes
  }

  const url = pickNovelDataUrl(root)
  if (url) {
    const fetchedPayload = await fetchNovelArtifactPayload(url)
    if (fetchedPayload) {
      const fetchedNodes = pickNovelNodes(fetchedPayload)
      if (fetchedNodes?.length) {
        const fromNodes = buildMarkdownFromNovelNodes(fetchedNodes, { title })
        if (fromNodes) return fromNodes
      }
      const fetched = await fetchNovelArtifact(url)
      if (fetched?.markdown) return fetched.markdown
      if (fetched?.novel_nodes?.length) {
        return buildMarkdownFromNovelNodes(fetched.novel_nodes, { title })
      }
    }
  }

  return (
    pickString(root.markdown_content) ||
    pickString(root.markdown) ||
    extractMarkdownFromResponse(response) ||
    response
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
  const nodes = pickNovelNodes(root)
  const stats = pickNovelStats(root, nodes)
  const response = pickString(root.response)
  const title =
    pickString(inline?.title) ||
    pickString(root.title) ||
    pickTitleFromResponse(response) ||
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()

  return {
    title: title || undefined,
    markdown,
    message:
      pickNovelSummaryContent(response) ||
      pickString(root.message) ||
      undefined,
    novelDataUrl: pickNovelDataUrl(root) || undefined,
    chapterCount: stats.chapterCount,
    qaCount: stats.qaCount,
    characterCount: stats.characterCount,
  }
}

export function pickNovelMetadataFromHistory(history: unknown[]): Record<string, unknown> | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i]
    const rec = asRecord(row)
    if (!rec) continue
    if (rec.role !== "assistant" && !parseMetadataRecord(rec.metadata)) continue
    if (!isNovelHistoryRow(rec)) continue
    return mergeNovelPayloadFromHistoryRow(rec)
  }
  return null
}

export async function resolveNovelFromHistory(
  history: unknown[],
  project?: ProjectVo | null,
): Promise<NovelResult | null> {
  const meta = pickNovelMetadataFromHistory(history)
  if (meta) {
    const resolved = await resolveNovelFromStreamComplete(meta)
    if (resolved) return resolved
  }

  for (const url of collectNovelUrls(project, history)) {
    const resolved = await resolveNovelFromStreamComplete({
      output_format: "novel",
      intent: "novel_generation",
      is_novel_response: true,
      novel_data_url: url,
      remote_url: url,
    })
    if (resolved) return resolved
  }

  const projectId = String(
    project?.id ?? asRecord(history[0])?.projectId ?? "",
  ).trim()
  if (projectId) {
    const cached = readNovelPayloadFromLocalCache(projectId)
    if (cached) {
      const resolved = await resolveNovelFromStreamComplete(cached)
      if (resolved) return resolved
    }
  }

  return null
}
