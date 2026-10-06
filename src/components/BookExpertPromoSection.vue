<template>
  <section id="book-expert" class="relative pb-12 pt-4 sm:pb-16">
    <div class="mx-auto max-w-6xl px-6">
      <div
        class="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 shadow-lg shadow-primary/5 sm:p-10"
      >
        <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-xl">
            <div
              class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-xs font-medium text-primary"
            >
              <Sparkles class="h-3.5 w-3.5" />
              {{ t('landing.bookExpert.badge') }}
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {{ t('landing.bookExpert.title') }}
            </h2>
            <p class="mt-3 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {{ t('landing.bookExpert.subtitle') }}
            </p>
          </div>

          <ul class="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-2xl">
            <li
              v-for="step in steps"
              :key="step.title"
              class="rounded-xl border border-border/80 bg-background/70 p-4 backdrop-blur-sm"
            >
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <component :is="step.icon" class="h-5 w-5" />
              </div>
              <p class="text-sm font-semibold text-foreground">{{ step.title }}</p>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ step.desc }}</p>
            </li>
          </ul>
        </div>

        <div class="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            @click="emit('create')"
          >
            <Upload class="h-4 w-4" />
            {{ t('landing.bookExpert.ctaCreate') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-card"
            @click="emit('explore')"
          >
            <Compass class="h-4 w-4" />
            {{ t('landing.bookExpert.ctaExplore') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Upload, Compass, FlaskConical, MessageSquare } from 'lucide-vue-next'

const emit = defineEmits<{ create: []; explore: [] }>()

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
</script>
