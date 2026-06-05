// PayPal 订阅与账户状态
// @author hc @date 2026-06-04

import { get, postJson } from "./client"
import type {
  CreateUserSubscriptionReq,
  SubscribeMyStatus,
  SubscribeMyStatusRaw,
} from "./types"

/** 将 /subscribe/my/status 嵌套响应扁平化为 UI 字段 */
export function normalizeSubscribeMyStatus(raw: SubscribeMyStatusRaw | null | undefined): SubscribeMyStatus {
  if (!raw || typeof raw !== "object") return {}

  const plan = raw.planInfo ?? {}
  const credits = raw.credits ?? {}
  const sub = (raw.subscription && typeof raw.subscription === "object" ? raw.subscription : {}) as Record<
    string,
    unknown
  >
  const billing = (raw.billing && typeof raw.billing === "object" ? raw.billing : {}) as Record<string, unknown>

  const planType = plan.planType ?? undefined
  const planId = plan.planId ?? sub.planId ?? billing.planId
  const paypalPlanId = sub.paypalPlanId ?? billing.paypalPlanId ?? planId
  const paypalStatus =
    sub.paypalStatus ?? sub.status ?? raw.subscriptionStatus ?? undefined
  const hasActive = raw.hasActiveSubscription === true

  return {
    ...raw,
    planType,
    displayName: plan.planName ?? planType,
    planId: planId != null ? String(planId) : undefined,
    paypalPlanId: paypalPlanId != null ? String(paypalPlanId) : undefined,
    paypalStatus: paypalStatus != null ? String(paypalStatus) : undefined,
    subscriptionActive: hasActive,
    canCancel: hasActive && !!paypalPlanId,
    dailyFreeCredits: credits.dailyFreeCredits,
    dailyFreeCreditsRemaining: credits.currentDailyCredits ?? credits.dailyFreeCredits,
    packageCredits: credits.monthlyFastCredits ?? credits.currentPlanCredits,
    monthlyCredits: credits.monthlyFastCredits,
    monthlyCreditsRemaining: credits.currentPlanCredits,
    packageCreditsRemaining: credits.currentPlanCredits,
    totalCredits: credits.totalCredits,
  }
}

export async function createUserSubscription(body: CreateUserSubscriptionReq) {
  return postJson<unknown>("/subscribe/createUserSubscription", body)
}

export async function cancelSubscription(params: {
  userId: number | string
  planId: string
  reason?: string
}) {
  return postJson<unknown>("/subscribe/cancelSubscription", undefined, {
    query: {
      userId: params.userId,
      planId: params.planId,
      reason: params.reason ?? "用户主动取消",
    },
  })
}

export async function getMyStatus(): Promise<SubscribeMyStatus> {
  const raw = await get<SubscribeMyStatusRaw>("/subscribe/my/status")
  return normalizeSubscribeMyStatus(raw)
}
