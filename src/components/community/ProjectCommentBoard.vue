<template>
  <section id="community-comments" class="rounded-xl border border-border bg-card p-4">
    <h3 class="mb-3 font-semibold text-foreground">{{ t('community.commentBoard') }}</h3>

    <template v-if="isLoggedIn">
      <textarea
        ref="composerRef"
        v-model="rootDraft"
        rows="3"
        class="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        :placeholder="t('community.commentPlaceholder')"
      />
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ t('community.rating.required') }}</span>
        <button
          v-for="opt in ratingOptions"
          :key="opt.value"
          type="button"
          class="rounded-full px-3 py-1 text-xs transition-colors"
          :class="
            rootRating === opt.value
              ? 'bg-primary font-medium text-primary-foreground'
              : 'bg-muted/80 text-muted-foreground hover:text-foreground'
          "
          @click="rootRating = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <button
        type="button"
        class="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        :disabled="!rootDraft.trim() || !rootRating || posting"
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
      <CommentNode
        :node="c"
        :is-logged-in="isLoggedIn"
        :project-id="projectId"
        @reply="submitReply"
        @update:node="onNodeUpdate"
      />
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
import { ref, computed } from 'vue'
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
  ratingFilter: { type: String, default: 'ALL' },
})

const emit = defineEmits(['update:comments', 'login', 'reload-comments'])

const { t } = useI18n()
const rootDraft = ref('')
const rootRating = ref(null)
const posting = ref(false)
const error = ref(null)
const composerRef = ref(null)

const ratingOptions = computed(() => [
  { value: 'RECOMMEND', label: t('community.recommend.barRecommend') },
  { value: 'AVERAGE', label: t('community.recommend.barAverage') },
  { value: 'POOR', label: t('community.recommend.barPoor') },
])

function focusComposer() {
  composerRef.value?.focus()
}

defineExpose({ focusComposer })

async function submitRoot() {
  const content = rootDraft.value.trim()
  if (!content) return
  if (!rootRating.value) {
    error.value = t('community.rating.required')
    ElMessage.warning(error.value)
    return
  }
  posting.value = true
  error.value = null
  try {
    const created = await projectApi.postComment(
      props.projectId,
      content,
      null,
      rootRating.value,
    )
    emit('update:comments', [...props.comments, { ...created, replies: created.replies ?? [] }])
    rootDraft.value = ''
    rootRating.value = null
    ElMessage.success(t('community.postSuccess'))
    // 评分分布与 Tab 计数都依赖后端聚合，发书评后让父组件刷新
    emit('reload-comments')
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
    const fresh = await projectApi.listComments(props.projectId, props.ratingFilter)
    emit('update:comments', fresh)
    ElMessage.success(t('community.replySuccess'))
  } catch (e) {
    error.value = e?.message || t('common.actionFailed')
    ElMessage.error(error.value)
  }
}

function onNodeUpdate(updated) {
  const next = props.comments.map((c) => patchNode(c, updated))
  emit('update:comments', next)
}

function patchNode(node, updated) {
  if (node.id === updated.id) return { ...node, ...updated }
  if (node.replies?.length) {
    return { ...node, replies: node.replies.map((r) => patchNode(r, updated)) }
  }
  return node
}
</script>
