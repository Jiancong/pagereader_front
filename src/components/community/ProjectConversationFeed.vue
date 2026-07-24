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
        <p
          v-if="item.answer"
          class="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground"
        >
          {{ previewAnswer(item.answer) }}
        </p>
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

function previewAnswer(text: string): string {
  const s = String(text || '').trim()
  if (s.length <= 480) return s
  return `${s.slice(0, 480)}…`
}
</script>
