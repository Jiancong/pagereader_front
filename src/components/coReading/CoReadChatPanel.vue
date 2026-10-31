<template>
  <section class="border-t border-border bg-secondary/20 px-4 py-3 sm:px-6">
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'chat'"
          :class="['co-read-chat__tab', activeTab === 'chat' ? 'co-read-chat__tab--active' : '']"
          @click="activeTab = 'chat'"
        >
          {{ t('coRead.chatPanelChat') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'records'"
          :class="['co-read-chat__tab', activeTab === 'records' ? 'co-read-chat__tab--active' : '']"
          @click="activeTab = 'records'"
        >
          {{ t('coRead.chatPanelRecords') }}
        </button>
      </div>
      <button
        type="button"
        class="co-read-chat__close"
        :title="t('coRead.chatPanelClose')"
        :aria-label="t('coRead.chatPanelClose')"
        @click="emit('close')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
        </svg>
      </button>
    </div>

    <!-- 对话页签：与 AI 书友实时交流 -->
    <template v-if="activeTab === 'chat'">
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
    </template>

    <!-- 记录页签：已持久化的留言与 AI 回复（只读） -->
    <template v-else>
      <div class="co-read-chat max-h-72 space-y-3 overflow-y-auto pr-1">
        <p v-if="recordItems.length === 0" class="py-6 text-center text-xs text-muted-foreground">
          {{ t('coRead.chatPanelRecordsEmpty') }}
        </p>
        <div
          v-for="item in recordItems"
          :key="item.key"
          :class="['co-read-chat__row', item.role === 'user' ? 'co-read-chat__row--user' : 'co-read-chat__row--assistant']"
        >
          <div class="co-read-chat__bubble whitespace-pre-wrap">
            <span v-if="item.tag" class="co-read-chat__tag">{{ item.tag }}</span>
            {{ item.text }}
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CoReadAnnotationKind, CoReadChatMessage } from '@/types/coReading'

const props = defineProps<{
  messages: CoReadChatMessage[]
  chatLoading?: boolean
  /** 已发送的批注留言（含 AI 回复），用于「记录」页签 */
  replies?: { id: string; kind: CoReadAnnotationKind; myReply: string; replySent?: boolean }[]
  kindLabel?: (kind: string) => string
}>()

const emit = defineEmits<{ send: [text: string]; close: [] }>()

const { t } = useI18n()
const input = ref('')
const listRef = ref<HTMLElement | null>(null)
const activeTab = ref<'chat' | 'records'>('chat')

interface RecordItem {
  key: string
  role: 'user' | 'assistant'
  text: string
  tag?: string
}

const recordItems = computed<RecordItem[]>(() => {
  const items: RecordItem[] = []
  for (const r of props.replies || []) {
    const reply = String(r.myReply || '').trim()
    if (!reply) continue
    const label = props.kindLabel ? props.kindLabel(r.kind) : r.kind
    items.push({
      key: `reply-${r.id}`,
      role: 'user',
      text: reply,
      tag: label,
    })
  }
  for (const m of props.messages) {
    const text = String(m.text || '').trim()
    if (!text) continue
    items.push({ key: `msg-${m.id}`, role: m.role, text })
  }
  return items
})

watch(
  () => props.messages.length,
  () => {
    if (activeTab.value !== 'chat') return
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
  border: 1px solid var(--border, #e5e7eb);
  background: var(--card, #fff);
  color: var(--foreground, #111827);
}
.co-read-chat__row--user .co-read-chat__bubble {
  background: color-mix(in srgb, var(--primary, #6366f1) 14%, var(--card, #fff));
}
.co-read-chat__tag {
  display: inline-block;
  margin-right: 0.5em;
  padding: 0.05em 0.5em;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4338ca;
  background: rgba(99, 102, 241, 0.14);
}
.co-read-chat__tab {
  padding: 0.3rem 0.85rem;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 999px;
  background: transparent;
  color: var(--muted-foreground, #6b7280);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}
.co-read-chat__tab--active {
  background: var(--primary, #6366f1);
  border-color: var(--primary, #6366f1);
  color: var(--primary-foreground, #fff);
}
.co-read-chat__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 999px;
  background: transparent;
  color: var(--muted-foreground, #6b7280);
  cursor: pointer;
  transition: all 0.15s;
}
.co-read-chat__close:hover {
  color: var(--foreground, #111827);
  background: var(--accent, #f3f4f6);
}
</style>
