// Load Google Tag Manager container (GA4 tag G-xxx is configured inside GTM, not here)
// @author hc @date 2026-06-04

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

let gtmInitialized = false

/** Inject GTM script once. No-op when id is empty. */
export function initGtm(containerId: string | undefined): void {
  const id = String(containerId ?? "").trim()
  if (!id || typeof window === "undefined" || gtmInitialized) return
  gtmInitialized = true

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" })

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}
