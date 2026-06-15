import type { ConversationHistoryVo, ProjectVo } from "@/api/types"
import { extractMarkdownImageUrls } from "@/utils/bookCardStream"
import { looksLikeImagePreviewUrl } from "@/utils/userAssets"

export function looksLikeDeckJson(url: string): boolean {
  const s = String(url || "").toLowerCase()
  return s.endsWith(".json") || s.includes("/projects/") || s.includes("ppt_data")
}

/** 对话历史 / 缩略图里可用于 <img> 展示的地址（排除 deck JSON、PDF 等文档） */
export function isDisplayablePreviewUrl(url: string): boolean {
  const u = String(url || "").trim()
  return !!u && !looksLikeDeckJson(u) && looksLikeImagePreviewUrl(u)
}

type HistoryRow = ConversationHistoryVo | { role?: string; imageUrls?: string[]; content?: string }

/** 从对话历史收集 deck JSON 地址（assistant 优先） */
export function collectDeckUrls(
  proj: ProjectVo | null | undefined,
  hist: HistoryRow[],
): string[] {
  const urls: string[] = []
  if (proj?.configFilePath) urls.push(proj.configFilePath)
  const assistantRows = [...hist].reverse().filter((h) => h.role === "assistant")
  for (const row of assistantRows) {
    for (const url of row.imageUrls ?? []) {
      if (url && looksLikeDeckJson(url)) urls.push(url)
    }
  }
  return [...new Set(urls)]
}

/** 从对话历史收集非 deck JSON 的预览图（assistant 优先，取最新） */
export function collectPreviewImageUrls(hist: HistoryRow[]): string[] {
  const urls: string[] = []
  const assistantRows = [...hist].reverse().filter((h) => h.role === "assistant")
  for (const row of assistantRows) {
    for (const url of row.imageUrls ?? []) {
      if (isDisplayablePreviewUrl(url)) urls.push(url)
    }
    for (const url of extractMarkdownImageUrls(String(row.content ?? ""))) {
      if (isDisplayablePreviewUrl(url)) urls.push(url)
    }
  }
  for (const row of hist) {
    for (const url of row.imageUrls ?? []) {
      if (isDisplayablePreviewUrl(url) && !urls.includes(url)) urls.push(url)
    }
    for (const url of extractMarkdownImageUrls(String(row.content ?? ""))) {
      if (isDisplayablePreviewUrl(url) && !urls.includes(url)) urls.push(url)
    }
  }
  return [...new Set(urls)]
}

/** 分享用封面：优先 project.thumbnailUrl，否则取历史预览图 */
export function resolveThumbnailForShare(
  proj: ProjectVo | null | undefined,
  hist: ConversationHistoryVo[] | Array<{ role?: string; imageUrls?: string[] }>,
): string | undefined {
  const fromProject = String(proj?.thumbnailUrl ?? "").trim()
  if (fromProject && isDisplayablePreviewUrl(fromProject)) return fromProject
  return collectPreviewImageUrls(hist)[0]
}

export function buildShareToCommunityBody(
  proj: ProjectVo | null | undefined,
  hist: ConversationHistoryVo[] | Array<{ role?: string; imageUrls?: string[] }>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const thumbnailUrl = resolveThumbnailForShare(proj, hist)
  if (thumbnailUrl) body.thumbnailUrl = thumbnailUrl
  return body
}

export function isSharedToCommunity(proj: ProjectVo | null | undefined): boolean {
  if (!proj) return false
  if (proj.sharedToCommunity === true) return true
  const priv = proj.isPrivate
  const rec = proj.isRecommended
  if ((priv === 0 || priv === false) && (rec === 1 || rec === true)) return true
  return false
}

/** 项目已持久化 PPT deck JSON 地址 */
export function canShareToCommunity(proj: ProjectVo | null | undefined): boolean {
  return !!proj?.configFilePath
}

/** PPT deck 或书籍卡片等预览图已就绪即可分享 */
export function hasShareableContent(
  proj: ProjectVo | null | undefined,
  hist: HistoryRow[],
): boolean {
  if (canShareToCommunity(proj)) return true
  if (isDisplayablePreviewUrl(String(proj?.thumbnailUrl ?? ""))) return true
  if (collectDeckUrls(proj, hist).length > 0) return true
  return collectPreviewImageUrls(hist).length > 0
}

export function formatCommentTime(iso: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
  } catch {
    return iso
  }
}
