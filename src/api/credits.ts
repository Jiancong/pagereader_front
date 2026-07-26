// 积分账户余额（扣费后刷新优先走此接口）
// @author hc @date 2026-07-15

import { get } from "./client"
import { getMyStatus } from "./subscribe"
import { getCurrentUserId } from "./token"
import type { CreditsAccount, CreditsAccountRaw, SubscribeMyStatus } from "./types"

/** 将 /credits/account 嵌套响应扁平化为 UI 余额字段 */
export function normalizeCreditsAccount(
  raw: CreditsAccountRaw | null | undefined,
): CreditsAccount {
  if (!raw || typeof raw !== "object") return {}

  const credits = raw.credits ?? raw
  return {
    dailyFreeCredits: credits.dailyFreeCredits,
    dailyFreeCreditsRemaining:
      credits.currentDailyCredits ??
      credits.dailyFreeCreditsRemaining ??
      credits.dailyFreeCredits,
    packageCredits: credits.monthlyFastCredits ?? credits.packageCredits ?? credits.currentPlanCredits,
    monthlyCredits: credits.monthlyFastCredits,
    monthlyCreditsRemaining: credits.currentPlanCredits ?? credits.packageCreditsRemaining,
    packageCreditsRemaining: credits.currentPlanCredits ?? credits.packageCreditsRemaining,
    totalCredits: credits.totalCredits,
  }
}

export async function getAccount(): Promise<CreditsAccount> {
  const userId = getCurrentUserId()
  if (!userId) {
    throw new Error("无法从登录信息读取用户 ID")
  }
  const raw = await get<CreditsAccountRaw>("/credits/account", {
    query: { userId },
  })
  return normalizeCreditsAccount(raw)
}

/** 订阅状态 + 积分账户合并；积分余额以 /credits/account 为准 */
export async function getCreditsStatus(): Promise<SubscribeMyStatus> {
  const [sub, account] = await Promise.allSettled([getMyStatus(), getAccount()])
  const base = sub.status === "fulfilled" ? sub.value : {}
  const overlay = account.status === "fulfilled" ? account.value : {}
  return { ...base, ...overlay }
}
