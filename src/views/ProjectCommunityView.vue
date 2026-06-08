<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :logged="logged"
      :nick-name="nickName"
      :avatar="avatar"
      @open-login="openLogin"
      @enter="goWorkspace"
    />
    <main class="mx-auto max-w-3xl px-4 pb-16 pt-20 sm:px-6">
      <button
        class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" /> {{ t('workspace.back') }}
      </button>

      <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <div v-if="error" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</div>

      <template v-if="project">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-foreground">
              {{ project.name || project.title || t('workspace.unnamedProject') }}
            </h1>
            <p v-if="project.description" class="mt-1 text-sm text-muted-foreground">{{ project.description }}</p>
          </div>
          <button
            type="button"
            class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            @click="openReader"
          >
            <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
          </button>
        </div>

        <button
          v-if="project.thumbnailUrl"
          type="button"
          class="group relative mt-6 block w-full overflow-hidden rounded-xl border border-border"
          @click="openReader"
        >
          <img
            :src="project.thumbnailUrl"
            :alt="project.name || project.title || ''"
            class="w-full object-cover"
            loading="lazy"
          />
          <span class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
            <span class="inline-flex items-center gap-2 rounded-lg bg-background/90 px-4 py-2 text-sm font-semibold text-foreground shadow">
              <BookOpen class="h-4 w-4" /> {{ t('community.openToRead') }}
            </span>
          </span>
        </button>

        <section
          v-if="project.sourceBookTitle || project.sourceBookAuthor"
          class="mb-6 mt-6 rounded-xl border border-border bg-card p-4"
        >
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {{ t('community.bookSource') }}
          </p>
          <p v-if="project.sourceBookTitle" class="mt-1 text-lg font-semibold text-foreground">
            {{ project.sourceBookTitle }}
          </p>
          <p v-if="project.sourceBookAuthor" class="text-sm text-muted-foreground">
            {{ t('community.bookAuthor', { name: project.sourceBookAuthor }) }}
          </p>
        </section>

        <ProjectCommentBoard
          class="mt-6"
          :project-id="projectId"
          :comments="comments"
          :is-logged-in="logged"
          :loading="loadingComments"
          @update:comments="(c) => (comments = c)"
          @login="openLogin"
        />
      </template>
    </main>
    <AppFooter />

    <AuthDialog
      :open="dialogOpen"
      default-mode="login"
      @close="dialogOpen = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'ProjectCommunityView' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Loader2, BookOpen } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import ProjectCommentBoard from '@/components/community/ProjectCommentBoard.vue'
import { authApi, projectApi, isLoggedIn, getLocalAvatar } from '@/api'
import { gtmOpenReader } from '@/composables/useGtmDataLayer'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => String(route.params.projectId || ''))
const project = ref(null)
const comments = ref([])
const loading = ref(false)
const loadingComments = ref(false)
const error = ref(null)
const logged = ref(false)
const nickName = ref('')
const avatar = ref(getLocalAvatar())
const dialogOpen = ref(false)

const refreshAuth = async () => {
  logged.value = isLoggedIn()
  if (!logged.value) {
    nickName.value = ''
    return
  }
  try {
    const d = await authApi.getCurrentDetail()
    nickName.value = d?.nickName || d?.email || ''
    avatar.value = d?.avatar || getLocalAvatar()
  } catch {
    /* ignore */
  }
}

const load = async (id) => {
  if (!id) return
  loading.value = true
  loadingComments.value = true
  error.value = null
  project.value = null
  comments.value = []
  try {
    const [proj, list] = await Promise.all([
      projectApi.getProject(id),
      projectApi.listComments(id).catch(() => []),
    ])
    project.value = proj
    comments.value = list
    projectApi.incrementProjectView(id).catch(() => {})
  } catch (e) {
    error.value = e?.message || t('common.loadFailed')
  } finally {
    loading.value = false
    loadingComments.value = false
  }
}

onMounted(() => {
  refreshAuth()
  load(projectId.value)
})

watch(projectId, (id) => load(id))

const openReader = () => {
  if (!projectId.value) return
  gtmOpenReader(projectId.value)
  router.push({ name: 'project-reader', params: { projectId: projectId.value } })
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(logged.value ? '/workspace' : '/')
}

const goWorkspace = () => router.push('/workspace')
const openLogin = () => { dialogOpen.value = true }
const onLoginSuccess = () => {
  dialogOpen.value = false
  refreshAuth()
}
</script>
