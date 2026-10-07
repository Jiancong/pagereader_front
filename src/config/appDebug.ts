/** 调试功能（直接生成 / 沉浸式翻译）：仅 localStorage `page2.debug=1`；URL `?debug=1` / `?debug=0` 可写入或清除 */
export const DEBUG_STORAGE_KEY = "page2.debug"

/** 在线阅读（/reader、工作区 Tab、补充附件打开）：正式能力，默认开启；可用 VITE_ONLINE_READ=0 关闭 */
export function isOnlineReadEnabled(): boolean {
  const flag = import.meta.env.VITE_ONLINE_READ
  if (flag === "false" || flag === "0") return false
  return true
}

export function isAppDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function initAppDebugFromUrl(): void {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(window.location.search)
  if (!params.has("debug")) return
  const raw = params.get("debug")?.toLowerCase()
  try {
    if (raw === "1" || raw === "true") window.localStorage.setItem(DEBUG_STORAGE_KEY, "1")
    else if (raw === "0" || raw === "false") window.localStorage.removeItem(DEBUG_STORAGE_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}
