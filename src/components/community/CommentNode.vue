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
      <span class="text-xs text-muted-foreground">{{ formatCommentTime(node.createTime) }}</span>
    </div>
    <p class="mt-1 whitespace-pre-wrap break-words text-foreground">{{ node.content }}</p>
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
        @reply="(id, text) => emit('reply', id, text)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCommentTime } from '@/utils/projectCommunity'

defineOptions({ name: 'CommentNode' })

const props = defineProps({
  node: { type: Object, required: true },
  isLoggedIn: { type: Boolean, default: false },
})

const emit = defineEmits(['reply'])

const { t } = useI18n()
const replyDraft = ref('')
const showReply = ref(false)
const sending = ref(false)

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
</script>
