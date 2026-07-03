import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

export type VideoOrientation = "landscape" | "portrait"

export interface PptVideoSlideInput {
  /** 1-based page index — must line up with the audio map key. */
  page: number
  /** Already-rasterized slide image. PNG or JPEG both work. */
  image: Blob | HTMLCanvasElement
}

export interface PptVideoExportProgress {
  /** Overall percent 0–100. */
  percent: number
  /** Human-readable stage label key hint (raw message). */
  message: string
}

export interface PptVideoExportOptions {
  orientation: VideoOrientation
  slides: PptVideoSlideInput[]
  /** Map of 1-based page → audio url. Slides without audio fall back to a min duration. */
  audioByPage: Record<number, string>
  /** Seconds to hold a slide when it has no audio (default 4). */
  fallbackDurationSec?: number
  /** Extra pad seconds appended after each clip's audio ends (default 0.4). */
  tailPadSec?: number
  /** Report progress. */
  onProgress?: (p: PptVideoExportProgress) => void
  /** Optional abort signal. */
  signal?: AbortSignal
}

const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm"

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(onProgress?: (p: PptVideoExportProgress) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  ffmpegLoadPromise = (async () => {
    onProgress?.({ percent: 1, message: "loading-engine" })
    const ffmpeg = new FFmpeg()
    const coreURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript")
    const wasmURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm")
    await ffmpeg.load({ coreURL, wasmURL })
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  try {
    return await ffmpegLoadPromise
  } catch (err) {
    ffmpegLoadPromise = null
    throw err
  }
}

async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/jpeg",
      0.92,
    )
  })
}

/** Probe the duration (seconds) of an audio url via a hidden <audio> element. */
export function probeAudioDuration(url: string, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio")
    audio.preload = "auto"
    audio.src = url
    let settled = false

    const cleanup = () => {
      audio.removeAttribute("src")
      audio.load()
    }
    const onDone = (dur: number) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(Number.isFinite(dur) && dur > 0 ? dur : 0)
    }
    const onFail = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error("Failed to probe audio duration"))
    }

    audio.onloadedmetadata = () => {
      const dur = audio.duration
      if (Number.isFinite(dur) && dur > 0) {
        onDone(dur)
      }
    }
    audio.ondurationchange = () => {
      const dur = audio.duration
      if (Number.isFinite(dur) && dur > 0) onDone(dur)
    }
    audio.onerror = onFail

    if (signal) {
      if (signal.aborted) onFail()
      else signal.addEventListener("abort", onFail, { once: true })
    }

    // Some browsers never fire loadedmetadata for cross-origin without range support; fail fast.
    setTimeout(() => {
      if (!settled) {
        const dur = audio.duration
        if (Number.isFinite(dur) && dur > 0) onDone(dur)
        else onFail()
      }
    }, 12000)
  })
}

/** Format seconds as HH:MM:SS.mmm for ffmpeg -t durations. */
function formatDuration(seconds: number): string {
  const s = Math.max(0.1, seconds)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  const whole = Math.floor(s)
  const hh = Math.floor(whole / 3600)
  const mm = Math.floor((whole % 3600) / 60)
  const ss = whole % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, "0")}`
}

/**
 * Build a single MP4 from per-slide images + per-slide audio.
 * Strategy: for each slide, run `-loop 1 -t <dur> -i img -i audio` to produce a clip,
 * then concat all clips. Audio-less slides get silent audio via anullsrc.
 */
export async function exportPptVideo(options: PptVideoExportOptions): Promise<Blob> {
  const {
    orientation,
    slides,
    audioByPage,
    fallbackDurationSec = 4,
    tailPadSec = 0.4,
    onProgress,
    signal,
  } = options

  if (!slides.length) throw new Error("No slides to export")

  const ffmpeg = await getFFmpeg(onProgress)
  if (signal?.aborted) throw new Error("aborted")

  // Landscape 1280x720 (16:9); Portrait 720x1280 (9:16).
  const targetW = orientation === "portrait" ? 720 : 1280
  const targetH = orientation === "portrait" ? 1280 : 720

  // 1. Probe durations + write image/audio files into the FS.
  const clips: string[] = []
  const total = slides.length
  let ffmpegLogLast = 0

  ffmpeg.on("log", ({ message }) => {
    // Throttle log-driven progress.
    const now = Date.now()
    if (now - ffmpegLogLast > 120) {
      ffmpegLogLast = now
      onProgress?.({ percent: 10, message })
    }
  })

  for (let i = 0; i < slides.length; i++) {
    if (signal?.aborted) throw new Error("aborted")
    const slide = slides[i]
    onProgress?.({
      percent: 5 + Math.round((i / total) * 25),
      message: `preparing-slide-${i + 1}`,
    })

    const imgBlob =
      slide.image instanceof HTMLCanvasElement
        ? await canvasToJpegBlob(slide.image)
        : slide.image
    const imgU8 = await blobToUint8(imgBlob)
    const imgName = `img_${i}.jpg`
    await ffmpeg.writeFile(imgName, imgU8)

    const audioUrl = audioByPage[slide.page]
    let duration = fallbackDurationSec
    let hasAudio = false
    if (audioUrl) {
      try {
        const probed = await probeAudioDuration(audioUrl, signal)
        if (probed > 0) {
          duration = probed + tailPadSec
          hasAudio = true
        }
      } catch {
        hasAudio = false
        duration = fallbackDurationSec
      }
    }

    const clipName = `clip_${i}.mp4`
    if (hasAudio) {
      const audioU8 = await fetchFile(audioUrl)
      const audioName = `aud_${i}`
      await ffmpeg.writeFile(audioName, audioU8)
      // Image looped for `duration`, shortest stream ends the output.
      await ffmpeg.exec([
        "-loop",
        "1",
        "-t",
        formatDuration(duration),
        "-i",
        imgName,
        "-i",
        audioName,
        "-vf",
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p`,
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        "-movflags",
        "+faststart",
        clipName,
      ])
    } else {
      // Silent clip: generate silent aac with anullsrc.
      await ffmpeg.exec([
        "-loop",
        "1",
        "-t",
        formatDuration(duration),
        "-i",
        imgName,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=channel_layout=stereo:sample_rate=44100`,
        "-vf",
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p`,
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        "-movflags",
        "+faststart",
        clipName,
      ])
    }
    clips.push(clipName)

    // Free intermediate inputs to keep FS small.
    try {
      await ffmpeg.deleteFile(imgName)
      if (hasAudio) await ffmpeg.deleteFile(`aud_${i}`)
    } catch {
      /* ignore */
    }

    onProgress?.({ percent: 5 + Math.round(((i + 1) / total) * 25), message: `clip-${i + 1}-done` })
  }

  if (signal?.aborted) throw new Error("aborted")

  // 2. Concat all clips.
  onProgress?.({ percent: 65, message: "concatenating" })
  const listText = clips.map((c) => `file '${c}'`).join("\n")
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(listText))

  // Attach a progress listener for the concat pass.
  const onConcatProgress = ({ progress }: { progress: number }) => {
    const pct = 65 + Math.round(Math.min(1, Math.max(0, progress)) * 30)
    onProgress?.({ percent: pct, message: "muxing" })
  }
  ffmpeg.on("progress", onConcatProgress)
  try {
    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "output.mp4",
    ])
  } finally {
    ffmpeg.off("progress", onConcatProgress)
  }

  // 3. Read output.
  onProgress?.({ percent: 98, message: "finalizing" })
  const data = await ffmpeg.readFile("output.mp4")
  const u8 = data as Uint8Array
  const blob = new Blob([u8.buffer], { type: "video/mp4" })

  // Cleanup outputs.
  for (const c of clips) {
    try {
      await ffmpeg.deleteFile(c)
    } catch {
      /* ignore */
    }
  }
  try {
    await ffmpeg.deleteFile("concat.txt")
    await ffmpeg.deleteFile("output.mp4")
  } catch {
    /* ignore */
  }

  onProgress?.({ percent: 100, message: "done" })
  return blob
}
