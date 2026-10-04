<template>
  <div v-if="visible" class="project-supp-attachments-below">
    <SupplementaryAttachmentsPanel
      scope="project"
      :resource-id="resolvedProjectId"
      :user-id="resolvedUserId"
      variant="card"
      :read-only="readOnly"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isLoggedIn } from '@/api/token'
import SupplementaryAttachmentsPanel from '@/components/workspace/SupplementaryAttachmentsPanel.vue'

const props = withDefaults(
  defineProps<{
    projectId?: string | null
    userId?: string | number | null
    /** 社区阅读等：仅列表 / 下载 / 在线阅读，不要求登录 */
    readOnly?: boolean
  }>(),
  { readOnly: false },
)

const resolvedProjectId = computed(() => String(props.projectId || '').trim())
const resolvedUserId = computed(() => {
  const id = String(props.userId ?? '').trim()
  return id || null
})

const visible = computed(() => {
  if (!resolvedProjectId.value) return false
  if (props.readOnly) return true
  return isLoggedIn() && Boolean(resolvedUserId.value)
})
</script>

<style lang="scss">
/* 与 PptViewer 主栏同宽左对齐，不铺到右侧对话栏下方 */
.ppt-deck-block .project-supp-attachments-below {
  width: 100%;
  max-width: 100%;
  margin-right: auto;
  margin-left: 0;
  text-align: left;
}

@media (min-width: 768px) {
  .ppt-deck-block:has(.ppt-chat-rail:not(.ppt-chat-rail--collapsed)) .project-supp-attachments-below {
    width: calc(100% - 22rem);
    max-width: calc(100% - 22rem);
  }

  .ppt-deck-block:has(.ppt-chat-rail--collapsed) .project-supp-attachments-below {
    width: calc(100% - 2.5rem);
    max-width: calc(100% - 2.5rem);
  }
}
</style>
