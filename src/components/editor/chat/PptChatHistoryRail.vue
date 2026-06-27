<template>
  <aside
    class="ppt-chat-rail"
    :class="{ 'ppt-chat-rail--collapsed': collapsed }"
    :aria-label="t('workspace.chatHistory')"
  >
    <div class="ppt-chat-rail-inner">
      <div class="ppt-chat-rail-header">
        <button
          type="button"
          class="ppt-chat-rail-toggle"
          :title="collapsed ? t('workspace.chatHistoryPanel.expand') : t('workspace.chatHistoryPanel.collapse')"
          :aria-label="collapsed ? t('workspace.chatHistoryPanel.expand') : t('workspace.chatHistoryPanel.collapse')"
          @click="collapsed = !collapsed"
        >
          <PanelRightOpen v-if="collapsed" class="h-4 w-4" />
          <PanelRightClose v-else class="h-4 w-4" />
        </button>
        <h3 v-if="!collapsed" class="ppt-chat-rail-title">{{ t('workspace.chatHistory') }}</h3>
      </div>

      <template v-if="!collapsed">
        <div ref="messagesRef" class="ppt-chat-rail-messages">
          <div
            v-for="item in items"
            :key="item.id"
            class="ppt-chat-rail-row"
            :class="item.role === 'user' ? 'ppt-chat-rail-row--user' : 'ppt-chat-rail-row--ai'"
          >
            <component
              :is="isExpandable(item) ? 'button' : 'div'"
              type="button"
              class="ppt-chat-rail-bubble"
              :class="[
                item.role === 'user' ? 'ppt-chat-rail-bubble--user' : 'ppt-chat-rail-bubble--ai',
                { 'ppt-chat-rail-bubble--expandable': isExpandable(item) },
              ]"
              @click="isExpandable(item) && $emit('open-detail', { term: item.term, content: item.content })"
            >
              <p
                class="ppt-chat-rail-bubble-text"
                :class="{ 'ppt-chat-rail-bubble-text--clamp': isExpandable(item) }"
              >
                {{ isExpandable(item) ? toPreview(item.content) : item.content }}
              </p>
              <span v-if="isExpandable(item)" class="ppt-chat-rail-bubble-expand">
                {{ t('workspace.chatHistoryPanel.viewFull') }}
              </span>
            </component>
          </div>

          <template v-if="loading && pendingTerm">
            <div class="ppt-chat-rail-row ppt-chat-rail-row--user">
              <div class="ppt-chat-rail-bubble ppt-chat-rail-bubble--user">
                <p class="ppt-chat-rail-bubble-text">{{ pendingTerm }}</p>
              </div>
            </div>
            <div class="ppt-chat-rail-row ppt-chat-rail-row--ai">
              <div class="ppt-chat-rail-bubble ppt-chat-rail-bubble--ai ppt-chat-rail-bubble--pending">
                <Loader2 v-if="!streamingContent" class="ppt-chat-rail-spinner" />
                <p v-if="streamingContent" class="ppt-chat-rail-bubble-text">{{ streamingContent }}</p>
                <p v-else class="ppt-chat-rail-bubble-text ppt-chat-rail-bubble-text--muted">
                  {{ t('workspace.chatHistoryPanel.thinking') }}
                </p>
              </div>
            </div>
          </template>
        </div>

        <form class="ppt-chat-rail-compose" @submit.prevent="onSubmit">
          <input
            ref="inputRef"
            v-model="draft"
            type="text"
            class="ppt-chat-rail-input"
            :placeholder="t('agent.pptRelatedSearchInputPlaceholder')"
            :disabled="loading"
            @keydown.stop
          />
          <button
            type="submit"
            class="ppt-chat-rail-send"
            :disabled="loading || !draft.trim()"
            :aria-label="t('agent.pptRelatedSearchSubmit')"
            :title="t('agent.pptRelatedSearchSubmit')"
          >
            <Send class="h-4 w-4" />
          </button>
        </form>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, PanelRightClose, PanelRightOpen, Send } from 'lucide-vue-next'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pendingTerm: { type: String, default: '' },
  streamingContent: { type: String, default: '' },
})

const emit = defineEmits(['open-detail', 'submit-question'])

const collapsed = defineModel('collapsed', { type: Boolean, default: false })

const { t } = useI18n()
const draft = ref('')
const messagesRef = ref(null)
const inputRef = ref(null)

function isExpandable(item) {
  return item.role === 'assistant' && !!item.term && !!String(item.content || '').trim()
}

function toPreview(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function scrollToBottom() {
  await nextTick()
  const el = messagesRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function onSubmit() {
  const q = draft.value.trim()
  if (!q || props.loading) return
  draft.value = ''
  collapsed.value = false
  emit('submit-question', q)
}

watch(
  () => [props.items.length, props.loading, props.streamingContent, props.pendingTerm],
  () => scrollToBottom(),
)

watch(collapsed, (isCollapsed) => {
  if (!isCollapsed) scrollToBottom()
})
</script>

<style scoped lang="scss">
.ppt-chat-rail {
  position: relative;
  flex: 0 0 22rem;
  width: 22rem;
  min-width: 0;
  align-self: stretch;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  background: #14161e;
  overflow: hidden;
  transition: width 0.25s ease, flex-basis 0.25s ease;

  &--collapsed {
    flex: 0 0 2.5rem;
    width: 2.5rem;
  }
}

.ppt-chat-rail-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ppt-chat-rail-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.625rem 0.5rem;
  min-height: 2.75rem;
}

.ppt-chat-rail--collapsed .ppt-chat-rail-header {
  justify-content: center;
  padding: 0.625rem 0.25rem;
}

.ppt-chat-rail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

.ppt-chat-rail-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ppt-chat-rail-messages {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ppt-chat-rail-row {
  display: flex;
  width: 100%;

  &--user {
    justify-content: flex-end;
  }

  &--ai {
    justify-content: flex-start;
  }
}

.ppt-chat-rail-bubble {
  max-width: 88%;
  border-radius: 1rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  text-align: left;
  font-family: inherit;
  border: none;
  color: inherit;

  &--user {
    border-bottom-right-radius: 0.3rem;
    background: rgba(79, 110, 247, 0.88);
    color: #fff;
  }

  &--ai {
    border-bottom-left-radius: 0.3rem;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  &--pending {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    min-width: 4.5rem;
  }

  &--expandable {
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    &:hover {
      border-color: rgba(79, 110, 247, 0.45);
      background: rgba(79, 110, 247, 0.14);
    }
  }
}

button.ppt-chat-rail-bubble {
  cursor: pointer;
}

.ppt-chat-rail-bubble-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;

  &--clamp {
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &--muted {
    color: rgba(255, 255, 255, 0.55);
  }
}

.ppt-chat-rail-bubble-expand {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #8ea2ff;
}

.ppt-chat-rail-spinner {
  flex-shrink: 0;
  width: 0.95rem;
  height: 0.95rem;
  margin-top: 0.15rem;
  animation: ppt-chat-rail-spin 0.9s linear infinite;
  color: rgba(255, 255, 255, 0.55);
}

@keyframes ppt-chat-rail-spin {
  to {
    transform: rotate(360deg);
  }
}

.ppt-chat-rail-compose {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
}

.ppt-chat-rail-input {
  flex: 1;
  min-width: 0;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.8125rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, background 0.15s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  &:focus {
    border-color: rgba(79, 110, 247, 0.55);
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.ppt-chat-rail-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(79, 110, 247, 0.88);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;

  &:hover:not(:disabled) {
    background: rgba(99, 130, 255, 0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

@media (max-width: 767px) {
  .ppt-chat-rail {
    flex: 0 0 auto !important;
    width: 100% !important;
    max-width: 100% !important;
    align-self: stretch;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-height: min(44vh, 320px);
  }

  .ppt-chat-rail--collapsed {
    flex: 0 0 2.5rem !important;
    width: 100% !important;
    max-height: 2.75rem;
  }

  .ppt-chat-rail-header {
    min-height: 2.5rem;
  }
}
</style>
