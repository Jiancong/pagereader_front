// 定价套餐
// @author hc @date 2026-06-04

import { get } from "./client"
import type { PricingConfig, PricingPlan } from "./types"

function isFreePlanType(planType?: string): boolean {
  return String(planType || "").toUpperCase() === "FREE"
}

/** 订阅/支付：仅 visible 套餐（不含 FREE 兜底档） */
function purchasablePlans(list: PricingPlan[]): PricingPlan[] {
  return list.filter((p) => p.visible !== false)
}

/** 定价页展示：FREE 即使 visible:false 也展示，并按 FREE → STARTER → PRO 排序 */
function pricingPagePlans(list: PricingPlan[]): PricingPlan[] {
  const order: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2 }
  return list
    .filter((p) => p.visible !== false || isFreePlanType(p.planType))
    .sort((a, b) => {
      const ai = order[String(a.planType || "").toUpperCase()] ?? 99
      const bi = order[String(b.planType || "").toUpperCase()] ?? 99
      return ai - bi
    })
}

function normalizePricingResponse(
  data: PricingPlan[] | PricingConfig,
): PricingConfig & { plans: PricingPlan[] } {
  if (Array.isArray(data)) {
    return { plans: pricingPagePlans(data) }
  }
  const raw = data?.plans ?? []
  return {
    ...data,
    plans: pricingPagePlans(raw),
  }
}

export async function getPricingConfig(): Promise<PricingConfig & { plans: PricingPlan[] }> {
  const data = await get<PricingPlan[] | PricingConfig>("/pricing/plans")
  return normalizePricingResponse(data)
}

export async function getPlans(): Promise<PricingPlan[]> {
  const data = await get<PricingPlan[] | PricingConfig>("/pricing/plans")
  const raw = Array.isArray(data) ? data : (data?.plans ?? [])
  return purchasablePlans(raw)
}
