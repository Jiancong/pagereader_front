<template>
  <a
    v-if="enabled"
    :href="PRODUCT_HUNT_URL"
    target="_blank"
    rel="noopener noreferrer"
    class="product-hunt-banner fixed inset-x-0 top-0 z-[60] border-b border-black/5 bg-[#fafafa]"
    @click="onClick"
  >
    <div
      class="mx-auto flex h-11 w-full max-w-[1368px] items-center justify-between gap-3 px-4 max-[500px]:gap-2 sm:px-6"
    >
      <p class="min-w-0 text-left text-[13px] font-semibold leading-4 text-[#0A0A0A]">
        <span class="min-[500px]:hidden text-[16px] font-medium leading-5 text-[#1a1a1a]">
          {{ t("landing.productHuntBannerShort") }}
        </span>
        <span class="hidden min-[500px]:inline text-[16px] font-medium leading-5 text-[#1a1a1a]">
          {{ t("landing.productHuntBannerLong") }}
        </span>
      </p>
      <img
        v-if="badgeSrc"
        :src="badgeSrc"
        :alt="t('landing.productHuntBadgeAlt', { brand: t('app.brand') })"
        class="h-[39px] w-[184px] max-w-none shrink-0"
        width="250"
        height="54"
        loading="lazy"
        decoding="async"
      />
      <span
        v-else
        class="inline-flex h-[39px] shrink-0 items-center rounded-lg border border-[#da552f]/25 bg-[#da552f]/10 px-4 text-sm font-semibold text-[#da552f]"
      >
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
