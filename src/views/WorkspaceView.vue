<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <WorkspaceSidebar
      :view="view"
      :active-project-id="activeProjectId"
      :nick-name="nickName"
      :my-projects="myProjects"
      :loading-projects="loadingProjects"
      @new="goNew('')"
      @explore="view = 'explore'"
      @open-project="openProject"
      @logout="handleLogout"
    />

    <main class="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
      <WorkspaceGenerator v-if="view === 'new'" :key="genKey" :initial-prompt="genPrompt" />
      <ExploreGrid v-else-if="view === 'explore'" @open="(item) => openProject(item.projectId || item.id)" />
      <ProjectPreview
        v-else-if="view === 'project' && activeProjectId"
        :project-id="activeProjectId"
        @back="view = 'explore'"
        @fork="goNew"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar.vue'
import WorkspaceGenerator from '../components/workspace/WorkspaceGenerator.vue'
import ExploreGrid from '../components/workspace/ExploreGrid.vue'
import ProjectPreview from '../components/workspace/ProjectPreview.vue'
import { authApi, feedApi } from '../api'

const router = useRouter()
const view = ref('new')
const activeProjectId = ref(null)
const nickName = ref('')
const myProjects = ref([])
const loadingProjects = ref(false)
const genPrompt = ref('')
const genKey = ref(0)

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
    nickName.value = d?.nickName || d?.email || ''
  } catch {
    /* ignore */
  }
  loadProjects()
})

const goNew = (prompt = '') => {
  genPrompt.value = typeof prompt === 'string' ? prompt : ''
  genKey.value++
  view.value = 'new'
}

const openProject = (id) => {
  activeProjectId.value = id
  view.value = 'project'
}

const handleLogout = () => {
  authApi.logout()
  router.push('/')
}
</script>
