// 构建期注入公开专家页 SEO 静态 HTML（不依赖 Chrome；在 prerender 之后补 head + 可选爬虫正文）。
//
// 用法：
//   VITE_API_URL=https://api.example.com node scripts/injectExpertSeoPages.mjs

import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadBuildEnv } from "./loadBuildEnv.mjs"
import { resolveApiBase, collectPublicExpertIds, fetchPublicExpertDetail } from "./buildApi.mjs"
import {
  extractExpertSeoContent,
  parseMethodologyPreview,
  buildExpertSeoTitle,
  buildExpertSeoDescription,
  buildExpertJsonLd,
} from "./bookExpertSeoExtract.mjs"
import {
  upsertTitle,
  upsertMetaDescription,
  upsertCanonical,
  upsertJsonLd,
  injectCrawlBlock,
  hasExpertCrawlableSeo,
  htmlEscape,
  renderList,
} from "./seoHeadInject.mjs"

loadBuildEnv()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DIST = resolve(ROOT, "dist")
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://page2.top").replace(/\/$/, "")
const SITE_NAME = process.env.SITE_NAME || "Page2Top"
const LOCALE = String(process.env.SEO_LOCALE || "en").trim() || "en"
const LIMIT = Number(process.env.INJECT_EXPERT_LIMIT || process.env.PRERENDER_EXPERT_LIMIT || 50)
const SKIP = /^(1|true|yes)$/i.test(
  String(process.env.SKIP_INJECT_EXPERT_SEO || process.env.SKIP_INJECT_SEO || process.env.SKIP_SEO || ""),
)

async function fileExists(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

function renderExpertCrawlBlock(content) {
  const heading = content.bookTitle
    ? `${content.expertName} — AI Book Expert from "${content.bookTitle}"`
    : `${content.expertName} — AI Book Expert`
  let body = `<main id="seo-crawl" data-seo-expert-crawl="true" data-seo-ready="true" lang="${htmlEscape(LOCALE)}">`
  body += `<article>`
  body += `<h1>${htmlEscape(heading)}</h1>`
  if (content.bookTitle) {
    body += `<p>From &ldquo;${htmlEscape(content.bookTitle)}&rdquo;</p>`
  }
  const desc = buildExpertSeoDescription(content)
  body += `<p>${htmlEscape(desc)}</p>`

  if (content.problem || content.viewpoints.length || content.principles.length) {
    body += `<section data-seo-section="methodology"><h2>Methodology at a glance</h2>`
    if (content.problem) {
      body += `<h3>Core problem</h3><p>${htmlEscape(content.problem)}</p>`
    }
    if (content.viewpoints.length) {
      body += `<h3>Core viewpoints</h3>${renderList(content.viewpoints)}`
    }
    if (content.principles.length) {
      body += `<h3>Judgment principles</h3>${renderList(content.principles)}`
    }
    body += `</section>`
  }

  body += `<p><a href="/explore">Browse more book experts</a></p>`
  body += `</article></main>\n`
  return body
}

async function loadBaseHtml(expertId) {
  const routeFile = join(DIST, "explore/expert", expertId, "index.html")
  if (await fileExists(routeFile)) return readFile(routeFile, "utf8")
  return readFile(join(DIST, "index.html"), "utf8")
}

async function injectExpertPage(expertId, expert) {
  const preview = parseMethodologyPreview(expert?.methodology_preview ?? expert?.methodologyPreview)
  const content = extractExpertSeoContent(expert, preview)
  if (!content) {
    console.warn(`[inject-expert-seo] skip ${expertId}: no expert name`)
    return false
  }

  const pageUrl = `${SITE_ORIGIN}/explore/expert/${encodeURIComponent(expertId)}`
  const title = buildExpertSeoTitle(content, SITE_NAME)
  const description = buildExpertSeoDescription(content)
  const image = expert?.cover_url ?? expert?.coverUrl ?? undefined
  const pageName = title.replace(/\s*\|\s*[^|]+$/, "").trim()
  const jsonLd = buildExpertJsonLd(content, {
    url: pageUrl,
    image,
    description,
    pageName,
    siteName: SITE_NAME,
    siteOrigin: SITE_ORIGIN,
    exploreUrl: `${SITE_ORIGIN}/explore`,
    exploreLabel: "Explore Experts",
  })

  let html = await loadBaseHtml(expertId)
  const prerenderHasBody = hasExpertCrawlableSeo(html)

  html = upsertTitle(html, title)
  html = upsertMetaDescription(html, description)
  html = upsertCanonical(html, pageUrl)
  html = upsertJsonLd(html, jsonLd)

  if (!prerenderHasBody) {
    html = injectCrawlBlock(html, renderExpertCrawlBlock(content))
  }

  const out = join(DIST, "explore/expert", expertId, "index.html")
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, html, "utf8")
  console.log(
    `[inject-expert-seo] ${expertId} -> ${out}${prerenderHasBody ? " (head only, body from prerender)" : ""}`,
  )
  return true
}

async function main() {
  if (SKIP) {
    console.log("[inject-expert-seo] SKIP_INJECT_EXPERT_SEO=1, skipping.")
    return
  }

  if (!(await fileExists(join(DIST, "index.html")))) {
    console.error("[inject-expert-seo] dist/index.html missing. Run vite build first.")
    process.exitCode = 1
    return
  }

  if (!resolveApiBase()) {
    console.warn("[inject-expert-seo] No API base; skipping expert SEO injection.")
    return
  }

  const ids = await collectPublicExpertIds({ maxIds: LIMIT, locale: LOCALE })
  let ok = 0
  for (const id of ids) {
    try {
      const expert = await fetchPublicExpertDetail(id, LOCALE)
      if (!expert || String(expert.visibility || "").toLowerCase() === "private") {
        console.warn(`[inject-expert-seo] skip ${id}: not public`)
        continue
      }
      if (await injectExpertPage(id, expert)) ok++
    } catch (e) {
      console.warn(`[inject-expert-seo] skip ${id}:`, e?.message || e)
    }
  }
  console.log(`[inject-expert-seo] done: ${ok}/${ids.length} expert pages`)
}

main().catch((e) => {
  console.error("[inject-expert-seo] failed:", e)
  process.exitCode = 1
})
