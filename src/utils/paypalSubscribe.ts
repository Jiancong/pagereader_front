// PayPal Subscriptions SDK loader + button render
// @author hc @date 2026-06-04

import { subscribeApi } from "@/api"

const SDK_URL_BASE = "https://www.paypal.com/sdk/js"

let sdkPromise: Promise<void> | null = null

function getClientId(): string {
  return String(import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "").trim()
}

export function isPaypalConfigured(): boolean {
  return !!getClientId()
}

function loadPaypalSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  const w = window as Window & { paypal?: { Buttons: (cfg: unknown) => { render: (el: HTMLElement) => void } } }
  if (w.paypal?.Buttons) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  const clientId = getClientId()
  if (!clientId) return Promise.reject(new Error("VITE_PAYPAL_CLIENT_ID missing"))

  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = `${SDK_URL_BASE}?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("PayPal SDK load failed"))
    document.head.appendChild(s)
  })
  return sdkPromise
}

export async function renderPaypalSubscribeButton(
  container: HTMLElement,
  planId: string,
  userId: string | number,
  callbacks?: { onDone?: () => void; onCheckoutStart?: () => void },
): Promise<void> {
  await loadPaypalSdk()
  const w = window as Window & {
    paypal?: { Buttons: (cfg: unknown) => { render: (el: HTMLElement) => void } }
  }
  if (!w.paypal?.Buttons) throw new Error("PayPal SDK unavailable")

  container.innerHTML = ""
  w.paypal.Buttons({
    style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe" },
    createSubscription: (_data: unknown, actions: { subscription: { create: (p: { plan_id: string }) => unknown } }) => {
      callbacks?.onCheckoutStart?.()
      return actions.subscription.create({ plan_id: planId })
    },
    onApprove: async (data: { subscriptionID?: string; orderID?: string }) => {
      if (!data.subscriptionID) return
      await subscribeApi.createUserSubscription({
        userId,
        planId,
        subscriptionId: data.subscriptionID,
        orderId: data.orderID,
      })
      callbacks?.onDone?.()
    },
  }).render(container)
}
