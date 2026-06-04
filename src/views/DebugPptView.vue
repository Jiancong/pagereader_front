<!-- PPT 调试页：粘贴 ppt_complete / OSS deck JSON 直接渲染，跳过 SSE -->
<!-- @author hc @date 2026-06-04 -->
<template>
  <div class="min-h-screen bg-background p-4 sm:p-6">
    <div v-if="!pptData" class="mx-auto max-w-4xl">
      <h1 class="text-xl font-semibold text-foreground">PPT 调试解析</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        粘贴 <code>ppt_complete</code> 报文、OSS envelope（含 <code>payload</code>），或直接的 deck（含 <code>slides</code>）。
        含 <code>ppt_data_url</code> 时会尝试拉取（受 OSS CORS 限制）。
      </p>

      <textarea
        v-model="raw"
        spellcheck="false"
        placeholder='{"status":"complete","ppt_data_url":"https://...","slides":[...]}'
        class="mt-4 h-[52vh] w-full resize-none rounded-xl border border-border bg-secondary/40 p-4 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
      />

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          :disabled="loading || !raw.trim()"
          class="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          @click="parse"
        >
          <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
          <Play v-else class="h-5 w-5" />
          {{ loading ? '解析中...' : '解析并渲染' }}
        </button>
        <button
          class="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
          @click="raw = ''"
        >
          清空
        </button>
        <span v-if="info" class="text-sm text-emerald-400">{{ info }}</span>
      </div>

      <div v-if="error" class="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        <pre class="whitespace-pre-wrap font-mono">{{ error }}</pre>
      </div>
    </div>

    <div v-else>
      <div class="mb-3 flex items-center gap-3">
        <button
          class="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          @click="reset"
        >
          ← 返回粘贴
        </button>
        <span class="text-sm text-muted-foreground">
          {{ deckTitle }} · {{ slideCount }} 页
        </span>
      </div>
      <div class="rounded-2xl border border-border bg-card">
        <PptViewer :ppt-data="pptData" @close="reset" @update:ppt-data="(d) => (pptData = d)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { Play, Loader2 } from "lucide-vue-next"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import {
  resolveLocalPptDeck,
  resolvePptDataFromStreamComplete,
} from "@/utils/pptCompletePayload"

const raw = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const pptData = ref<Record<string, unknown> | null>(null)

const slideCount = computed(() =>
  Array.isArray(pptData.value?.slides) ? (pptData.value!.slides as unknown[]).length : 0,
)
const deckTitle = computed(() => String((pptData.value?.title as string) || "未命名"))

const parse = async () => {
  error.value = null
  info.value = null
  loading.value = true
  try {
    let json: unknown
    try {
      json = JSON.parse(raw.value)
    } catch (e: any) {
      throw new Error(`JSON 解析失败：${e?.message || e}`)
    }

    // 1) 先尝试本地解析（envelope / 根 slides / 嵌套 ppt_data）
    const local = resolveLocalPptDeck(json)
    if (local) {
      pptData.value = local
      info.value = "本地解析成功"
      return
    }

    // 2) 含 ppt_data_url 时尝试网络拉取
    const resolved = await resolvePptDataFromStreamComplete(json)
    if (resolved) {
      pptData.value = resolved.pptData
      info.value = "已从 ppt_data_url 拉取并解析"
      return
    }

    throw new Error(
      "未找到 slides。请确认粘贴内容包含 slides[]，或 ppt_data.slides[]，或可访问的 ppt_data_url（注意 OSS CORS）。",
    )
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const reset = () => {
  pptData.value = null
}
</script>
