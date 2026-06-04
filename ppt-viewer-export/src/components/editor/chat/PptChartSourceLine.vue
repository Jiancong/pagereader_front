<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatPptInlineMarkdown,
  type PptPageReference,
} from "@/utils/pptInlineMarkdown";

export interface PptChartSource {
  source?: string;
  source_refs?: number[];
}

const props = withDefaults(
  defineProps<{
    chart?: PptChartSource | null;
    pageReferences?: PptPageReference[];
    compact?: boolean;
  }>(),
  {
    chart: null,
    pageReferences: () => [],
    compact: false,
  }
);

const { t } = useI18n();

const sourceText = computed(() => String(props.chart?.source ?? "").trim());

const sourceRefIds = computed(() => {
  const refs = props.chart?.source_refs;
  if (!Array.isArray(refs)) return [];
  return refs.filter((id) => id != null && !Number.isNaN(Number(id)));
});

const hasSourceRefs = computed(() => sourceRefIds.value.length > 0);

const isEstimate = computed(() => Boolean(sourceText.value) && !hasSourceRefs.value);

const visible = computed(() => Boolean(sourceText.value));

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

function badgeLabel(ref: ResolvedSourceRef): string {
  const title = ref.title?.trim();
  if (title) {
    const short = title.length > 18 ? `${title.slice(0, 16)}…` : title;
    return short;
  }
  return `[${ref.refId}]`;
}

function onBadgeClick(ref: ResolvedSourceRef) {
  if (ref.url) window.open(ref.url, "_blank", "noopener");
}
</script>

<template>
  <div
    v-if="visible"
    class="ppt-chart-source"
    :class="{ 'ppt-chart-source--compact': compact }"
  >
    <span class="ppt-chart-source-text" v-html="sourceHtml" />
    <span v-if="isEstimate" class="ppt-chart-source-tag ppt-chart-source-tag--estimate">
      {{ t("agent.pptChartEstimate") }}
    </span>
    <span v-else-if="resolvedRefs.length" class="ppt-chart-source-badges">
      <button
        v-for="ref in resolvedRefs"
        :key="'src-ref-' + ref.refId"
        type="button"
        class="ppt-chart-source-badge"
        :class="{ 'ppt-chart-source-badge--muted': !ref.url }"
        :title="ref.title || `[${ref.refId}]`"
        :disabled="!ref.url"
        @click="onBadgeClick(ref)"
      >
        {{ badgeLabel(ref) }}
      </button>
    </span>
  </div>
</template>

<style scoped lang="scss">
.ppt-chart-source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: calc(-1 * var(--ppt-gap-sm, 8px) / 2) 0 var(--ppt-gap-sm, 8px);
  padding: 0 2px;
  font-size: var(--ppt-fs-body-sm, 12px);
  line-height: 1.45;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.72));
}

.ppt-chart-source-text {
  :deep(strong) {
    font-weight: 600;
    color: var(--ppt-text, #e8f0fe);
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(code) {
    font-size: 0.92em;
    padding: 0 0.12em;
    border-radius: 3px;
    background: rgba(128, 128, 128, 0.15);
  }
}

.ppt-chart-source-tag {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

.ppt-chart-source-tag--estimate {
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.55));
  background: rgba(128, 128, 128, 0.14);
  border: 1px solid rgba(128, 128, 128, 0.22);
}

.ppt-chart-source-badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.ppt-chart-source-badge {
  flex: 0 0 auto;
  max-width: 160px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ppt-accent, #4a90e2) 45%, transparent);
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
    background: color-mix(in srgb, var(--ppt-accent, #4a90e2) 20%, transparent);
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

.ppt-chart-source--compact {
  margin-bottom: 6px;
  font-size: 10px;
  gap: 4px 6px;

  .ppt-chart-source-tag {
    font-size: 9px;
    padding: 0 6px;
  }

  .ppt-chart-source-badge {
    max-width: 120px;
    font-size: 9px;
    padding: 1px 6px;
  }
}
</style>
