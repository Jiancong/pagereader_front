<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main class="pt-16">
      <HeroSection />
      <GeneratorSection @start="onStart" />
      <FeatureCards />
      <PricingSection :user-id="userId" @select-plan="onPricingPlan" @subscribed="refresh" />
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
import HeroSection from '../components/HeroSection.vue'
import GeneratorSection from '../components/GeneratorSection.vue'
import FeatureCards from '../components/FeatureCards.vue'
import PricingSection from '../components/PricingSection.vue'
import AppFooter from '../components/AppFooter.vue'
import AuthDialog from '../components/AuthDialog.vue'
import { authApi, isLoggedIn, getLocalAvatar } from '../api'

const router = useRouter()
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const userId = ref(null)
const dialogOpen = ref(false)
const dialogMode = ref('login')

const refresh = async () => {
  logged.value = isLoggedIn()
  userId.value = null
  if (!logged.value) {
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
  }
}

onMounted(refresh)

const openLogin = (mode) => {
  dialogMode.value = mode
  dialogOpen.value = true
}

const goWorkspace = () => router.push('/workspace')

const onLoginSuccess = () => {
  router.push('/workspace')
}

const onStart = () => {
  if (isLoggedIn()) goWorkspace()
  else openLogin('signup')
}

const onPricingPlan = () => {
  if (isLoggedIn()) goWorkspace()
  else openLogin('signup')
}
</script>
