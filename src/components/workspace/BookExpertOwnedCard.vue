<template>
  <div class="group relative">
    <button
      type="button"
      class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
      @click="$emit('select', expert)"
    >
      <div class="relative flex h-24 w-full items-center justify-center overflow-hidden bg-primary/10 sm:h-28">
        <img
          v-if="expert.cover_url"
          :src="expert.cover_url"
          :alt="expert.expert_name"
          class="h-full w-auto max-w-full object-contain"
          loading="lazy"
        />
        <div v-else class="flex h-full items-center justify-center">
          <BookOpen class="h-8 w-8 text-primary" />
        </div>
        <span
          v-if="showPublicBadge"
          class="absolute bottom-1 right-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur"
        >{{ t('bookExpert.publicBadge') }}</span>
      </div>
      <div class="flex flex-1 flex-col p-3">
        <p class="line-clamp-2 text-sm font-medium text-foreground">{{ expert.expert_name }}</p>
        <p v-if="expert.book_title" class="mt-1 line-clamp-1 text-xs text-muted-foreground">{{ expert.book_title }}</p>
      </div>
    </button>
    <button
      type="button"
      class="absolute left-2 top-2 z-10 rounded-lg bg-background/90 p-1.5 text-muted-foreground opacity-100 shadow-sm backdrop-blur transition-all hover:bg-primary/10 hover:text-primary md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      :title="expert.visibility === 'public' ? t('bookExpert.unpublish') : t('bookExpert.publish')"
      :aria-label="expert.visibility === 'public' ? t('bookExpert.unpublish') : t('bookExpert.publish')"
      :disabled="publishingId === expert.expert_id"
      @click.stop="$emit('toggle-publish', expert)"
    >
      <Loader2 v-if="publishingId === expert.expert_id" class="h-4 w-4 animate-spin" />
      <Globe v-else-if="expert.visibility === 'public'" class="h-4 w-4" />
      <Lock v-else class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="absolute right-2 top-2 z-10 rounded-lg bg-background/90 p-1.5 text-muted-foreground opacity-100 shadow-sm backdrop-blur transition-all hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      :title="t('bookExpert.delete')"
      :aria-label="t('bookExpert.delete')"
      :disabled="deletingId === expert.expert_id"
      @click.stop="$emit('delete', expert)"
    >
      <Loader2 v-if="deletingId === expert.expert_id" class="h-4 w-4 animate-spin" />
      <Trash2 v-else class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BookOpen, Trash2, Globe, Lock, Loader2 } from 'lucide-vue-next'
import type { BookExpertSummary } from '@/api/types'

defineProps<{
  expert: BookExpertSummary
  publishingId: string | null
  deletingId: string | null
  showPublicBadge?: boolean
}>()

defineEmits<{
  select: [expert: BookExpertSummary]
  'toggle-publish': [expert: BookExpertSummary]
  delete: [expert: BookExpertSummary]
}>()

const { t } = useI18n()
</script>
