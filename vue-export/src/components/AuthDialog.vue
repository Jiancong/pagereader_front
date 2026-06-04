<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />

      <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          class="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>

        <div class="p-6 sm:p-8">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              {{ mode === 'login' ? '登录账号' : '注册账号' }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ mode === 'login' ? '使用邮箱和密码登录' : '注册后将自动登录' }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="email"
                type="email"
                placeholder="邮箱"
                autocomplete="email"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div v-if="mode === 'signup'" class="relative">
              <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="nickName"
                type="text"
                placeholder="昵称（可选）"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="password"
                type="password"
                placeholder="密码"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              {{ mode === 'login' ? '登录' : '注册并登录' }}
            </button>
          </form>

          <div v-if="googleClientId" class="mt-6">
            <div class="flex items-center gap-3">
              <span class="h-px flex-1 bg-border" />
              <span class="text-xs text-muted-foreground">或</span>
              <span class="h-px flex-1 bg-border" />
            </div>
            <div ref="googleBtnRef" class="mt-4 flex justify-center" />
          </div>

          <div class="mt-6 text-center text-sm text-muted-foreground">
            <template v-if="mode === 'login'">
              还没有账号？
              <button class="ml-1 font-medium text-primary hover:underline" @click="switchMode('signup')">立即注册</button>
            </template>
            <template v-else>
              已有账号？
              <button class="ml-1 font-medium text-primary hover:underline" @click="switchMode('login')">去登录</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue"
import { X, Loader2, Mail, Lock, User } from "lucide-vue-next"
import { authApi, ApiError } from "../api"
import { loadGsi, parseEmailFromCredential } from "../utils/google"

const props = defineProps<{ open: boolean; defaultMode?: "login" | "signup" }>()
const emit = defineEmits<{ (e: "close"): void; (e: "success"): void }>()

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ""

const mode = ref<"login" | "signup">(props.defaultMode || "login")
const email = ref("")
const password = ref("")
const nickName = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const googleBtnRef = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      mode.value = props.defaultMode || "login"
      error.value = null
      if (googleClientId) nextTick(renderGoogle)
    }
  },
)

function renderGoogle() {
  loadGsi()
    .then(() => {
      if (!googleBtnRef.value) return
      const gid = (window as any).google.accounts.id
      gid.initialize({
        client_id: googleClientId,
        callback: async (resp: { credential: string }) => {
          error.value = null
          loading.value = true
          try {
            const mail = parseEmailFromCredential(resp.credential)
            await authApi.googleLogin({ googleEmail: mail })
            emit("success")
            emit("close")
          } catch (e: any) {
            error.value = e instanceof ApiError ? e.message : e?.message || "Google 登录失败"
          } finally {
            loading.value = false
          }
        },
      })
      googleBtnRef.value.innerHTML = ""
      gid.renderButton(googleBtnRef.value, { theme: "outline", size: "large", width: 320, text: "continue_with" })
    })
    .catch(() => {
      error.value = "Google 登录初始化失败"
    })
}

function switchMode(m: "login" | "signup") {
  mode.value = m
  error.value = null
}

async function handleSubmit() {
  if (loading.value) return
  error.value = null
  if (!email.value.trim() || !password.value) {
    error.value = "请填写邮箱和密码"
    return
  }
  loading.value = true
  try {
    if (mode.value === "login") {
      await authApi.passwordLogin({ username: email.value.trim(), password: password.value })
    } else {
      await authApi.signUpAndLogin({
        email: email.value.trim(),
        password: password.value,
        nickName: nickName.value.trim() || undefined,
      })
    }
    emit("success")
    emit("close")
  } catch (e: any) {
    error.value = e instanceof ApiError ? e.message : e?.message || "操作失败"
  } finally {
    loading.value = false
  }
}
</script>
