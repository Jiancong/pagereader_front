<template>
  <header class="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Presentation class="h-5 w-5 text-primary-foreground" />
        </div>
        <span class="text-xl font-bold text-foreground">{{ t('app.brand') }}</span>
      </div>

      <nav class="hidden items-center gap-8 md:flex">
        <a href="#features" class="text-sm text-muted-foreground transition-colors hover:text-foreground">{{ t('nav.features') }}</a>
        <RouterLink
          to="/pricing"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t('nav.pricing') }}
        </RouterLink>
        <a href="#docs" class="text-sm text-muted-foreground transition-colors hover:text-foreground">{{ t('nav.docs') }}</a>
      </nav>

      <div class="flex items-center gap-3">
        <LocaleSwitcher />
        <template v-if="logged">
          <span class="hidden text-sm text-muted-foreground sm:block">{{ nickName }}</span>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="$emit('enter')"
          >
            {{ t('nav.enterWorkspace') }}
          </button>
        </template>
        <template v-else>
          <button
            class="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            @click="$emit('open-login', 'login')"
          >
            {{ t('nav.login') }}
          </button>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="$emit('open-login', 'signup')"
          >
            {{ t('nav.signupTrial') }}
          </button>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Presentation } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import LocaleSwitcher from './LocaleSwitcher.vue'

defineProps({
  logged: { type: Boolean, default: false },
  nickName: { type: String, default: '' },
})
defineEmits(['open-login', 'enter'])

const { t } = useI18n()
</script>
