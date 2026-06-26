<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex h-full flex-col overflow-hidden border-r border-border bg-card transition-transform duration-300 ease-in-out md:static md:z-auto md:flex-shrink-0 md:translate-x-0 md:transition-[width]',
      isCollapsed ? 'w-64 md:w-16' : 'w-64',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <div
      :class="[
        'flex h-16 flex-shrink-0 items-center border-b border-border',
        isCollapsed ? 'justify-center px-2' : 'gap-2 px-4',
      ]"
    >
      <AppBrandMark class="flex-shrink-0" />
      <span v-if="!isCollapsed" class="min-w-0 flex-1 truncate text-lg font-bold text-foreground">
        {{ t('app.brand') }}
      </span>
      <button
        v-if="!isCollapsed"
        type="button"
        :title="t('workspace.sidebar.collapse')"
        :aria-label="t('workspace.sidebar.collapse')"
        class="hidden flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:block"
        @click="setCollapsed(true)"
      >
        <PanelLeftClose class="h-4 w-4" />
      </button>
      <button
        type="button"
        :aria-label="t('workspace.sidebar.collapse')"
        class="flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
        @click="$emit('close-mobile')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <button
      v-if="isCollapsed"
      type="button"
      :title="t('workspace.sidebar.expand')"
      :aria-label="t('workspace.sidebar.expand')"
      class="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      @click="setCollapsed(false)"
    >
      <PanelLeftOpen class="h-4 w-4" />
    </button>

    <div :class="['space-y-1', isCollapsed ? 'p-2' : 'p-3']">
      <button
        :title="t('workspace.newGenerate')"
        :class="navBtnClass(view === 'new')"
        @click="$emit('new')"
      >
        <Plus class="h-4 w-4 flex-shrink-0" />
        <span v-if="!isCollapsed" class="truncate">{{ t('workspace.newGenerate') }}</span>
      </button>
      <button
        :title="t('workspace.explore')"
        :class="navBtnClass(view === 'explore')"
        @click="$emit('explore')"
      >
        <Compass class="h-4 w-4 flex-shrink-0" />
        <span v-if="!isCollapsed" class="truncate">{{ t('workspace.explore') }}</span>
      </button>
      <button
        :title="t('workspace.assets.nav')"
        :class="navBtnClass(assetsOpen)"
        @click="assetsOpen = !assetsOpen"
      >
        <Images class="h-4 w-4 flex-shrink-0" />
        <span v-if="!isCollapsed" class="truncate">{{ t('workspace.assets.nav') }}</span>
      </button>
    </div>

    <div :class="['flex min-h-0 flex-1 flex-col', isCollapsed ? 'px-2' : 'px-3']">
      <p
        v-if="!isCollapsed"
        class="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        {{ t('workspace.myHistory') }}
      </p>
      <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <div
          v-if="loadingProjects"
          :class="[
            'flex items-center text-sm text-muted-foreground',
            isCollapsed ? 'justify-center py-2' : 'gap-2 px-2 py-2',
          ]"
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          <span v-if="!isCollapsed">{{ t('workspace.loading') }}</span>
        </div>
        <p
          v-else-if="!myProjects.length && !isCollapsed"
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
            isCollapsed ? 'justify-center p-1' : 'gap-1 pr-1',
            activeProjectId === p.id ? 'bg-secondary' : 'hover:bg-secondary/60',
          ]"
        >
          <button
            :title="projectDisplayTitle(p)"
            :class="[
              'flex items-center rounded-lg text-sm transition-colors',
              isCollapsed
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
                isCollapsed ? 'h-8 w-8' : 'h-8 w-8',
              ]"
              loading="lazy"
            />
            <FileText v-else :class="['flex-shrink-0', isCollapsed ? 'h-5 w-5' : 'h-4 w-4']" />
            <span v-if="!isCollapsed" class="truncate">{{ projectDisplayTitle(p) }}</span>
          </button>
          <button
            v-if="!isCollapsed"
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

    <div :class="['border-t border-border', isCollapsed ? 'space-y-2 p-2' : 'space-y-3 p-3']">
      <WorkspaceCreditsBar v-if="!isCollapsed" />
      <LocaleSwitcher v-if="!isCollapsed" />
      <div
        :class="[
          'flex items-center',
          isCollapsed ? 'flex-col gap-2' : 'justify-between gap-2',
        ]"
      >
        <div
          :class="[
            'flex min-w-0 items-center',
            isCollapsed ? 'justify-center' : 'gap-2',
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
          <span v-if="!isCollapsed" class="truncate text-sm text-muted-foreground">
            {{ nickName || t('workspace.loggedIn') }}
          </span>
        </div>
        <button
          :title="t('workspace.logout')"
          :class="[
            'flex flex-shrink-0 items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            isCollapsed ? 'p-1.5' : 'gap-1 px-2 py-1.5 text-sm',
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
      :sidebar-collapsed="isCollapsed"
      @close="assetsOpen = false"
      @select-document="onSelectDocument"
    />
  </aside>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
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
  X,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppBrandMark from '../AppBrandMark.vue'
import LocaleSwitcher from '../LocaleSwitcher.vue'
import WorkspaceCreditsBar from './WorkspaceCreditsBar.vue'
import WorkspaceAssetsDrawer from './WorkspaceAssetsDrawer.vue'

const SIDEBAR_COLLAPSED_KEY = 'workspace-sidebar-collapsed'

const props = defineProps({
  view: { type: String, default: 'new' },
  userId: { type: [String, Number], default: null },
  activeProjectId: { type: String, default: null },
  nickName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  myProjects: { type: Array, default: () => [] },
  projectTitleMap: { type: Object, default: () => ({}) },
  loadingProjects: { type: Boolean, default: false },
  deletingProjectId: { type: String, default: null },
  mobileOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['new', 'explore', 'open-project', 'delete-project', 'logout', 'select-document', 'close-mobile'])

const assetsOpen = ref(false)
const collapsed = ref(false)
const isCollapsed = computed(() => collapsed.value && !props.mobileOpen)

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
  isCollapsed.value ? 'justify-center p-2.5' : 'gap-2 px-3 py-2.5',
  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
]

function projectDisplayTitle(project) {
  const titleFromDeck = props.projectTitleMap?.[project?.id]
  return titleFromDeck || project?.name || project?.title || project?.id || t('workspace.unnamedProject')
}

function onSelectDocument(payload) {
  emit('select-document', payload)
}

onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    collapsed.value = false
  }
})
</script>
