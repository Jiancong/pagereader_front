<template>
  <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[9px] text-muted-foreground sm:mt-2 sm:gap-x-3 sm:text-xs">
    <span class="inline-flex items-center gap-0.5 tabular-nums sm:gap-1" :title="t('bookExpert.openCountHint')">
      <Eye class="h-2.5 w-2.5 flex-shrink-0 sm:h-3 sm:w-3" />
      {{ openCount }}
    </span>
    <button
      type="button"
      class="inline-flex items-center gap-0.5 rounded-md px-0.5 py-px tabular-nums transition-colors hover:text-foreground disabled:opacity-50 sm:gap-1 sm:py-0.5"
      :class="liked ? 'text-primary' : ''"
      :disabled="liking"
      :aria-label="liked ? t('workspace.unfavorite') : t('workspace.favorite')"
      :aria-pressed="liked"
      @click.stop="$emit('toggle-like')"
    >
      <Loader2 v-if="liking" class="h-2.5 w-2.5 animate-spin sm:h-3 sm:w-3" />
      <Heart v-else class="h-2.5 w-2.5 sm:h-3 sm:w-3" :class="liked ? 'fill-current' : ''" />
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
