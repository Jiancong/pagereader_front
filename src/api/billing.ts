// 计费：积分不足判断与生成前余额校验
// @author hc @date 2026-06-04

import { ApiError } from "./client"
import { CREDITS_INSUFFICIENT, type PptQueue, type SubscribeMyStatus } from "./types"

/** 各生成模式单次扣费（与定价页一致） */
export const QUEUE_CREDIT_COST: Record<PptQueue, number> = {
  CARD: 60,
  DOCUMENT: 30,
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

/** CARD：仅套餐；DOCUMENT：每日免费 + 套餐 */
export function canAffordQueue(status: SubscribeMyStatus | null | undefined, queue: PptQueue): boolean {
  const cost = QUEUE_CREDIT_COST[queue]
  const daily = getDailyCreditsRemaining(status)
  const pkg = getPackageCreditsRemaining(status)
  if (queue === "CARD") return pkg >= cost
  return daily + pkg >= cost
}

export function isCreditsInsufficientMessage(msg: string): boolean {
  const m = msg.toUpperCase()
  return m.includes("CREDITS_INSUFFICIENT") || msg.includes("积分不足")
}

/** 微信支付 totalFee（港分）→ 港币展示 */
export function formatHkdFromFen(fen: number | null | undefined): string | null {
  if (fen == null || !Number.isFinite(Number(fen))) return null
  const hkd = Number(fen) / 100
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(hkd)
}

/** 美元→港币展示汇率（仅用于标价展示；实扣以微信订单 totalFee 为准） */
export function getUsdHkdRate(): number {
  const n = Number(import.meta.env.VITE_USD_HKD_RATE)
  return Number.isFinite(n) && n > 0 ? n : 7.8
}

export function usdToHkd(usd: number): number {
  return Math.round(Number(usd) * getUsdHkdRate() * 100) / 100
}

type WechatPricePlan = {
  monthly?: { recurringMonth?: number; recurringMonthHkd?: number }
}

/**
 * 微信套餐展示价（港币元）。
 * 优先 `recurringMonthHkd`；否则用 `recurringMonth`（USD）× 汇率估算。
 */
export function resolveWechatMonthlyHkd(
  plan: WechatPricePlan,
): { hkd: number; estimated: boolean } | null {
  const hkd = plan.monthly?.recurringMonthHkd
  if (hkd != null && Number.isFinite(Number(hkd))) {
    return { hkd: Number(hkd), estimated: false }
  }
  const usd = plan.monthly?.recurringMonth
  if (usd == null || !Number.isFinite(Number(usd)) || Number(usd) <= 0) return null
  return { hkd: usdToHkd(Number(usd)), estimated: true }
}

/** 套餐标价（港币元）→ 港币展示 */
export function formatHkd(hkd: number | null | undefined): string | null {
  if (hkd == null || !Number.isFinite(Number(hkd))) return null
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(hkd))
}

export function isCreditsInsufficient(err: unknown): boolean {
  if (typeof err === "string") return isCreditsInsufficientMessage(err)
  if (!(err instanceof ApiError)) return false
  if (String(err.code) === CREDITS_INSUFFICIENT) return true
  return isCreditsInsufficientMessage(err.message)
}
