<template>
  <div
    :class="[
      isMobile
        ? 'flex flex-col items-start space-y-2'
        : 'flex flex-row items-center space-x-6',
      isXimengSite ? 'nav-items--ximeng' : '',
    ]"
  >
    <!-- 菜单项列表 -->
    <template v-for="(item, index) in menuItems" :key="index">
      <!-- 普通菜单项 -->
      <div
        v-if="!item.isDropdown"
        @click="goToLink(item.path)"
        class="menu-item whitespace-nowrap cursor-pointer"
        :class="[
          pathurl && pathurl === item.path ? 'active' : '',
          isMobile ? 'w-full border-b border-[#ffffff2e] pb-2' : '',
        ]"
      >
        {{ t(item.label) }}
      </div>

      <!-- 下拉菜单项 -->
      <div
        v-else
        class="relative"
        :class="isMobile ? 'w-full border-b border-[#ffffff2e] pb-2' : 'group'"
        @mouseenter="isMobile ? null : onDropdownEnter(item.id)"
        @mouseleave="isMobile ? null : onDropdownLeave(item.id)"
      >
        <!-- 下拉菜单标题 -->
        <div
          class="menu-item cursor-pointer flex items-center"
          :class="[
            pathurl && item.activeCondition(pathurl) ? 'active' : '',
            isMobile ? 'w-full pb-2' : '',
          ]"
          @click="isMobile ? toggleSubmenu(item.id) : null"
        >
          {{ t(item.label) }}
          <i
            class="el-icon-arrow-down ml-1 transform transition-transform duration-300"
            :class="isSubmenuOpen(item.id) ? 'rotate-180' : ''"
          ></i>
        </div>

        <!-- 下拉菜单内容 - 桌面版 -->
        <div
          v-if="!isMobile"
          class="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-[#0C0C0C] border border-[#ffffff2e] z-30"
          :class="isSubmenuOpen(item.id) ? 'block' : 'hidden'"
        >
          <div v-for="(subItem, subIndex) in item.children" :key="subIndex" class="py-1">
            <div
              @click="goToLink(subItem.path)"
              class="menu-item px-4 py-2 hover:bg-[#1a1a1a]"
            >
              {{ t(subItem.label) }}
            </div>
          </div>
        </div>

        <!-- 下拉菜单内容 - 移动版 -->
        <div v-else-if="isSubmenuOpen(item.id)" class="pl-4 mt-2 space-y-2">
          <div
            v-for="(subItem, subIndex) in item.children"
            :key="subIndex"
            @click="goToLink(subItem.path)"
            class="menu-item w-full pb-2"
          >
            {{ t(subItem.label) }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  pathurl: {
    type: String,
    default: "",
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["navigate"]);

const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();
const isXimengSite = computed(() => runtimeConfig.public.siteBrand === "ximeng");
const openSubmenus = ref({});
const dropdownTimers = ref({});

// 主导航收敛为高价值创作路径；零散工具见首页页脚 Utilities
// ximeng：中间区改为「模板中心 / 案例库」（见改版 IA），右侧双 CTA 由 NavBar 渲染。
const menuItems = computed(() => {
  if (isXimengSite.value) {
    return [
      { label: "home.revamp.navTemplates", path: "/showcase" },
      { label: "home.revamp.navShowcase", path: "/showcase?type=video" },
      { label: "home.price", path: "/pricing" },
    ];
  }
  return [
    { label: "home.studioNav", path: "/projects2" },
    { label: "home.price", path: "/pricing" },
    { label: "home.contact", path: "/contact" },
  ];
});

const goToLink = (url) => {
  emit("navigate", url);
  // 关闭所有子菜单
  if (props.isMobile) {
    openSubmenus.value = {};
  }
};

const toggleSubmenu = (id) => {
  openSubmenus.value = {
    ...openSubmenus.value,
    [id]: !openSubmenus.value[id],
  };
};

const isSubmenuOpen = (id) => {
  return !!openSubmenus.value[id];
};

const onDropdownEnter = (id) => {
  if (dropdownTimers.value[id]) {
    clearTimeout(dropdownTimers.value[id]);
    dropdownTimers.value[id] = null;
  }
  openSubmenus.value = {
    ...openSubmenus.value,
    [id]: true,
  };
};

const onDropdownLeave = (id) => {
  dropdownTimers.value[id] = setTimeout(() => {
    openSubmenus.value = {
      ...openSubmenus.value,
      [id]: false,
    };
  }, 120);
};
</script>

<style lang="scss" scoped>
.menu-item {
  cursor: pointer;
  color: #fff;
  font-family: Oxanium;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  @media (max-width: 768px) {
    width: 100%;
    padding-left: 4px;
    padding-right: 4px;
    font-size: 15px;
  }
}

.menu-item.active {
  color: #14ecff;
}

.menu-item:hover {
  color: #14ecff;
}

/* ximeng：沙色高亮 + 2px 下划线（改版全局交互规范） */
.nav-items--ximeng .menu-item:hover {
  color: #ddc7ac;
}

.nav-items--ximeng .menu-item.active {
  color: #ddc7ac;
  position: relative;
}

.nav-items--ximeng .menu-item.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #ddc7ac, #a87f4b);
}

// 图标旋转动画
.transform.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>
