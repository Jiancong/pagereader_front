import type { NormalizedMyReadingItem } from '@/utils/myReadingItem'

const LIST_CACHE_KEY = 'pr:my_reading_list_v1'
const POSITION_PREFIX = 'pr:reading_pos:'
const LIST_TTL_MS = 10 * 60 * 1000

export interface ReadingPositionCache {
  slideIndex?: number
  sectionId?: string
  sectionIndex?: number
  progressPercent?: number
  updatedAt: number
}

interface ReadingListCachePayload {
  items: NormalizedMyReadingItem[]
  fetchedAt: number
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function percentToUnitIndex(percent: number, total: number): number {
  const safeTotal = Math.max(1, Math.trunc(total) || 1)
  const safePercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)))
  if (safePercent <= 0) return 0
  if (safePercent >= 100) return safeTotal - 1
  return Math.min(safeTotal - 1, Math.max(0, Math.ceil((safePercent / 100) * safeTotal) - 1))
}

export function unitIndexToPercent(index: number, total: number): number {
  const safeTotal = Math.max(1, Math.trunc(total) || 1)
  const safeIndex = Math.min(Math.max(0, Math.trunc(index) || 0), safeTotal - 1)
  return Math.min(100, Math.round(((safeIndex + 1) / safeTotal) * 100))
}

export function getCachedReadingList(): NormalizedMyReadingItem[] | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(LIST_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReadingListCachePayload
    if (!Array.isArray(parsed.items)) return null
    return parsed.items
  } catch {
    return null
  }
}

export function isReadingListCacheFresh(maxAgeMs = LIST_TTL_MS): boolean {
  if (!canUseStorage()) return false
  try {
    const raw = window.localStorage.getItem(LIST_CACHE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as ReadingListCachePayload
    return Date.now() - (parsed.fetchedAt || 0) < maxAgeMs
  } catch {
    return false
  }
}

export function setCachedReadingList(items: NormalizedMyReadingItem[]): void {
  if (!canUseStorage()) return
  try {
    const payload: ReadingListCachePayload = {
      items,
      fetchedAt: Date.now(),
    }
    window.localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function patchCachedReadingListItem(
  projectId: string,
  patch: Partial<Pick<NormalizedMyReadingItem, 'myProgressPercent' | 'myReadingStatus'>>,
): void {
  const list = getCachedReadingList()
  if (!list?.length) return
  const idx = list.findIndex((item) => item.projectId === projectId)
  if (idx < 0) return
  list[idx] = { ...list[idx], ...patch }
  setCachedReadingList(list)
}

export function getLocalReadingPosition(projectId: string): ReadingPositionCache | null {
  if (!canUseStorage() || !projectId) return null
  try {
    const raw = window.localStorage.getItem(`${POSITION_PREFIX}${projectId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReadingPositionCache
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveLocalReadingPosition(
  projectId: string,
  patch: Omit<ReadingPositionCache, 'updatedAt'> & { updatedAt?: number },
): void {
  if (!canUseStorage() || !projectId) return
  try {
    const prev = getLocalReadingPosition(projectId)
    const next: ReadingPositionCache = {
      ...prev,
      ...patch,
      updatedAt: patch.updatedAt ?? Date.now(),
    }
    window.localStorage.setItem(`${POSITION_PREFIX}${projectId}`, JSON.stringify(next))
    if (next.progressPercent != null) {
      patchCachedReadingListItem(projectId, {
        myProgressPercent: next.progressPercent,
        myReadingStatus: next.progressPercent >= 95 ? 'FINISHED' : 'READING',
      })
    }
  } catch {
    /* ignore */
  }
}

export function resolveResumeSlideIndex(
  projectId: string,
  serverPercent: number | null | undefined,
  totalSlides: number,
): number {
  const total = Math.max(1, totalSlides)
  const local = getLocalReadingPosition(projectId)
  if (local?.slideIndex != null && Number.isFinite(local.slideIndex)) {
    return Math.min(Math.max(0, Math.trunc(local.slideIndex)), total - 1)
  }
  if (local?.progressPercent != null) {
    return percentToUnitIndex(local.progressPercent, total)
  }
  if (serverPercent != null) {
    return percentToUnitIndex(serverPercent, total)
  }
  return 0
}

export function resolveResumeSectionIndex(
  projectId: string,
  serverPercent: number | null | undefined,
  totalSections: number,
  sectionIds: string[],
): { index: number; sectionId: string } {
  const total = Math.max(1, totalSections)
  const local = getLocalReadingPosition(projectId)
  let index = 0

  if (
    local?.sectionId &&
    sectionIds.includes(local.sectionId)
  ) {
    index = sectionIds.indexOf(local.sectionId)
  } else if (local?.sectionIndex != null && Number.isFinite(local.sectionIndex)) {
    index = Math.min(Math.max(0, Math.trunc(local.sectionIndex)), total - 1)
  } else if (local?.progressPercent != null) {
    index = percentToUnitIndex(local.progressPercent, total)
  } else if (serverPercent != null) {
    index = percentToUnitIndex(serverPercent, total)
  }

  return {
    index,
    sectionId: sectionIds[index] ?? sectionIds[0] ?? '',
  }
}
