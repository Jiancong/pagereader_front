<template>
  <div ref="scrollRoot" class="co-read-pane flex-1 overflow-y-auto px-4 py-6 sm:px-8" @scroll="onScroll">
    <div class="mx-auto max-w-2xl space-y-4">
      <template v-for="(para, pIdx) in chapter.paragraphs" :key="pIdx">
        <p
          :id="`para-${pIdx}`"
          class="text-base leading-relaxed text-foreground whitespace-pre-wrap"
        >
          {{ para }}
        </p>
        <div v-if="annotationsByParagraph[pIdx]?.length" class="space-y-3 py-2">
          <CoReadAnnotationCard
            v-for="ann in annotationsByParagraph[pIdx]"
            :key="ann.id"
            :annotation="ann"
            @draft="(text) => emit('draft', ann.id, text)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CoReadAnnotation, CoReadChapter } from '@/types/coReading'
import CoReadAnnotationCard from './CoReadAnnotationCard.vue'

const props = defineProps<{
  chapter: CoReadChapter
  annotations: CoReadAnnotation[]
}>()

const emit = defineEmits<{
  draft: [annotationId: string, text: string]
  scroll: [percent: number]
}>()

const scrollRoot = ref<HTMLElement | null>(null)

const annotationsByParagraph = computed(() => {
  const map: Record<number, CoReadAnnotation[]> = {}
  for (const ann of props.annotations) {
    const p = ann.anchor.paragraphIndex
    if (!map[p]) map[p] = []
    map[p].push(ann)
  }
  return map
})

function onScroll() {
  const el = scrollRoot.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  const percent = max <= 0 ? 100 : Math.round((el.scrollTop / max) * 100)
  emit('scroll', percent)
}
</script>
