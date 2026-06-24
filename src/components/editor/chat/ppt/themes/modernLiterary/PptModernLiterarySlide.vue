<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import { pptSlideEditorKey } from "../../pptSlideContext";
import type { PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  parseContentBody,
} from "../../shared/contentHelpers";
import {
  documentFigureImgStyle,
  normalizeDocumentFigure,
  resolveSectionSubtitle,
} from "../../shared/slideLayoutHelpers";
import type { ModernLiteraryContext } from "./modernLiteraryHelpers";
import * as modern from "./modernLiteraryHelpers";

const props = defineProps<{ slide: PptSlide }>();

const editor = inject(pptSlideEditorKey)!;
const { locale } = useI18n();

const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;
const modernLiteraryCoverTagline = editor.modernLiteraryCoverTagline;
const sectionChapterNum = editor.sectionChapterNum;

const modernCtx = computed<ModernLiteraryContext>(() => ({
  currentSlideIndex: editor.currentSlideIndex.value,
}));

const modernLiteraryQuoteCardClass = modern.modernLiteraryQuoteCardClass;
const modernLiteraryQuoteTextClass = modern.modernLiteraryQuoteTextClass;
const modernLiteraryQuoteText = modern.modernLiteraryQuoteText;
const modernLiteraryPortraitKicker = modern.modernLiteraryPortraitKicker;
const modernLiteraryPortraitHeroTitle = modern.modernLiteraryPortraitHeroTitle;
const modernLiteraryPortraitHeroBody = modern.modernLiteraryPortraitHeroBody;
const modernLiteraryRightItemTitleAccentClass = modern.modernLiteraryRightItemTitleAccentClass;
const modernLiteraryRightItemTitleAccentStyle = modern.modernLiteraryRightItemTitleAccentStyle;
const modernLiteraryDoubleItems = modern.modernLiteraryDoubleItems;
const modernLiteraryDoubleVariant = (s: PptSlide) =>
  modern.modernLiteraryDoubleVariant(s, modernCtx.value);
const modernLiteraryTripleVariant = modern.modernLiteraryTripleVariant;
const modernLiteraryTripleItems = modern.modernLiteraryTripleItems;
const modernLiteraryTripleDarkIndex = (s: PptSlide) =>
  modern.modernLiteraryTripleDarkIndex(s, modernCtx.value);
const modernLiteraryQuadVariant = (s: PptSlide) =>
  modern.modernLiteraryQuadVariant(s, modernCtx.value);
const modernLiteraryQuadItems = modern.modernLiteraryQuadItems;
const modernLiteraryMultiItems = modern.modernLiteraryMultiItems;
const modernLiteraryQuoteItems = modern.modernLiteraryQuoteItems;
const modernLiteraryBodyItems = modern.modernLiteraryBodyItems;
const modernLiteraryInlineKeyInsight = modern.modernLiteraryInlineKeyInsight;
const modernLiteraryRightItems = modern.modernLiteraryRightItems;
const modernLiteraryTwoColumnFooter = modern.modernLiteraryTwoColumnFooter;
const modernLiteraryCompareTitleDuplicatesSlide = modern.modernLiteraryCompareTitleDuplicatesSlide;
const isModernLiteraryRightItemsContent = modern.isModernLiteraryRightItemsContent;
const isModernLiteraryQuadContent = modern.isModernLiteraryQuadContent;
const isModernLiteraryMultiContent = modern.isModernLiteraryMultiContent;
const isModernLiteraryDoubleContent = modern.isModernLiteraryDoubleContent;
const isModernLiteraryTripleContent = modern.isModernLiteraryTripleContent;

const t = editor.t;
const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;

const documentFigure = computed(() => normalizeDocumentFigure(props.slide));
</script>

<template>
  <div class="ppt-slide ppt-modern-literary" :class="`ppt-modern-literary--${slide.layout}`">
                <template v-if="slide.layout === 'cover'">
                  <div class="ppt-modern-kicker">
                    {{ slide.author || slide.organization || t("agent.pptDefaultOrg") }}
                  </div>
                  <div class="ppt-modern-cover-grid">
                    <div class="ppt-modern-cover-main">
                      <h1 class="ppt-modern-cover-title">
                        <PptMarkdownInline
                          :text="slide.title || ''"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                        />
                      </h1>
                      <div class="ppt-modern-accent-line"></div>
                      <p v-if="pptSource.subtitle || slide.subtitle" class="ppt-modern-cover-subtitle">
                        <PptMarkdownInline
                          :text="slide.subtitle || pptSource.subtitle || ''"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                        />
                      </p>
                    </div>
                  </div>
                  <div class="ppt-modern-cover-footer">
                    <span v-if="modernLiteraryCoverTagline" class="ppt-modern-cover-footer-text">{{ modernLiteraryCoverTagline }}</span>
                    <span class="ppt-modern-cover-footer-date">{{
                      slide.date ||
                      new Date().toLocaleDateString(locale === "zh-cn" ? "zh-CN" : "en-US", {
                        year: "numeric",
                        month: "long",
                      })
                    }}</span>
                  </div>
                </template>

                <template v-else-if="slide.layout === 'section'">
                  <div class="ppt-modern-section-rail"></div>
                  <div class="ppt-modern-section-block">
                    <div class="ppt-modern-section-label">
                      {{
                        t("agent.pptChapterLabel", {
                          number:
                            slide.chapter_number ||
                            String(sectionChapterNum).padStart(2, "0"),
                        })
                      }}
                    </div>
                    <h2 class="ppt-modern-section-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                    <div class="ppt-modern-section-line"></div>
                    <PptMarkdownInline
                      v-if="resolveSectionSubtitle(slide) || isEditing"
                      class="ppt-modern-section-subtitle"
                      :text="resolveSectionSubtitle(slide)"
                      :editable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.subtitle_en`)"
                    />
                  </div>
                </template>

                <template v-else-if="slide.layout === 'quote'">
                  <div class="ppt-modern-quote-card" :class="modernLiteraryQuoteCardClass(slide)">
                    <div class="ppt-modern-quote-mark">“</div>
                    <PptMarkdownInline
                      class="ppt-modern-quote-text"
                      :class="modernLiteraryQuoteTextClass(slide)"
                      :text="modernLiteraryQuoteText(slide)"
                      :page-references="slide.page_references"
                      :editable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.quote`)"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                    <div
                      v-if="slide.quote_author || slide.author || isEditing"
                      class="ppt-modern-quote-author"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.quote_author`)"
                    >
                      {{ slide.quote_author || slide.author }}
                    </div>
                  </div>
                  <PptMarkdownInline
                    v-if="slide.key_insight"
                    class="ppt-modern-insight"
                    :text="slide.key_insight"
                    :page-references="slide.page_references"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </template>

                <template v-else-if="slide.layout === 'content'">
                  <div
                    v-if="isModernLiteraryRightItemsContent(slide)"
                    class="ppt-modern-right-items-portrait"
                  >
                    <section class="ppt-modern-portrait-hero">
                      <div class="ppt-modern-impact-block">
                        <div v-if="modernLiteraryPortraitKicker(slide)" class="ppt-modern-portrait-kicker">
                          {{ modernLiteraryPortraitKicker(slide) }}
                        </div>
                        <h2 class="ppt-modern-portrait-title">
                          <PptMarkdownInline
                            :text="modernLiteraryPortraitHeroTitle(slide)"
                            :editable="isEditing"
                            @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                          />
                        </h2>
                      </div>
                      <PptMarkdownInline
                        v-if="modernLiteraryPortraitHeroBody(slide)"
                        class="ppt-modern-portrait-lead"
                        :text="modernLiteraryPortraitHeroBody(slide)"
                        :page-references="slide.page_references"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.speaker_notes`)"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </section>
                    <section class="ppt-modern-portrait-side">
                      <div
                        class="ppt-modern-portrait-list"
                        :class="{ 'ppt-modern-portrait-list--dense': (slide.right_items?.length ?? 0) >= 4 }"
                      >
                        <article
                          v-for="(ri, idx) in slide.right_items"
                          :key="'modern-right-item-' + idx"
                          class="ppt-modern-portrait-item"
                        >
                          <span
                            class="ppt-modern-portrait-bullet"
                            :style="{ background: (ri.accent_color || '').trim() || undefined }"
                          ></span>
                          <div>
                            <PptMarkdownInline
                              class="ppt-modern-portrait-item-title"
                              :class="{ 'ppt-modern-portrait-item-title--accent': modernLiteraryRightItemTitleAccentClass(ri, idx) }"
                              :style="modernLiteraryRightItemTitleAccentStyle(ri, idx)"
                              :text="rightItemTitle(ri)"
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onCellBlur($event, `slides.${currentSlide}.right_items.${idx}.title`)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              v-if="rightItemDescription(ri) || isEditing"
                              class="ppt-modern-portrait-item-body"
                              :text="rightItemDescription(ri)"
                              :page-references="slide.page_references"
                              :editable="isEditing"
                              @blur="onCellBlur($event, `slides.${currentSlide}.right_items.${idx}.description`)"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </article>
                      </div>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-portrait-insight"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </section>
                  </div>

                  <template v-else>
                  <div class="ppt-modern-content-header">
                    <h2 class="ppt-modern-slide-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                    <div class="ppt-modern-accent-line"></div>
                  </div>
                  <div
                    v-if="isModernLiteraryDoubleContent(slide)"
                    class="ppt-modern-double"
                    :class="`ppt-modern-double--${modernLiteraryDoubleVariant(slide)}`"
                  >
                    <template v-if="modernLiteraryDoubleVariant(slide) === 'contrast'">
                        <article
                          v-for="(item, di) in modernLiteraryDoubleItems(slide)"
                          :key="'modern-double-contrast-' + di"
                          class="ppt-modern-double-card"
                          :class="{ 'ppt-modern-double-card--dark': di === 1, 'ppt-modern-double-card--light': di === 0 }"
                        >
                        <h3>
                          <PptMarkdownInline
                            :text="contentPointTitle(item)"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </h3>
                        <PptMarkdownInline
                          class="ppt-modern-double-card-body"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </article>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-double-quote-strip"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </template>

                    <template v-else-if="modernLiteraryDoubleVariant(slide) === 'split'">
                      <section class="ppt-modern-double-split-hero">
                        <div class="ppt-modern-double-kicker">
                          {{ contentPointTitle(modernLiteraryDoubleItems(slide)[0]) }}
                        </div>
                        <h3>
                          <PptMarkdownInline
                            :text="contentPointTitle(modernLiteraryDoubleItems(slide)[0])"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </h3>
                        <PptMarkdownInline
                          class="ppt-modern-double-split-body"
                          :text="parseContentBody(modernLiteraryDoubleItems(slide)[0])"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </section>
                      <section class="ppt-modern-double-split-side">
                        <div class="ppt-modern-double-side-card">
                          <PptMarkdownInline
                            class="ppt-modern-double-side-title"
                            :text="contentPointTitle(modernLiteraryDoubleItems(slide)[1])"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                          <PptMarkdownInline
                            class="ppt-modern-double-side-body"
                            :text="parseContentBody(modernLiteraryDoubleItems(slide)[1])"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </div>
                        <PptMarkdownInline
                          v-if="slide.key_insight"
                          class="ppt-modern-double-side-insight"
                          :text="slide.key_insight"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </section>
                    </template>

                    <template v-else-if="modernLiteraryDoubleVariant(slide) === 'stacked'">
                      <div class="ppt-modern-double-stacked-list">
                        <article
                          v-for="(item, di) in modernLiteraryDoubleItems(slide)"
                          :key="'modern-double-stacked-' + di"
                          class="ppt-modern-double-stacked-card"
                          :class="{ 'ppt-modern-double-stacked-card--impact': di === 0, 'ppt-modern-double-stacked-card--soft': di === 1 }"
                        >
                          <h3>
                            <PptMarkdownInline
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </h3>
                          <PptMarkdownInline
                            class="ppt-modern-double-stacked-body"
                            :text="parseContentBody(item)"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </article>
                      </div>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-double-stacked-footer"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </template>

                    <template v-else>
                      <aside class="ppt-modern-double-aside">
                        <div class="ppt-modern-double-kicker">
                          {{ contentPointTitle(modernLiteraryDoubleItems(slide)[0]) }}
                        </div>
                        <h3>
                          <PptMarkdownInline
                            :text="contentPointTitle(modernLiteraryDoubleItems(slide)[0])"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </h3>
                        <PptMarkdownInline
                          class="ppt-modern-double-aside-body"
                          :text="parseContentBody(modernLiteraryDoubleItems(slide)[0])"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </aside>
                      <section class="ppt-modern-double-numbered">
                        <div class="ppt-modern-double-number">01</div>
                        <PptMarkdownInline
                          class="ppt-modern-double-number-title"
                          :text="contentPointTitle(modernLiteraryDoubleItems(slide)[1])"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                        <PptMarkdownInline
                          class="ppt-modern-double-number-body"
                          :text="parseContentBody(modernLiteraryDoubleItems(slide)[1])"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                        <PptMarkdownInline
                          v-if="slide.key_insight"
                          class="ppt-modern-double-number-quote"
                          :text="slide.key_insight"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </section>
                    </template>
                  </div>

                  <div
                    v-else-if="isModernLiteraryTripleContent(slide)"
                    class="ppt-modern-triple"
                    :class="`ppt-modern-triple--${modernLiteraryTripleVariant(slide)}`"
                  >
                    <template v-if="modernLiteraryTripleVariant(slide) === 'portrait'">
                      <section class="ppt-modern-triple-portrait-hero">
                        <div class="ppt-modern-impact-block">
                          <div class="ppt-modern-triple-kicker">
                            {{ contentPointTitle(modernLiteraryTripleItems(slide)[0]) }}
                          </div>
                          <h3>
                            <PptMarkdownInline
                              :text="contentPointTitle(modernLiteraryTripleItems(slide)[0])"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </h3>
                        </div>
                        <PptMarkdownInline
                          class="ppt-modern-triple-portrait-body"
                          :text="parseContentBody(modernLiteraryTripleItems(slide)[0])"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </section>
                      <section class="ppt-modern-triple-portrait-list">
                        <div
                          v-for="(item, ti) in modernLiteraryTripleItems(slide).slice(1)"
                          :key="'modern-portrait-' + ti"
                          class="ppt-modern-triple-bullet ppt-modern-triple-bullet--block"
                        >
                          <span></span>
                          <div>
                            <PptMarkdownInline
                              class="ppt-modern-triple-bullet-title"
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                            <PptMarkdownInline
                              class="ppt-modern-triple-bullet-body"
                              :text="parseContentBody(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </div>
                        </div>
                      </section>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-triple-insight"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </template>

                    <template v-else-if="modernLiteraryTripleVariant(slide) === 'orbit'">
                      <div
                        v-for="(item, ti) in modernLiteraryTripleItems(slide)"
                        :key="'modern-orbit-' + ti"
                        class="ppt-modern-orbit-node"
                        :class="{ 'ppt-modern-orbit-node--dark': ti === 1 }"
                      >
                        <PptMarkdownInline
                          class="ppt-modern-orbit-kicker"
                          :text="contentPointTitle(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                        <PptMarkdownInline
                          class="ppt-modern-orbit-title"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-orbit-insight"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </template>

                    <template v-else>
                      <article
                        v-for="(item, ti) in modernLiteraryTripleItems(slide)"
                        :key="'modern-card-' + ti"
                        class="ppt-modern-triple-card"
                        :class="{ 'ppt-modern-triple-card--dark': ti === modernLiteraryTripleDarkIndex(slide) }"
                      >
                        <div class="ppt-modern-triple-card-head">
                          <span class="ppt-modern-triple-card-index">{{ ti + 1 }}</span>
                          <h3>
                            <PptMarkdownInline
                              :text="contentPointTitle(item)"
                              :page-references="slide.page_references"
                              @ref-click="onPptTableRefClick($event, slide)"
                            />
                          </h3>
                        </div>
                        <PptMarkdownInline
                          class="ppt-modern-triple-card-body"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </article>
                      <PptMarkdownInline
                        v-if="slide.key_insight"
                        class="ppt-modern-triple-cards-insight"
                        :text="slide.key_insight"
                        :page-references="slide.page_references"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </template>
                  </div>

                  <div
                    v-else-if="isModernLiteraryQuadContent(slide)"
                    class="ppt-modern-quad"
                    :class="`ppt-modern-quad--${modernLiteraryQuadVariant(slide)}`"
                  >
                    <div class="ppt-modern-quad-grid">
                      <article
                        v-for="(item, qi) in modernLiteraryQuadItems(slide)"
                        :key="'modern-quad-' + qi"
                        class="ppt-modern-quad-card"
                      >
                        <div
                          v-if="modernLiteraryQuadVariant(slide) === 'numbered'"
                          class="ppt-modern-quad-index"
                        >
                          {{ "0" + (qi + 1) }}
                        </div>
                        <div
                          v-else-if="modernLiteraryQuadVariant(slide) === 'panel'"
                          class="ppt-modern-quad-kicker"
                        >
                          {{ "0" + (qi + 1) }}
                        </div>
                        <PptMarkdownInline
                          class="ppt-modern-quad-title"
                          :text="contentPointTitle(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                        <PptMarkdownInline
                          v-if="hasContentPointBody(item)"
                          class="ppt-modern-quad-body"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </article>
                    </div>
                    <PptMarkdownInline
                      v-if="slide.key_insight"
                      class="ppt-modern-quad-insight"
                      :text="slide.key_insight"
                      :page-references="slide.page_references"
                      :editable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>

                  <div
                    v-else-if="isModernLiteraryMultiContent(slide)"
                    class="ppt-modern-multi"
                  >
                    <div class="ppt-modern-multi-grid">
                      <article
                        v-for="(item, mi) in modernLiteraryMultiItems(slide)"
                        :key="'modern-multi-' + mi"
                        class="ppt-modern-multi-card"
                        :class="{
                          'ppt-modern-multi-card--impact': mi === 0,
                          'ppt-modern-multi-card--dark': mi === 1,
                        }"
                      >
                        <h3>
                          <PptMarkdownInline
                            :text="contentPointTitle(item)"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </h3>
                        <PptMarkdownInline
                          class="ppt-modern-multi-body"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </article>
                    </div>
                  </div>

                  <div v-else class="ppt-modern-content-body">
                    <div v-if="modernLiteraryQuoteItems(slide).length" class="ppt-modern-content-quotes">
                      <div
                        v-for="(item, qi) in modernLiteraryQuoteItems(slide)"
                        :key="'modern-quote-' + qi"
                        class="ppt-modern-inline-quote"
                      >
                        <PptMarkdownInline
                          :text="modernLiteraryCleanText(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </div>
                    <div class="ppt-modern-explain-grid">
                      <div
                        v-for="(item, bi) in modernLiteraryBodyItems(slide)"
                        :key="'modern-body-' + bi"
                        class="ppt-modern-explain-card"
                      >
                        <PptMarkdownInline
                          class="ppt-modern-explain-title"
                          :text="contentPointTitle(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                        <PptMarkdownInline
                          v-if="hasContentPointBody(item)"
                          class="ppt-modern-explain-body"
                          :text="parseContentBody(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </div>
                  </div>
                  </template>
                  <PptMarkdownInline
                    v-if="slide.key_insight && !modernLiteraryInlineKeyInsight(slide)"
                    class="ppt-modern-insight ppt-modern-insight--footer"
                    :text="slide.key_insight"
                    :page-references="slide.page_references"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </template>

                <template v-else-if="slide.layout === 'two_column'">
                  <div class="ppt-modern-content-header">
                    <h2 class="ppt-modern-slide-title">
                      <PptMarkdownInline
                        :text="slide.title || ''"
                        :editable="isEditing"
                        @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                      />
                    </h2>
                    <div class="ppt-modern-accent-line"></div>
                  </div>
                  <div class="ppt-modern-two-col-grid">
                    <section class="ppt-modern-compare-card ppt-modern-compare-card--light">
                      <h3 v-if="!modernLiteraryCompareTitleDuplicatesSlide(slide.left_title, slide.title)">
                        <PptMarkdownInline
                          :text="slide.left_title || t('agent.pptLeftColumn')"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                        />
                      </h3>
                      <div class="ppt-modern-compare-list">
                        <PptMarkdownInline
                          v-for="(item, li) in slide.left_content || []"
                          :key="'modern-left-' + li"
                          class="ppt-modern-compare-item"
                          :text="displayText(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </section>
                    <section class="ppt-modern-compare-card ppt-modern-compare-card--dark">
                      <h3>
                        <PptMarkdownInline
                          :text="slide.right_title || t('agent.pptRightColumn')"
                          :editable="isEditing"
                          @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                        />
                      </h3>
                      <figure v-if="documentFigure?.url" class="ppt-modern-document-figure">
                        <img
                          :src="documentFigure.url"
                          class="ppt-modern-document-figure-img"
                          :style="documentFigureImgStyle(documentFigure)"
                          :alt="documentFigure.caption || documentFigure.page_label || slide.title || ''"
                          loading="lazy"
                          crossorigin="anonymous"
                        />
                        <figcaption v-if="documentFigure.caption || documentFigure.page_label">
                          {{ documentFigure.caption || documentFigure.page_label }}
                        </figcaption>
                      </figure>
                      <div v-else class="ppt-modern-compare-list">
                        <PptMarkdownInline
                          v-for="(item, ri) in modernLiteraryRightItems(slide)"
                          :key="'modern-right-' + ri"
                          class="ppt-modern-compare-item"
                          :text="modernLiteraryCleanText(item)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </section>
                  </div>
                  <div v-if="modernLiteraryTwoColumnFooter(slide)" class="ppt-modern-quote-strip">
                    <PptMarkdownInline
                      :text="modernLiteraryTwoColumnFooter(slide)"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                </template>

                <div v-if="currentBrandFooter && slide.layout !== 'cover'" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
    <div v-if="currentBrandFooter && slide.layout !== 'cover'" class="ppt-brand-footer">
      {{ currentBrandFooter }}
    </div>
  </div>
</template>

<style lang="scss">
@import "./modernLiterary.scss";
</style>
