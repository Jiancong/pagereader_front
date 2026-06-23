<script setup lang="ts">
import { inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptChartSourceLine from "@/components/editor/chat/PptChartSourceLine.vue";
import { pptChartContextKey } from "../pptChartContext";
import { pptSlideEditorKey } from "../pptSlideContext";
import type { PptSlide } from "../types";
import { editorialBrutalistChartCards } from "../themes/editorialBrutalist/editorialBrutalistHelpers";

defineProps<{ slide: PptSlide }>();

const chart = inject(pptChartContextKey)!;
const editor = inject(pptSlideEditorKey)!;

const {
  isMultiSeriesLine,
  lineChartLegendItems,
  getSeriesColor,
  LINE_CHART_VIEWBOX,
  getLineYTicks,
  mapLineY,
  formatTickValue,
  lineChartSeriesList,
  lineSeriesPoints,
  chartStrokeStyle,
  lineChartCategories,
  lineCategoryLabelX,
  shouldRotateLabels,
  LINE_CHART_X_CAT_Y_ROTATED,
  LINE_CHART_X_CAT_Y,
  lineSeriesValue,
  chartFillStyle,
  linePoints,
  multiLinePoints,
  isGroupedBar,
  groupedBarSeriesList,
  groupedBarSeriesLabel,
  groupedBarCategories,
  getBarYTicks,
  mapBarY,
  barChartYRange,
  barZeroY,
  groupedBarRectX,
  groupedBarRectWidth,
  groupedBarValue,
  groupedBarRectStyle,
  groupedBarCategoryLabelX,
  chartXCatLabelTransform,
  BAR_CHART_X_CAT_Y_ROTATED,
  BAR_CHART_X_CAT_Y,
  mapBarYSmall,
} = chart;

const onPptTableRefClick = editor.onPptTableRefClick;
</script>

<template>
  <template v-if="slide.chart">
    <h3 class="ppt-brutalist-data-chart-title">
      {{ slide.chart.title || slide.title }}
    </h3>
    <PptChartSourceLine :chart="slide.chart" :page-references="slide.page_references" />
    <div
      v-if="slide.chart.type === 'line'"
      class="ppt-line-chart-wrap ppt-brutalist-line-chart-wrap"
    >
      <div v-if="lineChartLegendItems.length" class="ppt-line-legend">
        <span
          v-for="(label, si) in lineChartLegendItems"
          :key="'brutalist-leg-' + si"
          class="ppt-line-legend-item"
        >
          <span class="ppt-line-legend-dot" :style="{ background: getSeriesColor(si) }"></span>
          {{ label }}
        </span>
      </div>
      <svg class="ppt-chart-svg" :viewBox="LINE_CHART_VIEWBOX" preserveAspectRatio="xMidYMid meet">
        <template v-for="(tick, ti) in getLineYTicks()" :key="'blyt' + ti">
          <text x="48" :y="mapLineY(tick) + 4" class="ppt-chart-label" text-anchor="end">
            {{ formatTickValue(tick) }}
          </text>
          <line
            x1="52"
            :y1="mapLineY(tick)"
            x2="460"
            :y2="mapLineY(tick)"
            stroke="var(--ppt-chart-grid)"
            stroke-width="0.5"
          />
        </template>
        <template v-if="isMultiSeriesLine">
          <template v-for="(s, si) in lineChartSeriesList" :key="'bml' + si">
            <polyline
              :points="lineSeriesPoints(si)"
              class="ppt-polyline"
              fill="none"
              :style="chartStrokeStyle(si)"
            />
          </template>
          <template v-for="(cat, ci) in lineChartCategories" :key="'blx' + ci">
            <text
              :x="lineCategoryLabelX(ci)"
              :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
              class="ppt-chart-label"
              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
              :transform="
                shouldRotateLabels
                  ? `rotate(-45, ${lineCategoryLabelX(ci)}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                  : undefined
              "
              :style="shouldRotateLabels ? 'font-size: 8px' : ''"
            >
              {{ cat }}
            </text>
          </template>
          <template v-for="(s, si) in lineChartSeriesList" :key="'bld' + si">
            <circle
              v-for="(cat, ci) in lineChartCategories"
              :key="'bld' + si + '-' + ci"
              :cx="lineCategoryLabelX(ci)"
              :cy="mapLineY(lineSeriesValue(ci, si))"
              r="4"
              class="ppt-line-dot"
              :style="chartFillStyle(si)"
            />
          </template>
        </template>
        <template v-else>
          <polyline
            :points="linePoints"
            class="ppt-polyline"
            fill="none"
            :style="chartStrokeStyle(0)"
          />
          <polyline
            v-if="multiLinePoints.secondary"
            :points="multiLinePoints.secondary"
            class="ppt-polyline ppt-line-secondary"
            fill="none"
            :style="chartStrokeStyle(1)"
          />
          <polyline
            v-if="multiLinePoints.tertiary"
            :points="multiLinePoints.tertiary"
            class="ppt-polyline ppt-line-tertiary"
            fill="none"
            :style="chartStrokeStyle(2)"
          />
          <template v-for="(d, di) in slide.chart.data" :key="'bl' + di">
            <circle
              :cx="55 + di * (400 / Math.max(slide.chart.data.length - 1, 1))"
              :cy="mapLineY(d.value)"
              r="4"
              class="ppt-line-dot"
              :style="chartFillStyle(0)"
            />
            <text
              :x="55 + di * (400 / Math.max(slide.chart.data.length - 1, 1))"
              :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
              class="ppt-chart-label"
              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
              :transform="
                shouldRotateLabels
                  ? `rotate(-45, ${55 + di * (400 / Math.max(slide.chart.data.length - 1, 1))}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                  : undefined
              "
              :style="shouldRotateLabels ? 'font-size: 8px' : ''"
            >
              {{ d.label }}
            </text>
          </template>
        </template>
      </svg>
    </div>
    <div
      v-else-if="slide.chart.type === 'bar' && isGroupedBar"
      class="ppt-grouped-bar-wrap ppt-brutalist-grouped-bar-wrap"
    >
      <div v-if="groupedBarSeriesList.length" class="ppt-grouped-bar-legend">
        <span
          v-for="(s, si) in groupedBarSeriesList"
          :key="'brutalist-gbl-' + si"
          class="ppt-grouped-bar-legend-item"
        >
          <span class="ppt-pie-dot" :style="{ background: getSeriesColor(si) }"></span>
          {{ groupedBarSeriesLabel(s) }}
        </span>
      </div>
      <svg class="ppt-chart-svg" viewBox="0 0 500 260" preserveAspectRatio="xMidYMid meet">
        <template v-for="(tick, ti) in getBarYTicks()" :key="'bgbyt' + ti">
          <text x="48" :y="mapBarY(tick) + 4" class="ppt-chart-label" text-anchor="end">
            {{ formatTickValue(tick) }}
          </text>
          <line
            x1="52"
            :y1="mapBarY(tick)"
            x2="460"
            :y2="mapBarY(tick)"
            stroke="var(--ppt-chart-grid)"
            stroke-width="0.5"
          />
        </template>
        <line
          v-if="barChartYRange.min < 0"
          x1="52"
          :y1="barZeroY"
          x2="460"
          :y2="barZeroY"
          stroke="var(--ppt-chart-zero-line)"
          stroke-width="1"
        />
        <template v-for="(cat, ci) in groupedBarCategories" :key="'bgbcat-' + ci">
          <template v-for="(s, si) in groupedBarSeriesList" :key="'bgbb-' + ci + '-' + si">
            <rect
              :x="groupedBarRectX(ci, si, 'compact')"
              :y="Math.min(mapBarYSmall(groupedBarValue(ci, si)), mapBarYSmall(0))"
              :width="groupedBarRectWidth('compact')"
              :height="
                Math.max(1, Math.abs(mapBarYSmall(groupedBarValue(ci, si)) - mapBarYSmall(0)))
              "
              :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
              :class="['ppt-bar-rect', groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '']"
              rx="3"
            />
          </template>
          <text
            :x="groupedBarCategoryLabelX(ci, 'compact')"
            :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
            class="ppt-chart-label"
            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
            :transform="
              shouldRotateLabels
                ? chartXCatLabelTransform(
                    groupedBarCategoryLabelX(ci, 'compact'),
                    BAR_CHART_X_CAT_Y_ROTATED
                  )
                : undefined
            "
            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
          >
            {{ cat }}
          </text>
        </template>
      </svg>
    </div>
    <div v-else class="ppt-brutalist-data-chart-fallback">
      <div
        v-for="card in editorialBrutalistChartCards(slide)"
        :key="'brutalist-chart-' + card.index"
        class="ppt-brutalist-data-chart-row"
      >
        <strong>{{ card.title }}</strong>
        <PptMarkdownInline
          v-if="card.body"
          class="ppt-brutalist-card-body"
          :text="card.body"
          :page-references="slide.page_references"
          @ref-click="onPptTableRefClick($event, slide)"
        />
      </div>
    </div>
  </template>
</template>
