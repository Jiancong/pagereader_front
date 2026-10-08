<template>
    <div class="flex h-[100dvh] min-h-0 overflow-hidden bg-background">
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      @click="mobileSidebarOpen = false"
    />

    <WorkspaceSidebar
      :view="view"
      :user-id="userId"
      :active-project-id="activeProjectId"
      :active-expert-id="activeExpertId"
      :history-mode="sidebarHistoryMode"
      :nick-name="nickName"
      :avatar="avatar"
      :my-projects="myProjects"
      :my-expert-history="myExpertHistory"
      :project-title-map="projectTitleMap"
      :loading-projects="loadingProjects"
      :loading-expert-history="loadingExpertHistory"
      :loading-more-projects="loadingMoreProjects"
      :has-more-projects="projectsHasMore"
      :deleting-project-id="deletingProjectId"
      @load-more-projects="loadMoreProjects"
      :mobile-open="mobileSidebarOpen"
      @new-deck="onSidebarNav(goNewDeck)"
      @new-expert="onSidebarNav(goNewExpert)"
      @explore="onSidebarNav(onExploreArticles)"
      @explore-experts="onSidebarNav(onExploreExperts)"
      @open-project="(id) => onSidebarNav(() => openProject(id))"
      @open-expert="(expert) => onSidebarNav(() => onSelectExpert(expert))"
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

      <main class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-8">
      <!-- v-show：切换探索/历史时保持生成状态与 SSE 连接 -->
      <WorkspaceGenerator
        ref="generatorRef"
        v-show="view === 'new'"
        :key="genKey"
        :initial-prompt="genPrompt"
        :user-id="userId"
        @project-started="onProjectStarted"
        @project-complete="onProjectComplete"
      />
      <WorkspaceExpertCreate
        ref="expertCreateRef"
        v-show="view === 'new-expert'"
        :key="expertCreateKey"
        :user-id="userId"
        @select-expert="onSelectExpert"
        @expert-created="loadMyExpertHistory"
      />
      <ExploreGrid
        v-if="view === 'explore'"
        :user-id="userId"
        @open="openExploreItem"
        @deleted="onExploreProjectDeleted"
      />
      <BookExpertExplore
        v-else-if="view === 'explore-experts'"
        :user-id="userId ? String(userId) : null"
        @select-expert="onSelectExpert"
      />
      <BookExpertChat
        v-else-if="view === 'expert-chat' && activeExpert"
        :expert="activeExpert"
        :user-id="userId ? String(userId) : null"
        :project-id="expertProjectId"
        :initial-session-id="pendingExpertSessionId"
        @exit="onExitExpert"
        @expert-updated="onExpertUpdated"
        @sessions-changed="loadMyExpertHistory"
      />
      <ProjectPreview
        v-else-if="view === 'project' && activeProjectId"
        :project-id="activeProjectId"
        :user-id="userId"
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

import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Menu } from 'lucide-vue-next'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar.vue'
import WorkspaceGenerator from '../components/workspace/WorkspaceGenerator.vue'
import ExploreGrid from '../components/ExploreGrid.vue'
import ProjectPreview from '../components/workspace/ProjectPreview.vue'
import BookExpertChat from '../components/workspace/BookExpertChat.vue'
import BookExpertExplore from '../components/workspace/BookExpertExplore.vue'
import WorkspaceExpertCreate from '../components/workspace/WorkspaceExpertCreate.vue'
import { useBookExpertStore } from '@/stores/bookExpert'
import { authApi, feedApi, getLocalAvatar, bookExpertApi } from '../api'
import { createFreshExpertSessionId, getOrCreateExpertSessionId } from '@/api/bookExpert'
import { resolveFeedOpenTarget } from '@/utils/feedOpen'
import { recordBookExpertOpen } from '@/utils/bookExpertEngagement'
import { resolveProjectDisplayTitle } from '@/utils/resolveProjectDisplayTitle'

import { provideAssetsRefreshBus } from '@/composables/useAssetsRefreshBus'

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
const projectTitleMap = ref({})
const loadingProjects = ref(false)
const loadingMoreProjects = ref(false)
const projectsHasMore = ref(false)
const projectPage = ref(0)
const deletingProjectId = ref(null)
const genPrompt = ref('')
const genKey = ref(0)
const expertCreateKey = ref(0)
const expertCreateRef = ref(null)
const projectRefreshKey = ref(0)
const generatorRef = ref(null)
const activeExpert = ref(null)
const expertProjectId = ref('')
const myExpertHistory = ref([])
const loadingExpertHistory = ref(false)
const activeExpertSessionId = ref(null)
const pendingExpertSessionId = ref(null)

const activeExpertId = computed(() => activeExpert.value?.expert_id ?? null)
const bookExpertStore = useBookExpertStore()

const sidebarHistoryMode = computed(() =>
  view.value === 'explore-experts' || view.value === 'expert-chat' || view.value === 'new-expert'
    ? 'experts'
    : 'projects',
)

const assetsRefreshBus = provideAssetsRefreshBus()

watch(mobileSidebarOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

/** 移动端：点击侧栏导航项后执行动作并关闭抽屉 */
const onSidebarNav = (action) => {
  action()
  mobileSidebarOpen.value = false
}

const MY_PROJECTS_PAGE_SIZE = 30

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const page = await feedApi.getMyProjects(0, MY_PROJECTS_PAGE_SIZE)
    const projects = page.content ?? []
    projectPage.value = 0
    projectsHasMore.value = page.last === false
    myProjects.value = projects
    void loadProjectDeckTitles(projects)
  } catch {
    myProjects.value = []
    projectsHasMore.value = false
  } finally {
    loadingProjects.value = false
  }
}

const loadMyExpertHistory = async () => {
  if (!userId.value) {
    myExpertHistory.value = []
    return
  }
  loadingExpertHistory.value = true
  try {
    const res = await bookExpertApi.listMyExperts(String(userId.value))
    myExpertHistory.value = res?.experts ?? []
  } catch {
    myExpertHistory.value = []
  } finally {
    loadingExpertHistory.value = false
  }
}

function onExploreArticles() {
  view.value = 'explore'
}

function onExploreExperts() {
  view.value = 'explore-experts'
  void loadMyExpertHistory()
}

const loadMoreProjects = async () => {
  if (loadingProjects.value || loadingMoreProjects.value || !projectsHasMore.value) return
  loadingMoreProjects.value = true
  try {
    const nextPage = projectPage.value + 1
    const page = await feedApi.getMyProjects(nextPage, MY_PROJECTS_PAGE_SIZE)
    projectPage.value = nextPage
    projectsHasMore.value = page.last === false
    const incoming = page.content ?? []
    const seen = new Set(myProjects.value.map((p) => p.id))
    myProjects.value = [
      ...myProjects.value,
      ...incoming.filter((p) => p?.id && !seen.has(p.id)),
    ]
    void loadProjectDeckTitles(incoming)
  } catch {
    /* 保留已加载列表 */
  } finally {
    loadingMoreProjects.value = false
  }
}

async function loadProjectDeckTitles(projects) {
  const candidates = projects.filter((p) => p?.id && !projectTitleMap.value[p.id])
  await Promise.all(
    candidates.map(async (project) => {
      const title = await resolveProjectDisplayTitle(project.id)
      if (!title) return
      projectTitleMap.value = {
        ...projectTitleMap.value,
        [project.id]: title,
      }
    }),
  )
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

  // 公开专家页 CTA：/workspace?expert=<expertId> 直接进入专家会话
  const expertTarget = String(route.query.expert || '').trim()
  if (expertTarget) {
    try {
      const res = await bookExpertApi.getExpert(
        expertTarget,
        userId.value ? String(userId.value) : undefined,
      )
      if (res?.expert) onSelectExpert(res.expert)
    } catch {
      /* 专家不存在或未公开则忽略 */
    }
    router.replace({ name: 'workspace' })
  }

  const distillIntent = String(route.query.distill || '').trim()
  if (distillIntent === 'expert') {
    goNewExpert()
    router.replace({ name: 'workspace' })
  }

  const expertsBrowse = String(route.query.experts || '').trim()
  if (expertsBrowse === '1' || expertsBrowse === 'true') {
    onExploreExperts()
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

/** 从探索/历史回到 Deck 生成页，保留进行中的任务与已生成 PPT */
const goNewDeck = () => {
  activeProjectId.value = null
  activeExpert.value = null
  view.value = 'new'
}

/** 新建书籍专家（蒸馏） */
const goNewExpert = () => {
  activeProjectId.value = null
  expertCreateKey.value++
  view.value = 'new-expert'
  void loadMyExpertHistory()
}

const onSelectDocumentFromAssets = (payload) => {
  if (view.value === 'new-expert') {
    expertCreateRef.value?.attachCloudDocument?.(payload)
    return
  }
  goNewDeck()
  nextTick(() => {
    generatorRef.value?.attachCloudDocument?.(payload)
  })
}

/** 新建空白 Deck 任务（fork 等），重置生成器 */
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
  assetsRefreshBus.trigger()
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

function newExpertProjectId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `expert-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function onSelectExpert(expert) {
  activeExpert.value = expert
  expertProjectId.value = newExpertProjectId()
  pendingExpertSessionId.value = null
  const uid = userId.value ? String(userId.value) : ''
  const owned = uid && String(expert.owner_user_id || '') === uid
  // 公共广场里的他人专家：每次新开一条会话，不恢复任何历史（含他人或自己此前与该专家的线程）
  const sid = uid
    ? owned
      ? getOrCreateExpertSessionId(expert.expert_id, uid)
      : createFreshExpertSessionId(expert.expert_id, uid)
    : ''
  activeExpertSessionId.value = sid || null
  view.value = 'expert-chat'
  recordBookExpertOpen(expert, uid || null)
  void loadMyExpertHistory()
}

/** 聊天页内发布 / 封面上传后回写，保持 header 与卡片封面同步 */
function onExpertUpdated(expert) {
  if (activeExpert.value && expert?.expert_id === activeExpert.value.expert_id) {
    activeExpert.value = { ...activeExpert.value, ...expert }
  }
  void loadMyExpertHistory()
}

function onExitExpert() {
  activeExpert.value = null
  expertProjectId.value = ''
  pendingExpertSessionId.value = null
  activeExpertSessionId.value = null
  bookExpertStore.clearActiveExpert()
  view.value = 'explore-experts'
  void loadMyExpertHistory()
}

const handleLogout = () => {
  authApi.logout()
  genKey.value++
  view.value = 'new'
  activeProjectId.value = null
  myProjects.value = []
  myExpertHistory.value = []
  activeExpertSessionId.value = null
  pendingExpertSessionId.value = null
  router.push('/')
}
</script>
