<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PptPageReference } from "@/utils/pptInlineMarkdown";

export interface PptMetricCard {
  value?: string;
  label?: string;
  detail?: string;
  source?: string;
  source_ref?: number | number[];
  accent_color?: string;
}

const props = withDefaults(
  defineProps<{
    cards: PptMetricCard[];
    /** 主视觉网格（全宽、较大） */
    primary?: boolean;
    /** 纵列排列（data 页左栏） */
    column?: boolean;
    /** 单卡内联样式 */
    inline?: boolean;
    /** 无正文时铺满剩余画布 */
    fill?: boolean;
    pageReferences?: PptPageReference[];
    cardStyle?: (card: PptMetricCard, index: number) => Record<string, string>;
    valueStyle?: (card: PptMetricCard, index: number) => Record<string, string>;
  }>(),
  {
    primary: false,
    column: false,
    inline: false,
    fill: false,
    pageReferences: () => [],
    cardStyle: () => ({}),
    valueStyle: () => ({}),
  }
);

const emit = defineEmits<{
  (e: "ref-click", refId: string): void;
}>();

const { t } = useI18n();

const rowClass = computed(() => ({
  "ppt-metric-cards-row":
    !props.column && !props.inline && !props.fill,
  "ppt-metric-cards-row--primary":
    props.primary && !props.column && !props.inline && !props.fill,
  "ppt-metric-cards-row--compact":
    !props.primary && !props.column && !props.inline && !props.fill,
  "ppt-metric-cards-row--fill": props.fill && !props.column,
  "ppt-metric-cards-column": props.column,
  "ppt-metric-card-inline": props.inline && !props.fill,
}));

function metricCardsFillGrid(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: Math.ceil(count / 3) };
  return { cols: 4, rows: Math.ceil(count / 4) };
}

const fillGridStyle = computed(() => {
  if (!props.fill || props.column) return undefined;
  const { cols, rows } = metricCardsFillGrid(props.cards.length);
  return {
    "--ppt-metric-fill-cols": String(cols),
    "--ppt-metric-fill-rows": String(rows),
  };
});

function cardSourceRefs(card: PptMetricCard): number[] {
  const raw = card.source_ref;
  const refsFromField =
    raw == null
      ? []
      : (Array.isArray(raw) ? raw : [raw])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
  if (refsFromField.length) return refsFromField;

  const refsFromSource = [...String(card.source ?? "").matchAll(/\[(\d+)\]/g)]
    .map((match) => Number(match[1]))
    .filter((id) => Number.isFinite(id));
  return [...new Set(refsFromSource)];
}

function isModelDataSource(source?: string, refs: number[] = []): boolean {
  if (refs.length) return false;
  const text = String(source ?? "").trim();
  if (!text) return true;
  return /模型数据|来自模型的数据|model data/i.test(text);
}

function sourceLabel(refId: number): string {
  const info = props.pageReferences.find(
    (r) => String(r.ref_id) === String(refId) || r.ref_id === refId
  );
  const title = String(info?.title ?? info?.url ?? "").trim();
  if (!title) return `[${refId}]`;
  return title.length > 18 ? `${title.slice(0, 15)}…` : title;
}

function displaySourceText(card: PptMetricCard): string {
  const text = String(card.source ?? "").trim();
  if (!text) return "";
  return text.replace(/\s*\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();
}

function shouldShowCardLabel(card: PptMetricCard): boolean {
  const value = String(card.value ?? "").trim();
  const label = String(card.label ?? "").trim();
  return Boolean(label && label !== value);
}
</script>

<template>
  <div :class="rowClass" :style="fillGridStyle">
    <div
      v-for="(card, index) in cards"
      :key="'mc-' + index"
      class="ppt-metric-card"
      :class="{
        'ppt-metric-card--column': column,
        'ppt-metric-card--inline': inline,
      }"
      :style="cardStyle(card, index)"
    >
      <div
        v-if="card.value"
        class="ppt-metric-card-value"
        :style="valueStyle(card, index)"
      >
        {{ card.value }}
      </div>
      <div v-if="shouldShowCardLabel(card)" class="ppt-metric-card-label">{{ card.label }}</div>
      <div v-if="card.detail" class="ppt-metric-card-detail">{{ card.detail }}</div>
      <div
        v-if="card.source || cardSourceRefs(card).length"
        class="ppt-metric-card-source"
      >
        <span
          v-if="isModelDataSource(card.source, cardSourceRefs(card))"
          class="ppt-metric-card-source-model"
        >
          {{ t("agent.pptModelData") }}
        </span>
        <template v-else-if="cardSourceRefs(card).length">
          <button
            v-for="refId in cardSourceRefs(card)"
            :key="'mcs-' + index + '-' + refId"
            type="button"
            class="ppt-metric-card-source-badge"
            :title="sourceLabel(refId)"
            @click="emit('ref-click', String(refId))"
          >
            [{{ refId }}] {{ sourceLabel(refId) }}
          </button>
        </template>
        <span v-else-if="displaySourceText(card)" class="ppt-metric-card-source-text">
          {{ displaySourceText(card) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ppt-metric-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: clamp(10px, 2cqi, 16px);
  margin: 0 0 clamp(12px, 2cqi, 18px);
}

.ppt-metric-cards-row--primary {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  margin-bottom: clamp(14px, 2.5cqi, 22px);
}

.ppt-metric-cards-row--compact {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr));
  gap: clamp(8px, 1.5cqi, 12px);
  margin-bottom: clamp(10px, 1.8cqi, 14px);

  .ppt-metric-card-value {
    font-size: clamp(18px, 3cqi, 24px);
  }

  .ppt-metric-card-label {
    font-size: clamp(10px, 1.5cqi, 12px);
  }
}

.ppt-metric-cards-column {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.8cqi, 14px);
}

.ppt-metric-card-inline {
  margin-bottom: clamp(10px, 2cqi, 16px);
}

.ppt-metric-cards-row--fill {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  align-content: stretch;
  grid-template-columns: repeat(var(--ppt-metric-fill-cols, 2), minmax(0, 1fr));
  grid-template-rows: repeat(var(--ppt-metric-fill-rows, 2), minmax(0, 1fr));
  gap: clamp(12px, 2cqi, 20px);

  .ppt-metric-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .ppt-metric-card-value {
    font-size: clamp(18px, 3.2cqi, 28px);
  }

  .ppt-metric-card-detail {
    flex: 1 1 auto;
    min-height: 0;
  }

  .ppt-metric-card-source {
    margin-top: auto;
  }
}

.ppt-metric-card {
  min-width: min(100%, 140px);
  max-width: 100%;
  padding: clamp(10px, 1.8cqi, 14px) clamp(12px, 2cqi, 16px);
  border-radius: var(--ppt-radius-card, 8px);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.06));
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
}

.ppt-metric-card--column {
  border-top: none;
  border-left: 3px solid var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
}

.ppt-metric-card--inline {
  max-width: min(100%, 420px);
}

.ppt-metric-card-value {
  font-size: clamp(22px, 4cqi, 32px);
  font-weight: 800;
  line-height: 1.1;
  color: var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
  margin-bottom: 4px;
}

.ppt-metric-card-label {
  font-size: clamp(11px, 1.8cqi, 13px);
  font-weight: 600;
  line-height: 1.35;
  color: var(--ppt-text, #e8f0fe);
  margin-bottom: 2px;
}

.ppt-metric-card-detail {
  font-size: clamp(10px, 1.6cqi, 12px);
  line-height: 1.4;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.65));
}

.ppt-metric-card-source {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.ppt-metric-card-source-text {
  font-size: 11px;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));
}

.ppt-metric-card-source-model {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.65));
  background: rgba(255, 255, 255, 0.06);
}

.ppt-metric-card-source-badge {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--ppt-accent, #4a90e2);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
}

.ppt-metric-card-source-badge:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
