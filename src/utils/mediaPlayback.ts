/** Minimal silent WAV — unlock autoplay in the same user-gesture turn. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"

/**
 * Call synchronously inside a click/key handler before any `await`.
 * Keeps the user-activation chain alive for later TTS `play()` calls.
 */
export function primeMediaPlayback(): void {
  const audio = new Audio(SILENT_WAV)
  audio.muted = true
  audio.volume = 0
  audio.setAttribute("playsinline", "true")
  void audio.play().then(() => audio.pause()).catch(() => {})
}

/** Play media; return false on autoplay-policy block instead of throwing. */
export async function safeMediaPlay(el: HTMLMediaElement): Promise<boolean> {
  try {
    await el.play()
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return false
    throw err
  }
}
