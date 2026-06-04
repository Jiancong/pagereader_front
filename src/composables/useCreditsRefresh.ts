// 订阅/支付成功后刷新各处的积分展示
// @author hc @date 2026-06-04

type RefreshHandler = () => void | Promise<void>

const handlers = new Set<RefreshHandler>()

export function registerCreditsRefresh(handler: RefreshHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export async function notifyCreditsRefresh(): Promise<void> {
  await Promise.all([...handlers].map((h) => Promise.resolve(h())))
}
