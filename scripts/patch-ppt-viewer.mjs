import fs from "fs";

const path = "src/components/editor/chat/PptViewer.vue";
let content = fs.readFileSync(path, "utf8");
const lines = content.split(/\r?\n/);

function findLineIndex(prefix, start = 0) {
  const i = lines.findIndex((l, idx) => idx >= start && l.includes(prefix));
  if (i < 0) throw new Error(`Not found: ${prefix}`);
  return i;
}

// Replace editorial + modern template block (lines 412-1943, 1-based)
const startTemplate = findLineIndex("<!-- editorial-brutalist-modern");
const endTemplate = findLineIndex("<!-- cover 封面", startTemplate);
const replacement = `          <PptEditorialBrutalistSlide
            v-if="shouldUseEditorialBrutalistSlide(slide, isEditorialBrutalistModern)"
            :slide="slide"
          />

          <PptModernLiterarySlide
            v-else-if="shouldUseModernLiterarySlide(slide, isModernLiteraryMinimal)"
            :slide="slide"
          />

`;
lines.splice(startTemplate, endTemplate - startTemplate, replacement.trimEnd());

let joined = lines.join("\n");

// Remove editorial SCSS block
joined = joined.replace(
  /\n\.ppt-editorial-brutalist \{[\s\S]*?\n\.ppt-modern-literary \{/,
  "\n.ppt-modern-literary {",
);
// Remove modern SCSS block up to mobile layout comment
joined = joined.replace(
  /\n\.ppt-modern-literary \{[\s\S]*?\n\/\* ── Mobile layout/,
  "\n/* ── Mobile layout",
);

// Remove shouldUse functions
joined = joined.replace(
  /\nfunction shouldUseModernLiterarySlide[\s\S]*?\n\}\n\nfunction shouldUseEditorialBrutalistSlide[\s\S]*?\n\}\n/,
  "\n",
);

// Remove editorialBrutalistLayout through modernLiteraryCompareTitleDuplicatesSlide block
joined = joined.replace(
  /\ntype EditorialBrutalistLayout[\s\S]*?\nfunction modernLiteraryCompareTitleDuplicatesSlide[\s\S]*?\n\}\n\nfunction rightItemTitle/,
  "\nfunction rightItemTitle",
);

// Add imports after PptChatHistoryRail import
const importBlock = `import PptEditorialBrutalistSlide from "@/components/editor/chat/ppt/themes/editorialBrutalist/PptEditorialBrutalistSlide.vue";
import PptModernLiterarySlide from "@/components/editor/chat/ppt/themes/modernLiterary/PptModernLiterarySlide.vue";
import { pptChartContextKey } from "@/components/editor/chat/ppt/pptChartContext";
import { pptSlideEditorKey } from "@/components/editor/chat/ppt/pptSlideContext";
import {
  EDITORIAL_BRUTALIST_TEMPLATE_ID,
  MODERN_LITERARY_TEMPLATE_ID,
  shouldUseEditorialBrutalistSlide,
  shouldUseModernLiterarySlide,
} from "@/components/editor/chat/ppt/themes/registry";
`;

if (!joined.includes("PptEditorialBrutalistSlide")) {
  joined = joined.replace(
    'import PptChatHistoryRail from "@/components/editor/chat/PptChatHistoryRail.vue";',
    `import PptChatHistoryRail from "@/components/editor/chat/PptChatHistoryRail.vue";\n${importBlock}`,
  );
}

// Add provide import
if (!joined.includes("provide,")) {
  joined = joined.replace(
    'import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from "vue";',
    'import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount, provide } from "vue";',
  );
}

// Remove duplicate template id constants
joined = joined.replace(
  /\nconst MODERN_LITERARY_TEMPLATE_ID = "modern-literary-minimal";\nconst EDITORIAL_BRUTALIST_TEMPLATE_ID = "editorial-brutalist-modern";\n/,
  "\n",
);

// Inject provide before first onMounted or before export section - after barZeroY computed
const provideBlock = `
provide(pptSlideEditorKey, {
  isEditing,
  currentSlideIndex: currentSlide,
  pptSource,
  brandFooter: currentBrandFooter,
  modernLiteraryCoverTagline,
  sectionChapterNum,
  t,
  onCellBlur,
  onContentItemBlur,
  onPptTableRefClick,
});

provide(pptChartContextKey, {
  isMultiSeriesLine,
  isGroupedBar,
  lineChartLegendItems,
  lineChartSeriesList,
  lineChartCategories,
  groupedBarSeriesList,
  groupedBarCategories,
  linePoints,
  multiLinePoints,
  shouldRotateLabels,
  barChartYRange,
  barZeroY,
  LINE_CHART_VIEWBOX,
  LINE_CHART_X_CAT_Y_ROTATED,
  LINE_CHART_X_CAT_Y,
  BAR_CHART_X_CAT_Y_ROTATED,
  BAR_CHART_X_CAT_Y,
  getSeriesColor,
  getLineYTicks,
  getBarYTicks,
  mapLineY,
  mapBarY,
  mapBarYSmall,
  formatTickValue,
  lineSeriesPoints,
  lineSeriesValue,
  lineCategoryLabelX,
  chartStrokeStyle,
  chartFillStyle,
  groupedBarSeriesLabel,
  groupedBarRectX,
  groupedBarRectWidth,
  groupedBarValue,
  groupedBarRectStyle,
  groupedBarCategoryLabelX,
  chartXCatLabelTransform,
});
`;

if (!joined.includes("provide(pptSlideEditorKey")) {
  joined = joined.replace(
    /const barZeroY = computed\(\(\) => mapBarY\(0\)\);/,
    `const barZeroY = computed(() => mapBarY(0));${provideBlock}`,
  );
}

fs.writeFileSync(path, joined);
console.log("Patched PptViewer.vue");
