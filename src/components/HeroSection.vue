<template>
  <section class="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-12">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
    </div>

    <div class="relative mx-auto max-w-6xl px-6">
      <div
        class="hero-carousel"
        role="region"
        :aria-label="t('landing.heroCarouselLabel')"
        @mouseenter="pauseAutoplay"
        @mouseleave="resumeAutoplay"
        @focusin="pauseAutoplay"
        @focusout="onCarouselFocusOut"
      >
        <div class="hero-carousel-shell overflow-hidden rounded-2xl border border-border/60 bg-card/20 shadow-lg">
          <div class="hero-carousel-viewport">
          <Transition :name="reduceMotion ? '' : 'hero-carousel-fade'" mode="out-in">
            <article
              v-if="activeSlide === 0"
              key="co-reading"
              class="hero-carousel-panel"
            >
              <div
                id="co-reading-hero"
                class="flex h-full min-h-[28rem] flex-col rounded-2xl border-0 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 shadow-none sm:min-h-[26rem] sm:p-8 lg:min-h-[24rem]"
              >
                <div
                  class="mb-5 inline-flex self-start items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm"
                >
                  <Sparkles class="h-4 w-4" />
                  {{ t('landing.coReadingHero.badge') }}
                </div>

                <div class="flex items-start gap-4">
                  <div
                    class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent sm:h-14 sm:w-14"
                  >
                    <BookHeart class="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                      {{ t('landing.coReadingHero.title') }}
                    </h2>
                    <p class="mt-2 text-base leading-relaxed text-muted-foreground sm:text-lg">
                      {{ t('landing.coReadingHero.subtitle') }}
                    </p>
                  </div>
                </div>

                <ul class="my-6 space-y-4 sm:my-8" :aria-label="t('landing.coReadingHero.scenariosAria')">
                  <li
                    v-for="item in coReadingHighlights"
                    :key="item.title"
                    class="flex items-center gap-4"
                  >
                    <span
                      class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-background/70 text-primary sm:h-11 sm:w-11"
                    >
                      <component :is="item.icon" class="h-5 w-5" />
                    </span>
                    <span class="min-w-0 text-left">
                      <span class="block text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {{ item.title }}
                      </span>
                      <span class="mt-1 block text-sm leading-snug text-muted-foreground sm:text-base">
                        {{ item.desc }}
                      </span>
                    </span>
                  </li>
                </ul>

                <div class="mt-auto flex justify-center">
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:min-w-[16rem] sm:text-base"
                    @click="emit('co-read-start')"
                  >
                    <BookOpen class="h-4 w-4" />
                    {{ t('landing.coReadingHero.ctaStart') }}
                  </button>
                </div>
              </div>
            </article>

            <article
              v-else-if="activeSlide === 1"
              key="book-expert"
              class="hero-carousel-panel"
            >
              <div
                id="book-expert"
                class="flex h-full min-h-[28rem] flex-col rounded-2xl border-0 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 shadow-none sm:min-h-[26rem] sm:p-8 lg:min-h-[24rem]"
              >
                <div
                  class="mb-5 inline-flex self-start items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm"
                >
                  <Sparkles class="h-4 w-4" />
                  {{ t('landing.bookExpert.badge') }}
                </div>

                <div class="flex items-start gap-4">
                  <div
                    class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent sm:h-14 sm:w-14"
                  >
                    <BookOpen class="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                      {{ t('landing.bookExpert.title') }}
                    </h2>
                    <p class="mt-2 text-base leading-relaxed text-muted-foreground sm:text-lg">
                      {{ t('landing.bookExpert.subtitle') }}
                    </p>
                  </div>
                </div>

                <ul class="my-6 space-y-4 sm:my-8" :aria-label="t('landing.bookExpert.scenariosAria')">
                  <li
                    v-for="example in scenarioExamples"
                    :key="example.title"
                    class="flex items-center gap-4"
                  >
                    <span
                      class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-background/70 text-primary sm:h-11 sm:w-11"
                    >
                      <component :is="example.icon" class="h-5 w-5" />
                    </span>
                    <span class="min-w-0 text-left">
                      <span class="block text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {{ example.title }}
                      </span>
                      <span class="mt-1 block text-sm leading-snug text-muted-foreground sm:text-base">
                        {{ example.desc }}
                      </span>
                    </span>
                  </li>
                </ul>

                <div class="mt-auto grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base"
                    @click="emit('expert-create')"
                  >
                    <Upload class="h-4 w-4" />
                    {{ t('landing.bookExpert.ctaCreate') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 sm:text-base"
                    @click="emit('expert-explore')"
                  >
                    <Compass class="h-4 w-4" />
                    {{ t('landing.bookExpert.ctaExplore') }}
                  </button>
                </div>
              </div>
            </article>

            <article v-else key="deck" class="hero-carousel-panel">
              <div
                class="flex h-full min-h-[28rem] flex-col justify-center rounded-2xl border-0 bg-card/30 p-6 text-center sm:min-h-[26rem] sm:p-8 lg:min-h-[24rem] lg:text-left"
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
                    <p class="text-base font-semibold text-foreground sm:text-lg">{{ t('landing.heroAudioTitle') }}</p>
                    <p class="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground sm:text-base">
                      {{ t('landing.heroAudioDesc') }}
                    </p>
                  </div>
                </div>

                <div class="flex justify-center">
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 sm:w-auto sm:min-w-[16rem] sm:text-base"
                    @click="scrollToGenerator"
                  >
                    <Zap class="h-4 w-4" />
                    {{ t('landing.heroCta') }}
                  </button>
                </div>
              </div>
            </article>
          </Transition>
          </div>

          <div
            class="flex items-center justify-center gap-3 border-t border-border/50 bg-background/40 px-4 py-4"
            role="tablist"
            :aria-label="t('landing.heroCarouselDots')"
          >
            <button
              v-for="(slide, index) in slideDots"
              :key="slide.id"
              type="button"
              role="tab"
              class="hero-carousel-dot"
              :class="activeSlide === index ? 'hero-carousel-dot--active' : ''"
              :aria-selected="activeSlide === index"
              :aria-label="slide.dotLabel"
              :title="slide.dotLabel"
              @click="onDotClick(index)"
            >
              <span
                class="hero-carousel-dot-pill"
                :class="activeSlide === index ? 'hero-carousel-dot-pill--active' : ''"
              />
              <span class="hero-carousel-dot-label">{{ slide.dotLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Sparkles,
  Zap,
  Play,
  Headphones,
  BookOpen,
  BookHeart,
  MessageSquareHeart,
  HeartHandshake,
  Upload,
  Compass,
  TrendingUp,
  Rocket,
  Handshake,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { gtmCtaClick, gtmDemoClick, LANDING_WATCH_DEMO_EVENT } from '@/composables/useGtmDataLayer'

const emit = defineEmits(['expert-create', 'expert-explore', 'co-read-start'])

const { t } = useI18n()

const HERO_SLIDE_COUNT = 3
const AUTOPLAY_MS = 7000

const activeSlide = ref(0)
const autoplayPaused = ref(false)
const reduceMotion = ref(false)
let autoplayTimer = null

const slideDots = computed(() => [
  { id: 'co-reading', dotLabel: t('landing.heroCarouselSlideCoRead') },
  { id: 'book-expert', dotLabel: t('landing.heroCarouselSlideBookExpert') },
  { id: 'deck', dotLabel: t('landing.heroCarouselSlideDeck') },
])

const coReadingHighlights = computed(() => [
  {
    icon: markRaw(Sparkles),
    title: t('landing.coReadingHero.pointTimelyTitle'),
    desc: t('landing.coReadingHero.pointTimelyDesc'),
  },
  {
    icon: markRaw(MessageSquareHeart),
    title: t('landing.coReadingHero.pointDialogTitle'),
    desc: t('landing.coReadingHero.pointDialogDesc'),
  },
  {
    icon: markRaw(HeartHandshake),
    title: t('landing.coReadingHero.pointWarmthTitle'),
    desc: t('landing.coReadingHero.pointWarmthDesc'),
  },
])

const scenarioExamples = computed(() => [
  {
    icon: markRaw(TrendingUp),
    title: t('landing.bookExpert.scenarioInvestTitle'),
    desc: t('landing.bookExpert.scenarioInvestDesc'),
  },
  {
    icon: markRaw(Rocket),
    title: t('landing.bookExpert.scenarioStartupTitle'),
    desc: t('landing.bookExpert.scenarioStartupDesc'),
  },
  {
    icon: markRaw(Handshake),
    title: t('landing.bookExpert.scenarioNegotiateTitle'),
    desc: t('landing.bookExpert.scenarioNegotiateDesc'),
  },
])

function goToSlide(index) {
  if (index < 0 || index >= HERO_SLIDE_COUNT) return
  activeSlide.value = index
}

function onDotClick(index) {
  goToSlide(index)
  startAutoplay()
}

function nextSlide() {
  activeSlide.value = (activeSlide.value + 1) % HERO_SLIDE_COUNT
}

function clearAutoplay() {
  if (autoplayTimer != null) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function startAutoplay() {
  clearAutoplay()
  if (reduceMotion.value || autoplayPaused.value) return
  autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS)
}

function pauseAutoplay() {
  autoplayPaused.value = true
  clearAutoplay()
}

function resumeAutoplay() {
  autoplayPaused.value = false
  startAutoplay()
}

function onCarouselFocusOut(e) {
  const current = e.currentTarget
  if (current instanceof HTMLElement && e.relatedTarget instanceof Node && current.contains(e.relatedTarget)) {
    return
  }
  resumeAutoplay()
}

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

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  startAutoplay()
})

onBeforeUnmount(() => {
  clearAutoplay()
})
</script>

<style scoped>
.hero-carousel-viewport {
  width: 100%;
}

.hero-carousel-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  border: 1px solid hsl(var(--border) / 0.7);
  border-radius: 9999px;
  background: hsl(var(--background) / 0.55);
  padding: 0.35rem 0.75rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-carousel-dot:hover {
  border-color: hsl(var(--primary) / 0.45);
  color: hsl(var(--foreground));
}

.hero-carousel-dot--active {
  border-color: hsl(var(--primary) / 0.55);
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  font-weight: 600;
}

.hero-carousel-dot-label {
  line-height: 1;
  white-space: nowrap;
}

.hero-carousel-dot-pill {
  display: block;
  flex-shrink: 0;
  height: 0.55rem;
  width: 0.55rem;
  border-radius: 9999px;
  background: hsl(var(--muted-foreground) / 0.55);
  transition: width 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;
}

.hero-carousel-dot-pill--active {
  width: 1.5rem;
  background: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
}

.hero-carousel-dot:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

.hero-carousel-fade-enter-active,
.hero-carousel-fade-leave-active {
  transition: opacity 0.35s ease;
}

.hero-carousel-fade-enter-from,
.hero-carousel-fade-leave-to {
  opacity: 0;
}
</style>
