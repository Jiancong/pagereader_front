<template>
  <div
    class="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    :class="centered ? 'justify-center' : ''"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="cat in tabOptions"
      :key="cat.id"
      type="button"
      role="tab"
      class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm"
      :class="
        modelValue === cat.id
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
      "
      :aria-selected="modelValue === cat.id"
      @click="emit('update:modelValue', cat.id)"
    >
      {{ cat.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useExploreTopicCategories } from '@/composables/useExploreTopicCategories'
import type { ExploreTopicCategory } from '@/constants/exploreTopicCategories'

defineProps<{
  modelValue: ExploreTopicCategory
  ariaLabel: string
  centered?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExploreTopicCategory]
}>()

const { tabOptions } = useExploreTopicCategories()
</script>
