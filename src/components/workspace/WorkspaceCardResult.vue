<template>
  <div class="workspace-card-result rounded-2xl border border-border bg-card">
    <header class="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
      <div>
        <h2 class="text-lg font-semibold text-foreground">{{ t("workspace.cardResultTitle") }}</h2>
        <p v-if="result.message" class="mt-1 text-sm text-muted-foreground">{{ result.message }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        @click="emit('close')"
      >
        {{ t("workspace.cardResultClose") }}
      </button>
    </header>

    <div class="space-y-6 p-4 sm:p-6">
      <section v-if="result.imageUrls.length" class="workspace-card-result-gallery">
        <h3 class="mb-3 text-sm font-semibold text-foreground">
          {{ t("workspace.cardResultImages", { n: result.imageUrls.length }) }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <figure
            v-for="(url, index) in result.imageUrls"
            :key="`${url}-${index}`"
            class="overflow-hidden rounded-xl border border-border bg-secondary/20"
          >
            <button type="button" class="block w-full" @click="openPreview(url)">
              <img
                :src="url"
                :alt="t('workspace.cardResultImageAlt', { n: index + 1 })"
                class="h-auto w-full object-cover"
                loading="lazy"
              />
            </button>
          </figure>
        </div>
      </section>

      <section v-if="result.content" class="workspace-card-result-md">
        <h3 v-if="result.imageUrls.length" class="mb-3 text-sm font-semibold text-foreground">
          {{ t("workspace.cardResultSummary") }}
        </h3>
        <ChatMarkdownBody :content="result.content" root-class="workspace-card-result-markdown" />
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="previewUrl"
        class="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 p-4"
        @click.self="previewUrl = null"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg bg-black/50 px-3 py-1.5 text-sm text-white"
          @click="previewUrl = null"
        >
          {{ t("workspace.cardResultClose") }}
        </button>
        <img :src="previewUrl" alt="" class="max-h-[90vh] max-w-full rounded-xl object-contain" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue"
import type { BookCardResult } from "@/utils/bookCardStream"

defineProps<{
  result: BookCardResult
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const previewUrl = ref<string | null>(null)

function openPreview(url: string) {
  previewUrl.value = url
}
</script>

<style scoped lang="scss">
.workspace-card-result-gallery img {
  display: block;
  transition: transform 0.2s ease;
}

.workspace-card-result-gallery button:hover img {
  transform: scale(1.02);
}

:deep(.workspace-card-result-markdown.markdown-body) {
  color: inherit;
  font-size: 0.95rem;
  line-height: 1.65;
}

:deep(.workspace-card-result-markdown.markdown-body h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}

:deep(.workspace-card-result-markdown.markdown-body p) {
  margin: 0.5rem 0;
}

:deep(.workspace-card-result-markdown.markdown-body strong) {
  color: var(--foreground, #e8f0fe);
}

:deep(.workspace-card-result-markdown.markdown-body em) {
  opacity: 0.85;
}
</style>
