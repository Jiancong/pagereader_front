<template>
  <aside
    v-if="open"
    class="fixed inset-0 z-40 flex justify-end bg-black/40 sm:static sm:inset-auto sm:z-auto sm:bg-transparent"
    @click.self="emit('close')"
  >
    <div class="flex h-full w-full max-w-xs flex-col border-l border-border bg-card shadow-xl sm:max-h-none sm:w-72">
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-sm font-semibold">{{ t('coRead.chapterNav') }}</h2>
        <button type="button" class="rounded-lg p-1 hover:bg-secondary" @click="emit('close')">
          <X class="h-5 w-5" />
        </button>
      </div>
      <ul class="flex-1 overflow-y-auto p-2">
        <li v-for="ch in chapters" :key="ch.index">
          <button
            type="button"
            class="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-secondary"
            :class="ch.index === currentIndex ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'"
            @click="emit('select', ch.index)"
          >
            {{ ch.title }}
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import type { CoReadChapter } from '@/types/coReading'

defineProps<{
  open: boolean
  chapters: CoReadChapter[]
  currentIndex: number
}>()

const emit = defineEmits<{ close: []; select: [index: number] }>()
const { t } = useI18n()
</script>
