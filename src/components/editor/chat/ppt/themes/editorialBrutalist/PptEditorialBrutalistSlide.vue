<script setup lang="ts">
import { computed, inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptTableBlock from "@/components/editor/chat/PptTableBlock.vue";
import PptBrutalistDataChart from "../../charts/PptBrutalistDataChart.vue";
import { pptClassicContextKey } from "../../pptClassicContext";
import { pptSlideEditorKey } from "../../pptSlideContext";
import type { PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  parseContentBody,
  resolveSlideBulletItems,
} from "../../shared/contentHelpers";
import {
  documentFigureImgStyle,
  hasDocumentFigurePage,
  isHeroLeftSlide,
  normalizeDocumentFigure,
  tocDensityLevel,
} from "../../shared/slideLayoutHelpers";
import { modernLiteraryCompareTitleDuplicatesSlide } from "../modernLiterary/modernLiteraryHelpers";
import type { EditorialBrutalistContext } from "./editorialBrutalistHelpers";
import * as brutalist from "./editorialBrutalistHelpers";

const props = defineProps<{ slide: PptSlide }>();
const editor = inject(pptSlideEditorKey)!;
const classic = inject(pptClassicContextKey)!;

const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;

const brutalistCtx = computed<EditorialBrutalistContext>(() => ({
  pptSource: editor.pptSource.value,
  currentSlideIndex: editor.currentSlideIndex.value,
  sectionChapterNum: editor.sectionChapterNum.value,
  t: editor.t,
}));

const editorialBrutalistLayout = brutalist.editorialBrutalistLayout;
const editorialBrutalistKicker = (s: PptSlide) =>
  brutalist.editorialBrutalistKicker(s, brutalistCtx.value);
const editorialBrutalistDisplayClass = (s: PptSlide) =>
  brutalist.editorialBrutalistDisplayClass(s, brutalistCtx.value);
const editorialBrutalistWatermark = (s: PptSlide) =>
  brutalist.editorialBrutalistWatermark(s, brutalistCtx.value);
const editorialBrutalistHeroBody = (s: PptSlide) =>
  brutalist.editorialBrutalistHeroBody(s, brutalistCtx.value);
const editorialBrutalistHeroDate = (s: PptSlide) =>
  brutalist.editorialBrutalistHeroDate(s, brutalistCtx.value);

const shouldShowEditorialBrutalistVerticalWatermark =
  brutalist.shouldShowEditorialBrutalistVerticalWatermark;
const editorialBrutalistIsMultiQuote = brutalist.editorialBrutalistIsMultiQuote;
const editorialBrutalistQuoteListClass = brutalist.editorialBrutalistQuoteListClass;
const editorialBrutalistQuoteItems = brutalist.editorialBrutalistQuoteItems;
const editorialBrutalistQuoteCardClass = brutalist.editorialBrutalistQuoteCardClass;
const editorialBrutalistQuoteTextClass = brutalist.editorialBrutalistQuoteTextClass;
const editorialBrutalistQuoteText = brutalist.editorialBrutalistQuoteText;
const editorialBrutalistSplitStyle = brutalist.editorialBrutalistSplitStyle;
const editorialBrutalistSplitListClass = brutalist.editorialBrutalistSplitListClass;
const editorialBrutalistSplitLeft = brutalist.editorialBrutalistSplitLeft;
const editorialBrutalistSplitRight = brutalist.editorialBrutalistSplitRight;
const editorialBrutalistIsContentSplit = brutalist.editorialBrutalistIsContentSplit;
const editorialBrutalistIsDataSlide = brutalist.editorialBrutalistIsDataSlide;
const editorialBrutalistShowDataTable = brutalist.editorialBrutalistShowDataTable;
const editorialBrutalistCardGridDensity = brutalist.editorialBrutalistCardGridDensity;
const editorialBrutalistContentCards = brutalist.editorialBrutalistContentCards;
const editorialBrutalistInsightInline = brutalist.editorialBrutalistInsightInline;

const t = editor.t;
const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;
const onDocumentFigureCaptionBlur = editor.onDocumentFigureCaptionBlur;
const onDocumentFigureLeftItemBlur = editor.onDocumentFigureLeftItemBlur;

const heroRightCardStyle = classic.heroRightCardStyle;
const formatRightItemIndex = classic.formatRightItemIndex;
const rightItemTitle = classic.rightItemTitle;
const rightItemDescription = classic.rightItemDescription;
const heroMetricStyle = classic.heroMetricStyle;
const normalizeAccentColor = classic.normalizeAccentColor;
const onRightItemFieldBlur = classic.onRightItemFieldBlur;
const onHeroMetricBlur = classic.onHeroMetricBlur;

const documentFigure = computed(() => normalizeDocumentFigure(props.slide));

const slideClass = computed(() => [
  `ppt-editorial-brutalist--${props.slide.layout}`,
  `ppt-editorial-brutalist--${editorialBrutalistLayout(props.slide)}`,
  props.slide.layout === "toc"
    ? `ppt-editorial-brutalist--toc-${tocDensityLevel(props.slide)}`
    : undefined,
  isHeroLeftSlide(props.slide) ? "ppt-editorial-brutalist--hero-left" : undefined,
  editorialBrutalistIsContentSplit(props.slide)
    ? "ppt-editorial-brutalist--content-split"
    : undefined,
  hasDocumentFigurePage(props.slide) ? "ppt-editorial-brutalist--document-figure" : undefined,
  editorialBrutalistIsMultiQuote(props.slide) ? "ppt-editorial-brutalist--quote-multi" : undefined,
]);
</script>

<template>
  <div class="ppt-slide ppt-editorial-brutalist" :class="slideClass">
                <template v-if="editorialBrutalistLayout(slide) === 'hero'">
                  <div class="ppt-brutalist-hero">
                    <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                    <h1
                      class="ppt-brutalist-display"
                      :class="editorialBrutalistDisplayClass(slide)"
                    >
                      <PptMarkdownInline
                        :text="slide.title || pptSource.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h1>
                    <div class="ppt-brutalist-divider"></div>
                    <PptMarkdownInline
                      v-if="editorialBrutalistHeroBody(slide) || isEditing"
                      class="ppt-brutalist-lead"
                      :text="editorialBrutalistHeroBody(slide)"
                      :editable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                    />
                    <p
                      v-if="editorialBrutalistHeroDate(slide)"
                      class="ppt-brutalist-hero-date"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.date`)"
                    >
                      {{ editorialBrutalistHeroDate(slide) }}
                    </p>
                  </div>
                  <div
                    v-if="shouldShowEditorialBrutalistVerticalWatermark(slide)"
                    class="ppt-brutalist-watermark ppt-brutalist-watermark--vertical"
                  >
                    {{ editorialBrutalistWatermark(slide) }}
                  </div>
                </template>

                <template v-else-if="editorialBrutalistLayout(slide) === 'quote'">
                  <div
                    v-if="editorialBrutalistIsMultiQuote(slide)"
                    class="ppt-editorial-brutalist-quote-page"
                  >
                    <header v-if="slide.title" class="ppt-brutalist-header ppt-brutalist-header--compact">
                      <h2 class="ppt-brutalist-title ppt-brutalist-quote-page-title">
                        <PptMarkdownInline
                          :text="slide.title"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                        />
                      </h2>
                    </header>
                    <blockquote class="ppt-brutalist-quote ppt-brutalist-quote--multi">
                      <div
                        class="ppt-brutalist-point-list"
                        :class="editorialBrutalistQuoteListClass(slide)"
                      >
                        <article
                          v-for="(item, qi) in editorialBrutalistQuoteItems(slide)"
                          :key="'brutalist-quote-' + qi"
                          class="ppt-brutalist-point"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ String(qi + 1).padStart(2, "0") }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              v-if="hasContentPointBody(item)"
                              class="ppt-brutalist-point-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-brutalist-point-body"
                              :text="
                                hasContentPointBody(item) ? parseContentBody(item) : displayText(item)
                              "
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onContentItemBlur($event, currentSlide, qi)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                      <cite v-if="slide.quote_author || slide.author || isEditing">
                        {{ slide.quote_author || slide.author }}
                      </cite>
                    </blockquote>
                    <PptMarkdownInline
                      v-if="slide.key_insight"
                      class="ppt-brutalist-insight ppt-brutalist-insight--inline"
                      :text="slide.key_insight"
                      :page-references="slide.page_references"
                      :editable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                  <template v-else>
                    <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                    <blockquote
                      class="ppt-brutalist-quote"
                      :class="editorialBrutalistQuoteCardClass(slide)"
                    >
                      <PptMarkdownInline
                        class="ppt-brutalist-quote-text"
                        :class="editorialBrutalistQuoteTextClass(slide)"
                        :text="editorialBrutalistQuoteText(slide)"
                        :page-references="slide.page_references"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.quote`)"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                      <cite v-if="slide.quote_author || slide.author || isEditing">
                        {{ slide.quote_author || slide.author }}
                      </cite>
                    </blockquote>
                  </template>
                </template>

                <template v-else-if="editorialBrutalistLayout(slide) === 'split'">
                  <header class="ppt-brutalist-header">
                    <p v-if="!hasDocumentFigurePage(slide)" class="ppt-brutalist-kicker">
                      {{ editorialBrutalistKicker(slide) }}
                    </p>
                    <h2 class="ppt-brutalist-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                  </header>
                  <div
                    class="ppt-brutalist-split"
                    :class="{ 'ppt-brutalist-split--figure': hasDocumentFigurePage(slide) }"
                    :style="editorialBrutalistSplitStyle(slide)"
                  >
                    <section class="ppt-brutalist-card ppt-brutalist-card--scroll">
                      <h3
                        v-if="!modernLiteraryCompareTitleDuplicatesSlide(slide.left_title, slide.title)"
                      >
                        <PptMarkdownInline
                          :text="slide.left_title || t('agent.pptLeftColumn')"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                        />
                      </h3>
                      <div
                        class="ppt-brutalist-point-list"
                        :class="editorialBrutalistSplitListClass(slide)"
                      >
                        <article
                          v-for="(item, li) in editorialBrutalistSplitLeft(slide)"
                          :key="'brutalist-left-' + li"
                          class="ppt-brutalist-point"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ String(li + 1).padStart(2, "0") }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              v-if="hasContentPointBody(item)"
                              class="ppt-brutalist-point-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-brutalist-point-body"
                              :text="
                                hasContentPointBody(item) ? parseContentBody(item) : displayText(item)
                              "
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onDocumentFigureLeftItemBlur($event, li)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                    </section>
                    <section
                      class="ppt-brutalist-card"
                      :class="
                        hasDocumentFigurePage(slide)
                          ? 'ppt-brutalist-card--figure-panel'
                          : 'ppt-brutalist-card--invert'
                      "
                    >
                      <h3>
                        <PptMarkdownInline
                          :text="
                            slide.right_title ||
                            (hasDocumentFigurePage(slide)
                              ? t('agent.pptDocumentSourceImage')
                              : t('agent.pptRightColumn'))
                          "
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                        />
                      </h3>
                      <figure v-if="documentFigure?.url" class="ppt-brutalist-document-figure">
                        <img
                          :src="documentFigure.url"
                          class="ppt-brutalist-document-figure-img"
                          :style="documentFigureImgStyle(documentFigure)"
                          :alt="documentFigure.caption || documentFigure.page_label || slide.title || ''"
                          loading="lazy"
                          crossorigin="anonymous"
                        />
                        <figcaption
                          v-if="documentFigure.caption || documentFigure.page_label || isEditing"
                          :contenteditable="isEditing"
                          @blur="onDocumentFigureCaptionBlur"
                        >
                          {{ documentFigure.caption || documentFigure.page_label || "" }}
                        </figcaption>
                      </figure>
                      <template v-else>
                        <PptMarkdownInline
                          v-for="(item, ri) in editorialBrutalistSplitRight(slide)"
                          :key="'brutalist-right-' + ri"
                          class="ppt-brutalist-card-body"
                          :text="displayText(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </template>
                    </section>
                  </div>
                </template>

                <template v-else-if="isHeroLeftSlide(slide)">
                  <header class="ppt-brutalist-header">
                    <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                    <h2 class="ppt-brutalist-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                  </header>
                  <div class="ppt-brutalist-hero-left">
                    <div class="ppt-brutalist-hero-left-row">
                      <aside class="ppt-brutalist-hero-left-panel">
                        <div
                          class="ppt-brutalist-hero-metric"
                          :style="heroMetricStyle(slide.hero_metric)"
                        >
                          <div
                            v-if="slide.hero_metric?.value"
                            class="ppt-brutalist-hero-metric-value"
                            :contenteditable="isEditing"
                            @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                          >
                            {{ slide.hero_metric.value }}
                          </div>
                          <PptMarkdownInline
                            v-if="slide.hero_metric?.caption"
                            class="ppt-brutalist-hero-metric-caption"
                            :text="slide.hero_metric.caption"
                            :page-references="slide.page_references"
                            :editable="isEditing"
                            @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </div>
                        <div
                          v-if="slide.metric_cards?.length"
                          class="ppt-brutalist-hero-mini-metrics"
                        >
                          <article
                            v-for="(card, mi) in slide.metric_cards"
                            :key="'brutalist-hm-' + mi"
                            class="ppt-brutalist-hero-mini-metric"
                            :style="{ borderLeftColor: normalizeAccentColor(card.accent_color) || undefined }"
                          >
                            <strong>{{ card.value }}</strong>
                            <PptMarkdownInline
                              class="ppt-brutalist-hero-mini-metric-label"
                              :text="card.label || ''"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </article>
                        </div>
                      </aside>
                      <section class="ppt-brutalist-hero-left-aside">
                        <article
                          v-for="(ri, idx) in slide.right_items || []"
                          :key="'brutalist-hri-' + idx"
                          class="ppt-brutalist-point ppt-brutalist-point--hero-side"
                          :style="heroRightCardStyle(ri, idx)"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ formatRightItemIndex(ri, idx) }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              class="ppt-brutalist-point-title"
                              :text="rightItemTitle(ri)"
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              v-if="rightItemDescription(ri) || isEditing"
                              class="ppt-brutalist-point-body"
                              :text="rightItemDescription(ri)"
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </section>
                    </div>
                    <section
                      v-if="resolveSlideBulletItems(slide).length"
                      class="ppt-brutalist-hero-left-notes"
                    >
                      <div
                        class="ppt-brutalist-point-list"
                        :class="editorialBrutalistSplitListClass(slide)"
                      >
                        <article
                          v-for="(item, bi) in resolveSlideBulletItems(slide)"
                          :key="'brutalist-hl-content-' + bi"
                          class="ppt-brutalist-point"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ String(bi + 1).padStart(2, "0") }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              v-if="hasContentPointBody(item)"
                              class="ppt-brutalist-point-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-brutalist-point-body"
                              :text="
                                hasContentPointBody(item) ? parseContentBody(item) : displayText(item)
                              "
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onContentItemBlur($event, currentSlide, bi)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                    </section>
                  </div>
                </template>

                <template v-else-if="editorialBrutalistIsContentSplit(slide)">
                  <header class="ppt-brutalist-header">
                    <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                    <h2 class="ppt-brutalist-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                  </header>
                  <div class="ppt-brutalist-split ppt-brutalist-split--content">
                    <section class="ppt-brutalist-card ppt-brutalist-card--scroll">
                      <div
                        class="ppt-brutalist-point-list"
                        :class="editorialBrutalistSplitListClass(slide)"
                      >
                        <article
                          v-for="(item, bi) in resolveSlideBulletItems(slide)"
                          :key="'brutalist-cs-left-' + bi"
                          class="ppt-brutalist-point"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ String(bi + 1).padStart(2, "0") }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              v-if="hasContentPointBody(item)"
                              class="ppt-brutalist-point-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-brutalist-point-body"
                              :text="
                                hasContentPointBody(item) ? parseContentBody(item) : displayText(item)
                              "
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onContentItemBlur($event, currentSlide, bi)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                    </section>
                    <section class="ppt-brutalist-card ppt-brutalist-content-split-aside">
                      <article
                        v-for="(ri, idx) in slide.right_items || []"
                        :key="'brutalist-cs-right-' + idx"
                        class="ppt-brutalist-point ppt-brutalist-point--hero-side"
                        :style="heroRightCardStyle(ri, idx)"
                      >
                        <div class="ppt-brutalist-point-index">
                          {{ formatRightItemIndex(ri, idx) }}
                        </div>
                        <div class="ppt-brutalist-point-copy">
                          <PptMarkdownInline
                            class="ppt-brutalist-point-title"
                            :text="rightItemTitle(ri)"
                            :page-references="slide.page_references"
                            :editable="isEditing"
                            @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                          <PptMarkdownInline
                            v-if="rightItemDescription(ri) || isEditing"
                            class="ppt-brutalist-point-body"
                            :text="rightItemDescription(ri)"
                            :page-references="slide.page_references"
                            :editable="isEditing"
                            @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </div>
                      </article>
                    </section>
                  </div>
                </template>

                <template v-else-if="editorialBrutalistLayout(slide) === 'grid'">
                  <header class="ppt-brutalist-header">
                    <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                    <h2 class="ppt-brutalist-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                  </header>
                  <div
                    v-if="editorialBrutalistIsDataSlide(slide)"
                    class="ppt-brutalist-data-panel"
                    :class="{
                      'ppt-brutalist-data-panel--table': editorialBrutalistShowDataTable(slide),
                    }"
                  >
                    <section
                      v-if="resolveSlideBulletItems(slide).length"
                      class="ppt-brutalist-data-notes"
                    >
                      <div
                        class="ppt-brutalist-point-list"
                        :class="editorialBrutalistSplitListClass(slide)"
                      >
                        <article
                          v-for="(item, bi) in resolveSlideBulletItems(slide)"
                          :key="'brutalist-data-' + bi"
                          class="ppt-brutalist-point"
                        >
                          <div class="ppt-brutalist-point-index">
                            {{ String(bi + 1).padStart(2, "0") }}
                          </div>
                          <div class="ppt-brutalist-point-copy">
                            <PptMarkdownInline
                              v-if="hasContentPointBody(item)"
                              class="ppt-brutalist-point-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-brutalist-point-body"
                              :text="
                                hasContentPointBody(item) ? parseContentBody(item) : displayText(item)
                              "
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onContentItemBlur($event, currentSlide, bi)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                    </section>
                    <section class="ppt-brutalist-data-chart">
                      <PptTableBlock
                        v-if="editorialBrutalistShowDataTable(slide) && slide.table"
                        class="ppt-brutalist-data-table"
                        :table="slide.table"
                        :page-references="slide.page_references"
                        compact
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                      <PptBrutalistDataChart v-else-if="slide.chart" :slide="slide" />
    </section>
                  </div>
                  <div
                    v-else
                    class="ppt-brutalist-card-grid"
                    :class="`ppt-brutalist-card-grid--${editorialBrutalistCardGridDensity(slide)}`"
                  >
                    <article
                      v-for="card in editorialBrutalistContentCards(slide)"
                      :key="'brutalist-card-' + card.index"
                      class="ppt-brutalist-card"
                    >
                      <div class="ppt-brutalist-card-index">{{ card.index }}</div>
                      <h3>{{ card.title }}</h3>
                      <PptMarkdownInline
                        v-if="card.body"
                        class="ppt-brutalist-card-body"
                        :text="card.body"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </article>
                  </div>
                </template>

                <template v-else>
                  <div class="ppt-brutalist-asymmetric">
                    <section>
                      <p class="ppt-brutalist-kicker">{{ editorialBrutalistKicker(slide) }}</p>
                      <h2 class="ppt-brutalist-title">
                        <PptMarkdownInline
                          :text="slide.title || ''"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                        />
                      </h2>
                      <div class="ppt-brutalist-divider"></div>
                      <PptMarkdownInline
                        v-for="(item, bi) in slide.content || []"
                        :key="'brutalist-body-' + bi"
                        class="ppt-brutalist-body-block"
                        :text="displayText(item)"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </section>
                    <aside class="ppt-brutalist-watermark">
                      {{ editorialBrutalistWatermark(slide) }}
                    </aside>
                  </div>
                </template>

                <PptMarkdownInline
                  v-if="slide.key_insight && !['quote'].includes(slide.layout)"
                  class="ppt-brutalist-insight"
                  :class="{ 'ppt-brutalist-insight--inline': editorialBrutalistInsightInline(slide) }"
                  :text="slide.key_insight"
                  :page-references="slide.page_references"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
    <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
  </div>
</template>

<style lang="scss">
@import "./editorialBrutalist.scss";
</style>
