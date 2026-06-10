// 轻量级 SEO head 管理：动态设置 title / description / canonical / OG / Twitter / JSON-LD。
// 采用命令式 DOM 写入，兼容现有 documentMeta 引导逻辑，也能被无头浏览器预渲染捕获。
// @author hc

import { watchEffect, onScopeDispose } from "vue"

export interface SeoHeadInput {
  title?: string
  description?: string
  /** 规范链接，缺省取当前页面 URL */
  canonical?: string
  /** og:type，默认 website */
  ogType?: string
  /** og:image / twitter:image */
  image?: string
  /** robots，如 "noindex,nofollow" */
  robots?: string
  /** 结构化数据（单个或数组），渲染为 application/ld+json */
  jsonLd?: unknown | unknown[]
}

const MANAGED_ATTR = "data-seo-head"

function isBrowser(): boolean {
  return typeof document !== "undefined"
}

function upsertMeta(key: "name" | "property", value: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(key, value)
    el.setAttribute(MANAGED_ATTR, "")
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", "canonical")
    el.setAttribute(MANAGED_ATTR, "")
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

function clearJsonLd(): void {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((n) => n.remove())
}

function applyJsonLd(jsonLd: unknown | unknown[]): void {
  clearJsonLd()
  const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  for (const block of blocks) {
    if (!block) continue
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.setAttribute(MANAGED_ATTR, "")
    try {
      script.textContent = JSON.stringify(block)
    } catch {
      continue
    }
    document.head.appendChild(script)
  }
}

/**
 * 响应式管理页面 head。传入 getter，依赖变化时自动更新；作用域销毁时清理。
 */
export function useSeoHead(source: () => SeoHeadInput): void {
  if (!isBrowser()) return

  const originalTitle = document.title
  const originalDescription =
    document.head
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.getAttribute("content") ?? ""

  watchEffect(() => {
    const input = source() || {}

    if (input.title) document.title = input.title
    if (input.description) {
      upsertMeta("name", "description", input.description)
    }

    upsertMeta("name", "robots", input.robots || "index,follow")

    const canonical =
      input.canonical ||
      (typeof window !== "undefined" ? window.location.href.split("#")[0] : "")
    if (canonical) upsertCanonical(canonical)

    // Open Graph
    if (input.title) upsertMeta("property", "og:title", input.title)
    if (input.description) upsertMeta("property", "og:description", input.description)
    upsertMeta("property", "og:type", input.ogType || "website")
    if (canonical) upsertMeta("property", "og:url", canonical)
    if (input.image) upsertMeta("property", "og:image", input.image)

    // Twitter
    upsertMeta("name", "twitter:card", input.image ? "summary_large_image" : "summary")
    if (input.title) upsertMeta("name", "twitter:title", input.title)
    if (input.description) upsertMeta("name", "twitter:description", input.description)
    if (input.image) upsertMeta("name", "twitter:image", input.image)

    if (input.jsonLd != null) applyJsonLd(input.jsonLd)
    else clearJsonLd()
  })

  onScopeDispose(() => {
    document.title = originalTitle
    if (originalDescription) {
      upsertMeta("name", "description", originalDescription)
    }
    clearJsonLd()
    // 仅移除本 composable 创建的标签，保留首屏静态标签
    document.head
      .querySelectorAll(`[${MANAGED_ATTR}]`)
      .forEach((n) => {
        const tag = n.tagName.toLowerCase()
        if (tag === "meta" || tag === "link") n.remove()
      })
  })
}
