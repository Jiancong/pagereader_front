// 公开专家页 SEO：从专家摘要 + 方法论预览构建标题、描述与 JSON-LD（WebPage / Book / FAQ / Breadcrumb）。
// @author hc

export interface ExpertSeoPreview {
  problem: string
  viewpoints: string[]
  principles: string[]
}

export interface ExpertSeoContent {
  expertName: string
  bookTitle: string
  problem: string
  viewpoints: string[]
  principles: string[]
}

function clean(text: unknown): string {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function truncateSeoDescription(text: string, max = 160): string {
  const s = clean(text)
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

export function extractExpertSeoContent(
  expert: { expert_name?: string; book_title?: string } | null | undefined,
  preview: ExpertSeoPreview | null | undefined,
): ExpertSeoContent | null {
  const expertName = clean(expert?.expert_name)
  if (!expertName) return null
  return {
    expertName,
    bookTitle: clean(expert?.book_title),
    problem: clean(preview?.problem),
    viewpoints: (preview?.viewpoints ?? []).map(clean).filter(Boolean).slice(0, 5),
    principles: (preview?.principles ?? []).map(clean).filter(Boolean).slice(0, 5),
  }
}

/** 英文兜底描述（页面 meta 优先用 i18n 模板） */
export function buildExpertSeoDescription(content: ExpertSeoContent): string {
  const lead = content.bookTitle
    ? `Chat with ${content.expertName}, an AI book expert distilled from "${content.bookTitle}".`
    : `Chat with ${content.expertName}, a public AI book expert on Page2Top.`
  const snippet =
    content.problem ||
    content.viewpoints[0] ||
    content.principles[0] ||
    "Explore core viewpoints and judgment principles from the source book."
  const tail = "Ask questions grounded in the book's methodology — summon the expert for free."
  return truncateSeoDescription(`${lead} ${snippet} ${tail}`)
}

export function buildExpertSeoTitle(content: ExpertSeoContent, siteName = "Page2Top"): string {
  const base = content.bookTitle
    ? `${content.expertName} · ${content.bookTitle} Book Expert — Chat & Methodology`
    : `${content.expertName} · Book Expert — Chat & Methodology`
  return `${base} | ${siteName}`
}

export function buildExpertJsonLd(
  content: ExpertSeoContent,
  opts: {
    url: string
    image?: string
    description: string
    pageName: string
    siteName?: string
    siteOrigin?: string
    exploreUrl?: string
    exploreLabel?: string
  },
): unknown[] {
  const site = opts.siteName || "Page2Top"
  const origin =
    opts.siteOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "https://page2.top")
  const exploreItem = opts.exploreUrl || `${origin}/explore`
  const exploreName = opts.exploreLabel || "Explore Experts"

  const blocks: unknown[] = []

  const webPage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.pageName,
    description: opts.description,
    url: opts.url,
    mainEntity: {
      "@type": "Person",
      name: content.expertName,
      description: opts.description,
      url: opts.url,
      jobTitle: "Book Expert",
      ...(opts.image ? { image: opts.image } : {}),
    },
  }
  if (opts.image) {
    webPage.primaryImageOfPage = { "@type": "ImageObject", url: opts.image }
  }
  if (content.bookTitle) {
    webPage.about = { "@type": "Book", name: content.bookTitle, url: opts.url }
  }
  blocks.push(webPage)

  blocks.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: site,
        item: `${origin}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: exploreName,
        item: exploreItem,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: content.expertName,
        item: opts.url,
      },
    ],
  })

  const faqEntities: Array<Record<string, unknown>> = []
  if (content.problem) {
    faqEntities.push({
      "@type": "Question",
      name: content.bookTitle
        ? `What problem does ${content.expertName} address from ${content.bookTitle}?`
        : `What is the core focus of ${content.expertName}?`,
      acceptedAnswer: { "@type": "Answer", text: content.problem },
    })
  }
  for (const vp of content.viewpoints.slice(0, 4)) {
    faqEntities.push({
      "@type": "Question",
      name: content.bookTitle
        ? `Key insight from ${content.bookTitle} via ${content.expertName}`
        : `Key insight from ${content.expertName}`,
      acceptedAnswer: { "@type": "Answer", text: vp },
    })
  }
  if (faqEntities.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqEntities,
    })
  }

  return blocks
}
