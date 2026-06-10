<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main class="px-6 py-10 pt-24 sm:px-8">
      <ExploreGrid :user-id="userId" @open="openExploreItem" />
    </main>
    <AppFooter />
    <AuthDialog
      :open="dialogOpen"
      :default-mode="dialogMode"
      auth-source="explore"
      @close="dialogOpen = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import ExploreGrid from '../components/ExploreGrid.vue'
import AuthDialog from '../components/AuthDialog.vue'
import { authApi, isLoggedIn, getLocalAvatar } from '../api'
import { resolveFeedOpenTarget } from '@/utils/feedOpen'

const router = useRouter()
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const userId = ref(null)
const dialogOpen = ref(false)
const dialogMode = ref('signup')

const refresh = async () => {
  logged.value = isLoggedIn()
  if (!logged.value) {
    userId.value = null
    avatar.value = ''
    return
  }
  avatar.value = getLocalAvatar()
  try {
    const d = await authApi.getCurrentDetail()
    nickName.value = d?.nickName || d?.email || ''
    avatar.value = d?.avatar || getLocalAvatar()
    userId.value = d?.id != null ? d.id : null
  } catch {
    authApi.logout()
    logged.value = false
    userId.value = null
    avatar.value = ''
  }
}

onMounted(refresh)

const goWorkspace = () => router.push('/workspace')

const openLogin = (mode) => {
  dialogMode.value = mode || 'signup'
  dialogOpen.value = true
}

const onLoginSuccess = () => {
  router.push('/workspace')
}

const openExploreItem = (item) => {
  const target = resolveFeedOpenTarget(item)
  if (!target) return
  if (target.kind === 'community') {
    router.push({ name: 'project-community', params: { projectId: target.projectId } })
    return
  }
  if (target.kind === 'project') {
    if (isLoggedIn()) {
      router.push({ name: 'workspace', query: { project: target.projectId } })
    } else {
      router.push({ name: 'project-community', params: { projectId: target.projectId } })
    }
    return
  }
  if (isLoggedIn()) {
    goWorkspace()
  } else {
    openLogin('signup')
  }
}
</script>
