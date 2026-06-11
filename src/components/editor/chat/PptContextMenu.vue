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
      <svg
        class="ppt-context-menu-item-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span>{{ t("agent.pptRelatedSearch") }}</span>
    </div>
    <div v-if="selectionText" class="ppt-context-menu-selection">
      「{{ selectionPreview }}」
    </div>

    <div class="ppt-context-menu-divider" />

    <div class="ppt-context-menu-query">
      <input
        ref="queryInputRef"
        v-model="queryText"
        type="text"
        class="ppt-context-menu-input"
        :placeholder="t('agent.pptRelatedSearchInputPlaceholder')"
        @keydown.enter.prevent="onCustomSearch"
        @keydown.stop
        @keyup.stop
        @click.stop
      />
      <button
        type="button"
        class="ppt-context-menu-submit"
        :aria-label="t('agent.pptRelatedSearchSubmit')"
        :title="t('agent.pptRelatedSearchSubmit')"
        @click="onCustomSearch"
      >
        <svg
          class="ppt-context-menu-submit-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>{{ t("agent.pptRelatedSearchSubmit") }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";

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
  (e: "custom-search", term: string): void;
  (e: "close"): void;
}>();

const { t } = useI18n();

const queryInputRef = ref<HTMLInputElement | null>(null);
const queryText = ref("");

const selectionPreview = computed(() => {
  const text = props.selectionText.trim();
  if (text.length <= 24) return text;
  return `${text.slice(0, 24)}…`;
});

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      queryText.value = props.selectionText.trim();
      nextTick(() => queryInputRef.value?.focus());
      return;
    }
    queryText.value = "";
  }
);

function onRelatedSearch() {
  if (!props.selectionText.trim()) return;
  emit("related-search");
  emit("close");
}

function onCustomSearch() {
  const term = queryText.value.trim();
  if (!term) {
    ElMessage.warning(t("agent.pptRelatedSearchEnterQuery"));
    return;
  }
  emit("custom-search", term);
  emit("close");
}
</script>

<style scoped lang="scss">
.ppt-context-menu {
  position: fixed;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 16px));
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

  .ppt-context-menu-item-icon {
    color: #409eff;
    flex-shrink: 0;
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

.ppt-context-menu-divider {
  height: 1px;
  margin: 4px 10px 6px;
  background: rgba(255, 255, 255, 0.1);
}

.ppt-context-menu-query {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 8px;
}

.ppt-context-menu-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  background: #1f1f1f;
  color: #e8e8e8;
  font-size: 13px;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    border-color: #409eff;
  }
}

.ppt-context-menu-submit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #66b1ff;
  }
}

.ppt-context-menu-submit-icon {
  flex-shrink: 0;
}
</style>
