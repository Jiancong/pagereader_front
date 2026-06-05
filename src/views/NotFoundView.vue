<!-- 404：未注册的路由 -->
<template>
  <div class="min-h-screen bg-background">
    <AppHeader :logged="logged" :nick-name="nickName" @open-login="goHome" @enter="goWorkspace" />

    <main class="pt-16">
      <div class="mx-auto max-w-2xl px-6 py-24 text-center">
        <p class="text-7xl font-bold tracking-tight text-primary/20 sm:text-8xl">404</p>
        <h1 class="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
          {{ t('notFound.title') }}
        </h1>
        <p class="mt-3 text-base text-muted-foreground">
          {{ t('notFound.description') }}
        </p>
        <p v-if="attemptedPath" class="mt-2 break-all font-mono text-sm text-muted-foreground/80">
          {{ attemptedPath }}
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <RouterLink
            to="/"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home class="h-4 w-4" /> {{ t('notFound.backHome') }}
          </RouterLink>
          <RouterLink
            v-if="logged"
            to="/workspace"
            class="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {{ t('nav.enterWorkspace') }}
          </RouterLink>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import { isLoggedIn } from '../api'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const logged = ref(isLoggedIn())
const nickName = ref('')

const attemptedPath = computed(() => {
  const raw = route.params.pathMatch
  if (Array.isArray(raw)) return raw.length ? `/${raw.join('/')}` : ''
  return typeof raw === 'string' && raw ? `/${raw}` : route.fullPath
})

const syncDocumentTitle = () => {
  document.title = t('notFound.documentTitle', { brand: t('app.brand') })
}

onMounted(syncDocumentTitle)
watch(locale, syncDocumentTitle)

const goHome = () => router.push('/')
const goWorkspace = () => router.push('/workspace')
</script>
