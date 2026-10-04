<template>
  <div class="book-expert-chat">
    <div class="book-expert-chat__shell">
    <header class="be-chat__header">
      <button type="button" class="be-chat__back" @click="$emit('exit')">
        <ArrowLeft class="h-4 w-4" /> {{ t('bookExpert.exitExpert') }}
      </button>
      <div class="be-chat__title-row">
        <img
          v-if="expert.cover_url"
          :src="expert.cover_url"
          :alt="expert.expert_name"
          class="be-chat__cover"
        />
        <div class="be-chat__title-col">
          <div class="be-chat__title-line">
            <span class="be-chat__badge">{{ t('bookExpert.expertBadge') }}</span>
            <h2 class="be-chat__title">{{ expert.expert_name }}</h2>
          </div>
          <p v-if="expert.book_title" class="be-chat__book">{{ expert.book_title }}</p>
        </div>
      </div>

      <!-- 工具条：历史 / 封面 / 分享（复用 PPT 分享下拉的交互模式） -->
      <div class="be-chat__actions">
        <button
          v-if="isOwner"
          type="button"
          class="be-chat__action"
          :title="t('bookExpert.historyTitle')"
          @click="toggleHistory"
        >
          <Loader2 v-if="historyLoading" class="h-4 w-4 animate-spin" />
          <History v-else class="h-4 w-4" />
          <span>{{ t('bookExpert.history') }}</span>
        </button>

        <BookExpertAvatarPicker
          v-if="isOwner && userId"
          :expert-id="expert.expert_id"
          :user-id="String(userId)"
          :cover-url="expert.cover_url"
          @saved="onCoverPresetSaved"
        />

        <div class="be-chat__share-wrap">
          <button
            type="button"
            class="be-chat__action be-chat__action--trigger"
            :aria-expanded="shareMenuOpen"
            @click="shareMenuOpen = !shareMenuOpen"
          >
            <Share2 class="h-4 w-4" />
            <span>{{ t('bookExpert.share') }}</span>
            <ChevronDown class="h-3 w-3" :class="{ 'be-chat__chevron--open': shareMenuOpen }" />
          </button>
          <div v-if="shareMenuOpen" class="be-chat__share-menu" role="menu">
            <button type="button" class="be-chat__share-item" role="menuitem" @click="runShare('link')">
              <Link2 class="h-4 w-4" />
              <span>{{ t('bookExpert.shareViaLink') }}</span>
            </button>
            <button
              v-if="isOwner"
              type="button"
              class="be-chat__share-item"
              role="menuitem"
              :disabled="sharingToCommunity"
              @click="onShareToCommunity"
            >
              <Loader2 v-if="sharingToCommunity" class="h-4 w-4 animate-spin" />
              <Users v-else class="h-4 w-4" />
              <span>{{ shareToCommunityLabel }}</span>
            </button>
            <button type="button" class="be-chat__share-item" role="menuitem" @click="runShare('facebook')">
              <Facebook class="h-4 w-4" />
              <span>{{ t('bookExpert.shareFacebook') }}</span>
            </button>
            <button type="button" class="be-chat__share-item" role="menuitem" @click="runShare('x')">
              <Twitter class="h-4 w-4" />
              <span>{{ t('bookExpert.shareX') }}</span>
            </button>
            <button type="button" class="be-chat__share-item" role="menuitem" @click="runShare('linkedin')">
              <Linkedin class="h-4 w-4" />
              <span>{{ t('bookExpert.shareLinkedIn') }}</span>
            </button>
          </div>
          <div v-if="shareMenuOpen" class="be-chat__share-backdrop" @click="shareMenuOpen = false" />
        </div>
      </div>

      <section
        v-if="isOwner"
        class="be-chat__topic-category mt-3 rounded-xl border border-border bg-card/40 px-4 py-3"
      >
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-xs font-medium text-muted-foreground">
            {{ t('workspace.projectTopicCategory') }}
          </p>
          <ExploreTopicCategoryPicker
            v-model="selectedCategoryId"
            :options="selectableOptions"
            :display-label="currentCategoryLabel"
            :placeholder="t('workspace.projectTopicCategoryPlaceholder')"
            :aria-label="t('workspace.projectTopicCategory')"
            :disabled="!userId"
            :saving="updatingCategory"
            @select="onSelectTopicCategory"
          />
          <span v-if="updatingCategory" class="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 class="h-3 w-3 animate-spin" />
            {{ t('workspace.projectTopicCategorySaving') }}
          </span>
        </div>
        <p v-if="expert.visibility !== 'public'" class="mt-2 text-[11px] text-muted-foreground">
          {{ t('workspace.projectTopicCategoryOnShareHint') }}
        </p>
      </section>

      <BookExpertAttachmentsPanel
        v-if="isOwner"
        class="be-chat__attachments mt-3"
        :expert-id="expert.expert_id"
        :user-id="userId"
      />
    </header>

    <!-- 历史会话抽屉 -->
    <transition name="be-chat__drawer">
      <aside v-if="historyOpen" class="be-chat__history">
        <div class="be-chat__history-head">
          <span>{{ t('bookExpert.historyTitle') }}</span>
          <button type="button" class="be-chat__history-close" @click="historyOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="be-chat__history-body">
          <p v-if="historyError" class="be-chat__history-error">{{ historyError }}</p>
          <p v-else-if="!historyLoading && !sessions.length" class="be-chat__history-empty">
            {{ t('bookExpert.historyEmpty') }}
          </p>
          <button
            v-for="s in sessions"
            :key="s.sessionId"
            type="button"
            class="be-chat__history-item"
            @click="onRestoreSession(s)"
          >
            <span class="be-chat__history-item-title">{{ s.title || s.sessionId }}</span>
            <span class="be-chat__history-item-meta">
              {{ t('bookExpert.historyMessageCount', { n: s.messageCount ?? 0 }) }}
              <template v-if="s.updatedAt"> · {{ formatSessionTime(s.updatedAt) }}</template>
            </span>
          </button>
        </div>
      </aside>
    </transition>

    <div ref="scrollRef" class="be-chat__messages">
      <div v-if="sessionBootstrapping" class="be-chat__empty be-chat__empty--loading">
        <Loader2 class="h-4 w-4 animate-spin" />
        <span>{{ t('bookExpert.historyLoading') }}</span>
      </div>
      <div v-else-if="!messages.length" class="be-chat__empty">{{ t('bookExpert.chatEmpty') }}</div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="be-chat__msg"
        :class="`be-chat__msg--${msg.role}`"
      >
        <div class="be-chat__msg-bubble">
          <ChatMarkdownBody
            v-if="msg.role === 'assistant'"
            :content="msg.content"
            root-class="be-chat-markdown"
          />
          <p v-else class="be-chat__msg-text">{{ msg.content }}</p>
        </div>
      </div>
      <div v-if="generating" class="be-chat__msg be-chat__msg--assistant">
        <div class="be-chat__msg-bubble be-chat__msg-bubble--loading">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>{{ t('bookExpert.thinking') }}</span>
        </div>
      </div>
    </div>

    <form class="be-chat__input-bar" @submit.prevent="onSend">
      <textarea
        v-model="input"
        class="be-chat__input"
        rows="2"
        :placeholder="t('bookExpert.inputPlaceholder', { name: expert.expert_name })"
        :disabled="generating"
        @keydown.enter.exact.prevent="onSend"
      />
      <button type="submit" class="be-chat__send" :disabled="generating || !input.trim()">
        <Send class="h-4 w-4" />
      </button>
    </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Loader2, Send, History, Share2, ChevronDown,
  Link2, Facebook, Twitter, Linkedin, Users, X,
} from 'lucide-vue-next'
import { agentApi, ApiError, isCreditsInsufficient, bookExpertApi } from '@/api'
import {
  toBookExpertSkillName,
  getOrCreateExpertSessionId,
  setActiveExpertSessionId,
} from '@/api/bookExpert'
import { buildExploreExpertShareUrl } from '@/utils/feedOpen'
import ChatMarkdownBody from '@/components/editor/chat/ChatMarkdownBody.vue'
import BookExpertAvatarPicker from '@/components/workspace/BookExpertAvatarPicker.vue'
import ExploreTopicCategoryPicker from '@/components/explore/ExploreTopicCategoryPicker.vue'
import BookExpertAttachmentsPanel from '@/components/workspace/BookExpertAttachmentsPanel.vue'
import { useExploreTopicCategories } from '@/composables/useExploreTopicCategories'
import { pickExpertTopicCategoryId } from '@/constants/exploreTopicCategories'
import {
  readExpertCategoryDraft,
  writeExpertCategoryDraft,
} from '@/utils/expertTopicCategoryDraft'
import type {
  BookExpertSummary,
  BookExpertPublishReq,
  BookExpertSessionMessage,
  BookExpertSessionSummary,
} from '@/api/types'

const props = defineProps<{
  expert: BookExpertSummary
  userId: string | null
  projectId: string
  /** 从侧栏历史进入时指定 be-* session，否则用 localStorage 默认会话 */
  initialSessionId?: string | null
}>()
const emit = defineEmits<{
  exit: []
  'expert-updated': [expert: BookExpertSummary]
  'sessions-changed': []
}>()

const { t } = useI18n()
const { selectableOptions, resolveLabelById } = useExploreTopicCategories()

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string }
const messages = ref<ChatMessage[]>([])
const input = ref('')
const generating = ref(false)
const scrollRef = ref<HTMLElement | null>(null)
let abortController: AbortController | null = null

/** 专家会话独立 sessionId：be-<expertId>-<uuid>（Python 按前缀反查历史） */
const sessionId = ref('')

/** 历史抽屉 */
const historyOpen = ref(false)
const historyLoading = ref(false)
const historyError = ref('')
const sessions = ref<BookExpertSessionSummary[]>([])
/** 进入页面时从服务端恢复当前 sessionId 的对话 */
const sessionBootstrapping = ref(false)
let sessionRestoreGeneration = 0

/** 分享菜单 */
const shareMenuOpen = ref(false)
const sharingToCommunity = ref(false)

const selectedCategoryId = ref('')
const updatingCategory = ref(false)

function syncTopicCategoryFromExpert(ex: BookExpertSummary) {
  const fromExpert = pickExpertTopicCategoryId(ex)
  const draft = ex.visibility !== 'public' ? readExpertCategoryDraft(ex.expert_id) : ''
  selectedCategoryId.value = fromExpert || draft || ''
}

const resolvedTopicCategoryId = computed(
  () => selectedCategoryId.value || pickExpertTopicCategoryId(props.expert),
)

const currentCategoryLabel = computed(() => {
  const id = resolvedTopicCategoryId.value
  if (!id) {
    return (
      String(props.expert.topicCategoryName ?? props.expert.topic_category_name ?? '').trim()
      || null
    )
  }
  const fromCatalog = resolveLabelById(id)
  if (fromCatalog) return fromCatalog
  const fromOptions = selectableOptions.value.find(
    (option) => option.id.toLowerCase() === id.toLowerCase(),
  )?.label
  if (fromOptions) return fromOptions
  if (selectedCategoryId.value) return id
  return (
    String(props.expert.topicCategoryName ?? props.expert.topic_category_name ?? '').trim()
    || null
  )
})

function applyLocalTopicCategory(categoryId: string) {
  const label =
    resolveLabelById(categoryId)
    || selectableOptions.value.find((option) => option.id === categoryId)?.label
    || ''
  selectedCategoryId.value = categoryId
  const patch: BookExpertSummary = {
    ...props.expert,
    topic_category_id: categoryId,
    topicCategoryId: categoryId,
    ...(label ? { topic_category_name: label, topicCategoryName: label } : {}),
  }
  emit('expert-updated', patch)
  if (props.expert.visibility !== 'public') {
    writeExpertCategoryDraft(props.expert.expert_id, categoryId)
  }
}

async function onSelectTopicCategory(categoryId: string) {
  const currentId = resolvedTopicCategoryId.value
  if (!categoryId || categoryId === currentId || updatingCategory.value || !props.userId) return

  applyLocalTopicCategory(categoryId)

  if (props.expert.visibility !== 'public') return

  updatingCategory.value = true
  try {
    const result = await bookExpertApi.updateExpertTopicCategory(
      props.expert.expert_id,
      String(props.userId),
      categoryId,
    )
    const cid = result.topic_category_id || categoryId
    emit('expert-updated', {
      ...props.expert,
      topic_category_id: cid,
      topicCategoryId: cid,
      topic_category_name: result.topic_category_name ?? props.expert.topic_category_name,
      topicCategoryName: result.topic_category_name ?? props.expert.topicCategoryName,
    })
    syncTopicCategoryFromExpert({
      ...props.expert,
      topic_category_id: cid,
      visibility: props.expert.visibility,
    })
    ElMessage.success(t('workspace.projectTopicCategorySaved'))
  } catch (e: unknown) {
    syncTopicCategoryFromExpert(props.expert)
    ElMessage.error(e instanceof Error ? e.message : t('common.actionFailed'))
  } finally {
    updatingCategory.value = false
  }
}

function publishTopicCategoryPayload(): Pick<BookExpertPublishReq, 'topicCategoryId'> {
  const cid = resolvedTopicCategoryId.value
  return cid ? { topicCategoryId: cid } : {}
}

function publishTopicCategoryFields(): Partial<BookExpertSummary> {
  const cid = resolvedTopicCategoryId.value
  if (!cid) return {}
  const label = resolveLabelById(cid) || currentCategoryLabel.value || undefined
  return {
    topic_category_id: cid,
    topicCategoryId: cid,
    ...(label ? { topic_category_name: label, topicCategoryName: label } : {}),
  }
}

const shareToCommunityLabel = computed(() =>
  props.expert.visibility === 'public'
    ? t('workspace.shareInCommunity')
    : t('workspace.shareToCommunity'),
)

const isOwner = computed(
  () => Boolean(props.userId) && String(props.expert.owner_user_id || '') === String(props.userId),
)

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/** 与 PPT/小说 RAG 一致：优先 markdown 字段，整包 knowledge_response 覆盖而非拼接 */
function extractBookExpertAssistantText(o: Record<string, unknown>): string {
  const md = o.markdown ?? o.markdown_content
  if (typeof md === 'string' && md.trim()) return md
  const resp = o.response ?? o.message ?? o.full_text ?? o.content
  return typeof resp === 'string' ? resp : ''
}

function extractBookExpertStreamDelta(o: Record<string, unknown>): string {
  if (o.delta != null) return String(o.delta)
  if (o.text != null) return String(o.text)
  if (o.chunk != null) return String(o.chunk)
  return ''
}

function isKnowledgePayload(event: string, o: Record<string, unknown>): boolean {
  const ev = event.toLowerCase()
  const status = String(o.status ?? '').toLowerCase()
  return ev === 'knowledge_response' || status === 'knowledge_response'
}

function applyBookExpertStreamEvent(
  event: string,
  o: Record<string, unknown>,
  state: { text: string; msg: ChatMessage },
) {
  const ev = event.toLowerCase()

  if (ev === 'llm_text_stream_delta') {
    const field = String(o.field ?? o.stream_id ?? '').toLowerCase()
    if (field && !field.includes('response') && !field.includes('summary') && !field.includes('markdown')) {
      return
    }
    const delta = extractBookExpertStreamDelta(o)
    if (!delta) return
    state.text += delta
    state.msg.content = state.text
    scrollToBottom()
    return
  }

  if (ev === 'llm_text_stream_end' || ev === 'chat_response' || isKnowledgePayload(ev, o)) {
    const full = extractBookExpertAssistantText(o)
    if (!full) return
    state.text = full
    state.msg.content = full
    scrollToBottom()
  }
}

// ── 历史会话 ──────────────────────────────────────────────

function mapSessionMessages(raw: BookExpertSessionMessage[]): ChatMessage[] {
  return raw
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ id: newId(), role: m.role, content: m.content }))
}

/** 进入专家页 / 刷新后：用 localStorage 中的 be-* sessionId 拉取已持久化消息 */
async function restoreSessionMessages(sid: string, opts?: { silent?: boolean; allowLatestFallback?: boolean }) {
  if (!props.userId || !sid.trim()) return
  const gen = ++sessionRestoreGeneration
  sessionBootstrapping.value = true
  try {
    const res = await bookExpertApi.getExpertSessionMessages(
      props.expert.expert_id,
      sid,
      String(props.userId),
    )
    if (gen !== sessionRestoreGeneration) return
    const restored = mapSessionMessages(res?.messages ?? [])
    if (restored.length) {
      messages.value = restored
      scrollToBottom()
      return
    }
    if (opts?.allowLatestFallback !== false && isOwner.value) {
      await restoreLatestSessionFromList(gen)
    }
  } catch (e: unknown) {
    if (gen !== sessionRestoreGeneration) return
    const code = e instanceof ApiError ? e.code : 0
    if (code === 404 && opts?.allowLatestFallback !== false && isOwner.value) {
      await restoreLatestSessionFromList(gen)
      return
    }
    if (!opts?.silent) {
      historyError.value = e instanceof Error ? e.message : t('bookExpert.historyError')
    }
  } finally {
    if (gen === sessionRestoreGeneration) sessionBootstrapping.value = false
  }
}

/** localStorage 的 session 在库中尚无记录时，回退到该专家最近一条会话 */
async function restoreLatestSessionFromList(expectedGen: number) {
  if (!props.userId) return
  try {
    const res = await bookExpertApi.listExpertSessions(
      props.expert.expert_id,
      String(props.userId),
    )
    if (expectedGen !== sessionRestoreGeneration) return
    const latest = res?.sessions?.[0]
    if (!latest?.sessionId) return
    if (latest.sessionId === sessionId.value && !(latest.messageCount ?? 0)) return

    const detail = await bookExpertApi.getExpertSessionMessages(
      props.expert.expert_id,
      latest.sessionId,
      String(props.userId),
    )
    if (expectedGen !== sessionRestoreGeneration) return
    const restored = mapSessionMessages(detail?.messages ?? [])
    if (!restored.length) return

    setActiveExpertSessionId(props.expert.expert_id, latest.sessionId, String(props.userId))
    sessionId.value = latest.sessionId
    messages.value = restored
    scrollToBottom()
  } catch {
    /* 新专家或无权限时静默 */
  }
}

function toggleHistory() {
  historyOpen.value = !historyOpen.value
  if (historyOpen.value && !sessions.value.length) loadHistory()
}

async function loadHistory() {
  if (!props.userId || historyLoading.value) return
  historyLoading.value = true
  historyError.value = ''
  try {
    const res = await bookExpertApi.listExpertSessions(
      props.expert.expert_id,
      String(props.userId),
    )
    sessions.value = res?.sessions ?? []
  } catch (e: unknown) {
    historyError.value = e instanceof Error ? e.message : t('bookExpert.historyError')
  } finally {
    historyLoading.value = false
  }
}

async function onRestoreSession(s: BookExpertSessionSummary) {
  if (!props.userId || historyLoading.value) return
  historyLoading.value = true
  try {
    const res = await bookExpertApi.getExpertSessionMessages(
      props.expert.expert_id,
      s.sessionId,
      String(props.userId),
    )
    const restored = mapSessionMessages(res?.messages ?? [])
    messages.value = restored
    setActiveExpertSessionId(props.expert.expert_id, s.sessionId, String(props.userId))
    sessionId.value = s.sessionId
    historyOpen.value = false
    ElMessage.success(t('bookExpert.historyRestored'))
    scrollToBottom()
  } catch {
    ElMessage.error(t('bookExpert.historyRestoreFailed'))
  } finally {
    historyLoading.value = false
  }
}

function formatSessionTime(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

// ── 封面：从 public/book-expert/avatars 下拉选择 ──

function onCoverPresetSaved(coverUrl: string) {
  emit('expert-updated', { ...props.expert, cover_url: coverUrl })
}

// ── 分享（私有专家先引导发布；公开页 /explore/expert/{id}） ──

async function ensurePublicForShare(): Promise<boolean> {
  if (props.expert.visibility === 'public') return true
  if (!isOwner.value) return false
  try {
    await ElMessageBox.confirm(t('bookExpert.shareNeedsPublish'), t('bookExpert.share'), {
      type: 'info',
      confirmButtonText: t('bookExpert.publish'),
      cancelButtonText: t('common.cancel'),
    })
  } catch {
    return false
  }
  try {
    const res = await bookExpertApi.publishExpert(props.expert.expert_id, {
      userId: String(props.userId),
      public: true,
      ...publishTopicCategoryPayload(),
    })
    emit('expert-updated', {
      ...props.expert,
      visibility: res?.visibility ?? 'public',
      ...publishTopicCategoryFields(),
    })
    if (props.expert.visibility !== 'public') {
      writeExpertCategoryDraft(props.expert.expert_id, '')
    }
    ElMessage.success(t('bookExpert.published'))
    return true
  } catch {
    ElMessage.error(t('bookExpert.sharePublishFailed'))
    return false
  }
}

type ShareAction = 'link' | 'facebook' | 'x' | 'linkedin'

/** 发布到公共专家广场（社区发现）；已公开则打开公开页 */
async function onShareToCommunity() {
  shareMenuOpen.value = false
  if (!props.userId || !isOwner.value || sharingToCommunity.value) return

  if (props.expert.visibility === 'public') {
    window.open(buildExploreExpertShareUrl(props.expert.expert_id), '_blank', 'noopener,noreferrer')
    return
  }

  try {
    await ElMessageBox.confirm(t('bookExpert.shareToCommunityConfirm'), t('workspace.shareToCommunity'), {
      type: 'info',
      confirmButtonText: t('bookExpert.publish'),
      cancelButtonText: t('common.cancel'),
    })
  } catch {
    return
  }

  sharingToCommunity.value = true
  try {
    const res = await bookExpertApi.publishExpert(props.expert.expert_id, {
      userId: String(props.userId),
      public: true,
      ...publishTopicCategoryPayload(),
    })
    emit('expert-updated', {
      ...props.expert,
      visibility: res?.visibility ?? 'public',
      ...publishTopicCategoryFields(),
    })
    writeExpertCategoryDraft(props.expert.expert_id, '')
    ElMessage.success(t('workspace.shareToCommunitySuccess'))
  } catch (e: unknown) {
    ElMessage.error(
      e instanceof ApiError || e instanceof Error ? e.message : t('bookExpert.sharePublishFailed'),
    )
  } finally {
    sharingToCommunity.value = false
  }
}

async function runShare(action: ShareAction) {
  shareMenuOpen.value = false
  if (!(await ensurePublicForShare())) return
  const url = buildExploreExpertShareUrl(props.expert.expert_id)
  const text = props.expert.expert_name || ''
  try {
    if (action === 'link') {
      await navigator.clipboard.writeText(url)
      ElMessage.success(t('bookExpert.shareCopied'))
      return
    }
    const encoded = encodeURIComponent(url)
    const target =
      action === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
        : action === 'x'
          ? `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(text)}`
          : `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
    window.open(target, '_blank', 'noopener,noreferrer')
  } catch {
    ElMessage.error(t('bookExpert.shareCopyFailed'))
  }
}

// ── 发送（SSE） ───────────────────────────────────────────

async function onSend() {
  const text = input.value.trim()
  if (!text || generating.value || !props.userId) return
  const userMsg: ChatMessage = { id: newId(), role: 'user', content: text }
  messages.value.push(userMsg)
  input.value = ''
  scrollToBottom()
  generating.value = true
  abortController?.abort()
  abortController = new AbortController()

  let assistantText = ''
  const assistantMsg: ChatMessage = { id: newId(), role: 'assistant', content: '' }
  messages.value.push(assistantMsg)

  try {
    await agentApi.chatStream(
      {
        message: text,
        userId: props.userId,
        projectId: sessionId.value || props.projectId,
        sessionId: sessionId.value,
        isAgent: true,
        skill: true,
        skillName: toBookExpertSkillName(props.expert.expert_id),
        streamRequestId: `expert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      {
        onEvent: (event, data) => {
          const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
          applyBookExpertStreamEvent(event, o, { text: assistantText, msg: assistantMsg })
          assistantText = String(assistantMsg.content || assistantText)
        },
        onError: (msg) => {
          assistantMsg.content = assistantText || msg
          if (isCreditsInsufficientMessage(msg)) {
            ElMessage.error(t('workspace.creditsInsufficient'))
          }
        },
        onComplete: (data) => {
          const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
          const full = extractBookExpertAssistantText(o)
          if (full) {
            assistantText = full
            assistantMsg.content = full
          } else if (!assistantMsg.content && assistantText) {
            assistantMsg.content = assistantText
          }
          if (!assistantMsg.content) assistantMsg.content = t('bookExpert.noResponse')
          scrollToBottom()
          // 新消息落库后刷新抽屉列表与侧栏历史
          if (historyOpen.value) loadHistory()
          emit('sessions-changed')
        },
      },
      abortController.signal,
    )
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') return
    const msg = e instanceof ApiError ? e.message : (e as Error)?.message || t('bookExpert.chatFailed')
    assistantMsg.content = assistantText || msg
    if (isCreditsInsufficient(e)) ElMessage.error(t('workspace.creditsInsufficient'))
  } finally {
    generating.value = false
    scrollToBottom()
  }
}

function isCreditsInsufficientMessage(msg: string): boolean {
  return /CREDITS_INSUFFICIENT|积分不足/i.test(msg)
}

onBeforeUnmount(() => {
  abortController?.abort()
})

function resolveSessionIdForExpert(expertId: string): string {
  const id = String(expertId || '').trim()
  const uid = props.userId ? String(props.userId) : ''
  if (!uid) return ''
  const initial = String(props.initialSessionId || '').trim()
  if (initial && initial.startsWith(`be-${id}-`)) {
    setActiveExpertSessionId(id, initial, uid)
    return initial
  }
  return getOrCreateExpertSessionId(id, uid)
}

watch(
  () => props.expert,
  (ex) => syncTopicCategoryFromExpert(ex),
  { immediate: true, deep: true },
)

watch(
  () => [props.expert.expert_id, props.initialSessionId] as const,
  ([id]) => {
    messages.value = []
    input.value = ''
    historyOpen.value = false
    sessions.value = []
    historyError.value = ''
    sessionId.value = resolveSessionIdForExpert(id)
    // 非本人专家（公共广场）：空白开聊，不拉取服务端历史
    if (isOwner.value) {
      void restoreSessionMessages(sessionId.value, {
        silent: true,
        allowLatestFallback: true,
      })
    }
  },
  { immediate: true },
)

watch(
  () => props.userId,
  (uid, prev) => {
    if (!uid || uid === prev || !sessionId.value) return
    if (isOwner.value) {
      void restoreSessionMessages(sessionId.value, {
        silent: true,
        allowLatestFallback: true,
      })
    }
  },
)
</script>

<style scoped>
.book-expert-chat {
  /* 调色板对齐 tailwind.config.js（项目无 shadcn CSS 变量，hsl(var(--x)) 全部无效，
     此前「边框不显眼」的根因即在此） */
  --be-bg: #0f1419;
  --be-bg-rgb: 15, 20, 25;
  --be-fg: #e7e9ea;
  --be-fg-rgb: 231, 233, 234;
  --be-fg-muted: #71767b;
  --be-card: #16202a;
  --be-card-rgb: 22, 32, 42;
  --be-border: #2f3336;
  --be-border-rgb: 47, 51, 54;
  --be-primary: #1d9bf0;
  --be-primary-rgb: 29, 155, 240;
  --be-primary-fg: #ffffff;

  display: flex; flex-direction: column; height: 100%; min-height: 0;
  max-width: 72rem; margin: 0 auto; width: 100%;
}
.book-expert-chat__shell {
  position: relative;
  flex: 1; display: flex; flex-direction: column; min-height: min(720px, calc(100dvh - 7rem));
  border: 1px solid var(--be-border);
  border-radius: 1rem;
  background: var(--be-card);
  box-shadow: 0 25px 50px -12px rgba(var(--be-fg-rgb), 0.18);
  overflow: hidden;
}
.be-chat__header {
  flex-shrink: 0; padding: 16px 24px 14px;
  border-bottom: 1px solid var(--be-border);
  background: linear-gradient(
    180deg,
    rgb(var(--be-card-rgb)) 0%,
    rgba(var(--be-card-rgb), 0.92) 100%
  );
}
.be-chat__back {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: transparent; padding: 4px 0;
  font-size: 13px; color: var(--be-fg-muted); cursor: pointer;
  transition: color 0.15s;
}
.be-chat__back:hover { color: var(--be-fg); }
.be-chat__title-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.be-chat__cover {
  width: 56px; height: 56px; flex-shrink: 0; object-fit: cover;
  border-radius: 12px; border: 1px solid var(--be-border);
}
.be-chat__title-col { display: flex; flex-direction: column; min-width: 0; }
.be-chat__title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.be-chat__badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;
  background: rgba(var(--be-primary-rgb), 0.14); color: var(--be-primary);
}
.be-chat__title { font-size: 18px; font-weight: 700; color: var(--be-fg); margin: 0; }
.be-chat__book { margin-top: 4px; font-size: 13px; color: var(--be-fg-muted); }

/* 工具条：历史 / 封面 / 分享 */
.be-chat__actions {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px;
}
.be-chat__action {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 9999px;
  border: 1px solid var(--be-border); background: rgba(var(--be-bg-rgb), 0.6);
  font-size: 12px; color: var(--be-fg-muted); cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.be-chat__action:hover:not(:disabled) {
  color: var(--be-fg); border-color: rgba(var(--be-primary-rgb), 0.55);
  background: rgba(var(--be-primary-rgb), 0.08);
}
.be-chat__action:disabled { opacity: 0.6; cursor: not-allowed; }
.be-chat__share-wrap { position: relative; }
.be-chat__chevron--open { transform: rotate(180deg); }
.be-chat__share-menu {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
  min-width: 200px; padding: 6px;
  border-radius: 12px; border: 1px solid var(--be-border);
  background: var(--be-card); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}
.be-chat__share-item {
  display: flex; width: 100%; align-items: center; gap: 10px;
  padding: 8px 10px; border: none; border-radius: 8px;
  background: transparent; font-size: 13px; color: var(--be-fg);
  cursor: pointer; text-align: left;
  transition: background 0.15s;
}
.be-chat__share-item:hover { background: rgba(var(--be-primary-rgb), 0.12); }
.be-chat__share-backdrop { position: fixed; inset: 0; z-index: 20; }

/* 历史抽屉 */
.be-chat__history {
  position: absolute; top: 0; right: 0; bottom: 0; z-index: 25;
  width: min(320px, 88%); display: flex; flex-direction: column;
  border-left: 1px solid var(--be-border);
  background: var(--be-card);
  box-shadow: -12px 0 32px rgba(0, 0, 0, 0.35);
}
.be-chat__history-head {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; font-size: 13px; font-weight: 600; color: var(--be-fg);
  border-bottom: 1px solid var(--be-border);
}
.be-chat__history-close {
  border: none; background: transparent; color: var(--be-fg-muted); cursor: pointer;
  padding: 4px; border-radius: 6px; display: inline-flex;
}
.be-chat__history-close:hover { color: var(--be-fg); background: rgba(var(--be-fg-rgb), 0.08); }
.be-chat__history-body {
  flex: 1; min-height: 0; overflow-y: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 8px;
}
.be-chat__history-empty, .be-chat__history-error {
  margin: 12px 6px; font-size: 12px; line-height: 1.6;
  color: var(--be-fg-muted); text-align: center;
}
.be-chat__history-error { color: #f87171; }
.be-chat__history-item {
  display: flex; flex-direction: column; gap: 4px; width: 100%;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--be-border); background: rgba(var(--be-bg-rgb), 0.6);
  cursor: pointer; text-align: left; transition: border-color 0.15s;
}
.be-chat__history-item:hover { border-color: rgba(var(--be-primary-rgb), 0.55); }
.be-chat__history-item-title {
  font-size: 13px; color: var(--be-fg);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.be-chat__history-item-meta { font-size: 11px; color: var(--be-fg-muted); }
.be-chat__drawer-enter-active, .be-chat__drawer-leave-active { transition: transform 0.2s ease; }
.be-chat__drawer-enter-from, .be-chat__drawer-leave-to { transform: translateX(100%); }
.be-chat__messages {
  flex: 1; min-height: 0; overflow-y: auto; padding: 20px 28px;
  display: flex; flex-direction: column; gap: 12px;
  background: var(--be-bg);
}
.be-chat__empty {
  margin: auto; max-width: 26rem; text-align: center;
  font-size: 14px; line-height: 1.6;
  padding: 20px 18px; border-radius: 12px;
  color: rgba(var(--be-fg-rgb), 0.78);
  border: 1px dashed var(--be-border);
  background: rgba(var(--be-bg-rgb), 0.88);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.be-chat__empty--loading {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.be-chat__msg { display: flex; }
.be-chat__msg--user { justify-content: flex-end; }
.be-chat__msg--assistant { justify-content: flex-start; }
.be-chat__msg-bubble {
  max-width: 92%; padding: 10px 16px; border-radius: 14px;
  font-size: 14px; line-height: 1.6; word-break: break-word;
}
.be-chat__msg--user .be-chat__msg-bubble {
  background: var(--be-primary); color: var(--be-primary-fg);
  border-bottom-right-radius: 4px; max-width: 72%;
}
.be-chat__msg--assistant .be-chat__msg-bubble {
  background: var(--be-card); color: var(--be-fg);
  border: 1px solid var(--be-border);
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
/* 助手 Markdown（与社区对话 feed 同级可读性） */
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body) {
  font-size: 14px;
  line-height: 1.65;
  color: var(--be-fg);
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body p),
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body li) {
  margin: 0.45em 0;
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body h2) {
  margin: 1.1em 0 0.45em;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--be-fg);
  border-bottom: 1px solid rgba(var(--be-border-rgb), 0.85);
  padding-bottom: 0.25em;
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body h3) {
  margin: 0.9em 0 0.35em;
  font-size: 0.98rem;
  font-weight: 600;
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body ol),
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body ul) {
  margin: 0.35em 0 0.65em;
  padding-left: 1.35em;
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body strong) {
  font-weight: 600;
  color: var(--be-fg);
}
.be-chat__msg--assistant :deep(.be-chat-markdown .markdown-body ul ul) {
  margin-top: 0.25em;
  list-style-type: circle;
}
.be-chat__msg-bubble--loading { display: inline-flex; align-items: center; gap: 8px; color: var(--be-fg-muted); }
.be-chat__msg-text { margin: 0; white-space: pre-wrap; }
.be-chat__input-bar {
  flex-shrink: 0;
  display: flex; gap: 8px; align-items: flex-end;
  margin: 0; padding: 14px 24px;
  border-top: 1px solid var(--be-border);
  background: var(--be-card);
}
.be-chat__input {
  flex: 1; resize: none; padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(var(--be-fg-rgb), 0.35);
  background: var(--be-bg);
  font-size: 14px; color: var(--be-fg); line-height: 1.5;
}
.be-chat__input::placeholder { color: var(--be-fg-muted); }
.be-chat__input:focus {
  outline: none;
  border-color: var(--be-primary);
  box-shadow: 0 0 0 3px rgba(var(--be-primary-rgb), 0.25);
}
.be-chat__send {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: var(--be-primary); color: var(--be-primary-fg); cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.be-chat__send:hover:not(:disabled) { background: rgba(var(--be-primary-rgb), 0.88); }
.be-chat__send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
