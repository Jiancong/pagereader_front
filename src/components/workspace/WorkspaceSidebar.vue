<template>
  <aside
    :class="[
      'relative flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <div
      :class="[
        'flex h-16 flex-shrink-0 items-center border-b border-border',
        collapsed ? 'justify-center px-2' : 'gap-2 px-4',
      ]"
    >
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
        <Presentation class="h-5 w-5 text-primary-foreground" />
      </div>
      <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-lg font-bold text-foreground">
        {{ t('app.brand') }}
      </span>
      <button
        v-if="!collapsed"
        type="button"
        :title="t('workspace.sidebar.collapse')"
        :aria-label="t('workspace.sidebar.collapse')"
        class="flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        @click="setCollapsed(true)"
      >
        <PanelLeftClose class="h-4 w-4" />
      </button>
    </div>

    <button
      v-if="collapsed"
      type="button"
      :title="t('workspace.sidebar.expand')"
      :aria-label="t('workspace.sidebar.expand')"
      class="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      @click="setCollapsed(false)"
    >
      <PanelLeftOpen class="h-4 w-4" />
    </button>

    <div :class="['space-y-1', collapsed ? 'p-2' : 'p-3']">
      <button
        :title="t('workspace.newGenerate')"
        :class="navBtnClass(view === 'new')"
        @click="$emit('new')"
      >
        <Plus class="h-4 w-4 flex-shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ t('workspace.newGenerate') }}</span>
      </button>
      <button
        :title="t('workspace.explore')"
        :class="navBtnClass(view === 'explore')"
        @click="$emit('explore')"
      >
        <Compass class="h-4 w-4 flex-shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ t('workspace.explore') }}</span>
      </button>
      <button
        :title="t('workspace.assets.nav')"
        :class="navBtnClass(assetsOpen)"
        @click="assetsOpen = !assetsOpen"
      >
        <Images class="h-4 w-4 flex-shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ t('workspace.assets.nav') }}</span>
      </button>
    </div>

    <div :class="['flex min-h-0 flex-1 flex-col', collapsed ? 'px-2' : 'px-3']">
      <p
        v-if="!collapsed"
        class="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        {{ t('workspace.myHistory') }}
      </p>
      <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <div
          v-if="loadingProjects"
          :class="[
            'flex items-center text-sm text-muted-foreground',
            collapsed ? 'justify-center py-2' : 'gap-2 px-2 py-2',
          ]"
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          <span v-if="!collapsed">{{ t('workspace.loading') }}</span>
        </div>
        <p
          v-else-if="!myProjects.length && !collapsed"
          class="px-2 py-2 text-xs text-muted-foreground/70"
        >
          {{ t('workspace.noHistory') }}
        </p>
        <div
          v-for="p in myProjects"
          v-else
          :key="p.id"
          :class="[
            'group flex w-full items-center rounded-lg transition-colors',
            collapsed ? 'justify-center p-1' : 'gap-1 pr-1',
            activeProjectId === p.id ? 'bg-secondary' : 'hover:bg-secondary/60',
          ]"
        >
          <button
            :title="p.name || p.title || p.id"
            :class="[
              'flex items-center rounded-lg text-sm transition-colors',
              collapsed
                ? 'p-1.5'
                : 'min-w-0 flex-1 gap-2 px-2 py-2 text-left',
              activeProjectId === p.id
                ? 'text-foreground'
                : 'text-muted-foreground group-hover:text-foreground',
            ]"
            @click="$emit('open-project', p.id)"
          >
            <img
              v-if="p.thumbnailUrl"
              :src="p.thumbnailUrl"
              alt=""
              :class="[
                'flex-shrink-0 rounded object-cover',
                collapsed ? 'h-8 w-8' : 'h-8 w-8',
              ]"
              loading="lazy"
            />
            <FileText v-else :class="['flex-shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4']" />
            <span v-if="!collapsed" class="truncate">{{ p.name || p.title || t('workspace.unnamedProject') }}</span>
          </button>
          <button
            v-if="!collapsed"
            type="button"
            :title="t('workspace.deleteProject')"
            class="flex-shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
            :disabled="deletingProjectId === p.id"
            @click.stop="$emit('delete-project', p.id)"
          >
            <Loader2 v-if="deletingProjectId === p.id" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div :class="['border-t border-border', collapsed ? 'space-y-2 p-2' : 'space-y-3 p-3']">
      <WorkspaceCreditsBar v-if="!collapsed" />
      <LocaleSwitcher v-if="!collapsed" />
      <div
        :class="[
          'flex items-center',
          collapsed ? 'flex-col gap-2' : 'justify-between gap-2',
        ]"
      >
        <div
          :class="[
            'flex min-w-0 items-center',
            collapsed ? 'justify-center' : 'gap-2',
          ]"
          :title="nickName || t('workspace.loggedIn')"
        >
          <img
            v-if="avatar"
            :src="avatar"
            :alt="nickName || t('workspace.loggedIn')"
            referrerpolicy="no-referrer"
            class="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
          <span
            v-else
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <User class="h-4 w-4" />
          </span>
          <span v-if="!collapsed" class="truncate text-sm text-muted-foreground">
            {{ nickName || t('workspace.loggedIn') }}
          </span>
        </div>
        <button
          :title="t('workspace.logout')"
          :class="[
            'flex flex-shrink-0 items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            collapsed ? 'p-1.5' : 'gap-1 px-2 py-1.5 text-sm',
          ]"
          @click="$emit('logout')"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </div>

    <WorkspaceAssetsDrawer
      :open="assetsOpen"
      :user-id="userId"
      :sidebar-collapsed="collapsed"
      @close="assetsOpen = false"
    />
  </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  Presentation,
  Plus,
  Compass,
  LogOut,
  FileText,
  Loader2,
  User,
  Trash2,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '../LocaleSwitcher.vue'
import WorkspaceCreditsBar from './WorkspaceCreditsBar.vue'
import WorkspaceAssetsDrawer from './WorkspaceAssetsDrawer.vue'

const SIDEBAR_COLLAPSED_KEY = 'workspace-sidebar-collapsed'

defineProps({
  view: { type: String, default: 'new' },
  userId: { type: [String, Number], default: null },
  activeProjectId: { type: String, default: null },
  nickName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  myProjects: { type: Array, default: () => [] },
  loadingProjects: { type: Boolean, default: false },
  deletingProjectId: { type: String, default: null },
})
defineEmits(['new', 'explore', 'open-project', 'delete-project', 'logout'])

const assetsOpen = ref(false)
const collapsed = ref(false)

const { t } = useI18n()

function setCollapsed(value) {
  collapsed.value = value
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const navBtnClass = (active) => [
  'flex w-full items-center rounded-lg text-sm font-medium transition-colors',
  collapsed.value ? 'justify-center p-2.5' : 'gap-2 px-3 py-2.5',
  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
]

onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    collapsed.value = false
  }
})
</script>
