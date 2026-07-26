// JWT 本地存储管理（浏览器直连后端方案）
// @author hc @date 2026-06-03

const TOKEN_KEY = "pr_token"
// 本地缓存的头像（如 Google 登录返回的 picture），后端无头像时回退使用
const AVATAR_KEY = "pr_avatar"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

export function getLocalAvatar(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(AVATAR_KEY) || ""
}

export function setLocalAvatar(url: string): void {
  if (typeof window === "undefined") return
  if (url) window.localStorage.setItem(AVATAR_KEY, url)
  else window.localStorage.removeItem(AVATAR_KEY)
}

export function clearLocalAvatar(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AVATAR_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

/** 从登录 JWT 的 USER-INFO 声明读取当前用户 ID，供需显式 userId 的旧接口使用。 */
export function getCurrentUserId(): number | undefined {
  const token = getToken()?.replace(/^Bearer\s+/i, "")
  if (!token || typeof window === "undefined") return undefined

  try {
    const payload = token.split(".")[1]
    if (!payload) return undefined
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    )
    const claims = JSON.parse(json) as {
      "USER-INFO"?: { id?: number | string }
      userInfo?: { id?: number | string }
      id?: number | string
    }
    const id = claims["USER-INFO"]?.id ?? claims.userInfo?.id ?? claims.id
    const userId = typeof id === "number" ? id : Number(id)
    return Number.isFinite(userId) && userId > 0 ? userId : undefined
  } catch {
    return undefined
  }
}
