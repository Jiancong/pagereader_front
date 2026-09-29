<template>
  <div class="book-expert-chat">
    <div class="book-expert-chat__shell">
    <header class="be-chat__header">
      <button type="button" class="be-chat__back" @click="$emit('exit')">
        <ArrowLeft class="h-4 w-4" /> {{ t('bookExpert.exitExpert') }}
      </button>
      <div class="be-chat__title-row">
        <span class="be-chat__badge">{{ t('bookExpert.expertBadge') }}</span>
        <h2 class="be-chat__title">{{ expert.expert_name }}</h2>
      </div>
      <p v-if="expert.book_title" class="be-chat__book">{{ expert.book_title }}</p>
    </header>

    <div ref="scrollRef" class="be-chat__messages">
      <div v-if="!messages.length" class="be-chat__empty">{{ t('bookExpert.chatEmpty') }}</div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="be-chat__msg"
        :class="`be-chat__msg--${msg.role}`"
      >
        <div class="be-chat__msg-bubble">
          <ChatMarkdownBody v-if="msg.role === 'assistant'" :content="msg.content" />
          <p v-else class="be-chat__msg-text">{{ msg.content }}</p>
        </div>
      </div>
      <div v-if="generating" class="be-chat__msg be-chat__msg--assistant">
        <div class="be-chat__msg-bubble be-chat__msg-bubble--loading">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>{{ t('bookExpert.thinking') }}</span>
        </div>
      </div>
    </div>

    <form class="be-chat__input-bar" @submit.prevent="onSend">
      <textarea
        v-model="input"
        class="be-chat__input"
        rows="2"
        :placeholder="t('bookExpert.inputPlaceholder', { name: expert.expert_name })"
        :disabled="generating"
        @keydown.enter.exact.prevent="onSend"
      />
      <button type="submit" class="be-chat__send" :disabled="generating || !input.trim()">
        <Send class="h-4 w-4" />
      </button>
    </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Loader2, Send } from 'lucide-vue-next'
import { agentApi, ApiError, isCreditsInsufficient } from '@/api'
import { toBookExpertSkillName } from '@/api/bookExpert'
import { getOrCreateSessionId } from '@/api/agent'
import ChatMarkdownBody from '@/components/editor/chat/ChatMarkdownBody.vue'
import type { BookExpertSummary } from '@/api/types'

const props = defineProps<{ expert: BookExpertSummary; userId: string | null; projectId: string }>()
const emit = defineEmits<{ exit: [] }>()

const { t } = useI18n()

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string }
const messages = ref<ChatMessage[]>([])
const input = ref('')
const generating = ref(false)
const scrollRef = ref<HTMLElement | null>(null)
let abortController: AbortController | null = null
const sessionId = getOrCreateSessionId()

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function onSend() {
  const text = input.value.trim()
  if (!text || generating.value || !props.userId) return
  const userMsg: ChatMessage = { id: newId(), role: 'user', content: text }
  messages.value.push(userMsg)
  input.value = ''
  scrollToBottom()
  generating.value = true
  abortController?.abort()
  abortController = new AbortController()

  let assistantText = ''
  const assistantMsg: ChatMessage = { id: newId(), role: 'assistant', content: '' }
  messages.value.push(assistantMsg)

  try {
    await agentApi.chatStream(
      {
        message: text,
        userId: props.userId,
        projectId: props.projectId,
        sessionId,
        isAgent: true,
        skill: true,
        skillName: toBookExpertSkillName(props.expert.expert_id),
        streamRequestId: `expert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      {
        onEvent: (event, data) => {
          if (event === 'knowledge_response' || event === 'complete') {
            const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
            const response = typeof o.response === 'string' ? o.response : ''
            if (response) {
              assistantText += response
              assistantMsg.content = assistantText
              scrollToBottom()
            }
          }
        },
        onError: (msg) => {
          assistantMsg.content = assistantText || msg
          if (isCreditsInsufficientMessage(msg)) {
            ElMessage.error(t('workspace.creditsInsufficient'))
          }
        },
        onComplete: (data) => {
          const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
          const response = typeof o.response === 'string' ? o.response : ''
          if (response && !assistantText) {
            assistantText = response
            assistantMsg.content = response
          }
          if (!assistantMsg.content) assistantMsg.content = t('bookExpert.noResponse')
          scrollToBottom()
        },
      },
      abortController.signal,
    )
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') return
    const msg = e instanceof ApiError ? e.message : (e as Error)?.message || t('bookExpert.chatFailed')
    assistantMsg.content = assistantText || msg
    if (isCreditsInsufficient(e)) ElMessage.error(t('workspace.creditsInsufficient'))
  } finally {
    generating.value = false
    scrollToBottom()
  }
}

function isCreditsInsufficientMessage(msg: string): boolean {
  return /CREDITS_INSUFFICIENT|积分不足/i.test(msg)
}

onBeforeUnmount(() => {
  abortController?.abort()
})

watch(() => props.expert.expert_id, () => {
  messages.value = []
  input.value = ''
})
</script>

<style scoped>
.book-expert-chat {
  /* 调色板对齐 tailwind.config.js（项目无 shadcn CSS 变量，hsl(var(--x)) 全部无效，
     此前「边框不显眼」的根因即在此） */
  --be-bg: #0f1419;
  --be-bg-rgb: 15, 20, 25;
  --be-fg: #e7e9ea;
  --be-fg-rgb: 231, 233, 234;
  --be-fg-muted: #71767b;
  --be-card: #16202a;
  --be-card-rgb: 22, 32, 42;
  --be-border: #2f3336;
  --be-border-rgb: 47, 51, 54;
  --be-primary: #1d9bf0;
  --be-primary-rgb: 29, 155, 240;
  --be-primary-fg: #ffffff;

  display: flex; flex-direction: column; height: 100%; min-height: 0;
  max-width: 48rem; margin: 0 auto; width: 100%;
}
.book-expert-chat__shell {
  flex: 1; display: flex; flex-direction: column; min-height: min(720px, calc(100dvh - 7rem));
  border: 1px solid var(--be-border);
  border-radius: 1rem;
  background: var(--be-card);
  box-shadow: 0 25px 50px -12px rgba(var(--be-fg-rgb), 0.18);
  overflow: hidden;
}
.be-chat__header {
  flex-shrink: 0; padding: 16px 20px 14px;
  border-bottom: 1px solid var(--be-border);
  background: linear-gradient(
    180deg,
    rgb(var(--be-card-rgb)) 0%,
    rgba(var(--be-card-rgb), 0.92) 100%
  );
}
.be-chat__back {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: transparent; padding: 4px 0;
  font-size: 13px; color: var(--be-fg-muted); cursor: pointer;
  transition: color 0.15s;
}
.be-chat__back:hover { color: var(--be-fg); }
.be-chat__title-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.be-chat__badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;
  background: rgba(var(--be-primary-rgb), 0.14); color: var(--be-primary);
}
.be-chat__title { font-size: 18px; font-weight: 700; color: var(--be-fg); margin: 0; }
.be-chat__book { margin-top: 4px; font-size: 13px; color: var(--be-fg-muted); }
.be-chat__messages {
  flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 12px;
  background: var(--be-bg);
}
.be-chat__empty {
  margin: auto; max-width: 22rem; text-align: center;
  font-size: 14px; line-height: 1.6;
  padding: 20px 18px; border-radius: 12px;
  color: rgba(var(--be-fg-rgb), 0.78);
  border: 1px dashed var(--be-border);
  background: rgba(var(--be-bg-rgb), 0.88);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.be-chat__msg { display: flex; }
.be-chat__msg--user { justify-content: flex-end; }
.be-chat__msg--assistant { justify-content: flex-start; }
.be-chat__msg-bubble {
  max-width: 80%; padding: 10px 14px; border-radius: 14px;
  font-size: 14px; line-height: 1.6; word-break: break-word;
}
.be-chat__msg--user .be-chat__msg-bubble { background: var(--be-primary); color: var(--be-primary-fg); border-bottom-right-radius: 4px; }
.be-chat__msg--assistant .be-chat__msg-bubble {
  background: var(--be-card); color: var(--be-fg);
  border: 1px solid var(--be-border);
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.be-chat__msg-bubble--loading { display: inline-flex; align-items: center; gap: 8px; color: var(--be-fg-muted); }
.be-chat__msg-text { margin: 0; white-space: pre-wrap; }
.be-chat__input-bar {
  flex-shrink: 0;
  display: flex; gap: 8px; align-items: flex-end;
  margin: 0; padding: 14px 16px;
  border-top: 1px solid var(--be-border);
  background: var(--be-card);
}
.be-chat__input {
  flex: 1; resize: none; padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(var(--be-fg-rgb), 0.35);
  background: var(--be-bg);
  font-size: 14px; color: var(--be-fg); line-height: 1.5;
}
.be-chat__input::placeholder { color: var(--be-fg-muted); }
.be-chat__input:focus {
  outline: none;
  border-color: var(--be-primary);
  box-shadow: 0 0 0 3px rgba(var(--be-primary-rgb), 0.25);
}
.be-chat__send {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: var(--be-primary); color: var(--be-primary-fg); cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.be-chat__send:hover:not(:disabled) { background: rgba(var(--be-primary-rgb), 0.88); }
.be-chat__send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
