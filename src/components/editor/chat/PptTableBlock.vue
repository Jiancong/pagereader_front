<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatPptInlineMarkdown,
  formatPptTableCellMarkdown,
  type PptPageReference,
} from "@/utils/pptInlineMarkdown";

export interface PptTable {
  title?: string;
  /** 表格脚注（后端字段 notes；兼容旧 note） */
  notes?: string;
  note?: string;
  columns?: string[];
  rows?: string[][];
  highlight_column?: number;
  /** 数据出处一句话，末尾可能含 [1][3] 行内引用 */
  source?: string;
  /** 可点击引用的 ref_id 列表，对应 slide.page_references */
  source_refs?: number[];
  position?: "left" | "right";
}

const props = withDefaults(
  defineProps<{
    table: PptTable;
    pageReferences?: PptPageReference[];
    compact?: boolean;
  }>(),
  {
    pageReferences: () => [],
    compact: false,
  }
);

const emit = defineEmits<{
  (e: "ref-click", refId: string): void;
}>();

const { t } = useI18n();

const columns = computed(() => props.table.columns ?? []);
const rows = computed(() => props.table.rows ?? []);
const isDense = computed(() => rows.value.length >= 6);
const tableNotes = computed(() => props.table.notes ?? props.table.note ?? "");

const highlightCol = computed(() => {
  const hc = props.table.highlight_column;
  if (hc == null || hc < 0) return -1;
  const colCount = columns.value.length;
  if (colCount === 0) return -1;
  return hc >= colCount ? -1 : hc;
});

const sourceText = computed(() => String(props.table.source ?? "").trim());

const sourceRefIds = computed(() => {
  const refs = props.table.source_refs;
  if (!Array.isArray(refs)) return [];
  return refs.filter((id) => id != null && !Number.isNaN(Number(id)));
});

const hasSourceRefs = computed(() => sourceRefIds.value.length > 0);

const isModelDataSource = computed(
  () =>
    Boolean(sourceText.value) &&
    !hasSourceRefs.value &&
    /来自模型的数据|From model/i.test(sourceText.value)
);

const displaySourceText = computed(() => {
  if (!sourceText.value) return "";
  if (!hasSourceRefs.value) return sourceText.value;
  return sourceText.value
    .replace(/\s*\[\d+\]/g, "")
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();
});

const sourceHtml = computed(() => formatPptInlineMarkdown(displaySourceText.value));

interface ResolvedSourceRef {
  refId: number;
  title?: string;
  url?: string;
}

const resolvedRefs = computed((): ResolvedSourceRef[] => {
  return sourceRefIds.value.map((refId) => {
    const info = (props.pageReferences || []).find(
      (r) => String(r.ref_id) === String(refId) || r.ref_id === refId
    );
    return {
      refId,
      title: info?.title,
      url: info?.url,
    };
  });
});

function cellHtml(cell: string): string {
  return formatPptTableCellMarkdown(cell ?? "", props.pageReferences);
}

function notesHtml(text: string): string {
  return formatPptTableCellMarkdown(text, props.pageReferences);
}

function normalizedRow(row: string[]): string[] {
  const colCount = columns.value.length;
  if (colCount <= 0) return row ?? [];
  const cells = [...(row ?? [])];
  while (cells.length < colCount) cells.push("");
  return cells.slice(0, colCount);
}

function badgeLabel(ref: ResolvedSourceRef): string {
  const title = ref.title?.trim();
  if (title) {
    return title.length > 18 ? `${title.slice(0, 16)}…` : title;
  }
  return `[${ref.refId}]`;
}

function onBadgeClick(ref: ResolvedSourceRef) {
  if (ref.url) window.open(ref.url, "_blank", "noopener");
}

function onWrapClick(ev: MouseEvent) {
  const target = ev.target as HTMLElement | null;
  const link = target?.closest?.("[data-ppt-ref-id]") as HTMLElement | null;
  if (!link) return;
  ev.preventDefault();
  const refId = link.getAttribute("data-ppt-ref-id");
  if (refId) emit("ref-click", refId);
}
</script>

<template>
  <div
    class="ppt-table-wrap"
    :class="{ 'ppt-table-wrap--compact': compact }"
    @click="onWrapClick"
  >
    <div v-if="table.title" class="ppt-table-title">{{ table.title }}</div>
    <div class="ppt-table-scroll">
      <table class="ppt-table" :class="{ 'is-dense': isDense }">
        <thead v-if="columns.length">
          <tr>
            <th
              v-for="(col, ci) in columns"
              :key="'th-' + ci"
              class="t-col"
              :class="{ 'is-highlight': ci === highlightCol }"
              :data-col-idx="ci"
              v-html="cellHtml(col)"
            />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in rows" :key="'tr-' + ri">
            <td
              v-for="(cell, ci) in normalizedRow(row)"
              :key="'td-' + ri + '-' + ci"
              class="t-cell"
              :class="{ 'is-highlight': ci === highlightCol, 't-cell-first': ci === 0 }"
              :data-col-idx="ci"
              v-html="cellHtml(cell)"
            />
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="sourceText" class="ppt-table-source">
      <span class="ppt-table-source-text" v-html="sourceHtml" />
      <span
        v-if="isModelDataSource"
        class="ppt-table-source-tag ppt-table-source-tag--model"
      >
        {{ t("agent.pptTableModelData") }}
      </span>
      <span v-else-if="resolvedRefs.length" class="ppt-table-source-badges">
        <button
          v-for="ref in resolvedRefs"
          :key="'tbl-src-' + ref.refId"
          type="button"
          class="ppt-table-source-badge"
          :class="{ 'ppt-table-source-badge--muted': !ref.url }"
          :title="ref.title || `[${ref.refId}]`"
          :disabled="!ref.url"
          @click="onBadgeClick(ref)"
        >
          [{{ ref.refId }}] {{ badgeLabel(ref) }} ↗
        </button>
      </span>
    </div>

    <div v-if="tableNotes" class="ppt-table-notes" v-html="notesHtml(tableNotes)" />
  </div>
</template>

<style scoped lang="scss">
.ppt-table-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.03));
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--ppt-radius-card, 12px);
  padding: 16px 16px 12px;
  overflow: hidden;
}

.ppt-table-title {
  flex: 0 0 auto;
  font-size: clamp(14px, 1.6cqi, 18px);
  font-weight: 600;
  color: var(--ppt-text, #e8f0fe);
  margin-bottom: var(--ppt-gap-sm, 10px);
}

.ppt-table-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.ppt-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: clamp(11px, 1.05cqi, 14px);
  line-height: 1.55;
  color: var(--ppt-text, #e8f0fe);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.04));
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  thead th {
    background: color-mix(in srgb, var(--ppt-text, #e8f0fe) 88%, transparent);
    color: var(--ppt-bg-primary, #0f1419);
    font-weight: 600;
    text-align: left;
    padding: 10px 12px;
    font-size: clamp(11px, 1cqi, 13px);
    letter-spacing: 0.02em;
    border: none;
  }

  tbody td {
    padding: 10px 12px;
    vertical-align: top;
    border-top: 1px solid color-mix(in srgb, var(--ppt-text, #e8f0fe) 12%, transparent);
  }

  tbody tr:first-child td {
    border-top: none;
  }

  tbody td.t-cell-first {
    font-weight: 600;
    width: 1%;
    white-space: nowrap;
  }

  .t-col.is-highlight,
  .t-cell.is-highlight {
    background: color-mix(in srgb, var(--ppt-accent, #4a90e2) 14%, transparent);
    color: var(--ppt-accent, #4a90e2);
    font-weight: 600;
  }

  thead .t-col.is-highlight {
    background: var(--ppt-accent, #4a90e2);
    color: #fff;
  }

  &.is-dense {
    font-size: clamp(10px, 0.95cqi, 12px);

    thead th,
    tbody td {
      padding: 7px 9px;
    }
  }

  :deep(.ppt-table-ref) {
    color: var(--ppt-accent, #4a90e2);
    text-decoration: none;
    cursor: pointer;
    font-size: 0.85em;
    vertical-align: super;
    line-height: 0;
    margin-left: 1px;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(.ppt-table-ref--muted) {
    cursor: default;
    color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));

    &:hover {
      text-decoration: none;
    }
  }

  :deep(strong) {
    font-weight: 700;
    color: var(--ppt-text, #e8f0fe);
  }
}

.ppt-table-source {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 8px;
  font-size: clamp(10px, 0.85cqi, 12px);
  line-height: 1.45;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.72));
  letter-spacing: 0.02em;
}

.ppt-table-source-text {
  :deep(strong) {
    font-weight: 600;
    color: var(--ppt-text, #e8f0fe);
  }
}

.ppt-table-source-tag {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  font-style: italic;
  line-height: 1.4;
}

.ppt-table-source-tag--model {
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));
  background: rgba(128, 128, 128, 0.14);
  border: 1px solid rgba(128, 128, 128, 0.22);
}

.ppt-table-source-badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.ppt-table-source-badge {
  flex: 0 0 auto;
  max-width: 180px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ppt-accent, #4a90e2) 30%, transparent);
  background: color-mix(in srgb, var(--ppt-accent, #4a90e2) 12%, transparent);
  color: var(--ppt-accent, #4a90e2);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ppt-accent, #4a90e2) 22%, transparent);
    border-color: var(--ppt-accent, #4a90e2);
  }

  &:disabled,
  &--muted {
    cursor: default;
    color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));
    border-color: rgba(128, 128, 128, 0.25);
    background: rgba(128, 128, 128, 0.1);
  }
}

.ppt-table-notes {
  flex: 0 0 auto;
  margin-top: 6px;
  font-size: clamp(10px, 0.85cqi, 12px);
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));
  font-style: italic;
  line-height: 1.4;
}

.ppt-table-wrap--compact {
  padding: 10px 10px 8px;

  .ppt-table-title {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .ppt-table {
    font-size: 11px;

    thead th,
    tbody td {
      padding: 6px 8px;
    }

    &.is-dense {
      font-size: 10px;

      thead th,
      tbody td {
        padding: 5px 6px;
      }
    }
  }

  .ppt-table-source {
    margin-top: 6px;
    font-size: 10px;
    gap: 4px 6px;
  }

  .ppt-table-source-tag {
    font-size: 9px;
    padding: 0 6px;
  }

  .ppt-table-source-badge {
    max-width: 130px;
    font-size: 9px;
    padding: 1px 6px;
  }

  .ppt-table-notes {
    font-size: 10px;
    margin-top: 4px;
  }
}
</style>
