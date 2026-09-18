import type { MyReadingItemVo, ReadingStatus } from '@/api/types'

export interface NormalizedMyReadingItem {
  projectId: string
  title: string
  thumbnailUrl: string
  myReadingStatus: ReadingStatus
  myProgressPercent: number | null
}

function readProgressPercent(item: MyReadingItemVo): number | null {
  const raw = item.myProgressPercent
  if (raw == null || !Number.isFinite(Number(raw))) return null
  return Math.min(100, Math.max(0, Math.round(Number(raw))))
}

export function normalizeMyReadingItem(item: MyReadingItemVo): NormalizedMyReadingItem | null {
  const project = item.project
  const projectId = String(item.projectId ?? project?.id ?? item.id ?? '').trim()
  if (!projectId) return null

  const title =
    String(
      item.sourceBookTitle ??
        project?.sourceBookTitle ??
        item.title ??
        item.name ??
        project?.title ??
        project?.name ??
        '',
    ).trim() || projectId

  const thumbnailUrl = String(item.thumbnailUrl ?? project?.thumbnailUrl ?? '').trim()
  const myReadingStatus = (item.myReadingStatus ?? 'NONE') as ReadingStatus

  return {
    projectId,
    title,
    thumbnailUrl,
    myReadingStatus,
    myProgressPercent: readProgressPercent(item),
  }
}

/** 已开始阅读：READING 或未读完（进度 > 0 且非 FINISHED） */
export function isInProgressReading(item: NormalizedMyReadingItem): boolean {
  if (item.myReadingStatus === 'READING') return true
  if (item.myReadingStatus === 'FINISHED') return false
  const p = item.myProgressPercent
  return p != null && p > 0
}
