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

      <div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:gap-8">
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
            <template v-if="plan.isFree">{{ t('pricing.freeName') }}</template>
            <template v-else>
              ${{ plan.monthly?.recurringMonth ?? '—' }}<span class="text-base font-normal text-muted-foreground">/mo</span>
            </template>
          </p>
          <p class="mt-1 text-lg font-medium text-primary">{{ creditsLabel(plan) }}</p>
          <p class="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <HardDrive class="h-4 w-4 shrink-0 text-primary" />
            {{ t('pricing.storageLabel', { size: storageLabel(plan) }) }}
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

          <button
            v-if="plan.isFree"
            type="button"
            class="mt-8 w-full rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/50"
            @click="onSelectPlan(plan.planType)"
          >
            {{ t('pricing.freeCta') }}
          </button>
          <div v-else-if="userId" class="mt-8 space-y-2">
            <div
              v-if="paypalPlanId(plan) && paypalReady"
              :id="paypalContainerId(plan.planType)"
              :class="['min-h-[48px]', wechatOpen && 'invisible pointer-events-none']"
            />
            <WechatPayButton @click="openWechat(plan)">
              {{ t('pricing.wechatPay') }}
            </WechatPayButton>
            <p v-if="wechatBillingNote" class="text-center text-xs text-muted-foreground">
              {{ wechatBillingNote }}
            </p>
            <p v-if="paypalBillingNote" class="text-center text-xs text-muted-foreground">
              {{ paypalBillingNote }}
            </p>
            <p v-if="wechatPriceLine(plan)" class="text-center text-xs text-muted-foreground">
              {{ wechatPriceLine(plan) }}
            </p>
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
            {{ plan.ctaKey ? t(plan.ctaKey) : t('pricing.starterCta') }}
          </button>
        </div>
      </div>

      <div
        v-if="subscribeSuccess"
        ref="subscribeSuccessEl"
        class="mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4"
        role="status"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check class="h-5 w-5 text-emerald-400" />
        </div>
        <p class="text-sm font-medium text-emerald-400">{{ subscribeSuccess }}</p>
      </div>

      <!-- FAQ：积分、结转上限、订阅 -->
      <div class="faq-section mt-16 max-w-3xl mx-auto">
        <h2 class="faq-title text-center text-2xl font-bold text-foreground">{{ t('pricing.faq.title') }}</h2>
        <div class="faq-accordion mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <div v-for="item in faqItems" :key="item.id" class="faq-accordion-item">
            <button
              type="button"
              class="faq-accordion-trigger flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40 sm:px-6"
              :aria-expanded="openFaqId === item.id"
              @click="toggleFaq(item.id)"
            >
              <h4 class="faq-accordion-question text-sm font-semibold text-foreground sm:text-base">
                {{ t(item.questionKey) }}
              </h4>
              <ChevronUp
                class="faq-accordion-icon h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200"
                :class="openFaqId === item.id ? '' : 'rotate-180'"
              />
            </button>
            <div
              v-show="openFaqId === item.id"
              class="faq-accordion-content border-t border-border/60 bg-background/40 px-5 py-4 sm:px-6"
            >
              <div class="faq-accordion-inner space-y-3 text-sm leading-relaxed text-muted-foreground">
                <template v-for="(block, bi) in item.blocks" :key="bi">
                  <p v-if="block.type === 'p'" v-html="t(block.key, block.params)" />
                  <p v-else-if="block.type === 'strong'" class="font-semibold text-foreground" v-html="t(block.key)" />
                  <ul v-else-if="block.type === 'ul'" class="list-disc space-y-1.5 pl-5">
                    <li v-for="(li, lii) in block.items" :key="lii" v-html="t(li.key, li.params)" />
                  </ul>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <p class="text-sm text-muted-foreground">{{ t('pricing.contactHint') }}</p>
        <a
          href="mailto:bd@bytelancers.com?subject=page2top%20subscription"
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
import { Check, Loader2, HardDrive, ChevronUp } from 'lucide-vue-next'
import { pricingApi, formatHkd, resolveWechatMonthlyHkd } from '@/api'
import { isPaypalConfigured, renderPaypalSubscribeButton } from '@/utils/paypalSubscribe'
import { notifyCreditsRefresh } from '@/composables/useCreditsRefresh'
import WechatPayModal from '@/components/billing/WechatPayModal.vue'
import WechatPayButton from '@/components/billing/WechatPayButton.vue'
import { gtmPricingPlanClick, gtmBeginCheckout, gtmPurchase } from '@/composables/useGtmDataLayer'

const props = defineProps({
  userId: { type: [String, Number], default: null },
})

const emit = defineEmits(['select-plan', 'subscribed'])

const { t, locale } = useI18n()

const plansLoading = ref(true)
const plansError = ref(null)
const apiPlans = ref([])
const pricingConfig = ref(null)
const subscribeSuccess = ref(null)
const subscribeSuccessEl = ref(null)
const paypalReady = isPaypalConfigured()
const wechatOpen = ref(false)
const wechatPlanType = ref('')
const wechatPlanName = ref('')
const openFaqId = ref(null)

/** 结转示例：取体验包月积分与结转上限，默认 900 */
const rolloverExampleMonthly = computed(() => {
  const starter = apiPlans.value.find((p) => {
    const key = String(p.planType || '').toUpperCase()
    return key.includes('STARTER') || key.includes('BASIC')
  })
  const n = Number(starter?.credits?.monthlyFastCredits)
  return Number.isFinite(n) && n > 0 ? n : 900
})

const rolloverExampleCap = computed(() => {
  const starter = apiPlans.value.find((p) => {
    const key = String(p.planType || '').toUpperCase()
    return key.includes('STARTER') || key.includes('BASIC')
  })
  const cap = Number(starter?.credits?.maxRollover)
  if (Number.isFinite(cap) && cap > 0) return cap
  return rolloverExampleMonthly.value
})

const rolloverParams = computed(() => {
  const monthly = rolloverExampleMonthly.value
  const cap = rolloverExampleCap.value
  const remain = Math.round(monthly * 0.5)
  const surplus = Math.max(remain + monthly - cap, 0)
  return { monthly, cap, remain, surplus }
})

const creditCostParams = computed(() => ({
  slow: 30,
  fast: 60,
  daily: 30,
}))

const faqItems = computed(() => {
  const rp = rolloverParams.value
  const cp = creditCostParams.value
  return [
    {
      id: 'credits',
      questionKey: 'pricing.faq.credits.q',
      blocks: [
        { type: 'strong', key: 'pricing.faq.credits.agentTitle' },
        { type: 'p', key: 'pricing.faq.credits.agentP1' },
        { type: 'p', key: 'pricing.faq.credits.agentP2' },
        {
          type: 'ul',
          items: [
            { key: 'pricing.faq.credits.liSlow', params: cp },
            { key: 'pricing.faq.credits.liFast', params: cp },
            { key: 'pricing.faq.credits.liDaily', params: cp },
            { key: 'pricing.faq.credits.liFollowUp' },
          ],
        },
        { type: 'p', key: 'pricing.faq.credits.note', params: cp },
      ],
    },
    {
      id: 'rollover',
      questionKey: 'pricing.faq.rollover.q',
      blocks: [
        { type: 'p', key: 'pricing.faq.rollover.intro' },
        { type: 'strong', key: 'pricing.faq.rollover.monthlyTitle' },
        {
          type: 'ul',
          items: [
            { key: 'pricing.faq.rollover.liRoll' },
            { key: 'pricing.faq.rollover.liCap' },
            { key: 'pricing.faq.rollover.liHow' },
            { key: 'pricing.faq.rollover.liExample', params: rp },
          ],
        },
        { type: 'strong', key: 'pricing.faq.rollover.dailyTitle' },
        { type: 'p', key: 'pricing.faq.rollover.dailyP', params: cp },
        { type: 'strong', key: 'pricing.faq.rollover.topupTitle' },
        { type: 'p', key: 'pricing.faq.rollover.topupP' },
      ],
    },
    {
      id: 'extra',
      questionKey: 'pricing.faq.extra.q',
      blocks: [{ type: 'p', key: 'pricing.faq.extra.p' }],
    },
    {
      id: 'renewal',
      questionKey: 'pricing.faq.renewal.q',
      blocks: [{ type: 'p', key: 'pricing.faq.renewal.p' }],
    },
    {
      id: 'slow',
      questionKey: 'pricing.faq.slow.q',
      blocks: [
        { type: 'p', key: 'pricing.faq.slow.disclosure' },
        { type: 'strong', key: 'pricing.faq.slow.queueTitle' },
        { type: 'p', key: 'pricing.faq.slow.queueP', params: cp },
        { type: 'strong', key: 'pricing.faq.slow.priorityTitle' },
        { type: 'p', key: 'pricing.faq.slow.priorityP' },
        {
          type: 'ul',
          items: [
            { key: 'pricing.faq.slow.liPro' },
            { key: 'pricing.faq.slow.liStarter' },
            { key: 'pricing.faq.slow.liFree' },
          ],
        },
        { type: 'strong', key: 'pricing.faq.slow.timeTitle' },
        { type: 'p', key: 'pricing.faq.slow.timeP' },
        {
          type: 'ul',
          items: [
            { key: 'pricing.faq.slow.liIdle' },
            { key: 'pricing.faq.slow.liPeak' },
            { key: 'pricing.faq.slow.liFast', params: cp },
          ],
        },
      ],
    },
    {
      id: 'upgrade',
      questionKey: 'pricing.faq.upgrade.q',
      blocks: [{ type: 'p', key: 'pricing.faq.upgrade.p' }],
    },
  ]
})

function toggleFaq(id) {
  openFaqId.value = openFaqId.value === id ? null : id
}

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

function planKind(plan) {
  const key = String(plan.planType || '').toUpperCase()
  if (key.includes('STARTER') || key.includes('BASIC')) return 'starter'
  if (key.includes('PRO')) return 'pro'
  return null
}

/** 付费套餐：中文优先用 API 文案，英文走 i18n */
function localizePaidPlan(plan) {
  const kind = planKind(plan)
  if (!kind) return plan

  const isZh = String(locale.value || '').startsWith('zh')
  const i18nHighlights =
    kind === 'starter'
      ? [
          t('pricing.starterEquiv'),
          t('pricing.starterDaily'),
          t('pricing.starterF1'),
          t('pricing.starterF2'),
          t('pricing.starterF3'),
        ]
      : [
          t('pricing.proEquiv'),
          t('pricing.proDaily'),
          t('pricing.proF1'),
          t('pricing.proF2'),
          t('pricing.proF3'),
        ]

  return {
    ...plan,
    displayName: isZh && plan.displayName ? plan.displayName : t(`pricing.${kind}Name`),
    tagline: isZh && plan.tagline ? plan.tagline : t(`pricing.${kind}Badge`),
    recommended: plan.recommended ?? kind === 'pro',
    highlights: isZh && plan.highlights?.length ? plan.highlights : i18nHighlights,
    ctaKey: `pricing.${kind}Cta`,
  }
}

const displayPlans = computed(() => {
  void locale.value
  return apiPlans.value.map((plan) => localizePaidPlan(plan))
})

const wechatBillingNote = computed(() => {
  const fromApi = pricingConfig.value?.wechatBilling?.description
  if (fromApi && String(locale.value || '').startsWith('zh')) return fromApi
  return t('pricing.wechatBillingNote')
})

const paypalBillingNote = computed(() => {
  const fromApi = pricingConfig.value?.paypalBilling?.description
  if (fromApi && String(locale.value || '').startsWith('zh')) return fromApi
  return t('pricing.paypalBillingNote')
})

/** 各档云空间（MB）：FREE 100 / Starter 1000 / PRO 5000，按 planType 关键字匹配，价格兜底 */
const STORAGE_MB_BY_PLAN = { FREE: 100, STARTER: 1000, PRO: 5000 }

function storageMbForPlan(plan) {
  const fromApi = Number(plan.storage?.limitMb)
  if (Number.isFinite(fromApi) && fromApi > 0) return fromApi
  const key = String(plan.planType || '').toUpperCase()
  if (STORAGE_MB_BY_PLAN[key] != null) return STORAGE_MB_BY_PLAN[key]
  if (key.includes('FREE') || plan.isFree) return STORAGE_MB_BY_PLAN.FREE
  if (key.includes('STARTER') || key.includes('BASIC')) return STORAGE_MB_BY_PLAN.STARTER
  if (key.includes('PRO')) return STORAGE_MB_BY_PLAN.PRO
  const price = Number(plan.monthly?.recurringMonth ?? 0)
  if (price <= 0) return STORAGE_MB_BY_PLAN.FREE
  if (price < 20) return STORAGE_MB_BY_PLAN.STARTER
  return STORAGE_MB_BY_PLAN.PRO
}

function storageLabel(plan) {
  const mb = storageMbForPlan(plan)
  return mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`
}

function creditsLabel(plan) {
  const monthly = plan.credits?.monthlyFastCredits
  const daily = plan.credits?.dailyFreeCredits
  if (String(locale.value || '').startsWith('zh') && plan.credits?.description) {
    return plan.credits.description
  }
  if (daily != null && monthly != null) {
    return t('pricing.creditsPerMonthWithDaily', { monthly, daily })
  }
  return t('pricing.creditsPerMonth', { n: monthly ?? '—' })
}

function wechatPriceLine(plan) {
  const resolved = resolveWechatMonthlyHkd(plan)
  if (!resolved) return null
  const price = formatHkd(resolved.hkd)
  if (!price) return null
  return resolved.estimated
    ? t('pricing.wechatMonthlyPriceApprox', { price })
    : t('pricing.wechatMonthlyPrice', { price })
}

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
      await renderPaypalSubscribeButton(el, planId, props.userId, {
        onCheckoutStart: () => gtmBeginCheckout(plan.planType, 'paypal'),
        onDone: () => showSubscribeSuccess(plan.planType, 'paypal', plan),
      })
    } catch (e) {
      console.warn('PayPal button', plan.planType, e)
    }
  }
}

onMounted(async () => {
  try {
    const config = await pricingApi.getPricingConfig()
    pricingConfig.value = config
    apiPlans.value = config.plans
  } catch (e) {
    plansError.value = e?.message || t('pricing.loadPlansFailed')
  } finally {
    plansLoading.value = false
    await mountPaypalButtons()
  }
})

watch(() => props.userId, () => mountPaypalButtons())

function onSelectPlan(planType) {
  gtmPricingPlanClick(String(planType || 'unknown'))
  emit('select-plan', planType)
}

function openWechat(plan) {
  if (!props.userId) {
    onSelectPlan(plan.planType)
    return
  }
  gtmBeginCheckout(plan.planType, 'wechat')
  wechatPlanType.value = plan.planType
  wechatPlanName.value = plan.displayName || plan.planType
  wechatOpen.value = true
}

async function showSubscribeSuccess(planType, paymentMethod, plan) {
  const value = Number(plan?.monthly?.recurringMonth)
  gtmPurchase(
    String(planType || wechatPlanType.value || 'unknown'),
    paymentMethod,
    Number.isFinite(value) && value > 0 ? value : undefined,
  )
  subscribeSuccess.value = t('pricing.subscribeSuccess')
  await notifyCreditsRefresh()
  emit('subscribed')
  await nextTick()
  subscribeSuccessEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function onWechatSuccess() {
  showSubscribeSuccess(wechatPlanType.value, 'wechat')
}
</script>
