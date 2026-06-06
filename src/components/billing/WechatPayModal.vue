<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        @click="$emit('close')"
      />
      <div class="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <WechatIcon class="h-6 w-6 shrink-0 text-[#07C160]" />
              <h3 class="text-lg font-semibold text-foreground">{{ t('billing.wechatTitle') }}</h3>
            </div>
            <p v-if="planName" class="mt-1 text-sm text-muted-foreground">{{ planName }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            :aria-label="t('billing.wechatClose')"
            @click="$emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="loading" class="mt-8 flex flex-col items-center py-6">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <p class="mt-3 text-sm text-muted-foreground">{{ t('billing.wechatCreating') }}</p>
        </div>

        <div v-else-if="paidSuccess" class="mt-8 flex flex-col items-center py-6">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <Check class="h-8 w-8 text-emerald-400" />
          </div>
          <p class="mt-4 text-center text-base font-semibold text-emerald-400">
            {{ t('pricing.subscribeSuccess') }}
          </p>
        </div>

        <div v-else-if="error" class="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {{ error }}
        </div>

        <template v-else-if="qrDataUrl">
          <div class="mt-6 flex justify-center">
            <img
              :src="qrDataUrl"
              :alt="t('billing.wechatQrAlt')"
              class="h-[200px] w-[200px] rounded-lg border border-border bg-white p-2"
            />
          </div>
          <div v-if="formattedFeeHkd" class="mt-4 text-center">
            <p class="text-sm text-muted-foreground">{{ t('billing.wechatAmountLabel') }}</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight text-foreground">{{ formattedFeeHkd }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ t('billing.wechatCurrencyNote') }}</p>
          </div>
          <p class="mt-2 text-center text-xs text-muted-foreground">{{ t('billing.wechatScanHint') }}</p>
          <p class="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 v-if="polling" class="h-4 w-4 animate-spin text-primary" />
            {{ polling ? t('billing.wechatPolling') : t('billing.wechatWaiting') }}
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Loader2, X } from 'lucide-vue-next'
import WechatIcon from '@/components/billing/WechatIcon.vue'
import { toQrDataUrl } from '@/utils/qrcodeVendor'
import {
  wechatSubscriptionApi,
  formatHkdFromFen,
  isWechatPaymentSuccess,
  isWechatPaymentFailed,
} from '@/api'

const props = defineProps({
  open: { type: Boolean, default: false },
  userId: { type: [String, Number], default: null },
  planType: { type: String, default: '' },
  planName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'success'])

const { t } = useI18n()

const loading = ref(false)
const error = ref(null)
const qrDataUrl = ref(null)
const totalFee = ref(null)
const polling = ref(false)
const paidSuccess = ref(false)

/** 后端 totalFee 为微信支付单位「港仙」 */
const formattedFeeHkd = computed(() => formatHkdFromFen(totalFee.value))

let pollTimer = null
let closeSuccessTimer = null
let orderId = null

function clearCloseSuccessTimer() {
  if (closeSuccessTimer) {
    clearTimeout(closeSuccessTimer)
    closeSuccessTimer = null
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

async function startPayment() {
  stopPolling()
  clearCloseSuccessTimer()
  loading.value = true
  error.value = null
  paidSuccess.value = false
  qrDataUrl.value = null
  totalFee.value = null
  orderId = null

  if (!props.userId || !props.planType) {
    error.value = t('billing.wechatMissingParams')
    loading.value = false
    return
  }

  try {
    const data = await wechatSubscriptionApi.createSubscription({
      userId: props.userId,
      planType: props.planType,
    })
    orderId = data.orderId
    totalFee.value = data.totalFee ?? null
    qrDataUrl.value = await toQrDataUrl(data.qrCode, 200, 2)
    loading.value = false
    polling.value = true
    pollTimer = setInterval(checkPayment, 2500)
    await checkPayment()
  } catch (e) {
    error.value = e?.message || t('billing.wechatCreateFailed')
    loading.value = false
  }
}

async function checkPayment() {
  if (!orderId) return
  try {
    const data = await wechatSubscriptionApi.getPaymentStatus(orderId)
    if (isWechatPaymentSuccess(data)) {
      stopPolling()
      paidSuccess.value = true
      emit('success')
      clearCloseSuccessTimer()
      closeSuccessTimer = setTimeout(() => emit('close'), 1600)
      return
    }
    if (isWechatPaymentFailed(data)) {
      stopPolling()
      error.value = t('billing.wechatPaymentFailed')
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[WechatPay] poll failed', e)
  }
}

function setBodyScrollLocked(locked) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => [props.open, props.planType, props.userId],
  ([isOpen]) => {
    setBodyScrollLocked(!!isOpen)
    if (isOpen) startPayment()
    else {
      stopPolling()
      clearCloseSuccessTimer()
      loading.value = false
      error.value = null
      paidSuccess.value = false
      qrDataUrl.value = null
    }
  },
)

onUnmounted(() => {
  stopPolling()
  clearCloseSuccessTimer()
  setBodyScrollLocked(false)
})
</script>
