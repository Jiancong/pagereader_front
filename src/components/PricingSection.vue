<template>
  <section id="pricing" class="scroll-mt-20 border-t border-border bg-secondary/20 py-20">
    <div class="mx-auto max-w-6xl px-6">
      <div class="mb-12 text-center">
        <h2 class="text-3xl font-bold text-foreground">{{ t('pricing.title') }}</h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{{ t('pricing.subtitle') }}</p>
      </div>

      <!-- 积分消耗说明 -->
      <div class="mb-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 class="text-lg font-semibold text-foreground">{{ t('pricing.howTitle') }}</h3>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('pricing.howHint') }}</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
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

      <p class="mb-6 text-center text-sm font-medium text-muted-foreground">{{ t('pricing.packsTitle') }}</p>
      <p class="mb-8 text-center text-xs text-muted-foreground">{{ t('pricing.packsHint') }}</p>

      <!-- 两档积分包 -->
      <div class="grid gap-6 md:grid-cols-2 md:gap-8">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative flex flex-col rounded-2xl border p-6 sm:p-8',
            plan.highlight
              ? 'border-primary bg-card shadow-lg shadow-primary/10'
              : 'border-border bg-card',
          ]"
        >
          <span
            v-if="plan.badge"
            :class="[
              'absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold',
              plan.highlight ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            ]"
          >
            {{ plan.badge }}
          </span>
          <h3 class="text-xl font-bold text-foreground">{{ plan.name }}</h3>
          <p class="mt-2 text-3xl font-bold tracking-tight text-foreground">{{ plan.price }}</p>
          <p class="mt-1 text-lg font-medium text-primary">{{ plan.credits }}</p>
          <p class="mt-2 text-sm text-muted-foreground">{{ plan.equiv }}</p>
          <ul class="mt-6 flex-1 space-y-2 text-sm text-muted-foreground">
            <li v-for="(f, i) in plan.features" :key="i" class="flex items-start gap-2">
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{{ f }}</span>
            </li>
          </ul>
          <button
            type="button"
            :class="[
              'mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all',
              plan.highlight
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border bg-secondary/50 text-foreground hover:border-primary/50',
            ]"
            @click="onSelectPlan(plan.id)"
          >
            {{ plan.cta }}
          </button>
        </div>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <p class="text-sm text-muted-foreground">{{ t('pricing.contactHint') }}</p>
        <a
          href="mailto:bd@bytelancers.com?subject=SlideAI%20%E7%A7%AF%E5%88%86%E5%A5%97%E9%A4%90"
          class="text-sm font-medium text-primary hover:underline"
        >
          {{ t('pricing.contactCta') }}
        </a>
      </div>
      <p class="mt-6 text-center text-xs text-muted-foreground">{{ t('pricing.footnote') }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import { pushGtmDataLayerObject } from '@/composables/useGtmDataLayer'

const emit = defineEmits(['select-plan'])

const { t } = useI18n()

const usageItems = computed(() => [
  {
    key: 'outline',
    title: t('pricing.usageOutline'),
    credits: t('pricing.usageOutlineCredits'),
    desc: t('pricing.usageOutlineDesc'),
  },
  {
    key: 'ppt',
    title: t('pricing.usagePpt'),
    credits: t('pricing.usagePptCredits'),
    desc: t('pricing.usagePptDesc'),
  },
  {
    key: 'quick',
    title: t('pricing.usageQuick'),
    credits: t('pricing.usageQuickCredits'),
    desc: t('pricing.usageQuickDesc'),
  },
])

const plans = computed(() => [
  {
    id: 'starter',
    name: t('pricing.starterName'),
    badge: t('pricing.starterBadge'),
    price: t('pricing.starterPrice'),
    credits: t('pricing.starterCredits'),
    equiv: t('pricing.starterEquiv'),
    features: [t('pricing.starterF1'), t('pricing.starterF2'), t('pricing.starterF3')],
    cta: t('pricing.starterCta'),
    highlight: false,
  },
  {
    id: 'pro',
    name: t('pricing.proName'),
    badge: t('pricing.proBadge'),
    price: t('pricing.proPrice'),
    credits: t('pricing.proCredits'),
    equiv: t('pricing.proEquiv'),
    features: [t('pricing.proF1'), t('pricing.proF2'), t('pricing.proF3')],
    cta: t('pricing.proCta'),
    highlight: true,
  },
])

function onSelectPlan(planId) {
  pushGtmDataLayerObject({
    event: 'pricing_subscribe_intent',
    plan_id: planId,
  })
  emit('select-plan', planId)
}
</script>
