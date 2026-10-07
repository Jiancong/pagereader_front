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
      <HeroSection
        @expert-create="onExpertPromo('create')"
        @expert-explore="onExpertPromo('explore')"
      />
      <BookExpertShowcaseSection
        :user-id="userId"
        @create="onExpertPromo('create')"
        @explore="onExpertPromo('explore')"
      />
      <EbookShowcaseSection @start="onStart" />
      <PricingSection :user-id="userId" @select-plan="onPricingPlan" @subscribed="refresh" />
      <TrustedByMarquee />
    </main>
    <ProductHuntBanner />
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
import ProductHuntBanner from '../components/ProductHuntBanner.vue'
import HeroSection from '../components/HeroSection.vue'
import BookExpertShowcaseSection from '../components/BookExpertShowcaseSection.vue'
import TrustedByMarquee from '../components/TrustedByMarquee.vue'
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
/** 登录成功后跳转工作区时携带的 query（如书籍专家蒸馏 / 探索） */
const pendingWorkspaceQuery = ref(null)

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
  const query = pendingWorkspaceQuery.value
  pendingWorkspaceQuery.value = null
  router.push(query ? { path: '/workspace', query } : '/workspace')
}

const onExpertPromo = (action) => {
  const query =
    action === 'create' ? { distill: 'expert' } : { experts: '1' }
  if (isLoggedIn()) {
    router.push({ path: '/workspace', query })
    return
  }
  pendingWorkspaceQuery.value = query
  openLogin('signup', action === 'create' ? 'landing_expert_create' : 'landing_expert_explore')
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
