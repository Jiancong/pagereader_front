<template>
  <section class="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-12">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
    </div>

    <div class="relative mx-auto max-w-6xl px-6">
      <div class="hero-marquee-viewport">
        <div class="hero-marquee-track">
          <template v-for="copy in 2" :key="`copy-${copy}`">
            <article
              v-for="slide in heroSlides"
              :key="`${copy}-${slide.id}`"
              class="hero-marquee-slide"
              :aria-hidden="copy > 1 ? true : undefined"
            >
              <div
                v-if="slide.id === 'book-expert'"
                :id="copy === 1 ? 'book-expert' : undefined"
                class="flex h-full min-h-[28rem] flex-col rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-5 shadow-lg shadow-primary/5 sm:min-h-[26rem] sm:p-6 lg:min-h-[24rem]"
              >
                <div
                  class="mb-4 inline-flex self-start items-center gap-1.5 rounded-full border border-primary/25 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  <Sparkles class="h-3 w-3" />
                  {{ t('landing.bookExpert.badge') }}
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"
                  >
                    <BookOpen class="h-5 w-5" />
                  </div>
                  <div>
                    <h2 class="text-xl font-bold leading-tight text-foreground sm:text-2xl">
                      {{ t('landing.bookExpert.title') }}
                    </h2>
                    <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {{ t('landing.bookExpert.subtitle') }}
                    </p>
                  </div>
                </div>

                <ol class="my-5 space-y-3" :aria-label="t('landing.bookExpert.title')">
                  <li
                    v-for="(step, index) in steps"
                    :key="step.title"
                    class="flex items-center gap-3"
                  >
                    <span
                      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-background/70 text-primary"
                    >
                      <component :is="step.icon" class="h-4 w-4" />
                    </span>
                    <span class="min-w-0 text-left">
                      <span class="block text-sm font-semibold leading-tight text-foreground">
                        <span class="mr-1.5 text-xs font-medium text-primary">{{ index + 1 }}</span>
                        {{ step.title }}
                      </span>
                      <span class="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {{ step.desc }}
                      </span>
                    </span>
                  </li>
                </ol>

                <div class="mt-auto grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    @click="emit('expert-create')"
                  >
                    <Upload class="h-3.5 w-3.5" />
                    {{ t('landing.bookExpert.ctaCreate') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background/80 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
                    @click="emit('expert-explore')"
                  >
                    <Compass class="h-3.5 w-3.5" />
                    {{ t('landing.bookExpert.ctaExplore') }}
                  </button>
                </div>
              </div>

              <div
                v-else
                class="flex h-full min-h-[28rem] flex-col justify-center rounded-2xl border border-border/70 bg-card/30 p-5 text-center sm:min-h-[26rem] sm:p-8 lg:min-h-[24rem] lg:text-left"
              >
                <div
                  class="mb-4 inline-flex self-center items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground sm:text-sm lg:self-start"
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

                <p class="mx-auto mb-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg lg:mx-0">
                  {{ t('landing.heroSubtitle') }}
                </p>

                <div
                  class="mx-auto mb-6 flex max-w-xl items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-3 text-left lg:mx-0"
                >
                  <div
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  >
                    <Headphones class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-foreground">{{ t('landing.heroAudioTitle') }}</p>
                    <p class="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {{ t('landing.heroAudioDesc') }}
                    </p>
                  </div>
                </div>

                <div class="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
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
            </article>
          </template>
        </div>
        <div class="hero-marquee-mask hero-marquee-mask-left" />
        <div class="hero-marquee-mask hero-marquee-mask-right" />
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

/** 跑马灯顺序：书籍专家优先，其次 Deck 主叙事 */
const heroSlides = [
  { id: 'book-expert' },
  { id: 'deck' },
]

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

<style scoped>
.hero-marquee-viewport {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
}

.hero-marquee-track {
  display: flex;
  grid-column: 1;
  grid-row: 1;
  width: 100%;
  animation: hero-marquee-scroll 42s linear infinite;
}

.hero-marquee-viewport:hover .hero-marquee-track {
  animation-play-state: paused;
}

.hero-marquee-slide {
  flex: 0 0 100%;
  min-width: 100%;
  box-sizing: border-box;
  padding-right: 1.5rem;
}

.hero-marquee-mask {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 2.5rem;
}

.hero-marquee-mask-left {
  left: 0;
  background: linear-gradient(to right, hsl(var(--background)), transparent);
}

.hero-marquee-mask-right {
  right: 0;
  background: linear-gradient(to left, hsl(var(--background)), transparent);
}

@keyframes hero-marquee-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-marquee-viewport {
    overflow: visible;
  }

  .hero-marquee-track {
    animation: none;
    flex-direction: column;
    width: 100%;
    gap: 1.5rem;
  }

  .hero-marquee-slide {
    min-width: 0;
    padding-right: 0;
  }

  .hero-marquee-slide:nth-child(n + 3) {
    display: none;
  }

  .hero-marquee-mask {
    display: none;
  }
}
</style>
