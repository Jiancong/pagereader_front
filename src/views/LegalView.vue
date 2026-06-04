<!-- 关于我们 / 使用条款 / 隐私政策 / 联系我们 -->
<!-- @author hc @date 2026-06-04 -->
<template>
  <div class="min-h-screen bg-background">
    <AppHeader :logged="logged" :nick-name="nickName" @open-login="goHome" @enter="goWorkspace" />

    <main class="pt-16">
      <div class="mx-auto max-w-3xl px-6 py-16">
        <RouterLink to="/" class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft class="h-4 w-4" /> {{ t('legal.backHome') }}
        </RouterLink>

        <section v-if="page === 'about'">
          <h1 class="text-3xl font-bold text-foreground">{{ t('footer.about') }}</h1>
          <div class="mt-8 space-y-5 leading-relaxed text-muted-foreground">
            <p>{{ t('legal.aboutP1', { brand: t('app.brand') }) }}</p>
            <p>{{ t('legal.aboutP2', { brand: t('app.brand') }) }}</p>
            <p>{{ t('legal.aboutP3') }}</p>
            <p>
              {{ t('legal.aboutP4') }}
              <a :href="`mailto:${contactEmail}`" class="text-primary hover:underline">{{ contactEmail }}</a>
            </p>
          </div>
        </section>

        <section v-else-if="page === 'contact'">
          <h1 class="text-3xl font-bold text-foreground">{{ t('footer.contact') }}</h1>
          <div class="mt-8 space-y-5 leading-relaxed text-muted-foreground">
            <p>{{ t('legal.contactIntro') }}</p>
            <div class="rounded-xl border border-border bg-card p-6">
              <div class="flex items-center gap-3">
                <Mail class="h-5 w-5 text-primary" />
                <a :href="`mailto:${contactEmail}`" class="text-lg font-medium text-foreground hover:text-primary">{{ contactEmail }}</a>
              </div>
              <p class="mt-4 text-sm">{{ t('legal.contactEntity') }}</p>
              <p class="mt-1 text-sm">{{ t('legal.contactReply') }}</p>
            </div>
          </div>
        </section>

        <section v-else-if="page === 'terms'">
          <h1 class="text-3xl font-bold text-foreground">{{ t('footer.terms') }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t('legal.lastUpdated', { date: lastUpdated }) }}</p>
          <div class="mt-8 space-y-8 leading-relaxed text-muted-foreground">
            <p>{{ t('legal.termsIntro', { brand: t('app.brand') }) }}</p>
            <div v-for="(sec, i) in termsSections" :key="i">
              <h2 class="text-lg font-semibold text-foreground">{{ i + 1 }}. {{ sec.title }}</h2>
              <p class="mt-2 whitespace-pre-line">{{ sec.body }}</p>
            </div>
            <p>
              {{ t('legal.termsOutro') }}
              <a :href="`mailto:${contactEmail}`" class="text-primary hover:underline">{{ contactEmail }}</a>
            </p>
          </div>
        </section>

        <section v-else-if="page === 'privacy'">
          <h1 class="text-3xl font-bold text-foreground">{{ t('footer.privacy') }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t('legal.lastUpdated', { date: lastUpdated }) }}</p>
          <div class="mt-8 space-y-8 leading-relaxed text-muted-foreground">
            <p>{{ t('legal.privacyIntro', { brand: t('app.brand') }) }}</p>
            <div v-for="(sec, i) in privacySections" :key="i">
              <h2 class="text-lg font-semibold text-foreground">{{ i + 1 }}. {{ sec.title }}</h2>
              <p class="mt-2 whitespace-pre-line">{{ sec.body }}</p>
            </div>
            <p>
              {{ t('legal.privacyOutro') }}
              <a :href="`mailto:${contactEmail}`" class="text-primary hover:underline">{{ contactEmail }}</a>
            </p>
          </div>
        </section>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import { isLoggedIn } from '../api'
import { getTermsSections, getPrivacySections } from '@/locales/legal-sections'

const props = defineProps({
  page: { type: String, required: true },
})

const { t, locale } = useI18n()
const router = useRouter()

const contactEmail = 'bd@bytelancers.com'
const lastUpdated = computed(() =>
  locale.value === 'en' ? '4 June 2026' : '2026年6月4日',
)

const logged = ref(isLoggedIn())
const nickName = ref('')

const termsSections = computed(() => getTermsSections(locale.value))
const privacySections = computed(() => getPrivacySections(locale.value))

const goHome = () => router.push('/')
const goWorkspace = () => router.push('/workspace')
</script>
