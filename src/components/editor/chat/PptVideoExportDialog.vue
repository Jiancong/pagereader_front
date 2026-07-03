<template>
  <el-dialog
    v-model="visibleModel"
    :title="t('agent.pptVideoExportTitle')"
    width="440px"
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    append-to-body
    align-center
    class="ppt-video-export-dialog"
  >
    <div class="ppt-video-export-body">
      <template v-if="stage === 'select'">
        <p class="ppt-video-export-hint">{{ t('agent.pptVideoExportHint') }}</p>
        <div class="ppt-video-export-orientations">
          <button
            type="button"
            class="ppt-video-export-orient"
            :class="{ 'is-active': orientation === 'landscape' }"
            @click="orientation = 'landscape'"
          >
            <span class="ppt-video-export-orient-frame ppt-video-export-orient-frame--landscape">
              <span class="ppt-video-export-orient-screen"></span>
            </span>
            <span class="ppt-video-export-orient-label">{{ t('agent.pptVideoExportLandscape') }}</span>
            <span class="ppt-video-export-orient-sub">16 : 9</span>
          </button>
          <button
            type="button"
            class="ppt-video-export-orient"
            :class="{ 'is-active': orientation === 'portrait' }"
            @click="orientation = 'portrait'"
          >
            <span class="ppt-video-export-orient-frame ppt-video-export-orient-frame--portrait">
              <span class="ppt-video-export-orient-screen"></span>
            </span>
            <span class="ppt-video-export-orient-label">{{ t('agent.pptVideoExportPortrait') }}</span>
            <span class="ppt-video-export-orient-sub">9 : 16</span>
          </button>
        </div>
      </template>

      <template v-if="stage === 'progress'">
        <div class="ppt-video-export-progress">
          <div class="ppt-video-export-progress-bar">
            <div class="ppt-video-export-progress-fill" :style="{ width: `${percent}%` }"></div>
          </div>
          <p class="ppt-video-export-progress-text">{{ progressLabel }}</p>
        </div>
      </template>

      <template v-if="stage === 'result'">
        <video
          :src="resultUrl"
          controls
          playsinline
          class="ppt-video-export-preview"
        ></video>
      </template>

      <p v-if="errorMsg" class="ppt-video-export-error">{{ errorMsg }}</p>
    </div>

    <template #footer>
      <template v-if="stage === 'select'">
        <el-button :disabled="busy" @click="visibleModel = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="busy" @click="start">{{ t('agent.pptVideoExportStart') }}</el-button>
      </template>
      <template v-else-if="stage === 'progress'">
        <el-button disabled>{{ t('agent.pptVideoExportProcessing') }}</el-button>
      </template>
      <template v-else-if="stage === 'result'">
        <el-button @click="reset">{{ t('agent.pptVideoExportAgain') }}</el-button>
        <el-button @click="visibleModel = false">{{ t('common.close') }}</el-button>
        <el-button type="primary" @click="download">{{ t('agent.pptVideoExportDownload') }}</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ElButton, ElDialog, ElMessage } from "element-plus"
import {
  exportPptVideo,
  type PptVideoExportProgress,
  type VideoOrientation,
} from "@/utils/pptVideoExport"
import { saveAs } from "file-saver"

export interface VideoCaptureResult {
  slides: Array<{ page: number; image: Blob }>
  audioByPage: Record<number, string>
}

const props = defineProps<{
  basename?: string
  /**
   * Captures slides for the chosen orientation and returns per-slide images + audio urls.
   * Called when the user clicks "Start" with the selected orientation.
   */
  capture: (orientation: VideoOrientation, onProgress: (current: number, total: number) => void) => Promise<VideoCaptureResult>
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
}>()

const { t } = useI18n()

const visible = defineModel<boolean>({ default: false })

const visibleModel = computed({
  get: () => visible.value,
  set: (v: boolean) => emit("update:modelValue", v),
})

const orientation = ref<VideoOrientation>("landscape")
const stage = ref<"select" | "progress" | "result">("select")
const busy = ref(false)
const percent = ref(0)
const progressLabel = ref("")
const errorMsg = ref("")
const resultUrl = ref<string>("")
const resultBlob = ref<Blob | null>(null)

watch(visible, (open) => {
  if (open) reset()
})

function reset() {
  stage.value = "select"
  busy.value = false
  percent.value = 0
  progressLabel.value = ""
  errorMsg.value = ""
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ""
  }
  resultBlob.value = null
}

function pickLabel(p: PptVideoExportProgress): string {
  const msg = p.message || ""
  if (msg === "loading-engine") return t("agent.pptVideoExportLoadingEngine")
  if (msg.startsWith("preparing-slide") || msg.startsWith("clip-")) return t("agent.pptVideoExportRendering")
  if (msg === "concatenating") return t("agent.pptVideoExportConcat")
  if (msg === "muxing") return t("agent.pptVideoExportMuxing")
  if (msg === "finalizing") return t("agent.pptVideoExportFinalizing")
  if (msg.startsWith("capture:")) return t("agent.pptExportCapturing", { current: 0, total: 0 })
  return t("agent.pptVideoExportProcessing")
}

async function start() {
  if (busy.value) return
  busy.value = true
  stage.value = "progress"
  percent.value = 0
  errorMsg.value = ""
  progressLabel.value = t("agent.pptExportCapturing", { current: 0, total: 0 })

  let captured: VideoCaptureResult | null = null
  try {
    captured = await props.capture(orientation.value, (current, total) => {
      progressLabel.value = t("agent.pptExportCapturing", { current, total })
    })
  } catch (err) {
    console.error("PPT video capture failed:", err)
    errorMsg.value = t("agent.pptExportFailed")
    stage.value = "select"
    busy.value = false
    return
  }

  progressLabel.value = t("agent.pptVideoExportLoadingEngine")
  try {
    const blob = await exportPptVideo({
      orientation: orientation.value,
      slides: captured.slides,
      audioByPage: captured.audioByPage,
      onProgress: (p) => {
        percent.value = p.percent
        progressLabel.value = pickLabel(p)
      },
    })
    resultBlob.value = blob
    resultUrl.value = URL.createObjectURL(blob)
    percent.value = 100
    stage.value = "result"
  } catch (err) {
    console.error("PPT video export failed:", err)
    ElMessage.error(t("agent.pptVideoExportFailed"))
    stage.value = "select"
  } finally {
    busy.value = false
  }
}

function download() {
  if (!resultBlob.value) return
  const base = (props.basename || "presentation").replace(/[^\w\-]+/g, "_")
  const suffix = orientation.value === "portrait" ? "portrait" : "landscape"
  saveAs(resultBlob.value, `${base}-${suffix}.mp4`)
}
</script>

<style>
.ppt-video-export-body {
  min-height: 180px;
}

.ppt-video-export-hint {
  margin: 0 0 16px;
  color: var(--ppt-muted, #6b7280);
  font-size: 13px;
  line-height: 1.5;
}

.ppt-video-export-orientations {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ppt-video-export-orient {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px 12px;
  border: 1.5px solid var(--ppt-border, #e5e7eb);
  border-radius: 12px;
  background: var(--ppt-surface, #fff);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ppt-video-export-orient:hover {
  border-color: var(--ppt-primary, #6366f1);
}

.ppt-video-export-orient.is-active {
  border-color: var(--ppt-primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.ppt-video-export-orient-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ppt-fg, #111827);
  border-radius: 6px;
  background: #0b0f17;
}

.ppt-video-export-orient-frame--landscape {
  width: 96px;
  height: 54px;
}

.ppt-video-export-orient-frame--portrait {
  width: 48px;
  height: 85px;
}

.ppt-video-export-orient-screen {
  width: 70%;
  height: 60%;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--ppt-primary, #6366f1), #a855f7);
  opacity: 0.55;
}

.ppt-video-export-orient-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ppt-fg, #111827);
}

.ppt-video-export-orient-sub {
  font-size: 11px;
  color: var(--ppt-muted, #6b7280);
}

.ppt-video-export-progress {
  padding: 24px 4px;
}

.ppt-video-export-progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--ppt-border, #e5e7eb);
  overflow: hidden;
}

.ppt-video-export-progress-fill {
  height: 100%;
  background: var(--ppt-primary, #6366f1);
  transition: width 0.2s ease;
}

.ppt-video-export-progress-text {
  margin: 12px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--ppt-muted, #6b7280);
}

.ppt-video-export-preview {
  width: 100%;
  max-height: 360px;
  border-radius: 10px;
  background: #000;
}

.ppt-video-export-error {
  margin: 12px 0 0;
  color: #ef4444;
  font-size: 13px;
}
</style>
