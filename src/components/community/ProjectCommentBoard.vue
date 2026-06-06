<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h3 class="mb-3 font-semibold text-foreground">{{ t('community.commentBoard') }}</h3>

    <template v-if="isLoggedIn">
      <textarea
        v-model="rootDraft"
        rows="3"
        class="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        :placeholder="t('community.commentPlaceholder')"
      />
      <button
        type="button"
        class="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        :disabled="!rootDraft.trim() || posting"
        @click="submitRoot"
      >
        {{ posting ? t('community.posting') : t('community.postComment') }}
      </button>
    </template>
    <p v-else class="text-sm text-muted-foreground">
      <button type="button" class="text-primary hover:underline" @click="emit('login')">
        {{ t('community.loginToComment') }}
      </button>
    </p>

    <p v-if="error" class="mt-3 text-sm text-red-400">{{ error }}</p>

    <div v-for="c in comments" :key="c.id" class="mt-4 border-t border-border pt-4">
      <CommentNode :node="c" :is-logged-in="isLoggedIn" @reply="submitReply" />
    </div>
    <p v-if="!comments.length && !loading" class="mt-4 text-sm text-muted-foreground">
      {{ t('community.noComments') }}
    </p>
    <p v-if="loading" class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" /> {{ t('workspace.loading') }}
    </p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import CommentNode from './CommentNode.vue'
import { projectApi } from '@/api'

const props = defineProps({
  projectId: { type: String, required: true },
  comments: { type: Array, default: () => [] },
  isLoggedIn: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:comments', 'login'])

const { t } = useI18n()
const rootDraft = ref('')
const posting = ref(false)
const error = ref(null)

async function submitRoot() {
  const content = rootDraft.value.trim()
  if (!content) return
  posting.value = true
  error.value = null
  try {
    const created = await projectApi.postComment(props.projectId, content)
    emit('update:comments', [...props.comments, { ...created, replies: created.replies ?? [] }])
    rootDraft.value = ''
    ElMessage.success(t('community.postSuccess'))
  } catch (e) {
    error.value = e?.message || t('common.actionFailed')
    ElMessage.error(error.value)
  } finally {
    posting.value = false
  }
}

async function submitReply(parentId, content) {
  error.value = null
  try {
    await projectApi.postComment(props.projectId, content, parentId)
    const fresh = await projectApi.listComments(props.projectId)
    emit('update:comments', fresh)
    ElMessage.success(t('community.replySuccess'))
  } catch (e) {
    error.value = e?.message || t('common.actionFailed')
    ElMessage.error(error.value)
  }
}
</script>
