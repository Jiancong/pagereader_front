<template>
  <section id="community-conversations" class="mt-4 rounded-xl border border-border bg-card p-4">
    <h3 class="mb-1 font-semibold text-foreground">{{ t('community.conversationFeed.title') }}</h3>
    <p class="mb-3 text-xs text-muted-foreground">{{ t('community.conversationFeed.subtitle') }}</p>

    <ul v-if="sortedItems.length" class="space-y-4">
      <li
        v-for="item in sortedItems"
        :key="item.id"
        class="border-t border-border pt-4 first:border-t-0 first:pt-0"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-foreground">
            {{ t('community.conversationFeed.aboutTerm', { term: item.term || '…' }) }}
          </p>
          <span v-if="item.createTime" class="shrink-0 text-xs text-muted-foreground">
            {{ formatTime(item.createTime) }}
          </span>
        </div>
        <div v-if="item.answer?.trim()" class="community-conversation-answer mt-2">
          <ChatMarkdownBody
            :content="item.answer"
            root-class="community-conversation-md"
          />
        </div>
        <p v-else class="mt-2 text-xs italic text-muted-foreground">
          {{ t('community.conversationFeed.noAnswer') }}
        </p>
      </li>
    </ul>

    <p v-else class="py-4 text-sm text-muted-foreground">
      {{ t('community.conversationFeed.empty') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ChatMarkdownBody from '@/components/editor/chat/ChatMarkdownBody.vue'
import type { ConversationFeedItem } from '@/utils/projectConversationFeed'
import { formatCommentTime } from '@/utils/projectCommunity'

const props = withDefaults(
  defineProps<{
    items: ConversationFeedItem[]
  }>(),
  {
    items: () => [],
  },
)

const { t } = useI18n()

const sortedItems = computed(() =>
  [...props.items].sort((a, b) => {
    const ta = Date.parse(a.createTime || '')
    const tb = Date.parse(b.createTime || '')
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id))
  }),
)

function formatTime(iso: string): string {
  return formatCommentTime(iso)
}
</script>

<style scoped lang="scss">
.community-conversation-answer {
  min-width: 0;
}

:deep(.community-conversation-md .markdown-body) {
  color: inherit;
  font-size: 0.875rem;
  line-height: 1.65;
}

:deep(.community-conversation-md .markdown-body p),
:deep(.community-conversation-md .markdown-body li) {
  color: hsl(var(--muted-foreground));
  margin: 0.5em 0;
}

:deep(.community-conversation-md .markdown-body h2),
:deep(.community-conversation-md .markdown-body h3),
:deep(.community-conversation-md .markdown-body h4) {
  color: hsl(var(--foreground));
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0.85em 0 0.35em;
}

:deep(.community-conversation-md .markdown-body strong) {
  color: hsl(var(--foreground));
  font-weight: 600;
}

:deep(.community-conversation-md .markdown-body code) {
  font-size: 0.8125rem;
}

:deep(.community-conversation-md .markdown-body pre) {
  margin: 0.65em 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: hsl(var(--muted) / 0.45);
  overflow-x: auto;
}

:deep(.community-conversation-md .markdown-body ul),
:deep(.community-conversation-md .markdown-body ol) {
  padding-left: 1.25rem;
  margin: 0.5em 0;
}

:deep(.community-conversation-md .chat-md-math--display) {
  margin: 0.65em 0;
  overflow-x: auto;
}
</style>
