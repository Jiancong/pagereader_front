<template>
  <section class="border-t border-border bg-secondary/20 px-4 py-4 sm:px-6">
    <h3 class="mb-3 text-sm font-semibold text-foreground">{{ t('coRead.discussTitle') }}</h3>
    <div ref="listRef" class="co-read-chat max-h-64 space-y-3 overflow-y-auto pr-1">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['co-read-chat__row', msg.role === 'user' ? 'co-read-chat__row--user' : 'co-read-chat__row--assistant']"
      >
        <div class="co-read-chat__bubble whitespace-pre-wrap">{{ msg.text }}</div>
      </div>
    </div>
    <form class="mt-4 flex gap-2" @submit.prevent="submit">
      <input
        v-model="input"
        type="text"
        class="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        :placeholder="t('coRead.chatPlaceholder')"
        :disabled="chatLoading"
      />
      <button
        type="submit"
        class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        :disabled="!input.trim() || chatLoading"
      >
        {{ t('coRead.chatSend') }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CoReadChatMessage } from '@/types/coReading'

const props = defineProps<{
  messages: CoReadChatMessage[]
  chatLoading?: boolean
}>()

const emit = defineEmits<{ send: [text: string] }>()

const { t } = useI18n()
const input = ref('')
const listRef = ref<HTMLElement | null>(null)

watch(
  () => props.messages.length,
  () => {
    void nextTick(() => {
      const el = listRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  },
)

function submit() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}
</script>

<style scoped>
.co-read-chat__row {
  display: flex;
}
.co-read-chat__row--user {
  justify-content: flex-end;
}
.co-read-chat__row--assistant {
  justify-content: flex-start;
}
.co-read-chat__bubble {
  max-width: 85%;
  border-radius: 1rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.co-read-chat__row--user .co-read-chat__bubble {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
.co-read-chat__row--assistant .co-read-chat__bubble {
  background: hsl(var(--secondary));
  color: hsl(var(--foreground));
}
</style>
