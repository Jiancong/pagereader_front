/**
 * GA4 via GTM — dataLayer pushes for page2.top.
 *
 * GTM: Custom Event triggers (CE - *) → GA4 Event tags.
 * Measurement ID G-0Y4KL2PZ5Y is configured inside GTM, not here.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export type GtmEventParams = Record<string, string | number | boolean | undefined>

function push(obj: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(obj)
}

function cleanParams(params?: GtmEventParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!params) return out
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") out[key] = value
  }
  return out
}

/** Generic custom event — event name must match GTM Custom Event trigger. */
export function pushGtmEvent(event: string, params?: GtmEventParams): void {
  push({ event, ...cleanParams(params) })
}

/** Infer page_type for GA4 custom dimension. */
export function gtmPageTypeFromRoute(
  name: string | symbol | null | undefined,
  path: string,
): string {
  const n = String(name ?? "")
  if (n === "landing") return "landing"
  if (n === "workspace") return "workspace"
  if (n === "pricing") return "pricing"
  if (n === "story") return "story"
  if (n === "project-reader") return "project_reader"
  if (n === "project-community") return "project_community"
  if (n === "about" || n === "terms" || n === "privacy" || n === "contact") return "legal"
  if (path.includes("/explore/project/") && path.endsWith("/read")) return "project_reader"
  if (path.includes("/explore/project/")) return "project_community"
  return n || "other"
}

/** SPA page_view — GTM trigger: Custom Event = page_view */
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

export function gtmFileExt(name: string): string {
  const base = String(name || "").split(/[/\\]/).pop() || ""
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "file"
}

export function gtmAuthModalOpen(authMode: "login" | "signup", source: string): void {
  pushGtmEvent("auth_modal_open", { auth_mode: authMode, source })
}

export function gtmLogin(method: "email" | "google", source?: string): void {
  pushGtmEvent("login", { method, source })
}

export function gtmSignUp(method: "email" | "google", source?: string): void {
  pushGtmEvent("sign_up", { method, source })
}

export function gtmGenerateIntent(mode: "prompt" | "upload", hasPrompt = true): void {
  pushGtmEvent("generate_intent", { mode, has_prompt: hasPrompt })
}

export function gtmGeneratorTabSelect(tab: "quick" | "upload"): void {
  pushGtmEvent("generator_tab_select", { tab })
}

export function gtmQuickExampleClick(exampleId: string): void {
  pushGtmEvent("quick_example_click", { example_id: exampleId })
}

export function gtmUploadExampleClick(exampleId: string): void {
  pushGtmEvent("upload_example_click", { example_id: exampleId })
}

export function gtmFileSelected(file: File): void {
  pushGtmEvent("file_selected", {
    file_ext: gtmFileExt(file.name),
    file_size_kb: Math.round(file.size / 1024),
  })
}

export function gtmCtaClick(ctaName: string): void {
  pushGtmEvent("cta_click", { cta_name: ctaName })
}

/** Hero「观看演示」— GTM trigger: Custom Event = demo_click */
export function gtmDemoClick(location = "hero"): void {
  pushGtmEvent("demo_click", { location, cta_name: "hero_demo" })
}

export const LANDING_WATCH_DEMO_EVENT = "landing:watch-demo"

export function gtmGenerateStart(
  mode: "prompt" | "upload",
  queue: "FAST" | "SLOW",
  source: "local" | "cloud" = "local",
): void {
  pushGtmEvent("generate_start", { mode, queue, source })
}

export function gtmGenerateComplete(
  mode: "prompt" | "upload",
  queue: "FAST" | "SLOW",
  projectId: string,
): void {
  pushGtmEvent("generate_complete", { mode, queue, project_id: projectId })
}

export function gtmGenerateFail(
  mode: "prompt" | "upload",
  errorType: "credits" | "network" | "other",
): void {
  pushGtmEvent("generate_fail", { mode, error_type: errorType })
}

export function gtmPricingPlanClick(planType: string): void {
  pushGtmEvent("pricing_plan_click", { plan_type: planType })
}

export function gtmBeginCheckout(planType: string, paymentMethod: "paypal" | "wechat"): void {
  pushGtmEvent("begin_checkout", { plan_type: planType, payment_method: paymentMethod })
}

export function gtmPurchase(
  planType: string,
  paymentMethod: "paypal" | "wechat",
  value?: number,
  currency = "USD",
): void {
  pushGtmEvent("purchase", {
    plan_type: planType,
    payment_method: paymentMethod,
    value,
    currency,
  })
}

export function gtmRelatedSearch(projectId: string, termLength: number): void {
  pushGtmEvent("related_search", { project_id: projectId, term_length: termLength })
}

export function gtmForkProject(sourceProjectId: string, newProjectId?: string): void {
  pushGtmEvent("fork_project", {
    source_project_id: sourceProjectId,
    ...(newProjectId ? { new_project_id: newProjectId } : {}),
  })
}

export function gtmOpenReader(projectId: string): void {
  pushGtmEvent("open_reader", { project_id: projectId })
}

export function gtmAssetAttach(fileExt: string): void {
  pushGtmEvent("asset_attach", { file_ext: fileExt })
}

export function gtmLocaleChange(language: string): void {
  pushGtmEvent("locale_change", { language })
}
