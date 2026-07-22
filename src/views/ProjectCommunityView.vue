<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main
      class="mx-auto max-w-3xl px-3 pb-16 pt-[4.5rem] sm:px-6 sm:pt-20"
      :data-seo-ready="seoReady ? 'true' : undefined"
    >
      <button
        class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
      </button>

      <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

      <template v-if="project">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <h1 class="break-words text-2xl font-bold text-foreground sm:text-3xl">{{ pageHeading }}</h1>
            <p v-if="seo.author" class="mt-1 text-sm text-muted-foreground">
              {{ t('community.bookAuthor', { name: seo.author }) }}
            </p>
            <p v-if="seo.totalSlides > 0" class="mt-1 text-xs text-muted-foreground">
              {{ t('community.seo.deckPages', { count: seo.totalSlides }) }}
            </p>
            <p v-if="seo.overview" class="mt-3 text-base leading-relaxed text-muted-foreground">
              {{ seo.overview }}
            </p>
          </div>
          <div class="flex w-full shrink-0 flex-col gap-2 self-start sm:w-auto sm:flex-row">
            <button
              v-if="canPlayDeckAudio"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              :class="ttsPlayAllActive ? 'border-primary/50 bg-primary/10 text-primary' : ''"
              :disabled="ttsLoading"
              :title="playAllButtonTitle"
              :aria-label="playAllButtonTitle"
              @click="togglePlayAll"
            >
              <Loader2 v-if="ttsLoading" class="h-4 w-4 animate-spin" />
              <Square v-else-if="ttsPlayAllActive" class="h-4 w-4" />
              <ListVideo v-else class="h-4 w-4" />
              {{ ttsPlayAllActive ? t('community.playAllStop') : t('community.playAll') }}
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              @click="openReader"
            >
              <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
            </button>
          </div>
        </div>

        <button
          v-if="project.thumbnailUrl"
          type="button"
          class="group relative mt-6 block w-full overflow-hidden rounded-xl border border-border"
          @click="openReader"
        >
          <img
            :src="project.thumbnailUrl"
            :alt="seoImageAlt"
            class="w-full object-cover"
            loading="lazy"
          />
          <span class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
            <span class="inline-flex items-center gap-2 rounded-lg bg-background/90 px-4 py-2 text-sm font-semibold text-foreground shadow">
              <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
            </span>
          </span>
        </button>

        <!-- 阅读统计 / 字数 / 版权 -->
        <section
          v-if="bookStats"
          class="mt-6 grid grid-cols-2 divide-x divide-y divide-border rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0"
        >
          <div class="px-4 py-4 text-center sm:py-5">
            <p class="text-xs text-muted-foreground">{{ t('community.stats.reading') }}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {{ statsDisplay.readers }}
            </p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">
              {{ t('community.stats.finishedSub', { count: statsDisplay.finished }) }}
            </p>
          </div>
          <div class="px-4 py-4 text-center sm:py-5">
            <p class="text-xs text-muted-foreground">{{ t('community.stats.slides') }}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {{ statsDisplay.slides }}
            </p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{{ t('community.stats.slidesSub') }}</p>
          </div>
          <div class="px-4 py-4 text-center sm:py-5">
            <p class="text-xs text-muted-foreground">{{ t('community.stats.wordCount') }}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {{ statsDisplay.words }}
            </p>
            <p v-if="bookStats.publishLabel" class="mt-0.5 text-[11px] text-muted-foreground">
              {{ t('community.stats.publishedAt', { date: bookStats.publishLabel }) }}
            </p>
          </div>
          <div class="px-4 py-4 text-center sm:py-5">
            <p class="text-xs text-muted-foreground">{{ t('community.stats.copyright') }}</p>
            <p class="mt-1 flex items-center justify-center gap-1 text-lg font-semibold text-foreground sm:text-xl">
              <Copyright class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ bookStats.copyrightHolder }}</span>
            </p>
            <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
              {{ copyrightKindLabel }}
            </p>
          </div>
        </section>

        <!-- Page2Top 阅读推荐值 -->
        <section
          v-if="bookStats"
          class="mt-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-medium text-foreground">
                {{ t('community.recommend.title') }}
                <span
                  v-if="bookStats.recommend.score != null"
                  class="ml-1 font-semibold tabular-nums text-primary"
                >
                  {{ bookStats.recommend.score }}%
                </span>
                <span v-else class="ml-1 text-muted-foreground">{{ t('community.recommend.pending') }}</span>
              </h2>
              <p
                v-if="bookStats.recommend.score != null"
                class="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {{ t(`community.recommend.${bookStats.recommend.badgeKey}`) }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
              @click="scrollToComments"
            >
              {{ t('community.recommend.writeReview') }}
            </button>
          </div>

          <div
            v-if="bookStats.recommend.score != null"
            class="mt-4 space-y-2"
          >
            <div
              v-for="bar in recommendBars"
              :key="bar.key"
              class="flex items-center gap-2 text-xs"
            >
              <span class="w-8 shrink-0 text-muted-foreground">{{ bar.label }}</span>
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-foreground/70 transition-all"
                  :style="{ width: `${bar.pct}%` }"
                />
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="tab in commentFilterTabs"
              :key="tab.id"
              type="button"
              class="rounded-full px-3 py-1 text-xs transition-colors"
              :class="
                commentFilter === tab.id
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'bg-muted/80 text-muted-foreground hover:text-foreground'
              "
              @click="onCommentFilterChange(tab.id)"
            >
              {{ tab.label }}({{ tab.count }})
            </button>
          </div>
        </section>

        <!-- 读者评论 -->
        <ProjectCommentBoard
          ref="commentBoardRef"
          class="mt-4"
          :project-id="projectId"
          :comments="comments"
          :is-logged-in="logged"
          :loading="loadingComments"
          :rating-filter="commentFilter"
          @update:comments="(c) => (comments = c)"
          @reload-comments="reloadComments"
          @login="openLogin"
        />

        <p
          v-if="loadingDeck && !hasSeoBody"
          class="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
        >
          <Loader2 class="h-5 w-5 animate-spin" /> {{ t('workspace.loadingPpt') }}
        </p>

        <!-- Summary：承接 "{book} summary / book summary" -->
        <section v-if="seo.summaryPoints.length" data-seo-section="summary" class="mt-10">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('community.seo.summaryHeading', { title: seo.bookTitle }) }}
          </h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(point, i) in seo.summaryPoints"
              :key="`sum-${i}`"
              class="flex gap-2 text-sm leading-relaxed text-muted-foreground"
            >
              <span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/70" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </section>

        <!-- Key takeaways / analysis：承接 "analysis / key takeaways" -->
        <section v-if="seo.takeaways.length" data-seo-section="takeaways" class="mt-10">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('community.seo.takeawaysHeading', { title: seo.bookTitle }) }}
          </h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(point, i) in seo.takeaways"
              :key="`take-${i}`"
              class="flex gap-2 text-sm leading-relaxed text-muted-foreground"
            >
              <span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/70" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </section>

        <!-- Characters：承接 "{book} characters" -->
        <section v-if="seo.characters.length" data-seo-section="characters" class="mt-10">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('community.seo.charactersHeading', { title: seo.bookTitle }) }}
          </h2>
          <dl class="mt-3 space-y-3">
            <div
              v-for="(c, i) in seo.characters"
              :key="`char-${i}`"
              class="rounded-lg border border-border bg-card p-3"
            >
              <dt class="text-sm font-semibold text-foreground">{{ c.name }}</dt>
              <dd v-if="c.description" class="mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ c.description }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Notable quotes -->
        <section v-if="seo.quotes.length" class="mt-10">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('community.seo.quotesHeading', { title: seo.bookTitle }) }}
          </h2>
          <div class="mt-3 space-y-3">
            <blockquote
              v-for="(q, i) in seo.quotes"
              :key="`quote-${i}`"
              class="border-l-2 border-primary/60 pl-4 text-sm italic leading-relaxed text-muted-foreground"
            >
              "{{ q.text }}"
              <footer v-if="q.author" class="mt-1 not-italic text-xs text-muted-foreground/80">
                — {{ q.author }}
              </footer>
            </blockquote>
          </div>
        </section>

        <!-- 阅读 / 生成 CTA -->
        <section class="mt-10 rounded-xl border border-border bg-card p-5">
          <h2 class="text-lg font-bold text-foreground">
            {{ t('community.seo.ctaHeading', { title: seo.bookTitle }) }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ t('community.seo.ctaBody') }}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              @click="openReader"
            >
              <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
              @click="goCreate"
            >
              <Sparkles class="h-4 w-4" /> {{ t('community.seo.ctaCreate') }}
            </button>
          </div>
        </section>

        <section
          v-if="seo.author"
          class="mb-6 mt-10 rounded-xl border border-border bg-card p-4"
        >
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {{ t('community.bookSource') }}
          </p>
          <p class="mt-1 text-lg font-semibold text-foreground">{{ seo.bookTitle }}</p>
          <p class="text-sm text-muted-foreground">
            {{ t('community.bookAuthor', { name: seo.author }) }}
          </p>
        </section>

      </template>
    </main>
    <AppFooter />

    <AuthDialog
      :open="dialogOpen"
      default-mode="login"
      @close="dialogOpen = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'ProjectCommunityView' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Loader2, BookOpen, Sparkles, ListVideo, Square, Copyright } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import ProjectCommentBoard from '@/components/community/ProjectCommentBoard.vue'
import { authApi, projectApi, isLoggedIn, getLocalAvatar } from '@/api'
import { gtmOpenReader } from '@/composables/useGtmDataLayer'
import { resolvePptDataFromStreamComplete } from '@/utils/pptCompletePayload'
import { looksLikeDeckJson } from '@/utils/projectCommunity'
import {
  extractBookSeoContent,
  buildBookSeoTitle,
  buildBookSeoDescription,
  buildBookJsonLd,
} from '@/utils/bookSeo'
import { useSeoHead } from '@/composables/useSeoHead'
import { usePptDeckPlayAll } from '@/composables/usePptDeckPlayAll'
import {
  buildBookCommunityStats,
  formatCompactCount,
  formatWordCount,
} from '@/utils/bookCommunityStats'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const comments = ref([])
const communityStats = ref(null)
const pptData = ref(null)
const loading = ref(false)
const loadingComments = ref(false)
const loadingDeck = ref(false)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)
const commentFilter = ref('ALL')
const commentBoardRef = ref(null)

const seo = computed(() => extractBookSeoContent(project.value, pptData.value))

const bookStats = computed(() => {
  if (!project.value) return null
  return buildBookCommunityStats({
    stats: communityStats.value,
    project: project.value,
    seo: seo.value,
    deck: pptData.value,
  })
})

const statsDisplay = computed(() => {
  const s = bookStats.value
  if (!s) return { readers: '—', finished: '0', slides: '—', words: '—' }
  return {
    readers:
      s.readerCount > 0
        ? t('community.stats.readersValue', { count: formatCompactCount(s.readerCount) })
        : '—',
    finished: formatCompactCount(s.finishedReadCount),
    slides:
      s.totalSlides > 0
        ? t('community.stats.slidesValue', { count: s.totalSlides })
        : '—',
    words: s.wordCount != null && s.wordCount > 0 ? formatWordCount(s.wordCount) : '—',
  }
})

const copyrightKindLabel = computed(() => {
  const kind = bookStats.value?.copyrightKind
  if (kind === 'publisher') return t('community.stats.copyrightPublisher')
  if (kind === 'author') return t('community.stats.originalAuthor')
  return t('community.stats.copyrightCommunity')
})

const recommendBars = computed(() => {
  const r = bookStats.value?.recommend
  if (!r || r.score == null) return []
  return [
    { key: 'recommend', label: t('community.recommend.barRecommend'), pct: r.recommendPct },
    { key: 'average', label: t('community.recommend.barAverage'), pct: r.averagePct },
    { key: 'poor', label: t('community.recommend.barPoor'), pct: r.poorPct },
  ]
})

const commentFilterTabs = computed(() => {
  const rec = communityStats.value?.recommend
  const total = rec?.totalReviewCount ?? 0
  const recommend = rec?.recommendCount ?? 0
  const average = rec?.averageCount ?? 0
  const poor = rec?.poorCount ?? 0
  return [
    { id: 'ALL', label: t('community.recommend.filterAll'), count: total },
    { id: 'RECOMMEND', label: t('community.recommend.filterRecommend'), count: recommend },
    { id: 'AVERAGE', label: t('community.recommend.filterAverage'), count: average },
    { id: 'POOR', label: t('community.recommend.filterPoor'), count: poor },
  ]
})

async function onCommentFilterChange(next) {
  if (commentFilter.value === next) return
  commentFilter.value = next
  await reloadComments()
}

async function reloadComments() {
  loadingComments.value = true
  try {
    const list = await projectApi.listComments(projectId.value, commentFilter.value)
    comments.value = list ?? []
  } catch {
    // 筛选失败：回退到全量
    try {
      const list = await projectApi.listComments(projectId.value, 'ALL')
      comments.value = list ?? []
      commentFilter.value = 'ALL'
    } catch {
      /* ignore */
    }
  } finally {
    loadingComments.value = false
  }
}

function scrollToComments() {
  document.getElementById('community-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  commentBoardRef.value?.focusComposer?.()
}

const {
  ttsLoading,
  ttsPlayAllActive,
  canPlayDeckAudio,
  playAllButtonTitle,
  togglePlayAll,
} = usePptDeckPlayAll({
  projectId,
  pptData,
  onLoginRequired: () => {
    dialogOpen.value = true
  },
})

const seoReady = computed(
  () => Boolean(project.value) && (hasSeoBody.value || !loadingDeck.value),
)

const hasSeoBody = computed(
  () =>
    seo.value.summaryPoints.length > 0 ||
    seo.value.takeaways.length > 0 ||
    seo.value.characters.length > 0 ||
    Boolean(seo.value.overview),
)
const pageHeading = computed(() => {
  const title = seo.value.bookTitle || project.value?.name || t('workspace.unnamedProject')
  if (!seo.value.bookTitle) return title
  return seo.value.characters.length
    ? t('community.seo.headingWithCharacters', { title })
    : t('community.seo.heading', { title })
})
const seoImageAlt = computed(() =>
  seo.value.bookTitle ? t('community.seo.heading', { title: seo.value.bookTitle }) : '',
)

useSeoHead(() => {
  if (!project.value) return {}
  const content = seo.value
  const description = buildBookSeoDescription(content)
  const url =
    typeof window !== 'undefined'
      ? window.location.origin + `/explore/project/${projectId.value}`
      : ''
  const image = project.value?.thumbnailUrl || undefined
  return {
    title: buildBookSeoTitle(content),
    description,
    canonical: url,
    ogType: 'article',
    image,
    jsonLd: buildBookJsonLd(content, { url, image, description }),
  }
})

const refreshAuth = async () => {
  logged.value = isLoggedIn()
  if (!logged.value) {
    nickName.value = ''
    return
  }
  try {
    const d = await authApi.getCurrentDetail()
    nickName.value = d?.nickName || d?.email || ''
    avatar.value = d?.avatar || getLocalAvatar()
  } catch {
    /* ignore */
  }
}

function collectDeckUrls(proj, hist) {
  const urls = []
  if (proj?.configFilePath) urls.push(proj.configFilePath)
  const assistantRows = [...hist].reverse().filter((h) => h.role === 'assistant')
  for (const row of assistantRows) {
    for (const url of row.imageUrls ?? []) {
      if (looksLikeDeckJson(url)) urls.push(url)
    }
  }
  return [...new Set(urls)]
}

async function loadPptDeck(id, proj, hist) {
  const urls = collectDeckUrls(proj, hist)
  if (!urls.length) return
  loadingDeck.value = true
  try {
    for (const ppt_data_url of urls) {
      const resolved = await resolvePptDataFromStreamComplete({ projectId: id, ppt_data_url })
      if (resolved?.pptData) {
        pptData.value = resolved.pptData
        return
      }
    }
  } catch {
    /* 无 deck 时降级为缩略图 */
  } finally {
    loadingDeck.value = false
  }
}

const load = async (id) => {
  if (!id) return
  loading.value = true
  loadingComments.value = true
  loadingDeck.value = false
  error.value = null
  project.value = null
  comments.value = []
  communityStats.value = null
  pptData.value = null
  commentFilter.value = 'ALL'
  try {
    const [proj, list, stats, hist] = await Promise.all([
      projectApi.getProject(id),
      projectApi.listComments(id, 'ALL').catch(() => []),
      projectApi.getCommunityStats(id).catch(() => null),
      projectApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    comments.value = list
    communityStats.value = stats
    projectApi.incrementProjectView(id).catch(() => {})
    loadPptDeck(id, proj, hist)
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
    loadingComments.value = false
  }
}

onMounted(() => {
  refreshAuth()
  load(projectId.value)
})

watch(projectId, (id) => load(id))

const openReader = () => {
  if (!projectId.value) return
  gtmOpenReader(projectId.value)
  router.push({ name: 'project-reader', params: { projectId: projectId.value } })
}

const goCreate = () => {
  router.push(logged.value ? '/workspace' : '/')
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(logged.value ? '/workspace' : '/')
}

const goWorkspace = () => router.push('/workspace')
const openLogin = () => { dialogOpen.value = true }
const onLoginSuccess = () => {
  dialogOpen.value = false
  refreshAuth()
}
</script>
