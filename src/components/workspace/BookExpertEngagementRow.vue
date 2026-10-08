<template>
  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
    <span class="inline-flex items-center gap-1 tabular-nums" :title="t('bookExpert.openCountHint')">
      <Eye class="h-3 w-3 flex-shrink-0" />
      {{ openCount }}
    </span>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 tabular-nums transition-colors hover:text-foreground disabled:opacity-50"
      :class="liked ? 'text-primary' : ''"
      :disabled="liking"
      :aria-label="liked ? t('workspace.unfavorite') : t('workspace.favorite')"
      :aria-pressed="liked"
      @click.stop="$emit('toggle-like')"
    >
      <Loader2 v-if="liking" class="h-3 w-3 animate-spin" />
      <Heart v-else class="h-3 w-3" :class="liked ? 'fill-current' : ''" />
      {{ likeCount }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Eye, Heart, Loader2 } from "lucide-vue-next"
import type { BookExpertSummary } from "@/api/types"
import {
  bookExpertLikeCount,
  bookExpertLikedByMe,
  bookExpertOpenCount,
} from "@/utils/bookExpertEngagement"

const props = defineProps<{
  expert: BookExpertSummary
  liking?: boolean
}>()

defineEmits<{ "toggle-like": [] }>()

const { t } = useI18n()

const openCount = computed(() => bookExpertOpenCount(props.expert))
const likeCount = computed(() => bookExpertLikeCount(props.expert))
const liked = computed(() => bookExpertLikedByMe(props.expert))
</script>
