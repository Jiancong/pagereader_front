<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main class="mx-auto max-w-3xl px-4 pb-16 pt-20 sm:px-6">
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
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-foreground sm:text-3xl">{{ pageHeading }}</h1>
            <p v-if="seo.author" class="mt-1 text-sm text-muted-foreground">
              {{ t('community.bookAuthor', { name: seo.author }) }}
            </p>
            <p v-if="seo.overview" class="mt-3 text-base leading-relaxed text-muted-foreground">
              {{ seo.overview }}
            </p>
          </div>
          <button
            type="button"
            class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            @click="openReader"
          >
            <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
          </button>
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

        <p
          v-if="loadingDeck && !hasSeoBody"
          class="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
        >
          <Loader2 class="h-5 w-5 animate-spin" /> {{ t('workspace.loadingPpt') }}
        </p>

        <!-- Summary：承接 "{book} summary / book summary" -->
        <section v-if="seo.summaryPoints.length" class="mt-10">
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
        <section v-if="seo.takeaways.length" class="mt-10">
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
        <section v-if="seo.characters.length" class="mt-10">
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

        <ProjectCommentBoard
          class="mt-6"
          :project-id="projectId"
          :comments="comments"
          :is-logged-in="logged"
          :loading="loadingComments"
          @update:comments="(c) => (comments = c)"
          @login="openLogin"
        />
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
import { ArrowLeft, Loader2, BookOpen, Sparkles } from 'lucide-vue-next'
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

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const comments = ref([])
const pptData = ref(null)
const loading = ref(false)
const loadingComments = ref(false)
const loadingDeck = ref(false)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)

const seo = computed(() => extractBookSeoContent(project.value, pptData.value))
const hasSeoBody = computed(
  () =>
    seo.value.summaryPoints.length > 0 ||
    seo.value.takeaways.length > 0 ||
    seo.value.characters.length > 0,
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
  pptData.value = null
  try {
    const [proj, list, hist] = await Promise.all([
      projectApi.getProject(id),
      projectApi.listComments(id).catch(() => []),
      projectApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    comments.value = list
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
