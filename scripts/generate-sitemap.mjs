// 构建期生成 sitemap.xml 快照（首页 + 社区图书详情页）。
// 注意：图书目录会持续增长，构建期快照只覆盖运行时刻的内容；
// 推荐由后端动态提供 /sitemap.xml 以覆盖全量与新增图书。
//
// 用法：
//   SITE_ORIGIN=https://page2.top VITE_API_URL=https://api.example.com node scripts/generate-sitemap.mjs
// 默认写入 dist/sitemap.xml（需先执行 vite build）。

import { writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadBuildEnv } from "./loadBuildEnv.mjs"
import { resolveApiBase, collectFeedProjectIds } from "./buildApi.mjs"

loadBuildEnv()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://page2.top").replace(/\/$/, "")
const OUT = process.env.SITEMAP_OUT || resolve(ROOT, "dist", "sitemap.xml")
const MAX_PAGES = Number(process.env.SITEMAP_MAX_PAGES || 20)
const PAGE_SIZE = Number(process.env.SITEMAP_PAGE_SIZE || 100)

function xmlEscape(str) {
  return String(str).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  )
}

function urlEntry(loc, { changefreq = "weekly", priority = "0.7" } = {}) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

async function collectProjectIds() {
  if (!resolveApiBase()) {
    console.warn(
      "[sitemap] No API base (SITEMAP_API_BASE / VITE_API_URL). Writing homepage-only sitemap.",
    )
    return []
  }
  try {
    return await collectFeedProjectIds({
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
    })
  } catch (e) {
    console.warn(`[sitemap] feed fetch failed:`, e?.message || e)
    return []
  }
}

async function main() {
  const ids = await collectProjectIds()
  const entries = [
    urlEntry(`${SITE_ORIGIN}/`, { changefreq: "daily", priority: "1.0" }),
    urlEntry(`${SITE_ORIGIN}/explore`, { changefreq: "daily", priority: "0.9" }),
  ]
  for (const id of ids) {
    entries.push(urlEntry(`${SITE_ORIGIN}/explore/project/${encodeURIComponent(id)}`))
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, xml, "utf8")
  console.log(`[sitemap] wrote ${entries.length} urls -> ${OUT}`)
}

main().catch((e) => {
  console.error("[sitemap] failed:", e)
  process.exitCode = 1
})
