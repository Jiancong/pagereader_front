"use client"

import { useState, useRef } from "react"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, ExternalLink, X } from "lucide-react"
import { authApi, fileApi, agentApi, isLoggedIn, ApiError } from "@/lib/api"
import type { UploadedDocument } from "@/lib/api"

interface GeneratorSectionProps {
  activeTab: "prompt" | "upload"
  setActiveTab: (tab: "prompt" | "upload") => void
}

// 从 complete 事件里尽量找出可跳转的结果地址
function pickResultUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>
  for (const key of ["url", "shareUrl", "previewUrl", "resultUrl", "projectUrl", "link"]) {
    const v = obj[key]
    if (typeof v === "string" && v) return v
  }
  return null
}

export function GeneratorSection({ activeTab, setActiveTab }: GeneratorSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultPayload, setResultPayload] = useState<unknown>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const appendLog = (line: string) => setLogs((prev) => [...prev, line])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setUploadedFile(file)
  }

  // 获取当前登录用户 id，未登录返回 null
  const resolveUserId = async (): Promise<string | null> => {
    if (!isLoggedIn()) return null
    try {
      const detail = await authApi.getCurrentDetail()
      return detail?.id != null ? String(detail.id) : null
    } catch {
      return null
    }
  }

  // 统一触发生成（prompt 直出 / 上传分析共用）
  const runGenerate = async (message: string, documents?: UploadedDocument[]) => {
    setErrorMsg(null)
    setResultUrl(null)
    setResultPayload(null)
    setLogs([])
    setIsGenerating(true)

    try {
      const userId = await resolveUserId()
      if (!userId) {
        setErrorMsg("请先登录后再生成")
        return
      }

      await agentApi.chatStream(
        {
          message,
          userId,
          sessionId: agentApi.getOrCreateSessionId(),
          isAgent: true,
          uploaded_documents: documents,
        },
        {
          onProgress: (data) => {
            const text =
              typeof data === "string"
                ? data
                : (data as { message?: string; text?: string })?.message ??
                  (data as { text?: string })?.text ??
                  JSON.stringify(data)
            appendLog(text)
          },
          onComplete: (data) => {
            setResultPayload(data)
            setResultUrl(pickResultUrl(data))
            appendLog("生成完成")
          },
          onError: (msg) => setErrorMsg(msg),
        },
      )
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : (e as Error).message || "生成失败")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return
    runGenerate(input.trim())
  }

  const handleAnalyzeDocument = async () => {
    if (!uploadedFile || isGenerating) return
    setErrorMsg(null)
    setResultUrl(null)
    setResultPayload(null)
    setLogs([])
    setIsGenerating(true)

    try {
      const userId = await resolveUserId()
      if (!userId) {
        setErrorMsg("请先登录后再生成")
        return
      }
      appendLog("正在上传文档...")
      const doc = await fileApi.uploadDocument(uploadedFile)
      appendLog("文档上传完成，开始分析生成...")
      // runGenerate 内部会重置 logs，这里直接走 chatStream 保留上传日志
      await agentApi.chatStream(
        {
          message: `请根据上传的文档《${doc.name}》生成一份专业的演示文稿`,
          userId,
          sessionId: agentApi.getOrCreateSessionId(),
          isAgent: true,
          uploaded_documents: [doc],
        },
        {
          onProgress: (data) => {
            const text =
              typeof data === "string"
                ? data
                : (data as { message?: string; text?: string })?.message ??
                  (data as { text?: string })?.text ??
                  JSON.stringify(data)
            appendLog(text)
          },
          onComplete: (data) => {
            setResultPayload(data)
            setResultUrl(pickResultUrl(data))
            appendLog("生成完成")
          },
          onError: (msg) => setErrorMsg(msg),
        },
      )
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : (e as Error).message || "生成失败")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section id="generator" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Tab Switcher */}
          <div className="mb-8 flex items-center justify-center">
            <div className="inline-flex rounded-xl border border-border bg-secondary/30 p-1.5">
              <button
                onClick={() => setActiveTab("prompt")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "prompt"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                一句话生成
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "upload"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-4 w-4" />
                上传资料分析
              </button>
            </div>
          </div>

          {/* Generator Card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5">
            {activeTab === "prompt" ? (
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">描述你想要的演示文稿</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    输入主题、风格和内容要求，AI将为你生成专业的PPT
                  </p>
                </div>

                <form onSubmit={handlePromptSubmit} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="例如：帮我生成一个关于人工智能发展历史的10页PPT，包含时间线、关键人物和未来展望..."
                      className="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="absolute bottom-3 right-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating || !input.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        正在生成...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        生成演示文稿
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Prompts */}
                <div className="mt-6 border-t border-border pt-6">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    快速开始
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["商业计划书", "项目汇报", "产品介绍", "年度总结", "培训课件"].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(`帮我生成一个${prompt}的PPT，要求专业、简洁、有吸引力`)}
                        className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">上传文档进行分析</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    支持 PDF、Word、TXT 等格式，AI将提取关键内容生成PPT
                  </p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUploadedFile(null)
                        }}
                        className="ml-4 rounded-lg p-1 hover:bg-secondary"
                      >
                        <X className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 font-medium text-foreground">点击或拖拽文件到此处</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        支持 PDF, Word, TXT, Markdown 格式
                      </p>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={!uploadedFile || isGenerating}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      正在分析文档...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      分析并生成PPT
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 错误提示 */}
            {errorMsg && (
              <div className="border-t border-border bg-destructive/10 px-6 py-4 text-sm text-destructive sm:px-8">
                {errorMsg}
              </div>
            )}

            {/* 生成进度日志 */}
            {logs.length > 0 && (
              <div className="border-t border-border bg-secondary/20 p-6 sm:p-8">
                <h4 className="mb-3 font-semibold text-foreground">生成进度</h4>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">
                  {logs.map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap break-words">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 生成结果 */}
            {resultPayload != null && (
              <div className="border-t border-border bg-secondary/20 p-6 sm:p-8">
                <h4 className="mb-4 font-semibold text-foreground">生成结果</h4>
                {resultUrl ? (
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    查看 / 下载演示文稿
                  </a>
                ) : (
                  <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background/50 p-4 text-xs text-muted-foreground">
                    {typeof resultPayload === "string"
                      ? resultPayload
                      : JSON.stringify(resultPayload, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
