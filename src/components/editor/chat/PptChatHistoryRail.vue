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

      <div v-if="!collapsed" class="ppt-chat-rail-body">
        <component
          :is="isExpandable(item) ? 'button' : 'div'"
          v-for="item in items"
          :key="item.id"
          type="button"
          class="ppt-chat-rail-item"
          :class="[
            item.role === 'user' ? 'ppt-chat-rail-item--user' : 'ppt-chat-rail-item--ai',
            { 'ppt-chat-rail-item--expandable': isExpandable(item) },
          ]"
          @click="isExpandable(item) && $emit('open-detail', { term: item.term, content: item.content })"
        >
          <p class="ppt-chat-rail-role">
            {{ item.role === 'user' ? t('workspace.roleUser') : t('workspace.roleAi') }}
          </p>
          <p class="ppt-chat-rail-content" :class="{ 'ppt-chat-rail-content--clamp': isExpandable(item) }">
            {{ isExpandable(item) ? toPreview(item.content) : item.content }}
          </p>
          <span v-if="isExpandable(item)" class="ppt-chat-rail-expand">
            {{ t('workspace.chatHistoryPanel.viewFull') }}
          </span>
        </component>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { PanelRightClose, PanelRightOpen } from 'lucide-vue-next'

defineProps({
  items: { type: Array, default: () => [] },
})

defineEmits(['open-detail'])

const collapsed = defineModel('collapsed', { type: Boolean, default: false })

const { t } = useI18n()

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
</script>

<style scoped lang="scss">
.ppt-chat-rail {
  position: relative;
  flex: 0 0 18rem;
  width: 18rem;
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

.ppt-chat-rail-body {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ppt-chat-rail-item {
  display: block;
  width: 100%;
  text-align: left;
  border-radius: 0.625rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-family: inherit;
  color: inherit;
}

.ppt-chat-rail-item--user {
  background: rgba(255, 255, 255, 0.04);
}

.ppt-chat-rail-item--ai {
  background: rgba(79, 110, 247, 0.08);
}

button.ppt-chat-rail-item {
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.ppt-chat-rail-item--expandable:hover {
  border-color: rgba(79, 110, 247, 0.55);
  background: rgba(79, 110, 247, 0.16);
}

.ppt-chat-rail-content--clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ppt-chat-rail-expand {
  display: inline-block;
  margin-top: 0.45rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #8ea2ff;
}

.ppt-chat-rail-role {
  margin: 0 0 0.35rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.ppt-chat-rail-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.45;
}

@media (max-width: 767px) {
  .ppt-chat-rail {
    flex: 0 0 auto !important;
    width: 100% !important;
    max-width: 100% !important;
    align-self: stretch;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-height: min(40vh, 280px);
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
