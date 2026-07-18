type TtsMap = Record<number, string>;

export function createTtsEnsureHelper() {
  let cachedItems: TtsMap = {};
  let deckKey = "";
  let inflight: Promise<TtsMap> | null = null;

  function reset() {
    cachedItems = {};
    deckKey = "";
    inflight = null;
  }

  async function ensure(
    nextDeckKey: string,
    fetcher: () => Promise<TtsMap>,
  ): Promise<TtsMap> {
    if (deckKey !== nextDeckKey) {
      reset();
      deckKey = nextDeckKey;
    }
    if (Object.keys(cachedItems).length > 0) {
      return cachedItems;
    }
    if (inflight) {
      return inflight;
    }
    inflight = (async () => {
      try {
        cachedItems = await fetcher();
        return cachedItems;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  return { ensure, reset, getCached: () => cachedItems };
}
