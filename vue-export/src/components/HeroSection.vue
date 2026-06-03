<template>
  <section class="relative overflow-hidden pt-32 pb-16">
    <!-- Background gradient -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
    </div>
    
    <div class="relative mx-auto max-w-4xl px-6 text-center">
      <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm text-muted-foreground">
        <Sparkles class="h-4 w-4 text-primary" />
        <span>AI 驱动的智能演示文稿生成</span>
      </div>
      
      <h1 class="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        一句话生成
        <span class="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          专业PPT
        </span>
      </h1>
      
      <p class="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
        上传图书、论文、资料，AI 自动提取核心内容并生成结构化演示文稿。
        或者只需输入一句话，即刻获得精美 PPT。
      </p>
      
      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button 
          @click="scrollToGenerator"
          class="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
        >
          <Zap class="h-5 w-5" />
          立即开始
        </button>
        <button class="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-base font-medium text-foreground transition-colors hover:bg-card">
          <Play class="h-5 w-5" />
          观看演示
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Sparkles, Zap, Play } from 'lucide-vue-next'

const scrollToGenerator = () => {
  document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
}
</script>
