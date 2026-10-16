<template>
  <div class="mx-auto max-w-lg space-y-6 px-4 py-8">
    <div>
      <h2 class="text-xl font-bold text-foreground">{{ t('reader.coReadTitle') }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('reader.coReadSubtitle') }}</p>
    </div>

    <div v-if="!fileName" class="space-y-4">
      <div
        class="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition hover:border-primary/50"
        @dragover.prevent
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.md,.markdown,.mdown,.mkd,.epub,text/plain,text/markdown,application/epub+zip"
          class="hidden"
          @change="onSelect"
        />
        <BookHeart class="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p class="mt-4 font-medium">{{ t('reader.coReadPickFile') }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('reader.coReadFormats') }}</p>
      </div>
    </div>

    <template v-else>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="font-medium text-foreground">{{ fileName }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('coRead.chaptersDetected', { n: chapters.length }) }}</p>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium">{{ t('coRead.startChapterLabel') }}</label>
        <select
          v-model.number="startIndex"
          class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option v-for="ch in chapters" :key="ch.index" :value="ch.index">
            {{ ch.title }}
          </option>
        </select>
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
        :disabled="creating"
        @click="emit('start', startIndex)"
      >
        <Loader2 v-if="creating" class="h-5 w-5 animate-spin" />
        <BookHeart v-else class="h-5 w-5" />
        {{ t('reader.coReadStart') }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookHeart, Loader2 } from 'lucide-vue-next'
import type { CoReadChapter } from '@/types/coReading'

defineProps<{
  fileName: string
  chapters: CoReadChapter[]
  creating?: boolean
}>()

const emit = defineEmits<{
  pick: [file: File]
  start: [startChapterIndex: number]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const startIndex = ref(0)

function onSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('pick', file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) emit('pick', file)
}
</script>
