// PayPal 订阅与账户状态
// @author hc @date 2026-06-04

import { get, postJson } from "./client"
import type {
  CreateUserSubscriptionReq,
  SubscribeMyStatus,
  SubscribeMyStatusRaw,
} from "./types"

/** 将 /subscribe/my/status 嵌套响应扁平化为 UI 字段。
 *  - subscriptionStatus：外层订阅状态（NONE=免费 / 视到期=微信 / ACTIVE 等=PayPal）
 *  - paypalStatus：仅来自 subscription.paypalStatus；免费用户为 null，微信为 "WECHAT_PAY"。
 *    不能用 subscriptionStatus 兜底，否则免费用户会被误显示成 "PayPal 状态: NONE"。
 */
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
  // 仅取 subscription.paypalStatus，不使用外层 subscriptionStatus 兜底
  const paypalStatusRaw = sub.paypalStatus
  const paypalStatus = paypalStatusRaw != null ? String(paypalStatusRaw) : undefined
  const subscriptionStatus =
    raw.subscriptionStatus != null
      ? String(raw.subscriptionStatus)
      : sub.status != null
        ? String(sub.status)
        : undefined
  const hasActive = raw.hasActiveSubscription === true

  const planCredits = credits.currentPlanCredits
  const dailyRemaining = credits.currentDailyCredits

  return {
    ...raw,
    planType,
    displayName: plan.planName ?? planType,
    planId: planId != null ? String(planId) : undefined,
    paypalPlanId: paypalPlanId != null ? String(paypalPlanId) : undefined,
    paypalStatus,
    subscriptionStatus,
    subscriptionActive: hasActive,
    canCancel: hasActive && !!paypalPlanId,
    dailyFreeCredits: credits.dailyFreeCredits,
    dailyFreeCreditsRemaining: dailyRemaining,
    packageCredits: planCredits,
    monthlyCredits: credits.monthlyFastCredits,
    monthlyCreditsRemaining: planCredits,
    packageCreditsRemaining: planCredits,
    planCredits,
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
