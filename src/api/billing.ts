// 计费：积分不足判断与生成前余额校验
// @author hc @date 2026-06-04

import { ApiError } from "./client"
import { CREDITS_INSUFFICIENT, type PptQueue, type SubscribeMyStatus } from "./types"

/** 各队列单次生成扣费（与定价页一致） */
export const QUEUE_CREDIT_COST: Record<PptQueue, number> = {
  FAST: 60,
  SLOW: 30,
}

function parseCredits(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function getDailyCreditsRemaining(status: SubscribeMyStatus | null | undefined): number {
  if (!status) return 0
  return parseCredits(
    status.dailyFreeCreditsRemaining ?? status.dailyFreeCredits ?? status.freeDailyCredits,
  )
}

export function getPackageCreditsRemaining(status: SubscribeMyStatus | null | undefined): number {
  if (!status) return 0
  return parseCredits(
    status.monthlyCreditsRemaining ??
      status.packageCreditsRemaining ??
      status.packageCredits ??
      status.monthlyCredits,
  )
}

/** 慢速：每日免费 + 套餐；快速：仅套餐 */
export function canAffordQueue(status: SubscribeMyStatus | null | undefined, queue: PptQueue): boolean {
  const cost = QUEUE_CREDIT_COST[queue]
  const daily = getDailyCreditsRemaining(status)
  const pkg = getPackageCreditsRemaining(status)
  if (queue === "FAST") return pkg >= cost
  return daily + pkg >= cost
}

export function isCreditsInsufficientMessage(msg: string): boolean {
  const m = msg.toUpperCase()
  return m.includes("CREDITS_INSUFFICIENT") || msg.includes("积分不足")
}

export function isCreditsInsufficient(err: unknown): boolean {
  if (typeof err === "string") return isCreditsInsufficientMessage(err)
  if (!(err instanceof ApiError)) return false
  if (String(err.code) === CREDITS_INSUFFICIENT) return true
  return isCreditsInsufficientMessage(err.message)
}
