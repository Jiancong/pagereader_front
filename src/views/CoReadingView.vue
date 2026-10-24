<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <button type="button" class="rounded-lg p-2 hover:bg-secondary" :title="t('coRead.back')" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-sm font-semibold sm:text-base">{{ store.fileName || t('reader.coReadTitle') }}</h1>
      </div>
    </header>

    <div v-if="store.sessionError" class="mx-auto max-w-lg px-4 py-12 text-center">
      <p class="text-muted-foreground">{{ store.sessionError }}</p>
      <button type="button" class="mt-4 text-primary underline" @click="goBack">{{ t('coRead.back') }}</button>
    </div>

    <div v-else-if="store.phase === 'parsing'" class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 class="h-6 w-6 animate-spin" />
      {{ t('coRead.parsing') }}
    </div>

    <CoReadSetup
      v-else-if="store.phase === 'idle' || store.phase === 'ready'"
      :file-name="store.fileName"
      :chapters="store.chapters"
      :creating="creatingSession"
      @pick="onPickFile"
      @start="onStartSession"
    />

    <div v-else-if="store.phase === 'finished'" class="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <BookHeart class="h-16 w-16 text-primary" />
      <p class="text-lg font-semibold">{{ t('coRead.finishBook') }}</p>
      <button type="button" class="rounded-xl bg-primary px-6 py-2.5 text-primary-foreground" @click="goBack">
        {{ t('coRead.back') }}
      </button>
    </div>

    <div v-else class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 class="h-6 w-6 animate-spin" />
      {{ t('reader.loading') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, BookHeart, Loader2 } from 'lucide-vue-next'
import CoReadSetup from '@/components/coReading/CoReadSetup.vue'
import { useCoReadingController } from '@/composables/useCoReadingController'
import { useCoReadingStore } from '@/stores/coReading'
import { useCoReadFileStore } from '@/stores/coReadFile'
import { logSessionAdoption } from '@/utils/sessionScope'

defineOptions({ name: 'CoReadingView' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const fileStore = useCoReadFileStore()
const store = useCoReadingStore()

const {
  creatingSession,
  onStartSession,
  onPickFile,
  restoreSession,
} = useCoReadingController()

function goBack() {
  const dest = fileStore.returnTo
  if (dest === 'reader-hub') router.push({ name: 'reader' })
  else if (dest === 'landing') router.push({ name: 'landing' })
  else router.push({ name: 'workspace' })
}

onMounted(async () => {
  if (String(route.query.finished || '') === '1') {
    store.phase = 'finished'
    return
  }
  const sessionQuery = String(route.query.session || '').trim()
  if (sessionQuery) {
    // 共读分享链接：接管为当前标签页会话，打一行可观测日志（Session 隔离 spec §6）
    logSessionAdoption('url', sessionQuery)
    store.resetSession()
    await restoreSession(sessionQuery)
    return
  }
  if (fileStore.file && fileStore.chapters.length) {
    store.setFromParse(fileStore.file.name, fileStore.chapters)
    for (const ch of fileStore.chapters) store.cacheChapter(ch)
    return
  }
  store.phase = 'idle'
})
</script>
