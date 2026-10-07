<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader />
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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
        <!-- 封面（有则展示，无则品牌渐变兜底） -->
        <div class="relative h-44 w-full overflow-hidden bg-primary/10 sm:h-56">
          <img
            v-if="expert.cover_url"
            :src="expert.cover_url"
            :alt="expert.expert_name"
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
          <h1 class="text-2xl font-bold sm:text-3xl">{{ expert.expert_name }}</h1>
          <p v-if="expert.book_title" class="mt-2 text-sm text-muted-foreground">
            {{ t('bookExpert.publicFromBook', { title: expert.book_title }) }}
          </p>

          <!-- 方法论速览 -->
          <section v-if="preview" class="mt-6">
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
                <p class="mb-2 text-xs font-semibold text-primary">{{ t('bookExpert.previewPrinciples') }}</p>
                <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  <li v-for="(p, i) in preview.principles" :key="`pr-${i}`">{{ p }}</li>
                </ul>
              </div>
            </div>
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

defineOptions({ name: 'ExploreExpertView' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const expertId = computed(() => String(route.params.expertId || ''))
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

useSeoHead(() => {
  const e = expert.value
  if (!e) return {}
  const url = buildExploreExpertShareUrl(e.expert_id)
  const description = e.book_title
    ? t('bookExpert.publicFromBook', { title: e.book_title })
    : t('bookExpert.exploreSubtitle')
  return {
    title: `${e.expert_name} · ${t('bookExpert.expertBadge')}`,
    description,
    canonical: url,
    ogType: 'profile',
    image: e.cover_url || undefined,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: e.expert_name,
      description,
      url,
      ...(e.cover_url ? { image: e.cover_url } : {}),
    },
  }
})

onMounted(async () => {
  if (!expertId.value) return
  loading.value = true
  error.value = ''
  try {
    // 匿名可访问（公开专家）；登录态由 token 头携带，BFF 注入 userId
    const res = await bookExpertApi.getExpert(expertId.value)
    expert.value = res?.expert ?? null
    if (!expert.value) error.value = t('bookExpert.publicNotFound')
  } catch {
    error.value = t('bookExpert.publicNotFound')
  } finally {
    loading.value = false
  }
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
