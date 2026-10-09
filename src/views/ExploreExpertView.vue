<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader />
    <main
      class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      :data-seo-ready="seoReady ? 'true' : undefined"
    >
      <button
        type="button"
        class="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
        {{ t('common.back') }}
      </button>

      <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="error" class="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <BookOpen class="mx-auto h-10 w-10 text-muted-foreground" />
        <p class="mt-4 text-sm text-muted-foreground">{{ error }}</p>
      </div>

      <article v-else-if="expert" class="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <nav
          v-if="seoContent"
          class="border-b border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-8"
          aria-label="Breadcrumb"
        >
          <ol class="flex flex-wrap items-center gap-1.5">
            <li>
              <RouterLink to="/" class="transition-colors hover:text-foreground">{{ t('common.brand') }}</RouterLink>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <RouterLink :to="{ name: 'explore' }" class="transition-colors hover:text-foreground">
                {{ t('bookExpert.exploreTitle') }}
              </RouterLink>
            </li>
            <li aria-hidden="true">/</li>
            <li class="font-medium text-foreground">{{ expert.expert_name }}</li>
          </ol>
        </nav>

        <!-- 封面（有则展示，无则品牌渐变兜底） -->
        <div class="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden bg-primary/10 sm:max-w-sm">
          <img
            v-if="expert.cover_url"
            :src="expert.cover_url"
            :alt="coverAlt"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full items-center justify-center">
            <BookOpen class="h-14 w-14 text-primary/60" />
          </div>
          <span class="absolute bottom-3 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            {{ t('bookExpert.publicBadge') }}
          </span>
        </div>

        <div class="p-5 sm:p-8">
          <h1 class="text-2xl font-bold sm:text-3xl">{{ pageHeading }}</h1>
          <p v-if="expert.book_title" class="mt-2 text-sm text-muted-foreground">
            {{ t('bookExpert.publicFromBook', { title: expert.book_title }) }}
          </p>
          <p v-if="seoDescription" class="mt-3 text-base leading-relaxed text-muted-foreground">
            {{ seoDescription }}
          </p>

          <!-- 方法论速览 -->
          <section v-if="preview" class="mt-6" data-seo-section="methodology">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('bookExpert.publicPreviewTitle') }}
            </h2>
            <div class="space-y-4">
              <div v-if="preview.problem" class="rounded-xl bg-background/60 p-4">
                <p class="mb-1 text-xs font-semibold text-primary">{{ t('bookExpert.publicCoreProblem') }}</p>
                <p class="text-sm leading-relaxed">{{ preview.problem }}</p>
              </div>
              <div v-if="preview.viewpoints.length" class="rounded-xl bg-background/60 p-4">
                <p class="mb-2 text-xs font-semibold text-primary">{{ t('bookExpert.previewViewpoints') }}</p>
                <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  <li v-for="(v, i) in preview.viewpoints" :key="`vp-${i}`">{{ v }}</li>
                </ul>
              </div>
              <div v-if="preview.principles.length" class="rounded-xl bg-background/60 p-4">
                <h3 class="mb-2 text-xs font-semibold text-primary">
                  {{ principlesHeading }}
                </h3>
                <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  <li v-for="(p, i) in preview.principles" :key="`pr-${i}`">{{ p }}</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            v-if="seoContent"
            class="mt-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
            data-seo-section="cta"
          >
            <h2 class="text-base font-semibold text-foreground">
              {{ ctaHeading }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
              {{ t('bookExpert.seo.ctaBody') }}
            </p>
          </section>

          <!-- 分享 + 召唤 CTA -->
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              @click="summon"
            >
              <Sparkles class="h-4 w-4" />
              {{ t('bookExpert.publicCta') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              @click="copyLink"
            >
              <Link2 class="h-4 w-4" />
              {{ t('bookExpert.shareViaLink') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              :title="t('bookExpert.shareFacebook')"
              @click="shareTo('facebook')"
            >
              <Facebook class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              :title="t('bookExpert.shareX')"
              @click="shareTo('x')"
            >
              <Twitter class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              :title="t('bookExpert.shareLinkedIn')"
              @click="shareTo('linkedin')"
            >
              <Linkedin class="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Loader2, BookOpen, Sparkles, Link2, Facebook, Twitter, Linkedin,
} from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { bookExpertApi } from '@/api'
import { buildExploreExpertShareUrl } from '@/utils/feedOpen'
import { useSeoHead } from '@/composables/useSeoHead'
import type { BookExpertSummary } from '@/api/types'
import { localizeBookExpertSummaries } from '@/utils/resolveBookExpertDisplay'
import { recordBookExpertOpen } from '@/utils/bookExpertEngagement'
import {
  extractExpertSeoContent,
  buildExpertJsonLd,
  buildExpertSeoDescription,
  truncateSeoDescription,
} from '@/utils/bookExpertSeo'

defineOptions({ name: 'ExploreExpertView' })

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const expertId = computed(() => String(route.params.expertId || ''))
const rawExpert = ref<BookExpertSummary | null>(null)
const expert = ref<BookExpertSummary | null>(null)
const loading = ref(false)
const error = ref('')

/** Python 条目自带「1. 」序号前缀，与 list-disc 圆点叠加成双重编号，剥掉前缀 */
function stripLeadingNumber(s: string): string {
  return s.replace(/^\s*\d+\s*[.、)）]\s*/, '').trim()
}

const preview = computed(() => {
  const raw = expert.value?.methodology_preview
  if (!raw) return null
  if (typeof raw === 'string') {
    return raw.trim() ? { problem: raw, viewpoints: [] as string[], principles: [] as string[] } : null
  }
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === 'string')
          .map(stripLeadingNumber)
          .filter((s) => s.length > 0)
          .slice(0, 5)
      : []
  const problem = typeof raw.core_problem === 'string' ? raw.core_problem : ''
  const viewpoints = arr(raw.core_viewpoints)
  const principles = arr(raw.judgment_principles)
  if (!problem && !viewpoints.length && !principles.length) return null
  return { problem, viewpoints, principles }
})

const seoContent = computed(() => extractExpertSeoContent(expert.value, preview.value))

const seoSnippet = computed(() => {
  const c = seoContent.value
  if (!c) return ''
  return (
    c.problem ||
    c.viewpoints[0] ||
    c.principles[0] ||
    t('bookExpert.exploreSubtitle')
  )
})

const seoDescription = computed(() => {
  const c = seoContent.value
  if (!c) return ''
  const raw = c.bookTitle
    ? t('bookExpert.seo.metaDescriptionWithBook', {
        expertName: c.expertName,
        bookTitle: c.bookTitle,
        snippet: seoSnippet.value,
        brand: t('common.brand'),
      })
    : t('bookExpert.seo.metaDescription', {
        expertName: c.expertName,
        snippet: seoSnippet.value,
        brand: t('common.brand'),
      })
  return truncateSeoDescription(raw)
})

const pageHeading = computed(() => {
  const c = seoContent.value
  if (!c) return expert.value?.expert_name || ''
  return c.bookTitle
    ? t('bookExpert.seo.headingWithBook', { expertName: c.expertName, bookTitle: c.bookTitle })
    : t('bookExpert.seo.heading', { expertName: c.expertName })
})

const coverAlt = computed(() => {
  const name = seoContent.value?.expertName || expert.value?.expert_name || ''
  return name ? t('bookExpert.seo.coverAlt', { expertName: name }) : ''
})

const principlesHeading = computed(() => {
  const name = seoContent.value?.expertName || expert.value?.expert_name || ''
  return name
    ? t('bookExpert.seo.principlesHeading', { expertName: name })
    : t('bookExpert.previewPrinciples')
})

const ctaHeading = computed(() => {
  const c = seoContent.value
  if (!c) return t('bookExpert.publicCta')
  return c.bookTitle
    ? t('bookExpert.seo.ctaHeading', { expertName: c.expertName, bookTitle: c.bookTitle })
    : t('bookExpert.seo.ctaHeadingNoBook', { expertName: c.expertName })
})

const seoReady = computed(() => Boolean(seoContent.value) && !loading.value)

const documentTitle = computed(() => {
  const c = seoContent.value
  if (!c) return ''
  const brand = t('common.brand')
  return c.bookTitle
    ? t('bookExpert.seo.documentTitleWithBook', {
        expertName: c.expertName,
        bookTitle: c.bookTitle,
        brand,
      })
    : t('bookExpert.seo.documentTitle', { expertName: c.expertName, brand })
})

useSeoHead(() => {
  if (loading.value) return {}
  if (error.value || !seoContent.value) {
    return {
      title: `${t('bookExpert.publicNotFound')} | ${t('common.brand')}`,
      robots: 'noindex,nofollow',
    }
  }
  const c = seoContent.value
  const url = buildExploreExpertShareUrl(expertId.value)
  const description = seoDescription.value || buildExpertSeoDescription(c)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://page2.top'
  const image = expert.value?.cover_url || undefined
  const pageName = documentTitle.value.replace(/\s*\|\s*[^|]+$/, '').trim()
  return {
    title: documentTitle.value,
    description,
    canonical: url,
    ogType: 'article',
    image,
    jsonLd: buildExpertJsonLd(c, {
      url,
      image,
      description,
      pageName,
      siteName: t('common.brand'),
      siteOrigin: origin,
      exploreUrl: `${origin}/explore`,
      exploreLabel: t('bookExpert.exploreTitle'),
    }),
  }
})

async function applyDisplayLocale() {
  if (!rawExpert.value) {
    expert.value = null
    return
  }
  const [localized] = await localizeBookExpertSummaries([rawExpert.value], locale.value)
  expert.value = localized ?? rawExpert.value
}

async function loadExpert() {
  if (!expertId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await bookExpertApi.getExpert(expertId.value)
    rawExpert.value = res?.expert ?? null
    if (!rawExpert.value) error.value = t('bookExpert.publicNotFound')
    else {
      await applyDisplayLocale()
      recordBookExpertOpen(rawExpert.value)
    }
  } catch {
    error.value = t('bookExpert.publicNotFound')
    rawExpert.value = null
    expert.value = null
  } finally {
    loading.value = false
  }
}

watch(locale, () => {
  void applyDisplayLocale()
})

onMounted(() => {
  void loadExpert()
})

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'explore' })
}

function summon() {
  if (!expert.value) return
  router.push({ name: 'workspace', query: { expert: expert.value.expert_id } })
}

async function copyLink() {
  if (!expert.value) return
  try {
    await navigator.clipboard.writeText(buildExploreExpertShareUrl(expert.value.expert_id))
    ElMessage.success(t('bookExpert.shareCopied'))
  } catch {
    ElMessage.error(t('bookExpert.shareCopyFailed'))
  }
}

function shareTo(platform: 'facebook' | 'x' | 'linkedin') {
  if (!expert.value) return
  const encoded = encodeURIComponent(buildExploreExpertShareUrl(expert.value.expert_id))
  const text = encodeURIComponent(expert.value.expert_name || '')
  const target =
    platform === 'facebook'
      ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
      : platform === 'x'
        ? `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
  window.open(target, '_blank', 'noopener,noreferrer')
}
</script>
