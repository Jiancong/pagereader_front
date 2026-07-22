<template>
  <div class="text-sm">
    <div class="flex items-center gap-2">
      <img
        v-if="node.userAvatarUrl"
        :src="node.userAvatarUrl"
        :alt="node.userNickname || ''"
        class="h-6 w-6 rounded-full object-cover"
      />
      <span class="font-medium text-foreground">
        {{ node.userNickname || t('community.userFallback', { id: node.userId }) }}
      </span>
      <span
        v-if="ratingBadge"
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
        :class="ratingBadge.class"
      >
        {{ ratingBadge.label }}
      </span>
      <span class="text-xs text-muted-foreground">{{ formatCommentTime(node.createTime) }}</span>
    </div>
    <p class="mt-1 whitespace-pre-wrap break-words text-foreground">{{ node.content }}</p>
    <div class="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
      <button
        v-if="isLoggedIn"
        type="button"
        class="inline-flex items-center gap-1 transition-colors hover:text-primary"
        :class="likedByMe ? 'text-primary' : ''"
        @click="onToggleLike"
      >
        <ThumbsUp class="h-3.5 w-3.5" :fill="likedByMe ? 'currentColor' : 'none'" />
        <span class="tabular-nums">{{ likeCount }}</span>
      </button>
      <span v-else-if="likeCount > 0" class="inline-flex items-center gap-1">
        <ThumbsUp class="h-3.5 w-3.5" />
        {{ likeCount }}
      </span>
      <span v-if="node.replies?.length" class="inline-flex items-center gap-1">
        <MessageCircle class="h-3.5 w-3.5" />
        {{ node.replies.length }}
      </span>
    </div>
    <button
      v-if="isLoggedIn"
      type="button"
      class="mt-1 text-xs text-primary hover:underline"
      @click="showReply = !showReply"
    >
      {{ t('community.reply') }}
    </button>
    <div v-if="showReply" class="mt-2">
      <textarea
        v-model="replyDraft"
        rows="2"
        class="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        :placeholder="t('community.replyPlaceholder')"
      />
      <button
        type="button"
        class="mt-1 rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        :disabled="!replyDraft.trim() || sending"
        @click="send"
      >
        {{ sending ? t('community.sending') : t('community.sendReply') }}
      </button>
    </div>
    <div
      v-if="node.replies?.length"
      class="ml-4 mt-3 space-y-3 border-l border-border pl-3"
    >
      <CommentNode
        v-for="r in node.replies"
        :key="r.id"
        :node="r"
        :is-logged-in="isLoggedIn"
        :project-id="projectId"
        @reply="(id, text) => emit('reply', id, text)"
        @update:node="onChildUpdate"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageCircle, ThumbsUp } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { formatCommentTime } from '@/utils/projectCommunity'
import { projectApi } from '@/api'

defineOptions({ name: 'CommentNode' })

const props = defineProps({
  node: { type: Object, required: true },
  isLoggedIn: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
})

const emit = defineEmits(['reply', 'update:node'])

const { t } = useI18n()
const replyDraft = ref('')
const showReply = ref(false)
const sending = ref(false)

// 局部乐观状态：覆盖 node 上的 likeCount / likedByMe
const optimistic = ref(null)

const likeCount = computed(() => {
  if (optimistic.value != null) return Number(optimistic.value.likeCount ?? 0)
  return Number(props.node?.likeCount ?? 0)
})
const likedByMe = computed(() => {
  if (optimistic.value != null) return Boolean(optimistic.value.likedByMe)
  return Boolean(props.node?.likedByMe)
})

const ratingBadge = computed(() => {
  const rating = props.node?.rating
  if (!rating) return null
  if (rating === 'RECOMMEND') {
    return {
      label: t('community.recommend.barRecommend'),
      class: 'bg-green-500/15 text-green-500',
    }
  }
  if (rating === 'AVERAGE') {
    return {
      label: t('community.recommend.barAverage'),
      class: 'bg-yellow-500/15 text-yellow-600',
    }
  }
  if (rating === 'POOR') {
    return {
      label: t('community.recommend.barPoor'),
      class: 'bg-red-500/15 text-red-500',
    }
  }
  return null
})

async function send() {
  const text = replyDraft.value.trim()
  if (!text) return
  sending.value = true
  try {
    emit('reply', props.node.id, text)
    replyDraft.value = ''
    showReply.value = false
  } finally {
    sending.value = false
  }
}

async function onToggleLike() {
  if (!props.projectId || !props.node?.id) return
  const nextLiked = !likedByMe.value
  const nextCount = Math.max(0, likeCount.value + (nextLiked ? 1 : -1))
  // 乐观更新
  optimistic.value = { likedByMe: nextLiked, likeCount: nextCount }
  try {
    const res = await projectApi.toggleCommentLike(
      props.projectId,
      props.node.id,
      nextLiked ? 'click' : 'unclick',
    )
    const serverLiked = Boolean(res?.likedByMe)
    const serverCount = Math.max(0, Number(res?.likeCount ?? nextCount))
    optimistic.value = { likedByMe: serverLiked, likeCount: serverCount }
    emit('update:node', {
      id: props.node.id,
      likedByMe: serverLiked,
      likeCount: serverCount,
    })
  } catch (e) {
    // 回滚到 node 原始值
    optimistic.value = {
      likedByMe: Boolean(props.node?.likedByMe),
      likeCount: Number(props.node?.likeCount ?? 0),
    }
    ElMessage.error(e?.message || t('common.actionFailed'))
  }
}

function onChildUpdate(updated) {
  emit('update:node', updated)
}
</script>
