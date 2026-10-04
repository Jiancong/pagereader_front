<template>
  <SupplementaryAttachmentsPanel
    v-if="visible"
    scope="project"
    :resource-id="resolvedProjectId"
    :user-id="resolvedUserId"
    variant="card"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isLoggedIn } from '@/api/token'
import SupplementaryAttachmentsPanel from '@/components/workspace/SupplementaryAttachmentsPanel.vue'

const props = defineProps<{
  projectId?: string | null
  userId?: string | number | null
}>()

const resolvedProjectId = computed(() => String(props.projectId || '').trim())
const resolvedUserId = computed(() => String(props.userId ?? '').trim())

const visible = computed(
  () =>
    isLoggedIn() &&
    Boolean(resolvedProjectId.value) &&
    Boolean(resolvedUserId.value),
)
</script>
