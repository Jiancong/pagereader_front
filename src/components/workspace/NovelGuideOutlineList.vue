<template>
  <nav class="novel-outline-toc" aria-label="Document outline">
    <ul class="novel-outline-toc__list">
      <li
        v-for="item in items"
        :key="`${item.index ?? 'x'}-${item.title}`"
        class="novel-outline-toc__item"
        :class="`novel-outline-toc__item--${item.level}`"
      >
        <button
          type="button"
          class="novel-outline-toc__row"
          :disabled="!isJumpable(item)"
          :title="jumpTitle(item)"
          @click="emit('jump', item)"
        >
          <span v-if="item.index != null" class="novel-outline-toc__index">{{ item.index }}</span>
          <span class="novel-outline-toc__title">{{ item.title }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { NovelGuideOutlineItem } from "@/utils/novelGuideSections"

const props = defineProps<{
  items: NovelGuideOutlineItem[]
  jumpableTitles?: Set<string>
}>()

const emit = defineEmits<{
  jump: [item: NovelGuideOutlineItem]
}>()

function isJumpable(item: NovelGuideOutlineItem) {
  if (!props.jumpableTitles?.size) return false
  return props.jumpableTitles.has(item.title)
}

function jumpTitle(item: NovelGuideOutlineItem) {
  return isJumpable(item) ? item.title : undefined
}
</script>

<style scoped lang="scss">
.novel-outline-toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  overflow: hidden;
  background: hsl(var(--secondary) / 0.15);
}

.novel-outline-toc__item {
  border-bottom: 1px solid hsl(var(--border) / 0.6);

  &:last-child {
    border-bottom: none;
  }
}

.novel-outline-toc__row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.9rem;
  text-align: left;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  line-height: 1.45;

  &:not(:disabled):hover {
    background: hsl(var(--secondary) / 0.45);
    cursor: pointer;
  }

  &:disabled {
    cursor: default;
  }
}

.novel-outline-toc__index {
  flex-shrink: 0;
  min-width: 1.75rem;
  font-variant-numeric: tabular-nums;
  font-size: 0.8125rem;
  color: hsl(var(--muted-foreground));
}

.novel-outline-toc__title {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.novel-outline-toc__item--part .novel-outline-toc__row {
  background: hsl(var(--secondary) / 0.35);
  font-weight: 600;
}

.novel-outline-toc__item--part .novel-outline-toc__index {
  color: hsl(var(--primary));
}

.novel-outline-toc__item--chapter .novel-outline-toc__title {
  font-weight: 500;
}

.novel-outline-toc__item--section .novel-outline-toc__row {
  padding-left: 1.35rem;
}

.novel-outline-toc__item--section .novel-outline-toc__title {
  font-size: 0.9375rem;
  color: hsl(var(--muted-foreground));
}
</style>
