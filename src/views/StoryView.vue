<!-- 我们的故事：创始人为什么要做这个产品 -->
<template>
  <div class="min-h-screen bg-background">
    <AppHeader :logged="logged" :nick-name="nickName" @open-login="goHome" @enter="goWorkspace" />

    <main class="pt-16">
      <div class="mx-auto max-w-3xl px-6 py-16">
        <RouterLink
          to="/"
          class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" /> {{ t('legal.backHome') }}
        </RouterLink>

        <span class="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          <BookOpen class="h-3.5 w-3.5" /> {{ t('story.badge') }}
        </span>

        <h1 class="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
          {{ t('story.title', { brand: t('app.brand') }) }}
        </h1>
        <p class="mt-3 text-lg text-muted-foreground">{{ t('story.subtitle') }}</p>

        <div class="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>{{ t('story.p1') }}</p>
          <p>{{ t('story.p2') }}</p>
          <p>{{ t('story.p3') }}</p>
          <p>{{ t('story.p4') }}</p>
          <p>{{ t('story.p5', { brand: t('app.brand') }) }}</p>
        </div>

        <div class="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles class="h-5 w-5 text-primary" /> {{ t('story.missionTitle') }}
          </h2>
          <p class="mt-3 leading-relaxed text-muted-foreground">
            {{ t('story.mission', { brand: t('app.brand') }) }}
          </p>
        </div>

        <p class="mt-10 text-base font-medium leading-relaxed text-foreground">
          {{ t('story.closing') }}
        </p>

        <div class="mt-10">
          <RouterLink
            to="/pricing"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {{ t('story.cta') }}
          </RouterLink>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import { isLoggedIn } from '../api'

const { t } = useI18n()
const router = useRouter()

const logged = ref(isLoggedIn())
const nickName = ref('')

const goHome = () => router.push('/')
const goWorkspace = () => router.push('/workspace')
</script>
