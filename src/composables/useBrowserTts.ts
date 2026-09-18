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

/** 将长文本按句子拆分成小段，避免 Chrome ~15s 截断 bug */
export function splitTextIntoChunks(text: string, maxLen = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= maxLen) return [clean]
  // 按句号/问号/感叹号/分号/换行拆分
  const sentences = clean.split(/(?<=[。！？；\n!?;])/)
  const chunks: string[] = []
  let buf = ''
  for (const s of sentences) {
    if (!s) continue
    if ((buf + s).length > maxLen && buf) {
      chunks.push(buf)
      buf = s
    } else {
      buf += s
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

export function useBrowserTts() {
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const speaking = ref(false)
  const paused = ref(false)
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)

  const voices = ref<SpeechSynthesisVoice[]>([])
  const selectedVoiceURI = ref<string>('')

  // 内部状态：分块朗读队列
  let chunkQueue: string[] = []
  let chunkLang = 'zh-CN'
  let chunkOnEnd: (() => void) | null = null
  let chunkOnError: (() => void) | null = null
  let isChunkSequence = false
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null

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
    const female = pool.find((v) => isFemaleVoice(v.name || ''))
    if (female) return female.voiceURI
    const notMale = pool.find(
      (v) => !MALE_NAME_HINTS.some((k) => (v.name || '').toLowerCase().includes(k)),
    )
    if (notMale) return notMale.voiceURI
    if (pool[0]) return pool[0].voiceURI
    return ''
  }

  function setSelectedVoice(uri: string) {
    selectedVoiceURI.value = uri
  }

  onMounted(() => {
    if (!supported) return
    loadVoices()
    window.speechSynthesis.onvoiceschanged = () => loadVoices()
  })

  /** Chrome keep-alive：定期 pause+resume 防止长文本被截断 */
  function startKeepAlive() {
    if (keepAliveTimer) return
    keepAliveTimer = setInterval(() => {
      if (!supported) return
      if (speaking.value && !paused.value) {
        // Chrome bug workaround
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10000)
  }

  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer)
      keepAliveTimer = null
    }
  }

  function stop() {
    if (!supported) return
    chunkQueue = []
    isChunkSequence = false
    chunkOnEnd = null
    chunkOnError = null
    stopKeepAlive()
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

  function applyVoice(u: SpeechSynthesisUtterance, lang: string) {
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
    } else {
      u.lang = lang
    }
    u.pitch = 1.15
    u.rate = 0.95
  }

  /** 朗读单段文本（不分块） */
  function speakSingle(text: string, lang: string, onEnd?: () => void, onError?: () => void) {
    const u = new SpeechSynthesisUtterance(text.trim())
    applyVoice(u, lang)
    u.onend = () => {
      currentUtterance.value = null
      onEnd?.()
    }
    u.onerror = () => {
      currentUtterance.value = null
      onError?.()
    }
    currentUtterance.value = u
    window.speechSynthesis.speak(u)
  }

  /** 朗读队列中的下一块 */
  function speakNextChunk() {
    if (!supported || chunkQueue.length === 0) {
      isChunkSequence = false
      stopKeepAlive()
      speaking.value = false
      chunkOnEnd?.()
      chunkOnEnd = null
      return
    }
    const chunk = chunkQueue.shift()!
    speakSingle(
      chunk,
      chunkLang,
      () => {
        // 当前块读完，继续下一块
        if (isChunkSequence && chunkQueue.length > 0) {
          speakNextChunk()
        } else {
          isChunkSequence = false
          stopKeepAlive()
          speaking.value = false
          currentUtterance.value = null
          chunkOnEnd?.()
          chunkOnEnd = null
        }
      },
      () => {
        isChunkSequence = false
        stopKeepAlive()
        speaking.value = false
        currentUtterance.value = null
        chunkOnError?.()
        chunkOnError = null
      },
    )
  }

  /**
   * 朗读文本，自动分块以避免 Chrome 截断。
   * onEnd 在整段文本全部读完时触发。
   */
  function speak(text: string, opts?: { lang?: string; onEnd?: () => void; onError?: () => void }) {
    if (!supported || !text.trim()) return false
    stop()
    try {
      const lang = opts?.lang || navigator.language || 'zh-CN'
      const chunks = splitTextIntoChunks(text)
      if (chunks.length === 0) return false

      chunkLang = lang
      chunkOnEnd = opts?.onEnd || null
      chunkOnError = opts?.onError || null

      if (chunks.length === 1) {
        // 单块直接朗读
        speaking.value = true
        isChunkSequence = false
        startKeepAlive()
        speakSingle(chunks[0], lang, () => {
          stopKeepAlive()
          speaking.value = false
          currentUtterance.value = null
          opts?.onEnd?.()
        })
      } else {
        // 多块队列朗读
        speaking.value = true
        isChunkSequence = true
        chunkQueue = chunks
        startKeepAlive()
        speakNextChunk()
      }
      return true
    } catch {
      stopKeepAlive()
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
