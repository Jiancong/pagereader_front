<template>
  <div
    class="fixed left-0 w-full z-50 px-4 block md:hidden bg-[#0C0C0C]/80 backdrop-blur-md"
    :style="{ top: `${topOffsetPx}px` }"
  >
    <div class="w-full max-w-[1400px] mx-auto flex justify-between items-center py-3">
      <a href="/"><img class="w-[40px] h-[40px] object-contain" :src="brandLogoSrc" alt="AI生成器" /></a>
      <div class="flex items-center gap-3">
        <!-- ximeng：双 CTA 合并为「开始创作」，点击展开选择 -->
        <div v-if="isXimengSite" class="relative">
          <button class="xm-create-btn" @click.stop="toggleCreateChoice">
            {{ t("home.revamp.navStartCreate") }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"
              :class="{ 'rotate-180': showCreateChoice }">
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div
            v-if="showCreateChoice"
            class="xm-create-menu"
          >
            <button class="xm-create-item" @click="goCreate('/design')">
              {{ t("home.revamp.navDoDesign") }}
            </button>
            <button class="xm-create-item" @click="goCreate('/video')">
              {{ t("home.revamp.navDoVideo") }}
            </button>
          </div>
        </div>
        <slot name="auth-element-mobile"></slot>
        <button class="menu-btn" @click="toggleMenuMobile">
          <img class="w-[18px] object-contain" :src="iconMenu" alt="" />
        </button>
      </div>
    </div>

    <!-- 遮罩层和菜单只在 showMenuMobile 为 true 时渲染 -->
    <div v-if="showMenuMobile">
      <div class="fixed inset-0 bg-black/80 z-40" @click="toggleMenuMobile"></div>
      <div
        class="fixed left-0 right-0 bg-[#0C0C0C] text-white rounded-b-lg z-50 shadow-xl w-full transition-all opacity-100 translate-y-0"
        :style="{ top: `${mobileBarBottomPx}px` }"
      >
        <div
          class="flex flex-col space-y-4 p-5 overflow-y-auto"
          :style="{ maxHeight: `calc(100vh - ${mobileBarBottomPx}px)` }"
        >
          <NavItems :pathurl="pathurl" :isMobile="true" @navigate="handleNavigate" />
          <div class="w-full border-b border-[#ffffff2e] py-3">
            <switch-language class="switch-language-component" :show-dropdown-icon="false" :show-language-icon="true"></switch-language>
          </div>
          <slot name="auth-menu-mobile"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import iconMenu from "~/assets/images/icons/menu.svg";
import { useI18n } from 'vue-i18n';
import NavItems from './NavItems.vue';

const MOBILE_BAR_INNER_HEIGHT = 60;

const props = defineProps({
  pathurl: {
    type: String,
    default: ''
  },
  topOffsetPx: {
    type: Number,
    default: 0
  }
});

const mobileBarBottomPx = computed(() => props.topOffsetPx + MOBILE_BAR_INNER_HEIGHT);

const emit = defineEmits(['update:pathurl', 'navigate']);

const { t } = useI18n();
const brandLogoSrc = useBrandLogoSrc();
const runtimeConfig = useRuntimeConfig();
const isXimengSite = computed(() => runtimeConfig.public.siteBrand === 'ximeng');

const showMenuMobile = ref(false);
const showCreateChoice = ref(false);

const handleNavigate = (url) => {
  emit('update:pathurl', url);
  emit('navigate', url);
  showMenuMobile.value = false;
};

const toggleMenuMobile = () => {
  showMenuMobile.value = !showMenuMobile.value;
};

const toggleCreateChoice = () => {
  showCreateChoice.value = !showCreateChoice.value;
};

const goCreate = (url) => {
  showCreateChoice.value = false;
  emit('update:pathurl', url);
  emit('navigate', url);
};
</script>

<style lang="scss" scoped>
.menu-btn {
  height: 38px;
  width: 38px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1px solid #14ECFF;
  box-shadow: 0px 0px 40px 0px rgba(0, 178, 255, 0.30) inset;
  background-color: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto !important;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  :deep(span) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.switch-language-component {
  :deep(.el-input__inner) {
    width: 60px;
  }
}

.xm-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #a87f4b 0%, #6e4e2e 100%);
  box-shadow: 0 6px 18px rgba(8, 24, 41, 0.45);

  svg {
    transition: transform 0.2s ease;
  }
  .rotate-180 {
    transform: rotate(180deg);
  }
}

.xm-create-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(8, 24, 41, 0.96);
  border: 1px solid rgba(221, 199, 172, 0.3);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.xm-create-item {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  color: rgba(255, 255, 255, 0.9);
  transition: background 0.15s ease, color 0.15s ease;
}

.xm-create-item:hover {
  background: rgba(168, 127, 75, 0.2);
  color: #fff;
}
</style>