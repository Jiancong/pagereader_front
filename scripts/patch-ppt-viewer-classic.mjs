import fs from "fs";

const path = "src/components/editor/chat/PptViewer.vue";
let content = fs.readFileSync(path, "utf8");
const lines = content.split(/\r?\n/);

function findLineIndex(prefix, start = 0) {
  const i = lines.findIndex((l, idx) => idx >= start && l.includes(prefix));
  if (i < 0) throw new Error(`Not found: ${prefix}`);
  return i;
}

const startTemplate = findLineIndex("<!-- cover 封面");
const endTemplate = findLineIndex("<!-- 兜底：未知 layout", startTemplate);
const fallbackClose = findLineIndex("          </div>", endTemplate + 20);
// fallback block ends at the closing </div> before </template>

const replacement = `          <PptClassicSlide v-else :slide="slide" />`;
lines.splice(startTemplate, fallbackClose - startTemplate + 1, replacement);

let joined = lines.join("\n");

// Remove classic slide SCSS (.ppt-slide through .ppt-thumb-label)
joined = joined.replace(
  /\n\.ppt-slide \{[\s\S]*?\n\.ppt-thumb-label \{[\s\S]*?\n\}\n\n\/\* ── Mobile layout/,
  "\n/* ── Mobile layout",
);

// Remove mobile slide rules (keep shell rules)
joined = joined.replace(
  /(\n  \.ppt-slide-wrapper \{[\s\S]*?\n  \}\n\n)(  \.ppt-content-split,[\s\S]*?\n  \.ppt-speaker-notes-pane \{[\s\S]*?\n  \}\n\n)?(  \.ppt-thumbs \{)/,
  "$1$3",
);

const importBlock = `import PptClassicSlide from "@/components/editor/chat/ppt/themes/classic/PptClassicSlide.vue";
import { pptClassicContextKey } from "@/components/editor/chat/ppt/pptClassicContext";
`;

if (!joined.includes("PptClassicSlide")) {
  joined = joined.replace(
    'import PptModernLiterarySlide from "@/components/editor/chat/ppt/themes/modernLiterary/PptModernLiterarySlide.vue";',
    `import PptModernLiterarySlide from "@/components/editor/chat/ppt/themes/modernLiterary/PptModernLiterarySlide.vue";\n${importBlock}`,
  );
}

const provideClassic = `
provide(pptClassicContextKey, {
  coverBackdropUrl,
  sectionBackdropUrl,
  coverDecorationSvg,
  sectionDecorationSvg,
  twoColumnBackdropUrl,
  chapterImagePageDecorationSvg,
  twoColumnSlideBackgroundStyle,
  contentPointStyle,
  metricCardStyle,
  metricCardValueStyle,
  heroRightCardStyle,
  heroMetricStyle,
  rightItemAccentColor,
  rightItemTitle,
  rightItemDescription,
  formatRightItemIndex,
  topicGridFillStyle,
  documentFigureColumnStyle,
  documentFigureImgStyle,
  hasBodyPrimaryVisual,
  hasTableAndChart,
  isContentWithRightItemsSlide,
  isMetricCardsOnlySlide,
  isVisualOnlySlide,
  shouldShowChapterSideImage,
  shouldShowContentBullets,
  shouldShowHeroLeftContentItems,
  shouldShowHeroLeftMetricCards,
  shouldShowHeroLeftTable,
  shouldShowHeroMetricBanner,
  shouldShowMetricCardInline,
  shouldShowMetricCardsCompactGrid,
  shouldShowMetricCardsPrimaryGrid,
  shouldFillMetricCards,
  shouldUsePrimaryMetricCards,
  heroLeftContentRightItems,
  tocIconIndex,
  resolveReferencesSlideItemUrl,
  isTimelineChart,
  getSummaryItem,
  getStackedBarCategoryLabels,
  getStackedBarRowValues,
  formatStackedBarSegmentLabel,
  stackedBarSegmentTitle,
  horizontalBarWidthPx,
  horizontalBarViewBoxHeight,
  horizontalBarValueTextX,
  funnelBarWidthPercent,
  funnelItemLabel,
  getWaterfallYTicks,
  mapWaterfallY,
  getScatterXTicks,
  getScatterYTicks,
  mapScatterX,
  mapScatterY,
  gaugeArcPath,
  gaugeTickMarks,
  onDataSourceLineBlur,
  onListItemBlur,
  onRightItemFieldBlur,
  onHeroMetricBlur,
  onDocumentFigureLeftItemBlur,
});
`;

if (!joined.includes("provide(pptClassicContextKey")) {
  joined = joined.replace(
    /provide\(pptChartContextKey, \{[\s\S]*?\}\);\n/,
    (m) => `${m}${provideClassic}`,
  );
}

// registry: shouldUseClassicSlide
const registryPath = "src/components/editor/chat/ppt/themes/registry.ts";
let registry = fs.readFileSync(registryPath, "utf8");
if (!registry.includes("shouldUseClassicSlide")) {
  registry += `
export function shouldUseClassicSlide(
  slide: PptSlide | null | undefined,
  isEditorialBrutalist: boolean,
  isModernLiterary: boolean,
): boolean {
  if (!slide) return false;
  if (shouldUseEditorialBrutalistSlide(slide, isEditorialBrutalist)) return false;
  if (shouldUseModernLiterarySlide(slide, isModernLiterary)) return false;
  return true;
}
`;
  fs.writeFileSync(registryPath, registry);
}

fs.writeFileSync(path, joined);
console.log("Patched PptViewer.vue for classic theme");
