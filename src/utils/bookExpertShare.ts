// 公开专家页 / 工作区：用专家描述生成社交媒体软文并打开分享 intent。
// @author hc

import type { BookExpertSummary } from "@/api/types"
import { buildExploreExpertShareUrl } from "@/utils/feedOpen"
import {
  extractExpertSeoContent,
  parseExpertMethodologyPreview,
  buildExpertSocialShareCopy,
  truncateExpertShareTextForTweet,
} from "@/utils/bookExpertSeo"

export type ExpertSocialPlatform = "facebook" | "x" | "linkedin"

export interface ExpertShareMaterials {
  url: string
  /** 软文正文（不含链接） */
  copy: string
  /** 软文 + 空行 + 链接，便于粘贴到 LinkedIn / Facebook */
  fullPost: string
}

type ShareT = (key: string, params?: Record<string, unknown>) => string

export function resolveExpertShareMaterials(
  expert: BookExpertSummary | null | undefined,
  t: ShareT,
): ExpertShareMaterials | null {
  const expertId = String(expert?.expert_id ?? "").trim()
  if (!expertId) return null
  const preview = parseExpertMethodologyPreview(expert?.methodology_preview)
  const content = extractExpertSeoContent(expert, preview)
  if (!content) return null

  const format = {
    withBook: (p: {
      expertName: string
      bookTitle: string
      snippet: string
      bullets: string
      cta: string
    }) =>
      t("bookExpert.socialShare.postWithBook", {
        expertName: p.expertName,
        bookTitle: p.bookTitle,
        snippet: p.snippet,
        bullets: p.bullets,
        cta: p.cta,
      }),
    withoutBook: (p: { expertName: string; snippet: string; bullets: string; cta: string }) =>
      t("bookExpert.socialShare.postNoBook", {
        expertName: p.expertName,
        snippet: p.snippet,
        bullets: p.bullets,
        cta: p.cta,
      }),
    cta: t("bookExpert.socialShare.postCta"),
    fallbackSnippet: t("bookExpert.exploreSubtitle"),
  }

  const copy = buildExpertSocialShareCopy(content, format)
  const url = buildExploreExpertShareUrl(expertId)
  return { url, copy, fullPost: `${copy}\n\n${url}` }
}

export function buildExpertSocialShareUrl(
  platform: ExpertSocialPlatform,
  materials: ExpertShareMaterials,
): string {
  const encodedUrl = encodeURIComponent(materials.url)
  if (platform === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  }
  if (platform === "x") {
    const text = encodeURIComponent(truncateExpertShareTextForTweet(materials.copy))
    return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`
  }
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
}

/** LinkedIn / Facebook 无法预填长文：返回是否应把 fullPost 写入剪贴板 */
export function shouldCopySharePostForPlatform(platform: ExpertSocialPlatform): boolean {
  return platform === "facebook" || platform === "linkedin"
}
