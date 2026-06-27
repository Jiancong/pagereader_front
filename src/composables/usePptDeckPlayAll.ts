import { ref, computed, watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { authApi } from "@/api";
import { generatePageTts } from "@/api/agent";
import type { PptData } from "@/components/editor/chat/ppt/types";
import { normalizePptData } from "@/components/editor/chat/ppt/shared/normalizePptSlide";
import { buildTtsPagesFromPptData } from "@/utils/pptTtsPages";

const PPT_PLAY_ALL_BGM_URL = "/resources/track1.mp3";
const PPT_PLAY_ALL_BGM_VOLUME = 0.22;

function findNextPlayablePage(fromPage: number, items: Record<number, string>): number {
  const pages = Object.keys(items)
    .map((key) => Number(key))
    .filter((page) => Number.isFinite(page) && page > fromPage)
    .sort((a, b) => a - b);
  return pages[0] ?? -1;
}

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
  const ttsItemsByPage = ref<Record<number, string>>({});
  const ttsDeckKey = ref("");
  let slideAudioEl: HTMLAudioElement | null = null;
  let slideBgmEl: HTMLAudioElement | null = null;

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
    if (ttsLoading.value) return t("agent.pptAudioGenerating");
    if (!canPlayDeckAudio.value) return t("agent.pptAudioNoProject");
    if (!ttsUserId.value) return t("agent.pptAudioLoginRequired");
    if (ttsPlayAllActive.value) return t("agent.pptAudioPlayAllStop");
    return t("agent.pptAudioPlayAll");
  });

  function resetSlideAudioCache() {
    ttsItemsByPage.value = {};
    ttsDeckKey.value = "";
  }

  function releaseSlideAudioEl() {
    if (slideAudioEl) {
      slideAudioEl.pause();
      slideAudioEl.onended = null;
      slideAudioEl.onerror = null;
      slideAudioEl = null;
    }
    ttsPlaying.value = false;
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
      await slideBgmEl.play();
    } catch {
      stopSlideBgm();
    }
  }

  function finishPlayAll() {
    ttsPlayAllActive.value = false;
    stopSlideBgm();
  }

  function stopPlayback() {
    releaseSlideAudioEl();
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

  async function ensureSlideAudioItems(): Promise<Record<number, string>> {
    const projectId = String(toValue(options.projectId) || "").trim();
    if (!projectId) throw new Error(t("agent.pptAudioNoProject"));

    const deck = normalizedDeck.value;
    if (!deck?.slides.length) throw new Error(t("agent.pptAudioNoSlide"));

    const userId = await resolveTtsUserId();
    if (!userId) {
      options.onLoginRequired?.();
      throw new Error(t("agent.pptAudioLoginRequired"));
    }

    const deckKey = currentTtsDeckKey();
    if (ttsDeckKey.value !== deckKey) {
      resetSlideAudioCache();
      ttsDeckKey.value = deckKey;
    }

    if (Object.keys(ttsItemsByPage.value).length > 0) {
      return ttsItemsByPage.value;
    }

    ttsLoading.value = true;
    try {
      const result = await generatePageTts({
        projectId,
        userId,
        pages: buildTtsPagesFromPptData(deck),
      });
      const playable = (result?.items ?? []).filter((item) => item.url);
      if (!playable.length) {
        throw new Error(t("agent.pptAudioNoSlide"));
      }

      const map: Record<number, string> = {};
      for (const item of playable) {
        if (item.url) map[item.page] = item.url;
      }
      ttsItemsByPage.value = map;
      return map;
    } finally {
      ttsLoading.value = false;
    }
  }

  async function playPageAudio(page: number, items: Record<number, string>) {
    const url = items[page];
    if (!url) {
      const nextPage = findNextPlayablePage(page, items);
      if (nextPage > 0) {
        await playPageAudio(nextPage, items);
      } else {
        finishPlayAll();
      }
      return;
    }

    releaseSlideAudioEl();
    ttsPlayAllActive.value = true;

    slideAudioEl = new Audio(url);
    slideAudioEl.onended = () => {
      releaseSlideAudioEl();
      if (!ttsPlayAllActive.value) return;

      const nextPage = findNextPlayablePage(page, items);
      if (nextPage > 0) {
        void playPageAudio(nextPage, items);
        return;
      }
      finishPlayAll();
    };
    slideAudioEl.onerror = () => {
      stopPlayback();
      ElMessage.error(t("agent.pptAudioFailed"));
    };
    await slideAudioEl.play();
    ttsPlaying.value = true;
  }

  async function playAllDeckAudio() {
    try {
      const items = await ensureSlideAudioItems();
      const pages = Object.keys(items)
        .map((key) => Number(key))
        .filter((page) => Number.isFinite(page))
        .sort((a, b) => a - b);
      const firstPage = pages[0];
      if (!firstPage) {
        ElMessage.warning(t("agent.pptAudioNoSlide"));
        return;
      }
      ttsPlayAllActive.value = true;
      await startSlideBgm();
      await playPageAudio(firstPage, items);
    } catch (error) {
      stopPlayback();
      ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"));
    }
  }

  async function togglePlayAll() {
    if (ttsPlayAllActive.value) {
      stopPlayback();
      return;
    }
    if (ttsPlaying.value) stopPlayback();
    await playAllDeckAudio();
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
