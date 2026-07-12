import { ref, computed, watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { authApi } from "@/api"
import type { NovelGuideSection } from "@/utils/novelGuideSections"
import { buildTtsPagesFromNovelSections } from "@/utils/novelTtsPages"
import { primeMediaPlayback, safeMediaPlay } from "@/utils/mediaPlayback"
import {
  createTtsSequentialPlayer,
  firstTtsPageNumber,
  sliceTtsPagesFrom,
  type TtsItemsMap,
} from "@/utils/ttsStreamPlayback"

const NOVEL_PLAY_ALL_BGM_URL = "/resources/track1.mp3"
const NOVEL_PLAY_ALL_BGM_VOLUME = 0.22
/** Bump when TTS transport or page text assembly changes. */
const NOVEL_TTS_DECK_VERSION = 5

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
  const ttsItemsByPage = ref<TtsItemsMap>({})
  const ttsProgress = ref({ ready: 0, total: 0 })
  const ttsDeckKey = ref("")
  let slideBgmEl: HTMLAudioElement | null = null

  const ttsPlayer = createTtsSequentialPlayer({
    onItemsUpdate: (items) => {
      ttsItemsByPage.value = items
    },
    onLoadingChange: (loading) => {
      ttsLoading.value = loading
    },
    onProgressChange: (progress) => {
      ttsProgress.value = progress
    },
    onPlayingChange: (playing) => {
      ttsPlaying.value = playing
    },
    onPlayAllActiveChange: (active) => {
      ttsPlayAllActive.value = active
    },
    onBeforePlayPage: (page) => {
      syncActiveSection(page)
    },
    onFinished: () => {
      finishPlayAll()
    },
    onError: (message) => {
      stopPlayback()
      ElMessage.error(message || t("agent.pptAudioFailed"))
    },
    onAutoplayBlocked: () => {
      stopPlayback()
      ElMessage.warning(t("agent.pptAudioAutoplayBlocked"))
    },
  })

  const sectionList = computed(() => toValue(options.sections) ?? [])

  const canPlayGuideAudio = computed(
    () =>
      Boolean(String(toValue(options.projectId) || "").trim()) &&
      sectionList.value.length > 0,
  )

  const playAllButtonTitle = computed(() => {
    if (ttsLoading.value && ttsProgress.value.total > 0) {
      return t("agent.pptAudioGeneratingProgress", ttsProgress.value)
    }
    if (ttsLoading.value) return t("agent.pptAudioGenerating")
    if (!canPlayGuideAudio.value) return t("agent.pptAudioNoProject")
    if (!ttsUserId.value) return t("agent.pptAudioLoginRequired")
    if (ttsPlayAllActive.value) return t("agent.pptAudioPlayAllStop")
    return t("agent.pptAudioPlayAll")
  })

  function resetSlideAudioCache() {
    ttsItemsByPage.value = {}
    ttsDeckKey.value = ""
    ttsProgress.value = { ready: 0, total: 0 }
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
      await safeMediaPlay(slideBgmEl)
    } catch {
      stopSlideBgm()
    }
  }

  function finishPlayAll() {
    ttsPlayAllActive.value = false
    stopSlideBgm()
  }

  function stopPlayback() {
    ttsPlayer.stop()
    finishPlayAll()
  }

  function currentTtsDeckKey(): string {
    const sections = sectionList.value
    return [
      String(NOVEL_TTS_DECK_VERSION),
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

  function syncActiveSection(page: number) {
    const index = page - 1
    if (index >= 0 && index < sectionList.value.length) {
      options.onActiveSectionIndexChange?.(index)
    }
  }

  function isRangeFullyCached(
    pages: ReturnType<typeof buildTtsPagesFromNovelSections>,
  ): boolean {
    const cached = ttsItemsByPage.value
    return pages.every((page) => {
      if (typeof page === "string") return Boolean(cached[1])
      const index = Number(page.index)
      return Number.isFinite(index) ? Boolean(cached[index]) : true
    })
  }

  async function playAllGuideAudio(fromPage?: number) {
    const projectId = String(toValue(options.projectId) || "").trim()
    if (!projectId) throw new Error(t("agent.pptAudioNoProject"))

    const sections = sectionList.value
    if (!sections.length) throw new Error(t("agent.pptAudioNoSlide"))

    const userId = await resolveTtsUserId()
    if (!userId) throw new Error(t("agent.pptAudioLoginRequired"))

    const allPages = buildTtsPagesFromNovelSections(sections)
    const activeIndex = Math.max(0, toValue(options.activeSectionIndex))
    const startPage = fromPage ?? activeIndex + 1
    const pages = sliceTtsPagesFrom(allPages, startPage)
    if (!pages.length) {
      ElMessage.warning(t("agent.pptAudioNoSlide"))
      return
    }

    ttsDeckKey.value = currentTtsDeckKey()
    ttsPlayAllActive.value = true
    await startSlideBgm()

    if (isRangeFullyCached(pages)) {
      await ttsPlayer.playFromCache(startPage, ttsItemsByPage.value)
      return
    }

    await ttsPlayer.startStream({
      projectId,
      userId,
      pages,
      priorityPage: startPage,
    })
  }

  async function togglePlayAll() {
    if (ttsPlayAllActive.value) {
      stopPlayback()
      return
    }
    if (ttsLoading.value) return
    if (ttsPlaying.value) stopPlayback()
    primeMediaPlayback()
    try {
      await playAllGuideAudio()
    } catch (error) {
      stopPlayback()
      ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"))
    }
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
