// 定价套餐
// @author hc @date 2026-06-04

import { get } from "./client"
import type { PricingConfig, PricingPlan } from "./types"

function visiblePlans(list: PricingPlan[]): PricingPlan[] {
  return list.filter((p) => p.visible !== false)
}

export async function getPricingConfig(): Promise<PricingConfig & { plans: PricingPlan[] }> {
  const data = await get<PricingPlan[] | PricingConfig>("/pricing/plans")
  if (Array.isArray(data)) {
    return { plans: visiblePlans(data) }
  }
  return {
    ...data,
    plans: visiblePlans(data?.plans ?? []),
  }
}

export async function getPlans(): Promise<PricingPlan[]> {
  const { plans } = await getPricingConfig()
  return plans
}
