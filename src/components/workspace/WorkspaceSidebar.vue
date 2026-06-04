<template>
  <aside class="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card">
    <div class="flex h-16 items-center gap-2 border-b border-border px-4">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <Presentation class="h-5 w-5 text-primary-foreground" />
      </div>
      <span class="text-lg font-bold text-foreground">{{ t('app.brand') }}</span>
    </div>

    <div class="space-y-1 p-3">
      <button :class="btnClass(view === 'new')" @click="$emit('new')">
        <Plus class="h-4 w-4" /> {{ t('workspace.newGenerate') }}
      </button>
      <button :class="btnClass(view === 'explore')" @click="$emit('explore')">
        <Compass class="h-4 w-4" /> {{ t('workspace.explore') }}
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col px-3">
      <p class="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ t('workspace.myHistory') }}</p>
      <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <div v-if="loadingProjects" class="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" /> {{ t('workspace.loading') }}
        </div>
        <p v-else-if="!myProjects.length" class="px-2 py-2 text-xs text-muted-foreground/70">{{ t('workspace.noHistory') }}</p>
        <button
          v-for="p in myProjects"
          v-else
          :key="p.id"
          :title="p.name || p.title || p.id"
          :class="[
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
            view === 'project' && activeProjectId === p.id
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
          ]"
          @click="$emit('open-project', p.id)"
        >
          <FileText class="h-4 w-4 flex-shrink-0" />
          <span class="truncate">{{ p.name || p.title || t('workspace.unnamedProject') }}</span>
        </button>
      </div>
    </div>

    <div class="border-t border-border p-3 space-y-3">
      <WorkspaceCreditsBar />
      <LocaleSwitcher />
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm text-muted-foreground">{{ nickName || t('workspace.loggedIn') }}</span>
        <button
          :title="t('workspace.logout')"
          class="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('logout')"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Presentation, Plus, Compass, LogOut, FileText, Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '../LocaleSwitcher.vue'
import WorkspaceCreditsBar from './WorkspaceCreditsBar.vue'

defineProps({
  view: { type: String, default: 'new' },
  activeProjectId: { type: String, default: null },
  nickName: { type: String, default: '' },
  myProjects: { type: Array, default: () => [] },
  loadingProjects: { type: Boolean, default: false },
})
defineEmits(['new', 'explore', 'open-project', 'logout'])

const { t } = useI18n()

const btnClass = (active) => [
  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
]
</script>
