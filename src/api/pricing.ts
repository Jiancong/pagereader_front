// 定价套餐
// @author hc @date 2026-06-04

import { get } from "./client"
import type { PricingPlan } from "./types"

export async function getPlans(): Promise<PricingPlan[]> {
  const data = await get<PricingPlan[] | { plans?: PricingPlan[] }>("/pricing/plans")
  const list = Array.isArray(data) ? data : (data?.plans ?? [])
  return list.filter((p) => p.visible !== false)
}
