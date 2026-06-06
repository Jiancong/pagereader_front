<template>
  <div class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
    <div v-if="loading" class="flex items-center gap-2">
      <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t('billing.loading') }}
    </div>
    <template v-else-if="status">
      <p class="font-medium text-foreground">{{ planLabel }}</p>
      <p v-if="paypalStatus" class="mt-0.5 text-[11px] text-muted-foreground">
        {{ t('billing.paypalStatus') }}: {{ paypalStatus }}
      </p>
      <p class="mt-1">{{ t('billing.dailyFree') }}: {{ dailyRemaining }}</p>
      <p>{{ t('billing.packageCredits') }}: {{ packageRemaining }}</p>
      <p class="mt-1 text-[11px] leading-snug">{{ t('billing.dailyHint') }}</p>
      <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <RouterLink to="/pricing" class="text-primary hover:underline">
          {{ t('billing.managePlan') }}
        </RouterLink>
        <button
          v-if="canCancel"
          type="button"
          class="text-red-400 hover:underline disabled:opacity-50"
          :disabled="canceling"
          @click="onCancel"
        >
          {{ canceling ? t('billing.canceling') : t('billing.cancelSubscription') }}
        </button>
      </div>
      <p v-if="cancelError" class="mt-1 text-[11px] text-red-400">{{ cancelError }}</p>
    </template>
    <template v-else>
      <RouterLink to="/pricing" class="text-primary hover:underline">{{ t('billing.subscribeCta') }}</RouterLink>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import { subscribeApi, authApi } from '@/api'
import { registerCreditsRefresh } from '@/composables/useCreditsRefresh'

const { t } = useI18n()
const loading = ref(true)
const status = ref(null)
const userId = ref(null)
const canceling = ref(false)
const cancelError = ref(null)

const num = (v) => (v == null || v === '' ? '—' : String(v))

const dailyRemaining = computed(() => {
  const s = status.value
  if (!s) return '—'
  return num(s.dailyFreeCreditsRemaining ?? s.dailyFreeCredits ?? s.freeDailyCredits)
})

const packageRemaining = computed(() => {
  const s = status.value
  if (!s) return '—'
  return num(
    s.monthlyCreditsRemaining ??
      s.packageCreditsRemaining ??
      s.packageCredits ??
      s.monthlyCredits,
  )
})

const planLabel = computed(() => {
  const s = status.value
  if (!s) return t('billing.noPlan')
  const pt = String(s.planType ?? '').toUpperCase()
  if (pt === 'FREE') return t('pricing.freeName')
  return String(s.displayName ?? s.planType ?? t('billing.noPlan'))
})

const paypalStatus = computed(() => {
  const s = status.value
  if (!s?.paypalStatus) return ''
  return String(s.paypalStatus)
})

function resolveCancelPlanId(s) {
  if (!s) return null
  const id = s.paypalPlanId ?? s.planId
  if (id) return String(id)
  const ids = s.paypalPlanIds
  if (Array.isArray(ids) && ids.length) return String(ids[0])
  return null
}

const canCancel = computed(() => {
  const s = status.value
  if (!s || !userId.value) return false
  if (s.canCancel === false) return false
  if (s.canCancel === true) return !!resolveCancelPlanId(s)
  const pt = String(s.planType ?? '').toUpperCase()
  if (!pt || pt === 'FREE') return false
  const ps = String(s.paypalStatus ?? '').toUpperCase()
  if (ps && ['CANCELLED', 'CANCELED', 'EXPIRED', 'SUSPENDED'].includes(ps)) return false
  return !!resolveCancelPlanId(s)
})

async function refresh(silent = false) {
  if (!silent) loading.value = true
  cancelError.value = null
  try {
    status.value = await subscribeApi.getMyStatus()
  } catch {
    if (!silent) status.value = null
  } finally {
    if (!silent) loading.value = false
  }
}

async function onCancel() {
  const planId = resolveCancelPlanId(status.value)
  if (!userId.value || !planId) return
  if (!window.confirm(t('billing.cancelConfirm'))) return

  canceling.value = true
  cancelError.value = null
  try {
    await subscribeApi.cancelSubscription({
      userId: userId.value,
      planId,
      reason: t('billing.cancelReason'),
    })
    await refresh()
  } catch (e) {
    cancelError.value = e?.message || t('billing.cancelFailed')
  } finally {
    canceling.value = false
  }
}

let unregisterRefresh = null

onMounted(async () => {
  try {
    const d = await authApi.getCurrentDetail()
    userId.value = d?.id != null ? d.id : null
  } catch {
    userId.value = null
  }
  unregisterRefresh = registerCreditsRefresh(() => refresh(true))
  await refresh()
})

onUnmounted(() => {
  unregisterRefresh?.()
})

defineExpose({ refresh })
</script>
