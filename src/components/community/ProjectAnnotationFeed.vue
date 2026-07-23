<template>
  <section id="community-annotations" class="mt-4 rounded-xl border border-border bg-card p-4">
    <h3 class="mb-1 font-semibold text-foreground">{{ t('community.annotationFeed.title') }}</h3>
    <p class="mb-3 text-xs text-muted-foreground">{{ t('community.annotationFeed.subtitle') }}</p>

    <p v-if="error" class="mb-3 text-sm text-red-400">{{ error }}</p>

    <div v-if="loading" class="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      {{ t('workspace.loading') }}
    </div>

    <ul v-else-if="sortedItems.length" class="space-y-4">
      <li
        v-for="item in sortedItems"
        :key="item.id"
        class="border-t border-border pt-4 first:border-t-0 first:pt-0"
      >
        <div class="flex items-center gap-2">
          <img
            v-if="item.userAvatarUrl"
            :src="item.userAvatarUrl"
            :alt="displayName(item)"
            class="h-6 w-6 rounded-full object-cover"
          />
          <span
            v-else
            class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
            aria-hidden="true"
          >
            {{ initials(item) }}
          </span>
          <span class="text-sm font-medium text-foreground">{{ displayName(item) }}</span>
          <span class="text-xs text-muted-foreground">{{ formatTime(item.createTime) }}</span>
        </div>

        <p v-if="item.sectionLabel" class="mt-1.5 text-xs text-muted-foreground">
          {{ t('community.annotationFeed.section', { label: item.sectionLabel }) }}
        </p>

        <blockquote
          class="mt-2 border-l-2 border-amber-400/70 bg-amber-400/10 px-3 py-2 text-sm leading-relaxed text-foreground"
        >
          「{{ previewText(item.selectedText) }}」
        </blockquote>

        <p
          v-if="item.note?.trim()"
          class="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground"
        >
          {{ item.note.trim() }}
        </p>
        <p v-else class="mt-2 text-xs italic text-muted-foreground">
          {{ t('community.annotationFeed.highlightOnly') }}
        </p>
      </li>
    </ul>

    <p v-else class="py-4 text-sm text-muted-foreground">
      {{ t('community.annotationFeed.empty') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import type { ProjectAnnotation } from '@/api/types'
import { formatCommentTime } from '@/utils/projectCommunity'

const props = withDefaults(
  defineProps<{
    items: ProjectAnnotation[]
    loading?: boolean
    error?: string
  }>(),
  {
    items: () => [],
    loading: false,
    error: '',
  },
)

const { t } = useI18n()

/** 按 createTime 升序（时间顺序记录） */
const sortedItems = computed(() =>
  [...props.items].sort((a, b) => {
    const ta = Date.parse(a.createTime || '')
    const tb = Date.parse(b.createTime || '')
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id))
  }),
)

function displayName(item: ProjectAnnotation): string {
  const nick = String(item.userNickname || '').trim()
  if (nick) return nick
  const uid = item.userId
  if (uid != null && String(uid).trim()) {
    return t('community.userFallback', { id: uid })
  }
  return t('community.annotationFeed.anonymous')
}

function initials(item: ProjectAnnotation): string {
  const name = displayName(item)
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

function formatTime(iso?: string): string {
  return formatCommentTime(iso || '')
}

function previewText(text: string): string {
  const s = String(text || '').trim()
  if (s.length <= 160) return s
  return `${s.slice(0, 160)}…`
}
</script>
