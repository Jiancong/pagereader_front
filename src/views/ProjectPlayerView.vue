<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />

    <main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-6 pt-[4.5rem] sm:px-6 sm:pb-10 sm:pt-20">
      <div class="mx-auto w-full max-w-[min(100%,96rem)]">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            class="inline-flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            @click="goBack"
          >
            <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
          </button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

        <template v-if="project">
          <div class="mb-4">
            <h1 class="break-words text-xl font-bold text-foreground sm:text-2xl">
              {{ displayTitle }}
            </h1>
            <p v-if="project.description" class="mt-1 break-words text-sm text-muted-foreground">
              {{ project.description }}
            </p>
          </div>

          <div v-if="novelResult" class="mb-2 min-w-0">
            <WorkspaceNovelResult
              :result="novelResult"
              :project-id="projectId"
              :can-upload-cover="false"
              auto-play
              @close="goBack"
              @cover-uploaded="onCoverUploaded"
            />
          </div>
          <div v-else-if="pptData">
            <PptViewer
              :ppt-data="pptData"
              :project-id="projectId"
              :markdown="projectMarkdown"
              :chat-history="displayChatHistory"
              auto-play
              @update:ppt-data="(d) => (pptData = d)"
              @cover-uploaded="onCoverUploaded"
            />
          </div>
          <p
            v-else-if="loadingDeck"
            class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
          >
            <Loader2 class="h-5 w-5 animate-spin" /> {{ t('workspace.loadingPpt') }}
          </p>
          <p
            v-else
            class="rounded-xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground"
          >
            {{ t('workspace.noPreviewImages') }}
          </p>
        </template>
      </div>
    </main>

    <AuthDialog
      :open="dialogOpen"
      default-mode="login"
      @close="dialogOpen = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'ProjectPlayerView' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import PptViewer from '@/components/editor/chat/PptViewer.vue'
import WorkspaceNovelResult from '@/components/workspace/WorkspaceNovelResult.vue'
import { authApi, projectApi, isLoggedIn, getLocalAvatar } from '@/api'
import { resolvePptDataFromStreamComplete } from '@/utils/pptCompletePayload'
import { resolveNovelFromHistory } from '@/utils/novelStream'
import { pickMarkdownFromHistory, pickMarkdownFromPayload } from '@/utils/pptMarkdownSource'
import { looksLikeDeckJson } from '@/utils/projectCommunity'
import { buildPptChatHistoryDisplay } from '@/utils/pptChatHistoryDisplay'
import {
  pickGeneratedDeckTitleFromContent,
  pickPptDataTitle,
  pickProjectFallbackTitle,
} from '@/utils/projectTitle'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const history = ref([])
const pptData = ref(null)
const novelResult = ref(null)
const deckMarkdown = ref('')
const loading = ref(false)
const loadingDeck = ref(false)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)

const generatedDeckTitle = computed(() => {
  const deckTitle = pickPptDataTitle(pptData.value)
  if (deckTitle) return deckTitle

  const assistantRows = [...history.value].reverse().filter((h) => h.role === 'assistant')
  for (const row of assistantRows) {
    const title = pickGeneratedDeckTitleFromContent(row.content)
    if (title) return title
  }
  return ''
})

const displayTitle = computed(
  () =>
    novelResult.value?.title ||
    generatedDeckTitle.value ||
    pickProjectFallbackTitle(project.value) ||
    t('workspace.unnamedProject'),
)

const displayChatHistory = computed(() =>
  buildPptChatHistoryDisplay(history.value, pptData.value, {
    deckReady: (title, slides) =>
      slides > 0
        ? t('workspace.chatHistoryPanel.deckReady', { title, slides })
        : t('workspace.chatHistoryPanel.deckReadyNoSlides', { title }),
    relatedAsk: (term) => t('workspace.chatHistoryPanel.relatedAsk', { term }),
    noAnswer: t('workspace.chatHistoryPanel.noAnswer'),
  }),
)

const projectMarkdown = computed(() =>
  deckMarkdown.value ||
  pickMarkdownFromPayload(pptData.value) ||
  pickMarkdownFromPayload(project.value) ||
  pickMarkdownFromHistory(history.value) ||
  '',
)

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

async function loadNovelGuide(id, hist, proj) {
  const resolved = await resolveNovelFromHistory(hist, proj)
  if (resolved?.markdown) {
    novelResult.value = resolved
    return true
  }
  return false
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
        deckMarkdown.value = resolved.markdown || ''
        return
      }
    }
  } catch {
    /* 无 deck 时降级为缩略图 */
  } finally {
    loadingDeck.value = false
  }
}

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

const load = async (id) => {
  if (!id) return
  loading.value = true
  loadingDeck.value = false
  error.value = null
  project.value = null
  history.value = []
  pptData.value = null
  novelResult.value = null
  deckMarkdown.value = ''
  try {
    const [proj, hist] = await Promise.all([
      projectApi.getProject(id),
      projectApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    history.value = hist
    const loadedNovel = await loadNovelGuide(id, hist, proj)
    if (!loadedNovel) {
      await loadPptDeck(id, proj, hist)
    }
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshAuth()
  load(projectId.value)
})

watch(projectId, (id) => load(id))

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(logged.value ? '/workspace' : '/')
}

const goWorkspace = () => router.push('/workspace')
const openLogin = () => { dialogOpen.value = true }
const onLoginSuccess = async () => {
  dialogOpen.value = false
  await refreshAuth()
}

function onCoverUploaded(payload) {
  const url = String(payload?.thumbnailUrl || payload?.coverImageUrl || '').trim()
  if (!url || !project.value) return
  project.value = { ...project.value, thumbnailUrl: url }
}
</script>
