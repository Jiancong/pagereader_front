import { ref, computed, watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { authApi } from "@/api"
import { generatePageTts } from "@/api/agent"
import type { NovelGuideSection } from "@/utils/novelGuideSections"
import { buildTtsPagesFromNovelSections } from "@/utils/novelTtsPages"

const NOVEL_PLAY_ALL_BGM_URL = "/resources/track1.mp3"
const NOVEL_PLAY_ALL_BGM_VOLUME = 0.22

function findNextPlayablePage(fromPage: number, items: Record<number, string>): number {
  const pages = Object.keys(items)
    .map((key) => Number(key))
    .filter((page) => Number.isFinite(page) && page > fromPage)
    .sort((a, b) => a - b)
  return pages[0] ?? -1
}

export function useNovelGuidePlayAll(options: {
  projectId: MaybeRefOrGetter<string>
  sections: MaybeRefOrGetter<NovelGuideSection[]>
  activeSectionIndex: MaybeRefOrGetter<number>
  onActiveSectionIndexChange?: (index: number) => void
}) {
  const { t } = useI18n()

  const ttsUserId = ref<number | null>(null)
  const ttsLoading = ref(false)
  const ttsPlaying = ref(false)
  const ttsPlayAllActive = ref(false)
  const ttsItemsByPage = ref<Record<number, string>>({})
  const ttsDeckKey = ref("")
  let slideAudioEl: HTMLAudioElement | null = null
  let slideBgmEl: HTMLAudioElement | null = null

  const sectionList = computed(() => toValue(options.sections) ?? [])

  const canPlayGuideAudio = computed(
    () =>
      Boolean(String(toValue(options.projectId) || "").trim()) &&
      sectionList.value.length > 0,
  )

  const playAllButtonTitle = computed(() => {
    if (ttsLoading.value) return t("agent.pptAudioGenerating")
    if (!canPlayGuideAudio.value) return t("agent.pptAudioNoProject")
    if (!ttsUserId.value) return t("agent.pptAudioLoginRequired")
    if (ttsPlayAllActive.value) return t("agent.pptAudioPlayAllStop")
    return t("agent.pptAudioPlayAll")
  })

  function resetSlideAudioCache() {
    ttsItemsByPage.value = {}
    ttsDeckKey.value = ""
  }

  function releaseSlideAudioEl() {
    if (slideAudioEl) {
      slideAudioEl.pause()
      slideAudioEl.onended = null
      slideAudioEl.onerror = null
      slideAudioEl = null
    }
    ttsPlaying.value = false
  }

  function stopSlideBgm() {
    if (slideBgmEl) {
      slideBgmEl.pause()
      slideBgmEl.onerror = null
      slideBgmEl = null
    }
  }

  async function startSlideBgm() {
    stopSlideBgm()
    slideBgmEl = new Audio(NOVEL_PLAY_ALL_BGM_URL)
    slideBgmEl.loop = true
    slideBgmEl.volume = NOVEL_PLAY_ALL_BGM_VOLUME
    slideBgmEl.onerror = () => {
      stopSlideBgm()
    }
    try {
      await slideBgmEl.play()
    } catch {
      stopSlideBgm()
    }
  }

  function finishPlayAll() {
    ttsPlayAllActive.value = false
    stopSlideBgm()
  }

  function stopPlayback() {
    releaseSlideAudioEl()
    finishPlayAll()
  }

  function currentTtsDeckKey(): string {
    const sections = sectionList.value
    return [
      String(toValue(options.projectId) || "").trim(),
      sections.length,
      sections.map((section) => section.id).join("|"),
    ].join("::")
  }

  async function resolveTtsUserId(): Promise<number | null> {
    if (ttsUserId.value != null) return ttsUserId.value
    try {
      const detail = await authApi.getCurrentDetail()
      const id = detail?.id != null ? Number(detail.id) : NaN
      ttsUserId.value = Number.isFinite(id) ? id : null
    } catch {
      ttsUserId.value = null
    }
    return ttsUserId.value
  }

  async function ensureSlideAudioItems(): Promise<Record<number, string>> {
    const projectId = String(toValue(options.projectId) || "").trim()
    if (!projectId) throw new Error(t("agent.pptAudioNoProject"))

    const sections = sectionList.value
    if (!sections.length) throw new Error(t("agent.pptAudioNoSlide"))

    const userId = await resolveTtsUserId()
    if (!userId) throw new Error(t("agent.pptAudioLoginRequired"))

    const deckKey = currentTtsDeckKey()
    if (ttsDeckKey.value !== deckKey) {
      resetSlideAudioCache()
      ttsDeckKey.value = deckKey
    }

    if (Object.keys(ttsItemsByPage.value).length > 0) {
      return ttsItemsByPage.value
    }

    ttsLoading.value = true
    try {
      const result = await generatePageTts({
        projectId,
        userId,
        pages: buildTtsPagesFromNovelSections(sections),
      })
      const playable = (result?.items ?? []).filter((item) => item.url)
      if (!playable.length) {
        throw new Error(t("agent.pptAudioNoSlide"))
      }

      const map: Record<number, string> = {}
      for (const item of playable) {
        if (item.url) map[item.page] = item.url
      }
      ttsItemsByPage.value = map
      return map
    } finally {
      ttsLoading.value = false
    }
  }

  function syncActiveSection(page: number) {
    const index = page - 1
    if (index >= 0 && index < sectionList.value.length) {
      options.onActiveSectionIndexChange?.(index)
    }
  }

  async function playPageAudio(page: number, items: Record<number, string>) {
    const url = items[page]
    if (!url) {
      const nextPage = findNextPlayablePage(page, items)
      if (nextPage > 0) {
        syncActiveSection(nextPage)
        await playPageAudio(nextPage, items)
      } else {
        finishPlayAll()
      }
      return
    }

    syncActiveSection(page)
    releaseSlideAudioEl()
    ttsPlayAllActive.value = true

    slideAudioEl = new Audio(url)
    slideAudioEl.onended = () => {
      releaseSlideAudioEl()
      if (!ttsPlayAllActive.value) return

      const nextPage = findNextPlayablePage(page, items)
      if (nextPage > 0) {
        void playPageAudio(nextPage, items)
        return
      }
      finishPlayAll()
    }
    slideAudioEl.onerror = () => {
      stopPlayback()
      ElMessage.error(t("agent.pptAudioFailed"))
    }
    await slideAudioEl.play()
    ttsPlaying.value = true
  }

  async function playAllGuideAudio(fromPage?: number) {
    try {
      const items = await ensureSlideAudioItems()
      let startPage = fromPage ?? toValue(options.activeSectionIndex) + 1
      if (!items[startPage]) {
        const nextPage = findNextPlayablePage(startPage - 1, items)
        if (nextPage < 0) {
          ElMessage.warning(t("agent.pptAudioNoSlide"))
          return
        }
        startPage = nextPage
      }
      ttsPlayAllActive.value = true
      await startSlideBgm()
      await playPageAudio(startPage, items)
    } catch (error) {
      stopPlayback()
      ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"))
    }
  }

  async function togglePlayAll() {
    if (ttsPlayAllActive.value) {
      stopPlayback()
      return
    }
    if (ttsPlaying.value) stopPlayback()
    await playAllGuideAudio()
  }

  void resolveTtsUserId()

  watch(
    () => [toValue(options.projectId), currentTtsDeckKey()] as const,
    () => {
      resetSlideAudioCache()
      stopPlayback()
    },
  )

  onBeforeUnmount(() => {
    stopPlayback()
  })

  return {
    ttsLoading,
    ttsPlayAllActive,
    canPlayGuideAudio,
    playAllButtonTitle,
    togglePlayAll,
    stopPlayback,
  }
}
