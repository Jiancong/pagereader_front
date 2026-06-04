"use client"

// 项目只读预览：图片结果 + 对话历史，并提供「基于它再生成」入口
// @author hc @date 2026-06-04

import { useEffect, useState } from "react"
import { Loader2, Sparkles, ArrowLeft } from "lucide-react"
import { feedApi } from "@/lib/api"
import type { ProjectVo, ConversationHistoryVo } from "@/lib/api"

interface ProjectPreviewProps {
  projectId: string
  onBack?: () => void
  onFork: (prompt: string) => void
}

export function ProjectPreview({ projectId, onBack, onFork }: ProjectPreviewProps) {
  const [project, setProject] = useState<ProjectVo | null>(null)
  const [history, setHistory] = useState<ConversationHistoryVo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      setProject(null)
      setHistory([])
      try {
        const [proj, hist] = await Promise.all([
          feedApi.getProject(projectId),
          feedApi.getProjectConversationHistory(projectId).catch(() => [] as ConversationHistoryVo[]),
        ])
        if (cancelled) return
        setProject(proj)
        setHistory(hist)
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // 收集对话里的所有图片
  const images = history.flatMap((h) => h.imageUrls ?? [])
  const firstUserMsg = history.find((h) => h.role === "user")?.content || ""

  const handleFork = () => {
    const base = project?.name || project?.title || ""
    const prompt = firstUserMsg || (base ? `请参考《${base}》生成一份专业的演示文稿` : "")
    onFork(prompt)
  }

  return (
    <div className="mx-auto max-w-5xl">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回探索
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {project && (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {project.name || project.title || "未命名项目"}
              </h2>
              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
            <button
              onClick={handleFork}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              基于它再生成
            </button>
          </div>

          {/* 图片结果 */}
          {images.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`第 ${i + 1} 页`}
                  loading="lazy"
                  className="w-full rounded-xl border border-border"
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
              该作品暂无可预览的图片
            </p>
          )}

          {/* 对话历史 */}
          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-semibold text-foreground">对话记录</h3>
              <div className="space-y-3">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className={`rounded-xl border border-border p-4 text-sm ${
                      h.role === "user" ? "bg-secondary/30" : "bg-card"
                    }`}
                  >
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {h.role === "user" ? "用户" : "AI"}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-foreground">{h.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
