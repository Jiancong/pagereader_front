import { fileApi } from '@/api'
import type { UserStorageQuota } from '@/api/types'

export class StorageQuotaBlockedError extends Error {
  quota: UserStorageQuota

  constructor(quota: UserStorageQuota, message: string) {
    super(message)
    this.name = 'StorageQuotaBlockedError'
    this.quota = quota
  }
}

/** 上传前检查账号云空间（直传 complete 也会校验；此处提前提示） */
export async function ensureStorageQuotaForUpload(
  incomingBytes: number,
  messageWhenExceeded: string,
): Promise<void> {
  const size = Number(incomingBytes) || 0
  if (size <= 0) return

  let quota: UserStorageQuota
  try {
    quota = await fileApi.getUserStorageQuota()
  } catch {
    return
  }

  if (quota.exceeded || quota.wouldExceed) {
    throw new StorageQuotaBlockedError(quota, messageWhenExceeded)
  }

  const remaining = quota.remainingBytes
  if (typeof remaining === 'number' && size > remaining) {
    throw new StorageQuotaBlockedError(quota, messageWhenExceeded)
  }
}
