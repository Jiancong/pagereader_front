<template>
  <header class="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <RouterLink to="/" class="flex items-center gap-2">
        <AppBrandMark />
        <span class="text-xl font-bold text-foreground">{{ t('app.brand') }}</span>
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

      <div class="flex items-center gap-2 sm:gap-3">
        <LocaleSwitcher />
        <template v-if="logged">
          <div class="hidden items-center gap-2 sm:flex">
            <img
              v-if="avatar"
              :src="avatar"
              :alt="nickName"
              referrerpolicy="no-referrer"
              class="h-8 w-8 rounded-full object-cover"
            />
            <span class="hidden text-sm text-muted-foreground md:inline">{{ nickName }}</span>
          </div>
          <button
            class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4"
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
            class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4"
            @click="$emit('open-login', 'signup')"
          >
            {{ t('nav.signupTrial') }}
          </button>
        </template>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
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
        <div class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
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
            class="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:hidden"
            @click="onMobileLogin"
          >
            {{ t('nav.login') }}
          </button>
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
})
const emit = defineEmits(['open-login', 'enter'])

const { t } = useI18n()
const mobileOpen = ref(false)

const onMobileLogin = () => {
  mobileOpen.value = false
  emit('open-login', 'login')
}
</script>
