<template>
  <section id="features" class="py-20">
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-12 text-center">
        <h2 class="mb-4 text-3xl font-bold text-foreground">{{ t('landing.featuresTitle') }}</h2>
        <p class="text-lg text-muted-foreground">{{ t('landing.featuresSubtitle') }}</p>
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
          <h3 class="mb-2 text-lg font-semibold text-foreground">{{ feature.title }}</h3>
          <p class="text-sm text-muted-foreground">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { Brain, Zap, TextSearch, Globe } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const features = computed(() => [
  { icon: markRaw(Brain), title: t('landing.featureDocTitle'), description: t('landing.featureDocDesc') },
  { icon: markRaw(Zap), title: t('landing.featureQuickTitle'), description: t('landing.featureQuickDesc') },
  { icon: markRaw(TextSearch), title: t('landing.featureTopicSearchTitle'), description: t('landing.featureTopicSearchDesc') },
  { icon: markRaw(Globe), title: t('landing.featureI18nTitle'), description: t('landing.featureI18nDesc') },
])
</script>
