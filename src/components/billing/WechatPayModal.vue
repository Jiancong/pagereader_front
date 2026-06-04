<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ t('billing.wechatTitle') }}</h3>
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
          <p v-if="totalFee != null" class="mt-3 text-center text-sm text-muted-foreground">
            {{ t('billing.wechatAmount', { fee: totalFee }) }}
          </p>
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
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, X } from 'lucide-vue-next'
import { toQrDataUrl } from '@/utils/qrcodeVendor'
import { wechatSubscriptionApi } from '@/api'

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

let pollTimer = null
let orderId = null

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

async function startPayment() {
  stopPolling()
  loading.value = true
  error.value = null
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
    const status = String(data.paymentStatus ?? '').toUpperCase()
    if (status === 'SUCCESS') {
      stopPolling()
      emit('success')
      emit('close')
    }
  } catch {
    /* keep polling */
  }
}

watch(
  () => [props.open, props.planType, props.userId],
  ([isOpen]) => {
    if (isOpen) startPayment()
    else {
      stopPolling()
      loading.value = false
      error.value = null
      qrDataUrl.value = null
    }
  },
)

onUnmounted(stopPolling)
</script>
