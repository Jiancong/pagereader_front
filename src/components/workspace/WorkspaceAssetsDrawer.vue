<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex">
      <button
        type="button"
        class="absolute inset-0 bg-black/40"
        :aria-label="t('workspace.assets.close')"
        @click="$emit('close')"
      />

      <aside
        :class="[
          'relative flex h-full flex-col border-r border-border bg-card shadow-xl transition-[margin,width] duration-300 ease-in-out',
          sidebarCollapsed
            ? 'ml-16 w-[min(24rem,calc(100vw-4rem))]'
            : 'ml-64 w-[min(24rem,calc(100vw-16rem))]',
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="text-sm font-semibold text-foreground">{{ t('workspace.assets.title') }}</h3>
          <button
            type="button"
            class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            :aria-label="t('workspace.assets.close')"
            @click="$emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden p-3">
          <WorkspaceUserAssetsPanel
            ref="panelRef"
            :user-id="userId"
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import WorkspaceUserAssetsPanel from './WorkspaceUserAssetsPanel.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  userId: { type: [String, Number], default: null },
  sidebarCollapsed: { type: Boolean, default: false },
})

defineEmits(['close'])

const { t } = useI18n()
const panelRef = ref(null)

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    panelRef.value?.refresh?.()
  },
)
</script>
