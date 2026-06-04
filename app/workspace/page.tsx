"use client"

// 工作区：登录后承载页，左侧侧边栏 + 右侧工作区
// @author hc @date 2026-06-04

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi, feedApi, isLoggedIn } from "@/lib/api"
import type { ProjectVo, FeedStreamItemDto } from "@/lib/api"
import { WorkspaceSidebar, type WorkspaceView } from "@/components/workspace/workspace-sidebar"
import { ExploreGrid } from "@/components/workspace/explore-grid"
import { ProjectPreview } from "@/components/workspace/project-preview"
import { GeneratorSection } from "@/components/generator-section"

export default function WorkspacePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<WorkspaceView>("new")
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [nickName, setNickName] = useState("")

  const [myProjects, setMyProjects] = useState<ProjectVo[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  // 生成器：activeTab + 预填 prompt + 重挂载 key
  const [activeTab, setActiveTab] = useState<"prompt" | "upload">("prompt")
  const [genPrompt, setGenPrompt] = useState("")
  const [genKey, setGenKey] = useState(0)

  // 登录态守卫
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/")
      return
    }
    setReady(true)
  }, [router])

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const page = await feedApi.getMyProjects(0, 30)
      setMyProjects(page.content ?? [])
    } catch {
      // 接口未就绪等，静默留空
      setMyProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    authApi
      .getCurrentDetail()
      .then((d) => setNickName(d?.nickName || d?.email || ""))
      .catch(() => {})
    loadProjects()
  }, [ready, loadProjects])

  const goNew = (prompt = "") => {
    setGenPrompt(prompt)
    setActiveTab("prompt")
    setGenKey((k) => k + 1)
    setView("new")
  }

  const openProject = (id: string) => {
    setActiveProjectId(id)
    setView("project")
  }

  const handleLogout = () => {
    authApi.logout()
    router.replace("/")
  }

  if (!ready) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WorkspaceSidebar
        view={view}
        activeProjectId={activeProjectId}
        nickName={nickName}
        myProjects={myProjects}
        loadingProjects={loadingProjects}
        onNew={() => goNew("")}
        onExplore={() => setView("explore")}
        onOpenProject={openProject}
        onLogout={handleLogout}
      />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
        {view === "new" && (
          <GeneratorSection
            key={genKey}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            initialPrompt={genPrompt}
          />
        )}

        {view === "explore" && (
          <ExploreGrid
            onOpen={(item: FeedStreamItemDto) => openProject(item.projectId || item.id)}
          />
        )}

        {view === "project" && activeProjectId && (
          <ProjectPreview
            projectId={activeProjectId}
            onBack={() => setView("explore")}
            onFork={(prompt) => goNew(prompt)}
          />
        )}
      </main>
    </div>
  )
}
