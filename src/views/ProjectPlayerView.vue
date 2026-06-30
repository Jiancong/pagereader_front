<template>
  <div class="player-shell">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />

    <main class="player-main">
      <button
        class="player-back"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
      </button>

      <div v-if="loading" class="player-status">
        <Loader2 class="h-7 w-7 animate-spin" />
      </div>
      <div v-else-if="error" class="player-error">{{ error }}</div>

      <div v-else-if="!ready" class="player-status">
        <p class="player-status-text">{{ statusText }}</p>
      </div>

      <div v-else class="player-card">
        <p class="player-badge">{{ t('workspace.novelResultBadge') }}</p>
        <h1 class="player-title">{{ displayTitle }}</h1>
        <p v-if="statusText" class="player-status-text">{{ statusText }}</p>

        <button
          type="button"
          class="player-play-btn"
          :class="{ 'player-play-btn--active': ttsPlayAllActive }"
          :disabled="ttsLoading || !canPlay"
          :aria-label="buttonTitle"
          @click="onToggle"
        >
          <Loader2 v-if="ttsLoading" class="h-10 w-10 animate-spin" />
          <svg
            v-else-if="ttsPlayAllActive"
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
          <svg
            v-else
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
          </svg>
        </button>

        <p class="player-hint">{{ buttonTitle }}</p>

        <button v-if="ttsPlayAllActive" type="button" class="player-stop-link" @click="onToggle">
          {{ t('agent.pptAudioPlayAllStop') }}
        </button>
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
import { authApi, projectApi, isLoggedIn, getLocalAvatar } from '@/api'
import { resolvePptDataFromStreamComplete } from '@/utils/pptCompletePayload'
import { resolveNovelFromHistory } from '@/utils/novelStream'
import { pickMarkdownFromHistory, pickMarkdownFromPayload } from '@/utils/pptMarkdownSource'
import { looksLikeDeckJson } from '@/utils/projectCommunity'
import { buildNovelGuideOutline } from '@/utils/novelGuideSections'
import {
  pickGeneratedDeckTitleFromContent,
  pickPptDataTitle,
  pickProjectFallbackTitle,
} from '@/utils/projectTitle'
import { useNovelGuidePlayAll } from '@/composables/useNovelGuidePlayAll'
import { usePptDeckPlayAll } from '@/composables/usePptDeckPlayAll'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const history = ref([])
const pptData = ref(null)
const novelResult = ref(null)
const deckMarkdown = ref('')
const loading = ref(true)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)
const autoStarted = ref(false)

const projectKind = computed(() => {
  if (novelResult.value?.markdown) return 'novel'
  if (pptData.value) return 'ppt'
  return null
})

const ready = computed(() => Boolean(projectKind.value))

const novelOutline = computed(() =>
  novelResult.value
    ? buildNovelGuideOutline({
        markdown: novelResult.value.markdown,
        novelNodes: novelResult.value.novelNodes,
        title: novelResult.value.title,
      })
    : { sections: [] },
)

const novelPlay = useNovelGuidePlayAll({
  projectId: () => projectId.value,
  sections: () => novelOutline.value.sections,
  activeSectionIndex: () => 0,
})

const pptPlay = usePptDeckPlayAll({
  projectId: () => projectId.value,
  pptData: () => pptData.value,
  onLoginRequired: () => { dialogOpen.value = true },
})

const ttsLoading = computed(() =>
  projectKind.value === 'novel' ? novelPlay.ttsLoading.value : pptPlay.ttsLoading.value,
)
const ttsPlayAllActive = computed(() =>
  projectKind.value === 'novel' ? novelPlay.ttsPlayAllActive.value : pptPlay.ttsPlayAllActive.value,
)
const canPlay = computed(() =>
  projectKind.value === 'novel' ? novelPlay.canPlayGuideAudio.value : pptPlay.canPlayDeckAudio.value,
)
const buttonTitle = computed(() =>
  projectKind.value === 'novel' ? novelPlay.playAllButtonTitle.value : pptPlay.playAllButtonTitle.value,
)

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

const statusText = computed(() => {
  if (loading.value) return t('workspace.loadingPpt')
  if (ttsLoading.value) return t('agent.pptAudioGenerating')
  if (!logged.value) return t('agent.pptAudioLoginRequired')
  return ''
})

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
  for (const ppt_data_url of urls) {
    const resolved = await resolvePptDataFromStreamComplete({ projectId: id, ppt_data_url })
    if (resolved?.pptData) {
      pptData.value = resolved.pptData
      deckMarkdown.value = resolved.markdown || ''
      return
    }
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
  error.value = null
  project.value = null
  history.value = []
  pptData.value = null
  novelResult.value = null
  deckMarkdown.value = ''
  autoStarted.value = false
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

function onToggle() {
  if (projectKind.value === 'novel') return novelPlay.togglePlayAll()
  return pptPlay.togglePlayAll()
}

// Auto-start once content is ready and (preferably) logged in.
watch(
  () => [ready.value, ttsLoading.value, autoStarted.value],
  (next) => {
    const [isReady, isLoading, started] = next
    if (!isReady || started) return
    autoStarted.value = true
    void onToggle()
  },
)

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
</script>

<style scoped>
.player-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.12), transparent 60%),
    var(--background, #0f1419);
  color: var(--foreground, #e7e9ea);
}

.player-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 1.25rem 3rem;
  gap: 1.5rem;
}

.player-back {
  position: absolute;
  top: 5rem;
  left: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: rgba(231, 233, 234, 0.7);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}
.player-back:hover { color: #fff; }

.player-status {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(231, 233, 234, 0.7);
}

.player-status-text {
  font-size: 0.95rem;
  color: rgba(231, 233, 234, 0.65);
  text-align: center;
  margin: 0;
}

.player-error {
  max-width: 28rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  font-size: 0.875rem;
  text-align: center;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  text-align: center;
  max-width: 32rem;
}

.player-badge {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a5b4fc;
  margin: 0;
}

.player-title {
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 700;
  line-height: 1.25;
  color: #fff;
  margin: 0;
  word-break: break-word;
}

.player-play-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  margin-top: 0.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(129, 140, 248, 0.5);
  background: rgba(99, 102, 241, 0.18);
  color: #e0e7ff;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 10px 40px rgba(79, 70, 229, 0.35);
}
.player-play-btn:hover:not(:disabled),
.player-play-btn:focus-visible:not(:disabled) {
  background: rgba(99, 102, 241, 0.32);
  border-color: rgba(165, 180, 252, 0.85);
  color: #fff;
  transform: translateY(-1px);
}
.player-play-btn--active {
  background: rgba(126, 210, 164, 0.18);
  border-color: rgba(126, 210, 164, 0.6);
  color: #d8f5e4;
  box-shadow: 0 10px 40px rgba(52, 211, 153, 0.3);
}
.player-play-btn--active:hover:not(:disabled),
.player-play-btn--active:focus-visible:not(:disabled) {
  background: rgba(126, 210, 164, 0.32);
  border-color: rgba(158, 230, 188, 0.85);
  color: #fff;
}
.player-play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.player-hint {
  font-size: 0.9rem;
  color: rgba(231, 233, 234, 0.7);
  margin: 0;
}

.player-stop-link {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: rgba(248, 113, 113, 0.85);
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.player-stop-link:hover { color: #f87171; }
</style>
