"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Presentation, LogOut } from "lucide-react"
import { authApi, isLoggedIn } from "@/lib/api"
import { AuthDialog } from "./auth-dialog"

export function Header() {
  const [logged, setLogged] = useState(false)
  const [nickName, setNickName] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"login" | "signup">("login")

  // 拉取当前登录态与昵称
  const refresh = async () => {
    if (!isLoggedIn()) {
      setLogged(false)
      setNickName("")
      return
    }
    setLogged(true)
    try {
      const detail = await authApi.getCurrentDetail()
      setNickName(detail?.nickName || detail?.email || "")
    } catch {
      // token 失效等
      authApi.logout()
      setLogged(false)
      setNickName("")
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const openDialog = (mode: "login" | "signup") => {
    setDialogMode(mode)
    setDialogOpen(true)
  }

  const handleLogout = () => {
    authApi.logout()
    setLogged(false)
    setNickName("")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Presentation className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">SlideAI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            功能特性
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            价格方案
          </Link>
          <Link href="#docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            文档
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {logged ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">{nickName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openDialog("login")}
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                登录
              </button>
              <button
                onClick={() => openDialog("signup")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                开始使用
              </button>
            </>
          )}
        </div>
      </div>

      <AuthDialog
        open={dialogOpen}
        defaultMode={dialogMode}
        onClose={() => setDialogOpen(false)}
        onSuccess={refresh}
      />
    </header>
  )
}
