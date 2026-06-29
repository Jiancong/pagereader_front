import { isPptStreamPayload } from "@/utils/pptCompletePayload"
import { isNovelStreamPayload } from "@/utils/novelStream"

export type BookCardResult = {
  content: string
  imageUrls: string[]
  message?: string
}

/** 从 markdown 中提取 ![alt](url) 图片地址 */
export function extractMarkdownImageUrls(markdown: string): string[] {
  const urls: string[] = []
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown))) {
    const url = match[1]?.trim()
    if (url) urls.push(url)
  }
  return urls
}

/** 去掉 markdown 图片语法，避免与独立图廊重复展示 */
export function stripMarkdownImages(markdown: string): string {
  return markdown.replace(/!\[[^\]]*\]\([^)]+\)\s*/g, "").trim()
}

export function isBookCardStreamPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  if (isNovelStreamPayload(data)) return false
  if (isPptStreamPayload(data)) return false
  const o = data as Record<string, unknown>
  const status = String(o.status ?? "").toLowerCase()
  const state = String(o.state ?? "").toLowerCase()
  if (state === "book_card_complete") return true
  if (status === "design_complete") return true
  const hasImages = Array.isArray(o.image_urls) && o.image_urls.length > 0
  const hasText =
    typeof o.response === "string" ||
    typeof o.message === "string"
  return hasImages && hasText
}

export function parseBookCardStreamPayload(data: unknown): BookCardResult | null {
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  const rawContent = String(o.response ?? o.message ?? "").trim()
  const fromArray = Array.isArray(o.image_urls)
    ? o.image_urls.map((u) => String(u).trim()).filter(Boolean)
    : []
  const fromMarkdown = extractMarkdownImageUrls(rawContent)
  const imageUrls = [...new Set([...fromArray, ...fromMarkdown])]
  const content = stripMarkdownImages(rawContent)
  const message = typeof o.message === "string" ? o.message.trim() : undefined

  if (!content && !imageUrls.length) return null

  return {
    content,
    imageUrls,
    message: message || undefined,
  }
}
