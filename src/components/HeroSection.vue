<template>
  <section class="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-12">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
    </div>

    <div class="relative mx-auto max-w-6xl px-6">
      <div class="mx-auto max-w-3xl text-center">
        <div
          class="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground sm:text-sm"
        >
          <Sparkles class="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
          <span>{{ t('landing.heroBadge') }}</span>
        </div>

        <h1
          class="mb-4 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          <span class="block">{{ t('landing.heroTitleLine1') }}</span>
          <span class="block">{{ t('landing.heroTitleLine2') }}</span>
          <span class="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {{ t('landing.heroTitleHighlight') }}
          </span>
        </h1>

        <p class="mx-auto mb-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {{ t('landing.heroSubtitle') }}
        </p>

        <div class="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 sm:w-auto sm:px-7"
            @click="scrollToGenerator"
          >
            <Zap class="h-4 w-4" />
            {{ t('landing.heroCta') }}
          </button>
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card sm:w-auto sm:px-7"
            @click="watchDemo"
          >
            <Play class="h-4 w-4" />
            {{ t('landing.heroDemo') }}
          </button>
        </div>
      </div>

      <!-- 亮点 + 书籍专家：单卡片、对齐同一栅格 -->
      <div
        id="book-expert"
        class="overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-sm backdrop-blur-sm"
      >
        <div class="grid divide-y divide-border/70 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div class="flex items-center gap-3 p-4 sm:p-5">
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Headphones class="h-4 w-4" />
            </div>
            <div class="min-w-0 text-left">
              <p class="text-sm font-semibold text-foreground">{{ t('landing.heroAudioTitle') }}</p>
              <p class="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {{ t('landing.heroAudioDesc') }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 sm:p-5">
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"
            >
              <BookOpen class="h-4 w-4" />
            </div>
            <div class="min-w-0 text-left">
              <p class="text-sm font-semibold text-foreground">{{ t('landing.bookExpert.title') }}</p>
              <p class="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {{ t('landing.bookExpert.subtitle') }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="flex flex-col gap-4 border-t border-border/70 bg-gradient-to-r from-primary/[0.06] via-transparent to-accent/[0.06] p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6"
        >
          <div class="flex min-w-0 flex-shrink-0 items-center gap-2 lg:w-44 xl:w-52">
            <span
              class="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
            >
              <Sparkles class="h-3 w-3" />
              {{ t('landing.bookExpert.badge') }}
            </span>
          </div>

          <ol
            class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
            :aria-label="t('landing.bookExpert.title')"
          >
            <li
              v-for="(step, index) in steps"
              :key="step.title"
              class="flex items-start gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 sm:px-3"
            >
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <component :is="step.icon" class="h-3.5 w-3.5" />
              </span>
              <span class="min-w-0 text-left">
                <span class="block text-xs font-semibold leading-tight text-foreground">
                  <span class="mr-1 text-[10px] font-normal text-muted-foreground">{{ index + 1 }}.</span>
                  {{ step.title }}
                </span>
                <span class="mt-0.5 block line-clamp-1 text-[11px] leading-snug text-muted-foreground">
                  {{ step.desc }}
                </span>
              </span>
            </li>
          </ol>

          <div class="flex flex-shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              @click="emit('expert-create')"
            >
              <Upload class="h-3.5 w-3.5" />
              {{ t('landing.bookExpert.ctaCreate') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background/80 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
              @click="emit('expert-explore')"
            >
              <Compass class="h-3.5 w-3.5" />
              {{ t('landing.bookExpert.ctaExplore') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import {
  Sparkles,
  Zap,
  Play,
  Headphones,
  BookOpen,
  Upload,
  Compass,
  FlaskConical,
  MessageSquare,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { gtmCtaClick, gtmDemoClick, LANDING_WATCH_DEMO_EVENT } from '@/composables/useGtmDataLayer'

const emit = defineEmits(['expert-create', 'expert-explore'])

const { t } = useI18n()

const steps = computed(() => [
  {
    icon: markRaw(Upload),
    title: t('landing.bookExpert.stepUploadTitle'),
    desc: t('landing.bookExpert.stepUploadDesc'),
  },
  {
    icon: markRaw(FlaskConical),
    title: t('landing.bookExpert.stepDistillTitle'),
    desc: t('landing.bookExpert.stepDistillDesc'),
  },
  {
    icon: markRaw(MessageSquare),
    title: t('landing.bookExpert.stepChatTitle'),
    desc: t('landing.bookExpert.stepChatDesc'),
  },
])

const scrollToGenerator = () => {
  gtmCtaClick('hero_get_started')
  document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
}

const watchDemo = () => {
  gtmDemoClick('hero')
  gtmCtaClick('hero_demo')
  window.dispatchEvent(new CustomEvent(LANDING_WATCH_DEMO_EVENT))
  document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
}
</script>
