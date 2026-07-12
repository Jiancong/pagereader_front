import { ref, computed, watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { authApi } from "@/api";
import type { PptData } from "@/components/editor/chat/ppt/types";
import { normalizePptData } from "@/components/editor/chat/ppt/shared/normalizePptSlide";
import { buildTtsPagesFromPptData } from "@/utils/pptTtsPages";
import { primeMediaPlayback, safeMediaPlay } from "@/utils/mediaPlayback";
import {
  createTtsSequentialPlayer,
  findNextPlayableTtsPage,
  firstTtsPageNumber,
  type TtsItemsMap,
} from "@/utils/ttsStreamPlayback";

const PPT_PLAY_ALL_BGM_URL = "/resources/track1.mp3";
const PPT_PLAY_ALL_BGM_VOLUME = 0.22;

export function usePptDeckPlayAll(options: {
  projectId: MaybeRefOrGetter<string>;
  pptData: MaybeRefOrGetter<PptData | null | undefined>;
  onLoginRequired?: () => void;
}) {
  const { t } = useI18n();

  const ttsUserId = ref<number | null>(null);
  const ttsLoading = ref(false);
  const ttsPlaying = ref(false);
  const ttsPlayAllActive = ref(false);
  const ttsItemsByPage = ref<TtsItemsMap>({});
  const ttsProgress = ref({ ready: 0, total: 0 });
  const ttsDeckKey = ref("");
  let slideBgmEl: HTMLAudioElement | null = null;

  const ttsPlayer = createTtsSequentialPlayer({
    onItemsUpdate: (items) => {
      ttsItemsByPage.value = items;
    },
    onLoadingChange: (loading) => {
      ttsLoading.value = loading;
    },
    onProgressChange: (progress) => {
      ttsProgress.value = progress;
    },
    onPlayingChange: (playing) => {
      ttsPlaying.value = playing;
    },
    onPlayAllActiveChange: (active) => {
      ttsPlayAllActive.value = active;
    },
    onFinished: () => {
      finishPlayAll();
    },
    onError: (message) => {
      stopPlayback();
      ElMessage.error(message || t("agent.pptAudioFailed"));
    },
    onAutoplayBlocked: () => {
      stopPlayback();
      ElMessage.warning(t("agent.pptAudioAutoplayBlocked"));
    },
  });

  const normalizedDeck = computed(() => {
    const raw = toValue(options.pptData);
    if (!raw || !Array.isArray(raw.slides) || !raw.slides.length) return null;
    return normalizePptData(raw as PptData);
  });

  const canPlayDeckAudio = computed(
    () =>
      Boolean(String(toValue(options.projectId) || "").trim()) &&
      Boolean(normalizedDeck.value?.slides.length),
  );

  const playAllButtonTitle = computed(() => {
    if (ttsLoading.value && ttsProgress.value.total > 0) {
      return t("agent.pptAudioGeneratingProgress", ttsProgress.value);
    }
    if (ttsLoading.value) return t("agent.pptAudioGenerating");
    if (!canPlayDeckAudio.value) return t("agent.pptAudioNoProject");
    if (!ttsUserId.value) return t("agent.pptAudioLoginRequired");
    if (ttsPlayAllActive.value) return t("agent.pptAudioPlayAllStop");
    return t("agent.pptAudioPlayAll");
  });

  function resetSlideAudioCache() {
    ttsItemsByPage.value = {};
    ttsDeckKey.value = "";
    ttsProgress.value = { ready: 0, total: 0 };
  }

  function stopSlideBgm() {
    if (slideBgmEl) {
      slideBgmEl.pause();
      slideBgmEl.onerror = null;
      slideBgmEl = null;
    }
  }

  async function startSlideBgm() {
    stopSlideBgm();
    slideBgmEl = new Audio(PPT_PLAY_ALL_BGM_URL);
    slideBgmEl.loop = true;
    slideBgmEl.volume = PPT_PLAY_ALL_BGM_VOLUME;
    slideBgmEl.onerror = () => {
      stopSlideBgm();
    };
    try {
      await safeMediaPlay(slideBgmEl);
    } catch {
      stopSlideBgm();
    }
  }

  function finishPlayAll() {
    ttsPlayAllActive.value = false;
    stopSlideBgm();
  }

  function stopPlayback() {
    ttsPlayer.stop();
    finishPlayAll();
  }

  function currentTtsDeckKey(): string {
    const deck = normalizedDeck.value;
    return [
      String(toValue(options.projectId) || "").trim(),
      deck?.total_slides ?? deck?.slides.length ?? 0,
      deck?.title ?? "",
    ].join("|");
  }

  async function resolveTtsUserId(): Promise<number | null> {
    if (ttsUserId.value != null) return ttsUserId.value;
    try {
      const detail = await authApi.getCurrentDetail();
      const id = detail?.id != null ? Number(detail.id) : NaN;
      ttsUserId.value = Number.isFinite(id) ? id : null;
    } catch {
      ttsUserId.value = null;
    }
    return ttsUserId.value;
  }

  function isDeckFullyCached(pages: ReturnType<typeof buildTtsPagesFromPptData>): boolean {
    const cached = ttsItemsByPage.value;
    return pages.every((page) => {
      if (typeof page === "string") return Boolean(cached[1]);
      const index = Number(page.index);
      return Number.isFinite(index) ? Boolean(cached[index]) : true;
    });
  }

  async function playAllDeckAudio() {
    const projectId = String(toValue(options.projectId) || "").trim();
    if (!projectId) throw new Error(t("agent.pptAudioNoProject"));

    const deck = normalizedDeck.value;
    if (!deck?.slides.length) throw new Error(t("agent.pptAudioNoSlide"));

    const userId = await resolveTtsUserId();
    if (!userId) {
      options.onLoginRequired?.();
      throw new Error(t("agent.pptAudioLoginRequired"));
    }

    const pages = buildTtsPagesFromPptData(deck);
    const startPage = firstTtsPageNumber(pages);
    if (!pages.length) {
      ElMessage.warning(t("agent.pptAudioNoSlide"));
      return;
    }

    ttsDeckKey.value = currentTtsDeckKey();
    ttsPlayAllActive.value = true;
    await startSlideBgm();

    if (isDeckFullyCached(pages)) {
      await ttsPlayer.playFromCache(startPage, ttsItemsByPage.value);
      return;
    }

    await ttsPlayer.startStream({
      projectId,
      userId,
      pages,
      priorityPage: startPage,
    });
  }

  async function togglePlayAll() {
    if (ttsPlayAllActive.value) {
      stopPlayback();
      return;
    }
    if (ttsLoading.value) return;
    if (ttsPlaying.value) stopPlayback();
    primeMediaPlayback();
    try {
      await playAllDeckAudio();
    } catch (error) {
      stopPlayback();
      ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"));
    }
  }

  void resolveTtsUserId();

  watch(
    () => [toValue(options.projectId), currentTtsDeckKey()] as const,
    () => {
      resetSlideAudioCache();
      stopPlayback();
    },
  );

  onBeforeUnmount(() => {
    stopPlayback();
  });

  return {
    ttsLoading,
    ttsPlayAllActive,
    canPlayDeckAudio,
    playAllButtonTitle,
    togglePlayAll,
    stopPlayback,
  };
}
