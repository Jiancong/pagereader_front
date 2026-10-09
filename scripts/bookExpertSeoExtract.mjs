// 构建期专家页 SEO（与 src/utils/bookExpertSeo.ts 对齐）

function clean(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function truncateSeoDescription(text, max = 160) {
  const s = clean(text)
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

function stripLeadingNumber(s) {
  return String(s).replace(/^\s*\d+\s*[.、)）]\s*/, "").trim()
}

export function parseMethodologyPreview(raw) {
  if (raw == null) return null
  if (typeof raw === "string") {
    const t = raw.trim()
    return t ? { problem: t, viewpoints: [], principles: [] } : null
  }
  if (typeof raw !== "object") return null
  const arr = (v) =>
    Array.isArray(v)
      ? v
          .filter((x) => typeof x === "string")
          .map(stripLeadingNumber)
          .filter((s) => s.length > 0)
          .slice(0, 5)
      : []
  const problem = typeof raw.core_problem === "string" ? raw.core_problem.trim() : ""
  const viewpoints = arr(raw.core_viewpoints)
  const principles = arr(raw.judgment_principles)
  if (!problem && !viewpoints.length && !principles.length) return null
  return { problem, viewpoints, principles }
}

export function extractExpertSeoContent(expert, preview) {
  const expertName = clean(expert?.expert_name ?? expert?.expertName)
  if (!expertName) return null
  return {
    expertName,
    bookTitle: clean(expert?.book_title ?? expert?.bookTitle),
    problem: clean(preview?.problem),
    viewpoints: (preview?.viewpoints ?? []).map(clean).filter(Boolean).slice(0, 5),
    principles: (preview?.principles ?? []).map(clean).filter(Boolean).slice(0, 5),
  }
}

export function buildExpertSeoDescription(content) {
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

export function buildExpertSeoTitle(content, siteName = "Page2Top") {
  const base = content.bookTitle
    ? `${content.expertName} · ${content.bookTitle} Book Expert — Chat & Methodology`
    : `${content.expertName} · Book Expert — Chat & Methodology`
  return `${base} | ${siteName}`
}

export function buildExpertJsonLd(content, opts) {
  const site = opts.siteName || "Page2Top"
  const origin = opts.siteOrigin || "https://page2.top"
  const exploreItem = opts.exploreUrl || `${origin}/explore`
  const exploreName = opts.exploreLabel || "Explore Experts"

  const blocks = []

  const webPage = {
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
      { "@type": "ListItem", position: 1, name: site, item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: exploreName, item: exploreItem },
      { "@type": "ListItem", position: 3, name: content.expertName, item: opts.url },
    ],
  })

  const faqEntities = []
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
