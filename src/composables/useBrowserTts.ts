import { ref, onBeforeUnmount, onMounted } from 'vue'

/** 中文女声名字关键词（按优先级排序） */
const FEMALE_NAME_HINTS = [
  'xiaoxiao',
  'yaoyao',
  'huihui',
  'xiaoyi',
  'yunxi',
  'yunyang',
  'xiaochen',
  'xiaohan',
  'xiaomeng',
  'xiaoqiu',
  'xiaorui',
  'xiaoshuang',
  'xiaoxuan',
  'xiaoyan',
  'xiaozhen',
  'tingting',
  'meijia',
  'lili',
  'female',
  'woman',
  '女声',
  '女',
  'female',
]

/** 中文男声名字关键词（用于排除） */
const MALE_NAME_HINTS = ['male', 'man', '男声', '男', 'david', 'kangkang', 'yunjian']

function isFemaleVoice(name: string): boolean {
  const lower = name.toLowerCase()
  if (MALE_NAME_HINTS.some((k) => lower.includes(k))) return false
  return FEMALE_NAME_HINTS.some((k) => lower.includes(k))
}

function isChineseVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').toLowerCase()
  return lang.startsWith('zh') || lang.startsWith('cmn')
}

export function useBrowserTts() {
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const speaking = ref(false)
  const paused = ref(false)
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)

  const voices = ref<SpeechSynthesisVoice[]>([])
  const selectedVoiceURI = ref<string>('')

  function loadVoices() {
    if (!supported) return
    const list = window.speechSynthesis.getVoices()
    if (!list || !list.length) return
    voices.value = list
    if (!selectedVoiceURI.value) {
      selectedVoiceURI.value = pickPreferredFemaleVoice(list)
    }
  }

  function pickPreferredFemaleVoice(list: SpeechSynthesisVoice[]): string {
    const zh = list.filter(isChineseVoice)
    const pool = zh.length ? zh : list

    // 1) 名字里明确带女声关键词
    const female = pool.find((v) => isFemaleVoice(v.name || ''))
    if (female) return female.voiceURI

    // 2) 没有"女声"标记时，挑 zh-CN 中第一个非男声的（多数系统默认女声）
    const notMale = pool.find((v) => !MALE_NAME_HINTS.some((k) => (v.name || '').toLowerCase().includes(k)))
    if (notMale) return notMale.voiceURI

    // 3) 退回第一个中文音色
    if (pool[0]) return pool[0].voiceURI
    return ''
  }

  function setSelectedVoice(uri: string) {
    selectedVoiceURI.value = uri
  }

  onMounted(() => {
    if (!supported) return
    loadVoices()
    // Chrome 异步加载 voices
    window.speechSynthesis.onvoiceschanged = () => loadVoices()
  })

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
      const lang = opts?.lang || (navigator.language || 'zh-CN')
      u.lang = lang
      // 选择女声
      const list = voices.value.length
        ? voices.value
        : window.speechSynthesis.getVoices()
      const voice =
        (selectedVoiceURI.value &&
          list.find((v) => v.voiceURI === selectedVoiceURI.value)) ||
        list.find((v) => isFemaleVoice(v.name || '') && isChineseVoice(v)) ||
        list.find((v) => isChineseVoice(v))
      if (voice) {
        u.voice = voice
        u.lang = voice.lang || lang
      }
      // 稍微提高音调让声音更柔和甜美
      u.pitch = 1.15
      u.rate = 0.95
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

  return {
    speaking,
    paused,
    supported,
    voices,
    selectedVoiceURI,
    speak,
    stop,
    pause,
    resume,
    toggle,
    setSelectedVoice,
  }
}
