<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main class="pt-16">
      <PricingSection @select-plan="onSelectPlan" />
    </main>
    <AppFooter />
    <AuthDialog
      :open="dialogOpen"
      :default-mode="dialogMode"
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
import PricingSection from '../components/PricingSection.vue'
import AuthDialog from '../components/AuthDialog.vue'
import { authApi, isLoggedIn } from '../api'

const router = useRouter()
const logged = ref(false)
const nickName = ref('')
const dialogOpen = ref(false)
const dialogMode = ref('signup')

onMounted(async () => {
  logged.value = isLoggedIn()
  if (!logged.value) return
  try {
    const d = await authApi.getCurrentDetail()
    nickName.value = d?.nickName || d?.email || ''
  } catch {
    authApi.logout()
    logged.value = false
  }
})

const openLogin = (mode) => {
  dialogMode.value = mode || 'signup'
  dialogOpen.value = true
}

const goWorkspace = () => router.push('/workspace')

const onSelectPlan = () => {
  if (isLoggedIn()) goWorkspace()
  else openLogin('signup')
}

const onLoginSuccess = () => router.push('/workspace')
</script>
