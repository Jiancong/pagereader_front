// Google Identity Services 脚本加载与凭证解析
// @author hc @date 2026-06-03

const GSI_SRC = "https://accounts.google.com/gsi/client"

let loadPromise: Promise<void> | null = null

// 按需加载 GSI 脚本，重复调用复用同一 Promise
export function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if ((window as unknown as { google?: { accounts?: unknown } }).google?.accounts) {
    return Promise.resolve()
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("GSI 脚本加载失败")))
      return
    }
    const s = document.createElement("script")
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("GSI 脚本加载失败"))
    document.head.appendChild(s)
  })
  return loadPromise
}

// 从 GSI credential（JWT）里解析出邮箱
export function parseEmailFromCredential(credential: string): string {
  const payload = JSON.parse(
    decodeURIComponent(
      atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    ),
  )
  return payload.email as string
}
