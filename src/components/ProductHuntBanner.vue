<template>
  <a
    v-if="enabled"
    :href="PRODUCT_HUNT_URL"
    target="_blank"
    rel="noopener noreferrer"
    class="product-hunt-banner group block border-t border-border bg-secondary/30 transition-colors hover:bg-secondary/60"
    @click="onClick"
  >
    <div
      class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4 sm:py-5"
    >
      <p class="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-foreground">
        <span class="text-base">🎉</span>
        <span class="min-[500px]:hidden">{{ t("landing.productHuntBannerShort") }}</span>
        <span class="hidden min-[500px]:inline">{{ t("landing.productHuntBannerLong") }}</span>
      </p>
      <img
        v-if="badgeSrc"
        :src="badgeSrc"
        :alt="t('landing.productHuntBadgeAlt', { brand: t('app.brand') })"
        class="h-[34px] w-[160px] max-w-none shrink-0 transition-transform group-hover:scale-[1.02]"
        width="250"
        height="54"
        loading="lazy"
        decoding="async"
      />
      <span
        v-else
        class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors group-hover:bg-primary/15"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.125 0c-2.746 0-4.974 2.224-4.974 4.974 0 2.746 2.228 4.973 4.974 4.973 2.747 0 4.975-2.227 4.975-4.973 0-2.75-2.228-4.974-4.975-4.974zM5.444 6.85c-1.298 0-2.35.95-2.35 2.18 0 1.23 1.052 2.18 2.35 2.18 1.298 0 2.35-.95 2.35-2.18 0-1.23-1.052-2.18-2.35-2.18zm11.112 0c-1.297 0-2.348.95-2.348 2.18 0 1.23 1.05 2.18 2.348 2.18 1.299 0 2.35-.95 2.35-2.18 0-1.23-1.051-2.18-2.35-2.18zm-7.556.672c1.5 0 2.715 1.215 2.715 2.715S10.5 12.952 9 12.952s-2.715-1.215-2.715-2.715S7.5 7.522 9 7.522zm0 .864c-1.024 0-1.852.828-1.852 1.851S7.976 12.09 9 12.09s1.852-.828 1.852-1.851S10.024 8.386 9 8.386zm-3.556 4.24c-.946 0-1.713.692-1.713 1.588 0 .896.767 1.587 1.713 1.587.946 0 1.713-.691 1.713-1.587 0-.896-.767-1.588-1.713-1.588zm7.112 0c-.946 0-1.713.692-1.713 1.588 0 .896.767 1.587 1.713 1.587.947 0 1.714-.691 1.714-1.587 0-.896-.767-1.588-1.714-1.588z" />
        </svg>
        Product Hunt
      </span>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import {
  PRODUCT_HUNT_BANNER_ENABLED,
  PRODUCT_HUNT_POST_ID,
  PRODUCT_HUNT_URL,
  productHuntBadgeSrc,
} from "@/config/productHunt"
import { gtmCtaClick } from "@/composables/useGtmDataLayer"

const { t } = useI18n()

const enabled = PRODUCT_HUNT_BANNER_ENABLED

const badgeSrc = computed(() =>
  PRODUCT_HUNT_POST_ID ? productHuntBadgeSrc(PRODUCT_HUNT_POST_ID) : "",
)

function onClick() {
  gtmCtaClick("product_hunt_banner")
}
</script>
