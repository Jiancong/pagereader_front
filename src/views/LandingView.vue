<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="(mode) => openLogin(mode, 'header')"
      @enter="goWorkspace"
    />
    <main class="pt-16">
      <HeroSection />
      <TrustedByMarquee />
      <GeneratorSection @start="onStart" />
      <FeatureCards />
      <EbookShowcaseSection @start="onStart" />
      <PricingSection :user-id="userId" @select-plan="onPricingPlan" @subscribed="refresh" />
    </main>
    <AppFooter />

    <AuthDialog
      :open="dialogOpen"
      :default-mode="dialogMode"
      :auth-source="authSource"
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
import TrustedByMarquee from '../components/TrustedByMarquee.vue'
import GeneratorSection from '../components/GeneratorSection.vue'
import FeatureCards from '../components/FeatureCards.vue'
import EbookShowcaseSection from '../components/EbookShowcaseSection.vue'
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
const authSource = ref('header')

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

const openLogin = (mode, source = 'header') => {
  dialogMode.value = mode
  authSource.value = source
  dialogOpen.value = true
}

const goWorkspace = () => router.push('/workspace')

const onLoginSuccess = () => {
  router.push('/workspace')
}

const onStart = (payload) => {
  if (isLoggedIn()) {
    goWorkspace()
    return
  }
  openLogin('signup', payload?.mode === 'upload' ? 'generator_upload' : 'generator_prompt')
}

const onPricingPlan = (planType) => {
  if (isLoggedIn()) {
    goWorkspace()
    return
  }
  openLogin('signup', `pricing_${String(planType || 'unknown').toLowerCase()}`)
}
</script>
