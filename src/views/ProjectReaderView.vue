<template>
  <div class="flex h-screen flex-col overflow-hidden bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />

    <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-20 sm:px-6">
      <div class="mx-auto w-full max-w-[min(100%,96rem)]">
        <div class="mb-4 flex items-center justify-between gap-4">
          <button
            class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            @click="goBack"
          >
            <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
          </button>
          <button
            v-if="project"
            type="button"
            class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="forking"
            @click="onFork"
          >
            <Loader2 v-if="forking" class="h-4 w-4 animate-spin" />
            <GitFork v-else class="h-4 w-4" />
            {{ forking ? t('community.forking') : t('community.forkToWorkspace') }}
          </button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

        <template v-if="project">
          <div class="mb-4">
            <h1 class="text-2xl font-bold text-foreground">
              {{ project.name || project.title || t('workspace.unnamedProject') }}
            </h1>
            <p v-if="project.description" class="mt-1 text-sm text-muted-foreground">{{ project.description }}</p>
          </div>

          <div v-if="pptData">
            <p class="mb-2 text-xs text-muted-foreground">{{ t('community.interactiveHint') }}</p>
            <PptViewer
              :ppt-data="pptData"
              :project-id="projectId"
              :chat-history="displayChatHistory"
              @update:ppt-data="(d) => (pptData = d)"
              @related-search-recorded="(e) => (sessionEntries = e)"
            />
          </div>
          <div
            v-else-if="project.thumbnailUrl"
            class="overflow-hidden rounded-xl border border-border"
          >
            <img
              :src="project.thumbnailUrl"
              :alt="project.name || project.title || ''"
              class="w-full object-cover"
              loading="lazy"
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
defineOptions({ name: 'ProjectReaderView' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Loader2, GitFork } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import PptViewer from '@/components/editor/chat/PptViewer.vue'
import { authApi, projectApi, isLoggedIn, getLocalAvatar } from '@/api'
import { resolvePptDataFromStreamComplete } from '@/utils/pptCompletePayload'
import { looksLikeDeckJson } from '@/utils/projectCommunity'
import { buildPptChatHistoryDisplay } from '@/utils/pptChatHistoryDisplay'
import { gtmForkProject } from '@/composables/useGtmDataLayer'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const history = ref([])
const pptData = ref(null)
const loading = ref(false)
const loadingDeck = ref(false)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)
const forking = ref(false)
const sessionEntries = ref([])
const pendingForkAfterLogin = ref(false)

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
  sessionEntries.value = []
  try {
    const [proj, hist] = await Promise.all([
      projectApi.getProject(id),
      projectApi.getProjectConversationHistory(id).catch(() => []),
    ])
    project.value = proj
    history.value = hist
    projectApi.incrementProjectView(id).catch(() => {})
    await loadPptDeck(id, proj, hist)
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
  }
}

function buildExtraConversations() {
  const out = []
  for (const entry of sessionEntries.value) {
    const term = String(entry?.term || '').trim()
    const content = String(entry?.content || '').trim()
    if (!term || !content) continue
    out.push({
      role: 'user',
      content: t('workspace.chatHistoryPanel.relatedAsk', { term }),
      intent: 'ppt_related_search',
      term,
    })
    out.push({ role: 'assistant', content, intent: 'ppt_related_search', term })
  }
  return out
}

const onFork = async () => {
  if (forking.value) return
  if (!logged.value) {
    pendingForkAfterLogin.value = true
    dialogOpen.value = true
    return
  }
  const id = projectId.value
  if (!id) return
  forking.value = true
  try {
    const created = await projectApi.forkProject(id, {
      extraConversations: buildExtraConversations(),
    })
    const newId = String(created?.id || '').trim()
    gtmForkProject(id, newId || undefined)
    ElMessage.success(t('community.forkSuccess'))
    router.push(newId ? { name: 'workspace', query: { project: newId } } : { name: 'workspace' })
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    forking.value = false
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
  if (pendingForkAfterLogin.value) {
    pendingForkAfterLogin.value = false
    if (logged.value) onFork()
  }
}
</script>
