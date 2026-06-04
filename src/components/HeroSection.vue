<template>
  <section class="relative overflow-hidden pt-32 pb-16">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
    </div>

    <div class="relative mx-auto max-w-4xl px-6 text-center">
      <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm text-muted-foreground">
        <Sparkles class="h-4 w-4 text-primary" />
        <span>{{ t('landing.heroBadge') }}</span>
      </div>

      <h1 class="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {{ t('landing.heroTitle') }}
        <span class="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {{ t('landing.heroTitleHighlight') }}
        </span>
      </h1>

      <p class="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
        {{ t('landing.heroSubtitle') }}
      </p>

      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          class="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          @click="scrollToGenerator"
        >
          <Zap class="h-5 w-5" />
          {{ t('landing.heroCta') }}
        </button>
        <button class="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-base font-medium text-foreground transition-colors hover:bg-card">
          <Play class="h-5 w-5" />
          {{ t('landing.heroDemo') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Sparkles, Zap, Play } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const scrollToGenerator = () => {
  document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
}
</script>
