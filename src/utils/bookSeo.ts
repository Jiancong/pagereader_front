// 从 PPT deck + 项目信息抽取面向 SEO 的图书内容（摘要 / 人物 / 要点 / 金句），
// 并构建标题、描述与 JSON-LD 结构化数据。一个页面承接 "{书名} summary / review / characters" 等长尾意图。
// @author hc

import type { ProjectVo } from "@/api/types"
import { stripPptInlineMarkdown } from "@/utils/pptInlineMarkdown"

/** deck 的最小结构（PptViewer 内部类型未导出，这里只取所需字段） */
interface DeckSlideLike {
  layout?: string
  title?: string
  subtitle?: string
  content?: string[]
  left_title?: string
  left_content?: string[]
  right_title?: string
  right_content?: string[]
  key_insight?: string
  quote?: string
  quote_author?: string
}

interface DeckLike {
  title?: string
  subtitle?: string
  slides?: DeckSlideLike[]
}

export interface BookSeoCharacter {
  name: string
  description: string
}

export interface BookSeoContent {
  bookTitle: string
  author: string
  overview: string
  summaryPoints: string[]
  takeaways: string[]
  characters: BookSeoCharacter[]
  quotes: Array<{ text: string; author: string }>
}

const CHARACTER_RE = /character|人物|角色|protagonist|cast|dramatis/i
const TAKEAWAY_RE =
  /takeaway|key\s|insight|lesson|conclusion|theme|要点|启示|总结|核心|观点|收获/i
const SKIP_LAYOUT = new Set(["cover", "end", "toc", "references", "quote"])

function clean(text: unknown): string {
  return stripPptInlineMarkdown(String(text ?? ""))
    .replace(/\s+/g, " ")
    .trim()
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const key = item.toLowerCase()
    if (item && !seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

/** 把 "名字 — 描述" / "名字：描述" 拆成人物条目 */
function parseCharacterLine(line: string): BookSeoCharacter {
  const m = line.match(/^(.{1,40}?)\s*[—\-:：]\s*(.+)$/)
  if (m) return { name: clean(m[1]), description: clean(m[2]) }
  return { name: clean(line), description: "" }
}

function slideTextLines(slide: DeckSlideLike): string[] {
  return [
    ...(slide.content ?? []),
    ...(slide.left_content ?? []),
    ...(slide.right_content ?? []),
  ]
    .map(clean)
    .filter(Boolean)
}

export function extractBookSeoContent(
  project: ProjectVo | null | undefined,
  deck: DeckLike | null | undefined,
): BookSeoContent {
  const bookTitle = clean(
    project?.sourceBookTitle || project?.name || project?.title || deck?.title || "",
  )
  const author = clean(project?.sourceBookAuthor || "")
  const overview = clean(deck?.subtitle || project?.description || "")

  const summaryPoints: string[] = []
  const takeaways: string[] = []
  const characters: BookSeoCharacter[] = []
  const quotes: Array<{ text: string; author: string }> = []

  for (const slide of deck?.slides ?? []) {
    const layout = String(slide.layout ?? "")
    const title = clean(slide.title)

    if (slide.quote) {
      const text = clean(slide.quote)
      if (text) quotes.push({ text, author: clean(slide.quote_author) })
    }
    if (slide.key_insight) {
      const insight = clean(slide.key_insight)
      if (insight) takeaways.push(insight)
    }

    if (SKIP_LAYOUT.has(layout)) continue

    const lines = slideTextLines(slide)
    if (!lines.length) continue

    if (CHARACTER_RE.test(title)) {
      for (const line of lines) characters.push(parseCharacterLine(line))
    } else if (TAKEAWAY_RE.test(title)) {
      takeaways.push(...lines)
    } else {
      summaryPoints.push(...lines)
    }
  }

  return {
    bookTitle,
    author,
    overview,
    summaryPoints: dedupe(summaryPoints).slice(0, 24),
    takeaways: dedupe(takeaways).slice(0, 12),
    characters: characters
      .filter((c) => c.name)
      .slice(0, 16),
    quotes: quotes.slice(0, 6),
  }
}

/** SEO 标题：把多种检索意图折叠进同一标题 */
export function buildBookSeoTitle(content: BookSeoContent, siteName = "Page2Top"): string {
  const title = content.bookTitle || "Book"
  const base = content.characters.length
    ? `${title} Summary, Review & Characters`
    : `${title} Summary & Key Takeaways`
  return `${base} | ${siteName}`
}

/** SEO 描述：≤160 字，覆盖 summary / takeaways / characters 意图 */
export function buildBookSeoDescription(content: BookSeoContent): string {
  const title = content.bookTitle || "this book"
  const byline = content.author ? ` by ${content.author}` : ""
  const intents = content.characters.length
    ? "summary, key takeaways, main characters, and analysis"
    : "summary, key takeaways, and analysis"
  let desc =
    content.overview ||
    `Read a clear summary of ${title}${byline}: ${intents}. Explore the interactive deck and discussion on Page2Top.`
  if (content.overview) {
    desc = `${title}${byline} — ${intents}. ${content.overview}`
  }
  return desc.length > 160 ? `${desc.slice(0, 157).trimEnd()}…` : desc
}

/** Book + BreadcrumbList 结构化数据 */
export function buildBookJsonLd(
  content: BookSeoContent,
  opts: { url: string; image?: string; description: string; siteName?: string },
): unknown[] {
  const blocks: unknown[] = []

  const book: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: content.bookTitle,
    url: opts.url,
    description: opts.description,
  }
  if (content.author) book.author = { "@type": "Person", name: content.author }
  if (opts.image) book.image = opts.image
  if (content.characters.length) {
    book.character = content.characters.map((c) => ({
      "@type": "Person",
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
    }))
  }
  blocks.push(book)

  blocks.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: opts.siteName || "Page2Top",
        item: typeof window !== "undefined" ? window.location.origin + "/" : "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: content.bookTitle,
        item: opts.url,
      },
    ],
  })

  return blocks
}

/** 板块/卡片用：把书名折叠成迎合检索意图的副标题 */
export function bookCardTagline(bookTitle: string): string {
  return `${bookTitle} — Summary, Review & Characters`
}
