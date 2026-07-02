<template>
  <header
    :class="[
      'fixed left-0 right-0 z-50 overflow-x-hidden border-b border-border/50 bg-background/80 backdrop-blur-xl',
      withTopBanner ? 'top-11' : 'top-0',
    ]"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
      <RouterLink to="/" class="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
        <AppBrandMark class="shrink-0" />
        <span class="truncate text-base font-bold text-foreground sm:text-xl">{{ t('app.brand') }}</span>
      </RouterLink>

      <nav class="hidden items-center gap-8 md:flex">
        <RouterLink
          :to="{ path: '/', hash: '#features' }"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t('nav.features') }}
        </RouterLink>
        <RouterLink
          to="/explore"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t('nav.explore') }}
        </RouterLink>
        <RouterLink
          to="/pricing"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t('nav.pricing') }}
        </RouterLink>
        <RouterLink
          to="/story"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t('nav.story') }}
        </RouterLink>
      </nav>

      <div class="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
        <LocaleSwitcher class="hidden md:inline-flex" />
        <template v-if="logged">
          <div class="hidden items-center gap-2 lg:flex">
            <img
              v-if="avatar"
              :src="avatar"
              :alt="nickName"
              referrerpolicy="no-referrer"
              class="h-8 w-8 rounded-full object-cover"
            />
            <span class="max-w-[8rem] truncate text-sm text-muted-foreground">{{ nickName }}</span>
          </div>
          <button
            class="whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            @click="$emit('enter')"
          >
            <span class="md:hidden">{{ t('nav.enterWorkspaceShort') }}</span>
            <span class="hidden md:inline">{{ t('nav.enterWorkspace') }}</span>
          </button>
        </template>
        <template v-else>
          <button
            class="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            @click="$emit('open-login', 'login')"
          >
            {{ t('nav.login') }}
          </button>
          <button
            class="whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            @click="$emit('open-login', 'signup')"
          >
            <span class="md:hidden">{{ t('nav.signupTrialShort') }}</span>
            <span class="hidden md:inline">{{ t('nav.signupTrial') }}</span>
          </button>
        </template>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          :aria-label="t('nav.menu')"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <nav
        v-if="mobileOpen"
        class="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
      >
        <div class="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3 sm:px-4">
          <RouterLink
            :to="{ path: '/', hash: '#features' }"
            class="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="mobileOpen = false"
          >
            {{ t('nav.features') }}
          </RouterLink>
          <RouterLink
            to="/explore"
            class="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="mobileOpen = false"
          >
            {{ t('nav.explore') }}
          </RouterLink>
          <RouterLink
            to="/pricing"
            class="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="mobileOpen = false"
          >
            {{ t('nav.pricing') }}
          </RouterLink>
          <RouterLink
            to="/story"
            class="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="mobileOpen = false"
          >
            {{ t('nav.story') }}
          </RouterLink>
          <button
            v-if="!logged"
            type="button"
            class="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            @click="onMobileLogin"
          >
            {{ t('nav.login') }}
          </button>
          <div class="mt-2 flex items-center justify-between border-t border-border/50 px-3 pt-3">
            <span class="text-xs text-muted-foreground">{{ t('common.language') }}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import AppBrandMark from './AppBrandMark.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'

defineProps({
  logged: { type: Boolean, default: false },
  nickName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  withTopBanner: { type: Boolean, default: false },
})
const emit = defineEmits(['open-login', 'enter'])

const { t } = useI18n()
const mobileOpen = ref(false)

const onMobileLogin = () => {
  mobileOpen.value = false
  emit('open-login', 'login')
}
</script>
