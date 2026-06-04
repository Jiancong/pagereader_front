// 运行时加载 public/vendor/qrcode.min.js，避免构建期依赖 npm 包 qrcode
// @author hc @date 2026-06-04

type QrcodeLib = {
  toDataURL: (
    text: string,
    options?: { width?: number; margin?: number; errorCorrectionLevel?: string },
  ) => Promise<string>
}

declare global {
  interface Window {
    QRCode?: QrcodeLib
  }
}

let loadPromise: Promise<QrcodeLib> | null = null

function scriptUrl(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")
  return `${base}vendor/qrcode.min.js`
}

export function loadQrcodeVendor(): Promise<QrcodeLib> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("QRCode requires a browser environment"))
  }
  if (window.QRCode?.toDataURL) return Promise.resolve(window.QRCode)

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-pr-qrcode="1"]',
      )
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.QRCode) resolve(window.QRCode)
          else reject(new Error("QRCode library unavailable"))
        })
        existing.addEventListener("error", () => reject(new Error("QRCode script failed")))
        return
      }

      const s = document.createElement("script")
      s.src = scriptUrl()
      s.async = true
      s.dataset.prQrcode = "1"
      s.onload = () => {
        if (window.QRCode) resolve(window.QRCode)
        else reject(new Error("QRCode library unavailable"))
      }
      s.onerror = () => reject(new Error("Failed to load QRCode script"))
      document.head.appendChild(s)
    })
  }

  return loadPromise
}

export async function toQrDataUrl(
  text: string,
  width = 200,
  margin = 2,
): Promise<string> {
  const lib = await loadQrcodeVendor()
  return lib.toDataURL(text, { width, margin })
}
