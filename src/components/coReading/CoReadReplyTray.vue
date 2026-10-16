<template>
  <div class="border-t border-border bg-card/95 px-4 py-4 backdrop-blur sm:px-6">
    <p class="mb-3 text-center text-xs text-muted-foreground">{{ t('coRead.spoilerNotice') }}</p>
    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="disabled || loading"
      @click="emit('send')"
    >
      <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
      <MessageCircle v-else class="h-5 w-5" />
      {{ t('coRead.sendReplies', { n: replyCount }) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Loader2, MessageCircle } from 'lucide-vue-next'

defineProps<{
  replyCount: number
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ send: [] }>()
const { t } = useI18n()
</script>
