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
              {{ dialogTitle }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ dialogSubtitle }}
            </p>
          </div>

          <!-- 忘记密码：步骤 1 发验证码 -->
          <form v-if="mode === 'forgot' && forgotStep === 1" class="space-y-4" @submit.prevent="handleSendResetCode">
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="email"
                type="email"
                :placeholder="t('auth.emailPlaceholder')"
                autocomplete="email"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p v-if="success" class="text-sm text-emerald-500">{{ success }}</p>

            <button
              type="submit"
              :disabled="loading || resendCountdown > 0"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              {{ resendCountdown > 0 ? t('auth.forgotResendIn', { seconds: resendCountdown }) : t('auth.forgotSendCode') }}
            </button>
          </form>

          <!-- 忘记密码：步骤 2 设新密码 -->
          <form v-else-if="mode === 'forgot' && forgotStep === 2" class="space-y-4" @submit.prevent="handleResetPassword">
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                :value="email"
                type="email"
                readonly
                class="w-full cursor-default rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-muted-foreground"
              />
            </div>

            <div class="relative">
              <KeyRound class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="resetCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                autocomplete="one-time-code"
                :placeholder="t('auth.forgotCodePlaceholder')"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p class="text-xs text-muted-foreground">{{ t('auth.forgotCodeHint') }}</p>

            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="password"
                type="password"
                :placeholder="t('auth.forgotNewPasswordPlaceholder')"
                autocomplete="new-password"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="confirmPassword"
                type="password"
                :placeholder="t('auth.forgotConfirmPasswordPlaceholder')"
                autocomplete="new-password"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p v-if="success" class="text-sm text-emerald-500">{{ success }}</p>

            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              {{ t('auth.forgotResetBtn') }}
            </button>

            <button
              type="button"
              :disabled="loading || resendCountdown > 0"
              class="w-full text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSendResetCode"
            >
              {{ resendCountdown > 0 ? t('auth.forgotResendIn', { seconds: resendCountdown }) : t('auth.forgotResendCode') }}
            </button>
          </form>

          <!-- 登录 / 注册 -->
          <form v-else class="space-y-4" @submit.prevent="handleSubmit">
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="email"
                type="email"
                :placeholder="t('auth.emailPlaceholder')"
                autocomplete="email"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div v-if="mode === 'signup'" class="relative">
              <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                v-model="nickName"
                type="text"
                :placeholder="t('auth.nickPlaceholder')"
                class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <div v-if="mode === 'login'" class="mb-1.5 flex justify-end">
                <button
                  type="button"
                  class="text-xs text-primary hover:underline"
                  @click="switchMode('forgot')"
                >
                  {{ t('auth.forgotPassword') }}
                </button>
              </div>
              <div class="relative">
                <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  v-model="password"
                  type="password"
                  :placeholder="t('auth.passwordPlaceholder')"
                  :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                  class="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p v-if="success" class="text-sm text-emerald-500">{{ success }}</p>

            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              {{ mode === 'login' ? t('auth.loginBtn') : t('auth.signupBtn') }}
            </button>
          </form>

          <div v-if="mode !== 'forgot' && googleClientId" class="mt-6">
            <div class="flex items-center gap-3">
              <span class="h-px flex-1 bg-border" />
              <span class="text-xs text-muted-foreground">{{ t('auth.or') }}</span>
              <span class="h-px flex-1 bg-border" />
            </div>
            <div ref="googleBtnRef" class="mt-4 flex justify-center" />
          </div>

          <div class="mt-6 text-center text-sm text-muted-foreground">
            <template v-if="mode === 'login'">
              {{ t('auth.noAccount') }}
              <button class="ml-1 font-medium text-primary hover:underline" @click="switchMode('signup')">{{ t('auth.signupLink') }}</button>
            </template>
            <template v-else-if="mode === 'signup'">
              {{ t('auth.hasAccount') }}
              <button class="ml-1 font-medium text-primary hover:underline" @click="switchMode('login')">{{ t('auth.loginLink') }}</button>
            </template>
            <template v-else>
              <button class="font-medium text-primary hover:underline" @click="switchMode('login')">{{ t('auth.forgotBackToLogin') }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"
import { X, Loader2, Mail, Lock, User, KeyRound } from "lucide-vue-next"
import { authApi, ApiError, setLocalAvatar } from "../api"
import { loadGsi, parseProfileFromCredential } from "../utils/google"
import { gtmAuthModalOpen, gtmLogin, gtmSignUp } from "@/composables/useGtmDataLayer"

const { t } = useI18n()

type AuthMode = "login" | "signup" | "forgot"

const props = defineProps<{
  open: boolean
  defaultMode?: "login" | "signup"
  authSource?: string
}>()
const emit = defineEmits<{ (e: "close"): void; (e: "success"): void }>()

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ""

const mode = ref<AuthMode>(props.defaultMode || "login")
const forgotStep = ref<1 | 2>(1)
const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const resetCode = ref("")
const nickName = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const googleBtnRef = ref<HTMLElement | null>(null)
const resendCountdown = ref(0)

let resendTimer: ReturnType<typeof setInterval> | null = null

const dialogTitle = computed(() => {
  if (mode.value === "forgot") return t("auth.forgotTitle")
  return mode.value === "login" ? t("auth.loginTitle") : t("auth.signupTitle")
})

const dialogSubtitle = computed(() => {
  if (mode.value === "forgot") {
    return forgotStep.value === 1 ? t("auth.forgotSubtitle") : t("auth.forgotResetSubtitle")
  }
  return mode.value === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      mode.value = props.defaultMode || "login"
      forgotStep.value = 1
      error.value = null
      success.value = null
      confirmPassword.value = ""
      resetCode.value = ""
      gtmAuthModalOpen(mode.value === "forgot" ? "login" : mode.value, props.authSource || "unknown")
      if (googleClientId && mode.value !== "forgot") nextTick(renderGoogle)
    } else {
      stopResendCountdown()
    }
  },
)

watch(mode, () => {
  if (props.open && googleClientId && mode.value !== "forgot") nextTick(renderGoogle)
})

onUnmounted(() => {
  stopResendCountdown()
})

function stopResendCountdown() {
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  resendCountdown.value = 0
}

function startResendCountdown(seconds = 60) {
  stopResendCountdown()
  resendCountdown.value = seconds
  resendTimer = setInterval(() => {
    if (resendCountdown.value <= 1) {
      stopResendCountdown()
    } else {
      resendCountdown.value -= 1
    }
  }, 1000)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function renderGoogle() {
  loadGsi()
    .then(() => {
      if (!googleBtnRef.value) return
      const gid = (window as any).google.accounts.id
      gid.initialize({
        client_id: googleClientId,
        callback: async (resp: { credential: string }) => {
          error.value = null
          success.value = null
          loading.value = true
          try {
            const profile = parseProfileFromCredential(resp.credential)
            await authApi.googleLogin({ googleEmail: profile.email })
            setLocalAvatar(profile.picture || "")
            gtmLogin("google", props.authSource)
            emit("success")
            emit("close")
          } catch (e: any) {
            error.value = e instanceof ApiError ? e.message : e?.message || t("auth.googleLoginFailed")
          } finally {
            loading.value = false
          }
        },
      })
      googleBtnRef.value.innerHTML = ""
      gid.renderButton(googleBtnRef.value, { theme: "outline", size: "large", width: 320, text: "continue_with" })
    })
    .catch(() => {
      error.value = t("auth.googleInitFailed")
    })
}

function switchMode(m: AuthMode) {
  mode.value = m
  forgotStep.value = 1
  error.value = null
  success.value = null
  confirmPassword.value = ""
  resetCode.value = ""
  if (m !== "forgot") {
    password.value = ""
  }
}

async function handleSendResetCode() {
  if (loading.value || resendCountdown.value > 0) return
  error.value = null
  success.value = null
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    error.value = t("auth.forgotFillEmail")
    return
  }
  if (!isValidEmail(trimmedEmail)) {
    error.value = t("auth.forgotInvalidEmail")
    return
  }
  loading.value = true
  try {
    await authApi.sendEmailCode(trimmedEmail, "resetPwd")
    email.value = trimmedEmail
    success.value = t("auth.forgotCodeSent")
    forgotStep.value = 2
    startResendCountdown()
  } catch (e: any) {
    error.value = e instanceof ApiError ? e.message : e?.message || t("auth.actionFailed")
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  if (loading.value) return
  error.value = null
  success.value = null
  const trimmedEmail = email.value.trim()
  const code = resetCode.value.trim()
  if (!code || !password.value) {
    error.value = t("auth.forgotFillAll")
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = t("auth.forgotPasswordMismatch")
    return
  }
  loading.value = true
  try {
    await authApi.resetPwdByEmailCode({
      email: trimmedEmail,
      code,
      newPwd: password.value,
    })
    success.value = t("auth.forgotResetSuccess")
    mode.value = "login"
    forgotStep.value = 1
    password.value = ""
    confirmPassword.value = ""
    resetCode.value = ""
    stopResendCountdown()
    if (googleClientId) nextTick(renderGoogle)
  } catch (e: any) {
    error.value = e instanceof ApiError ? e.message : e?.message || t("auth.actionFailed")
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (loading.value) return
  error.value = null
  success.value = null
  if (!email.value.trim() || !password.value) {
    error.value = t("auth.fillEmailPassword")
    return
  }
  loading.value = true
  try {
    if (mode.value === "login") {
      await authApi.passwordLogin({ username: email.value.trim(), password: password.value })
      gtmLogin("email", props.authSource)
    } else {
      await authApi.signUpAndLogin({
        email: email.value.trim(),
        password: password.value,
        nickName: nickName.value.trim() || undefined,
      })
      gtmSignUp("email", props.authSource)
    }
    emit("success")
    emit("close")
  } catch (e: any) {
    error.value = e instanceof ApiError ? e.message : e?.message || t("auth.actionFailed")
  } finally {
    loading.value = false
  }
}
</script>
