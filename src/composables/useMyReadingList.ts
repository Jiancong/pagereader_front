import { ref, onMounted } from 'vue'
import { projectApi, isLoggedIn } from '@/api'
import type { MyReadingItemVo } from '@/api/types'
import {
  isInProgressReading,
  normalizeMyReadingItem,
  type NormalizedMyReadingItem,
} from '@/utils/myReadingItem'
import {
  getCachedReadingList,
  getLocalReadingPosition,
  isReadingListCacheFresh,
  setCachedReadingList,
} from '@/utils/readingProgressCache'

function mergeLocalProgress(item: NormalizedMyReadingItem): NormalizedMyReadingItem {
  const local = getLocalReadingPosition(item.projectId)
  const localPercent = local?.progressPercent
  if (localPercent == null) return item
  const serverPercent = item.myProgressPercent ?? 0
  if (localPercent <= serverPercent) return item
  return {
    ...item,
    myProgressPercent: localPercent,
    myReadingStatus: localPercent >= 95 ? 'FINISHED' : 'READING',
  }
}

export function useMyReadingList(opts?: { autoLoad?: boolean; pageSize?: number }) {
  const autoLoad = opts?.autoLoad !== false
  const pageSize = opts?.pageSize ?? 20

  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const items = ref<NormalizedMyReadingItem[]>([])
  const fromCache = ref(false)

  function applyItems(next: NormalizedMyReadingItem[], cached: boolean) {
    items.value = next
    fromCache.value = cached
  }

  async function load(options?: { force?: boolean }) {
    if (!isLoggedIn()) {
      applyItems([], false)
      error.value = null
      return
    }

    const cached = getCachedReadingList()
    const hasCached = Boolean(cached?.length)
    const cacheFresh = hasCached && isReadingListCacheFresh()

    if (hasCached && !options?.force) {
      applyItems(
        cached!.filter((row) => isInProgressReading(row)).map(mergeLocalProgress),
        true,
      )
      loading.value = false
    } else if (!hasCached) {
      loading.value = true
    }

    if (cacheFresh && !options?.force) {
      void refreshInBackground()
      return
    }

    await refreshInBackground()
  }

  async function refreshInBackground() {
    if (!isLoggedIn()) return
    refreshing.value = true
    error.value = null
    try {
      const page = await projectApi.getMyReadingProjects(0, pageSize)
      const raw = page.content ?? []
      const next = raw
        .map((row) => normalizeMyReadingItem(row as MyReadingItemVo))
        .filter((row): row is NormalizedMyReadingItem => row != null && isInProgressReading(row))
        .map(mergeLocalProgress)
      applyItems(next, false)
      setCachedReadingList(next)
    } catch (e) {
      if (!items.value.length) {
        error.value = e instanceof Error ? e.message : 'load failed'
      }
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  if (autoLoad) {
    onMounted(() => {
      void load()
    })
  }

  return { loading, refreshing, error, items, fromCache, load }
}
