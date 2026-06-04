<template>
  <div
    class="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5"
    role="group"
    :aria-label="t('common.language')"
  >
    <button
      v-for="opt in options"
      :key="opt.code"
      type="button"
      :class="[
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        locale === opt.code
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      ]"
      @click="setLocale(opt.code)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useAppLocale } from '@/composables/useAppLocale'

const { t } = useI18n()
const { locale, setLocale, options } = useAppLocale()
</script>
