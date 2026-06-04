<template>
  <router-view />
</template>

<script setup>
import { useLocaleDocumentSync } from '@/composables/useAppLocale'

useLocaleDocumentSync()
</script>
