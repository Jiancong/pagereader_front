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

async function fetchApiJson(path) {
  const url = buildApiUrl(path)
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${text.slice(0, 120)}`)
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON from ${url}`)
  }
  if (body.code !== 0 && body.success !== true) {
    throw new Error(body.message || body.msg || `API error ${body.code}`)
  }
  return body.data
}

export async function fetchProject(projectId) {
  return fetchApiJson(`/project/${encodeURIComponent(projectId)}`)
}

export async function fetchProjectConversationHistory(projectId) {
  const data = await fetchApiJson(`/project/${encodeURIComponent(projectId)}/conversation/history`)
  return Array.isArray(data) ? data : []
}

function asRecord(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : null
}

function hasSlides(data) {
  return Array.isArray(data?.slides) && data.slides.length > 0
}

function normalizeDeckFromArtifact(obj) {
  if (hasSlides(obj)) return obj
  const inner = asRecord(obj?.ppt_data) ?? asRecord(obj?.pptData)
  if (inner && hasSlides(inner)) return inner
  return null
}

function unwrapArtifactEnvelope(obj) {
  const payload = asRecord(obj?.payload)
  const isEnvelope =
    payload != null &&
    (obj.artifact_kind != null || obj.schema_version != null || obj.sha256 != null)
  return isEnvelope ? payload : obj
}

async function fetchPptJson(url) {
  const res = await fetch(url, { credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const obj = asRecord(json)
  if (!obj) return null
  return normalizeDeckFromArtifact(unwrapArtifactEnvelope(obj))
}

function looksLikeDeckJson(url) {
  return /\.json(\?|$)/i.test(String(url || "")) || /ppt_data|deck|artifact/i.test(String(url || ""))
}

function collectDeckUrls(project, history) {
  const urls = []
  if (project?.configFilePath) urls.push(project.configFilePath)
  for (const row of [...(history || [])].reverse()) {
    if (row?.role !== "assistant") continue
    for (const url of row.imageUrls ?? []) {
      if (looksLikeDeckJson(url)) urls.push(url)
    }
  }
  return [...new Set(urls.filter(Boolean))]
}

/** 拉取项目 deck JSON（与前端 loadPptDeck 对齐） */
export async function resolveProjectDeck(projectId) {
  const project = await fetchProject(projectId)
  const history = await fetchProjectConversationHistory(projectId).catch(() => [])
  const urls = collectDeckUrls(project, history)
  for (const ppt_data_url of urls) {
    try {
      const deck = await fetchPptJson(ppt_data_url)
      if (deck) return { project, deck }
    } catch {
      /* try next url */
    }
  }
  return { project, deck: null }
}
