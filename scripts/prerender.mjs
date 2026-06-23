// 构建后预渲染：用无头 Chrome 渲染首页与热门图书详情页，写出静态 HTML 供爬虫抓取。
// App 运行时仍是 SPA；预渲染产物仅为首屏可抓取内容。
//
// 用法（需先 vite build）：
//   SITE_API_BASE=https://api.example.com node scripts/prerender.mjs
// 可选环境变量：
//   SKIP_PRERENDER=1     跳过预渲染（构建仍成功）
//   SKIP_SEO=1           跳过全部构建后 SEO 步骤（见 postBuildSeo.mjs）
//   PRERENDER_LIMIT      预渲染的图书页数量（默认 50）
//   PRERENDER_PORT       本地静态服务端口（默认 4179）
//   CHROME_PATH          使用系统已安装的 Chrome/Chromium 可执行文件
//   SITEMAP_API_BASE / VITE_API_URL / NEXT_PUBLIC_API_BASE  图书列表 API 源

import { createServer } from "node:http"
import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { dirname, resolve, join, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { loadBuildEnv } from "./loadBuildEnv.mjs"
import { resolveApiBase, collectFeedProjectIds } from "./buildApi.mjs"

loadBuildEnv()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DIST = resolve(ROOT, "dist")

const PORT = Number(process.env.PRERENDER_PORT || 4179)
const LIMIT = Number(process.env.PRERENDER_LIMIT || 50)
const SKIP = /^(1|true|yes)$/i.test(
  String(process.env.SKIP_PRERENDER || process.env.SKIP_SEO || ""),
)
const CHROME_PATH = String(process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || "").trim()

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
  if (!resolveApiBase()) {
    console.warn("[prerender] No API base; only homepage will be prerendered.")
    return []
  }
  try {
    const ids = await collectFeedProjectIds({
      maxPages: Math.ceil(limit / 100) + 1,
      pageSize: Math.min(100, limit),
      maxIds: limit,
    })
    return ids
  } catch (e) {
    console.warn("[prerender] feed fetch failed:", e?.message || e)
    return []
  }
}

function outFileForRoute(routePath) {
  if (routePath === "/") return join(DIST, "index.html")
  return join(DIST, routePath.replace(/^\//, ""), "index.html")
}

async function prerenderRoute(browser, baseUrl, routePath, { waitForSeo } = {}) {
  const page = await browser.newPage()
  try {
    await page.goto(`${baseUrl}${routePath}`, {
      waitUntil: "networkidle0",
      timeout: 90000,
    })
    await page.waitForSelector("#app h1", { timeout: 20000 }).catch(() => {})
    if (waitForSeo) {
      await page
        .waitForFunction(
          () =>
            document.querySelector('[data-seo-ready="true"]') ||
            document.querySelector('[data-seo-section="summary"]') ||
            document.querySelector('script[type="application/ld+json"][data-seo-head]'),
          { timeout: 45000 },
        )
        .catch(() => {})
    }
    if (routePath === "/") {
      await page.waitForSelector("#ebooks ul li", { timeout: 20000 }).catch(() => {})
    }
    if (routePath === "/explore") {
      await page.waitForSelector(".grid .rounded-xl", { timeout: 20000 }).catch(() => {})
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

function logPrerenderSkipped(reason, detail) {
  console.warn(`[prerender] skipped: ${reason}`)
  if (detail) console.warn(detail)
  console.warn(
    "[prerender] Build continues without static HTML. Options:\n" +
      "  - Set SKIP_PRERENDER=1 to silence this step\n" +
      "  - Linux: apt-get install -y libgbm1 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libasound2\n" +
      "  - Or: npx puppeteer browsers install chrome\n" +
      "  - See https://pptr.dev/troubleshooting",
  )
}

function launchOptions() {
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  const opts = { headless: "new", args }
  if (CHROME_PATH) opts.executablePath = CHROME_PATH
  return opts
}

async function main() {
  if (SKIP) {
    console.log("[prerender] SKIP_PRERENDER=1, skipping.")
    return
  }

  if (!(await fileExists(join(DIST, "index.html")))) {
    console.error("[prerender] dist/index.html missing. Run `vite build` first.")
    process.exitCode = 1
    return
  }

  let puppeteer
  try {
    puppeteer = (await import("puppeteer")).default
  } catch {
    logPrerenderSkipped("puppeteer not installed", "Run `npm i -D puppeteer` in the build environment.")
    return
  }

  const server = await startStaticServer()
  const baseUrl = `http://127.0.0.1:${PORT}`

  let browser
  try {
    browser = await puppeteer.launch(launchOptions())
  } catch (e) {
    server.close()
    logPrerenderSkipped("failed to launch Chrome", e?.message || String(e))
    return
  }

  try {
    await prerenderRoute(browser, baseUrl, "/")
    await prerenderRoute(browser, baseUrl, "/explore")
    const ids = await fetchTopProjectIds(LIMIT)
    for (const id of ids) {
      await prerenderRoute(browser, baseUrl, `/explore/project/${id}`, { waitForSeo: true })
    }
    console.log(`[prerender] done: home + explore + ${ids.length} book pages`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  logPrerenderSkipped("unexpected error", e?.message || String(e))
})
