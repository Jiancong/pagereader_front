import type { ConversationHistoryVo, ProjectVo } from "@/api/types"

export function looksLikeDeckJson(url: string): boolean {
  const s = String(url || "").toLowerCase()
  return s.endsWith(".json") || s.includes("/projects/") || s.includes("ppt_data")
}

/** 从对话历史收集非 deck JSON 的预览图（assistant 优先，取最新） */
export function collectPreviewImageUrls(
  hist: ConversationHistoryVo[] | Array<{ role?: string; imageUrls?: string[] }>,
): string[] {
  const urls: string[] = []
  const assistantRows = [...hist].reverse().filter((h) => h.role === "assistant")
  for (const row of assistantRows) {
    for (const url of row.imageUrls ?? []) {
      if (url && !looksLikeDeckJson(url)) urls.push(url)
    }
  }
  for (const row of hist) {
    for (const url of row.imageUrls ?? []) {
      if (url && !looksLikeDeckJson(url) && !urls.includes(url)) urls.push(url)
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
  if (fromProject) return fromProject
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

/** PPT deck 已生成即可分享；封面由后端在分享时补全或从 deck 推导 */
export function canShareToCommunity(proj: ProjectVo | null | undefined): boolean {
  return !!proj?.configFilePath
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
