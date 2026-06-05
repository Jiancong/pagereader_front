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
