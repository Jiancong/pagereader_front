<template>
  <SupplementaryAttachmentsPanel
    scope="bookExpert"
    :resource-id="expertId"
    :user-id="userId"
  />
</template>

<script setup lang="ts">
import SupplementaryAttachmentsPanel from '@/components/workspace/SupplementaryAttachmentsPanel.vue'

defineProps<{
  expertId: string
  userId: string | null
}>()
</script>
