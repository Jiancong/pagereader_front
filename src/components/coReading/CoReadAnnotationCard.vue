<template>
  <article class="co-read-ann rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
    <header class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
      <span>{{ kindLabel }}</span>
      <span v-if="annotation.streaming" class="animate-pulse text-muted-foreground">{{ t('coRead.streaming') }}</span>
    </header>
    <blockquote
      v-if="annotation.anchor.quote"
      class="mb-3 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground"
    >
      {{ annotation.anchor.quote }}
    </blockquote>
    <p class="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{{ annotation.content }}</p>
    <div class="mt-4">
      <label class="mb-1 block text-xs font-medium text-muted-foreground">{{ t('coRead.myReplyLabel') }}</label>
      <textarea
        :value="annotation.myReply || ''"
        :disabled="annotation.replySent"
        rows="2"
        class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        :placeholder="t('coRead.myReplyPlaceholder')"
        @input="onDraftInput"
      />
      <p v-if="annotation.replySent" class="mt-1 text-xs text-muted-foreground">{{ t('coRead.replySent') }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CoReadAnnotation } from '@/types/coReading'

const props = defineProps<{
  annotation: CoReadAnnotation
}>()

const emit = defineEmits<{
  draft: [text: string]
}>()

const { t } = useI18n()

const kindLabel = computed(() => {
  const k = props.annotation.kind
  const key = `coRead.kind.${k}` as const
  const translated = t(key)
  return translated !== key ? translated : t('coRead.annotationTitle')
})

function onDraftInput(e: Event) {
  emit('draft', (e.target as HTMLTextAreaElement).value)
}
</script>
