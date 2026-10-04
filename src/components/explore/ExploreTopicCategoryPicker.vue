<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="inline-flex min-w-[9rem] items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
      :aria-expanded="open"
      :aria-haspopup="true"
      :disabled="disabled || saving"
      @click="open = !open"
    >
      <span>{{ displayLabel || placeholder }}</span>
      <ChevronDown
        class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div
      v-if="open"
      class="absolute left-0 top-full z-[120] mt-1.5 min-w-full overflow-hidden rounded-xl border border-border bg-card p-1.5 text-foreground shadow-2xl"
      role="listbox"
      :aria-label="ariaLabel"
    >
      <button
        v-for="cat in options"
        :key="cat.id"
        type="button"
        role="option"
        class="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        :class="modelValue === cat.id ? 'bg-primary/10 text-primary' : 'text-foreground'"
        :aria-selected="modelValue === cat.id"
        :disabled="disabled || saving"
        @click="onPick(cat.id)"
      >
        {{ cat.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { ExploreTopicOption } from '@/constants/exploreTopicCategories'

const props = defineProps<{
  modelValue: string
  options: ExploreTopicOption[]
  displayLabel?: string | null
  placeholder: string
  ariaLabel: string
  disabled?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string]; select: [id: string] }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const displayLabel = computed(() => props.displayLabel)

function onPick(id: string) {
  open.value = false
  emit('update:modelValue', id)
  emit('select', id)
}

function onDocClick(e: MouseEvent) {
  const el = rootRef.value
  if (!el || !open.value) return
  if (e.target instanceof Node && el.contains(e.target)) return
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick, true))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true))
</script>
