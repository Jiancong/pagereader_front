"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Mail, Lock, User } from "lucide-react"
import { authApi, ApiError } from "@/lib/api"
import { loadGsi, parseEmailFromCredential } from "@/lib/google"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}

interface AuthDialogProps {
  open: boolean
  defaultMode?: "login" | "signup"
  onClose: () => void
  onSuccess: () => void
}

export function AuthDialog({ open, defaultMode = "login", onClose, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickName, setNickName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // 每次打开时同步入口模式并清空提示
  useEffect(() => {
    if (open) {
      setMode(defaultMode)
      setError(null)
    }
  }, [open, defaultMode])

  // 渲染 Google 登录按钮（配置了 client id 才启用）
  useEffect(() => {
    if (!open || !GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return
        const gid = (window as unknown as { google: { accounts: { id: GoogleAccountsId } } }).google
          .accounts.id
        gid.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            setError(null)
            setLoading(true)
            try {
              const email = parseEmailFromCredential(resp.credential)
              await authApi.googleLogin({ googleEmail: email })
              onSuccess()
              onClose()
            } catch (err) {
              setError(err instanceof ApiError ? err.message : (err as Error).message || "Google 登录失败")
            } finally {
              setLoading(false)
            }
          },
        })
        googleBtnRef.current.innerHTML = ""
        gid.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        })
      })
      .catch(() => {
        if (!cancelled) setError("Google 登录初始化失败")
      })
    return () => {
      cancelled = true
    }
  }, [open, onClose, onSuccess])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    if (!email.trim() || !password) {
      setError("请填写邮箱和密码")
      return
    }
    setLoading(true)
    try {
      if (mode === "login") {
        await authApi.passwordLogin({ username: email.trim(), password })
      } else {
        await authApi.signUpAndLogin({ email: email.trim(), password, nickName: nickName.trim() || undefined })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message || "操作失败")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: "login" | "signup") => {
    setMode(m)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {mode === "login" ? "登录账号" : "注册账号"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "使用邮箱和密码登录" : "注册后将自动登录"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {mode === "signup" && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  value={nickName}
                  onChange={(e) => setNickName(e.target.value)}
                  placeholder="昵称（可选）"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {mode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">或</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div ref={googleBtnRef} className="mt-4 flex justify-center" />
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                还没有账号？
                <button onClick={() => switchMode("signup")} className="ml-1 font-medium text-primary hover:underline">
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button onClick={() => switchMode("login")} className="ml-1 font-medium text-primary hover:underline">
                  去登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
