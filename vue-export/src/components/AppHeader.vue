<template>
  <header class="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Presentation class="h-5 w-5 text-primary-foreground" />
        </div>
        <span class="text-xl font-bold text-foreground">SlideAI</span>
      </div>
      
      <nav class="hidden items-center gap-8 md:flex">
        <a href="#features" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
          功能特性
        </a>
        <a href="#pricing" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
          定价
        </a>
        <a href="#docs" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
          文档
        </a>
      </nav>
      
      <div class="flex items-center gap-3">
        <button class="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
          登录
        </button>
        <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          免费试用
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Presentation } from 'lucide-vue-next'
</script>
