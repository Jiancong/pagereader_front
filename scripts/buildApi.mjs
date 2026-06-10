// 构建后脚本用的 API 工具：与 src/api/client.ts 一致，BASE + /api2 + path，并解包 R<T>。
import { loadBuildEnv } from "./loadBuildEnv.mjs"

export function resolveApiBase() {
  loadBuildEnv()
  return (
    process.env.SITEMAP_API_BASE ||
    process.env.SITE_API_BASE ||
    process.env.VITE_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
  ).replace(/\/+$/, "")
}

/** 与 client.ts buildUrl 一致 */
export function buildApiUrl(path, base = resolveApiBase()) {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}/api2${p}`
}

export async function fetchFeedStreamPage(page, pageSize, sort = 1) {
  const url = buildApiUrl("/www/model/feed/stream")
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, pageSize, sort }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 120)}`)
  }

  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(
      `Non-JSON from ${url} (often missing /api2 prefix or wrong VITE_API_URL): ${text.slice(0, 80)}…`,
    )
  }

  if (body.code !== 0 && body.success !== true) {
    throw new Error(body.message || body.msg || `API error code ${body.code}`)
  }

  const pageDto = body.data
  const items = pageDto?.data ?? []
  return {
    items: Array.isArray(items) ? items : [],
    total: pageDto?.total ?? items.length,
  }
}

export async function collectFeedProjectIds({ maxPages = 20, pageSize = 100, maxIds = Infinity } = {}) {
  if (!resolveApiBase()) return []

  const ids = []
  for (let page = 1; page <= maxPages && ids.length < maxIds; page++) {
    const { items } = await fetchFeedStreamPage(page, pageSize)
    if (!items.length) break
    for (const item of items) {
      const pid = String(item?.projectId ?? "").trim()
      if (pid && !ids.includes(pid)) ids.push(pid)
      if (ids.length >= maxIds) break
    }
    if (items.length < pageSize) break
  }
  return ids.slice(0, maxIds)
}
