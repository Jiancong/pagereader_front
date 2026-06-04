// PayPal 订阅与账户状态
// @author hc @date 2026-06-04

import { get, postJson } from "./client"
import type { CreateUserSubscriptionReq, SubscribeMyStatus } from "./types"

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
  return get<SubscribeMyStatus>("/subscribe/my/status")
}
