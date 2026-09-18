<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />

    <main class="mx-auto max-w-2xl px-4 pb-16 pt-[4.5rem] sm:px-6 sm:pt-24">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-foreground sm:text-3xl">{{ t('reader.hubTitle') }}</h1>
        <p class="mt-2 text-sm text-muted-foreground sm:text-base">{{ t('reader.hubSubtitle') }}</p>
      </div>

      <ReadingHistoryPanel
        variant="light"
        class="mb-10"
        @open-login="openLogin"
      />

      <LocalReaderUploadPanel />
    </main>

    <AuthDialog
      :open="dialogOpen"
      :default-mode="dialogMode"
      auth-source="reader"
      @close="dialogOpen = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/AppHeader.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import ReadingHistoryPanel from '@/components/reader/ReadingHistoryPanel.vue'
import LocalReaderUploadPanel from '@/components/reader/LocalReaderUploadPanel.vue'
import { authApi, isLoggedIn, getLocalAvatar } from '@/api'

defineOptions({ name: 'ReaderHubView' })

const router = useRouter()
const { t } = useI18n()

const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)
const dialogMode = ref<'login' | 'signup'>('login')

async function refreshAuth() {
  logged.value = isLoggedIn()
  if (!logged.value) {
    nickName.value = ''
    avatar.value = ''
    return
  }
  avatar.value = getLocalAvatar()
  try {
    const d = await authApi.getCurrentDetail()
    nickName.value = d?.nickName || d?.email || ''
    avatar.value = d?.avatar || getLocalAvatar()
  } catch {
    logged.value = false
    nickName.value = ''
    avatar.value = ''
  }
}

onMounted(() => {
  void refreshAuth()
})

function openLogin(mode: 'login' | 'signup' = 'login') {
  dialogMode.value = mode
  dialogOpen.value = true
}

async function onLoginSuccess() {
  dialogOpen.value = false
  await refreshAuth()
}

function goWorkspace() {
  router.push({ name: 'workspace' })
}
</script>
