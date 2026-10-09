// 构建期 HTML head / 爬虫正文注入（图书页与专家页共用）

export function htmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function upsertTitle(html, title) {
  if (/<title[^>]*>/.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`)
  }
  return html.replace("</head>", `  <title>${htmlEscape(title)}</title>\n</head>`)
}

export function upsertMetaDescription(html, description) {
  const tag = `<meta name="description" content="${htmlEscape(description)}" data-seo-inject="" />`
  if (/<meta\s+name="description"/i.test(html)) {
    return html.replace(/<meta\s+name="description"[^>]*>/i, tag)
  }
  return html.replace("</head>", `  ${tag}\n</head>`)
}

export function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${htmlEscape(href)}" data-seo-inject="" />`
  if (/<link\s+rel="canonical"/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"[^>]*>/i, tag)
  }
  return html.replace("</head>", `  ${tag}\n</head>`)
}

export function upsertJsonLd(html, blocks) {
  let out = html.replace(
    /<script\s+type="application\/ld\+json"\s+data-seo-inject[^>]*>[\s\S]*?<\/script>\s*/gi,
    "",
  )
  const scripts = blocks
    .map(
      (block) =>
        `  <script type="application/ld+json" data-seo-inject="">${JSON.stringify(block)}</script>`,
    )
    .join("\n")
  return out.replace("</head>", `${scripts}\n</head>`)
}

export function injectCrawlBlock(html, crawlBlock) {
  if (html.includes('data-seo-crawl="true"')) {
    return html.replace(/<main id="seo-crawl"[\s\S]*?<\/main>\s*/i, crawlBlock)
  }
  return html.replace(/<div id="app"/i, `${crawlBlock}<div id="app"`)
}

export function hasBookCrawlableSeo(html) {
  return html.includes('data-seo-section="summary"') || html.includes('data-seo-crawl="true"')
}

export function hasExpertCrawlableSeo(html) {
  return (
    html.includes('data-seo-section="methodology"') ||
    html.includes('data-seo-expert-crawl="true"')
  )
}

export function renderList(items) {
  if (!items.length) return ""
  return `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`
}
