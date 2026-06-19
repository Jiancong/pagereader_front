<template>
  <div
    class="left-0 w-full z-20 px-5 hidden md:block nav-bar-shell"
    :class="[
      isXimengSite ? 'fixed' : 'absolute',
      { 'nav-bar-shell--scrolled': isXimengSite && scrolled },
    ]"
    :style="{ top: `${topOffsetPx}px` }"
  >
    <div
      class="w-full max-w-[1400px] px-5 flex justify-between items-center"
      :class="isXimengSite ? 'py-5 md:py-[20px] mx-auto' : 'py-5 md:py-[40px]'"
    >
      <NuxtLink to="/">
        <img class="w-[45px] h-[45px] md:w-[64px] md:h-[61px] object-contain" :src="brandLogoSrc"
          alt="AI生成器" />
      </NuxtLink>
      <div class="flex flex-row space-x-8 justify-end items-center">
        <!-- 使用共用导航组件 -->
        <NavItems :pathurl="pathurl" :isMobile="false" @navigate="handleNavigate" />

        <!-- ximeng：右侧双 CTA（做设计 主按钮 / 做视频 幽灵按钮） -->
        <div v-if="isXimengSite" class="flex flex-row items-center space-x-3">
          <NuxtLink to="/design" class="xm-nav-cta xm-nav-cta--primary">
            {{ t("home.revamp.navDoDesign") }}
          </NuxtLink>
          <NuxtLink to="/video" class="xm-nav-cta xm-nav-cta--ghost">
            {{ t("home.revamp.navDoVideo") }}
          </NuxtLink>
        </div>

        <!-- 语言切换和登录按钮放在一组 -->
        <div class="flex flex-row items-center space-x-4">
            <client-only>
              <switch-language class="switch-language-component" :show-dropdown-icon="false"
              :show-language-icon="true"></switch-language>
            </client-only>
            
            <!-- 根据登录状态显示不同的按钮 -->
            <slot name="auth-element"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from 'vue-i18n';
import NavItems from './NavItems.vue';

const props = defineProps({
  pathurl: {
    type: String,
    default: ''
  },
  /** 顶部促销条高度（px），用于下移导航避免遮挡 */
  topOffsetPx: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:pathurl', 'navigate']);

const { t } = useI18n();
const brandLogoSrc = useBrandLogoSrc();
const runtimeConfig = useRuntimeConfig();
const isXimengSite = computed(() => runtimeConfig.public.siteBrand === 'ximeng');

// 滚动超过 100px 后导航增加背景模糊 + 阴影（改版全局交互规范）
const scrolled = ref(false);
const onScroll = () => {
  scrolled.value = (window.scrollY || window.pageYOffset || 0) > 100;
};

onMounted(() => {
  if (!process.client) return;
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  if (process.client) window.removeEventListener('scroll', onScroll);
});

const handleNavigate = (url) => {
  emit('update:pathurl', url);
  emit('navigate', url);
};
</script>

<style lang="scss" scoped>
.switch-language-component {
  :deep(.el-input__inner) {
    width: 60px;
  }
}

.nav-bar-shell {
  transition: background 0.25s ease, box-shadow 0.25s ease, backdrop-filter 0.25s ease;
}

.nav-bar-shell--scrolled {
  background: rgba(8, 24, 41, 0.78);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.xm-nav-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease,
    border-color 0.18s ease, color 0.18s ease;
}

.xm-nav-cta--primary {
  color: #fff;
  background: linear-gradient(135deg, #a87f4b 0%, #6e4e2e 100%);
  box-shadow: 0 8px 22px rgba(8, 24, 41, 0.45);
}

.xm-nav-cta--primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.xm-nav-cta--ghost {
  color: #ddc7ac;
  border: 1px solid rgba(221, 199, 172, 0.5);
}

.xm-nav-cta--ghost:hover {
  transform: translateY(-1px);
  color: #fff;
  border-color: #ddc7ac;
  background: rgba(168, 127, 75, 0.16);
}
</style>