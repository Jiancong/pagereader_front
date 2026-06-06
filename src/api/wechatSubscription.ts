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

export type WechatPaymentPollResult = {
  paymentStatus?: string
  status?: string
  payment_status?: string
  payStatus?: string
  paid?: boolean
  success?: boolean
  [key: string]: unknown
}

const WECHAT_PAYMENT_SUCCESS = new Set([
  "SUCCESS",
  "PAID",
  "COMPLETED",
  "PAY_SUCCESS",
  "SUCCEED",
  "SUCCESSFUL",
])

const WECHAT_PAYMENT_FAILED = new Set([
  "FAILED",
  "FAIL",
  "CLOSED",
  "CANCELLED",
  "CANCELED",
  "EXPIRED",
  "TIMEOUT",
  "REVOKED",
])

/** 从轮询接口 data 中解析支付状态（兼容字符串、多字段名） */
export function parseWechatPaymentStatus(data: unknown): string {
  if (data == null) return ""
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return String(data).toUpperCase()
  }
  if (typeof data !== "object") return ""

  const o = data as WechatPaymentPollResult
  if (o.paid === true || o.success === true) return "SUCCESS"

  const raw =
    o.paymentStatus ??
    o.payment_status ??
    o.status ??
    o.payStatus ??
    o.pay_status

  if (raw != null && raw !== "") return String(raw).toUpperCase()

  const nested = o.data
  if (nested != null && nested !== o) return parseWechatPaymentStatus(nested)

  return ""
}

export function isWechatPaymentSuccess(data: unknown): boolean {
  const status = parseWechatPaymentStatus(data)
  return status !== "" && WECHAT_PAYMENT_SUCCESS.has(status)
}

export function isWechatPaymentFailed(data: unknown): boolean {
  const status = parseWechatPaymentStatus(data)
  return status !== "" && WECHAT_PAYMENT_FAILED.has(status)
}

export async function getPaymentStatus(orderId: string) {
  return get<WechatPaymentPollResult | string>(
    `/wechat-subscription/payment/${encodeURIComponent(orderId)}`,
  )
}
