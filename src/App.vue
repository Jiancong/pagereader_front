<template>
  <router-view v-slot="{ Component }">
    <keep-alive include="WorkspaceView">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup>
import { useLocaleDocumentSync } from '@/composables/useAppLocale'

useLocaleDocumentSync()
</script>
