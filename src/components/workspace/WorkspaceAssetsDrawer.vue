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
        class="relative ml-64 flex h-full w-[min(24rem,calc(100vw-16rem))] flex-col border-r border-border bg-card shadow-xl"
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

        <div
          v-if="showScopeTabs"
          class="flex gap-1 border-b border-border px-3 py-2"
          role="tablist"
        >
          <button
            v-for="tab in scopeTabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="scope === tab.id"
            :class="[
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              scope === tab.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="scope = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden p-3">
          <WorkspaceUserAssetsPanel
            :key="panelKey"
            ref="panelRef"
            :user-id="userId"
            :project-id="scopedProjectId"
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import WorkspaceUserAssetsPanel from './WorkspaceUserAssetsPanel.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  userId: { type: [String, Number], default: null },
  activeProjectId: { type: String, default: null },
})

defineEmits(['close'])

const { t } = useI18n()
const scope = ref('account')
const panelRef = ref(null)

const showScopeTabs = computed(() => Boolean(props.activeProjectId))

const scopeTabs = computed(() => [
  { id: 'project', label: t('workspace.assets.thisProject') },
  { id: 'account', label: t('workspace.assets.accountLibrary') },
])

const scopedProjectId = computed(() => {
  if (!showScopeTabs.value) return ''
  return scope.value === 'project' ? props.activeProjectId || '' : ''
})

const panelKey = computed(() => `${scope.value}:${scopedProjectId.value || 'all'}`)

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    if (props.activeProjectId) scope.value = 'project'
    else scope.value = 'account'
    await nextTick()
    panelRef.value?.refresh?.()
  },
)

watch(
  () => props.activeProjectId,
  (id) => {
    if (!id && scope.value === 'project') scope.value = 'account'
  },
)
</script>
