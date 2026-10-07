<template>
  <div>
    <div class="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <Loader2 class="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-primary" />
      <div class="min-w-0 flex-1 text-left">
        <p class="text-sm font-medium text-foreground">
          {{ currentLine || t('bookExpert.distillRunning') }}
        </p>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
          {{ t('bookExpert.distillRunningHint') }}
        </p>
        <div class="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div class="be-distill__indeterminate" />
        </div>
      </div>
    </div>

    <div
      v-if="lines.length"
      class="mt-4 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left"
    >
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {{ t('workspace.progressTitle') }}
      </p>
      <div class="max-h-40 space-y-1 overflow-y-auto text-xs">
        <p
          v-for="(line, i) in lines"
          :key="`${i}-${line}`"
          class="truncate leading-relaxed"
          :class="i === lines.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground opacity-70'"
        >
          {{ line }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  lines: string[]
}>()

const { t } = useI18n()

const currentLine = computed(() => props.lines[props.lines.length - 1] ?? '')
</script>

<style scoped>
.be-distill__indeterminate {
  position: absolute;
  inset: 0;
  width: 40%;
  border-radius: 9999px;
  background: hsl(var(--primary));
  animation: be-distill-indeterminate 1.4s ease-in-out infinite;
}
@keyframes be-distill-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
