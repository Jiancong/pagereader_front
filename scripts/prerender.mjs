// 构建后预渲染：用无头 Chrome 渲染首页与热门图书详情页，写出静态 HTML 供爬虫抓取。
// App 运行时仍是 SPA；预渲染产物仅为首屏可抓取内容。
//
// 用法（需先 vite build）：
//   SITE_API_BASE=https://api.example.com node scripts/prerender.mjs
// 可选环境变量：
//   PRERENDER_LIMIT  预渲染的图书页数量（默认 50）
//   PRERENDER_PORT   本地静态服务端口（默认 4179）
//   SITEMAP_API_BASE / VITE_API_URL / NEXT_PUBLIC_API_BASE  图书列表 API 源

import { createServer } from "node:http"
import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { dirname, resolve, join, extname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DIST = resolve(ROOT, "dist")

const PORT = Number(process.env.PRERENDER_PORT || 4179)
const LIMIT = Number(process.env.PRERENDER_LIMIT || 50)
const API_BASE = (
  process.env.SITE_API_BASE ||
  process.env.SITEMAP_API_BASE ||
  process.env.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ""
).replace(/\/$/, "")

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
}

async function fileExists(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

/** dist 静态服务，未知路由回退 index.html（SPA） */
function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0])
      let filePath = join(DIST, urlPath)
      if (urlPath.endsWith("/")) filePath = join(filePath, "index.html")
      if (!(await fileExists(filePath))) {
        if (extname(filePath)) {
          res.statusCode = 404
          res.end("not found")
          return
        }
        filePath = join(DIST, "index.html") // SPA fallback
      }
      const buf = await readFile(filePath)
      res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream")
      res.end(buf)
    } catch {
      res.statusCode = 500
      res.end("error")
    }
  })
  return new Promise((resolveServer) => server.listen(PORT, () => resolveServer(server)))
}

async function fetchTopProjectIds(limit) {
  if (!API_BASE) {
    console.warn("[prerender] No API base; only homepage will be prerendered.")
    return []
  }
  const ids = []
  const pageSize = Math.min(100, limit)
  for (let page = 1; ids.length < limit; page++) {
    let json
    try {
      const res = await fetch(`${API_BASE}/www/model/feed/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, pageSize, sort: 1 }),
      })
      if (!res.ok) break
      json = await res.json()
    } catch (e) {
      console.warn("[prerender] feed fetch failed:", e?.message || e)
      break
    }
    const data = json?.data?.data ?? json?.data ?? []
    if (!Array.isArray(data) || !data.length) break
    for (const item of data) {
      const pid = String(item?.projectId ?? "").trim()
      if (pid && !ids.includes(pid)) ids.push(pid)
    }
    if (data.length < pageSize) break
  }
  return ids.slice(0, limit)
}

function outFileForRoute(routePath) {
  if (routePath === "/") return join(DIST, "index.html")
  return join(DIST, routePath.replace(/^\//, ""), "index.html")
}

async function prerenderRoute(browser, baseUrl, routePath, { waitForJsonLd } = {}) {
  const page = await browser.newPage()
  try {
    await page.goto(`${baseUrl}${routePath}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    })
    await page.waitForSelector("#app h1", { timeout: 15000 }).catch(() => {})
    if (waitForJsonLd) {
      await page
        .waitForFunction(
          () => !!document.querySelector('script[type="application/ld+json"][data-seo-head]'),
          { timeout: 10000 },
        )
        .catch(() => {})
    }
    const html = await page.content()
    const out = outFileForRoute(routePath)
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, html, "utf8")
    console.log(`[prerender] ${routePath} -> ${out}`)
  } catch (e) {
    console.warn(`[prerender] skip ${routePath}:`, e?.message || e)
  } finally {
    await page.close()
  }
}

async function main() {
  if (!(await fileExists(join(DIST, "index.html")))) {
    console.error("[prerender] dist/index.html missing. Run `vite build` first.")
    process.exitCode = 1
    return
  }

  let puppeteer
  try {
    puppeteer = (await import("puppeteer")).default
  } catch {
    console.error("[prerender] puppeteer not installed. Run `npm i -D puppeteer`.")
    process.exitCode = 1
    return
  }

  const server = await startStaticServer()
  const baseUrl = `http://127.0.0.1:${PORT}`
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    await prerenderRoute(browser, baseUrl, "/")
    const ids = await fetchTopProjectIds(LIMIT)
    for (const id of ids) {
      await prerenderRoute(browser, baseUrl, `/explore/project/${id}`, { waitForJsonLd: true })
    }
    console.log(`[prerender] done: 1 home + ${ids.length} book pages`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  console.error("[prerender] failed:", e)
  process.exitCode = 1
})
