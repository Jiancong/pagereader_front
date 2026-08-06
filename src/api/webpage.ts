// 沉浸式网页翻译：抓取目标网页 HTML。
// 生产环境走同源后端代理（需登录）；开发环境可额外尝试公共 CORS 代理。
// @author hc @date 2026-08-05

import { ApiError, buildUrl, get } from "./client"
import { getToken } from "./token"
import { ReponseCodes } from "@/request/response-codes"

export interface FetchedWebPage {
  /** 页面原始 HTML */
  html: string
  /** 目标页 URL（用于相对资源地址绝对化） */
  finalUrl: string
  /** 命中的抓取通道，便于排查问题 */
  via: string
}

interface WebpageProxyData {
  html: string
  finalUrl?: string
}

const FETCH_TIMEOUT_MS = 20000
const MAX_HTML_CHARS = 8 * 1024 * 1024

interface FetchCandidate {
  url: string
  via: string
}

function envProxyTemplate(): string {
  const tpl = (import.meta.env.VITE_WEB_FETCH_PROXY as string) ?? ""
  return tpl.includes("{url}") ? tpl : ""
}

/** 仅开发环境使用的公共代理（生产域名会被 corsproxy.io 等拒绝） */
function buildDevPublicCandidates(target: string): FetchCandidate[] {
  const encoded = encodeURIComponent(target)
  return [
    { url: `https://corsproxy.io/?url=${encoded}`, via: "corsproxy.io" },
    { url: `https://api.allorigins.win/raw?url=${encoded}`, via: "allorigins" },
    { url: `https://api.codetabs.com/v1/proxy?quest=${encoded}`, via: "codetabs" },
  ]
}

/**
 * 校验响应确实是一个含可读文本的网页。
 * 防止把 SPA 壳或代理错误页误判为抓取成功。
 */
function hasReadableContent(html: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc.querySelectorAll("script,style,noscript,template").forEach((el) => el.remove())
    const text = (doc.body?.textContent ?? "").replace(/\s+/g, "")
    return text.length >= 80
  } catch {
    return false
  }
}

function normalizeHtmlPayload(data: WebpageProxyData | string, fallbackUrl: string): FetchedWebPage | null {
  const html = typeof data === "string" ? data : data.html
  const finalUrl = typeof data === "string" ? fallbackUrl : (data.finalUrl || fallbackUrl)
  if (!html || !hasReadableContent(html)) return null
  return { html, finalUrl, via: "backend-proxy" }
}

/** 同源后端代理：需 JWT，解包 R<{ html, finalUrl? }> 或直接 HTML 字符串 */
async function fetchViaBackend(target: string): Promise<FetchedWebPage> {
  if (!getToken()) {
    throw new ApiError(401, "未登录或登录已过期")
  }
  const data = await get<WebpageProxyData | string>("/translate/webpage", {
    query: { url: target },
  })
  const page = normalizeHtmlPayload(data, target)
  if (!page) throw new ApiError(502, "网页抓取响应无效")
  return page
}

async function tryFetchPublic(candidate: FetchCandidate): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(candidate.url, {
      signal: controller.signal,
      credentials: "omit",
      headers: { Accept: "text/html,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8" },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length > MAX_HTML_CHARS) return null
    // 排除 JSON 错误体（如 corsproxy.io 的 error 字段）
    if (/^\s*[{[]/.test(text)) return null
    if (!/<[a-z!][^>]*>/i.test(text)) return null
    if (!hasReadableContent(text)) return null
    return text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchViaEnvOrPublic(target: string): Promise<FetchedWebPage | null> {
  const encoded = encodeURIComponent(target)
  const envTpl = envProxyTemplate()
  if (envTpl) {
    const html = await tryFetchPublic({ url: envTpl.replace("{url}", encoded), via: "env-proxy" })
    if (html) return { html, finalUrl: target, via: "env-proxy" }
  }

  if (import.meta.env.DEV) {
    for (const candidate of buildDevPublicCandidates(target)) {
      const html = await tryFetchPublic(candidate)
      if (html) return { html, finalUrl: target, via: candidate.via }
    }
  }

  const direct = await tryFetchPublic({ url: target, via: "direct" })
  if (direct) return { html: direct, finalUrl: target, via: "direct" }
  return null
}

/**
 * 抓取网页 HTML。
 * 生产：优先走后端同源代理（需登录）；开发：可回退公共 CORS 代理。
 */
export async function fetchWebpage(target: string): Promise<FetchedWebPage> {
  // 1. 后端同源代理（page2.top 生产环境的正确路径）
  if (getToken()) {
    try {
      return await fetchViaBackend(target)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 401 || err.code === ReponseCodes.NO_AUTH) throw err
        // 502/404 等：后端未实现或暂时失败，继续尝试兜底
        if (!import.meta.env.DEV) throw err
      }
    }
  } else if (!import.meta.env.DEV) {
    throw new ApiError(401, "未登录或登录已过期")
  }

  // 2. 开发 / 配置了自建代理时的兜底
  const fallback = await fetchViaEnvOrPublic(target)
  if (fallback) return fallback

  if (!getToken()) {
    throw new ApiError(401, "未登录或登录已过期")
  }
  throw new ApiError(502, "网页抓取失败，请稍后重试")
}
