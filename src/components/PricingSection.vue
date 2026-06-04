<template>
  <section id="pricing" class="scroll-mt-20 border-t border-border bg-secondary/20 py-20">
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-12 text-center">
        <h2 class="text-3xl font-bold text-foreground">{{ t('pricing.title') }}</h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{{ t('pricing.subtitle') }}</p>
      </div>

      <div class="mb-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 class="text-lg font-semibold text-foreground">{{ t('pricing.howTitle') }}</h3>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('pricing.howHint') }}</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div
            v-for="item in usageItems"
            :key="item.key"
            class="rounded-xl border border-border bg-background/60 p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-foreground">{{ item.title }}</p>
              <span class="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {{ item.credits }}
              </span>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">{{ item.desc }}</p>
          </div>
        </div>
      </div>

      <p v-if="plansLoading" class="mb-8 text-center text-sm text-muted-foreground">
        <Loader2 class="mx-auto mb-2 h-5 w-5 animate-spin" /> {{ t('pricing.loadingPlans') }}
      </p>
      <p v-else-if="plansError" class="mb-8 text-center text-sm text-red-400">{{ plansError }}</p>

      <p class="mb-6 text-center text-sm font-medium text-muted-foreground">{{ t('pricing.packsTitle') }}</p>
      <p class="mb-8 text-center text-xs text-muted-foreground">{{ t('pricing.packsHint') }}</p>

      <div class="grid gap-6 md:grid-cols-2 md:gap-8">
        <div
          v-for="plan in displayPlans"
          :key="plan.planType"
          :class="[
            'relative flex flex-col rounded-2xl border p-6 sm:p-8',
            plan.recommended
              ? 'border-primary bg-card shadow-lg shadow-primary/10'
              : 'border-border bg-card',
          ]"
        >
          <span
            v-if="plan.tagline"
            :class="[
              'absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold',
              plan.recommended ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            ]"
          >
            {{ plan.tagline }}
          </span>
          <h3 class="text-xl font-bold text-foreground">{{ plan.displayName }}</h3>
          <p class="mt-2 text-3xl font-bold tracking-tight text-foreground">
            ${{ plan.monthly?.recurringMonth ?? '—' }}<span class="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <p class="mt-1 text-lg font-medium text-primary">
            {{ t('pricing.creditsPerMonth', { n: plan.credits?.monthlyFastCredits ?? '—' }) }}
          </p>
          <ul class="mt-6 flex-1 space-y-2 text-sm text-muted-foreground">
            <li
              v-for="(h, i) in plan.highlights || []"
              :key="i"
              class="flex items-start gap-2"
            >
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{{ h }}</span>
            </li>
          </ul>

          <div v-if="userId" class="mt-8 space-y-2">
            <div
              v-if="paypalPlanId(plan) && paypalReady"
              :id="paypalContainerId(plan.planType)"
              class="min-h-[48px]"
            />
            <button
              type="button"
              class="w-full rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/50"
              @click="openWechat(plan)"
            >
              {{ t('pricing.wechatPay') }}
            </button>
            <p
              v-if="!paypalReady && paypalPlanId(plan)"
              class="text-center text-xs text-muted-foreground"
            >
              {{ t('pricing.paypalNotConfigured') }}
            </p>
          </div>
          <button
            v-else
            type="button"
            :class="[
              'mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all',
              plan.recommended
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border bg-secondary/50 text-foreground hover:border-primary/50',
            ]"
            @click="onSelectPlan(plan.planType)"
          >
            {{ t('pricing.starterCta') }}
          </button>
        </div>
      </div>

      <p v-if="subscribeSuccess" class="mt-6 text-center text-sm text-emerald-400">{{ subscribeSuccess }}</p>

      <div class="mt-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <p class="text-sm text-muted-foreground">{{ t('pricing.contactHint') }}</p>
        <a
          href="mailto:bd@bytelancers.com?subject=SlideAI%20subscription"
          class="text-sm font-medium text-primary hover:underline"
        >
          {{ t('pricing.contactCta') }}
        </a>
      </div>
      <p class="mt-6 text-center text-xs text-muted-foreground">{{ t('pricing.footnote') }}</p>
    </div>

    <WechatPayModal
      :open="wechatOpen"
      :user-id="userId"
      :plan-type="wechatPlanType"
      :plan-name="wechatPlanName"
      @close="wechatOpen = false"
      @success="onWechatSuccess"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Loader2 } from 'lucide-vue-next'
import { pricingApi } from '@/api'
import { isPaypalConfigured, renderPaypalSubscribeButton } from '@/utils/paypalSubscribe'
import { notifyCreditsRefresh } from '@/composables/useCreditsRefresh'
import WechatPayModal from '@/components/billing/WechatPayModal.vue'

const props = defineProps({
  userId: { type: [String, Number], default: null },
})

const emit = defineEmits(['select-plan', 'subscribed'])

const { t } = useI18n()

const plansLoading = ref(true)
const plansError = ref(null)
const apiPlans = ref([])
const subscribeSuccess = ref(null)
const paypalReady = isPaypalConfigured()
const wechatOpen = ref(false)
const wechatPlanType = ref('')
const wechatPlanName = ref('')
const usageItems = computed(() => [
  {
    key: 'slow',
    title: t('pricing.usageSlow'),
    credits: t('pricing.usageSlowCredits'),
    desc: t('pricing.usageSlowDesc'),
  },
  {
    key: 'fast',
    title: t('pricing.usageFast'),
    credits: t('pricing.usageFastCredits'),
    desc: t('pricing.usageFastDesc'),
  },
])

const displayPlans = computed(() => apiPlans.value)

function paypalPlanId(plan) {
  const ids = plan.paypalPlanIds
  return Array.isArray(ids) && ids.length ? ids[0] : null
}

function paypalContainerId(planType) {
  return `paypal-plan-${planType}`
}

async function mountPaypalButtons() {
  if (!props.userId || !paypalReady) return
  await nextTick()
  for (const plan of displayPlans.value) {
    const planId = paypalPlanId(plan)
    const el = document.getElementById(paypalContainerId(plan.planType))
    if (!planId || !el) continue
    try {
      await renderPaypalSubscribeButton(el, planId, props.userId, async () => {
        subscribeSuccess.value = t('pricing.subscribeSuccess')
        await notifyCreditsRefresh()
        emit('subscribed')
      })
    } catch (e) {
      console.warn('PayPal button', plan.planType, e)
    }
  }
}

onMounted(async () => {
  try {
    apiPlans.value = await pricingApi.getPlans()
  } catch (e) {
    plansError.value = e?.message || t('pricing.loadPlansFailed')
  } finally {
    plansLoading.value = false
    await mountPaypalButtons()
  }
})

watch(() => props.userId, () => mountPaypalButtons())

function onSelectPlan(planType) {
  emit('select-plan', planType)
}

function openWechat(plan) {
  if (!props.userId) {
    onSelectPlan(plan.planType)
    return
  }
  wechatPlanType.value = plan.planType
  wechatPlanName.value = plan.displayName || plan.planType
  wechatOpen.value = true
}

async function onWechatSuccess() {
  subscribeSuccess.value = t('pricing.subscribeSuccess')
  await notifyCreditsRefresh()
  emit('subscribed')
}
</script>
