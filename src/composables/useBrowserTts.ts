import { ref, onBeforeUnmount, type Ref } from 'vue'

export function useBrowserTts() {
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const speaking = ref(false)
  const paused = ref(false)
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)

  function stop() {
    if (!supported) return
    window.speechSynthesis.cancel()
    speaking.value = false
    paused.value = false
    currentUtterance.value = null
  }

  function pause() {
    if (!supported || !speaking.value) return
    window.speechSynthesis.pause()
    paused.value = true
  }

  function resume() {
    if (!supported || !paused.value) return
    window.speechSynthesis.resume()
    paused.value = false
  }

  function speak(text: string, opts?: { lang?: string; onEnd?: () => void }) {
    if (!supported || !text.trim()) return false
    stop()
    try {
      const u = new SpeechSynthesisUtterance(text.trim())
      u.lang = opts?.lang || (navigator.language || 'zh-CN')
      u.onend = () => {
        speaking.value = false
        paused.value = false
        currentUtterance.value = null
        opts?.onEnd?.()
      }
      u.onerror = () => {
        speaking.value = false
        paused.value = false
        currentUtterance.value = null
      }
      currentUtterance.value = u
      speaking.value = true
      window.speechSynthesis.speak(u)
      return true
    } catch {
      speaking.value = false
      return false
    }
  }

  function toggle(text: string, opts?: { lang?: string; onEnd?: () => void }) {
    if (speaking.value && !paused.value) {
      pause()
    } else if (paused.value) {
      resume()
    } else {
      speak(text, opts)
    }
  }

  onBeforeUnmount(() => {
    stop()
  })

  return { speaking, paused, supported, speak, stop, pause, resume, toggle }
}
