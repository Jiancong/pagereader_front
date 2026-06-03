<template>
  <footer class="border-t border-border bg-card/50 py-12">
    <div class="mx-auto max-w-6xl px-6">
      <div class="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Presentation class="h-4 w-4 text-primary-foreground" />
          </div>
          <span class="text-lg font-bold text-foreground">SlideAI</span>
        </div>
        
        <nav class="flex flex-wrap items-center justify-center gap-6">
          <a href="#" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
            关于我们
          </a>
          <a href="#" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
            使用条款
          </a>
          <a href="#" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
            隐私政策
          </a>
          <a href="#" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
            联系我们
          </a>
        </nav>
        
        <p class="text-sm text-muted-foreground">
          &copy; 2024 SlideAI. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { Presentation } from 'lucide-vue-next'
</script>
