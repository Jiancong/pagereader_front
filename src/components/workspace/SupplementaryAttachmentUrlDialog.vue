<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="close"
    >
      <form
        class="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        @submit.prevent="onSubmit"
      >
        <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
          <button
            type="button"
            class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            :aria-label="t('common.cancel')"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 px-4 py-4">
          <p class="text-[11px] leading-relaxed text-muted-foreground">{{ hint }}</p>
          <div>
            <label class="mb-1.5 block text-xs font-medium text-foreground">{{ urlLabel }}</label>
            <input
              v-model="urlInput"
              type="url"
              autocomplete="off"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2"
              :placeholder="urlPlaceholder"
              :disabled="submitting"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium text-foreground">{{ nameLabel }}</label>
            <input
              v-model="nameInput"
              type="text"
              autocomplete="off"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2"
              :placeholder="namePlaceholder"
              :disabled="submitting"
            />
          </div>
        </div>

        <div class="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            :disabled="submitting"
            @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="submitting || !urlInput.trim()"
          >
            <Loader2 v-if="submitting" class="h-3.5 w-3.5 animate-spin" />
            {{ confirmLabel }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title: string
  hint: string
  urlLabel: string
  urlPlaceholder: string
  nameLabel: string
  namePlaceholder: string
  confirmLabel: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payload: { url: string; name: string }]
}>()

const { t } = useI18n()
const urlInput = ref('')
const nameInput = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      urlInput.value = ''
      nameInput.value = ''
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:open', false)
}

function onSubmit() {
  if (props.submitting || !urlInput.value.trim()) return
  emit('confirm', {
    url: urlInput.value.trim(),
    name: nameInput.value.trim(),
  })
}
</script>
