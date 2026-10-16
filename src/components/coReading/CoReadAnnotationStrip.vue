<template>
  <aside
    v-if="visible"
    class="border-t border-border bg-card/95 px-3 py-3 sm:border-t-0 sm:border-l sm:max-w-sm sm:overflow-y-auto"
  >
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {{ t('coRead.annotationTitle') }}
      </h3>
      <button
        v-if="showRegenerate"
        type="button"
        class="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        :disabled="regenerateDisabled"
        @click="emit('regenerate')"
      >
        {{ t('coRead.regeneratePage') }}
      </button>
    </div>
    <p v-if="introText" class="mb-3 text-sm italic text-muted-foreground">{{ introText }}</p>
    <div
      v-if="pageError === 'generation_interrupted'"
      class="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      <p class="text-foreground">{{ t('coRead.generationFailed') }}</p>
      <button
        type="button"
        class="mt-2 text-sm font-medium text-primary hover:underline"
        @click="emit('retry')"
      >
        {{ t('coRead.retryPage') }}
      </button>
    </div>
    <p v-else-if="loading && !annotations.length" class="text-sm text-muted-foreground">
      {{ t('coRead.loadingAnnotations') }}
    </p>
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CoReadAnnotation } from '@/types/coReading'
import CoReadAnnotationCard from './CoReadAnnotationCard.vue'

const props = defineProps<{
  annotations: CoReadAnnotation[]
  introText?: string
  pageError?: string
  loading?: boolean
  showRegenerate?: boolean
  regenerateDisabled?: boolean
}>()

const emit = defineEmits<{
  draft: [annotationId: string, text: string]
  retry: []
  regenerate: []
}>()

const { t } = useI18n()

const visible = computed(
  () =>
    props.annotations.length > 0 ||
    !!props.pageError ||
    !!props.loading ||
    !!props.introText,
)
</script>
