/**
 * GA4 via GTM — Basic setup only (page2.top).
 *
 * Frontend responsibilities:
 * - Load GTM (`VITE_GTM_ID`, e.g. GTM-TDZZXHT5) in `gtmBootstrap.ts`
 * - On Vue route change, push `page_view` for SPA (GTM must map this if you use a Custom Event tag)
 *
 * GA4 Measurement ID (e.g. G-0Y4KL2PZ5Y) belongs in GTM → Google tag, not in this repo.
 *
 * Custom events (login, purchase, pricing_subscribe_intent, etc.) are intentionally not pushed
 * until you add matching Custom Event triggers + GA4 Event tags in GTM.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

function push(obj: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(obj)
}

/** SPA page_view — use with GTM trigger: Custom Event = page_view → GA4 Event page_view */
export function pushGtmPageView(overrides?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const page_location =
    typeof overrides?.page_location === "string"
      ? (overrides.page_location as string)
      : window.location.href
  const page_path =
    typeof overrides?.page_path === "string"
      ? (overrides.page_path as string)
      : `${window.location.pathname || ""}${window.location.search || ""}`
  const page_title =
    typeof overrides?.page_title === "string"
      ? (overrides.page_title as string)
      : typeof document !== "undefined"
        ? document.title
        : ""
  const rest = { ...(overrides || {}) }
  delete rest.page_location
  delete rest.page_path
  delete rest.page_title
  push({
    event: "page_view",
    page_location,
    page_path,
    page_title,
    ...rest,
  })
}
