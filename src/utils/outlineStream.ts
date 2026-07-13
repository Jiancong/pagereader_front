// outline_complete SSE 载荷解析、history 持久化与 Markdown 恢复

import type { ConversationHistoryVo } from "@/api/types"
import { appendProjectConversationMessage } from "@/api/feed"

export type OutlineSection = {
  index: number
  title: string
  heading: string
  time_hint: string
  start_seconds?: number
  text: string
  total: number
}

export type OutlineNode = {
  node_key?: string
  title?: string
  order?: number
  content_type?: string
  text?: string
  sections?: OutlineSection[]
  section_count?: number
}

export type OutlineData = {
  title?: string
  document_type?: string
  date?: string
  video_id?: string
  youtube_url?: string
  channel_name?: string
  published_at?: string
  markdown?: string
  nodes?: OutlineNode[]
  outline_nodes?: OutlineNode[]
  section_count?: number
  char_count?: number
}

export type OutlineResult = {
  title?: string
  markdown: string
  message?: string
  outlineDataUrl?: string
  sections: OutlineSection[]
  youtubeUrl?: string
  videoId?: string
  channelName?: string
  sectionCount?: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function parseMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }
  if (typeof metadata === "string") {
    try {
      return asRecord(JSON.parse(metadata))
    } catch {
      return null
    }
  }
  return null
}

export function isOutlineStreamPayload(payload: unknown): boolean {
  const root = asRecord(payload)
  if (!root) return false

  if (root.output_format === "outline") return true
  if (root.intent === "outline_generation") return true
  if (root.is_outline_response === true || root.outline_generation === true) return true

  const status = pickString(root.status).toLowerCase()
  const state = pickString(root.state).toLowerCase()
  if (status === "outline_complete" || state === "outline_complete") return true

  return false
}

export function parseOutlineSection(data: unknown): OutlineSection | null {
  const root = asRecord(data)
  if (!root) return null

  const index = Number(root.index)
  if (!Number.isFinite(index) || index <= 0) return null

  const title = pickString(root.title)
  const heading = pickString(root.heading) || title
  const text = pickString(root.text)
  if (!heading && !text) return null

  const startSeconds = Number(root.start_seconds)
  return {
    index,
    title: title || heading,
    heading: heading || title || `Section ${index}`,
    time_hint: pickString(root.time_hint),
    start_seconds: Number.isFinite(startSeconds) && startSeconds >= 0 ? startSeconds : undefined,
    text,
    total: Number(root.total) || 0,
  }
}

function normalizeOutlineSections(raw: unknown): OutlineSection[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => parseOutlineSection(item))
    .filter((item): item is OutlineSection => Boolean(item))
    .sort((a, b) => a.index - b.index)
}

function pickOutlineDataUrl(obj: Record<string, unknown>): string {
  return (
    pickString(obj.outline_data_url) ||
    pickString(obj.remote_url) ||
    pickString(asRecord(obj.outline_data_artifact)?.url)
  )
}

function pickOutlineData(obj: Record<string, unknown>): OutlineData | null {
  const nested =
    asRecord(obj.outline_data) ??
    asRecord(asRecord(obj.payload)?.outline_data) ??
    asRecord(asRecord(obj.payload)?.payload)
  if (!nested) return null

  const markdown = pickString(nested.markdown)
  const nodes = nested.outline_nodes ?? nested.nodes
  if (!markdown && !pickString(nested.title) && !(Array.isArray(nodes) && nodes.length)) return null
  return nested as OutlineData
}

function pickOutlineNodes(obj: Record<string, unknown>): OutlineNode[] | null {
  const direct = obj.outline_nodes ?? obj.nodes
  if (Array.isArray(direct) && direct.length > 0) return direct as OutlineNode[]

  const node = asRecord(obj.node)
  if (node) return [node as OutlineNode]

  const nested = pickOutlineData(obj)
  if (nested?.outline_nodes?.length) return nested.outline_nodes
  if (nested?.nodes?.length) return nested.nodes

  const payload = asRecord(obj.payload)
  if (payload) {
    const fromPayload = pickOutlineNodes(payload)
    if (fromPayload?.length) return fromPayload
  }
  return null
}

function buildMarkdownFromSections(sections: OutlineSection[], title?: string): string {
  const parts: string[] = []
  if (title) parts.push(`# ${title}`, "")
  for (const section of sections) {
    const heading = section.heading || section.title || `Section ${section.index}`
    parts.push(`## ${heading}`, "")
    if (section.text) parts.push(section.text, "")
  }
  return parts.join("\n").trim()
}

function buildMarkdownFromOutlineNodes(nodes: OutlineNode[], title?: string): string {
  const primary = nodes.find((node) => pickString(node.text)) ?? nodes[0]
  const nodeText = pickString(primary?.text)
  if (nodeText) return nodeText

  const sections = normalizeOutlineSections(primary?.sections)
  if (sections.length) {
    return buildMarkdownFromSections(sections, title || pickString(primary?.title))
  }
  return ""
}

async function fetchOutlineDataFromUrl(url: string): Promise<OutlineData | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  return asRecord(json) as OutlineData | null
}

export async function resolveOutlineFromStreamComplete(
  payload: unknown,
): Promise<OutlineResult | null> {
  const root = asRecord(payload)
  if (!root) return null

  const response = pickString(root.response) || pickString(root.message)
  const url = pickOutlineDataUrl(root)
  let inline = pickOutlineData(root)
  if (url && !inline?.markdown) {
    inline = (await fetchOutlineDataFromUrl(url)) ?? inline
  }

  const nodes = pickOutlineNodes(root)
  const primaryNode = nodes?.[0]
  const title =
    pickString(inline?.title) ||
    pickString(root.book_title) ||
    pickString(root.title) ||
    pickString(primaryNode?.title)

  let sections = normalizeOutlineSections(root.sections)
  if (!sections.length && primaryNode?.sections?.length) {
    sections = normalizeOutlineSections(primaryNode.sections)
  }
  if (!sections.length && inline) {
    const nodeSections = inline.outline_nodes?.[0]?.sections ?? inline.nodes?.[0]?.sections
    sections = normalizeOutlineSections(nodeSections)
  }

  const markdown =
    pickString(inline?.markdown) ||
    pickString(primaryNode?.text) ||
    buildMarkdownFromOutlineNodes(nodes ?? [], title) ||
    buildMarkdownFromSections(sections, title)

  if (!markdown && !sections.length) return null

  return {
    title,
    markdown,
    message: response || undefined,
    outlineDataUrl: url || undefined,
    sections,
    youtubeUrl: pickString(inline?.youtube_url) || pickString(root.youtube_url) || undefined,
    videoId: pickString(inline?.video_id) || pickString(root.video_id) || undefined,
    channelName: pickString(inline?.channel_name) || pickString(root.channel_name) || undefined,
    sectionCount:
      Number(inline?.section_count ?? root.section_count ?? sections.length) || sections.length,
  }
}

export function buildOutlineHistoryAssistantRecord(
  payload: unknown,
): Omit<ConversationHistoryVo, "id" | "projectId"> | null {
  if (!isOutlineStreamPayload(payload)) return null
  const root = asRecord(payload)
  if (!root) return null

  const response = pickString(root.response) || pickString(root.message)
  const url = pickOutlineDataUrl(root)
  const inline = pickOutlineData(root)
  const nodes = pickOutlineNodes(root)
  const title =
    pickString(inline?.title) ||
    pickString(root.book_title) ||
    pickString(root.title) ||
    pickString(nodes?.[0]?.title)

  const metadata: Record<string, unknown> = {
    is_outline_response: true,
    outline_generation: true,
    intent: root.intent ?? "outline_generation",
    sub_intent: root.sub_intent,
    output_format: root.output_format ?? "outline",
    generation_mode: root.generation_mode ?? "outline",
    document_format: root.document_format ?? "markdown",
    outline_data_oss_uploaded: root.outline_data_oss_uploaded,
    outline_data_artifact: root.outline_data_artifact,
    response,
  }
  if (url) {
    metadata.outline_data_url = url
    metadata.remote_url = url
  }
  if (inline && root.outline_data_oss_uploaded !== true) metadata.outline_data = inline
  if (nodes?.length) metadata.outline_nodes = nodes

  const record: Omit<ConversationHistoryVo, "id" | "projectId"> = {
    role: "assistant",
    content: response.slice(0, 280) || "Video outline ready",
    metadata,
  }

  if (url) record.imageUrls = [url]

  const markdown =
    pickString(inline?.markdown) ||
    buildMarkdownFromOutlineNodes(nodes ?? [], title) ||
    pickString(root.markdown)
  if (markdown) record.markdown = markdown

  return record
}

export async function persistOutlineCompleteToHistory(
  projectId: string,
  payload: unknown,
): Promise<void> {
  const id = String(projectId || "").trim()
  if (!id) return
  const record = buildOutlineHistoryAssistantRecord(payload)
  if (!record) return
  try {
    await appendProjectConversationMessage(id, record)
  } catch {
    /* history 写入失败不阻断 UI */
  }
}

export function buildYoutubeSeekUrl(youtubeUrl: string, startSeconds?: number): string {
  const base = String(youtubeUrl || "").trim()
  if (!base) return ""
  if (startSeconds == null || !Number.isFinite(startSeconds) || startSeconds < 0) return base

  try {
    const url = new URL(base)
    url.searchParams.set("t", `${Math.floor(startSeconds)}s`)
    return url.toString()
  } catch {
    const joiner = base.includes("?") ? "&" : "?"
    return `${base}${joiner}t=${Math.floor(startSeconds)}s`
  }
}

export function mergeOutlineSection(
  sections: OutlineSection[],
  next: OutlineSection,
): OutlineSection[] {
  const rest = sections.filter((section) => section.index !== next.index)
  return [...rest, next].sort((a, b) => a.index - b.index)
}

export function ensureOutlineResult(
  current: OutlineResult | null,
  youtubeUrl?: string,
): OutlineResult {
  return (
    current ?? {
      markdown: "",
      sections: [],
      youtubeUrl: youtubeUrl || undefined,
    }
  )
}

function isOutlineHistoryRow(rec: Record<string, unknown>): boolean {
  const meta = parseMetadataRecord(rec.metadata)
  if (meta && isOutlineStreamPayload(meta)) return true
  if (isOutlineStreamPayload(rec)) return true
  return false
}

function mergeOutlinePayloadFromHistoryRow(rec: Record<string, unknown>): Record<string, unknown> {
  const meta = parseMetadataRecord(rec.metadata)
  if (meta) return { ...meta, response: meta.response ?? rec.content }
  return { ...rec, response: rec.content }
}

export function pickOutlineMetadataFromHistory(history: unknown[]): Record<string, unknown> | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i]
    const rec = asRecord(row)
    if (!rec) continue
    if (rec.role !== "assistant" && !parseMetadataRecord(rec.metadata)) continue
    if (!isOutlineHistoryRow(rec)) continue
    return mergeOutlinePayloadFromHistoryRow(rec)
  }
  return null
}

function collectOutlineUrls(project: { configFilePath?: string } | null | undefined, history: unknown[]): string[] {
  const urls: string[] = []
  if (project?.configFilePath && /outline\.json/i.test(project.configFilePath)) {
    urls.push(project.configFilePath)
  }
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const rec = asRecord(history[i])
    if (!rec || rec.role !== "assistant") continue
    const meta = parseMetadataRecord(rec.metadata)
    const payload = meta ?? rec
    const url = pickOutlineDataUrl(payload)
    if (url) urls.push(url)
    for (const imageUrl of (rec.imageUrls as string[] | undefined) ?? []) {
      if (/outline\.json/i.test(imageUrl)) urls.push(imageUrl)
    }
  }
  return [...new Set(urls)]
}

export async function resolveOutlineFromHistory(
  history: unknown[],
  project?: { configFilePath?: string } | null,
): Promise<OutlineResult | null> {
  const meta = pickOutlineMetadataFromHistory(history)
  if (meta) {
    const resolved = await resolveOutlineFromStreamComplete(meta)
    if (resolved) return resolved
  }

  for (const url of collectOutlineUrls(project, history)) {
    const resolved = await resolveOutlineFromStreamComplete({
      output_format: "outline",
      intent: "outline_generation",
      is_outline_response: true,
      outline_data_url: url,
      remote_url: url,
    })
    if (resolved) return resolved
  }

  return null
}
