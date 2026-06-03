import { FileText, Zap, Palette, Globe } from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "智能文档分析",
    description: "支持PDF、Word、TXT等多种格式，自动提取关键信息和结构化内容",
  },
  {
    icon: Zap,
    title: "一键快速生成",
    description: "输入一句话描述，AI即可在数秒内生成专业的演示文稿",
  },
  {
    icon: Palette,
    title: "精美模板设计",
    description: "内置多种专业模板和配色方案，确保每个PPT都美观大方",
  },
  {
    icon: Globe,
    title: "多语言支持",
    description: "支持中文、英文等多种语言，满足不同场景的演示需求",
  },
]

export function FeatureCards() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            强大的功能特性
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            从文档分析到PPT生成，一站式解决你的演示文稿制作需求
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
