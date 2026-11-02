// 阅读器正文字号缩放（本地持久化；移动端默认略大便于阅读）
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'page2top.reader.textScale'
const MOBILE_LAYOUT_MQ = '(max-width: 767px)'
const DEFAULT_DESKTOP = 1.2
const DEFAULT_MOBILE = 1.3

export function clampReaderTextScale(value: number) {
  return Math.min(3, Math.max(0.5, +value.toFixed(2)))
}

function readStoredScale(): number | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return clampReaderTextScale(n)
  } catch {
    return null
  }
}

function defaultScaleForViewport(): number {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_LAYOUT_MQ).matches) {
    return DEFAULT_MOBILE
  }
  return DEFAULT_DESKTOP
}

export function useReaderTextScale() {
  const scale = ref(clampReaderTextScale(readStoredScale() ?? defaultScaleForViewport()))

  watch(
    scale,
    (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(v))
      } catch {
        /* ignore */
      }
    },
    { flush: 'post' },
  )

  const fontSizePercent = computed(() => Math.round(scale.value * 100))

  function zoomIn(step = 0.15) {
    scale.value = clampReaderTextScale(scale.value + step)
  }

  function zoomOut(step = 0.15) {
    scale.value = clampReaderTextScale(scale.value - step)
  }

  function applyZoomDelta(delta: number) {
    scale.value = clampReaderTextScale(scale.value + delta)
  }

  return { scale, fontSizePercent, zoomIn, zoomOut, applyZoomDelta }
}
