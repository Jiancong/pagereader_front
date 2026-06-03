"use client"

import { useState, useRef } from "react"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, Download, ChevronRight, X } from "lucide-react"
import { useChat } from "@ai-sdk/react"

interface GeneratorSectionProps {
  activeTab: "prompt" | "upload"
  setActiveTab: (tab: "prompt" | "upload") => void
}

export function GeneratorSection({ activeTab, setActiveTab }: GeneratorSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSlides, setGeneratedSlides] = useState<Slide[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/generate-ppt",
    onFinish: (message) => {
      try {
        const content = message.content
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/)
        if (jsonMatch) {
          const slides = JSON.parse(jsonMatch[1])
          setGeneratedSlides(slides)
        } else {
          const slides = JSON.parse(content)
          setGeneratedSlides(slides)
        }
      } catch {
        console.log("[v0] Could not parse slides from response")
      }
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleAnalyzeDocument = async () => {
    if (!uploadedFile) return
    setIsGenerating(true)

    const formData = new FormData()
    formData.append("file", uploadedFile)

    try {
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.slides) {
        setGeneratedSlides(data.slides)
      }
    } catch (error) {
      console.error("[v0] Error analyzing document:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPPT = async () => {
    if (!generatedSlides) return

    try {
      const response = await fetch("/api/download-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: generatedSlides }),
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "presentation.pptx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error downloading PPT:", error)
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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="例如：帮我生成一个关于人工智能发展历史的10页PPT，包含时间线、关键人物和未来展望..."
                      className="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="absolute bottom-3 right-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !input?.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
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
                    {[
                      "商业计划书",
                      "项目汇报",
                      "产品介绍",
                      "年度总结",
                      "培训课件",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          const event = {
                            target: { value: `帮我生成一个${prompt}的PPT，要求专业、简洁、有吸引力` },
                          } as React.ChangeEvent<HTMLInputElement>
                          handleInputChange(event)
                        }}
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

            {/* Generated Slides Preview */}
            {generatedSlides && (
              <div className="border-t border-border bg-secondary/20 p-6 sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">生成的幻灯片预览</h4>
                  <button
                    onClick={handleDownloadPPT}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    下载 PPTX
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedSlides.map((slide, index) => (
                    <div
                      key={index}
                      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50"
                    >
                      <div className="absolute right-2 top-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {index + 1}
                      </div>
                      <h5 className="line-clamp-2 text-sm font-semibold text-foreground">
                        {slide.title}
                      </h5>
                      <ul className="mt-2 space-y-1">
                        {slide.content.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            <span className="line-clamp-1">{item}</span>
                          </li>
                        ))}
                        {slide.content.length > 3 && (
                          <li className="text-xs text-muted-foreground/60">
                            +{slide.content.length - 3} 更多...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Response Display */}
          {messages.length > 0 && !generatedSlides && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 font-semibold text-foreground">AI 正在思考...</h4>
              <div className="prose prose-invert max-w-none text-sm text-muted-foreground">
                {messages[messages.length - 1]?.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

interface Slide {
  title: string
  content: string[]
}
