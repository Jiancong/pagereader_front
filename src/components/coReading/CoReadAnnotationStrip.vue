<template>
  <aside
    v-if="annotations.length"
    class="border-t border-border bg-card/95 px-3 py-3 sm:border-t-0 sm:border-l sm:max-w-sm sm:overflow-y-auto"
  >
    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {{ t('coRead.annotationTitle') }}
    </h3>
    <div class="space-y-3">
      <CoReadAnnotationCard
        v-for="ann in annotations"
        :key="ann.id"
        :annotation="ann"
        @draft="(text) => emit('draft', ann.id, text)"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CoReadAnnotation } from '@/types/coReading'
import CoReadAnnotationCard from './CoReadAnnotationCard.vue'

defineProps<{ annotations: CoReadAnnotation[] }>()
const emit = defineEmits<{ draft: [annotationId: string, text: string] }>()
const { t } = useI18n()
</script>
