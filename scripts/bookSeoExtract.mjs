// 构建期 SEO 抽取（与 src/utils/bookSeo.ts 逻辑对齐，供 injectBookSeoPages 使用）

const CHARACTER_RE = /character|人物|角色|protagonist|cast|dramatis/i
const TAKEAWAY_RE =
  /takeaway|key\s|insight|lesson|conclusion|theme|要点|启示|总结|核心|观点|收获|review|书评/i
const SKIP_LAYOUT = new Set(["cover", "end", "toc", "references", "quote"])

function stripInlineMarkdown(text) {
  return String(text ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
}

function clean(text) {
  return stripInlineMarkdown(text).replace(/\s+/g, " ").trim()
}

function dedupe(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const key = item.toLowerCase()
    if (item && !seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

function parseCharacterLine(line) {
  const m = line.match(/^(.{1,40}?)\s*[—\-:：]\s*(.+)$/)
  if (m) return { name: clean(m[1]), description: clean(m[2]) }
  return { name: clean(line), description: "" }
}

function slideTextLines(slide) {
  return [...(slide.content ?? []), ...(slide.left_content ?? []), ...(slide.right_content ?? [])]
    .map(clean)
    .filter(Boolean)
}

export function extractBookSeoContent(project, deck) {
  const bookTitle = clean(
    (typeof deck?.title === "string" ? deck.title.trim() : "") ||
      project?.sourceBookTitle ||
      project?.name ||
      project?.title ||
      "",
  )
  const author = clean(project?.sourceBookAuthor || "")
  const overview = clean(deck?.subtitle || project?.description || "")

  const summaryPoints = []
  const takeaways = []
  const characters = []
  const quotes = []

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

  const totalSlides = Array.isArray(deck?.slides) ? deck.slides.length : 0

  return {
    bookTitle,
    author,
    overview,
    totalSlides,
    summaryPoints: dedupe(summaryPoints).slice(0, 24),
    takeaways: dedupe(takeaways).slice(0, 12),
    characters: characters.filter((c) => c.name).slice(0, 16),
    quotes: quotes.slice(0, 6),
  }
}

export function buildBookSeoTitle(content, siteName = "Page2Top") {
  const title = content.bookTitle || "Book"
  const base = content.characters.length
    ? `${title} Summary, Review & Characters`
    : `${title} Summary & Key Takeaways`
  return `${base} | ${siteName}`
}

export function buildBookSeoDescription(content) {
  const title = content.bookTitle || "this book"
  const byline = content.author ? ` by ${content.author}` : ""
  const pagesHint = content.totalSlides > 0 ? `${content.totalSlides}-slide interactive deck. ` : ""
  const intents = content.characters.length
    ? "summary, review, key takeaways, main characters, and analysis"
    : "summary, review, key takeaways, and analysis"
  let desc =
    content.overview ||
    `${pagesHint}Read a clear summary of ${title}${byline}: ${intents}. Explore the interactive deck on Page2Top.`
  if (content.overview) {
    desc = `${title}${byline} — ${pagesHint}${intents}. ${content.overview}`
  }
  return desc.length > 160 ? `${desc.slice(0, 157).trimEnd()}…` : desc
}

export function buildBookJsonLd(content, { url, image, description, siteName = "Page2Top" }) {
  const book = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: content.bookTitle,
    url,
    description,
  }
  if (content.author) book.author = { "@type": "Person", name: content.author }
  if (content.totalSlides > 0) book.numberOfPages = content.totalSlides
  if (image) book.image = image
  if (content.characters.length) {
    book.character = content.characters.map((c) => ({
      "@type": "Person",
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
    }))
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteName, item: url.replace(/\/explore\/project\/.*$/, "/") },
      { "@type": "ListItem", position: 2, name: content.bookTitle, item: url },
    ],
  }

  return [book, breadcrumb]
}
