// 构建期注入图书 SEO 静态 HTML（不依赖 Chrome）。
// 在 prerender 之后运行：若页面尚无 summary 正文，则在 #app 前插入可抓取区块。
//
// 用法（需先 vite build，建议在 prerender 之后）：
//   VITE_API_URL=https://api.example.com node scripts/injectBookSeoPages.mjs

import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadBuildEnv } from "./loadBuildEnv.mjs"
import { resolveApiBase, collectFeedProjectIds, resolveProjectDeck } from "./buildApi.mjs"
import {
  extractBookSeoContent,
  buildBookSeoTitle,
  buildBookSeoDescription,
  buildBookJsonLd,
} from "./bookSeoExtract.mjs"

loadBuildEnv()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DIST = resolve(ROOT, "dist")
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://page2.top").replace(/\/$/, "")
const LIMIT = Number(process.env.INJECT_SEO_LIMIT || process.env.PRERENDER_LIMIT || 50)
const SKIP = /^(1|true|yes)$/i.test(String(process.env.SKIP_INJECT_SEO || ""))

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function fileExists(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

function hasCrawlableSeo(html) {
  return html.includes('data-seo-section="summary"') || html.includes('data-seo-crawl="true"')
}

function upsertTitle(html, title) {
  if (/<title[^>]*>/.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`)
  }
  return html.replace("</head>", `  <title>${htmlEscape(title)}</title>\n</head>`)
}

function upsertMetaDescription(html, description) {
  const tag = `<meta name="description" content="${htmlEscape(description)}" data-seo-inject="" />`
  if (/<meta\s+name="description"/i.test(html)) {
    return html.replace(/<meta\s+name="description"[^>]*>/i, tag)
  }
  return html.replace("</head>", `  ${tag}\n</head>`)
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${htmlEscape(href)}" data-seo-inject="" />`
  if (/<link\s+rel="canonical"/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"[^>]*>/i, tag)
  }
  return html.replace("</head>", `  ${tag}\n</head>`)
}

function upsertJsonLd(html, blocks) {
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

function renderList(items) {
  if (!items.length) return ""
  return `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`
}

function renderCharacters(chars) {
  if (!chars.length) return ""
  return `<dl>${chars
    .map(
      (c) =>
        `<div><dt>${htmlEscape(c.name)}</dt>${c.description ? `<dd>${htmlEscape(c.description)}</dd>` : ""}</div>`,
    )
    .join("")}</dl>`
}

function renderCrawlBlock(content, projectId) {
  const title = content.bookTitle || "Book"
  const heading = content.characters.length
    ? `${title} Summary, Characters & Review`
    : `${title} Summary & Key Takeaways`
  const readUrl = `/explore/project/${encodeURIComponent(projectId)}/read`

  let body = `<main id="seo-crawl" data-seo-crawl="true" data-seo-ready="true" lang="en">`
  body += `<article>`
  body += `<h1>${htmlEscape(heading)}</h1>`
  if (content.author) body += `<p>Author: ${htmlEscape(content.author)}</p>`
  if (content.totalSlides > 0) {
    body += `<p>${htmlEscape(`${content.totalSlides} slides`)} · summary, review &amp; key takeaways</p>`
  }
  if (content.overview) body += `<p>${htmlEscape(content.overview)}</p>`

  if (content.summaryPoints.length) {
    body += `<section data-seo-section="summary"><h2>${htmlEscape(`${title} Summary`)}</h2>${renderList(content.summaryPoints)}</section>`
  }
  if (content.takeaways.length) {
    body += `<section data-seo-section="takeaways"><h2>${htmlEscape(`${title}: Key Takeaways & Analysis`)}</h2>${renderList(content.takeaways)}</section>`
  }
  if (content.characters.length) {
    body += `<section data-seo-section="characters"><h2>${htmlEscape(`${title}: Main Characters`)}</h2>${renderCharacters(content.characters)}</section>`
  }
  if (content.quotes.length) {
    body += `<section data-seo-section="quotes"><h2>${htmlEscape(`Notable Quotes from ${title}`)}</h2>`
    for (const q of content.quotes) {
      body += `<blockquote><p>&ldquo;${htmlEscape(q.text)}&rdquo;</p>${q.author ? `<footer>— ${htmlEscape(q.author)}</footer>` : ""}</blockquote>`
    }
    body += `</section>`
  }

  body += `<p><a href="${htmlEscape(readUrl)}">Read ${htmlEscape(title)} as an interactive deck</a></p>`
  body += `</article></main>\n`
  return body
}

function injectCrawlBlock(html, crawlBlock) {
  if (html.includes('data-seo-crawl="true"')) {
    return html.replace(/<main id="seo-crawl"[\s\S]*?<\/main>\s*/i, crawlBlock)
  }
  return html.replace(/<div id="app"/i, `${crawlBlock}<div id="app"`)
}

async function loadBaseHtml(projectId) {
  const routeFile = join(DIST, "explore/project", projectId, "index.html")
  if (await fileExists(routeFile)) return readFile(routeFile, "utf8")
  return readFile(join(DIST, "index.html"), "utf8")
}

async function injectBookPage(projectId, { project, deck }) {
  const content = extractBookSeoContent(project, deck)
  if (!content.bookTitle && !content.overview && !content.summaryPoints.length) {
    console.warn(`[inject-seo] skip ${projectId}: no extractable content`)
    return false
  }

  const pageUrl = `${SITE_ORIGIN}/explore/project/${encodeURIComponent(projectId)}`
  const title = buildBookSeoTitle(content)
  const description = buildBookSeoDescription(content)
  const image = project?.thumbnailUrl || undefined
  const jsonLd = buildBookJsonLd(content, { url: pageUrl, image, description })

  let html = await loadBaseHtml(projectId)
  const prerenderHasBody = hasCrawlableSeo(html)

  html = upsertTitle(html, title)
  html = upsertMetaDescription(html, description)
  html = upsertCanonical(html, pageUrl)
  html = upsertJsonLd(html, jsonLd)

  if (!prerenderHasBody) {
    html = injectCrawlBlock(html, renderCrawlBlock(content, projectId))
  }

  const out = join(DIST, "explore/project", projectId, "index.html")
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, html, "utf8")
  console.log(
    `[inject-seo] ${projectId} -> ${out}${prerenderHasBody ? " (head only, body from prerender)" : ""}`,
  )
  return true
}

async function main() {
  if (SKIP) {
    console.log("[inject-seo] SKIP_INJECT_SEO=1, skipping.")
    return
  }

  if (!(await fileExists(join(DIST, "index.html")))) {
    console.error("[inject-seo] dist/index.html missing. Run vite build first.")
    process.exitCode = 1
    return
  }

  if (!resolveApiBase()) {
    console.warn("[inject-seo] No API base; skipping book SEO injection.")
    return
  }

  const ids = await collectFeedProjectIds({ maxIds: LIMIT })
  let ok = 0
  for (const id of ids) {
    try {
      const { project, deck } = await resolveProjectDeck(id)
      if (await injectBookPage(id, { project, deck })) ok++
    } catch (e) {
      console.warn(`[inject-seo] skip ${id}:`, e?.message || e)
    }
  }
  console.log(`[inject-seo] done: ${ok}/${ids.length} book pages`)
}

main().catch((e) => {
  console.error("[inject-seo] failed:", e)
  process.exitCode = 1
})
