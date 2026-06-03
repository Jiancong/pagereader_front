<template>
  <section id="features" class="py-20">
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-12 text-center">
        <h2 class="mb-4 text-3xl font-bold text-foreground">强大的功能特性</h2>
        <p class="text-lg text-muted-foreground">
          AI 驱动的智能分析，让演示文稿创建变得简单高效
        </p>
      </div>
      
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <component :is="feature.icon" class="h-6 w-6" />
          </div>
          <h3 class="mb-2 text-lg font-semibold text-foreground">
            {{ feature.title }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ feature.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { markRaw } from 'vue'
import { Brain, Zap, Palette, Globe } from 'lucide-vue-next'

const features = [
  {
    icon: markRaw(Brain),
    title: '智能文档分析',
    description: 'AI 深度理解文档内容，自动提取关键信息和核心观点'
  },
  {
    icon: markRaw(Zap),
    title: '一键快速生成',
    description: '只需输入主题描述，秒级生成结构完整的演示文稿'
  },
  {
    icon: markRaw(Palette),
    title: '精美模板设计',
    description: '多种专业模板可选，自动应用最佳排版和配色方案'
  },
  {
    icon: markRaw(Globe),
    title: '多语言支持',
    description: '支持中英文等多种语言，智能适配不同场景需求'
  }
]
</script>
