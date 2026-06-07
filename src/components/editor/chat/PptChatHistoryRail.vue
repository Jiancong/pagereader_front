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
        <div
          v-for="item in items"
          :key="item.id"
          class="ppt-chat-rail-item"
          :class="item.role === 'user' ? 'ppt-chat-rail-item--user' : 'ppt-chat-rail-item--ai'"
        >
          <p class="ppt-chat-rail-role">
            {{ item.role === 'user' ? t('workspace.roleUser') : t('workspace.roleAi') }}
          </p>
          <p class="ppt-chat-rail-content">{{ item.content }}</p>
        </div>
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

const collapsed = defineModel('collapsed', { type: Boolean, default: false })

const { t } = useI18n()
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
  border-radius: 0.625rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
}

.ppt-chat-rail-item--user {
  background: rgba(255, 255, 255, 0.04);
}

.ppt-chat-rail-item--ai {
  background: rgba(79, 110, 247, 0.08);
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
</style>
