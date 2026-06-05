// 微信订阅（扫码）
// @author hc @date 2026-06-04

import { get, postJson } from "./client"

export type BillingCycle = "MONTHLY"

export interface WechatSubscriptionCreateResult {
  orderId: string
  qrCode: string
  totalFee?: number // 单位：分（微信支付 total_fee）
}

export async function createSubscription(params: {
  userId: number | string
  planType: string
  billingCycle?: BillingCycle
}) {
  return postJson<WechatSubscriptionCreateResult>("/wechat-subscription/create", undefined, {
    query: {
      userId: params.userId,
      planType: params.planType,
      billingCycle: params.billingCycle ?? "MONTHLY",
    },
  })
}

export async function getPaymentStatus(orderId: string) {
  return get<{ paymentStatus?: string; [key: string]: unknown }>(
    `/wechat-subscription/payment/${encodeURIComponent(orderId)}`,
  )
}
