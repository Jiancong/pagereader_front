// 计费错误判断
// @author hc @date 2026-06-04

import { ApiError } from "./client"
import { CREDITS_INSUFFICIENT } from "./types"

export function isCreditsInsufficient(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (String(err.code) === CREDITS_INSUFFICIENT) return true
  const m = err.message.toUpperCase()
  return m.includes("CREDITS_INSUFFICIENT") || m.includes("积分不足")
}
