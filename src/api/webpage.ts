// 沉浸式网页翻译：抓取目标网页 HTML。
// 浏览器直连大多数站点受 CORS 限制，按优先级依次尝试：
// 1. 自建代理（环境变量 VITE_WEB_FETCH_PROXY，需含 {url} 占位符）
// 2. 后端代理 /translate/webpage（若后端已实现则优先命中）
// 3. 公共 CORS 代理
// 4. 直连（目标站点允许跨域时兜底）
// @author hc @date 2026-08-05

import { buildUrl } from "./client"

export interface FetchedWebPage {
  /** 页面原始 HTML */
  html: string
  /** 目标页 URL（用于相对资源地址绝对化） */
  finalUrl: string
  /** 命中的抓取通道，便于排查问题 */
  via: string
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

function buildCandidates(target: string): FetchCandidate[] {
  const encoded = encodeURIComponent(target)
  const list: FetchCandidate[] = []
  const envTpl = envProxyTemplate()
  if (envTpl) list.push({ url: envTpl.replace("{url}", encoded), via: "env-proxy" })
  list.push({ url: buildUrl("/translate/webpage", { url: target }), via: "backend-proxy" })
  list.push({ url: `https://corsproxy.io/?url=${encoded}`, via: "corsproxy.io" })
  list.push({ url: `https://api.allorigins.win/raw?url=${encoded}`, via: "allorigins" })
  list.push({ url: `https://api.codetabs.com/v1/proxy?quest=${encoded}`, via: "codetabs" })
  list.push({ url: target, via: "direct" })
  return list
}

/**
 * 校验响应确实是一个含可读文本的网页。
 * 防止把 SPA 壳（dev 服务器 history fallback）或代理错误页误判为抓取成功。
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

async function tryFetch(candidate: FetchCandidate): Promise<string | null> {
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
    // 排除代理 200 返回 JSON 错误对象的情况
    if (/^\s*[{[]/.test(text)) return null
    // 必须看起来像 HTML
    if (!/<[a-z!][^>]*>/i.test(text)) return null
    if (!hasReadableContent(text)) return null
    return text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 抓取网页 HTML。所有通道都失败时抛错，由调用方提示用户。
 */
export async function fetchWebpage(target: string): Promise<FetchedWebPage> {
  for (const candidate of buildCandidates(target)) {
    const html = await tryFetch(candidate)
    if (html) return { html, finalUrl: target, via: candidate.via }
  }
  throw new Error(`webpage fetch failed: ${target}`)
}
