<template>
  <div class="group relative inline-flex items-center">
    <el-button class="signup-btn" @click="handleLoginClick('header_login_bar')">
      {{ t("home.sign") }}
    </el-button>

    <!-- 桌面：悬停「注册/登录」展开；与竞品类似，锚在按钮右下 -->
    <div
      v-if="!promoDismissed"
      class="login-promo-floating pointer-events-none invisible absolute right-[-20px] top-full z-[200] mt-0 w-[min(100vw-24px,376px)] -translate-y-1 scale-[0.98] pt-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-hover:delay-75 max-md:hidden md:block"
      :aria-label="t('home.loginPromoAria')"
      role="dialog"
    >
      <div
        class="relative mt-1 w-full overflow-hidden rounded-[14px] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        @click.stop
      >
        <button
          type="button"
          class="absolute right-4 top-4 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-[8px] bg-white text-black transition hover:bg-white/90"
          :title="t('home.loginPromoClose')"
          :aria-label="t('home.loginPromoClose')"
          @click="dismissPromo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 17.1864 17.1854"
            aria-hidden="true"
            class="pointer-events-none"
          >
            <path
              d="M15.7959 0.117157C15.9521 -0.0390524 16.2051 -0.0390524 16.3613 0.117157L17.0693 0.824189C17.2254 0.980406 17.2255 1.23442 17.0693 1.39059L9.86618 8.59274L17.0693 15.7949C17.2254 15.9511 17.2255 16.2051 17.0693 16.3613L16.3613 17.0683C16.2051 17.2245 15.9521 17.2244 15.7959 17.0683L8.59274 9.86618L1.39059 17.0683C1.23442 17.2244 0.981382 17.2244 0.825165 17.0683L0.117157 16.3613C-0.0390524 16.2051 -0.0390524 15.9511 0.117157 15.7949L7.31931 8.59274L0.117157 1.39059C-0.0390524 1.23439 -0.0390524 0.980398 0.117157 0.824189L0.825165 0.117157C0.981375 -0.0390524 1.23439 -0.0390524 1.39059 0.117157L8.59274 7.31931L15.7959 0.117157Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <!-- 顶部品牌色区：主站青色系 / ximeng  slate+沙色（与导航注册按钮、首页主 CTA 一致） -->
        <div
          class="login-promo-head relative flex items-start justify-between gap-3 px-5 pb-4 pt-5"
          :class="isXimengSite ? 'login-promo-head--ximeng' : 'login-promo-head--default'"
        >
          <div class="pr-2 text-left">
            <h3
              class="text-base font-bold leading-tight"
              :class="isXimengSite ? 'login-promo-title--ximeng' : 'login-promo-title--default'"
            >
              {{ t("home.loginPromoTitle") }}
            </h3>
            <p
              class="mt-1 text-xs font-medium"
              :class="isXimengSite ? 'text-white/88' : 'text-white/90'"
            >
              {{ t("home.loginPromoSubtitle") }}
            </p>
          </div>
          <div
            class="pointer-events-none relative flex shrink-0 select-none flex-col items-center justify-center pr-1 pt-0"
            aria-hidden="true"
          >
            <div
              class="relative text-[2.1rem] font-extrabold leading-none drop-shadow-sm"
              :class="isXimengSite ? 'text-[#ddc7ac]' : 'text-[#14ecff]'"
            >
              {{ t("home.loginPromoPoints") }}
            </div>
            <div
              class="mt-0.5 rotate-[-6deg] rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-white"
              :class="isXimengSite ? 'bg-[#a87f4b]/35' : 'bg-[#14ecff]/25'"
            >
              {{ t("home.loginPromoPointsLabel") }}
            </div>
            <span
              class="absolute -right-0.5 top-1.5 h-1.5 w-1.5 rotate-12 rounded-sm"
              :class="isXimengSite ? 'bg-[#ddc7ac]/80' : 'bg-[#00b2ff]/90'"
            />
            <span
              class="absolute -bottom-0.5 left-0 h-1 w-1 rounded-full"
              :class="isXimengSite ? 'bg-[#a87f4b]/90' : 'bg-[#14ecff]/85'"
            />
          </div>
        </div>

        <!-- 深灰区：权益列表 + CTA -->
        <div class="bg-[#101010] px-5 pb-4 pt-1">
          <ul
            class="list-none space-y-2.5 py-3 text-left text-[13px] leading-snug text-white/95"
          >
            <li v-for="(line, i) in bulletKeys" :key="i" class="flex gap-2">
              <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />
              <span>{{ t("home." + line) }}</span>
            </li>
          </ul>
          <button
            type="button"
            class="login-promo-cta mt-1 w-full cursor-pointer rounded-[10px] py-2.5 text-sm font-semibold text-white transition"
            :class="isXimengSite ? 'login-promo-cta--ximeng' : 'login-promo-cta--default'"
            @click="handleLoginClick('header_login_promo')"
          >
            {{ t("home.loginPromoCta") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useUserStore } from "@/composables/user";
import { pushGtmEvent } from "~/composables/useGtmDataLayer";

const runtimeConfig = useRuntimeConfig();
const isXimengSite = computed(
  () => runtimeConfig.public.siteBrand === "ximeng"
);

const SESSION_KEY = "landingLoginPromoDismissed";

const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();

const promoDismissed = ref(false);

const bulletKeys = [
  "loginPromoBullet1",
  "loginPromoBullet2",
  "loginPromoBullet3",
  "loginPromoBullet4",
  "loginPromoBullet5",
];

onMounted(() => {
  if (!import.meta.client) return;
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    promoDismissed.value = true;
  }
});

const dismissPromo = () => {
  promoDismissed.value = true;
  if (import.meta.client) {
    sessionStorage.setItem(SESSION_KEY, "1");
  }
};

const handleLoginClick = (surface = "header_login_bar") => {
  pushGtmEvent("auth_cta_click", {
    destination: userStore.isLogin ? "projects2" : "login",
    surface,
  });
  if (userStore.isLogin) {
    router.push("/projects2");
  } else {
    const redirect =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    router.push({ path: "/login", query: { redirect } });
  }
};
</script>

<style lang="scss" scoped>
.signup-btn {
  position: relative;
  z-index: 2;
  height: 38px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid #14ecff;
  box-shadow: 0px 0px 40px 0px rgba(0, 178, 255, 0.3) inset;
  background-color: transparent;

  &:hover {
    border-color: gray;
  }

  :deep(span) {
    color: #14ecff;
    text-align: center;
    font-family: Oxanium;
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;

    &:hover {
      color: gray;
    }
  }
}

/* 悬停时浮层可点击（关闭、CTA） */
.group:hover .login-promo-floating {
  pointer-events: auto;
}

/* 与主站注册按钮（#14ecff）一致 */
.login-promo-head--default {
  background: linear-gradient(
    145deg,
    rgba(6, 36, 48, 0.98) 0%,
    rgba(8, 28, 40, 0.98) 50%,
    #061820 100%
  );
  border-bottom: 1px solid rgba(20, 236, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(20, 236, 255, 0.08);
}

.login-promo-title--default {
  color: #14ecff;
}

.login-promo-cta--default {
  background: linear-gradient(90deg, #0090c4 0%, #14ecff 52%, #2af0ff 100%);
  box-shadow: 0 0 24px rgba(0, 178, 255, 0.22);
}

.login-promo-cta--default:hover {
  filter: brightness(1.06);
}

/* ximeng：与 Hero xm-glass / xm-btn-primary 同系 */
.login-promo-head--ximeng {
  background: linear-gradient(
    145deg,
    rgba(35, 56, 82, 0.55) 0%,
    rgba(8, 24, 41, 0.88) 55%,
    #081829 100%
  );
  border-bottom: 1px solid rgba(168, 127, 75, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.login-promo-title--ximeng {
  color: #ddc7ac;
}

.login-promo-cta--ximeng {
  background: linear-gradient(135deg, #a87f4b 0%, #6e4e2e 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 8px 24px rgba(8, 24, 41, 0.35);
}

.login-promo-cta--ximeng:hover {
  background: linear-gradient(135deg, #b88b55 0%, #7a5634 100%);
}
</style>
