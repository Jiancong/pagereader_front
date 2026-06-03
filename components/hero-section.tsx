import { Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI 驱动的演示文稿生成</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            将想法瞬间转化为
            <span className="text-primary">专业演示文稿</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            上传图书、资料进行智能分析，或通过一句话描述快速生成精美的PPT。让AI帮你完成繁琐的演示文稿制作工作。
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#generator"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              立即体验
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/50 px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              了解更多
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
