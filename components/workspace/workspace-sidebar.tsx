"use client"

// 工作区左侧侧边栏：新建 / Explore / 我的历史 / 用户区
// @author hc @date 2026-06-04

import { Presentation, Plus, Compass, LogOut, FileText, Loader2 } from "lucide-react"
import type { ProjectVo } from "@/lib/api"

export type WorkspaceView = "new" | "explore" | "project"

interface WorkspaceSidebarProps {
  view: WorkspaceView
  activeProjectId: string | null
  nickName: string
  myProjects: ProjectVo[]
  loadingProjects: boolean
  onNew: () => void
  onExplore: () => void
  onOpenProject: (id: string) => void
  onLogout: () => void
}

export function WorkspaceSidebar({
  view,
  activeProjectId,
  nickName,
  myProjects,
  loadingProjects,
  onNew,
  onExplore,
  onOpenProject,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-sidebar">
      {/* 品牌 */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Presentation className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">SlideAI</span>
      </div>

      {/* 主操作 */}
      <div className="space-y-1 p-3">
        <button
          onClick={onNew}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            view === "new"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Plus className="h-4 w-4" />
          新建生成
        </button>
        <button
          onClick={onExplore}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            view === "explore"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          探索 Explore
        </button>
      </div>

      {/* 我的历史 */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <p className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          我的历史
        </p>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {loadingProjects ? (
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : myProjects.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground/70">暂无记录</p>
          ) : (
            myProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                title={p.name || p.title || p.id}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  view === "project" && activeProjectId === p.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{p.name || p.title || "未命名项目"}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 用户区 */}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{nickName || "已登录"}</span>
          <button
            onClick={onLogout}
            title="退出登录"
            className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
