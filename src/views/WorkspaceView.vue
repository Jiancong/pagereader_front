<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      @click="mobileSidebarOpen = false"
    />

    <WorkspaceSidebar
      :view="view"
      :user-id="userId"
      :active-project-id="activeProjectId"
      :nick-name="nickName"
      :avatar="avatar"
      :my-projects="myProjects"
      :loading-projects="loadingProjects"
      :deleting-project-id="deletingProjectId"
      :mobile-open="mobileSidebarOpen"
      @new="onSidebarNav(returnToGenerator)"
      @explore="onSidebarNav(() => (view = 'explore'))"
      @open-project="(id) => onSidebarNav(() => openProject(id))"
      @delete-project="onDeleteProject"
      @logout="handleLogout"
      @select-document="onSelectDocumentFromAssets"
      @close-mobile="mobileSidebarOpen = false"
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          :aria-label="t('workspace.sidebar.expand')"
          @click="mobileSidebarOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>
        <span class="text-base font-bold text-foreground">{{ t('app.brand') }}</span>
      </div>

      <main class="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <!-- v-show：切换探索/历史时保持生成状态与 SSE 连接 -->
      <WorkspaceGenerator
        ref="generatorRef"
        v-show="view === 'new'"
        :key="genKey"
        :initial-prompt="genPrompt"
        @project-started="onProjectStarted"
        @project-complete="onProjectComplete"
      />
      <ExploreGrid
        v-if="view === 'explore'"
        :user-id="userId"
        @open="openExploreItem"
        @deleted="onExploreProjectDeleted"
      />
      <ProjectPreview
        v-else-if="view === 'project' && activeProjectId"
        :project-id="activeProjectId"
        :refresh-key="projectRefreshKey"
        @back="view = 'explore'"
        @fork="goNew"
      />
      </main>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'WorkspaceView' })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Menu } from 'lucide-vue-next'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar.vue'
import WorkspaceGenerator from '../components/workspace/WorkspaceGenerator.vue'
import ExploreGrid from '../components/ExploreGrid.vue'
import ProjectPreview from '../components/workspace/ProjectPreview.vue'
import { authApi, feedApi, getLocalAvatar } from '../api'
import { resolveFeedOpenTarget } from '@/utils/feedOpen'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const view = ref('new')
const mobileSidebarOpen = ref(false)
const activeProjectId = ref(null)
const userId = ref(null)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const myProjects = ref([])
const loadingProjects = ref(false)
const deletingProjectId = ref(null)
const genPrompt = ref('')
const genKey = ref(0)
const projectRefreshKey = ref(0)
const generatorRef = ref(null)

/** 移动端：点击侧栏导航项后执行动作并关闭抽屉 */
const onSidebarNav = (action) => {
  action()
  mobileSidebarOpen.value = false
}

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const page = await feedApi.getMyProjects(0, 30)
    myProjects.value = page.content ?? []
  } catch {
    myProjects.value = []
  } finally {
    loadingProjects.value = false
  }
}

onMounted(async () => {
  try {
    const d = await authApi.getCurrentDetail()
    userId.value = d?.id ?? null
    nickName.value = d?.nickName || d?.email || ''
    avatar.value = d?.avatar || getLocalAvatar()
  } catch {
    /* ignore */
  }
  await loadProjects()

  // 从社区 Fork 后跳转：/workspace?project=<newId> 直接打开该项目
  const target = String(route.query.project || '').trim()
  if (target) {
    openProject(target)
    router.replace({ name: 'workspace' })
  }
})

const onDeleteProject = async (projectId) => {
  if (!projectId || deletingProjectId.value) return
  if (!window.confirm(t('workspace.deleteProjectConfirm'))) return
  deletingProjectId.value = projectId
  try {
    await feedApi.deleteProject(projectId)
    myProjects.value = myProjects.value.filter((p) => p.id !== projectId)
    if (activeProjectId.value === projectId) {
      activeProjectId.value = null
      view.value = 'new'
    }
    ElMessage.success(t('workspace.deleteProjectSuccess'))
  } catch (e) {
    ElMessage.error(e?.message || t('common.actionFailed'))
  } finally {
    deletingProjectId.value = null
  }
}

const onExploreProjectDeleted = (projectId) => {
  myProjects.value = myProjects.value.filter((p) => p.id !== projectId)
  if (activeProjectId.value === projectId) {
    activeProjectId.value = null
    view.value = 'explore'
  }
}

/** 从探索/历史回到生成页，保留进行中的任务与已生成 PPT */
const returnToGenerator = () => {
  activeProjectId.value = null
  view.value = 'new'
}

const onSelectDocumentFromAssets = (payload) => {
  returnToGenerator()
  generatorRef.value?.attachCloudDocument?.(payload)
}

/** 新建空白任务（fork 等），重置生成器 */
const goNew = (prompt = '') => {
  genPrompt.value = typeof prompt === 'string' ? prompt : ''
  genKey.value++
  activeProjectId.value = null
  view.value = 'new'
}

const highlightProject = (id) => {
  activeProjectId.value = id
}

const openProject = (id) => {
  activeProjectId.value = id
  view.value = 'project'
}

const onProjectStarted = async (projectId) => {
  highlightProject(projectId)
  await loadProjects()
}

const onProjectComplete = async (projectId) => {
  await loadProjects()
  if (projectId && activeProjectId.value === projectId) {
    projectRefreshKey.value++
  }
}

const openExploreItem = (item) => {
  const target = resolveFeedOpenTarget(item)
  if (!target) return
  if (target.kind === 'community') {
    router.push({ name: 'project-community', params: { projectId: target.projectId } })
    return
  }
  if (target.kind === 'project') openProject(target.projectId)
  else goNew(target.prompt)
}

const handleLogout = () => {
  authApi.logout()
  genKey.value++
  view.value = 'new'
  activeProjectId.value = null
  myProjects.value = []
  router.push('/')
}
</script>
