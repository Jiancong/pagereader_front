// JWT 本地存储管理（浏览器直连后端方案）
// @author hc @date 2026-06-03

const TOKEN_KEY = "pr_token"

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

export function isLoggedIn(): boolean {
  return !!getToken()
}
