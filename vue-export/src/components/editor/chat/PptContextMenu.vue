<template>
  <div
    v-show="show"
    class="ppt-context-menu"
    :style="{ left: `${x}px`, top: `${y}px`, zIndex: String(zIndex) }"
    @click.stop
    @contextmenu.prevent
  >
    <div
      class="ppt-context-menu-item"
      :class="{ 'ppt-context-menu-item--disabled': !selectionText }"
      @click="onRelatedSearch"
    >
      <i class="bi bi-search"></i>
      <span>{{ t("agent.pptRelatedSearch") }}</span>
    </div>
    <div v-if="selectionText" class="ppt-context-menu-selection">
      「{{ selectionPreview }}」
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    show: boolean;
    x: number;
    y: number;
    selectionText: string;
    zIndex?: number;
  }>(),
  { zIndex: 12050 }
);

const emit = defineEmits<{
  (e: "related-search"): void;
  (e: "close"): void;
}>();

const { t } = useI18n();

const selectionPreview = computed(() => {
  const text = props.selectionText.trim();
  if (text.length <= 24) return text;
  return `${text.slice(0, 24)}…`;
});

function onRelatedSearch() {
  if (!props.selectionText.trim()) return;
  emit("related-search");
  emit("close");
}
</script>

<style scoped lang="scss">
.ppt-context-menu {
  position: fixed;
  min-width: 168px;
  padding: 6px 0;
  background: #2d2d2d;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.ppt-context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 14px;
  color: #e8e8e8;
  cursor: pointer;

  i {
    color: #409eff;
  }

  &:hover {
    background: #3a3a3a;
    color: #409eff;
  }

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;

    &:hover {
      background: transparent;
      color: #e8e8e8;
    }
  }
}

.ppt-context-menu-selection {
  padding: 0 14px 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
  word-break: break-all;
}
</style>
