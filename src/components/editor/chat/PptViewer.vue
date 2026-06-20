<template>
  <div
    class="ppt-viewer-shell"
    :class="{ 'ppt-viewer-shell--rail-open': showChatHistoryRail && !chatHistoryRailCollapsed }"
  >
  <div
    class="ppt-viewer"
    :class="{ 'ppt-viewer--presentation': isPresentationFullscreen }"
    ref="viewerRef"
    tabindex="0"
  >
    <!-- 工具栏 -->
    <div class="ppt-toolbar">
      <div class="ppt-nav">
        <button
          class="ppt-nav-btn"
          :disabled="currentSlide <= 0"
          @click="currentSlide = Math.max(0, currentSlide - 1)"
        >
          <!-- chevron-left SVG -->
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
            />
          </svg>
        </button>
        <span class="ppt-page-info">
          {{ currentSlide + 1 }} / {{ pptSource.total_slides }}
        </span>
        <button
          class="ppt-nav-btn"
          :disabled="currentSlide >= pptSource.slides.length - 1"
          @click="currentSlide = Math.min(pptSource.slides.length - 1, currentSlide + 1)"
        >
          <!-- chevron-right SVG -->
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
            />
          </svg>
        </button>
      </div>

      <div class="ppt-actions">
        <span class="ppt-title-label">{{ pptSource.title }}</span>
        <!-- <span
          v-if="pptTemplateLabel"
          class="ppt-template-label"
          :title="pptTemplateTagline"
          >{{ pptTemplateLabel }}</span
        > -->
        <!-- 分享 / 导出 -->
        <div ref="shareMenuRef" class="ppt-share-wrap">
          <button
            type="button"
            class="ppt-share-trigger"
            :disabled="exporting"
            :aria-expanded="shareMenuOpen"
            @click="toggleShareMenu"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11.5 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5.27 4.677l5.46 2.692a1.5 1.5 0 0 0 0 2.262l-5.46 2.692A1.5 1.5 0 0 1 3.5 11.19V4.81a1.5 1.5 0 0 1 1.77-1.133z"
              />
            </svg>
            <span>{{ t("agent.pptShare") }}</span>
            <svg
              class="ppt-share-chevron"
              :class="{ 'ppt-share-chevron--open': shareMenuOpen }"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>
          <div v-if="shareMenuOpen" class="ppt-share-menu" role="menu">
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="copyShareLink"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--link"
                aria-hidden="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  />
                </svg>
              </span>
              <span class="ppt-share-item-label">{{ t("agent.pptShareViaLink") }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1H4a1 1 0 0 1-1-1V1.5zm5.5 0v12h5a1 1 0 0 0 1-1V3.5a1 1 0 0 0-1-1h-5zM9 0H3.5A1.5 1.5 0 0 0 2 1.5V13a1 1 0 0 0 1 1h6V0z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('pdf')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--pdf"
                aria-hidden="true"
                >PDF</span
              >
              <span class="ppt-share-item-label">{{ t("agent.pptShareExportPdf") }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M8.5 1.5A1.5 1.5 0 0 0 7 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5V1.5zM8 1v5.5H14v8H2V1h6z"
                  />
                  <path
                    d="M7.5 9.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm3-1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm-6 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('pptx')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--pptx"
                aria-hidden="true"
                >P</span
              >
              <span class="ppt-share-item-label">{{
                t("agent.pptShareExportPptx")
              }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M8.5 1.5A1.5 1.5 0 0 0 7 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5V1.5zM8 1v5.5H14v8H2V1h6z"
                  />
                  <path
                    d="M7.5 9.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm3-1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm-6 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('google-slides')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--gslides"
                aria-hidden="true"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"
                  />
                </svg>
              </span>
              <span class="ppt-share-item-label">{{
                t("agent.pptShareExportGoogleSlides")
              }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M8.5 1.5A1.5 1.5 0 0 0 7 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5V1.5zM8 1v5.5H14v8H2V1h6z"
                  />
                  <path
                    d="M7.5 9.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm3-1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm-6 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('png')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--png"
                aria-hidden="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="11" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 18" />
                </svg>
              </span>
              <span class="ppt-share-item-label">{{
                t("agent.pptShareExportPngs")
              }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M8.5 1.5A1.5 1.5 0 0 0 7 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5V1.5zM8 1v5.5H14v8H2V1h6z"
                  />
                  <path
                    d="M7.5 9.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm3-1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm-6 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('png-long')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--png-long"
                aria-hidden="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <rect x="7" y="3" width="10" height="18" rx="2" />
                  <path d="M9 7h6M9 11h6M9 15h4" />
                </svg>
              </span>
              <span class="ppt-share-item-label">{{
                t("agent.pptShareExportPngLong")
              }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M8.5 1.5A1.5 1.5 0 0 0 7 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a1.5 1.5 0 0 0-1.5-1.5H9.5V1.5zM8 1v5.5H14v8H2V1h6z"
                  />
                  <path
                    d="M7.5 9.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm3-1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm-6 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="ppt-share-item"
              role="menuitem"
              :disabled="exporting"
              @click="runShareAction('linkedin')"
            >
              <span
                class="ppt-share-item-brand ppt-share-item-brand--linkedin"
                aria-hidden="true"
                >in</span
              >
              <span class="ppt-share-item-label">{{
                t("agent.pptSharePostLinkedIn")
              }}</span>
              <span class="ppt-share-item-action" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M15.854 1.146a.5.5 0 0 1 0 .708L2.707 14.793a.5.5 0 0 1-.708-.708L15.146 1.146a.5.5 0 0 1 .708 0z"
                  />
                  <path
                    d="M1 7.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm6-6a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H7.5a.5.5 0 0 1-.5-.5zm0 12a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="ppt-fullscreen-btn"
          :class="{ 'ppt-fullscreen-btn--active': isPresentationFullscreen }"
          :title="
            isPresentationFullscreen
              ? t('agent.pptFullscreenExit')
              : t('agent.pptFullscreenPlay')
          "
          :aria-pressed="isPresentationFullscreen"
          @click="togglePresentationFullscreen"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              v-if="!isPresentationFullscreen"
              d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"
            />
            <path
              v-else
              d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm16 0a.5.5 0 0 1 .5-.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 1 0v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"
            />
          </svg>
          <span>{{
            isPresentationFullscreen
              ? t("agent.pptFullscreenExit")
              : t("agent.pptFullscreenPlay")
          }}</span>
        </button>
        <!-- 关闭按钮 -->
        <button class="ppt-close-btn" @click="handleClose" :title="t('agent.pptClose')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 导出状态提示 -->
    <div v-if="exporting" class="ppt-export-status">
      <svg
        class="ppt-spinner"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path
          d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 1.03a7 7 0 1 1 0 13.94V1.03z"
          opacity="0.3"
        />
        <path d="M8.5 1.03V8H15a7 7 0 0 0-6.5-6.97z" />
      </svg>
      <span>{{ exportMessage }}</span>
    </div>

    <!-- 幻灯片主体 + 页下演讲备注（备注在 16:9 画布外） -->
    <div class="ppt-stage">
      <div
        ref="slideWrapperRef"
        class="ppt-slide-wrapper"
        :class="[
          `ppt-theme-${pptSource.theme || 'blue'}`,
          {
            'ppt-editing': isEditing,
            'ppt-palette-light': isLightPalette,
            'ppt-scheme-dark': isDarkScheme,
          },
        ]"
        :style="slideWrapperStyle"
        @contextmenu.prevent="onPptSlideContextMenu"
      >
        <template v-if="slide">
          <!-- modern-literary-minimal：现代文学极简渲染分支 -->
          <div
            v-if="shouldUseModernLiterarySlide(slide)"
            class="ppt-slide ppt-modern-literary"
            :class="`ppt-modern-literary--${slide.layout}`"
          >
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
              <div class="ppt-modern-quote-card">
                <div class="ppt-modern-quote-mark">“</div>
                <PptMarkdownInline
                  class="ppt-modern-quote-text"
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
                    <h3>
                      <PptMarkdownInline
                        :text="contentPointTitle(item)"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </h3>
                    <PptMarkdownInline
                      class="ppt-modern-triple-card-body"
                      :text="parseContentBody(item)"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </article>
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
          </div>

          <!-- cover 封面 -->
          <div
            v-else-if="slide.layout === 'cover'"
            class="ppt-slide ppt-cover"
            :style="coverBackdropUrl ? { backgroundImage: `url(${coverBackdropUrl})` } : {}"
          >
            <!-- 背景图蒙层（cover 仅 image_url 作全页背景） -->
            <div v-if="coverBackdropUrl" class="ppt-slide-bg-overlay"></div>
            <!-- 意境装饰背景（20 套随机其一，无背景图时显示） -->
            <div
              v-if="!coverBackdropUrl"
              class="ppt-cover-skyline"
              v-html="coverDecorationSvg"
            />
            <!-- 封面主体内容（居中） -->
            <div class="ppt-cover-content">
              <h1 class="ppt-cover-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h1>
              <p
                v-if="pptSource.subtitle"
                class="ppt-cover-subtitle"
                :contenteditable="isEditing"
                @blur="onCellBlur($event, 'subtitle')"
              >
                {{ pptSource.subtitle }}
              </p>
            </div>
            <!-- 底部信息卡片 -->
            <div class="ppt-cover-info">
              <div class="ppt-cover-info-inner">
                <div class="ppt-cover-author">
                  {{ slide.author || slide.organization || t("agent.pptDefaultOrg") }}
                </div>
                <div class="ppt-cover-date">
                  {{
                    slide.date ||
                    new Date().toLocaleDateString(
                      locale === "zh-cn" ? "zh-CN" : "en-US",
                      {
                        year: "numeric",
                        month: "long",
                      }
                    )
                  }}
                </div>
              </div>
            </div>
            <!-- 底部装饰线 -->
            <div class="ppt-cover-bottom-line"></div>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- section 章节过渡 -->
          <div
            v-else-if="slide.layout === 'section'"
            class="ppt-slide ppt-section"
            :style="
              sectionBackdropUrl ? { backgroundImage: `url(${sectionBackdropUrl})` } : {}
            "
          >
            <div v-if="sectionBackdropUrl" class="ppt-slide-bg-overlay"></div>
            <div
              v-if="!sectionBackdropUrl"
              class="ppt-cover-skyline ppt-scenic-skyline"
              v-html="sectionDecorationSvg"
            />
            <!-- 四角装饰 -->
            <span class="ppt-section-corner ppt-section-corner--tl"></span>
            <span class="ppt-section-corner ppt-section-corner--tr"></span>
            <span class="ppt-section-corner ppt-section-corner--bl"></span>
            <span class="ppt-section-corner ppt-section-corner--br"></span>
            <!-- 居中内容 -->
            <div class="ppt-section-content">
              <div class="ppt-section-label">
                {{
                  t("agent.pptChapterLabel", {
                    number:
                      slide.chapter_number ||
                      String(sectionChapterNum).padStart(2, "0"),
                  })
                }}
              </div>
              <h2 class="ppt-section-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <div class="ppt-section-divider"></div>
              <div
                v-if="resolveSectionSubtitle(slide) || isEditing"
                class="ppt-section-sub"
              >
                <PptMarkdownInline
                  :text="resolveSectionSubtitle(slide)"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle_en`)"
                />
              </div>
            </div>
            <!-- 底部品牌标识 -->
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- toc 目录页 -->
          <div
            v-else-if="slide.layout === 'toc'"
            class="ppt-slide ppt-toc"
            :class="`ppt-toc--${tocDensityLevel(slide)}`"
          >
            <!-- 标题区域 -->
            <div class="ppt-toc-header">
              <h2 class="ppt-toc-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <div v-if="slide.subtitle" class="ppt-toc-subtitle">
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </div>
            </div>
            <!-- 卡片网格 -->
            <div class="ppt-toc-grid" :class="`ppt-toc-grid--${tocDensityLevel(slide)}`">
              <div
                v-for="(entry, ti) in getTocEntries(slide)"
                :key="'toc-' + ti"
                class="ppt-toc-card"
              >
                <div class="ppt-toc-card-icon">
                  <!-- 根据 toc_items.icon 或序号轮换不同图标 -->
                  <svg
                    v-if="tocIconIndex(entry, ti) === 0"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <svg
                    v-else-if="tocIconIndex(entry, ti) === 1"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <svg
                    v-else-if="tocIconIndex(entry, ti) === 2"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <svg
                    v-else-if="tocIconIndex(entry, ti) === 3"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <svg
                    v-else-if="tocIconIndex(entry, ti) === 4"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <svg
                    v-else
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div class="ppt-toc-card-body">
                  <template v-if="isEditing && entry.raw">
                    <div
                      class="ppt-toc-card-title ppt-editable-full"
                      contenteditable="true"
                      @blur="onContentItemBlur($event, currentSlide, ti)"
                    >
                      {{ entry.raw }}
                    </div>
                  </template>
                  <template v-else>
                    <div class="ppt-toc-card-title">
                      <span class="ppt-toc-card-num">{{ entry.number }}</span>
                      {{ entry.title }}
                    </div>
                    <div v-if="entry.description" class="ppt-toc-card-desc">
                      {{ entry.description }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <!-- 底部品牌标识 -->
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- references 参考资料页 -->
          <div
            v-else-if="slide.layout === 'references'"
            class="ppt-slide ppt-references"
          >
            <h2 class="ppt-slide-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>
            <div v-if="slide.subtitle" class="ppt-ref-subtitle">
              <PptMarkdownInline
                :text="slide.subtitle || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
              />
            </div>
            <div class="ppt-ref-list">
              <template v-for="(item, ri) in slide.content || []" :key="ri">
                <a
                  v-if="resolveReferencesSlideItemUrl(item, slide)"
                  :href="resolveReferencesSlideItemUrl(item, slide)!"
                  class="ppt-ref-item ppt-ref-item--link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ displayText(item) }}
                </a>
                <div v-else class="ppt-ref-item">
                  {{ displayText(item) }}
                </div>
              </template>
            </div>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- content 标准内容页 -->
          <div
            v-else-if="slide.layout === 'content'"
            class="ppt-slide ppt-content"
            :class="{ 'ppt-slide--metric-only': isMetricCardsOnlySlide(slide) }"
          >
            <h2 class="ppt-slide-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>

            <!-- 关键洞察：紧挨标题下方全宽展示（优先于正文卡片） -->
            <div
              v-if="slide.key_insight"
              class="ppt-content-insight ppt-content-insight--page-callout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"
                />
                <line x1="9" y1="21" x2="15" y2="21" />
              </svg>
              <PptMarkdownInline
                class="ppt-content-insight-text"
                :text="slide.key_insight || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
              />
            </div>

            <div
              v-if="slide.subtitle && shouldShowMetricCardsPrimaryGrid(slide)"
              class="ppt-chart-subtitle"
            >
              <PptMarkdownInline
                :text="slide.subtitle || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
              />
            </div>

            <!-- KPI 卡：metric_cards_row（无 table/chart 时主视觉；有时为上方 KPI 条） -->
            <div
              v-if="shouldShowMetricCardsPrimaryGrid(slide)"
              class="ppt-metric-cards-fullpage"
              :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
            >
              <PptMetricCardsRow
                :cards="slide.metric_cards ?? []"
                :primary="shouldUsePrimaryMetricCards(slide)"
                :fill="shouldFillMetricCards(slide)"
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>

            <!-- 顶部 hero KPI（单 hero，非 hero_left / 非 metric_cards） -->
            <div
              v-if="shouldShowHeroMetricBanner(slide)"
              class="ppt-hero-metric ppt-content-hero-metric"
              :style="heroMetricStyle(slide.hero_metric)"
            >
              <div
                v-if="slide.hero_metric?.value"
                class="ppt-hero-metric-value"
                :contenteditable="isEditing"
                @blur="onHeroMetricBlur($event, currentSlide, 'value')"
              >
                {{ slide.hero_metric.value }}
              </div>
              <PptMarkdownInline
                v-if="slide.hero_metric?.caption"
                class="ppt-hero-metric-caption"
                :text="slide.hero_metric.caption"
                :page-references="slide.page_references"
                :editable="isEditing"
                @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>

            <!-- hero_left：左大数 + 右列表（与 metric_cards_row 互斥，不再渲染 content 要点） -->
            <div
              v-if="isHeroLeftSlide(slide)"
              class="ppt-content-split ppt-content-items-split ppt-hero-left-split"
            >
              <div class="ppt-content-left ppt-hero-left-panel">
                <div
                  class="ppt-hero-metric ppt-content-hero-metric"
                  :style="heroMetricStyle(slide.hero_metric)"
                >
                  <div
                    v-if="slide.hero_metric?.value"
                    class="ppt-hero-metric-value"
                    :contenteditable="isEditing"
                    @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                  >
                    {{ slide.hero_metric.value }}
                  </div>
                  <PptMarkdownInline
                    v-if="slide.hero_metric?.caption"
                    class="ppt-hero-metric-caption"
                    :text="slide.hero_metric.caption"
                    :page-references="slide.page_references"
                    :editable="isEditing"
                    @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
              </div>
              <div class="ppt-content-right ppt-hero-right-items">
                <template v-if="slide.right_items?.length">
                  <div
                    v-for="(ri, idx) in slide.right_items"
                    :key="'hl-ri-' + idx"
                    class="ppt-hero-right-card"
                    :style="heroRightCardStyle(ri, idx)"
                  >
                    <div class="ppt-hero-right-card-head">
                      <span
                        class="ppt-hero-right-card-index"
                        :style="{ color: rightItemAccentColor(ri, idx) }"
                        :contenteditable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                        >{{ formatRightItemIndex(ri, idx) }}</span
                      >
                      <PptMarkdownInline
                        class="ppt-hero-right-card-title"
                        :text="rightItemTitle(ri)"
                        :editable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="rightItemDescription(ri) || isEditing"
                      class="ppt-hero-right-card-desc"
                      :text="rightItemDescription(ri)"
                      :editable="isEditing"
                      @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                    />
                  </div>
                </template>
                <template v-else>
                  <PptMetricCardsRow
                    v-if="shouldShowHeroLeftMetricCards(slide)"
                    :cards="slide.metric_cards ?? []"
                    column
                    :page-references="slide.page_references"
                    :card-style="metricCardStyle"
                    :value-style="metricCardValueStyle"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                  <PptTableBlock
                    v-else-if="shouldShowHeroLeftTable(slide) && slide.table"
                    :table="slide.table"
                    :page-references="slide.page_references"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                  <template v-if="shouldShowHeroLeftContentItems(slide)">
                    <div
                      v-for="(ri, idx) in heroLeftContentRightItems(slide)"
                      :key="'hl-fb-' + idx"
                      class="ppt-hero-right-card"
                      :class="{ 'ppt-hero-right-card--after-metrics': shouldShowHeroLeftMetricCards(slide) }"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-hero-right-card-head">
                        <span
                          class="ppt-hero-right-card-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-hero-right-card-title"
                          :text="rightItemTitle(ri)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri)"
                        class="ppt-hero-right-card-desc"
                        :text="rightItemDescription(ri)"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </div>
                  </template>
                </template>
              </div>
            </div>

            <!-- ════ 有表格/图表时：左右分栏布局 ════ -->
            <div
              v-else-if="hasBodyPrimaryVisual(slide)"
              class="ppt-content-split"
              :class="{
                'ppt-content-split--table-chart-dual':
                  hasTableAndChart(slide) && !shouldShowContentBullets(slide),
                'ppt-content-split--table-chart-with-bullets':
                  hasTableAndChart(slide) && shouldShowContentBullets(slide),
                'ppt-content-chart-only':
                  hasBodyPrimaryVisual(slide) && !shouldShowContentBullets(slide),
              }"
            >
              <!-- 左栏：文字要点 -->
              <div v-if="shouldShowContentBullets(slide)" class="ppt-content-left">
                <div
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="'tc' + bi"
                  class="ppt-content-point"
                >
                  <div class="ppt-content-point-header">
                    <span class="ppt-content-point-icon">
                      <svg
                        v-if="bi % 4 === 0"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      <svg
                        v-else-if="bi % 4 === 1"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <svg
                        v-else-if="bi % 4 === 2"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      <svg
                        v-else
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <PptMarkdownInline
                      class="ppt-content-point-title"
                      :text="contentPointTitle(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                  <PptMarkdownInline
                    v-if="hasContentPointBody(item)"
                    class="ppt-content-point-body"
                    :text="parseContentBody(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </div>
              </div>
              <!-- 右栏：图表 + 表格（可同时存在） -->
              <div class="ppt-content-right">
                <div v-if="slide.chart" class="ppt-content-chart-wrap">
                  <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                  <div v-if="slide.chart.note" class="ppt-chart-note">
                    {{ slide.chart.note }}
                  </div>
                  <PptChartSourceLine
                    :chart="slide.chart"
                    :page-references="slide.page_references"
                  />
                  <!-- 折线图 line -->
                  <div v-if="slide.chart.type === 'line'" class="ppt-line-chart-wrap">
                    <!-- 图例 -->
                    <div v-if="lineChartLegendItems.length" class="ppt-line-legend">
                      <span
                        v-for="(sn, si) in lineChartLegendItems"
                        :key="'sleg' + si"
                        class="ppt-line-legend-item"
                      >
                        <span
                          class="ppt-line-legend-dot"
                          :style="{ background: getSeriesColor(si) }"
                        ></span>
                        {{ sn }}
                      </span>
                    </div>
                    <svg
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        :x="LINE_CHART_Y_AXIS_LABEL_X"
                        :y="LINE_CHART_Y_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getLineYTicks()" :key="'lyt1' + ti">
                        <text
                          x="48"
                          :y="mapLineY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
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
                        <template
                          v-for="(s, si) in lineChartSeriesList"
                          :key="'cml' + si"
                        >
                          <polyline
                            :points="lineSeriesPoints(si)"
                            class="ppt-polyline"
                            fill="none"
                            :style="chartStrokeStyle(si)"
                          />
                        </template>
                        <template
                          v-for="(cat, ci) in lineChartCategories"
                          :key="'clx' + ci"
                        >
                          <text
                            :x="lineCategoryLabelX(ci)"
                            :y="
                              shouldRotateLabels
                                ? LINE_CHART_X_CAT_Y_ROTATED
                                : LINE_CHART_X_CAT_Y
                            "
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
                        <template
                          v-for="(s, si) in lineChartSeriesList"
                          :key="'cld' + si"
                        >
                          <circle
                            v-for="(cat, ci) in lineChartCategories"
                            :key="'cld' + si + '-' + ci"
                            :cx="lineCategoryLabelX(ci)"
                            :cy="mapLineY(lineSeriesValue(ci, si))"
                            r="4"
                            class="ppt-line-dot"
                            :style="chartFillStyle(si)"
                          />
                        </template>
                      </template>
                      <template v-else>
                      <!-- 主线 -->
                      <polyline
                        :points="linePoints"
                        class="ppt-polyline"
                        fill="none"
                        :style="chartStrokeStyle(0)"
                      />
                      <!-- 副线 (secondary) -->
                      <polyline
                        v-if="multiLinePoints.secondary"
                        :points="multiLinePoints.secondary"
                        class="ppt-polyline ppt-line-secondary"
                        fill="none"
                        :style="chartStrokeStyle(1)"
                      />
                      <!-- 第三条线 (tertiary) -->
                      <polyline
                        v-if="multiLinePoints.tertiary"
                        :points="multiLinePoints.tertiary"
                        class="ppt-polyline ppt-line-tertiary"
                        fill="none"
                        :style="chartStrokeStyle(2)"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'cl' + di">
                        <circle
                          :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                          :cy="mapLineY(d.value)"
                          r="4"
                          class="ppt-line-dot"
                          :style="chartFillStyle(0)"
                        />
                        <text
                          :x="55 + di * (400 / (slide.chart.data.length - 1))"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${
                                  55 + di * (400 / (slide.chart.data.length - 1))
                                }, ${LINE_CHART_X_CAT_Y_ROTATED})`
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
                  <!-- 普通/分组柱状图 bar -->
                  <template v-else-if="slide.chart.type === 'bar'">
                    <!-- 分组柱状图（带 categories + values） -->
                    <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                      <div
                        class="ppt-grouped-bar-legend"
                        v-if="groupedBarSeriesList.length"
                      >
                        <span
                          v-for="(s, si) in groupedBarSeriesList"
                          :key="'gbl' + si"
                          class="ppt-grouped-bar-legend-item"
                        >
                          <span
                            class="ppt-pie-dot"
                            :style="{ background: getSeriesColor(si) }"
                          ></span>
                          {{ groupedBarSeriesLabel(s) }}
                        </span>
                      </div>
                      <svg
                        class="ppt-chart-svg"
                        viewBox="0 0 500 260"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="10"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 10, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="260"
                          y="252"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度数值 (分组柱状图) -->
                        <template v-for="(tick, ti) in getBarYTicks()" :key="'gyt' + ti">
                          <text
                            x="48"
                            :y="mapBarY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
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
                        <template
                          v-for="(cat, ci) in groupedBarCategories"
                          :key="'gb-cat-' + ci"
                        >
                          <template
                            v-for="(s, si) in groupedBarSeriesList"
                            :key="'gb-bar-' + ci + '-' + si"
                          >
                            <rect
                              :x="groupedBarRectX(ci, si)"
                              :y="
                                Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)
                              "
                              :width="groupedBarRectWidth()"
                              :height="
                                Math.max(
                                  1,
                                  Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                                )
                              "
                              :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                              :class="[
                                'ppt-bar-rect',
                                groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                              ]"
                              rx="2"
                            />
                          </template>
                          <text
                            :x="groupedBarCategoryLabelX(ci)"
                            :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    groupedBarCategoryLabelX(ci),
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
                    <!-- 普通单系列柱状图 -->
                    <svg
                      v-else
                      class="ppt-chart-svg"
                      viewBox="0 0 500 260"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        y="252"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度数值 -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'yt' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
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
                      <!-- 零线 -->
                      <line
                        v-if="barChartYRange.min < 0"
                        x1="52"
                        :y1="barZeroY"
                        x2="460"
                        :y2="barZeroY"
                        stroke="var(--ppt-chart-zero-line)"
                        stroke-width="1"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'cb' + di">
                        <rect
                          :x="55 + di * (400 / slide.chart.data.length)"
                          :y="Math.min(mapBarY(d.value), barZeroY)"
                          :width="(400 / slide.chart.data.length) * 0.65"
                          :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                          :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                          rx="3"
                        />
                        <!-- 柱子上方/下方显示数值 -->
                        <text
                          :x="
                            55 +
                            di * (400 / slide.chart.data.length) +
                            (400 / slide.chart.data.length) * 0.325
                          "
                          :y="
                            d.value >= 0
                              ? mapBarY(d.value) - 5
                              : mapBarY(d.value) +
                                Math.abs(mapBarY(d.value) - barZeroY) +
                                12
                          "
                          class="ppt-chart-label"
                          text-anchor="middle"
                          fill="var(--ppt-chart-value)"
                        >
                          {{ formatTickValue(d.value) }}
                        </text>
                        <text
                          :x="
                            55 +
                            di * (400 / slide.chart.data.length) +
                            (400 / slide.chart.data.length) * 0.3
                          "
                          :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 +
                                    di * (400 / slide.chart.data.length) +
                                    (400 / slide.chart.data.length) * 0.3,
                                  BAR_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ d.label }}
                        </text>
                      </template>
                    </svg>
                  </template>
                  <!-- 面积图 area -->
                  <svg
                    v-else-if="slide.chart.type === 'area'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      :x="LINE_CHART_Y_AXIS_LABEL_X"
                      :y="LINE_CHART_Y_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="265"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getLineYTicks()" :key="'ayt1' + ti">
                      <text
                        x="48"
                        :y="mapLineY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <polygon :points="areaFillPoints" class="ppt-area-fill" />
                    <polyline
                      :points="linePoints"
                      class="ppt-polyline"
                      fill="none"
                      :style="chartStrokeStyle(0)"
                    />
                    <template v-for="(d, di) in slide.chart.data" :key="'ca' + di">
                      <circle
                        :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                        :cy="mapLineY(d.value)"
                        r="4"
                        class="ppt-line-dot"
                        :style="chartFillStyle(0)"
                      />
                      <text
                        :x="55 + di * (400 / (slide.chart.data.length - 1))"
                        :y="
                          shouldRotateLabels
                            ? LINE_CHART_X_CAT_Y_ROTATED
                            : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? `rotate(-45, ${
                                55 + di * (400 / (slide.chart.data.length - 1))
                              }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ d.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 组合图 combo -->
                  <svg
                    v-else-if="slide.chart.type === 'combo'"
                    class="ppt-chart-svg"
                    viewBox="0 0 520 240"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="120"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 120)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.secondary_y_label"
                      x="510"
                      y="120"
                      class="ppt-axis-label ppt-axis-label-secondary"
                      text-anchor="middle"
                      transform="rotate(90, 510, 120)"
                    >
                      {{ slide.chart.secondary_y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="275"
                      :y="COMBO_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度（主轴） -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'coyt1' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <!-- 零线 -->
                    <line
                      v-if="barChartYRange.min < 0"
                      x1="52"
                      :y1="barZeroY"
                      x2="460"
                      :y2="barZeroY"
                      stroke="var(--ppt-chart-zero-line)"
                      stroke-width="1"
                    />
                    <template v-for="(pt, pi) in comboPrimaryPoints" :key="'ccp' + pi">
                      <rect
                        :x="pt.x"
                        :y="pt.y"
                        :width="pt.w"
                        :height="pt.h"
                        :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                        rx="2"
                      />
                      <!-- 柱子上方/下方显示数值 -->
                      <text
                        :x="pt.x + pt.w / 2"
                        :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        fill="var(--ppt-chart-value)"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(pt.value) }}
                      </text>
                      <text
                        :x="pt.x + pt.w / 2"
                        :y="
                          shouldRotateLabels
                            ? LINE_CHART_X_CAT_Y_ROTATED
                            : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ pt.label }}
                      </text>
                    </template>
                    <polyline
                      :points="comboSecondaryLinePoints"
                      class="ppt-polyline ppt-line-secondary"
                      fill="none"
                    />
                    <template v-for="(dot, di) in comboSecondaryDots" :key="'ccd' + di">
                      <circle
                        :cx="dot.cx"
                        :cy="dot.cy"
                        r="4"
                        class="ppt-line-dot ppt-dot-secondary"
                      />
                    </template>
                  </svg>
                  <!-- 堆叠柱状图 stacked_bar -->
                  <div
                    v-else-if="slide.chart.type === 'stacked_bar'"
                    class="ppt-stacked-chart"
                  >
                    <div
                      v-if="slide.chart.x_label || slide.chart.y_label"
                      class="ppt-axis-labels-row"
                    >
                      <span v-if="slide.chart.y_label" class="ppt-axis-label-text"
                        >Y: {{ slide.chart.y_label }}</span
                      >
                      <span v-if="slide.chart.x_label" class="ppt-axis-label-text"
                        >X: {{ slide.chart.x_label }}</span
                      >
                    </div>
                    <div
                      class="ppt-stacked-legend"
                      v-if="getStackedBarCategoryLabels(slide.chart).length"
                    >
                      <span
                        v-for="(cat, ci) in getStackedBarCategoryLabels(slide.chart)"
                        :key="'csc' + ci"
                        class="ppt-stacked-legend-item"
                      >
                        <span
                          class="ppt-pie-dot"
                          :style="{ background: getSeriesColor(ci) }"
                        ></span
                        >{{ cat }}
                      </span>
                    </div>
                    <div
                      v-for="(d, di) in slide.chart.data"
                      :key="'csb' + di"
                      class="ppt-stacked-row"
                    >
                      <span class="ppt-stacked-label">{{ d.label }}</span>
                      <div class="ppt-stacked-bar-track">
                        <div
                          v-for="(v, vi) in getStackedBarRowValues(d)"
                          :key="'csv' + vi"
                          class="ppt-stacked-segment"
                          :style="{
                            width: (v / stackedBarMax) * 100 + '%',
                            background: getSeriesColor(vi),
                          }"
                          :title="stackedBarSegmentTitle(slide.chart, vi, v)"
                        >
                          <span v-if="v > 5" class="ppt-stacked-seg-text">{{
                            formatStackedBarSegmentLabel(slide.chart, v)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 水平柱状图 horizontal_bar -->
                  <svg
                    v-else-if="slide.chart.type === 'horizontal_bar'"
                    class="ppt-chart-svg ppt-chart-svg-hbar"
                    :viewBox="`0 0 ${HBAR_LAYOUT.viewW} ${horizontalBarViewBoxHeight(
                      slide.chart.data.length,
                      HBAR_LAYOUT.rowH
                    )}`"
                    preserveAspectRatio="xMinYMid meet"
                  >
                    <text
                      v-if="slide.chart.x_label"
                      :x="HBAR_LAYOUT.viewW / 2"
                      :y="
                        horizontalBarViewBoxHeight(
                          slide.chart.data.length,
                          HBAR_LAYOUT.rowH
                        ) - 4
                      "
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <template v-for="(d, di) in slide.chart.data" :key="'cc' + di">
                      <text
                        :x="HBAR_LAYOUT.labelX"
                        :y="12 + di * HBAR_LAYOUT.rowH + 10"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ d.label }}
                      </text>
                      <rect
                        :x="HBAR_LAYOUT.barX"
                        :y="12 + di * HBAR_LAYOUT.rowH"
                        :width="
                          horizontalBarWidthPx(
                            d.value,
                            maxChartValue,
                            HBAR_LAYOUT.barMaxW,
                            slide.chart
                          )
                        "
                        height="18"
                        :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                        rx="3"
                      />
                      <text
                        :x="
                          horizontalBarValueTextX(
                            HBAR_LAYOUT.barX,
                            horizontalBarWidthPx(
                              d.value,
                              maxChartValue,
                              HBAR_LAYOUT.barMaxW,
                              slide.chart
                            ),
                            HBAR_LAYOUT.valueGap
                          )
                        "
                        :y="12 + di * HBAR_LAYOUT.rowH + 13"
                        class="ppt-chart-value-label"
                      >
                        {{ formatChartDataValue(d.value) }}
                      </text>
                    </template>
                  </svg>
                  <!-- 饼图 pie -->
                  <svg
                    v-else-if="slide.chart.type === 'pie'"
                    class="ppt-chart-svg ppt-pie-svg"
                    :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-for="(sl, si) in pieSlices" :key="'cp' + si">
                      <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                      <line
                        :x1="sl.leaderX1"
                        :y1="sl.leaderY1"
                        :x2="sl.lx"
                        :y2="sl.ly"
                        class="ppt-pie-leader"
                      />
                      <text
                        :x="sl.tx"
                        :y="sl.ty"
                        :text-anchor="sl.anchor"
                        class="ppt-pie-label"
                        dominant-baseline="middle"
                      >
                        {{ sl.percent }}%
                      </text>
                    </template>
                    <!-- 图例 -->
                    <template v-for="(sl, si) in pieSlices" :key="'cpl' + si">
                      <rect
                        :x="PIE_CHART_LAYOUT.legendX"
                        :y="10 + si * 20"
                        width="10"
                        height="10"
                        :fill="sl.color"
                        rx="2"
                      />
                      <text
                        :x="PIE_CHART_LAYOUT.legendTextX"
                        :y="10 + si * 20 + 9"
                        class="ppt-pie-legend-text"
                      >
                        {{ sl.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 雷达图 radar（支持新旧两种格式） -->
                  <div
                    v-else-if="slide.chart.type === 'radar'"
                    class="ppt-radar-chart-wrap"
                  >
                    <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                      <span
                        v-for="s in radarSeriesNorm"
                        :key="s.name"
                        class="ppt-radar-legend-item"
                      >
                        <span
                          class="ppt-radar-legend-dot"
                          :style="{ background: s.color }"
                        ></span>
                        {{ s.name }}
                      </span>
                    </div>
                    <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                      <polygon
                        v-for="(ring, ri) in radarGridPolygons"
                        :key="'crg' + ri"
                        :points="ring.points"
                        class="ppt-radar-grid"
                      />
                      <line
                        v-for="(ax, ai) in radarAxes"
                        :key="'cra' + ai"
                        :x1="120"
                        :y1="90"
                        :x2="ax.x"
                        :y2="ax.y"
                        class="ppt-radar-axis"
                      />
                      <text
                        v-for="(ring, ri) in radarGridPolygons"
                        :key="'crv' + ri"
                        x="124"
                        :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                        class="ppt-radar-tick"
                      >
                        {{ ring.value }}
                      </text>
                      <g v-for="(series, si) in radarSeriesShapes" :key="'crs' + si">
                        <polygon
                          :points="series.points"
                          class="ppt-radar-series-fill"
                          :style="{ fill: series.color, stroke: series.color }"
                        />
                        <circle
                          v-for="(dot, di) in series.dots"
                          :key="'crd' + si + '-' + di"
                          :cx="dot.x"
                          :cy="dot.y"
                          r="3"
                          :style="{ fill: series.color }"
                        />
                      </g>
                      <text
                        v-for="(ax, ai) in radarAxes"
                        :key="'crl' + ai"
                        :x="ax.tx"
                        :y="ax.ty"
                        :text-anchor="ax.anchor"
                        class="ppt-radar-axis-label"
                        dominant-baseline="middle"
                      >
                        {{ ax.label }}
                      </text>
                    </svg>
                  </div>
                  <!-- 漏斗图 funnel -->
                  <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                    <div
                      v-for="(d, di) in slide.chart.data"
                      :key="'cf' + di"
                      class="ppt-funnel-row"
                    >
                      <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                      <div class="ppt-funnel-bar-wrap">
                        <div
                          class="ppt-funnel-bar"
                          :style="{
                            width: funnelBarWidthPercent(
                              d.value,
                              maxChartValue,
                              slide.chart
                            ),
                            background: getSeriesColor(di),
                          }"
                        >
                          <span class="ppt-funnel-value">{{
                            formatChartDataValue(d.value)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 瀑布图 waterfall -->
                  <svg
                    v-else-if="slide.chart.type === 'waterfall'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="120"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 120)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="265"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template
                      v-for="(tick, ti) in getWaterfallYTicks()"
                      :key="'wfyt1' + ti"
                    >
                      <text
                        x="48"
                        :y="mapWaterfallY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                      <line
                        x1="52"
                        :y1="mapWaterfallY(tick)"
                        x2="460"
                        :y2="mapWaterfallY(tick)"
                        stroke="var(--ppt-chart-grid)"
                        stroke-width="0.5"
                      />
                    </template>
                    <template v-for="(bar, bi) in waterfallBars" :key="'cwf' + bi">
                      <rect
                        :x="55 + bi * (400 / waterfallBars.length) + 4"
                        :y="bar.y"
                        :width="400 / waterfallBars.length - 8"
                        :height="Math.max(2, bar.h)"
                        :class="[
                          'ppt-bar-rect',
                          bar.isTotal
                            ? 'ppt-bar-total'
                            : bar.isNegative
                            ? 'ppt-bar-negative'
                            : '',
                        ]"
                        rx="3"
                        opacity="0.88"
                      />
                      <text
                        :x="
                          55 +
                          bi * (400 / waterfallBars.length) +
                          400 / waterfallBars.length / 2
                        "
                        :y="bar.y - 5"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ bar.value }}
                      </text>
                      <text
                        :x="
                          55 +
                          bi * (400 / waterfallBars.length) +
                          400 / waterfallBars.length / 2
                        "
                        :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                55 +
                                  bi * (400 / waterfallBars.length) +
                                  400 / waterfallBars.length / 2,
                                LINE_CHART_X_CAT_Y_ROTATED
                              )
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ bar.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 散点图 scatter -->
                  <svg
                    v-else-if="slide.chart.type === 'scatter'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <!-- Y 轴标签 -->
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <!-- X 轴标签 -->
                    <text
                      v-if="slide.chart.x_label"
                      x="255"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y 轴网格线 + 刻度 -->
                    <template v-for="(tick, ti) in getScatterYTicks()" :key="'csy' + ti">
                      <line
                        :x1="55"
                        :y1="mapScatterY(tick)"
                        :x2="455"
                        :y2="mapScatterY(tick)"
                        stroke="rgba(255,255,255,0.1)"
                        stroke-width="1"
                      />
                      <text
                        :x="50"
                        :y="mapScatterY(tick) + 3"
                        class="ppt-chart-label"
                        text-anchor="end"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                    </template>
                    <!-- X 轴网格线 + 刻度 -->
                    <template v-for="(tick, ti) in getScatterXTicks()" :key="'csx' + ti">
                      <line
                        :x1="mapScatterX(tick)"
                        :y1="25"
                        :x2="mapScatterX(tick)"
                        :y2="195"
                        stroke="rgba(255,255,255,0.1)"
                        stroke-width="1"
                      />
                      <text
                        :x="mapScatterX(tick)"
                        :y="LINE_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                    </template>
                    <!-- 数据点 -->
                    <template v-for="(pt, pi) in scatterPoints" :key="'csp' + pi">
                      <circle
                        :cx="pt.svgX"
                        :cy="pt.svgY"
                        r="5"
                        :fill="pt.color"
                        fill-opacity="0.8"
                        stroke="#fff"
                        stroke-width="0.5"
                      />
                      <text
                        :x="pt.svgX"
                        :y="pt.svgY - 8"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 8px"
                      >
                        {{ pt.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 热力图 heatmap -->
                  <svg
                    v-else-if="slide.chart.type === 'heatmap'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="8"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 8, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- 列标签 -->
                    <text
                      v-for="(col, ci) in heatmapParsed?.cols || []"
                      :key="'chc' + ci"
                      :x="
                        60 +
                        ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                        400 / (heatmapParsed?.cols?.length || 1) / 2
                      "
                      y="20"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ col }}
                    </text>
                    <!-- 行标签 -->
                    <text
                      v-for="(row, ri) in heatmapParsed?.rows || []"
                      :key="'chr' + ri"
                      x="56"
                      :y="
                        25 +
                        ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                        175 / (heatmapParsed?.rows?.length || 1) / 2 +
                        3
                      "
                      class="ppt-chart-label"
                      text-anchor="end"
                      style="font-size: 9px"
                    >
                      {{ row }}
                    </text>
                    <!-- 色块 + 数值 -->
                    <template v-for="(cell, ci) in heatmapCells" :key="'chv' + ci">
                      <rect
                        :x="cell.svgX + 1"
                        :y="cell.svgY + 1"
                        :width="Math.max(cell.width - 2, 1)"
                        :height="Math.max(cell.height - 2, 1)"
                        :fill="cell.color"
                        rx="2"
                        opacity="0.85"
                      />
                      <text
                        :x="cell.svgX + cell.width / 2"
                        :y="cell.svgY + cell.height / 2 + 3"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px; fill: #fff; font-weight: 600"
                      >
                        {{ cell.value }}
                      </text>
                    </template>
                  </svg>
                  <!-- 树形图 treemap -->
                  <svg
                    v-else-if="slide.chart.type === 'treemap'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-for="(rect, ri) in treemapRects" :key="'ctr' + ri">
                      <rect
                        :x="rect.x + 1"
                        :y="rect.y + 1"
                        :width="Math.max(rect.width - 2, 1)"
                        :height="Math.max(rect.height - 2, 1)"
                        :fill="rect.color"
                        rx="3"
                        opacity="0.88"
                      />
                      <text
                        v-if="rect.width > 30 && rect.height > 20"
                        :x="rect.x + rect.width / 2"
                        :y="rect.y + rect.height / 2 - 4"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 10px; fill: #fff; font-weight: 600"
                      >
                        {{ rect.label }}
                      </text>
                      <text
                        v-if="rect.width > 30 && rect.height > 30"
                        :x="rect.x + rect.width / 2"
                        :y="rect.y + rect.height / 2 + 10"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                      >
                        {{ rect.value }} ({{ rect.percent }}%)
                      </text>
                    </template>
                  </svg>
                  <!-- 时间线 timeline -->
                  <div
                    v-else-if="isTimelineChart(slide.chart)"
                    class="ppt-timeline-chart"
                  >
                    <div
                      v-if="
                        slide.chart.x_label ||
                        slide.chart.xLabel ||
                        slide.chart.y_label ||
                        slide.chart.yLabel
                      "
                      class="ppt-timeline-axis-hint"
                    >
                      <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                        slide.chart.x_label || slide.chart.xLabel
                      }}</span>
                      <template
                        v-if="
                          (slide.chart.x_label || slide.chart.xLabel) &&
                          (slide.chart.y_label || slide.chart.yLabel)
                        "
                      >
                        ·
                      </template>
                      <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                        slide.chart.y_label || slide.chart.yLabel
                      }}</span>
                    </div>
                    <div
                      v-for="(d, di) in slide.chart.data || []"
                      :key="'tl-m-' + di"
                      class="ppt-timeline-item"
                    >
                      <div class="ppt-timeline-track">
                        <div
                          class="ppt-timeline-dot"
                          :style="{ background: getSeriesColor(di) }"
                        ></div>
                        <div
                          v-if="di < (slide.chart.data?.length || 0) - 1"
                          class="ppt-timeline-line"
                        ></div>
                      </div>
                      <div class="ppt-timeline-body">
                        <div
                          v-if="d.value != null && String(d.value) !== ''"
                          class="ppt-timeline-step"
                        >
                          {{ d.value }}
                        </div>
                        <div class="ppt-timeline-date">{{ d.label }}</div>
                        <div class="ppt-timeline-desc">
                          {{ d.description || d.desc || d.text || d.title || "" }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 仪表盘图 gauge -->
                  <svg
                    v-else-if="slide.chart.type === 'gauge'"
                    class="ppt-chart-svg ppt-gauge-svg"
                    viewBox="0 0 260 160"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-if="gaugeData">
                      <!-- 背景弧 -->
                      <path
                        :d="gaugeArcPath(1)"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        stroke-width="16"
                        stroke-linecap="round"
                      />
                      <!-- 数值弧 -->
                      <path
                        :d="gaugeArcPath(gaugeData.ratio)"
                        fill="none"
                        :stroke="gaugeData.color"
                        stroke-width="16"
                        stroke-linecap="round"
                      />
                      <!-- 刻度 -->
                      <template
                        v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                        :key="'cgt' + ti"
                      >
                        <line
                          :x1="tick.x1"
                          :y1="tick.y1"
                          :x2="tick.x2"
                          :y2="tick.y2"
                          stroke="rgba(255,255,255,0.3)"
                          stroke-width="1"
                        />
                        <text
                          :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                          :y="tick.y2 + 3"
                          class="ppt-chart-label"
                          :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                          style="font-size: 8px"
                        >
                          {{ tick.label }}
                        </text>
                      </template>
                      <!-- 中心数值 -->
                      <text
                        x="130"
                        y="115"
                        text-anchor="middle"
                        class="ppt-gauge-value"
                        :fill="gaugeData.color"
                      >
                        {{ gaugeData.value }}{{ gaugeData.unit }}
                      </text>
                      <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                        {{ gaugeData.label }}
                      </text>
                      <!-- 目标线 -->
                      <template v-if="gaugeData.target !== undefined">
                        <line
                          :x1="
                            130 +
                            95 *
                              Math.cos(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :y1="
                            130 +
                            95 *
                              Math.sin(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :x2="
                            130 +
                            108 *
                              Math.cos(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :y2="
                            130 +
                            108 *
                              Math.sin(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          stroke="#fff"
                          stroke-width="2"
                        />
                      </template>
                    </template>
                  </svg>
                </div>
                <PptTableBlock
                  v-if="slide.table"
                  :table="slide.table"
                  :page-references="slide.page_references"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>
            </div>
            <!-- /ppt-content-split (有图表的左右分栏) -->

            <!-- ════ 小卡网格 + 要点并列（无 emphasis_layout、无 table/chart） ════ -->
            <div
              v-else-if="shouldShowMetricCardsCompactGrid(slide) && shouldShowContentBullets(slide)"
              class="ppt-content-split ppt-metric-content-split"
            >
              <div class="ppt-content-left ppt-metric-cards-side">
                <PptMetricCardsRow
                  :cards="slide.metric_cards ?? []"
                  column
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>
              <div class="ppt-content-right">
                <div
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="'mcsb' + bi"
                  class="ppt-content-point"
                  :style="contentPointStyle(bi)"
                >
                  <div class="ppt-content-point-header">
                    <span class="ppt-content-point-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    </span>
                    <PptMarkdownInline
                      class="ppt-content-point-title"
                      :text="contentPointTitle(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                  <PptMarkdownInline
                    v-if="hasContentPointBody(item)"
                    class="ppt-content-point-body"
                    :text="parseContentBody(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </div>
              </div>
            </div>

            <!-- ════ 仅小卡网格（无要点） ════ -->
            <div
              v-else-if="shouldShowMetricCardsCompactGrid(slide)"
              class="ppt-metric-cards-fullpage"
              :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
            >
              <PptMetricCardsRow
                :cards="slide.metric_cards ?? []"
                :fill="shouldFillMetricCards(slide)"
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>

            <!-- ════ 单张 KPI 卡 ════ -->
            <div
              v-else-if="shouldShowMetricCardInline(slide)"
              class="ppt-body-inline-metric"
              :class="{
                'ppt-metric-cards-fullpage ppt-metric-cards-fullpage--active':
                  shouldFillMetricCards(slide),
              }"
            >
              <PptMetricCardsRow
                :cards="slide.metric_cards ?? []"
                :inline="!shouldFillMetricCards(slide)"
                :fill="shouldFillMetricCards(slide)"
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />
              <ul
                v-if="shouldShowContentBullets(slide)"
                class="ppt-bullet-list ppt-data-notes"
              >
                <li
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="'inline-b' + bi"
                  class="ppt-bullet-item"
                >
                  <span class="ppt-bullet-dot"></span>
                  <PptMarkdownInline
                    :text="displayText(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </li>
              </ul>
            </div>

            <!-- ════ metric_cards_row 主网格 + 下方要点 ════ -->
            <div
              v-else-if="
                shouldShowMetricCardsPrimaryGrid(slide) &&
                (shouldShowContentBullets(slide) ||
                  (shouldShowChapterSideImage(slide) && currentChapterImages.length))
              "
              class="ppt-data-metric-with-image"
              :class="{
                'ppt-data-metric-with-image--has-image':
                  shouldShowChapterSideImage(slide) && currentChapterImages.length,
              }"
            >
              <ul
                v-if="shouldShowContentBullets(slide)"
                class="ppt-bullet-list ppt-data-notes"
              >
                <li
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="'pmc-b' + bi"
                  class="ppt-bullet-item"
                >
                  <span class="ppt-bullet-dot"></span>
                  <PptMarkdownInline
                    :text="displayText(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </li>
              </ul>
              <PptChapterImages
                v-if="shouldShowChapterSideImage(slide) && currentChapterImages.length"
                variant="sidebar"
                :images="currentChapterImages"
                :alt-fallback="slide.title"
              />
            </div>

            <!-- ════ 左要点 + 右叙事卡（无图表） ════ -->
            <div
              v-else-if="isContentWithRightItemsSlide(slide)"
              class="ppt-content-split ppt-content-items-split"
            >
              <div class="ppt-content-left">
                <div
                  v-for="(item, bi) in getContentItems(slide.content)"
                  :key="'cri' + bi"
                  class="ppt-content-point"
                >
                  <div class="ppt-content-point-header">
                    <span class="ppt-content-point-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </span>
                    <PptMarkdownInline
                      class="ppt-content-point-title"
                      :text="contentPointTitle(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                  <PptMarkdownInline
                    v-if="hasContentPointBody(item)"
                    class="ppt-content-point-body"
                    :text="parseContentBody(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </div>
              </div>
              <div class="ppt-content-right ppt-hero-right-items">
                <div
                  v-for="(ri, idx) in slide.right_items"
                  :key="'cri-ri-' + idx"
                  class="ppt-hero-right-card"
                  :style="heroRightCardStyle(ri, idx)"
                >
                  <div class="ppt-hero-right-card-head">
                    <span
                      class="ppt-hero-right-card-index"
                      :style="{ color: rightItemAccentColor(ri, idx) }"
                      :contenteditable="isEditing"
                      @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                      >{{ formatRightItemIndex(ri, idx) }}</span
                    >
                    <PptMarkdownInline
                      class="ppt-hero-right-card-title"
                      :text="rightItemTitle(ri)"
                      :editable="isEditing"
                      @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                    />
                  </div>
                  <PptMarkdownInline
                    v-if="rightItemDescription(ri) || isEditing"
                    class="ppt-hero-right-card-desc"
                    :text="rightItemDescription(ri)"
                    :editable="isEditing"
                    @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                  />
                </div>
              </div>
            </div>

            <!-- ════ 无图表时：全宽卡片网格（可选章节侧边配图） ════ -->
            <div
              v-else
              class="ppt-content-with-side-image"
              :class="{
                'ppt-content-with-side-image--has-image':
                  shouldShowChapterSideImage(slide) && currentChapterImages.length,
              }"
            >
              <div
                class="ppt-topic-grid"
                :class="{
                  'ppt-topic-grid--stack': resolveSlideBulletItems(slide).length <= 3,
                  'ppt-topic-grid--fill': resolveSlideBulletItems(slide).length >= 2,
                }"
                :style="topicGridFillStyle(slide)"
              >
                <div
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="'tc' + bi"
                  class="ppt-topic-card"
                >
                  <div class="ppt-topic-card-header">
                    <span class="ppt-topic-card-icon">
                      <svg
                        v-if="bi % 4 === 0"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      <svg
                        v-else-if="bi % 4 === 1"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <svg
                        v-else-if="bi % 4 === 2"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      <svg
                        v-else
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <PptMarkdownInline
                      class="ppt-topic-card-title"
                      :text="contentPointTitle(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                  <PptMarkdownInline
                    v-if="hasContentPointBody(item)"
                    class="ppt-topic-card-body"
                    :text="contentPointBody(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </div>
              </div>
              <PptChapterImages
                v-if="shouldShowChapterSideImage(slide) && currentChapterImages.length"
                variant="sidebar"
                :images="currentChapterImages"
                :alt-fallback="slide.title"
              />
            </div>

            <div v-if="(slide.sources || []).length > 0" class="ppt-sources">
              <span class="ppt-sources-label">{{ t("agent.pptSources") }}</span>
              <a
                v-for="(src, si) in slide.sources"
                :key="si"
                :href="src.url || src"
                target="_blank"
                rel="noopener noreferrer"
                class="ppt-source-link"
                >{{ src.title || src }}</a
              >
            </div>
            <!-- 底部总结栏 -->
            <div v-if="getSummaryItem(slide.content)" class="ppt-content-summary">
              <span class="ppt-summary-label">
                <PptMarkdownInline
                  :text="
                    parseContentHeading(getSummaryItem(slide.content) || '') ||
                    t('agent.pptSummary')
                  "
                />：
              </span>
              <PptMarkdownInline
                class="ppt-content-summary-body"
                :text="parseContentBody(getSummaryItem(slide.content) || '')"
                :editable="isEditing"
                @blur="onSummaryContentBlur"
              />
            </div>

            <!-- 页底数据来源 -->
            <PptMarkdownInline
              v-if="slide.data_source_line || isEditing"
              class="ppt-data-source-line ppt-content-footer-source"
              :text="slide.data_source_line || ''"
              :page-references="slide.page_references"
              :editable="isEditing"
              @blur="onDataSourceLineBlur($event, currentSlide)"
              @ref-click="onPptTableRefClick($event, slide)"
            />
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- two_column 双栏对比 -->
          <div
            v-else-if="slide.layout === 'two_column'"
            class="ppt-slide ppt-two-col"
            :class="{
              'ppt-chapter-image-page': isChapterImagePage(slide),
              'ppt-document-figure-page': hasDocumentFigurePage(slide),
            }"
            :style="twoColumnSlideBackgroundStyle"
          >
            <div v-if="twoColumnBackdropUrl" class="ppt-slide-bg-overlay"></div>
            <div
              v-if="isChapterImagePage(slide) && !twoColumnBackdropUrl"
              class="ppt-cover-skyline ppt-scenic-skyline"
              v-html="chapterImagePageDecorationSvg"
            />
            <h2 class="ppt-slide-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>
            <div
              v-if="slide.subtitle"
              class="ppt-chart-subtitle ppt-chapter-image-page-sub"
            >
              <PptMarkdownInline
                :text="slide.subtitle || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
              />
            </div>
            <div
              class="ppt-two-col-body"
              :class="{
                'ppt-chapter-image-page-body': isChapterImagePage(slide),
                'ppt-document-figure-page-body': hasDocumentFigurePage(slide),
              }"
              :style="documentFigureColumnStyle(slide)"
            >
              <template v-if="hasDocumentFigurePage(slide)">
                <div class="ppt-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                  >
                    {{ slide.left_title || t("agent.pptLeftColumn") }}
                  </div>
                  <ul v-if="documentFigureLeftItems(slide).length" class="ppt-bullet-list">
                    <li
                      v-for="(item, li) in documentFigureLeftItems(slide)"
                      :key="'doc-l' + li"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="onDocumentFigureLeftItemBlur($event, li)"
                      />
                    </li>
                  </ul>
                </div>
                <div class="ppt-col ppt-document-figure-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                  >
                    {{ slide.right_title || t("agent.pptDocumentSourceImage") }}
                  </div>
                  <figure v-if="documentFigure?.url" class="ppt-document-figure">
                    <img
                      :src="documentFigure.url"
                      class="ppt-document-figure-img"
                      :style="documentFigureImgStyle(documentFigure)"
                      :alt="documentFigure.caption || documentFigure.page_label || slide.title || ''"
                      loading="lazy"
                      crossorigin="anonymous"
                    />
                    <figcaption
                      v-if="documentFigure.caption || isEditing"
                      class="ppt-document-figure-caption"
                      :contenteditable="isEditing"
                      @blur="onDocumentFigureCaptionBlur"
                    >
                      {{ documentFigure.caption || "" }}
                    </figcaption>
                  </figure>
                </div>
              </template>
              <template v-else-if="isChapterImagePage(slide)">
                <div class="ppt-col ppt-chapter-image-page-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                  >
                    {{ slide.left_title || t("agent.pptChapterImage") }}
                  </div>
                  <PptChapterImages
                    v-if="slideChapterImages.length"
                    variant="page"
                    :images="slideChapterImages"
                    :alt-fallback="slide.title"
                  />
                </div>
                <div class="ppt-col-divider"></div>
                <div class="ppt-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                  >
                    {{ slide.right_title || t("agent.pptRightColumn") }}
                  </div>
                  <div v-if="slide.right_items?.length" class="ppt-right-items">
                    <div
                      v-for="(ri, idx) in slide.right_items"
                      :key="'cip-ri' + idx"
                      class="ppt-right-item-card"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-right-item-header">
                        <span class="ppt-right-item-icon">
                          <svg
                            v-if="ri.icon === 'image'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <svg
                            v-else
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </span>
                        <span
                          v-if="formatRightItemIndex(ri, idx) || rightItemTitle(ri)"
                          class="ppt-right-item-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-right-item-title"
                          :text="rightItemTitle(ri)"
                          :editable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri) || isEditing"
                        class="ppt-right-item-desc"
                        :text="rightItemDescription(ri)"
                        :editable="isEditing"
                        @blur="
                          onRightItemFieldBlur($event, currentSlide, idx, 'description')
                        "
                      />
                    </div>
                  </div>
                </div>
              </template>
              <!-- 如果有 left_content/right_content/right_items 就用它们；否则按 column_split 切分 content -->
              <template
                v-else-if="slide.left_content || slide.right_content || slide.right_items"
              >
                <div class="ppt-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                  >
                    {{ slide.left_title || t("agent.pptLeftColumn") }}
                  </div>
                  <ul class="ppt-bullet-list">
                    <li
                      v-for="(item, li) in slide.left_content || []"
                      :key="li"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="onListItemBlur($event, currentSlide, 'left_content', li)"
                      />
                    </li>
                  </ul>
                </div>
                <div class="ppt-col-divider"></div>
                <div class="ppt-col">
                  <div
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                  >
                    {{ slide.right_title || t("agent.pptRightColumn") }}
                  </div>
                  <!-- 如果后端提供了 right_items（结构化卡片），优先渲染 -->
                  <div v-if="slide.right_items?.length" class="ppt-right-items">
                    <div
                      v-for="(ri, idx) in slide.right_items"
                      :key="'ri' + idx"
                      class="ppt-right-item-card"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-right-item-header">
                        <span class="ppt-right-item-icon">
                          <svg
                            v-if="ri.icon === 'star'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polygon
                              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                            />
                          </svg>
                          <svg
                            v-else-if="ri.icon === 'check'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <svg
                            v-else-if="ri.icon === 'building'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                            <line x1="9" y1="6" x2="9" y2="6.01" />
                            <line x1="15" y1="6" x2="15" y2="6.01" />
                            <line x1="9" y1="10" x2="9" y2="10.01" />
                            <line x1="15" y1="10" x2="15" y2="10.01" />
                            <line x1="9" y1="14" x2="9" y2="14.01" />
                            <line x1="15" y1="14" x2="15" y2="14.01" />
                            <line x1="9" y1="18" x2="15" y2="18" />
                          </svg>
                          <svg
                            v-else-if="ri.icon === 'chart'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                          <svg
                            v-else-if="ri.icon === 'shield'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <svg
                            v-else-if="ri.icon === 'trending_up'"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          <svg
                            v-else
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </span>
                        <span
                          v-if="formatRightItemIndex(ri, idx) || rightItemTitle(ri)"
                          class="ppt-right-item-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-right-item-title"
                          :text="rightItemTitle(ri)"
                          :editable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri) || isEditing"
                        class="ppt-right-item-desc"
                        :text="rightItemDescription(ri)"
                        :editable="isEditing"
                        @blur="
                          onRightItemFieldBlur($event, currentSlide, idx, 'description')
                        "
                      />
                    </div>
                  </div>
                  <!-- 否则回退到 right_content 文字列表 -->
                  <ul v-else class="ppt-bullet-list">
                    <li
                      v-for="(item, ri) in slide.right_content || []"
                      :key="ri"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="onListItemBlur($event, currentSlide, 'right_content', ri)"
                      />
                    </li>
                  </ul>
                </div>
              </template>
              <!-- 使用 column_split 将 content 分为左右两栏；若同时有 chart/table，对应栏改为图表/表格 -->
              <template v-else-if="slide.content?.length && resolveContentSplitIndex(slide.column_split, slide.content.length)">
                <!-- 左栏：table.position === 'left' 时展示表格，否则展示前半段文字 -->
                <div
                  class="ppt-col"
                  v-if="slide.table && slide.table.position === 'left'"
                >
                  <div v-if="slide.left_title" class="ppt-col-header">
                    {{ slide.left_title }}
                  </div>
                  <PptTableBlock
                    compact
                    :table="slide.table"
                    :page-references="slide.page_references"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
                <div class="ppt-col" v-else>
                  <div
                    v-if="slide.left_title"
                    class="ppt-col-header"
                    :contenteditable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                  >
                    {{ slide.left_title }}
                  </div>
                  <ul class="ppt-bullet-list">
                    <li
                      v-for="(item, li) in slide.content.slice(0, resolveContentSplitIndex(slide.column_split, slide.content.length)!)"
                      :key="'l' + li"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, li)"
                      />
                    </li>
                  </ul>
                </div>
                <div class="ppt-col-divider"></div>
                <!-- 右栏：有表格时显示表格，否则有图表显示图表，否则显示后半段文字 -->
                <div
                  class="ppt-col"
                  v-if="slide.table && slide.table.position !== 'left'"
                >
                  <div v-if="slide.right_title" class="ppt-col-header">
                    {{ slide.right_title }}
                  </div>
                  <PptTableBlock
                    compact
                    :table="slide.table"
                    :page-references="slide.page_references"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
                <div class="ppt-col" v-else-if="slide.chart">
                  <div v-if="slide.right_title" class="ppt-col-header">
                    {{ slide.right_title }}
                  </div>
                  <div class="ppt-col-chart-inner">
                    <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                    <PptChartSourceLine
                      compact
                      :chart="slide.chart"
                      :page-references="slide.page_references"
                    />
                    <!-- 折线图 -->
                    <svg
                      v-if="slide.chart.type === 'line'"
                      class="ppt-chart-svg"
                      viewBox="0 0 400 200"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <!-- Y轴刻度 (小尺寸) -->
                      <template v-for="(tick, ti) in getLineYTicks()" :key="'tcyt' + ti">
                        <text
                          x="28"
                          :y="
                            165 -
                            ((tick - lineChartYRange.min) / lineChartYRange.range) * 140 +
                            4
                          "
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 8px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="31"
                          :y1="
                            165 -
                            ((tick - lineChartYRange.min) / lineChartYRange.range) * 140
                          "
                          x2="380"
                          :y2="
                            165 -
                            ((tick - lineChartYRange.min) / lineChartYRange.range) * 140
                          "
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <polyline
                        :points="linePointsSmall"
                        class="ppt-polyline"
                        fill="none"
                      />
                      <!-- 副线 (secondary) -->
                      <polyline
                        v-if="multiLinePointsSmall.secondary"
                        :points="multiLinePointsSmall.secondary"
                        class="ppt-polyline ppt-line-secondary"
                        fill="none"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'tcl' + di">
                        <circle
                          :cx="35 + di * (340 / (slide.chart.data.length - 1))"
                          :cy="
                            165 -
                            ((d.value - lineChartYRange.min) / lineChartYRange.range) *
                              140
                          "
                          r="3"
                          class="ppt-line-dot"
                          :style="chartFillStyle(0)"
                        />
                        <text
                          :x="35 + di * (340 / (slide.chart.data.length - 1))"
                          :y="shouldRotateLabels ? 185 : 195"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${
                                  35 + di * (340 / (slide.chart.data.length - 1))
                                }, 185)`
                              : undefined
                          "
                          :style="
                            shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                          "
                        >
                          {{ d.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 柱状图（含分组） -->
                    <template v-else-if="slide.chart.type === 'bar'">
                      <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                        <div
                          class="ppt-grouped-bar-legend"
                          v-if="groupedBarSeriesList.length"
                        >
                          <span
                            v-for="(s, si) in groupedBarSeriesList"
                            :key="'tcgl' + si"
                            class="ppt-grouped-bar-legend-item"
                          >
                            <span
                              class="ppt-pie-dot"
                              :style="{ background: getSeriesColor(si) }"
                            ></span
                            >{{ groupedBarSeriesLabel(s) }}
                          </span>
                        </div>
                        <svg
                          class="ppt-chart-svg"
                          viewBox="0 0 400 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <!-- Y轴刻度 (小尺寸) -->
                          <template
                            v-for="(tick, ti) in getBarYTicks()"
                            :key="'tcgyt' + ti"
                          >
                            <text
                              x="26"
                              :y="mapBarYSmall(tick) + 4"
                              class="ppt-chart-label"
                              text-anchor="end"
                              style="font-size: 8px"
                            >
                              {{ formatTickValue(tick) }}
                            </text>
                            <line
                              x1="29"
                              :y1="mapBarYSmall(tick)"
                              x2="380"
                              :y2="mapBarYSmall(tick)"
                              stroke="var(--ppt-chart-grid)"
                              stroke-width="0.5"
                            />
                          </template>
                          <line
                            v-if="barChartYRange.min < 0"
                            x1="29"
                            :y1="mapBarYSmall(0)"
                            x2="380"
                            :y2="mapBarYSmall(0)"
                            stroke="var(--ppt-chart-zero-line)"
                            stroke-width="1"
                          />
                          <template
                            v-for="(cat, ci) in groupedBarCategories"
                            :key="'tcgb-cat-' + ci"
                          >
                            <template
                              v-for="(s, si) in groupedBarSeriesList"
                              :key="'tcgb-bar-' + ci + '-' + si"
                            >
                              <rect
                                :x="groupedBarRectX(ci, si, 'compact')"
                                :y="
                                  Math.min(
                                    mapBarYSmall(groupedBarValue(ci, si)),
                                    mapBarYSmall(0)
                                  )
                                "
                                :width="groupedBarRectWidth('compact')"
                                :height="
                                  Math.max(
                                    1,
                                    Math.abs(
                                      mapBarYSmall(groupedBarValue(ci, si)) -
                                        mapBarYSmall(0)
                                    )
                                  )
                                "
                                :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                                :class="[
                                  'ppt-bar-rect',
                                  groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                                ]"
                                rx="2"
                              />
                            </template>
                            <text
                              :x="groupedBarCategoryLabelX(ci, 'compact')"
                              :y="shouldRotateLabels ? 185 : 195"
                              class="ppt-chart-label"
                              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                              :transform="
                                shouldRotateLabels
                                  ? chartXCatLabelTransform(
                                      groupedBarCategoryLabelX(ci, 'compact'),
                                      185
                                    )
                                  : undefined
                              "
                              :style="
                                shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                              "
                            >
                              {{ cat }}
                            </text>
                          </template>
                        </svg>
                      </div>
                      <svg
                        v-else
                        class="ppt-chart-svg"
                        viewBox="0 0 400 200"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <!-- Y轴刻度 (小尺寸) -->
                        <template
                          v-for="(tick, ti) in getBarYTicks()"
                          :key="'tcbyt' + ti"
                        >
                          <text
                            x="26"
                            :y="mapBarYSmall(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                            style="font-size: 8px"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="29"
                            :y1="mapBarYSmall(tick)"
                            x2="380"
                            :y2="mapBarYSmall(tick)"
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <line
                          v-if="barChartYRange.min < 0"
                          x1="29"
                          :y1="mapBarYSmall(0)"
                          x2="380"
                          :y2="mapBarYSmall(0)"
                          stroke="var(--ppt-chart-zero-line)"
                          stroke-width="1"
                        />
                        <template v-for="(d, di) in slide.chart.data" :key="'tcb' + di">
                          <rect
                            :x="30 + di * (340 / slide.chart.data.length)"
                            :y="Math.min(mapBarYSmall(d.value), mapBarYSmall(0))"
                            :width="(340 / slide.chart.data.length) * 0.65"
                            :height="
                              Math.max(
                                1,
                                Math.abs(mapBarYSmall(d.value) - mapBarYSmall(0))
                              )
                            "
                            :class="[
                              'ppt-bar-rect',
                              d.value < 0 ? 'ppt-bar-negative' : '',
                            ]"
                            rx="2"
                          />
                          <!-- 柱子上方/下方显示数值 -->
                          <text
                            :x="
                              30 +
                              di * (340 / slide.chart.data.length) +
                              (340 / slide.chart.data.length) * 0.325
                            "
                            :y="
                              d.value >= 0
                                ? mapBarYSmall(d.value) - 4
                                : mapBarYSmall(d.value) +
                                  Math.abs(mapBarYSmall(d.value) - mapBarYSmall(0)) +
                                  10
                            "
                            class="ppt-chart-label"
                            text-anchor="middle"
                            fill="var(--ppt-chart-value)"
                            style="font-size: 8px"
                          >
                            {{ formatTickValue(d.value) }}
                          </text>
                          <text
                            :x="
                              30 +
                              di * (340 / slide.chart.data.length) +
                              (340 / slide.chart.data.length) * 0.3
                            "
                            :y="shouldRotateLabels ? 185 : 195"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    30 +
                                      di * (340 / slide.chart.data.length) +
                                      (340 / slide.chart.data.length) * 0.3,
                                    185
                                  )
                                : undefined
                            "
                            :style="
                              shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                            "
                          >
                            {{ d.label }}
                          </text>
                        </template>
                      </svg>
                    </template>
                    <!-- 饼图 -->
                    <svg
                      v-else-if="slide.chart.type === 'pie'"
                      class="ppt-chart-svg ppt-pie-svg"
                      :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(sl, si) in pieSlices" :key="'tcp' + si">
                        <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                        <line
                          :x1="sl.leaderX1"
                          :y1="sl.leaderY1"
                          :x2="sl.lx"
                          :y2="sl.ly"
                          class="ppt-pie-leader"
                        />
                        <text
                          :x="sl.tx"
                          :y="sl.ty"
                          :text-anchor="sl.anchor"
                          class="ppt-pie-label"
                          dominant-baseline="middle"
                        >
                          {{ sl.percent }}%
                        </text>
                      </template>
                      <template v-for="(sl, si) in pieSlices" :key="'tcpl' + si">
                        <rect
                          :x="PIE_CHART_LAYOUT.legendX"
                          :y="10 + si * 20"
                          width="10"
                          height="10"
                          :fill="sl.color"
                          rx="2"
                        />
                        <text
                          :x="PIE_CHART_LAYOUT.legendTextX"
                          :y="10 + si * 20 + 9"
                          class="ppt-pie-legend-text"
                        >
                          {{ sl.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 雷达图（支持新旧两种格式） -->
                    <div
                      v-else-if="slide.chart.type === 'radar'"
                      class="ppt-radar-chart-wrap"
                    >
                      <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                        <span
                          v-for="s in radarSeriesNorm"
                          :key="s.name"
                          class="ppt-radar-legend-item"
                        >
                          <span
                            class="ppt-radar-legend-dot"
                            :style="{ background: s.color }"
                          ></span>
                          {{ s.name }}
                        </span>
                      </div>
                      <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                        <polygon
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'tcrg' + ri"
                          :points="ring.points"
                          class="ppt-radar-grid"
                        />
                        <line
                          v-for="(ax, ai) in radarAxes"
                          :key="'tcra' + ai"
                          :x1="120"
                          :y1="90"
                          :x2="ax.x"
                          :y2="ax.y"
                          class="ppt-radar-axis"
                        />
                        <text
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'tcrv' + ri"
                          x="124"
                          :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                          class="ppt-radar-tick"
                        >
                          {{ ring.value }}
                        </text>
                        <g v-for="(series, si) in radarSeriesShapes" :key="'tcrs' + si">
                          <polygon
                            :points="series.points"
                            class="ppt-radar-series-fill"
                            :style="{ fill: series.color, stroke: series.color }"
                          />
                          <circle
                            v-for="(dot, di) in series.dots"
                            :key="'tcrd' + si + '-' + di"
                            :cx="dot.x"
                            :cy="dot.y"
                            r="3"
                            :style="{ fill: series.color }"
                          />
                        </g>
                        <text
                          v-for="(ax, ai) in radarAxes"
                          :key="'tcrl' + ai"
                          :x="ax.tx"
                          :y="ax.ty"
                          :text-anchor="ax.anchor"
                          class="ppt-radar-axis-label"
                          dominant-baseline="middle"
                        >
                          {{ ax.label }}
                        </text>
                      </svg>
                    </div>
                    <!-- 水平柱状图 -->
                    <svg
                      v-else-if="slide.chart.type === 'horizontal_bar'"
                      class="ppt-chart-svg ppt-chart-svg-hbar"
                      :viewBox="`0 0 ${
                        HBAR_LAYOUT_COMPACT.viewW
                      } ${horizontalBarViewBoxHeight(
                        slide.chart.data.length,
                        HBAR_LAYOUT_COMPACT.rowH,
                        30
                      )}`"
                      preserveAspectRatio="xMinYMid meet"
                    >
                      <template v-for="(d, di) in slide.chart.data" :key="'tchb' + di">
                        <text
                          :x="HBAR_LAYOUT_COMPACT.labelX"
                          :y="10 + di * HBAR_LAYOUT_COMPACT.rowH + 10"
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 9px"
                        >
                          {{ d.label }}
                        </text>
                        <rect
                          :x="HBAR_LAYOUT_COMPACT.barX"
                          :y="10 + di * HBAR_LAYOUT_COMPACT.rowH"
                          :width="
                            horizontalBarWidthPx(
                              d.value,
                              maxChartValue,
                              HBAR_LAYOUT_COMPACT.barMaxW,
                              slide.chart
                            )
                          "
                          height="16"
                          :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                          rx="2"
                        />
                        <text
                          :x="
                            horizontalBarValueTextX(
                              HBAR_LAYOUT_COMPACT.barX,
                              horizontalBarWidthPx(
                                d.value,
                                maxChartValue,
                                HBAR_LAYOUT_COMPACT.barMaxW,
                                slide.chart
                              ),
                              HBAR_LAYOUT_COMPACT.valueGap
                            )
                          "
                          :y="10 + di * HBAR_LAYOUT_COMPACT.rowH + 11"
                          class="ppt-chart-value-label"
                          style="font-size: 9px"
                        >
                          {{ formatChartDataValue(d.value) }}
                        </text>
                      </template>
                    </svg>
                    <!-- 漏斗图 funnel -->
                    <div
                      v-else-if="slide.chart.type === 'funnel'"
                      class="ppt-funnel-chart"
                    >
                      <div
                        v-for="(d, di) in slide.chart.data"
                        :key="'tcf' + di"
                        class="ppt-funnel-row"
                      >
                        <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                        <div class="ppt-funnel-bar-wrap">
                          <div
                            class="ppt-funnel-bar"
                            :style="{
                              width: funnelBarWidthPercent(
                                d.value,
                                maxChartValue,
                                slide.chart
                              ),
                              background: getSeriesColor(di),
                            }"
                          >
                            <span class="ppt-funnel-value">{{
                              formatChartDataValue(d.value)
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 瀑布图 waterfall -->
                    <svg
                      v-else-if="slide.chart.type === 'waterfall'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        :x="LINE_CHART_Y_AXIS_LABEL_X"
                        :y="LINE_CHART_Y_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template
                        v-for="(tick, ti) in getWaterfallYTicks()"
                        :key="'tcwfyt' + ti"
                      >
                        <text
                          x="48"
                          :y="mapWaterfallY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapWaterfallY(tick)"
                          x2="460"
                          :y2="mapWaterfallY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <template v-for="(bar, bi) in waterfallBars" :key="'tcwf' + bi">
                        <rect
                          :x="55 + bi * (400 / waterfallBars.length) + 4"
                          :y="bar.y"
                          :width="400 / waterfallBars.length - 8"
                          :height="Math.max(2, bar.h)"
                          :class="[
                            'ppt-bar-rect',
                            bar.isTotal
                              ? 'ppt-bar-total'
                              : bar.isNegative
                              ? 'ppt-bar-negative'
                              : '',
                          ]"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="bar.y - 5"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ bar.value }}
                        </text>
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 +
                                    bi * (400 / waterfallBars.length) +
                                    400 / waterfallBars.length / 2,
                                  LINE_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ bar.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 散点图 scatter -->
                    <svg
                      v-else-if="slide.chart.type === 'scatter'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="255"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <template
                        v-for="(tick, ti) in getScatterYTicks()"
                        :key="'tcsy' + ti"
                      >
                        <line
                          :x1="55"
                          :y1="mapScatterY(tick)"
                          :x2="455"
                          :y2="mapScatterY(tick)"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="50"
                          :y="mapScatterY(tick) + 3"
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <template
                        v-for="(tick, ti) in getScatterXTicks()"
                        :key="'tcsx' + ti"
                      >
                        <line
                          :x1="mapScatterX(tick)"
                          :y1="25"
                          :x2="mapScatterX(tick)"
                          :y2="195"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="mapScatterX(tick)"
                          :y="LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <template v-for="(pt, pi) in scatterPoints" :key="'tcsp' + pi">
                        <circle
                          :cx="pt.svgX"
                          :cy="pt.svgY"
                          r="5"
                          :fill="pt.color"
                          fill-opacity="0.8"
                          stroke="#fff"
                          stroke-width="0.5"
                        />
                        <text
                          :x="pt.svgX"
                          :y="pt.svgY - 8"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 8px"
                        >
                          {{ pt.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 热力图 heatmap -->
                    <svg
                      v-else-if="slide.chart.type === 'heatmap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="8"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 8, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <text
                        v-for="(col, ci) in heatmapParsed?.cols || []"
                        :key="'tchc' + ci"
                        :x="
                          60 +
                          ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                          400 / (heatmapParsed?.cols?.length || 1) / 2
                        "
                        y="20"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ col }}
                      </text>
                      <text
                        v-for="(row, ri) in heatmapParsed?.rows || []"
                        :key="'tchr' + ri"
                        x="56"
                        :y="
                          25 +
                          ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                          175 / (heatmapParsed?.rows?.length || 1) / 2 +
                          3
                        "
                        class="ppt-chart-label"
                        text-anchor="end"
                        style="font-size: 9px"
                      >
                        {{ row }}
                      </text>
                      <template v-for="(cell, ci) in heatmapCells" :key="'tchv' + ci">
                        <rect
                          :x="cell.svgX + 1"
                          :y="cell.svgY + 1"
                          :width="Math.max(cell.width - 2, 1)"
                          :height="Math.max(cell.height - 2, 1)"
                          :fill="cell.color"
                          rx="2"
                          opacity="0.85"
                        />
                        <text
                          :x="cell.svgX + cell.width / 2"
                          :y="cell.svgY + cell.height / 2 + 3"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: #fff; font-weight: 600"
                        >
                          {{ cell.value }}
                        </text>
                      </template>
                    </svg>
                    <!-- 树形图 treemap -->
                    <svg
                      v-else-if="slide.chart.type === 'treemap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(rect, ri) in treemapRects" :key="'tctr' + ri">
                        <rect
                          :x="rect.x + 1"
                          :y="rect.y + 1"
                          :width="Math.max(rect.width - 2, 1)"
                          :height="Math.max(rect.height - 2, 1)"
                          :fill="rect.color"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          v-if="rect.width > 30 && rect.height > 20"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 - 4"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 10px; fill: #fff; font-weight: 600"
                        >
                          {{ rect.label }}
                        </text>
                        <text
                          v-if="rect.width > 30 && rect.height > 30"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 + 10"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                        >
                          {{ rect.value }} ({{ rect.percent }}%)
                        </text>
                      </template>
                    </svg>
                    <!-- 时间线 timeline -->
                    <div
                      v-else-if="isTimelineChart(slide.chart)"
                      class="ppt-timeline-chart ppt-timeline-chart--compact"
                    >
                      <div
                        v-if="
                          slide.chart.x_label ||
                          slide.chart.xLabel ||
                          slide.chart.y_label ||
                          slide.chart.yLabel
                        "
                        class="ppt-timeline-axis-hint"
                      >
                        <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                          slide.chart.x_label || slide.chart.xLabel
                        }}</span>
                        <template
                          v-if="
                            (slide.chart.x_label || slide.chart.xLabel) &&
                            (slide.chart.y_label || slide.chart.yLabel)
                          "
                        >
                          ·
                        </template>
                        <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                          slide.chart.y_label || slide.chart.yLabel
                        }}</span>
                      </div>
                      <div
                        v-for="(d, di) in slide.chart.data || []"
                        :key="'tl-cr-' + di"
                        class="ppt-timeline-item"
                      >
                        <div class="ppt-timeline-track">
                          <div
                            class="ppt-timeline-dot"
                            :style="{ background: getSeriesColor(di) }"
                          ></div>
                          <div
                            v-if="di < (slide.chart.data?.length || 0) - 1"
                            class="ppt-timeline-line"
                          ></div>
                        </div>
                        <div class="ppt-timeline-body">
                          <div
                            v-if="d.value != null && String(d.value) !== ''"
                            class="ppt-timeline-step"
                          >
                            {{ d.value }}
                          </div>
                          <div class="ppt-timeline-date">{{ d.label }}</div>
                          <div class="ppt-timeline-desc">
                            {{ d.description || d.desc || d.text || d.title || "" }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 仪表盘图 gauge -->
                    <svg
                      v-else-if="slide.chart.type === 'gauge'"
                      class="ppt-chart-svg ppt-gauge-svg"
                      viewBox="0 0 260 160"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-if="gaugeData">
                        <path
                          :d="gaugeArcPath(1)"
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <path
                          :d="gaugeArcPath(gaugeData.ratio)"
                          fill="none"
                          :stroke="gaugeData.color"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <template
                          v-for="(tick, ti) in gaugeTickMarks(
                            gaugeData.min,
                            gaugeData.max
                          )"
                          :key="'tcgt' + ti"
                        >
                          <line
                            :x1="tick.x1"
                            :y1="tick.y1"
                            :x2="tick.x2"
                            :y2="tick.y2"
                            stroke="rgba(255,255,255,0.3)"
                            stroke-width="1"
                          />
                          <text
                            :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                            :y="tick.y2 + 3"
                            class="ppt-chart-label"
                            :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                            style="font-size: 8px"
                          >
                            {{ tick.label }}
                          </text>
                        </template>
                        <text
                          x="130"
                          y="115"
                          text-anchor="middle"
                          class="ppt-gauge-value"
                          :fill="gaugeData.color"
                        >
                          {{ gaugeData.value }}{{ gaugeData.unit }}
                        </text>
                        <text
                          x="130"
                          y="135"
                          text-anchor="middle"
                          class="ppt-gauge-label"
                        >
                          {{ gaugeData.label }}
                        </text>
                        <template v-if="gaugeData.target !== undefined">
                          <line
                            :x1="
                              130 +
                              95 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y1="
                              130 +
                              95 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :x2="
                              130 +
                              108 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y2="
                              130 +
                              108 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            stroke="#fff"
                            stroke-width="2"
                          />
                        </template>
                      </template>
                    </svg>
                  </div>
                </div>
                <div class="ppt-col" v-else>
                  <div v-if="slide.right_title" class="ppt-col-header">
                    {{ slide.right_title }}
                  </div>
                  <ul class="ppt-bullet-list">
                    <li
                      v-for="(item, ri) in slide.content.slice(resolveContentSplitIndex(slide.column_split, slide.content.length)!)"
                      :key="'r' + ri"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="
                          onContentItemBlur(
                            $event,
                            currentSlide,
                            resolveContentSplitIndex(slide.column_split, slide.content.length)! + ri
                          )
                        "
                      />
                    </li>
                  </ul>
                </div>
              </template>
              <!-- 兜底：只有 content 没有分栏信息 -->
              <template v-else>
                <div class="ppt-col" style="flex: 1">
                  <ul class="ppt-bullet-list">
                    <li
                      v-for="(item, bi) in slide.content || []"
                      :key="bi"
                      class="ppt-bullet-item"
                    >
                      <span class="ppt-bullet-dot"></span>
                      <PptMarkdownInline
                        :text="displayText(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </li>
                  </ul>
                </div>
              </template>
            </div>
            <div
              v-if="isChapterImagePage(slide) && slide.key_insight"
              class="ppt-content-insight ppt-chapter-image-page-insight"
            >
              <PptMarkdownInline
                :text="slide.key_insight || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
              />
            </div>
            <!-- two_column 无 column_split 时表格显示在底部 -->
            <div
              v-if="slide.table && !resolveContentSplitIndex(slide.column_split, slide.content?.length ?? 0)"
              class="ppt-two-col-chart ppt-two-col-table"
            >
              <PptTableBlock
                :table="slide.table"
                :page-references="slide.page_references"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>
            <!-- two_column 无 column_split 时图表显示在底部 -->
            <div v-else-if="slide.chart && !resolveContentSplitIndex(slide.column_split, slide.content?.length ?? 0)" class="ppt-two-col-chart" :class="{ 'ppt-chart-contained': isVisualOnlySlide(slide) }">
              <div class="ppt-chart-title">{{ slide.chart.title }}</div>
              <PptChartSourceLine
                :chart="slide.chart"
                :page-references="slide.page_references"
              />
              <!-- 折线图 line -->
              <svg
                v-if="slide.chart.type === 'line'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  :x="LINE_CHART_Y_AXIS_LABEL_X"
                  :y="LINE_CHART_Y_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="265"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <!-- Y轴刻度 -->
                <template v-for="(tick, ti) in getLineYTicks()" :key="'twlyt' + ti">
                  <text
                    x="48"
                    :y="mapLineY(tick) + 4"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
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
                <polyline
                  :points="linePoints"
                  class="ppt-polyline"
                  fill="none"
                  :style="chartStrokeStyle(0)"
                />
                <template v-for="(d, di) in slide.chart.data" :key="'tl' + di">
                  <circle
                    :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                    :cy="mapLineY(d.value)"
                    r="4"
                    class="ppt-line-dot"
                    :style="chartFillStyle(0)"
                  />
                  <text
                    :x="55 + di * (400 / (slide.chart.data.length - 1))"
                    :y="
                      shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                    "
                    class="ppt-chart-label"
                    :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                    :transform="
                      shouldRotateLabels
                        ? `rotate(-45, ${
                            55 + di * (400 / (slide.chart.data.length - 1))
                          }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                        : undefined
                    "
                    :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                  >
                    {{ d.label }}
                  </text>
                </template>
              </svg>
              <!-- 普通/分组柱状图 bar -->
              <template v-else-if="slide.chart.type === 'bar'">
                <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                  <div
                    class="ppt-grouped-bar-legend"
                    v-if="groupedBarSeriesList.length"
                  >
                    <span
                      v-for="(s, si) in groupedBarSeriesList"
                      :key="'twgl' + si"
                      class="ppt-grouped-bar-legend-item"
                    >
                      <span
                        class="ppt-pie-dot"
                        :style="{ background: getSeriesColor(si) }"
                      ></span
                      >{{ groupedBarSeriesLabel(s) }}
                    </span>
                  </div>
                  <svg
                    class="ppt-chart-svg"
                    viewBox="0 0 500 260"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      y="252"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'twgyt' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <template
                      v-for="(cat, ci) in groupedBarCategories"
                      :key="'twgb-cat-' + ci"
                    >
                      <template
                        v-for="(s, si) in groupedBarSeriesList"
                        :key="'twgb-bar-' + ci + '-' + si"
                      >
                        <rect
                          :x="groupedBarRectX(ci, si)"
                          :y="Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)"
                          :width="groupedBarRectWidth()"
                          :height="
                            Math.max(
                              1,
                              Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                            )
                          "
                          :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                          :class="[
                            'ppt-bar-rect',
                            groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                          ]"
                          rx="3"
                        />
                      </template>
                      <text
                        :x="groupedBarCategoryLabelX(ci)"
                        :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                groupedBarCategoryLabelX(ci),
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
                <svg
                  v-else
                  class="ppt-chart-svg"
                  viewBox="0 0 500 260"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="10"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 10, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="260"
                    y="252"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getBarYTicks()" :key="'tbyt' + ti">
                    <text
                      x="48"
                      :y="mapBarY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
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
                  <template v-for="(d, di) in slide.chart.data" :key="'tb' + di">
                    <rect
                      :x="55 + di * (400 / slide.chart.data.length)"
                      :y="Math.min(mapBarY(d.value), barZeroY)"
                      :width="(400 / slide.chart.data.length) * 0.65"
                      :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                      :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                      rx="3"
                    />
                    <!-- 柱子上方/下方显示数值 -->
                    <text
                      :x="
                        55 +
                        di * (400 / slide.chart.data.length) +
                        (400 / slide.chart.data.length) * 0.325
                      "
                      :y="
                        d.value >= 0
                          ? mapBarY(d.value) - 5
                          : mapBarY(d.value) + Math.abs(mapBarY(d.value) - barZeroY) + 12
                      "
                      class="ppt-chart-label"
                      text-anchor="middle"
                      fill="var(--ppt-chart-value)"
                    >
                      {{ formatTickValue(d.value) }}
                    </text>
                    <text
                      :x="
                        55 +
                        di * (400 / slide.chart.data.length) +
                        (400 / slide.chart.data.length) * 0.3
                      "
                      :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? chartXCatLabelTransform(
                              55 +
                                di * (400 / slide.chart.data.length) +
                                (400 / slide.chart.data.length) * 0.3,
                              BAR_CHART_X_CAT_Y_ROTATED
                            )
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ d.label }}
                    </text>
                  </template>
                </svg>
              </template>
              <!-- 水平柱状图 horizontal_bar -->
              <svg
                v-else-if="slide.chart.type === 'horizontal_bar'"
                class="ppt-chart-svg ppt-chart-svg-hbar"
                :viewBox="`0 0 ${HBAR_LAYOUT.viewW} ${horizontalBarViewBoxHeight(
                  slide.chart.data.length,
                  HBAR_LAYOUT.rowH
                )}`"
                preserveAspectRatio="xMinYMid meet"
              >
                <text
                  v-if="slide.chart.x_label"
                  :x="HBAR_LAYOUT.viewW / 2"
                  :y="
                    horizontalBarViewBoxHeight(
                      slide.chart.data.length,
                      HBAR_LAYOUT.rowH
                    ) - 4
                  "
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <template v-for="(d, di) in slide.chart.data" :key="'tc' + di">
                  <text
                    :x="HBAR_LAYOUT.labelX"
                    :y="12 + di * HBAR_LAYOUT.rowH + 10"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
                    {{ d.label }}
                  </text>
                  <rect
                    :x="HBAR_LAYOUT.barX"
                    :y="12 + di * HBAR_LAYOUT.rowH"
                    :width="
                      horizontalBarWidthPx(
                        d.value,
                        maxChartValue,
                        HBAR_LAYOUT.barMaxW,
                        slide.chart
                      )
                    "
                    height="18"
                    :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                    rx="3"
                  />
                  <text
                    :x="
                      horizontalBarValueTextX(
                        HBAR_LAYOUT.barX,
                        horizontalBarWidthPx(
                          d.value,
                          maxChartValue,
                          HBAR_LAYOUT.barMaxW,
                          slide.chart
                        ),
                        HBAR_LAYOUT.valueGap
                      )
                    "
                    :y="12 + di * HBAR_LAYOUT.rowH + 13"
                    class="ppt-chart-value-label"
                  >
                    {{ formatChartDataValue(d.value) }}
                  </text>
                </template>
              </svg>
              <!-- 饼图 pie -->
              <svg
                v-else-if="slide.chart.type === 'pie'"
                class="ppt-chart-svg ppt-pie-svg"
                :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-for="(sl, si) in pieSlices" :key="'tp' + si">
                  <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                  <line
                    :x1="sl.leaderX1"
                    :y1="sl.leaderY1"
                    :x2="sl.lx"
                    :y2="sl.ly"
                    class="ppt-pie-leader"
                  />
                  <text
                    :x="sl.tx"
                    :y="sl.ty"
                    :text-anchor="sl.anchor"
                    class="ppt-pie-label"
                    dominant-baseline="middle"
                  >
                    {{ sl.percent }}%
                  </text>
                </template>
                <template v-for="(sl, si) in pieSlices" :key="'tpl' + si">
                  <rect
                    :x="PIE_CHART_LAYOUT.legendX"
                    :y="10 + si * 20"
                    width="10"
                    height="10"
                    :fill="sl.color"
                    rx="2"
                  />
                  <text
                    :x="PIE_CHART_LAYOUT.legendTextX"
                    :y="10 + si * 20 + 9"
                    class="ppt-pie-legend-text"
                  >
                    {{ sl.label }}
                  </text>
                </template>
              </svg>
              <!-- 雷达图 radar（支持新旧两种格式） -->
              <div v-else-if="slide.chart.type === 'radar'" class="ppt-radar-chart-wrap">
                <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                  <span
                    v-for="s in radarSeriesNorm"
                    :key="s.name"
                    class="ppt-radar-legend-item"
                  >
                    <span
                      class="ppt-radar-legend-dot"
                      :style="{ background: s.color }"
                    ></span>
                    {{ s.name }}
                  </span>
                </div>
                <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                  <polygon
                    v-for="(ring, ri) in radarGridPolygons"
                    :key="'trg' + ri"
                    :points="ring.points"
                    class="ppt-radar-grid"
                  />
                  <line
                    v-for="(ax, ai) in radarAxes"
                    :key="'tra' + ai"
                    :x1="120"
                    :y1="90"
                    :x2="ax.x"
                    :y2="ax.y"
                    class="ppt-radar-axis"
                  />
                  <text
                    v-for="(ring, ri) in radarGridPolygons"
                    :key="'trv' + ri"
                    x="124"
                    :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                    class="ppt-radar-tick"
                  >
                    {{ ring.value }}
                  </text>
                  <g v-for="(series, si) in radarSeriesShapes" :key="'trs' + si">
                    <polygon
                      :points="series.points"
                      class="ppt-radar-series-fill"
                      :style="{ fill: series.color, stroke: series.color }"
                    />
                    <circle
                      v-for="(dot, di) in series.dots"
                      :key="'trd' + si + '-' + di"
                      :cx="dot.x"
                      :cy="dot.y"
                      r="3"
                      :style="{ fill: series.color }"
                    />
                  </g>
                  <text
                    v-for="(ax, ai) in radarAxes"
                    :key="'trl' + ai"
                    :x="ax.tx"
                    :y="ax.ty"
                    :text-anchor="ax.anchor"
                    class="ppt-radar-axis-label"
                    dominant-baseline="middle"
                  >
                    {{ ax.label }}
                  </text>
                </svg>
              </div>
              <!-- 漏斗图 funnel（two_column 底部，无 column_split） -->
              <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                <div
                  v-for="(d, di) in slide.chart.data"
                  :key="'tf' + di"
                  class="ppt-funnel-row"
                >
                  <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                  <div class="ppt-funnel-bar-wrap">
                    <div
                      class="ppt-funnel-bar"
                      :style="{
                        width: funnelBarWidthPercent(d.value, maxChartValue, slide.chart),
                        background: getSeriesColor(di),
                      }"
                    >
                      <span class="ppt-funnel-value">{{
                        formatChartDataValue(d.value)
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 瀑布图 waterfall（two_column 底部） -->
              <svg
                v-else-if="slide.chart.type === 'waterfall'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  :x="LINE_CHART_Y_AXIS_LABEL_X"
                  :y="LINE_CHART_Y_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="265"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <!-- Y轴刻度 -->
                <template v-for="(tick, ti) in getWaterfallYTicks()" :key="'twfyt' + ti">
                  <text
                    x="48"
                    :y="mapWaterfallY(tick) + 4"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                  <line
                    x1="52"
                    :y1="mapWaterfallY(tick)"
                    x2="460"
                    :y2="mapWaterfallY(tick)"
                    stroke="var(--ppt-chart-grid)"
                    stroke-width="0.5"
                  />
                </template>
                <template v-for="(bar, bi) in waterfallBars" :key="'twf' + bi">
                  <rect
                    :x="55 + bi * (400 / waterfallBars.length) + 4"
                    :y="bar.y"
                    :width="400 / waterfallBars.length - 8"
                    :height="Math.max(2, bar.h)"
                    :class="[
                      'ppt-bar-rect',
                      bar.isTotal
                        ? 'ppt-bar-total'
                        : bar.isNegative
                        ? 'ppt-bar-negative'
                        : '',
                    ]"
                    rx="3"
                    opacity="0.88"
                  />
                  <text
                    :x="
                      55 +
                      bi * (400 / waterfallBars.length) +
                      400 / waterfallBars.length / 2
                    "
                    :y="bar.y - 5"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ bar.value }}
                  </text>
                  <text
                    :x="
                      55 +
                      bi * (400 / waterfallBars.length) +
                      400 / waterfallBars.length / 2
                    "
                    :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                    class="ppt-chart-label"
                    :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                    :transform="
                      shouldRotateLabels
                        ? chartXCatLabelTransform(
                            55 +
                              bi * (400 / waterfallBars.length) +
                              400 / waterfallBars.length / 2,
                            LINE_CHART_X_CAT_Y_ROTATED
                          )
                        : undefined
                    "
                    :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                  >
                    {{ bar.label }}
                  </text>
                </template>
              </svg>
              <!-- 散点图 scatter -->
              <svg
                v-else-if="slide.chart.type === 'scatter'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  x="10"
                  y="110"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  transform="rotate(-90, 10, 110)"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="255"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <template v-for="(tick, ti) in getScatterYTicks()" :key="'twsy' + ti">
                  <line
                    :x1="55"
                    :y1="mapScatterY(tick)"
                    :x2="455"
                    :y2="mapScatterY(tick)"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="1"
                  />
                  <text
                    :x="50"
                    :y="mapScatterY(tick) + 3"
                    class="ppt-chart-label"
                    text-anchor="end"
                    style="font-size: 9px"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                </template>
                <template v-for="(tick, ti) in getScatterXTicks()" :key="'twsx' + ti">
                  <line
                    :x1="mapScatterX(tick)"
                    :y1="25"
                    :x2="mapScatterX(tick)"
                    :y2="195"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="1"
                  />
                  <text
                    :x="mapScatterX(tick)"
                    :y="LINE_CHART_X_CAT_Y"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                </template>
                <template v-for="(pt, pi) in scatterPoints" :key="'twsp' + pi">
                  <circle
                    :cx="pt.svgX"
                    :cy="pt.svgY"
                    r="5"
                    :fill="pt.color"
                    fill-opacity="0.8"
                    stroke="#fff"
                    stroke-width="0.5"
                  />
                  <text
                    :x="pt.svgX"
                    :y="pt.svgY - 8"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 8px"
                  >
                    {{ pt.label }}
                  </text>
                </template>
              </svg>
              <!-- 热力图 heatmap -->
              <svg
                v-else-if="slide.chart.type === 'heatmap'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  x="8"
                  y="110"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  transform="rotate(-90, 8, 110)"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="260"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <text
                  v-for="(col, ci) in heatmapParsed?.cols || []"
                  :key="'twhc' + ci"
                  :x="
                    60 +
                    ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                    400 / (heatmapParsed?.cols?.length || 1) / 2
                  "
                  y="20"
                  class="ppt-chart-label"
                  text-anchor="middle"
                  style="font-size: 9px"
                >
                  {{ col }}
                </text>
                <text
                  v-for="(row, ri) in heatmapParsed?.rows || []"
                  :key="'twhr' + ri"
                  x="56"
                  :y="
                    25 +
                    ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                    175 / (heatmapParsed?.rows?.length || 1) / 2 +
                    3
                  "
                  class="ppt-chart-label"
                  text-anchor="end"
                  style="font-size: 9px"
                >
                  {{ row }}
                </text>
                <template v-for="(cell, ci) in heatmapCells" :key="'twhv' + ci">
                  <rect
                    :x="cell.svgX + 1"
                    :y="cell.svgY + 1"
                    :width="Math.max(cell.width - 2, 1)"
                    :height="Math.max(cell.height - 2, 1)"
                    :fill="cell.color"
                    rx="2"
                    opacity="0.85"
                  />
                  <text
                    :x="cell.svgX + cell.width / 2"
                    :y="cell.svgY + cell.height / 2 + 3"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px; fill: #fff; font-weight: 600"
                  >
                    {{ cell.value }}
                  </text>
                </template>
              </svg>
              <!-- 树形图 treemap -->
              <svg
                v-else-if="slide.chart.type === 'treemap'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-for="(rect, ri) in treemapRects" :key="'twtr' + ri">
                  <rect
                    :x="rect.x + 1"
                    :y="rect.y + 1"
                    :width="Math.max(rect.width - 2, 1)"
                    :height="Math.max(rect.height - 2, 1)"
                    :fill="rect.color"
                    rx="3"
                    opacity="0.88"
                  />
                  <text
                    v-if="rect.width > 30 && rect.height > 20"
                    :x="rect.x + rect.width / 2"
                    :y="rect.y + rect.height / 2 - 4"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 10px; fill: #fff; font-weight: 600"
                  >
                    {{ rect.label }}
                  </text>
                  <text
                    v-if="rect.width > 30 && rect.height > 30"
                    :x="rect.x + rect.width / 2"
                    :y="rect.y + rect.height / 2 + 10"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                  >
                    {{ rect.value }} ({{ rect.percent }}%)
                  </text>
                </template>
              </svg>
              <!-- 时间线 timeline -->
              <div v-else-if="isTimelineChart(slide.chart)" class="ppt-timeline-chart">
                <div
                  v-if="
                    slide.chart.x_label ||
                    slide.chart.xLabel ||
                    slide.chart.y_label ||
                    slide.chart.yLabel
                  "
                  class="ppt-timeline-axis-hint"
                >
                  <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                    slide.chart.x_label || slide.chart.xLabel
                  }}</span>
                  <template
                    v-if="
                      (slide.chart.x_label || slide.chart.xLabel) &&
                      (slide.chart.y_label || slide.chart.yLabel)
                    "
                  >
                    ·
                  </template>
                  <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                    slide.chart.y_label || slide.chart.yLabel
                  }}</span>
                </div>
                <div
                  v-for="(d, di) in slide.chart.data || []"
                  :key="'tl-cb-' + di"
                  class="ppt-timeline-item"
                >
                  <div class="ppt-timeline-track">
                    <div
                      class="ppt-timeline-dot"
                      :style="{ background: getSeriesColor(di) }"
                    ></div>
                    <div
                      v-if="di < (slide.chart.data?.length || 0) - 1"
                      class="ppt-timeline-line"
                    ></div>
                  </div>
                  <div class="ppt-timeline-body">
                    <div
                      v-if="d.value != null && String(d.value) !== ''"
                      class="ppt-timeline-step"
                    >
                      {{ d.value }}
                    </div>
                    <div class="ppt-timeline-date">{{ d.label }}</div>
                    <div class="ppt-timeline-desc">
                      {{ d.description || d.desc || d.text || d.title || "" }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- 仪表盘图 gauge -->
              <svg
                v-else-if="slide.chart.type === 'gauge'"
                class="ppt-chart-svg ppt-gauge-svg"
                viewBox="0 0 260 160"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-if="gaugeData">
                  <path
                    :d="gaugeArcPath(1)"
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    stroke-width="16"
                    stroke-linecap="round"
                  />
                  <path
                    :d="gaugeArcPath(gaugeData.ratio)"
                    fill="none"
                    :stroke="gaugeData.color"
                    stroke-width="16"
                    stroke-linecap="round"
                  />
                  <template
                    v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                    :key="'twgt' + ti"
                  >
                    <line
                      :x1="tick.x1"
                      :y1="tick.y1"
                      :x2="tick.x2"
                      :y2="tick.y2"
                      stroke="rgba(255,255,255,0.3)"
                      stroke-width="1"
                    />
                    <text
                      :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                      :y="tick.y2 + 3"
                      class="ppt-chart-label"
                      :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                      style="font-size: 8px"
                    >
                      {{ tick.label }}
                    </text>
                  </template>
                  <text
                    x="130"
                    y="115"
                    text-anchor="middle"
                    class="ppt-gauge-value"
                    :fill="gaugeData.color"
                  >
                    {{ gaugeData.value }}{{ gaugeData.unit }}
                  </text>
                  <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                    {{ gaugeData.label }}
                  </text>
                  <template v-if="gaugeData.target !== undefined">
                    <line
                      :x1="
                        130 +
                        95 *
                          Math.cos(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :y1="
                        130 +
                        95 *
                          Math.sin(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :x2="
                        130 +
                        108 *
                          Math.cos(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :y2="
                        130 +
                        108 *
                          Math.sin(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      stroke="#fff"
                      stroke-width="2"
                    />
                  </template>
                </template>
              </svg>
            </div>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- data 数据图表页 -->
          <div
            v-else-if="slide.layout === 'data'"
            class="ppt-slide ppt-data"
            :class="{ 'ppt-slide--metric-only': isMetricCardsOnlySlide(slide) }"
          >
            <h2 class="ppt-slide-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>
            <div v-if="slide.subtitle" class="ppt-chart-subtitle">
              <PptMarkdownInline
                :text="slide.subtitle || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
              />
            </div>

            <div
              v-if="slide.key_insight"
              class="ppt-content-insight ppt-content-insight--page-callout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"
                />
                <line x1="9" y1="21" x2="15" y2="21" />
              </svg>
              <PptMarkdownInline
                class="ppt-content-insight-text"
                :text="slide.key_insight || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
              />
            </div>

            <!-- KPI 卡：metric_cards_row -->
            <div
              v-if="shouldShowMetricCardsPrimaryGrid(slide)"
              class="ppt-metric-cards-fullpage"
              :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
            >
              <PptMetricCardsRow
                :cards="slide.metric_cards ?? []"
                :primary="shouldUsePrimaryMetricCards(slide)"
                :fill="shouldFillMetricCards(slide)"
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>

            <!-- 无 emphasis 的小卡（table/chart 上方） -->
            <PptMetricCardsRow
              v-else-if="shouldShowMetricCardsCompactGrid(slide) && hasBodyPrimaryVisual(slide)"
              :cards="slide.metric_cards ?? []"
              :page-references="slide.page_references"
              :card-style="metricCardStyle"
              :value-style="metricCardValueStyle"
              @ref-click="onPptTableRefClick($event, slide)"
            />

            <div
              v-if="isHeroLeftSlide(slide)"
              class="ppt-content-split ppt-content-items-split ppt-hero-left-split"
            >
              <div class="ppt-content-left ppt-hero-left-panel">
                <div
                  class="ppt-hero-metric ppt-data-hero-metric"
                  :style="heroMetricStyle(slide.hero_metric)"
                >
                  <div
                    v-if="slide.hero_metric?.value"
                    class="ppt-hero-metric-value"
                    :contenteditable="isEditing"
                    @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                  >
                    {{ slide.hero_metric.value }}
                  </div>
                  <PptMarkdownInline
                    v-if="slide.hero_metric?.caption"
                    class="ppt-hero-metric-caption"
                    :text="slide.hero_metric.caption"
                    :page-references="slide.page_references"
                    :editable="isEditing"
                    @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
              </div>
              <div class="ppt-content-right ppt-hero-right-items">
                <template v-if="slide.right_items?.length">
                  <div
                    v-for="(ri, idx) in slide.right_items"
                    :key="'data-hl-' + idx"
                    class="ppt-hero-right-card"
                    :style="heroRightCardStyle(ri, idx)"
                  >
                    <div class="ppt-hero-right-card-head">
                      <span
                        class="ppt-hero-right-card-index"
                        :style="{ color: rightItemAccentColor(ri, idx) }"
                        :contenteditable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                        >{{ formatRightItemIndex(ri, idx) }}</span
                      >
                      <PptMarkdownInline
                        class="ppt-hero-right-card-title"
                        :text="rightItemTitle(ri)"
                        :editable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="rightItemDescription(ri) || isEditing"
                      class="ppt-hero-right-card-desc"
                      :text="rightItemDescription(ri)"
                      :editable="isEditing"
                      @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                    />
                  </div>
                </template>
                <template v-else>
                  <PptMetricCardsRow
                    v-if="shouldShowHeroLeftMetricCards(slide)"
                    :cards="slide.metric_cards ?? []"
                    column
                    :page-references="slide.page_references"
                    :card-style="metricCardStyle"
                    :value-style="metricCardValueStyle"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                  <template v-if="shouldShowHeroLeftContentItems(slide)">
                    <div
                      v-for="(ri, idx) in heroLeftContentRightItems(slide)"
                      :key="'data-hl-fb-' + idx"
                      class="ppt-hero-right-card"
                      :class="{ 'ppt-hero-right-card--after-metrics': shouldShowHeroLeftMetricCards(slide) }"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-hero-right-card-head">
                        <span
                          class="ppt-hero-right-card-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-hero-right-card-title"
                          :text="rightItemTitle(ri)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri)"
                        class="ppt-hero-right-card-desc"
                        :text="rightItemDescription(ri)"
                        :page-references="slide.page_references"
                        @ref-click="onPptTableRefClick($event, slide)"
                      />
                    </div>
                  </template>
                </template>
              </div>
            </div>

            <div
              v-else-if="shouldShowHeroMetricBanner(slide)"
              class="ppt-hero-metric ppt-data-hero-metric"
              :style="heroMetricStyle(slide.hero_metric)"
            >
              <div
                v-if="slide.hero_metric?.value"
                class="ppt-hero-metric-value"
                :contenteditable="isEditing"
                @blur="onHeroMetricBlur($event, currentSlide, 'value')"
              >
                {{ slide.hero_metric.value }}
              </div>
              <PptMarkdownInline
                v-if="slide.hero_metric?.caption"
                class="ppt-hero-metric-caption"
                :text="slide.hero_metric.caption"
                :page-references="slide.page_references"
                :editable="isEditing"
                @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>

            <PptMetricCardsRow
              v-else-if="shouldShowMetricCardInline(slide)"
              :cards="slide.metric_cards ?? []"
              inline
              :page-references="slide.page_references"
              :card-style="metricCardStyle"
              :value-style="metricCardValueStyle"
              @ref-click="onPptTableRefClick($event, slide)"
            />

            <!-- ════ chart/table + 左栏 KPI 或要点 ════ -->
            <div
              v-if="
                !isHeroLeftSlide(slide) &&
                hasBodyPrimaryVisual(slide) &&
                (isMetricCardsChartSplitSlide(slide) ||
                  shouldShowContentBullets(slide) ||
                  hasTableAndChart(slide))
              "
              class="ppt-content-split ppt-data-split"
              :class="{
                'ppt-metric-chart-split': isMetricCardsChartSplitSlide(slide),
                'ppt-content-split--table-chart-dual':
                  hasTableAndChart(slide) &&
                  !isMetricCardsChartSplitSlide(slide) &&
                  !shouldShowContentBullets(slide),
                'ppt-content-split--table-chart-with-bullets':
                  hasTableAndChart(slide) && shouldShowContentBullets(slide),
                'ppt-content-chart-only':
                  hasBodyPrimaryVisual(slide) &&
                  !shouldShowContentBullets(slide) &&
                  !isMetricCardsChartSplitSlide(slide),
              }"
            >
              <!-- 左栏：KPI 卡或文字要点 -->
              <div
                v-if="isMetricCardsChartSplitSlide(slide) || shouldShowContentBullets(slide)"
                class="ppt-content-left"
              >
                <PptMetricCardsRow
                  v-if="isMetricCardsChartSplitSlide(slide)"
                  :cards="slide.metric_cards ?? []"
                  column
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
                <template v-else>
                  <div
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'dp' + bi"
                    class="ppt-content-point"
                    :style="contentPointStyle(bi)"
                  >
                    <div class="ppt-content-point-header">
                      <span class="ppt-content-point-icon">
                        <svg
                          v-if="bi % 4 === 0"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 1"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 2"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        <svg
                          v-else
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <PptMarkdownInline
                        class="ppt-content-point-title"
                        :text="contentPointTitle(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="hasContentPointBody(item)"
                      class="ppt-content-point-body"
                      :text="contentPointBody(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                </template>
              </div>
              <!-- 右栏：图表 + 表格（可同时存在） -->
              <div class="ppt-content-right">
                <div v-if="slide.chart" class="ppt-content-chart-wrap">
                  <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                  <div v-if="slide.chart.note" class="ppt-chart-note">
                    {{ slide.chart.note }}
                  </div>
                  <PptChartSourceLine
                    :chart="slide.chart"
                    :page-references="slide.page_references"
                  />

                  <!-- ═══ 普通/分组柱状图 bar ═══ -->
                  <template v-if="slide.chart.type === 'bar'">
                    <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                      <div
                        class="ppt-grouped-bar-legend"
                        v-if="groupedBarSeriesList.length"
                      >
                        <span
                          v-for="(s, si) in groupedBarSeriesList"
                          :key="'dgl' + si"
                          class="ppt-grouped-bar-legend-item"
                        >
                          <span
                            class="ppt-pie-dot"
                            :style="{ background: getSeriesColor(si) }"
                          ></span
                          >{{ groupedBarSeriesLabel(s) }}
                        </span>
                      </div>
                      <svg
                        class="ppt-chart-svg"
                        viewBox="0 0 500 260"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="10"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 10, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="260"
                          y="252"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度 -->
                        <template v-for="(tick, ti) in getBarYTicks()" :key="'dgyt' + ti">
                          <text
                            x="48"
                            :y="mapBarY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
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
                        <template
                          v-for="(cat, ci) in groupedBarCategories"
                          :key="'dgb-cat-' + ci"
                        >
                          <template
                            v-for="(s, si) in groupedBarSeriesList"
                            :key="'dgb-bar-' + ci + '-' + si"
                          >
                            <rect
                              :x="groupedBarRectX(ci, si)"
                              :y="
                                Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)
                              "
                              :width="groupedBarRectWidth()"
                              :height="
                                Math.max(
                                  1,
                                  Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                                )
                              "
                              :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                              :class="[
                                'ppt-bar-rect',
                                groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                              ]"
                              rx="3"
                            />
                          </template>
                          <text
                            :x="groupedBarCategoryLabelX(ci)"
                            :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    groupedBarCategoryLabelX(ci),
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
                    <svg
                      v-else
                      class="ppt-chart-svg"
                      viewBox="0 0 500 260"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        y="252"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'dbyt' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
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
                      <template v-for="(d, di) in slide.chart.data" :key="di">
                        <rect
                          :x="55 + di * (400 / slide.chart.data.length)"
                          :y="Math.min(mapBarY(d.value), barZeroY)"
                          :width="(400 / slide.chart.data.length) * 0.65"
                          :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                          :fill="getSeriesColor(di)"
                          :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                          rx="3"
                        />
                        <!-- 柱子上方/下方显示数值 -->
                        <text
                          :x="
                            55 +
                            di * (400 / slide.chart.data.length) +
                            (400 / slide.chart.data.length) * 0.325
                          "
                          :y="
                            d.value >= 0
                              ? mapBarY(d.value) - 5
                              : mapBarY(d.value) +
                                Math.abs(mapBarY(d.value) - barZeroY) +
                                12
                          "
                          class="ppt-chart-label"
                          text-anchor="middle"
                          fill="var(--ppt-chart-value)"
                        >
                          {{ formatTickValue(d.value) }}
                        </text>
                        <text
                          :x="
                            55 +
                            di * (400 / slide.chart.data.length) +
                            (400 / slide.chart.data.length) * 0.3
                          "
                          :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 +
                                    di * (400 / slide.chart.data.length) +
                                    (400 / slide.chart.data.length) * 0.3,
                                  BAR_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ d.label }}
                        </text>
                      </template>
                    </svg>
                  </template>

                  <!-- ═══ 折线图 line（支持多线） ═══ -->
                  <div
                    v-else-if="slide.chart.type === 'line'"
                    class="ppt-line-chart-wrap"
                  >
                    <div v-if="lineChartLegendItems.length" class="ppt-line-legend">
                      <span
                        v-for="(label, si) in lineChartLegendItems"
                        :key="'dl-leg' + si"
                        class="ppt-line-legend-item"
                      >
                        <span
                          class="ppt-line-legend-dot"
                          :style="{ background: getSeriesColor(si) }"
                        ></span>
                        {{ label }}
                      </span>
                    </div>
                    <svg
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                    <!-- Y轴标签（左） -->
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="120"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 120)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <!-- X轴标签 -->
                    <text
                      v-if="slide.chart.x_label"
                      x="265"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getLineYTicks()" :key="'dlyt' + ti">
                      <text
                        x="48"
                        :y="mapLineY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                      <template
                        v-for="(s, si) in lineChartSeriesList"
                        :key="'dml' + si"
                      >
                        <polyline
                          :points="lineSeriesPoints(si)"
                          class="ppt-polyline"
                          fill="none"
                          :style="chartStrokeStyle(si)"
                        />
                      </template>
                      <template
                        v-for="(cat, ci) in lineChartCategories"
                        :key="'dlx' + ci"
                      >
                        <text
                          :x="lineCategoryLabelX(ci)"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
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
                      <template
                        v-for="(s, si) in lineChartSeriesList"
                        :key="'dld' + si"
                      >
                        <circle
                          v-for="(cat, ci) in lineChartCategories"
                          :key="'dld' + si + '-' + ci"
                          :cx="lineCategoryLabelX(ci)"
                          :cy="mapLineY(lineSeriesValue(ci, si))"
                          r="4"
                          class="ppt-line-dot"
                          :style="chartFillStyle(si)"
                        />
                      </template>
                    </template>
                    <template v-else>
                    <!-- 主线 -->
                    <polyline
                      :points="linePoints"
                      class="ppt-polyline"
                      fill="none"
                      :style="chartStrokeStyle(0)"
                    />
                    <template v-for="(d, di) in slide.chart.data" :key="'ld' + di">
                      <circle
                        :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                        :cy="mapLineY(d.value)"
                        r="4"
                        class="ppt-line-dot"
                        :style="chartFillStyle(0)"
                      />
                      <text
                        :x="55 + di * (400 / (slide.chart.data.length - 1))"
                        :y="
                          shouldRotateLabels
                            ? LINE_CHART_X_CAT_Y_ROTATED
                            : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? `rotate(-45, ${
                                55 + di * (400 / (slide.chart.data.length - 1))
                              }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ d.label }}
                      </text>
                    </template>
                    <!-- 第二条线 (secondary) -->
                    <polyline
                      v-if="multiLinePoints.secondary"
                      :points="multiLinePoints.secondary"
                      class="ppt-polyline ppt-line-secondary"
                      fill="none"
                      :style="chartStrokeStyle(1)"
                    />
                    <!-- 第三条线 (tertiary) -->
                    <polyline
                      v-if="multiLinePoints.tertiary"
                      :points="multiLinePoints.tertiary"
                      class="ppt-polyline ppt-line-tertiary"
                      fill="none"
                      :style="chartStrokeStyle(2)"
                    />
                    <!-- 图例（legacy 内嵌） -->
                    <template v-if="slide.chart.primary_data_label">
                      <rect
                        x="55"
                        y="2"
                        width="12"
                        height="4"
                        rx="1"
                        class="ppt-bar-rect"
                      />
                      <text x="71" y="7" class="ppt-chart-legend-text">
                        {{ slide.chart.primary_data_label }}
                      </text>
                      <template v-if="slide.chart.secondary_data_label">
                        <rect
                          x="175"
                          y="2"
                          width="12"
                          height="4"
                          rx="1"
                          class="ppt-bar-rect ppt-fill-secondary"
                        />
                        <text x="191" y="7" class="ppt-chart-legend-text">
                          {{ slide.chart.secondary_data_label }}
                        </text>
                      </template>
                      <template v-if="slide.chart.tertiary_data_label">
                        <rect
                          x="295"
                          y="2"
                          width="12"
                          height="4"
                          rx="1"
                          class="ppt-bar-rect ppt-fill-tertiary"
                        />
                        <text x="311" y="7" class="ppt-chart-legend-text">
                          {{ slide.chart.tertiary_data_label }}
                        </text>
                      </template>
                    </template>
                    </template>
                    </svg>
                  </div>

                  <!-- ═══ 面积图 area ═══ -->
                  <svg
                    v-else-if="slide.chart.type === 'area'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <!-- Y轴标签 -->
                    <text
                      v-if="slide.chart.y_label"
                      :x="LINE_CHART_Y_AXIS_LABEL_X"
                      :y="LINE_CHART_Y_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <!-- X轴标签 -->
                    <text
                      v-if="slide.chart.x_label"
                      x="265"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getLineYTicks()" :key="'dayt' + ti">
                      <text
                        x="48"
                        :y="mapLineY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <polygon :points="areaFillPoints" class="ppt-area-fill" />
                    <polyline
                      :points="linePoints"
                      class="ppt-polyline"
                      fill="none"
                      :style="chartStrokeStyle(0)"
                    />
                    <template v-for="(d, di) in slide.chart.data" :key="'ad' + di">
                      <circle
                        :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                        :cy="mapLineY(d.value)"
                        r="4"
                        class="ppt-line-dot"
                        :style="chartFillStyle(0)"
                      />
                      <text
                        :x="55 + di * (400 / (slide.chart.data.length - 1))"
                        :y="
                          shouldRotateLabels
                            ? LINE_CHART_X_CAT_Y_ROTATED
                            : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                55 + di * (400 / (slide.chart.data.length - 1)),
                                LINE_CHART_X_CAT_Y_ROTATED
                              )
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ d.label }}
                      </text>
                    </template>
                  </svg>

                  <!-- ═══ 组合图 combo（柱状 + 折线） ═══ -->
                  <svg
                    v-else-if="slide.chart.type === 'combo'"
                    class="ppt-chart-svg"
                    viewBox="0 0 520 240"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <!-- Y轴标签（左，主数据） -->
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="120"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 120)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <!-- Y轴标签（右，次数据） -->
                    <text
                      v-if="slide.chart.secondary_y_label"
                      x="510"
                      y="120"
                      class="ppt-axis-label ppt-axis-label-secondary"
                      text-anchor="middle"
                      transform="rotate(90, 510, 120)"
                    >
                      {{ slide.chart.secondary_y_label }}
                    </text>
                    <!-- X轴标签 -->
                    <text
                      v-if="slide.chart.x_label"
                      x="275"
                      :y="COMBO_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <line
                      v-if="secondaryAxisStats.min < 0 && secondaryAxisStats.max > 0"
                      x1="55"
                      :y1="comboSecondaryZeroY"
                      x2="455"
                      :y2="comboSecondaryZeroY"
                      class="ppt-axis-zero-line"
                    />
                    <!-- Y轴刻度（主轴） -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'dcyt' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <!-- 柱状（主数据） -->
                    <template v-for="(pt, pi) in comboPrimaryPoints" :key="'cp' + pi">
                      <rect
                        :x="pt.x"
                        :y="pt.y"
                        :width="pt.w"
                        :height="pt.h"
                        :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                        rx="2"
                      />
                      <!-- 柱子上方/下方显示数值 -->
                      <text
                        :x="pt.x + pt.w / 2"
                        :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        fill="var(--ppt-chart-value)"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(pt.value) }}
                      </text>
                      <text
                        :x="pt.x + pt.w / 2"
                        :y="
                          shouldRotateLabels
                            ? LINE_CHART_X_CAT_Y_ROTATED
                            : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ pt.label }}
                      </text>
                    </template>
                    <!-- 折线（次数据） -->
                    <polyline
                      :points="comboSecondaryLinePoints"
                      class="ppt-polyline ppt-line-secondary"
                      fill="none"
                    />
                    <template v-for="(dot, di) in comboSecondaryDots" :key="'cd' + di">
                      <circle
                        :cx="dot.cx"
                        :cy="dot.cy"
                        r="4"
                        class="ppt-line-dot ppt-dot-secondary"
                      />
                    </template>
                    <!-- 图例 -->
                    <template
                      v-if="
                        slide.chart.primary_data_label || slide.chart.secondary_data_label
                      "
                    >
                      <template v-if="slide.chart.primary_data_label">
                        <rect
                          x="55"
                          y="2"
                          width="12"
                          height="4"
                          rx="1"
                          class="ppt-bar-rect"
                        />
                        <text x="71" y="7" class="ppt-chart-legend-text">
                          {{ slide.chart.primary_data_label }}
                        </text>
                      </template>
                      <template v-if="slide.chart.secondary_data_label">
                        <line
                          :x1="slide.chart.primary_data_label ? 175 : 55"
                          y1="4"
                          :x2="slide.chart.primary_data_label ? 187 : 67"
                          y2="4"
                          class="ppt-polyline ppt-line-secondary"
                        />
                        <circle
                          :cx="slide.chart.primary_data_label ? 181 : 61"
                          cy="4"
                          r="2.5"
                          class="ppt-dot-secondary"
                        />
                        <text
                          :x="slide.chart.primary_data_label ? 193 : 73"
                          y="7"
                          class="ppt-chart-legend-text"
                        >
                          {{ slide.chart.secondary_data_label }}
                        </text>
                      </template>
                    </template>
                  </svg>

                  <!-- ═══ 水平柱状图 horizontal_bar ═══ -->
                  <svg
                    v-else-if="slide.chart.type === 'horizontal_bar'"
                    class="ppt-chart-svg ppt-chart-svg-hbar"
                    :viewBox="`0 0 ${HBAR_LAYOUT_DATA.viewW} ${horizontalBarViewBoxHeight(
                      slide.chart.data.length,
                      HBAR_LAYOUT_DATA.rowH
                    )}`"
                    preserveAspectRatio="xMinYMid meet"
                  >
                    <!-- X轴标签（底部） -->
                    <text
                      v-if="slide.chart.x_label"
                      :x="HBAR_LAYOUT_DATA.viewW / 2"
                      :y="
                        horizontalBarViewBoxHeight(
                          slide.chart.data.length,
                          HBAR_LAYOUT_DATA.rowH
                        ) - 4
                      "
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴标签（左侧竖排） -->
                    <text
                      v-if="slide.chart.y_label"
                      x="8"
                      :y="Math.max(60, slide.chart.data.length * 16 + 20)"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      :transform="`rotate(-90, 8, ${Math.max(
                        60,
                        slide.chart.data.length * 16 + 20
                      )})`"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <template v-for="(d, di) in slide.chart.data" :key="'hb' + di">
                      <text
                        :x="HBAR_LAYOUT_DATA.labelX"
                        :y="16 + di * HBAR_LAYOUT_DATA.rowH + 12"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ d.label }}
                      </text>
                      <rect
                        :x="HBAR_LAYOUT_DATA.barX"
                        :y="16 + di * HBAR_LAYOUT_DATA.rowH"
                        :width="
                          horizontalBarWidthPx(
                            d.value,
                            maxChartValue,
                            HBAR_LAYOUT_DATA.barMaxW,
                            slide.chart
                          )
                        "
                        height="22"
                        :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                        rx="3"
                      />
                      <text
                        :x="
                          horizontalBarValueTextX(
                            HBAR_LAYOUT_DATA.barX,
                            horizontalBarWidthPx(
                              d.value,
                              maxChartValue,
                              HBAR_LAYOUT_DATA.barMaxW,
                              slide.chart
                            ),
                            HBAR_LAYOUT_DATA.valueGap
                          )
                        "
                        :y="16 + di * HBAR_LAYOUT_DATA.rowH + 15"
                        class="ppt-chart-value-label"
                      >
                        {{ formatChartDataValue(d.value) }}
                      </text>
                    </template>
                  </svg>

                  <!-- ═══ 堆叠柱状图 stacked_bar ═══ -->
                  <div
                    v-else-if="slide.chart.type === 'stacked_bar'"
                    class="ppt-stacked-chart"
                  >
                    <!-- 轴标签说明行 -->
                    <div
                      v-if="slide.chart.x_label || slide.chart.y_label"
                      class="ppt-axis-labels-row"
                    >
                      <span v-if="slide.chart.y_label" class="ppt-axis-label-text"
                        >Y: {{ slide.chart.y_label }}</span
                      >
                      <span v-if="slide.chart.x_label" class="ppt-axis-label-text"
                        >X: {{ slide.chart.x_label }}</span
                      >
                    </div>
                    <div
                      class="ppt-stacked-legend"
                      v-if="getStackedBarCategoryLabels(slide.chart).length"
                    >
                      <span
                        v-for="(cat, ci) in getStackedBarCategoryLabels(slide.chart)"
                        :key="'sc' + ci"
                        class="ppt-stacked-legend-item"
                      >
                        <span
                          class="ppt-pie-dot"
                          :style="{ background: getSeriesColor(ci) }"
                        ></span>
                        {{ cat }}
                      </span>
                    </div>
                    <div
                      v-for="(d, di) in slide.chart.data"
                      :key="'sb' + di"
                      class="ppt-stacked-row"
                    >
                      <span class="ppt-stacked-label">{{ d.label }}</span>
                      <div class="ppt-stacked-bar-track">
                        <div
                          v-for="(v, vi) in getStackedBarRowValues(d)"
                          :key="'sv' + vi"
                          class="ppt-stacked-segment"
                          :style="{
                            width: (v / stackedBarMax) * 100 + '%',
                            background: getSeriesColor(vi),
                          }"
                          :title="stackedBarSegmentTitle(slide.chart, vi, v)"
                        >
                          <span v-if="v > 5" class="ppt-stacked-seg-text">{{
                            formatStackedBarSegmentLabel(slide.chart, v)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- ═══ 饼图 pie ═══ -->
                  <svg
                    v-else-if="slide.chart.type === 'pie'"
                    class="ppt-chart-svg ppt-pie-svg"
                    :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-for="(sl, si) in pieSlices" :key="'dp' + si">
                      <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                      <line
                        :x1="sl.leaderX1"
                        :y1="sl.leaderY1"
                        :x2="sl.lx"
                        :y2="sl.ly"
                        class="ppt-pie-leader"
                      />
                      <text
                        :x="sl.tx"
                        :y="sl.ty"
                        :text-anchor="sl.anchor"
                        class="ppt-pie-label"
                        dominant-baseline="middle"
                      >
                        {{ sl.percent }}%
                      </text>
                    </template>
                    <!-- 图例 -->
                    <template v-for="(sl, si) in pieSlices" :key="'dpl' + si">
                      <rect
                        :x="PIE_CHART_LAYOUT.legendX"
                        :y="10 + si * 20"
                        width="10"
                        height="10"
                        :fill="sl.color"
                        rx="2"
                      />
                      <text
                        :x="PIE_CHART_LAYOUT.legendTextX"
                        :y="10 + si * 20 + 9"
                        class="ppt-pie-legend-text"
                      >
                        {{ sl.label }}
                      </text>
                    </template>
                  </svg>

                  <!-- ═══ 雷达图 radar（支持新旧两种格式） ═══ -->
                  <div
                    v-else-if="slide.chart.type === 'radar'"
                    class="ppt-radar-chart-wrap"
                  >
                    <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                      <span
                        v-for="s in radarSeriesNorm"
                        :key="s.name"
                        class="ppt-radar-legend-item"
                      >
                        <span
                          class="ppt-radar-legend-dot"
                          :style="{ background: s.color }"
                        ></span>
                        {{ s.name }}
                      </span>
                    </div>
                    <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                      <polygon
                        v-for="(ring, ri) in radarGridPolygons"
                        :key="'rdg' + ri"
                        :points="ring.points"
                        class="ppt-radar-grid"
                      />
                      <line
                        v-for="(ax, ai) in radarAxes"
                        :key="'rda' + ai"
                        :x1="120"
                        :y1="90"
                        :x2="ax.x"
                        :y2="ax.y"
                        class="ppt-radar-axis"
                      />
                      <text
                        v-for="(ring, ri) in radarGridPolygons"
                        :key="'rdv' + ri"
                        x="124"
                        :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                        class="ppt-radar-tick"
                      >
                        {{ ring.value }}
                      </text>
                      <g v-for="(series, si) in radarSeriesShapes" :key="'rds' + si">
                        <polygon
                          :points="series.points"
                          class="ppt-radar-series-fill"
                          :style="{ fill: series.color, stroke: series.color }"
                        />
                        <circle
                          v-for="(dot, di) in series.dots"
                          :key="'rdd' + si + '-' + di"
                          :cx="dot.x"
                          :cy="dot.y"
                          r="3"
                          :style="{ fill: series.color }"
                        />
                      </g>
                      <text
                        v-for="(ax, ai) in radarAxes"
                        :key="'rdl' + ai"
                        :x="ax.tx"
                        :y="ax.ty"
                        :text-anchor="ax.anchor"
                        class="ppt-radar-axis-label"
                        dominant-baseline="middle"
                      >
                        {{ ax.label }}
                      </text>
                    </svg>
                  </div>

                  <!-- ═══ 漏斗图 funnel ═══ -->
                  <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                    <div
                      v-for="(d, di) in slide.chart.data"
                      :key="'df' + di"
                      class="ppt-funnel-row"
                    >
                      <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                      <div class="ppt-funnel-bar-wrap">
                        <div
                          class="ppt-funnel-bar"
                          :style="{
                            width: funnelBarWidthPercent(
                              d.value,
                              maxChartValue,
                              slide.chart
                            ),
                            background: getSeriesColor(di),
                          }"
                        >
                          <span class="ppt-funnel-value">{{
                            formatChartDataValue(d.value)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- ═══ 瀑布图 waterfall ═══ -->
                  <svg
                    v-else-if="slide.chart.type === 'waterfall'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="120"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 120)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="265"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template
                      v-for="(tick, ti) in getWaterfallYTicks()"
                      :key="'dwfyt' + ti"
                    >
                      <text
                        x="48"
                        :y="mapWaterfallY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                      <line
                        x1="52"
                        :y1="mapWaterfallY(tick)"
                        x2="460"
                        :y2="mapWaterfallY(tick)"
                        stroke="var(--ppt-chart-grid)"
                        stroke-width="0.5"
                      />
                    </template>
                    <template v-for="(bar, bi) in waterfallBars" :key="'dwf' + bi">
                      <rect
                        :x="55 + bi * (400 / waterfallBars.length) + 4"
                        :y="bar.y"
                        :width="400 / waterfallBars.length - 8"
                        :height="Math.max(2, bar.h)"
                        :class="[
                          'ppt-bar-rect',
                          bar.isTotal
                            ? 'ppt-bar-total'
                            : bar.isNegative
                            ? 'ppt-bar-negative'
                            : '',
                        ]"
                        rx="3"
                        opacity="0.88"
                      />
                      <text
                        :x="
                          55 +
                          bi * (400 / waterfallBars.length) +
                          400 / waterfallBars.length / 2
                        "
                        :y="bar.y - 5"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ bar.value }}
                      </text>
                      <text
                        :x="
                          55 +
                          bi * (400 / waterfallBars.length) +
                          400 / waterfallBars.length / 2
                        "
                        :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                55 +
                                  bi * (400 / waterfallBars.length) +
                                  400 / waterfallBars.length / 2,
                                LINE_CHART_X_CAT_Y_ROTATED
                              )
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ bar.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 散点图 scatter -->
                  <svg
                    v-else-if="slide.chart.type === 'scatter'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="255"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <template v-for="(tick, ti) in getScatterYTicks()" :key="'dsy' + ti">
                      <line
                        :x1="55"
                        :y1="mapScatterY(tick)"
                        :x2="455"
                        :y2="mapScatterY(tick)"
                        stroke="rgba(255,255,255,0.1)"
                        stroke-width="1"
                      />
                      <text
                        :x="50"
                        :y="mapScatterY(tick) + 3"
                        class="ppt-chart-label"
                        text-anchor="end"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                    </template>
                    <template v-for="(tick, ti) in getScatterXTicks()" :key="'dsx' + ti">
                      <line
                        :x1="mapScatterX(tick)"
                        :y1="25"
                        :x2="mapScatterX(tick)"
                        :y2="195"
                        stroke="rgba(255,255,255,0.1)"
                        stroke-width="1"
                      />
                      <text
                        :x="mapScatterX(tick)"
                        :y="LINE_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                    </template>
                    <template v-for="(pt, pi) in scatterPoints" :key="'dsp' + pi">
                      <circle
                        :cx="pt.svgX"
                        :cy="pt.svgY"
                        r="5"
                        :fill="pt.color"
                        fill-opacity="0.8"
                        stroke="#fff"
                        stroke-width="0.5"
                      />
                      <text
                        :x="pt.svgX"
                        :y="pt.svgY - 8"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 8px"
                      >
                        {{ pt.label }}
                      </text>
                    </template>
                  </svg>
                  <!-- 热力图 heatmap -->
                  <svg
                    v-else-if="slide.chart.type === 'heatmap'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="8"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 8, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      :y="LINE_CHART_X_AXIS_LABEL_Y"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <text
                      v-for="(col, ci) in heatmapParsed?.cols || []"
                      :key="'dhc' + ci"
                      :x="
                        60 +
                        ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                        400 / (heatmapParsed?.cols?.length || 1) / 2
                      "
                      y="20"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ col }}
                    </text>
                    <text
                      v-for="(row, ri) in heatmapParsed?.rows || []"
                      :key="'dhr' + ri"
                      x="56"
                      :y="
                        25 +
                        ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                        175 / (heatmapParsed?.rows?.length || 1) / 2 +
                        3
                      "
                      class="ppt-chart-label"
                      text-anchor="end"
                      style="font-size: 9px"
                    >
                      {{ row }}
                    </text>
                    <template v-for="(cell, ci) in heatmapCells" :key="'dhv' + ci">
                      <rect
                        :x="cell.svgX + 1"
                        :y="cell.svgY + 1"
                        :width="Math.max(cell.width - 2, 1)"
                        :height="Math.max(cell.height - 2, 1)"
                        :fill="cell.color"
                        rx="2"
                        opacity="0.85"
                      />
                      <text
                        :x="cell.svgX + cell.width / 2"
                        :y="cell.svgY + cell.height / 2 + 3"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px; fill: #fff; font-weight: 600"
                      >
                        {{ cell.value }}
                      </text>
                    </template>
                  </svg>
                  <!-- 树形图 treemap -->
                  <svg
                    v-else-if="slide.chart.type === 'treemap'"
                    class="ppt-chart-svg"
                    :viewBox="LINE_CHART_VIEWBOX"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-for="(rect, ri) in treemapRects" :key="'dtr' + ri">
                      <rect
                        :x="rect.x + 1"
                        :y="rect.y + 1"
                        :width="Math.max(rect.width - 2, 1)"
                        :height="Math.max(rect.height - 2, 1)"
                        :fill="rect.color"
                        rx="3"
                        opacity="0.88"
                      />
                      <text
                        v-if="rect.width > 30 && rect.height > 20"
                        :x="rect.x + rect.width / 2"
                        :y="rect.y + rect.height / 2 - 4"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 10px; fill: #fff; font-weight: 600"
                      >
                        {{ rect.label }}
                      </text>
                      <text
                        v-if="rect.width > 30 && rect.height > 30"
                        :x="rect.x + rect.width / 2"
                        :y="rect.y + rect.height / 2 + 10"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                      >
                        {{ rect.value }} ({{ rect.percent }}%)
                      </text>
                    </template>
                  </svg>
                  <div
                    v-else-if="isTimelineChart(slide.chart)"
                    class="ppt-timeline-chart"
                  >
                    <div
                      v-if="
                        slide.chart.x_label ||
                        slide.chart.xLabel ||
                        slide.chart.y_label ||
                        slide.chart.yLabel
                      "
                      class="ppt-timeline-axis-hint"
                    >
                      <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                        slide.chart.x_label || slide.chart.xLabel
                      }}</span>
                      <template
                        v-if="
                          (slide.chart.x_label || slide.chart.xLabel) &&
                          (slide.chart.y_label || slide.chart.yLabel)
                        "
                      >
                        ·
                      </template>
                      <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                        slide.chart.y_label || slide.chart.yLabel
                      }}</span>
                    </div>
                    <div
                      v-for="(d, di) in slide.chart.data || []"
                      :key="'tl-ds-' + di"
                      class="ppt-timeline-item"
                    >
                      <div class="ppt-timeline-track">
                        <div
                          class="ppt-timeline-dot"
                          :style="{ background: getSeriesColor(di) }"
                        ></div>
                        <div
                          v-if="di < (slide.chart.data?.length || 0) - 1"
                          class="ppt-timeline-line"
                        ></div>
                      </div>
                      <div class="ppt-timeline-body">
                        <div
                          v-if="d.value != null && String(d.value) !== ''"
                          class="ppt-timeline-step"
                        >
                          {{ d.value }}
                        </div>
                        <div class="ppt-timeline-date">{{ d.label }}</div>
                        <div class="ppt-timeline-desc">
                          {{ d.description || d.desc || d.text || d.title || "" }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 仪表盘图 gauge -->
                  <svg
                    v-else-if="slide.chart.type === 'gauge'"
                    class="ppt-chart-svg ppt-gauge-svg"
                    viewBox="0 0 260 160"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <template v-if="gaugeData">
                      <path
                        :d="gaugeArcPath(1)"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        stroke-width="16"
                        stroke-linecap="round"
                      />
                      <path
                        :d="gaugeArcPath(gaugeData.ratio)"
                        fill="none"
                        :stroke="gaugeData.color"
                        stroke-width="16"
                        stroke-linecap="round"
                      />
                      <template
                        v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                        :key="'dgt' + ti"
                      >
                        <line
                          :x1="tick.x1"
                          :y1="tick.y1"
                          :x2="tick.x2"
                          :y2="tick.y2"
                          stroke="rgba(255,255,255,0.3)"
                          stroke-width="1"
                        />
                        <text
                          :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                          :y="tick.y2 + 3"
                          class="ppt-chart-label"
                          :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                          style="font-size: 8px"
                        >
                          {{ tick.label }}
                        </text>
                      </template>
                      <text
                        x="130"
                        y="115"
                        text-anchor="middle"
                        class="ppt-gauge-value"
                        :fill="gaugeData.color"
                      >
                        {{ gaugeData.value }}{{ gaugeData.unit }}
                      </text>
                      <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                        {{ gaugeData.label }}
                      </text>
                      <template v-if="gaugeData.target !== undefined">
                        <line
                          :x1="
                            130 +
                            95 *
                              Math.cos(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :y1="
                            130 +
                            95 *
                              Math.sin(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :x2="
                            130 +
                            108 *
                              Math.cos(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          :y2="
                            130 +
                            108 *
                              Math.sin(
                                Math.PI -
                                  ((gaugeData.target - gaugeData.min) /
                                    (gaugeData.max - gaugeData.min || 1)) *
                                    Math.PI
                              )
                          "
                          stroke="#fff"
                          stroke-width="2"
                        />
                      </template>
                    </template>
                  </svg>
                </div>
                <PptTableBlock
                  v-if="slide.table"
                  :table="slide.table"
                  :page-references="slide.page_references"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>
            </div>
            <!-- /ppt-content-split for data page with content+chart -->

            <!-- 仅有表格、无文字的 data 页（全宽表格） -->
            <div
              v-else-if="!isHeroLeftSlide(slide) && slide.table && !slide.chart"
              class="ppt-chart-area ppt-chart-area-full ppt-table-area-full"
            >
              <PptTableBlock
                :table="slide.table"
                :page-references="slide.page_references"
                @ref-click="onPptTableRefClick($event, slide)"
              />
            </div>
            <!-- 仅有图表、无文字的 data 页（全宽图表） -->
            <div
              v-else-if="slide.chart && !slide.table"
              class="ppt-chart-area ppt-chart-area-full"
              :class="{ 'ppt-chart-contained': isVisualOnlySlide(slide) }"
            >
              <div class="ppt-chart-title">{{ slide.chart.title }}</div>
              <PptChartSourceLine
                :chart="slide.chart"
                :page-references="slide.page_references"
              />

              <template v-if="slide.chart.type === 'bar'">
                <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                  <div
                    class="ppt-grouped-bar-legend"
                    v-if="groupedBarSeriesList.length"
                  >
                    <span
                      v-for="(s, si) in groupedBarSeriesList"
                      :key="'dfgl' + si"
                      class="ppt-grouped-bar-legend-item"
                    >
                      <span
                        class="ppt-pie-dot"
                        :style="{ background: getSeriesColor(si) }"
                      ></span
                      >{{ groupedBarSeriesLabel(s) }}
                    </span>
                  </div>
                  <svg
                    class="ppt-chart-svg"
                    viewBox="0 0 500 260"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      y="252"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'dfgyt' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
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
                    <template
                      v-for="(cat, ci) in groupedBarCategories"
                      :key="'dfgb-cat-' + ci"
                    >
                      <template
                        v-for="(s, si) in groupedBarSeriesList"
                        :key="'dfgb-bar-' + ci + '-' + si"
                      >
                        <rect
                          :x="groupedBarRectX(ci, si)"
                          :y="Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)"
                          :width="groupedBarRectWidth()"
                          :height="
                            Math.max(
                              1,
                              Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                            )
                          "
                          :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                          :class="[
                            'ppt-bar-rect',
                            groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                          ]"
                          rx="3"
                        />
                      </template>
                      <text
                        :x="groupedBarCategoryLabelX(ci)"
                        :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                groupedBarCategoryLabelX(ci),
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
                <svg
                  v-else
                  class="ppt-chart-svg"
                  viewBox="0 0 500 260"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="10"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 10, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="260"
                    y="252"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getBarYTicks()" :key="'dfbyt' + ti">
                    <text
                      x="48"
                      :y="mapBarY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
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
                  <template v-for="(d, di) in slide.chart.data" :key="'dfb' + di">
                    <rect
                      :x="55 + di * (400 / slide.chart.data.length)"
                      :y="Math.min(mapBarY(d.value), barZeroY)"
                      :width="(400 / slide.chart.data.length) * 0.65"
                      :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                      :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                      rx="3"
                    />
                    <!-- 柱子上方/下方显示数值 -->
                    <text
                      :x="
                        55 +
                        di * (400 / slide.chart.data.length) +
                        (400 / slide.chart.data.length) * 0.325
                      "
                      :y="
                        d.value >= 0
                          ? mapBarY(d.value) - 5
                          : mapBarY(d.value) + Math.abs(mapBarY(d.value) - barZeroY) + 12
                      "
                      class="ppt-chart-label"
                      text-anchor="middle"
                      fill="var(--ppt-chart-value)"
                    >
                      {{ formatTickValue(d.value) }}
                    </text>
                    <text
                      :x="
                        55 +
                        di * (400 / slide.chart.data.length) +
                        (400 / slide.chart.data.length) * 0.3
                      "
                      :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? chartXCatLabelTransform(
                              55 +
                                di * (400 / slide.chart.data.length) +
                                (400 / slide.chart.data.length) * 0.3,
                              BAR_CHART_X_CAT_Y_ROTATED
                            )
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ d.label }}
                    </text>
                  </template>
                </svg>
              </template>

              <!-- 组合图 combo（全宽 data 页） -->
              <svg
                v-else-if="slide.chart.type === 'combo'"
                class="ppt-chart-svg"
                viewBox="0 0 520 240"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  x="10"
                  y="120"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  transform="rotate(-90, 10, 120)"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.secondary_y_label"
                  x="510"
                  y="120"
                  class="ppt-axis-label ppt-axis-label-secondary"
                  text-anchor="middle"
                  transform="rotate(90, 510, 120)"
                >
                  {{ slide.chart.secondary_y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="275"
                  :y="COMBO_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <line
                  v-if="secondaryAxisStats.min < 0 && secondaryAxisStats.max > 0"
                  x1="55"
                  :y1="comboSecondaryZeroY"
                  x2="455"
                  :y2="comboSecondaryZeroY"
                  class="ppt-axis-zero-line"
                />
                <template v-for="(tick, ti) in getBarYTicks()" :key="'dfcyt' + ti">
                  <text
                    x="48"
                    :y="mapBarY(tick) + 4"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
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
                <template v-for="(pt, pi) in comboPrimaryPoints" :key="'dfcp' + pi">
                  <rect
                    :x="pt.x"
                    :y="pt.y"
                    :width="pt.w"
                    :height="pt.h"
                    :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                    rx="2"
                  />
                  <text
                    :x="pt.x + pt.w / 2"
                    :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    fill="var(--ppt-chart-value)"
                    style="font-size: 9px"
                  >
                    {{ formatTickValue(pt.value) }}
                  </text>
                  <text
                    :x="pt.x + pt.w / 2"
                    :y="
                      shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                    "
                    class="ppt-chart-label"
                    :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                    :transform="
                      shouldRotateLabels
                        ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                        : undefined
                    "
                    :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                  >
                    {{ pt.label }}
                  </text>
                </template>
                <polyline
                  :points="comboSecondaryLinePoints"
                  class="ppt-polyline ppt-line-secondary"
                  fill="none"
                />
                <template v-for="(dot, di) in comboSecondaryDots" :key="'dfcd' + di">
                  <circle
                    :cx="dot.cx"
                    :cy="dot.cy"
                    r="4"
                    class="ppt-line-dot ppt-dot-secondary"
                  />
                </template>
                <template
                  v-if="
                    slide.chart.primary_data_label || slide.chart.secondary_data_label
                  "
                >
                  <template v-if="slide.chart.primary_data_label">
                    <rect
                      x="55"
                      y="2"
                      width="12"
                      height="4"
                      rx="1"
                      class="ppt-bar-rect"
                    />
                    <text x="71" y="7" class="ppt-chart-legend-text">
                      {{ slide.chart.primary_data_label }}
                    </text>
                  </template>
                  <template v-if="slide.chart.secondary_data_label">
                    <line
                      :x1="slide.chart.primary_data_label ? 175 : 55"
                      y1="4"
                      :x2="slide.chart.primary_data_label ? 187 : 67"
                      y2="4"
                      class="ppt-polyline ppt-line-secondary"
                    />
                    <circle
                      :cx="slide.chart.primary_data_label ? 181 : 61"
                      cy="4"
                      r="2.5"
                      class="ppt-dot-secondary"
                    />
                    <text
                      :x="slide.chart.primary_data_label ? 193 : 73"
                      y="7"
                      class="ppt-chart-legend-text"
                    >
                      {{ slide.chart.secondary_data_label }}
                    </text>
                  </template>
                </template>
              </svg>

              <div
                v-else-if="slide.chart.type === 'line'"
                class="ppt-line-chart-wrap"
              >
                <div
                  v-if="lineChartLegendItems.length"
                  class="ppt-line-legend"
                >
                  <span
                    v-for="(sn, si) in lineChartLegendItems"
                    :key="'dfl-leg' + si"
                    class="ppt-line-legend-item"
                  >
                    <span
                      class="ppt-line-legend-dot"
                      :style="{ background: getSeriesColor(si) }"
                    ></span>
                    {{ sn }}
                  </span>
                </div>
                <svg
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  :x="LINE_CHART_Y_AXIS_LABEL_X"
                  :y="LINE_CHART_Y_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="265"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <!-- Y轴刻度 -->
                <template v-for="(tick, ti) in getLineYTicks()" :key="'dflyt' + ti">
                  <text
                    x="48"
                    :y="mapLineY(tick) + 4"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
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
                  <template
                    v-for="(s, si) in lineChartSeriesList"
                    :key="'dfml' + si"
                  >
                    <polyline
                      :points="lineSeriesPoints(si)"
                      class="ppt-polyline"
                      fill="none"
                      :style="chartStrokeStyle(si)"
                    />
                  </template>
                  <template
                    v-for="(cat, ci) in lineChartCategories"
                    :key="'dfxl' + ci"
                  >
                    <text
                      :x="lineCategoryLabelX(ci)"
                      :y="
                        shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                      "
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
                  <template
                    v-for="(s, si) in lineChartSeriesList"
                    :key="'dfld' + si"
                  >
                    <circle
                      v-for="(cat, ci) in lineChartCategories"
                      :key="'dfld' + si + '-' + ci"
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
                <template v-for="(d, di) in slide.chart.data" :key="'dfl' + di">
                  <circle
                    :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                    :cy="mapLineY(d.value)"
                    r="4"
                    class="ppt-line-dot"
                    :style="chartFillStyle(0)"
                  />
                  <circle
                    v-if="d.secondary_value !== undefined"
                    :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                    :cy="mapLineY(d.secondary_value ?? 0)"
                    r="4"
                    class="ppt-line-dot ppt-line-dot-secondary"
                    :style="chartFillStyle(1)"
                  />
                  <text
                    :x="55 + di * (400 / (slide.chart.data.length - 1))"
                    :y="
                      shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                    "
                    class="ppt-chart-label"
                    :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                    :transform="
                      shouldRotateLabels
                        ? `rotate(-45, ${
                            55 + di * (400 / (slide.chart.data.length - 1))
                          }, ${LINE_CHART_X_CAT_Y_ROTATED})`
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

              <template v-else-if="slide.chart.type === 'pie'">
              <svg
                class="ppt-chart-svg ppt-pie-svg"
                :viewBox="`0 0 ${PIE_CHART_LAYOUT_WIDE.viewW} ${PIE_CHART_LAYOUT_WIDE.viewH}`"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-for="(sl, si) in pieSlices" :key="'dfp' + si">
                  <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                  <line
                    :x1="sl.leaderX1"
                    :y1="sl.leaderY1"
                    :x2="sl.lx"
                    :y2="sl.ly"
                    class="ppt-pie-leader"
                  />
                  <text
                    :x="sl.tx"
                    :y="sl.ty"
                    :text-anchor="sl.anchor"
                    class="ppt-pie-label"
                    dominant-baseline="middle"
                  >
                    {{ sl.percent }}%
                  </text>
                </template>
                <template v-for="(sl, si) in pieSlices" :key="'dfpl' + si">
                  <rect
                    :x="PIE_CHART_LAYOUT_WIDE.legendX"
                    :y="10 + si * 22"
                    width="10"
                    height="10"
                    :fill="sl.color"
                    rx="2"
                  />
                  <text
                    :x="PIE_CHART_LAYOUT_WIDE.legendTextX"
                    :y="10 + si * 22 + 9"
                    class="ppt-pie-legend-text"
                  >
                    {{ sl.label }}
                  </text>
                </template>
              </svg>
              </template>

              <!-- ═══ 雷达图 radar (full-width data) ═══ -->
              <div v-else-if="slide.chart.type === 'radar'" class="ppt-radar-chart-wrap">
                <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                  <span
                    v-for="s in radarSeriesNorm"
                    :key="s.name"
                    class="ppt-radar-legend-item"
                  >
                    <span
                      class="ppt-radar-legend-dot"
                      :style="{ background: s.color }"
                    ></span>
                    {{ s.name }}
                  </span>
                </div>
                <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                  <polygon
                    v-for="(ring, ri) in radarGridPolygons"
                    :key="'dfrg' + ri"
                    :points="ring.points"
                    class="ppt-radar-grid"
                  />
                  <line
                    v-for="(ax, ai) in radarAxes"
                    :key="'dfra' + ai"
                    :x1="120"
                    :y1="90"
                    :x2="ax.x"
                    :y2="ax.y"
                    class="ppt-radar-axis"
                  />
                  <text
                    v-for="(ring, ri) in radarGridPolygons"
                    :key="'dfrv' + ri"
                    x="124"
                    :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                    class="ppt-radar-tick"
                  >
                    {{ ring.value }}
                  </text>
                  <g v-for="(series, si) in radarSeriesShapes" :key="'dfrs' + si">
                    <polygon
                      :points="series.points"
                      class="ppt-radar-series-fill"
                      :style="{ fill: series.color, stroke: series.color }"
                    />
                    <circle
                      v-for="(dot, di) in series.dots"
                      :key="'dfrd' + si + '-' + di"
                      :cx="dot.x"
                      :cy="dot.y"
                      r="3"
                      :style="{ fill: series.color }"
                    />
                  </g>
                  <text
                    v-for="(ax, ai) in radarAxes"
                    :key="'dfrl' + ai"
                    :x="ax.tx"
                    :y="ax.ty"
                    :text-anchor="ax.anchor"
                    class="ppt-radar-axis-label"
                    dominant-baseline="middle"
                  >
                    {{ ax.label }}
                  </text>
                </svg>
              </div>

              <!-- ═══ 瀑布图 waterfall (full-width data) ═══ -->
              <svg
                v-else-if="slide.chart.type === 'waterfall'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  :x="LINE_CHART_Y_AXIS_LABEL_X"
                  :y="LINE_CHART_Y_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="265"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <!-- Y轴刻度 -->
                <template v-for="(tick, ti) in getWaterfallYTicks()" :key="'dfwfyt' + ti">
                  <text
                    x="48"
                    :y="mapWaterfallY(tick) + 4"
                    class="ppt-chart-label"
                    text-anchor="end"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                  <line
                    x1="52"
                    :y1="mapWaterfallY(tick)"
                    x2="460"
                    :y2="mapWaterfallY(tick)"
                    stroke="var(--ppt-chart-grid)"
                    stroke-width="0.5"
                  />
                </template>
                <template v-for="(bar, bi) in waterfallBars" :key="'dfwf' + bi">
                  <rect
                    :x="55 + bi * (400 / waterfallBars.length) + 4"
                    :y="bar.y"
                    :width="400 / waterfallBars.length - 8"
                    :height="Math.max(2, bar.h)"
                    :class="[
                      'ppt-bar-rect',
                      bar.isTotal
                        ? 'ppt-bar-total'
                        : bar.isNegative
                        ? 'ppt-bar-negative'
                        : '',
                    ]"
                    rx="3"
                    opacity="0.88"
                  />
                  <text
                    :x="
                      55 +
                      bi * (400 / waterfallBars.length) +
                      400 / waterfallBars.length / 2
                    "
                    :y="bar.y - 5"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ bar.value }}
                  </text>
                  <text
                    :x="
                      55 +
                      bi * (400 / waterfallBars.length) +
                      400 / waterfallBars.length / 2
                    "
                    :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                    class="ppt-chart-label"
                    :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                    :transform="
                      shouldRotateLabels
                        ? chartXCatLabelTransform(
                            55 +
                              bi * (400 / waterfallBars.length) +
                              400 / waterfallBars.length / 2,
                            LINE_CHART_X_CAT_Y_ROTATED
                          )
                        : undefined
                    "
                    :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                  >
                    {{ bar.label }}
                  </text>
                </template>
              </svg>

              <!-- 散点图 scatter (full-width data) -->
              <svg
                v-else-if="slide.chart.type === 'scatter'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  x="10"
                  y="110"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  transform="rotate(-90, 10, 110)"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="255"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <template v-for="(tick, ti) in getScatterYTicks()" :key="'dfsy' + ti">
                  <line
                    :x1="55"
                    :y1="mapScatterY(tick)"
                    :x2="455"
                    :y2="mapScatterY(tick)"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="1"
                  />
                  <text
                    :x="50"
                    :y="mapScatterY(tick) + 3"
                    class="ppt-chart-label"
                    text-anchor="end"
                    style="font-size: 9px"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                </template>
                <template v-for="(tick, ti) in getScatterXTicks()" :key="'dfsx' + ti">
                  <line
                    :x1="mapScatterX(tick)"
                    :y1="25"
                    :x2="mapScatterX(tick)"
                    :y2="195"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="1"
                  />
                  <text
                    :x="mapScatterX(tick)"
                    :y="LINE_CHART_X_CAT_Y"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ formatTickValue(tick) }}
                  </text>
                </template>
                <template v-for="(pt, pi) in scatterPoints" :key="'dfsp' + pi">
                  <circle
                    :cx="pt.svgX"
                    :cy="pt.svgY"
                    r="5"
                    :fill="pt.color"
                    fill-opacity="0.8"
                    stroke="#fff"
                    stroke-width="0.5"
                  />
                  <text
                    :x="pt.svgX"
                    :y="pt.svgY - 8"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 8px"
                  >
                    {{ pt.label }}
                  </text>
                </template>
              </svg>
              <!-- 热力图 heatmap (full-width data) -->
              <svg
                v-else-if="slide.chart.type === 'heatmap'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  v-if="slide.chart.y_label"
                  x="8"
                  y="110"
                  class="ppt-axis-label"
                  text-anchor="middle"
                  transform="rotate(-90, 8, 110)"
                >
                  {{ slide.chart.y_label }}
                </text>
                <text
                  v-if="slide.chart.x_label"
                  x="260"
                  :y="LINE_CHART_X_AXIS_LABEL_Y"
                  class="ppt-axis-label"
                  text-anchor="middle"
                >
                  {{ slide.chart.x_label }}
                </text>
                <text
                  v-for="(col, ci) in heatmapParsed?.cols || []"
                  :key="'dfhc' + ci"
                  :x="
                    60 +
                    ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                    400 / (heatmapParsed?.cols?.length || 1) / 2
                  "
                  y="20"
                  class="ppt-chart-label"
                  text-anchor="middle"
                  style="font-size: 9px"
                >
                  {{ col }}
                </text>
                <text
                  v-for="(row, ri) in heatmapParsed?.rows || []"
                  :key="'dfhr' + ri"
                  x="56"
                  :y="
                    25 +
                    ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                    175 / (heatmapParsed?.rows?.length || 1) / 2 +
                    3
                  "
                  class="ppt-chart-label"
                  text-anchor="end"
                  style="font-size: 9px"
                >
                  {{ row }}
                </text>
                <template v-for="(cell, ci) in heatmapCells" :key="'dfhv' + ci">
                  <rect
                    :x="cell.svgX + 1"
                    :y="cell.svgY + 1"
                    :width="Math.max(cell.width - 2, 1)"
                    :height="Math.max(cell.height - 2, 1)"
                    :fill="cell.color"
                    rx="2"
                    opacity="0.85"
                  />
                  <text
                    :x="cell.svgX + cell.width / 2"
                    :y="cell.svgY + cell.height / 2 + 3"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px; fill: #fff; font-weight: 600"
                  >
                    {{ cell.value }}
                  </text>
                </template>
              </svg>
              <!-- 树形图 treemap (full-width data) -->
              <svg
                v-else-if="slide.chart.type === 'treemap'"
                class="ppt-chart-svg"
                :viewBox="LINE_CHART_VIEWBOX"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-for="(rect, ri) in treemapRects" :key="'dftr' + ri">
                  <rect
                    :x="rect.x + 1"
                    :y="rect.y + 1"
                    :width="Math.max(rect.width - 2, 1)"
                    :height="Math.max(rect.height - 2, 1)"
                    :fill="rect.color"
                    rx="3"
                    opacity="0.88"
                  />
                  <text
                    v-if="rect.width > 30 && rect.height > 20"
                    :x="rect.x + rect.width / 2"
                    :y="rect.y + rect.height / 2 - 4"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 10px; fill: #fff; font-weight: 600"
                  >
                    {{ rect.label }}
                  </text>
                  <text
                    v-if="rect.width > 30 && rect.height > 30"
                    :x="rect.x + rect.width / 2"
                    :y="rect.y + rect.height / 2 + 10"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                  >
                    {{ rect.value }} ({{ rect.percent }}%)
                  </text>
                </template>
              </svg>
              <div
                v-else-if="isTimelineChart(slide.chart)"
                class="ppt-timeline-chart ppt-timeline-chart--full"
              >
                <div
                  v-if="
                    slide.chart.x_label ||
                    slide.chart.xLabel ||
                    slide.chart.y_label ||
                    slide.chart.yLabel
                  "
                  class="ppt-timeline-axis-hint"
                >
                  <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                    slide.chart.x_label || slide.chart.xLabel
                  }}</span>
                  <template
                    v-if="
                      (slide.chart.x_label || slide.chart.xLabel) &&
                      (slide.chart.y_label || slide.chart.yLabel)
                    "
                  >
                    ·
                  </template>
                  <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                    slide.chart.y_label || slide.chart.yLabel
                  }}</span>
                </div>
                <div
                  v-for="(d, di) in slide.chart.data || []"
                  :key="'tl-df-' + di"
                  class="ppt-timeline-item"
                >
                  <div class="ppt-timeline-track">
                    <div
                      class="ppt-timeline-dot"
                      :style="{ background: getSeriesColor(di) }"
                    ></div>
                    <div
                      v-if="di < (slide.chart.data?.length || 0) - 1"
                      class="ppt-timeline-line"
                    ></div>
                  </div>
                  <div class="ppt-timeline-body">
                    <div
                      v-if="d.value != null && String(d.value) !== ''"
                      class="ppt-timeline-step"
                    >
                      {{ d.value }}
                    </div>
                    <div class="ppt-timeline-date">{{ d.label }}</div>
                    <div class="ppt-timeline-desc">
                      {{ d.description || d.desc || d.text || d.title || "" }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- 仪表盘图 gauge (full-width data) -->
              <svg
                v-else-if="slide.chart.type === 'gauge'"
                class="ppt-chart-svg ppt-gauge-svg"
                viewBox="0 0 260 160"
                preserveAspectRatio="xMidYMid meet"
              >
                <template v-if="gaugeData">
                  <path
                    :d="gaugeArcPath(1)"
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    stroke-width="16"
                    stroke-linecap="round"
                  />
                  <path
                    :d="gaugeArcPath(gaugeData.ratio)"
                    fill="none"
                    :stroke="gaugeData.color"
                    stroke-width="16"
                    stroke-linecap="round"
                  />
                  <template
                    v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                    :key="'dfgt' + ti"
                  >
                    <line
                      :x1="tick.x1"
                      :y1="tick.y1"
                      :x2="tick.x2"
                      :y2="tick.y2"
                      stroke="rgba(255,255,255,0.3)"
                      stroke-width="1"
                    />
                    <text
                      :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                      :y="tick.y2 + 3"
                      class="ppt-chart-label"
                      :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                      style="font-size: 8px"
                    >
                      {{ tick.label }}
                    </text>
                  </template>
                  <text
                    x="130"
                    y="115"
                    text-anchor="middle"
                    class="ppt-gauge-value"
                    :fill="gaugeData.color"
                  >
                    {{ gaugeData.value }}{{ gaugeData.unit }}
                  </text>
                  <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                    {{ gaugeData.label }}
                  </text>
                  <template v-if="gaugeData.target !== undefined">
                    <line
                      :x1="
                        130 +
                        95 *
                          Math.cos(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :y1="
                        130 +
                        95 *
                          Math.sin(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :x2="
                        130 +
                        108 *
                          Math.cos(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      :y2="
                        130 +
                        108 *
                          Math.sin(
                            Math.PI -
                              ((gaugeData.target - gaugeData.min) /
                                (gaugeData.max - gaugeData.min || 1)) *
                                Math.PI
                          )
                      "
                      stroke="#fff"
                      stroke-width="2"
                    />
                  </template>
                </template>
              </svg>
            </div>

            <!-- 仅有 content、无 chart/table 的 data 页 -->
            <ul
              v-else-if="shouldShowContentBullets(slide) && !hasBodyPrimaryVisual(slide)"
              class="ppt-bullet-list ppt-data-notes"
            >
              <li
                v-for="(item, bi) in resolveSlideBulletItems(slide)"
                :key="bi"
                class="ppt-bullet-item"
              >
                <span class="ppt-bullet-dot"></span>
                <PptMarkdownInline
                  :text="displayText(item)"
                  :editable="isEditing"
                  @blur="onContentItemBlur($event, currentSlide, bi)"
                />
              </li>
            </ul>

            <PptMarkdownInline
              v-if="slide.data_source_line || isEditing"
              class="ppt-data-source-line"
              :text="slide.data_source_line || ''"
              :page-references="slide.page_references"
              :editable="isEditing"
              @blur="onDataSourceLineBlur($event, currentSlide)"
              @ref-click="onPptTableRefClick($event, slide)"
            />
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- quote 引言页 -->
          <div
            v-else-if="slide.layout === 'quote'"
            class="ppt-slide ppt-quote"
          >
            <div class="ppt-quote-mark">"</div>
            <PptMarkdownInline
              class="ppt-quote-text"
              :text="
                slide.quote || (slide.content && slide.content[0]) || slide.title || ''
              "
              :editable="isEditing"
              @blur="onCellBlur($event, `slides.${currentSlide}.quote`)"
            />
            <div
              v-if="slide.quote_author || slide.author || isEditing"
              class="ppt-quote-author"
              :contenteditable="isEditing"
              @blur="onCellBlur($event, `slides.${currentSlide}.quote_author`)"
            >
              — {{ slide.quote_author || slide.author }}
            </div>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- end 结束页 -->
          <div
            v-else-if="slide.layout === 'end'"
            class="ppt-slide ppt-end"
          >
            <div class="ppt-end-icon">🎉</div>
            <h2 class="ppt-end-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>
            <p v-if="slide.subtitle || isEditing" class="ppt-end-sub">
              <PptMarkdownInline
                :text="slide.subtitle || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
              />
            </p>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>

          <!-- 兜底：未知 layout -->
          <div
            v-else
            class="ppt-slide ppt-content"
          >
            <h2 class="ppt-slide-title">
              <PptMarkdownInline
                :text="slide.title || ''"
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
              />
            </h2>
            <ul class="ppt-bullet-list">
              <li
                v-for="(item, bi) in slide.content || []"
                :key="bi"
                class="ppt-bullet-item"
              >
                <span class="ppt-bullet-dot"></span>
                <PptMarkdownInline
                  :text="displayText(item)"
                  :editable="isEditing"
                  @blur="onContentItemBlur($event, currentSlide, bi)"
                />
              </li>
            </ul>
            <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
          </div>
        </template>
      </div>

      <div v-if="showSpeakerNotesBar" class="ppt-speaker-notes-pane">
        <div class="ppt-speaker-notes-label">{{ t("agent.pptSpeakerNotes") }}</div>
        <div class="ppt-speaker-notes-content">{{ slideSpeakerNotesText }}</div>
      </div>
    </div>

    <!-- 缩略图导航 -->
    <div class="ppt-thumbs">
      <button
        v-for="(s, si) in pptSource.slides"
        :key="si"
        class="ppt-thumb"
        :class="{ 'ppt-thumb-active': currentSlide === si }"
        @click="currentSlide = si"
      >
        <span class="ppt-thumb-num">{{ si + 1 }}</span>
        <span class="ppt-thumb-label">{{ s.title ? s.title.slice(0, 8) : "" }}</span>
      </button>
    </div>

    <PptContextMenu
      :show="pptContextMenuVisible"
      :x="pptContextMenuX"
      :y="pptContextMenuY"
      :selection-text="pptContextSelection"
      @related-search="onPptRelatedSearch"
      @custom-search="onPptCustomSearch"
      @close="closePptContextMenu"
    />
    <PptRelatedSearchPanel
      :visible="relatedSearchState.visible"
      :term="relatedSearchState.term"
      :content="relatedSearchState.content"
      :image-results="relatedSearchState.imageResults"
      :loading="relatedSearchState.loading"
      :error="relatedSearchState.error"
      :is-rag-response="relatedSearchState.isRagResponse"
      :knowledge-based="relatedSearchState.knowledgeBased"
      :is-search-response="relatedSearchState.isSearchResponse"
      :search-context="pptRelatedSearchContext"
      @close="onRelatedSearchPanelClose"
    />
    <PptRelatedSearchPanel
      v-if="chatHistoryDetail.visible"
      :visible="chatHistoryDetail.visible"
      :term="chatHistoryDetail.term"
      :content="chatHistoryDetail.content"
      :loading="false"
      :error="null"
      :search-context="pptRelatedSearchContext"
      @close="closeChatHistoryDetail"
    />
  </div>

    <PptChatHistoryRail
      v-if="showChatHistoryRail && !isPresentationFullscreen"
      v-model:collapsed="chatHistoryRailCollapsed"
      :items="chatHistoryRailItems"
      @open-detail="openChatHistoryDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import {
  buildFontFamilyCss,
  ensureExportFontsReady,
  loadFont,
  parseFontFamilyCssStack,
} from "@/composables/useFontLoader";
import { findRuntimeCustomFontEntry } from "@/utils/runtimeCustomFontRegistry";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptChapterImages from "@/components/editor/chat/PptChapterImages.vue";
import PptTableBlock from "@/components/editor/chat/PptTableBlock.vue";
import type { PptTable } from "@/components/editor/chat/PptTableBlock.vue";
import PptMetricCardsRow from "@/components/editor/chat/PptMetricCardsRow.vue";
import PptChartSourceLine from "@/components/editor/chat/PptChartSourceLine.vue";
import PptContextMenu from "@/components/editor/chat/PptContextMenu.vue";
import PptRelatedSearchPanel from "@/components/editor/chat/PptRelatedSearchPanel.vue";
import PptChatHistoryRail from "@/components/editor/chat/PptChatHistoryRail.vue";
import { usePptRelatedSearch, type PptRelatedSearchContext } from "@/composables/usePptRelatedSearch";
import {
  mergeRelatedSearchAnswersIntoDisplay,
  type ChatHistoryDisplayItem,
  type RelatedSearchSessionEntry,
} from "@/utils/pptChatHistoryDisplay";
import { uploadedDocumentsFromPptData } from "@/utils/pptDocumentRag";
import { buildExploreProjectShareUrl } from "@/utils/feedOpen";
import { gtmRelatedSearch } from "@/composables/useGtmDataLayer";
import { resolveContextSelectionText } from "@/utils/pptContextSelection";
import {
  canvasToExportBlob,
  disposeExportCanvas,
  pinPptExportTypography,
  pptExportImageExtension,
  prepareHtml2CanvasClone,
  prepareSlideCanvasesForLongExport,
  PPT_EXPORT_LONG_TARGET_SIZE_RATIO,
  resetPptExportSession,
  stitchCanvasesVertically,
} from "@/utils/pptExportHtml2Canvas";
import type { PptPageReference } from "@/utils/pptInlineMarkdown";
import {
  buildPptxBulletTextRuns,
  pptInlineMarkdownToPptxRuns,
  stripPptInlineMarkdown,
} from "@/utils/pptInlineMarkdown";
import {
  resolvePptDeckFontFamilyFromData,
  resolvePptxFontFace,
} from "@/utils/pptDisplayFont";
import {
  getChapterDecorationByKey,
  getCoverDecorationByIndex,
  pickRandomCoverDecorationIndex,
} from "@/utils/pptCoverDecorations";
import {
  buildChapterImageIndex,
  findChapterForSlide,
  getChapterImagesForSlide,
  hasDocumentFigurePage,
  isChapterImagePage,
  normalizeDocumentFigure,
  parseColumnSplit,
  resolveChapterSlideBackdropUrl,
  resolveContentSplitIndex,
  resolveSectionSubtitle,
  resolveSlideChapterImages,
  resolveSlideVisual,
  shouldShowChapterSideImage as shouldShowChapterSideImageLayout,
  type DocumentFigure,
  type PptChapterImages as PptChapterImagesBlock,
  type PptSearchImage,
} from "@/utils/pptChapterImages";
import {
  buildPptThemeStyleVars,
  formatPptTemplateDebugLabel,
  resolvePptSchemeIsLight,
  syncPptGoogleFontLinks,
  type PptThemeTokens,
} from "@/utils/pptThemeTokens";

interface ChartDataItem {
  label?: string;
  /** 漏斗图阶段名（后端常用 stage 而非 label） */
  stage?: string;
  value: number;
  secondary_value?: number;
  tertiary_value?: number;
  values?: number[];
  /** timeline 等：事件说明 */
  description?: string;
  desc?: string;
  text?: string;
  title?: string;
  // radar series format: { name, values[] }
  name?: string;
  // waterfall: total bar marker
  is_total?: boolean;
  // scatter: x/y pair
  x?: number;
  y?: number;
  // treemap: children hierarchy
  children?: ChartDataItem[];
}

/** heatmap 矩阵数据 */
interface HeatmapMatrixItem {
  row: string;
  col: string;
  value: number;
}

interface HeatmapData {
  rows: string[];
  cols: string[];
  values: number[][];  // values[rowIdx][colIdx]
}

interface SecondaryDataItem {
  label: string;
  value: number;
}

interface PptChart {
  type:
    | "bar"
    | "line"
    | "pie"
    | "radar"
    | "combo"
    | "stacked_bar"
    | "horizontal_bar"
    | "area"
    | "funnel"
    | "waterfall"
    | "scatter"
    | "heatmap"
    | "treemap"
    | "gauge"
    | "timeline";
  title?: string;
  /** 图表下方说明（如漏斗累计解读） */
  note?: string;
  /** 数据来源说明（经后端清洗，无 source_refs 时表示内部估算） */
  source?: string;
  /** 可点击引用的 ref_id 列表，对应 slide.page_references */
  source_refs?: number[];
  x_label?: string;
  y_label?: string;
  xLabel?: string;
  yLabel?: string;
  secondary_y_label?: string;
  data: ChartDataItem[];
  labels?: string[]; // radar: axis labels (new format)
  categories?: string[];
  /** combo：主系列平行数值数组（与 categories 对齐） */
  primary_data?: number[];
  series_names?: string[];
  primary_data_label?: string;
  secondary_data_label?: string;
  /** 后端别名 */
  secondary_label?: string;
  primary_label?: string;
  tertiary_data_label?: string;
  secondary_data?: SecondaryDataItem[];
  // heatmap 专用
  matrix_data?: HeatmapMatrixItem[];
  rows?: string[];
  cols?: string[];
  // gauge 专用
  min_value?: number;
  max_value?: number;
  target_value?: number;
  unit?: string;
  /** stacked_bar：分段标签是否显示为百分比（默认根据 y_label / unit 推断） */
  stacked_segment_as_percent?: boolean;
  /** 图表系列色（优先于 palette.accent_colors） */
  colors?: string[];
}

interface PptSlide {
  index: number;
  layout:
    | "cover"
    | "section"
    | "content"
    | "two_column"
    | "data"
    | "quote"
    | "end"
    | "toc"
    | "references"
    | string;
  title: string;
  subtitle?: string;
  content?: string[];
  sources?: Array<{ title?: string; url?: string } | string>;
  left_title?: string;
  left_content?: string[];
  right_title?: string;
  right_content?: string[];
  /** 强调布局，如 content_split、metric_cards_row */
  emphasis_layout?: string;
  /** 页底数据来源一行 */
  data_source_line?: string;
  /** 后端可能发送结构化的右栏卡片列表（index + title + description） */
  right_items?: Array<{
    index?: string;
    icon?: string;
    title?: string;
    description?: string;
    accent_color?: string;
    highlight?: boolean;
    emphasis?: boolean;
  }>;
  /** 后端在 section 页提供的章节编号，如 "01"、"03" */
  chapter_number?: string;
  /** 后端可能提供英文副标题 */
  subtitle_en?: string;
  chart?: PptChart;
  /** 结构化表格（与 chart 互斥，由后端保证不同页同时出现） */
  table?: PptTable;
  /** 表格单元格 [N] 引用角标对应的来源链接 */
  page_references?: PptPageReference[];
  quote?: string;
  quote_author?: string;
  author?: string;
  organization?: string;
  date?: string;
  speaker_notes?: string;
  /** 页底品牌标识，如 page2.top */
  brand_footer?: string;
  image_prompt?: string;
  /** AI 生图背景（仅 cover/section 及 chapter_image_page 线使用） */
  image_url?: string;
  /** PDF/RAG 原文插图（右栏 figure，禁止作全页背景） */
  document_figure?: DocumentFigure | null;
  /** 章节配图页 images[] */
  images?: PptSearchImage[];
  /** @deprecated 过渡期归一化到 document_figure */
  source_document_image?: boolean | Record<string, unknown>;
  /** @deprecated 过渡期图注见 document_figure.caption */
  image_caption?: string;
  /** 章节联网配图（section 页或由 ppt_data.chapter_images 索引） */
  chapter_images?: PptSearchImage[];
  column_split?: number | string;
  /** 图表关键洞察 */
  key_insight?: string;
  /** 指标卡片（emphasis_layout: metric_cards_row，content/data 页均可用） */
  metric_cards?: Array<{
    value?: string;
    label?: string;
    detail?: string;
    source?: string;
    source_ref?: number | number[];
    accent_color?: string;
  }>;
  /** 目录页结构化条目（优先于 content 字符串列表） */
  toc_items?: Array<{
    number?: string;
    icon?: string;
    title?: string;
    description?: string;
  }>;
  /** content/data 页顶部大号 KPI（如 117 个 AI+办公软件） */
  hero_metric?: {
    value?: string;
    caption?: string;
    accent_color?: string;
  };
}

interface PptTocEntry {
  number: string;
  title: string;
  description: string;
  icon?: string;
  /** content 字符串模式下的原始条目，供编辑 */
  raw?: string;
}

/** 后端通过 ppt_complete 事件返回的调色板 */
interface PptPalette {
  bg_color?: string; // 主背景色，如 "#0d1b2a"
  bg_color_secondary?: string; // 辅助背景色，如 "#1b2838"
  accent_color?: string; // 强调色（标题/编号），如 "#4da8da"
  /** 多色 KPI / 图表系列色板（sakura-chroma 等模板 2–5 色） */
  accent_colors?: string[];
  text_color?: string; // 正文字体色，如 "#e0e6ed"
  text_secondary?: string; // 副文字色，如 "#8899aa"
  /** 细粒度 CSS 变量，键名可带或不带 -- 前缀 */
  css_variables?: Record<string, string>;
  mood?: string;
  label?: string;
  /** HTML 模板 theme_tokens：字体、圆角、明暗 scheme */
  theme_tokens?: PptThemeTokens;
}

/** LLM 选版元数据（与 palette 重叠，便于调试） */
interface PptHtmlTemplateRecommendation {
  template_id?: string;
  template_path?: string;
  pick_source?: string;
  accent_colors?: string[];
  css_variables?: Record<string, string>;
  palette_from_html_template?: Partial<PptPalette>;
}

interface PptData {
  title: string;
  subtitle?: string;
  /** 全 deck 默认页脚（单页 brand_footer 优先） */
  brand_footer?: string;
  theme?: string;
  palette?: PptPalette;
  html_template_recommendation?: PptHtmlTemplateRecommendation;
  /** 结构化章节配图（优先于 slide.chapter_images） */
  chapter_images?: PptChapterImagesBlock[];
  total_slides: number;
  slides: PptSlide[];
}

const props = defineProps<{
  pptData: PptData;
  initialSlide?: number;
  /** 项目 ID，用于生成 /explore/project/{id} 分享链接 */
  projectId?: string;
  /** 右侧栏展示项（由 ProjectPreview 经 buildPptChatHistoryDisplay 整理） */
  chatHistory?: ChatHistoryDisplayItem[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:pptData", data: PptData): void;
  (e: "related-search-recorded", entries: RelatedSearchSessionEntry[]): void;
}>();

const chatHistoryRailCollapsed = ref(false);
const relatedSearchSessionEntries = ref<RelatedSearchSessionEntry[]>([]);
const { t, locale } = useI18n();

const MOBILE_LAYOUT_MAX = 767;

const chatHistoryRailItems = computed(() => {
  const base = Array.isArray(props.chatHistory) ? props.chatHistory : [];
  return mergeRelatedSearchAnswersIntoDisplay(base, relatedSearchSessionEntries.value, {
    relatedAsk: (term) => t("workspace.chatHistoryPanel.relatedAsk", { term }),
    noAnswer: t("workspace.chatHistoryPanel.noAnswer"),
  });
});

const showChatHistoryRail = computed(() => chatHistoryRailItems.value.length > 0);

function syncMobileChrome() {
  if (typeof window === "undefined") return;
  if (window.innerWidth <= MOBILE_LAYOUT_MAX && showChatHistoryRail.value) {
    chatHistoryRailCollapsed.value = true;
  }
}

watch(showChatHistoryRail, () => syncMobileChrome());
const currentSlide = ref(props.initialSlide ?? 0);
const viewerRef = ref<HTMLElement | null>(null);
const slideWrapperRef = ref<HTMLElement | null>(null);
const exporting = ref(false);
const exportMessage = ref("");
const shareMenuOpen = ref(false);
const shareMenuRef = ref<HTMLElement | null>(null);
const isPresentationFullscreen = ref(false);
const presentationScale = ref(1);
let slideWrapperResizeObserver: ResizeObserver | null = null;

const pptContextMenuVisible = ref(false);
const pptContextMenuX = ref(0);
const pptContextMenuY = ref(0);
const pptContextSelection = ref("");
const {
  state: relatedSearchState,
  runRelatedSearch,
  closePanel: closeRelatedSearchPanel,
  closeStream: closeRelatedSearchStream,
} = usePptRelatedSearch();

const pptRelatedSearchContext = computed((): PptRelatedSearchContext => ({
  pptTitle: props.pptData.title,
  projectId: props.projectId,
  slideIndex: currentSlide.value,
  uploadedDocuments: uploadedDocumentsFromPptData(props.pptData),
  buildMessage: buildPptRelatedSearchMessage,
}));

function onPptSlideContextMenu(event: MouseEvent) {
  pptContextSelection.value = resolveContextSelectionText(event);
  pptContextMenuX.value = event.clientX;
  pptContextMenuY.value = event.clientY;
  pptContextMenuVisible.value = true;
}

function closePptContextMenu() {
  pptContextMenuVisible.value = false;
}

function onPptContextMenuPointerDown(event: PointerEvent) {
  if (!pptContextMenuVisible.value) return;
  const target = event.target as Element | null;
  if (target?.closest?.(".ppt-context-menu")) return;
  closePptContextMenu();
}

function buildPptRelatedSearchMessage(term: string, pptTitle?: string): string {
  const q = term.trim();
  const title = String(pptTitle || "").trim();
  if (title) {
    return t("agent.pptRelatedSearchPromptWithTitle", { title, term: q });
  }
  return t("agent.pptRelatedSearchPromptGeneric", { term: q });
}

const chatHistoryDetail = ref<{ visible: boolean; term: string; content: string }>({
  visible: false,
  term: "",
  content: "",
});

function openChatHistoryDetail(payload: { term?: string; content?: string }) {
  const content = String(payload?.content || "").trim();
  if (!content) return;
  chatHistoryDetail.value = {
    visible: true,
    term: String(payload?.term || "").trim(),
    content,
  };
}

function closeChatHistoryDetail() {
  chatHistoryDetail.value.visible = false;
}

function recordRelatedSearchSession(term: string) {
  const q = term.trim();
  if (!q) return;
  const s = relatedSearchState.value;
  const content = String(s.content || "").trim();
  const error = s.error ? String(s.error) : undefined;
  if (!content && !error) return;

  const key = q.toLowerCase();
  const entry: RelatedSearchSessionEntry = { term: q, content, error };
  const idx = relatedSearchSessionEntries.value.findIndex(
    (e) => e.term.trim().toLowerCase() === key,
  );
  if (idx >= 0) {
    relatedSearchSessionEntries.value[idx] = entry;
  } else {
    relatedSearchSessionEntries.value.push(entry);
  }
  if (content && props.projectId) {
    gtmRelatedSearch(String(props.projectId), q.length);
  }
  emit("related-search-recorded", [...relatedSearchSessionEntries.value]);
}

async function runPptRelatedSearch(term: string) {
  const q = term.trim();
  if (!q) {
    ElMessage.warning(t("agent.pptRelatedSearchSelectText"));
    return;
  }
  closePptContextMenu();
  await runRelatedSearch({
    term: q,
    pptTitle: props.pptData.title,
    projectId: props.projectId,
    slideIndex: currentSlide.value,
    uploadedDocuments: uploadedDocumentsFromPptData(props.pptData),
    buildMessage: buildPptRelatedSearchMessage,
  });
  recordRelatedSearchSession(q);
}

async function onPptRelatedSearch() {
  await runPptRelatedSearch(pptContextSelection.value);
}

async function onPptCustomSearch(term: string) {
  await runPptRelatedSearch(term);
}

function onRelatedSearchPanelClose() {
  closeRelatedSearchPanel();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function updatePresentationScale() {
  const wrapper = slideWrapperRef.value;
  if (!wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  if (rect.width <= 0) return;
  // 720px approximates the embedded preview width; fullscreen grows from that baseline.
  presentationScale.value = clampNumber(rect.width / 720, 1, 2.4);
}

function observeSlideWrapperSize() {
  slideWrapperResizeObserver?.disconnect();
  const wrapper = slideWrapperRef.value;
  if (!wrapper || typeof ResizeObserver === "undefined") return;
  slideWrapperResizeObserver = new ResizeObserver(() => updatePresentationScale());
  slideWrapperResizeObserver.observe(wrapper);
}

function getPresentationFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

const PPT_PRESENTATION_HTML_CLASS = "ppt-presentation-active";

function setPresentationHtmlLock(active: boolean) {
  document.documentElement.classList.toggle(PPT_PRESENTATION_HTML_CLASS, active);
}

function syncPresentationFullscreenState() {
  const root = viewerRef.value;
  const inNativeFs = root != null && getPresentationFullscreenElement() === root;
  if (!inNativeFs && isPresentationFullscreen.value) {
    isPresentationFullscreen.value = false;
    setPresentationHtmlLock(false);
  } else if (inNativeFs) {
    isPresentationFullscreen.value = true;
    setPresentationHtmlLock(true);
    void nextTick(updatePresentationScale);
  }
}

async function exitNativePresentationFullscreen() {
  try {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    if (document.fullscreenElement != null && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitFullscreenElement != null && doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

async function enterNativePresentationFullscreen() {
  const el = viewerRef.value;
  if (!el) return;
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (anyEl.requestFullscreen) {
      await anyEl.requestFullscreen();
    } else if (anyEl.webkitRequestFullscreen) {
      await anyEl.webkitRequestFullscreen();
    }
  } catch {
    /* 浏览器拒绝原生全屏时仍依赖 CSS 演示模式 */
  }
}

async function exitPresentationMode() {
  isPresentationFullscreen.value = false;
  setPresentationHtmlLock(false);
  await exitNativePresentationFullscreen();
}

async function enterPresentationMode() {
  setPresentationHtmlLock(true);
  await enterNativePresentationFullscreen();
  // 先等原生全屏，再开 CSS 演示类，避免先 fixed 再 :fullscreen 导致高度连跳两次
  isPresentationFullscreen.value = true;
  await nextTick();
  updatePresentationScale();
  viewerRef.value?.focus();
}

async function togglePresentationFullscreen() {
  if (isPresentationFullscreen.value) {
    await exitPresentationMode();
  } else {
    await enterPresentationMode();
  }
}

function isPptKeyNavTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true'], [contenteditable='']"));
}

function shouldHandlePptViewerKeys(): boolean {
  const root = viewerRef.value;
  if (!root) return false;
  if (isPresentationFullscreen.value) return true;
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  return root === active || root.contains(active);
}

function goToPrevSlide() {
  currentSlide.value = Math.max(0, currentSlide.value - 1);
}

function goToNextSlide() {
  const max = Math.max(0, pptSource.value.slides.length - 1);
  currentSlide.value = Math.min(max, currentSlide.value + 1);
}

function onPptViewerKeydown(e: KeyboardEvent) {
  if (isPptKeyNavTypingTarget(e.target)) return;
  if (!shouldHandlePptViewerKeys()) return;

  if (e.key === "Escape") {
    if (pptContextMenuVisible.value) {
      e.preventDefault();
      closePptContextMenu();
      return;
    }
    if (isPresentationFullscreen.value) {
      e.preventDefault();
      void exitPresentationMode();
      return;
    }
  }

  const isPrev = e.key === "ArrowLeft" || e.key === "ArrowUp";
  const isNext = e.key === "ArrowRight" || e.key === "ArrowDown";
  if (!isPrev && !isNext) return;

  e.preventDefault();
  if (isPrev) {
    if (currentSlide.value > 0) goToPrevSlide();
    return;
  }
  if (currentSlide.value < pptSource.value.slides.length - 1) goToNextSlide();
}

onMounted(() => {
  document.addEventListener("fullscreenchange", syncPresentationFullscreenState);
  document.addEventListener(
    "webkitfullscreenchange",
    syncPresentationFullscreenState as EventListener
  );
  document.addEventListener("pointerdown", onShareMenuPointerDown);
  document.addEventListener("pointerdown", onPptContextMenuPointerDown);
  window.addEventListener("keydown", onPptViewerKeydown);
  window.addEventListener("resize", updatePresentationScale);
  window.addEventListener("resize", syncMobileChrome);
  syncMobileChrome();
  nextTick(() => {
    viewerRef.value?.focus();
    observeSlideWrapperSize();
    updatePresentationScale();
  });
});

onBeforeUnmount(() => {
  syncPptGoogleFontLinks([]);
  document.removeEventListener("fullscreenchange", syncPresentationFullscreenState);
  document.removeEventListener(
    "webkitfullscreenchange",
    syncPresentationFullscreenState as EventListener
  );
  document.removeEventListener("pointerdown", onShareMenuPointerDown);
  document.removeEventListener("pointerdown", onPptContextMenuPointerDown);
  closeRelatedSearchStream();
  closePptContextMenu();
  window.removeEventListener("keydown", onPptViewerKeydown);
  window.removeEventListener("resize", updatePresentationScale);
  window.removeEventListener("resize", syncMobileChrome);
  slideWrapperResizeObserver?.disconnect();
  slideWrapperResizeObserver = null;
  if (isPresentationFullscreen.value) {
    void exitPresentationMode();
  }
});

/** 识别 timeline 图（兼容大小写、空格、下划线变体） */
function isTimelineChart(chart: { type?: unknown } | null | undefined): boolean {
  if (!chart || chart.type == null) return false;
  const t = String(chart.type)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return t === "timeline" || t === "time_line";
}

// ── 编辑模式（始终可编辑，点击文字即可修改） ─────────────────────────────────
const isEditing = ref(true);

/** 用于识别「整份 PPT 已替换」（后端重新生成 / 历史重新加载） */
function buildPptDeckSignature(data: PptData | null | undefined): string {
  if (!data?.slides?.length) return "";
  const slideSig = data.slides.map((s, i) => {
    const c = s.chart;
    return [
      i,
      s.layout ?? "",
      s.title ?? "",
      c?.type ?? "",
      c?.title ?? "",
    ].join("|");
  });
  return [data.title ?? "", String(data.slides.length), ...slideSig].join("\n");
}

/** 创建 pptData 的深拷贝，编辑在此副本上修改，不直接变更 prop */
const editableData = ref<PptData>(
  normalizePptData(JSON.parse(JSON.stringify(props.pptData)))
);

/** 标记是否有过编辑 */
const isDirty = ref(false);
let lastSyncedPptSignature = buildPptDeckSignature(props.pptData);

/** 封面意境装饰：每份新 PPT 随机选一套，同一份内保持不变 */
const coverDecorationIndex = ref(pickRandomCoverDecorationIndex());
let lastCoverDeckTitle = props.pptData.title ?? "";

watch(
  () => props.pptData.title,
  (title) => {
    const next = title ?? "";
    if (next && next !== lastCoverDeckTitle) {
      lastCoverDeckTitle = next;
      coverDecorationIndex.value = pickRandomCoverDecorationIndex();
    }
  }
);

const coverDecorationSvg = computed(
  () => getCoverDecorationByIndex(coverDecorationIndex.value).svg
);

// 当 props.pptData 外部更新时同步 editableData；整份 PPT 替换时强制刷新（忽略 isDirty）
watch(
  () => props.pptData,
  (newVal) => {
    const sig = buildPptDeckSignature(newVal);
    const deckReplaced = sig && sig !== lastSyncedPptSignature;
    if (deckReplaced || !isDirty.value) {
      editableData.value = normalizePptData(JSON.parse(JSON.stringify(newVal)));
      lastSyncedPptSignature = sig;
      if (deckReplaced) {
        isDirty.value = false;
        currentSlide.value = props.initialSlide ?? 0;
      }
    }
  },
  { deep: true }
);

/** 关闭查看器：如果有编辑，先通知父组件更新数据，再关闭 */
function handleClose() {
  if (isDirty.value) {
    emit("update:pptData", JSON.parse(JSON.stringify(editableData.value)));
  }
  emit("close");
}

/** contenteditable blur 时更新对应字段 */
function onCellBlur(event: Event, path: string) {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  setNestedValue(editableData.value, path, text);
  isDirty.value = true;
}

/** 内容列表项 blur（content[i]）；编辑标题/正文时保留另一侧 */
function onContentItemBlur(event: Event, slideIdx: number, itemIdx: number) {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  const row = editableData.value.slides[slideIdx]?.content;
  if (!row) return;

  if (typeof row[itemIdx] !== "string") {
    row[itemIdx] = coerceContentItemText(row[itemIdx]);
  }

  const isTitleField =
    el.classList.contains("ppt-topic-card-title") ||
    el.classList.contains("ppt-content-point-title");
  const isBodyField =
    el.classList.contains("ppt-topic-card-body") ||
    el.classList.contains("ppt-content-point-body");

  if (isTitleField || isBodyField) {
    const { title, body } = splitContentItem(row[itemIdx]);
    const titleMd = text.startsWith("**")
      ? text
      : `**${text.replace(/\*\*/g, "")}**`;
    if (isTitleField) {
      row[itemIdx] = body ? `${titleMd} — ${body}` : text;
    } else {
      const head = title || titleMd;
      row[itemIdx] = head ? `${head} — ${text}` : text;
    }
  } else {
    row[itemIdx] = text;
  }
  isDirty.value = true;
}

/** 底部总结条目的 content 编辑（对应 content 数组最后一项） */
function onSummaryContentBlur(event: Event) {
  const content = editableData.value.slides[currentSlide.value]?.content;
  if (!content?.length) return;
  onContentItemBlur(event, currentSlide.value, content.length - 1);
}

/** 通用列表项 blur（可指定字段名，如 left_content / right_content） */
function onListItemBlur(event: Event, slideIdx: number, field: string, itemIdx: number) {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  const s = editableData.value.slides[slideIdx] as any;
  if (s && Array.isArray(s[field])) {
    s[field][itemIdx] = text;
    isDirty.value = true;
  }
}

function onDataSourceLineBlur(event: Event, slideIdx: number) {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  const s = editableData.value.slides[slideIdx] as PptSlide;
  if (!s) return;
  s.data_source_line = text;
  isDirty.value = true;
}

/** content 页是否为标准 **要点**：说明 列表（用卡片网格，不用 right_items 分栏） */
function isStandardContentBulletSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "content") return false;
  const items = resolveSlideBulletItems(slide);
  if (items.length < 2) return false;
  return items.every((item) => {
    const { title, body } = splitContentItem(item);
    return Boolean(title.trim()) && Boolean(body.trim());
  });
}

function isTableLeftColumn(slide: PptSlide | undefined): boolean {
  return slide?.table?.position === "left";
}

function onPptTableRefClick(refId: string, slide: PptSlide) {
  const info = (slide?.page_references || []).find(
    (r) => String(r.ref_id) === refId || r.ref_id === Number(refId)
  );
  if (info?.url) window.open(info.url, "_blank", "noopener");
}

/** references 页：文档 RAG 时条目多为「[N] 文件名」，链接到 page_references / OSS */
function resolveReferencesSlideItemUrl(
  item: unknown,
  slide: PptSlide
): string | null {
  const refs = slide?.page_references || [];
  const text = displayText(item);
  const bracket = text.match(/^\[(\d+)\]/);
  if (bracket) {
    const info = refs.find(
      (r) =>
        String(r.ref_id) === bracket[1] || r.ref_id === Number(bracket[1])
    );
    const url = info?.url?.trim();
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  const items = slide.content || [];
  const idx = items.indexOf(item);
  if (idx >= 0) {
    const byIndex = refs[idx]?.url?.trim();
    if (byIndex && /^https?:\/\//i.test(byIndex)) return byIndex;
  }
  const titleMatch = refs.find(
    (r) => r.title && text.includes(String(r.title).trim())
  );
  const titleUrl = titleMatch?.url?.trim();
  if (titleUrl && /^https?:\/\//i.test(titleUrl)) return titleUrl;
  return null;
}

/** content 页：左 content 要点 + 右 right_items（无图表/表格） */
function isContentWithRightItemsSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "content" || slide.chart || slide.table) return false;
  if (isHeroLeftSlide(slide)) return false;
  if (isStandardContentBulletSlide(slide)) return false;
  const layout = String(slide.emphasis_layout || "")
    .trim()
    .toLowerCase();
  if (layout === "content_split" || layout === "split_right_items") return true;
  return (slide.right_items?.length ?? 0) > 0;
}

/** 当前页是否展示章节联网配图（sidebar）；section 页始终展示 strip */
function shouldShowChapterSideImage(slide?: PptSlide | null): boolean {
  return shouldShowChapterSideImageLayout(slide, {
    hasChart: Boolean(slide?.chart || slide?.table),
    isRightItems:
      isContentWithRightItemsSlide(slide ?? undefined) ||
      isHeroLeftSlide(slide ?? undefined),
  });
}

function formatRightItemIndex(
  ri: { index?: unknown },
  idx: number
): string {
  const raw = pickDisplayString(ri.index);
  if (raw) return raw;
  return String(idx + 1).padStart(2, "0");
}

/** right_items 卡片编辑 blur */
function onRightItemFieldBlur(
  event: Event,
  slideIdx: number,
  itemIdx: number,
  field: "title" | "description" | "index"
) {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  const s = editableData.value.slides[slideIdx] as any;
  if (s?.right_items?.[itemIdx]) {
    if (field === "index") {
      s.right_items[itemIdx].index = text;
    } else {
      s.right_items[itemIdx][field] = text;
    }
    isDirty.value = true;
  }
}

/** 按 path 字符串设置嵌套值，如 "slides.0.title" */
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const idx = Number(k);
    cur = Number.isNaN(idx) ? cur[k] : cur[idx];
    if (!cur) return;
  }
  const last = keys[keys.length - 1];
  const lastIdx = Number(last);
  if (Number.isNaN(lastIdx)) {
    cur[last] = value;
  } else {
    cur[lastIdx] = value;
  }
}

/** 柱状图 SVG 绘图区（与 mapBarY 一致） */
const BAR_CHART_PLOT_TOP = 22;
const BAR_CHART_PLOT_BOTTOM = 188;

/** 折线/面积图 SVG（viewBox 需留出 X 轴旋转标签空间） */
const LINE_CHART_VIEWBOX = "0 0 500 288";
const LINE_CHART_PLOT_TOP = 28;
const LINE_CHART_PLOT_BOTTOM = 188;
const LINE_CHART_X_AXIS_LABEL_Y = 276;
const LINE_CHART_X_CAT_Y_ROTATED = 224;
const LINE_CHART_X_CAT_Y = 242;
const LINE_CHART_Y_AXIS_LABEL_X = 4;
const LINE_CHART_Y_AXIS_LABEL_Y = 108;
const BAR_CHART_X_CAT_Y = 206;
const BAR_CHART_X_CAT_Y_ROTATED = 196;
const CHART_X_CAT_ROTATE_DEG = -45;

function shouldRotateChartXLabels(
  chart: { data?: Array<{ label?: string }> } | null | undefined
): boolean {
  if (!chart?.data?.length) return false;
  const n = chart.data.length;
  if (n <= 1) return false;
  if (n > 5) return true;
  const labels = chart.data.map((d) => String(d.label ?? ""));
  const maxLen = Math.max(0, ...labels.map((l) => l.length));
  const avgLen = labels.reduce((s, l) => s + l.length, 0) / n;
  const slotWidth = 400 / n;
  if (maxLen * 7 > slotWidth * 0.8) return true;
  if (avgLen > 3 && n >= 4) return true;
  return false;
}

function chartXCatLabelTransform(x: number, pivotY: number): string {
  return `rotate(${CHART_X_CAT_ROTATE_DEG}, ${x}, ${pivotY})`;
}
/** 组合图 viewBox 520×240 的 X 轴标题 Y */
const COMBO_CHART_X_AXIS_LABEL_Y = 228;

function parseCssColorToRgb(color: string): [number, number, number] | null {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function colorRelativeLuminance(color: string): number {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 对比度（1~21）；任一颜色无法解析时返回 21（视为安全，不强改） */
function colorContrastRatio(a: string, b: string): number {
  if (!parseCssColorToRgb(a) || !parseCssColorToRgb(b)) return 21;
  const la = colorRelativeLuminance(a);
  const lb = colorRelativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 按背景亮度选可读的文字色 */
function readableTextOn(bg: string): string {
  return colorRelativeLuminance(bg) > 0.5 ? "#0a0a0a" : "#f5f5f5";
}

/**
 * 兜底修正 palette 自相矛盾的情况（如后端把 text_color 与 bg_color 设成同色），
 * 保证正文/次要文字与背景有足够对比度，避免「黑底黑字」完全不可读。
 */
function ensureReadablePaletteVars(vars: Record<string, string>): void {
  const bg = vars["--ppt-bg"];
  if (!bg || !parseCssColorToRgb(bg)) return;
  const fallbackText = readableTextOn(bg);
  const text = vars["--ppt-text"];
  if (!text || colorContrastRatio(text, bg) < 3) {
    vars["--ppt-text"] = fallbackText;
  }
  const textSecondary = vars["--ppt-text-secondary"];
  if (textSecondary && colorContrastRatio(textSecondary, bg) < 2.5) {
    vars["--ppt-text-secondary"] = fallbackText;
  }
}

/** 将 Y 轴上限取整到「好看」的刻度，避免柱子超出最顶网格线 */
function ceilToNiceAxisMax(value: number, tickCount = 5): number {
  if (value <= 0) return 1;
  const rawStep = value / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  return Math.ceil(value / step) * step;
}

const DEFAULT_ACCENT = "#4a90e2";
const DEFAULT_HERO_GOLD = "#d4af37";

const PIE_COLORS = [
  "#4a90e2",
  "#f5a623",
  "#50e3c2",
  "#e25c5c",
  "#b8e986",
  "#7c5cfc",
  "#34c78a",
  "#e2b34a",
  "#9b59b6",
  "#1abc9c",
];

function normalizeAccentColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const c = raw.trim();
  return c || undefined;
}

/** 单色盘展开为多色（后端重复同一 hex 时仍按索引区分 KPI/系列） */
function expandMonochromeAccentPalette(base: string, count: number): string[] {
  const n = Math.max(1, count);
  const rgb = parseCssColorToRgb(base);
  if (!rgb) {
    return Array.from({ length: n }, (_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  }
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const d = max - min;
  if (d > 0.001) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d < 0.001 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return Array.from({ length: n }, (_, i) => {
    const hue = (h + (i * 360) / n) % 360;
    const sat = Math.min(1, Math.max(0.35, s));
    const lit = Math.min(0.72, Math.max(0.42, l + (i % 2 === 0 ? 0.06 : -0.04)));
    const c = (1 - Math.abs(2 * lit - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lit - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (hue < 60) {
      rp = c;
      gp = x;
    } else if (hue < 120) {
      rp = x;
      gp = c;
    } else if (hue < 180) {
      gp = c;
      bp = x;
    } else if (hue < 240) {
      gp = x;
      bp = c;
    } else if (hue < 300) {
      rp = x;
      bp = c;
    } else {
      rp = c;
      bp = x;
    }
    const toHex = (v: number) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
  });
}

/** 文稿级强调色列表：accent_colors → accent_color → 空 */
function resolveDeckAccentColors(palette?: PptPalette, minSlots = 4): string[] {
  const list = palette?.accent_colors;
  let colors: string[] = [];
  if (Array.isArray(list) && list.length) {
    colors = list.map((c) => normalizeAccentColor(c)).filter(Boolean) as string[];
  } else {
    const single = normalizeAccentColor(palette?.accent_color);
    if (single) colors = [single];
  }
  if (!colors.length) return [];
  const norm = colors.map((c) => c.toLowerCase());
  const unique = [...new Set(norm)];
  if (unique.length <= 1) {
    const base = colors[0] || unique[0] || DEFAULT_ACCENT;
    const slots = Math.max(minSlots, colors.length, 4);
    return expandMonochromeAccentPalette(base, slots);
  }
  return colors;
}

function accentColorAt(colors: string[], index: number, fallback = DEFAULT_ACCENT): string {
  if (!colors.length) return fallback;
  return colors[((index % colors.length) + colors.length) % colors.length] || fallback;
}

function resolveMetricCardAccent(
  card: { accent_color?: string },
  index: number,
  palette?: PptPalette
): string {
  const cardColor = normalizeAccentColor(card.accent_color);
  if (cardColor) return cardColor;
  const deck = resolveDeckAccentColors(palette);
  return accentColorAt(deck, index, normalizeAccentColor(palette?.accent_color) || DEFAULT_ACCENT);
}

function padChartColorList(colors: string[], count: number): string[] {
  if (!colors.length || count <= colors.length) return colors.slice(0, count || colors.length);
  const out = [...colors];
  while (out.length < count) {
    out.push(colors[out.length % colors.length]);
  }
  return out;
}

/** chart.colors 全同色时回退 deck 多色或按色相展开 */
function resolveChartColorList(
  chart?: PptChart,
  palette?: PptPalette,
  minCount = 4
): string[] {
  const fromChart = chart?.colors
    ?.map((c) => normalizeAccentColor(c))
    .filter(Boolean) as string[] | undefined;
  const deck = resolveDeckAccentColors(palette, minCount);
  const need = Math.max(minCount, fromChart?.length ?? 0, 4);

  if (fromChart?.length) {
    const uniqueChart = [...new Set(fromChart.map((c) => c.toLowerCase()))];
    if (uniqueChart.length > 1) {
      return padChartColorList(fromChart, need);
    }
    const uniqueDeck = [...new Set(deck.map((c) => c.toLowerCase()))];
    if (uniqueDeck.length > 1) {
      return padChartColorList(deck, Math.max(need, fromChart.length));
    }
    const base =
      uniqueChart[0] || deck[0] || normalizeAccentColor(palette?.accent_color) || DEFAULT_ACCENT;
    return expandMonochromeAccentPalette(base, Math.max(need, fromChart.length));
  }
  if (deck.length) return padChartColorList(deck, need);
  return padChartColorList([...PIE_COLORS], need);
}

const isLightPalette = computed(() => {
  const bg = pptSource.value.palette?.bg_color;
  const bgIsLight =
    bg && parseCssColorToRgb(bg) ? colorRelativeLuminance(bg) > 0.55 : null;
  const fromScheme = resolvePptSchemeIsLight(pptSource.value.palette);
  // scheme 与实际背景亮度矛盾时（如 scheme=light 但 bg 近黑），以背景为准
  if (fromScheme !== null) {
    if (bgIsLight !== null && bgIsLight !== fromScheme) return bgIsLight;
    return fromScheme;
  }
  if (bgIsLight !== null) return bgIsLight;
  return false;
});

const isDarkScheme = computed(
  () => pptSource.value.palette?.theme_tokens?.scheme?.trim().toLowerCase() === "dark"
);

const pptTemplateLabel = computed(() => {
  const rec = pptSource.value.html_template_recommendation;
  const tagline =
    pptSource.value.palette?.theme_tokens?.tagline ??
    pptSource.value.palette?.theme_tokens?.typography?.tagline;
  return formatPptTemplateDebugLabel(rec?.template_id, rec?.pick_source, tagline);
});

const pptTemplateTagline = computed(
  () =>
    pptSource.value.palette?.theme_tokens?.tagline ??
    pptSource.value.palette?.theme_tokens?.typography?.tagline ??
    ""
);

/** 当前文稿多色强调色（metric_cards / 图表系列回退） */
const deckAccentColors = computed(() => resolveDeckAccentColors(pptSource.value.palette));

/** 当前页图表系列色 */
function getSeriesColor(index: number): string {
  return accentColorAt(resolveChartColorList(slide.value?.chart, pptSource.value.palette), index);
}

function chartStrokeStyle(index = 0): Record<string, string> {
  return { stroke: getSeriesColor(index) };
}

function chartFillStyle(index = 0): Record<string, string> {
  return { fill: getSeriesColor(index) };
}

function contentPointStyle(index: number): Record<string, string> {
  const color = accentColorAt(deckAccentColors.value, index, DEFAULT_ACCENT);
  return { borderLeftColor: color, "--ppt-metric-accent": color };
}

function metricCardStyle(
  card: { accent_color?: string },
  index: number
): Record<string, string> {
  const color = resolveMetricCardAccent(card, index, pptSource.value.palette);
  return {
    borderTopColor: color,
    borderLeftColor: color,
    "--ppt-metric-accent": color,
  };
}

function metricCardValueStyle(
  card: { accent_color?: string },
  index: number
): Record<string, string> {
  return { color: resolveMetricCardAccent(card, index, pptSource.value.palette) };
}

function rightItemAccentColor(
  item: { accent_color?: string },
  index: number
): string {
  const c = normalizeAccentColor(item.accent_color);
  if (c) return c;
  return accentColorAt(
    deckAccentColors.value,
    index,
    normalizeAccentColor(pptSource.value.palette?.accent_color) || DEFAULT_HERO_GOLD
  );
}

function heroRightCardStyle(item: { accent_color?: string }, index: number): Record<string, string> {
  const color = rightItemAccentColor(item, index);
  return { borderLeftColor: color, "--ppt-item-accent": color };
}

// ── 后端 palette 颜色 + theme_tokens（字体/圆角/scheme）+ 中文字体回退 ─────
const paletteStyle = computed(() => {
  const p = pptSource.value.palette;
  const vars = buildPptThemeStyleVars(p, pptDeckFontCss.value);
  const accentColors = resolveDeckAccentColors(p);
  if (!vars["--ppt-accent"] && accentColors[0]) vars["--ppt-accent"] = accentColors[0];
  accentColors.forEach((c, i) => {
    vars[`--ppt-accent-${i + 1}`] = c;
  });
  ensureReadablePaletteVars(vars);
  if (isModernLiteraryMinimal.value) {
    const colors = modernLiteraryColors.value;
    const fonts = modernLiteraryFonts.value;
    Object.assign(vars, {
      "--ppt-bg": colors.bg,
      "--ppt-bg-secondary": colors.surface,
      "--ppt-accent": colors.accent,
      "--ppt-text": colors.text,
      "--ppt-text-secondary": colors.muted,
      "--ppt-modern-bg": colors.bg,
      "--ppt-modern-surface": colors.surface,
      "--ppt-modern-accent": colors.accent,
      "--ppt-modern-text": colors.text,
      "--ppt-modern-muted": colors.muted,
      "--ppt-font-display": fonts.display,
      "--ppt-font-heading": fonts.heading,
      "--ppt-font-body": fonts.body,
      "--ppt-font-family": fonts.body,
      "--ppt-quote-font-family": fonts.heading,
      fontFamily: fonts.body,
    });
  }
  return vars;
});

const slideWrapperStyle = computed(() => {
  const vars: Record<string, string> = { ...paletteStyle.value };
  if (!isPresentationFullscreen.value) return vars;

  const scale = presentationScale.value;
  const px = (value: number) => `${Number((value * scale).toFixed(2))}px`;

  return {
    ...vars,
    "--ppt-fs-display": px(44),
    "--ppt-fs-title": px(26),
    "--ppt-fs-heading": px(26),
    "--ppt-fs-body-lg": px(15),
    "--ppt-fs-body": px(12),
    "--ppt-fs-body-sm": px(13),
    "--ppt-fs-caption": px(11),
    "--ppt-fs-quote-mark": px(100),
    "--ppt-pad-y": px(36),
    "--ppt-pad-x": px(48),
    "--ppt-gap-sm": px(10),
    "--ppt-gap-md": px(12),
    "--ppt-gap-lg": px(24),
    "--ppt-icon-sm": px(22),
    "--ppt-image-strip-height": px(96),
    "--ppt-image-sidebar-height": px(120),
    "--ppt-image-card-max-width": px(220),
    "--ppt-image-sidebar-max-width": px(220),
    "--ppt-image-sidebar-min-width": px(140),
    "--ppt-image-page-min-height": px(160),
    "--ppt-image-page-max-height": px(360),
    "--ppt-document-figure-min-height": px(288),
    "--ppt-document-figure-max-height": px(420),
  };
});

const pptBodyFontCss = computed(
  () => paletteStyle.value["--ppt-font-body"] || pptDeckFontCss.value
);
const pptHeadingFontCss = computed(
  () => paletteStyle.value["--ppt-font-heading"] || pptBodyFontCss.value
);

// 每页 references 最多显示的条目数（超出则自动分页导出）
const REFS_PER_PAGE = 18;
// 临时覆盖当前幻灯片的 content（用于 references 分页截图）
const overrideContent = ref<string[] | null>(null);

// 将图表项中的 value 归一化为 number，兼容 value 为对象/数组的后端格式
function toNumericSeries(raw: unknown): number[] {
  if (typeof raw === "number" && Number.isFinite(raw)) return [raw];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n));
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n));
  }
  const n = Number(raw);
  return Number.isFinite(n) ? [n] : [];
}

/** 将后端 chart.data 统一转为数组，避免非数组上调用 .map */
function coerceToUnknownArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return [];
  if (typeof raw !== "object") return [];

  if ("length" in raw && typeof (raw as { length: unknown }).length === "number") {
    try {
      return Array.from(raw as ArrayLike<unknown>);
    } catch {
      return [];
    }
  }

  const o = raw as Record<string, unknown>;

  for (const key of ["items", "series", "datasets", "points", "entries"] as const) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  if (Array.isArray(o.data)) return o.data;

  const labels = o.labels ?? o.categories;
  const values = o.values;
  if (Array.isArray(labels) && Array.isArray(values)) {
    return values.map((v, i) => ({
      label: labels[i] ?? String(i + 1),
      value: v,
    }));
  }

  if (
    "value" in o ||
    "values" in o ||
    "label" in o ||
    "stage" in o ||
    "name" in o
  ) {
    return [o];
  }

  const entries = Object.entries(o);
  if (
    entries.length > 0 &&
    entries.every(
      ([, v]) =>
        v == null ||
        typeof v === "number" ||
        typeof v === "string" ||
        typeof v === "boolean"
    )
  ) {
    return entries.map(([label, value]) => ({ label, value }));
  }

  return [];
}

/** 是否为「labels + 平行数值数组」格式（后端常见：data: [35, 1.6, 2.1]） */
function chartSecondarySeries(chart: PptChart | undefined): SecondaryDataItem[] {
  const raw = coerceToUnknownArray(chart?.secondary_data);
  if (!raw.length) return [];
  const first = raw[0] as unknown;
  if (typeof first === "number" || typeof first === "string") {
    const labels =
      chart?.data?.map((d) => d.label) ??
      chart?.categories ??
      chart?.labels ??
      [];
    return (raw as unknown[]).map((v, i) => {
      const n = typeof v === "number" ? v : Number(v);
      return {
        label: labels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  }
  return raw as SecondaryDataItem[];
}

function isPrimitiveChartDataArray(data: unknown): boolean {
  if (!Array.isArray(data) || !data.length) return false;
  return data.every((d) => {
    if (d == null) return true;
    const t = typeof d;
    return t === "number" || t === "string" || t === "boolean";
  });
}

/** combo 等图：后端 categories + primary_data 时，应优先用 primary_data 重建 data */
function shouldRebuildChartDataFromPrimary(
  chart: PptChart,
  axisLabels: string[],
  dataRows: unknown[]
): boolean {
  if (!chart.primary_data?.length) return false;
  const expectedLen = axisLabels.length || chart.primary_data.length;
  if (!dataRows.length) return true;
  if (dataRows.length !== expectedLen) return true;
  if (!isPrimitiveChartDataArray(chart.primary_data)) return false;
  if (isPrimitiveChartDataArray(dataRows)) return true;
  return dataRows.every((d) => {
    const n = Number((d as ChartDataItem).value);
    return !Number.isFinite(n) || n === 0;
  });
}

function normalizeChartSeriesArray(
  raw: unknown,
  labels: string[]
): SecondaryDataItem[] | undefined {
  const arr = coerceToUnknownArray(raw);
  if (!arr.length) return undefined;
  if (isPrimitiveChartDataArray(arr)) {
    return arr.map((v, i) => {
      const n = typeof v === "number" ? v : Number(v);
      return {
        label: labels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  }
  return arr.map((d, i) => {
    const item = d as SecondaryDataItem;
    const n = Number(item?.value);
    return {
      label: item?.label?.trim() ? item.label : labels[i] ?? String(i + 1),
      value: Number.isFinite(n) ? n : 0,
    };
  });
}

/** 从 series / datasets 条目中读取平行数值数组（支持 values 或 Chart.js 的 data） */
function seriesRowNumericValues(row: Record<string, unknown>): number[] {
  const raw = row.values ?? row.data;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

/** 解开嵌套的 chart.data.data（部分后端将 labels/datasets 放在内层） */
function unwrapChartDataRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return unwrapChartDataRecord(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const nested = inner as Record<string, unknown>;
    const hasAxis =
      Array.isArray(nested.labels) ||
      Array.isArray(nested.categories);
    const hasSeries =
      Array.isArray(nested.datasets) ||
      Array.isArray(nested.series);
    if (hasAxis && hasSeries) return nested;
  }
  return o;
}

/** 解析 chart.data（含 JSON 字符串）或 chart 根上的 labels + series/datasets */
function resolveChartSeriesContainer(chart: PptChart): Record<string, unknown> | null {
  let raw: unknown = chart.data;
  const unwrapped = unwrapChartDataRecord(raw);
  if (unwrapped) raw = unwrapped;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const labels = o.labels ?? o.categories;
    const series = o.series ?? o.datasets;
    if (Array.isArray(labels) && Array.isArray(series) && series.length) {
      return {
        ...o,
        labels,
        categories: labels,
        series,
        datasets: series,
      };
    }
    if (Array.isArray(labels) || Array.isArray(series)) return o;
    return o;
  }

  if (Array.isArray(raw) && raw.length) {
    const extra = chart as unknown as Record<string, unknown>;
    const labels =
      chart.labels ??
      chart.categories ??
      extra.labels ??
      extra.categories;
    if (Array.isArray(labels)) {
      return {
        labels,
        categories: labels,
        series: raw,
        datasets: raw,
      };
    }
  }

  const extra = chart as unknown as Record<string, unknown>;
  const labels = chart.labels ?? chart.categories ?? extra.labels ?? extra.categories;
  const series = extra.series ?? extra.datasets;
  if (Array.isArray(labels) && Array.isArray(series) && series.length) {
    return {
      labels,
      categories: labels,
      series,
      datasets: series,
    };
  }
  return null;
}

/** coerce 只拿到 datasets[0] 时，单系列展开为逐条 { label, value } */
function expandSingleSeriesBarRows(
  chart: PptChart,
  axisLabels: string[],
  chartDataRaw: unknown[]
): ChartDataItem[] | undefined {
  const singleSeriesTypes = [
    "bar",
    "line",
    "area",
    "pie",
    "funnel",
    "horizontal_bar",
    "waterfall",
  ] as const;
  if (
    !singleSeriesTypes.includes(chart.type as (typeof singleSeriesTypes)[number]) ||
    !axisLabels.length ||
    chartDataRaw.length !== 1
  ) {
    return undefined;
  }
  const row = chartDataRaw[0];
  if (!row || typeof row !== "object") return undefined;
  const values = seriesRowNumericValues(row as Record<string, unknown>);
  if (!values.length) return undefined;
  return axisLabels.map((label, i) => ({
    label,
    value: values[i] ?? 0,
  }));
}

/**
 * 后端多系列图：{ labels|categories, series|datasets: [{ name, values[]|data[] }] }
 * - radar / 多系列 bar：保留 series 形态供分组渲染
 * - combo：柱+折线合并为 { label, value, secondary_value }[]
 * - 单系列 line / area / pie / funnel / horizontal_bar / waterfall：展开为 { label, value }[]
 * - 多系列 line / area：合并为 value + secondary_value (+ tertiary_value)
 */
function normalizeCategoriesSeriesChart(
  chart: PptChart,
  dataContainer: Record<string, unknown>
): PptChart | undefined {
  const categories = dataContainer.categories ?? dataContainer.labels;
  const seriesList = dataContainer.series ?? dataContainer.datasets;
  if (!Array.isArray(categories) || !Array.isArray(seriesList) || !seriesList.length) {
    return undefined;
  }
  const first = seriesList[0];
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const firstValues = seriesRowNumericValues(first as Record<string, unknown>);
  if (!firstValues.length) {
    return undefined;
  }

  const axisLabels = categories.map((c) => String(c));
  const data = seriesList.map((s, i) => {
    const row = s as Record<string, unknown>;
    const values = seriesRowNumericValues(row);
    return {
      name: String(row.name ?? row.label ?? `Series ${i + 1}`),
      values,
    };
  });

  if (chart.type === "radar") {
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
    };
  }

  if (chart.type === "bar") {
    if (seriesList.length === 1) {
      const values = data[0]?.values ?? [];
      const rows: ChartDataItem[] = axisLabels.map((label, i) => ({
        label,
        value: values[i] ?? 0,
      }));
      const seriesName = data[0]?.name;
      return {
        ...chart,
        categories: axisLabels,
        labels: axisLabels,
        data: rows,
        ...(seriesName ? { series_names: [seriesName], y_label: chart.y_label || seriesName } : {}),
      };
    }
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
    };
  }

  if (chart.type === "combo") {
    const combo = buildComboChartFromSeriesList(axisLabels, seriesList);
    if (combo) return { ...chart, categories: axisLabels, labels: axisLabels, ...combo };
  }

  if (chart.type === "line" || chart.type === "area") {
    if (seriesList.length === 1) {
      const built = buildLineAreaChartFromSeriesList(axisLabels, seriesList);
      if (built) {
        const names = built.series_names ?? [];
        return {
          ...chart,
          categories: axisLabels,
          labels: axisLabels,
          data: built.data,
          ...(names.length ? { series_names: names } : {}),
          ...(chart.y_label?.trim() || chart.yLabel?.trim()
            ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
            : built.y_label
              ? { y_label: built.y_label }
              : {}),
        };
      }
    }
    const names = data.map((s) => s.name).filter(Boolean);
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
      ...(names.length ? { series_names: names } : {}),
      ...(chart.y_label?.trim() || chart.yLabel?.trim()
        ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
        : {}),
    };
  }

  const rowChartTypes = ["pie", "funnel", "horizontal_bar", "waterfall"] as const;
  if (rowChartTypes.includes(chart.type as (typeof rowChartTypes)[number])) {
    const values = data[0]?.values ?? [];
    const rows: ChartDataItem[] = axisLabels.map((label, i) => ({
      label,
      value: values[i] ?? 0,
    }));
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: rows,
    };
  }

  return undefined;
}

/** line / area：labels + datasets → [{ label, value, secondary_value? }] */
function buildLineAreaChartFromSeriesList(
  axisLabels: string[],
  seriesList: unknown[]
): {
  data: ChartDataItem[];
  series_names?: string[];
  y_label?: string;
  secondary_data_label?: string;
} | undefined {
  const rows = seriesList.filter((s) => s && typeof s === "object") as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const series = rows.map((row, i) => ({
    name: String(row.name ?? row.label ?? `Series ${i + 1}`),
    values: seriesRowNumericValues(row),
  }));
  if (!series.some((s) => s.values.length)) return undefined;

  if (series.length === 1) {
    const data: ChartDataItem[] = axisLabels.map((label, i) => ({
      label,
      value: series[0].values[i] ?? 0,
    }));
    const name = series[0].name.trim();
    return {
      data,
      ...(name ? { series_names: [name], y_label: name } : {}),
    };
  }

  const data: ChartDataItem[] = axisLabels.map((label, i) => {
    const item: ChartDataItem = {
      label,
      value: series[0].values[i] ?? 0,
    };
    if (series[1]) item.secondary_value = series[1].values[i] ?? 0;
    if (series[2]) item.tertiary_value = series[2].values[i] ?? 0;
    return item;
  });
  const names = series.map((s) => s.name).filter(Boolean);
  return {
    data,
    series_names: names,
    ...(names[0] ? { y_label: names[0] } : {}),
    ...(names[1] ? { secondary_data_label: names[1] } : {}),
  };
}

function normalizeLineAreaFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "line" && chart.type !== "area") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  if (pack.datasets.length > 1) {
    return normalizeCategoriesSeriesChart(chart, {
      labels: pack.labels,
      categories: pack.labels,
      datasets: pack.datasets,
      series: pack.datasets,
    });
  }
  const built = buildLineAreaChartFromSeriesList(pack.labels, pack.datasets);
  if (!built) return undefined;
  return {
    ...chart,
    labels: pack.labels,
    categories: pack.labels,
    data: built.data,
    ...(built.series_names?.length ? { series_names: built.series_names } : {}),
    ...(chart.y_label?.trim() || chart.yLabel?.trim()
      ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
      : built.y_label
        ? { y_label: built.y_label }
        : {}),
    ...(chart.secondary_data_label?.trim()
      ? { secondary_data_label: chart.secondary_data_label.trim() }
      : built.secondary_data_label
        ? { secondary_data_label: built.secondary_data_label }
        : {}),
  };
}

interface ComboSeriesPick {
  primary: { name: string; values: number[] };
  secondary?: { name: string; values: number[] };
}

/** 从 datasets 中识别柱（bar）与折线（line）系列 */
function pickComboSeriesFromRows(
  seriesList: Record<string, unknown>[]
): ComboSeriesPick | undefined {
  if (!seriesList.length) return undefined;
  const mapped = seriesList.map((row) => ({
    name: String(row.name ?? row.label ?? ""),
    type: String(row.type ?? "")
      .trim()
      .toLowerCase(),
    values: seriesRowNumericValues(row),
  }));
  let primary = mapped.find((s) => s.type === "bar" && s.values.length);
  let secondary = mapped.find((s) => s.type === "line" && s.values.length);
  if (!primary && mapped.length >= 1 && mapped[0].values.length) {
    primary = mapped[0];
    secondary =
      secondary ??
      mapped.find((s) => s !== primary && s.values.length) ??
      mapped[1];
  }
  if (!primary?.values.length) return undefined;
  if (secondary && !secondary.values.length) secondary = undefined;
  return {
    primary: { name: primary.name, values: primary.values },
    ...(secondary ? { secondary: { name: secondary.name, values: secondary.values } } : {}),
  };
}

function buildComboChartFromSeriesList(
  axisLabels: string[],
  seriesList: unknown[]
): { data: ChartDataItem[]; primary_data_label?: string; secondary_data_label?: string; y_label?: string; secondary_y_label?: string } | undefined {
  const rows = seriesList.filter((s) => s && typeof s === "object") as Record<string, unknown>[];
  const picked = pickComboSeriesFromRows(rows);
  if (!picked) return undefined;
  const data: ChartDataItem[] = axisLabels.map((label, i) => ({
    label,
    value: picked.primary.values[i] ?? 0,
    ...(picked.secondary
      ? { secondary_value: picked.secondary.values[i] ?? 0 }
      : {}),
  }));
  const primaryName = picked.primary.name.trim();
  const secondaryName = picked.secondary?.name.trim();
  return {
    data,
    ...(primaryName ? { primary_data_label: primaryName, y_label: primaryName } : {}),
    ...(secondaryName
      ? { secondary_data_label: secondaryName, secondary_y_label: secondaryName }
      : {}),
  };
}

/** labels + datasets → combo 柱+折线（data[].value + secondary_value） */
function normalizeComboFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "combo") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  const built = buildComboChartFromSeriesList(pack.labels, pack.datasets);
  if (!built) return undefined;
  return {
    ...chart,
    labels: pack.labels,
    categories: pack.labels,
    data: built.data,
    ...(chart.primary_data_label?.trim()
      ? { primary_data_label: chart.primary_data_label.trim() }
      : built.primary_data_label
        ? { primary_data_label: built.primary_data_label }
        : {}),
    ...(chart.secondary_data_label?.trim()
      ? { secondary_data_label: chart.secondary_data_label.trim() }
      : built.secondary_data_label
        ? { secondary_data_label: built.secondary_data_label }
        : {}),
    ...(chart.y_label?.trim() || chart.yLabel?.trim()
      ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
      : built.y_label
        ? { y_label: built.y_label }
        : {}),
    ...(chart.secondary_y_label?.trim()
      ? { secondary_y_label: chart.secondary_y_label.trim() }
      : built.secondary_y_label
        ? { secondary_y_label: built.secondary_y_label }
        : {}),
  };
}

/** labels + datasets 单系列 → [{ label, value }[]（pie 等兜底） */
function normalizePieFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "pie") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  const values = datasetNumericValues(pack.datasets[0]);
  if (!values.length) return undefined;
  const rows: ChartDataItem[] = pack.labels.map((label, i) => ({
    label,
    value: values[i] ?? 0,
  }));
  return { ...chart, data: rows };
}

/** bar：labels + datasets[{ name, values }] → [{ label, value }] 或分组柱 */
function normalizeBarFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "bar") return undefined;
  const container = resolveChartSeriesContainer(chart);
  if (container) {
    return normalizeCategoriesSeriesChart(chart, container);
  }
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  return normalizeCategoriesSeriesChart(chart, {
    labels: pack.labels,
    categories: pack.labels,
    datasets: pack.datasets,
    series: pack.datasets,
  });
}

/** 读取 Chart.js 风格 labels + datasets（可在 chart 根或 chart.data 内） */
function readChartLabelsAndDatasets(
  chart: PptChart
): { labels: string[]; datasets: Record<string, unknown>[] } | undefined {
  const extra = chart as unknown as Record<string, unknown>;
  const fromRootLabels = chart.labels ?? chart.categories ?? extra.labels ?? extra.categories;
  const fromRootDatasets = extra.datasets;

  const tryPair = (labelsRaw: unknown, datasetsRaw: unknown) => {
    if (!Array.isArray(labelsRaw) || !Array.isArray(datasetsRaw) || !datasetsRaw.length) {
      return undefined;
    }
    return {
      labels: labelsRaw.map((l) => String(l)),
      datasets: datasetsRaw.filter(
        (d) => d && typeof d === "object"
      ) as Record<string, unknown>[],
    };
  };

  const root = tryPair(fromRootLabels, fromRootDatasets);
  if (root) return root;

  const data = chart.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    return tryPair(o.labels ?? o.categories, o.datasets ?? o.series);
  }
  return undefined;
}

function datasetNumericValues(row: Record<string, unknown>): number[] {
  const raw = row.data ?? row.values ?? row.points;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * scatter：labels + datasets[{ label, data: x[] }, { label, data: y[] }]
 * 双系列时第一条为 X、第二条为 Y，与标题「自由度 vs 学习成本」一致。
 */
function normalizeLabelsDatasetsChart(chart: PptChart): PptChart | undefined {
  if (chart.type !== "scatter") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack) return undefined;

  const series = pack.datasets.map((row, i) => ({
    name: String(row.label ?? row.name ?? `Series ${i + 1}`),
    values: datasetNumericValues(row),
  }));
  if (!series.length) return undefined;

  const n = Math.max(
    pack.labels.length,
    ...series.map((s) => s.values.length)
  );
  if (!n) return undefined;

  const xSeries = series[0];
  const ySeries = series.length > 1 ? series[1] : series[0];

  const points: ChartDataItem[] = Array.from({ length: n }, (_, i) => {
    const x = xSeries.values[i] ?? 0;
    const y = series.length > 1 ? (ySeries.values[i] ?? 0) : 0;
    return {
      label: pack.labels[i] ?? String(i + 1),
      x,
      y,
      value: x,
      secondary_value: y,
    };
  });

  return {
    ...chart,
    labels: pack.labels,
    data: points,
    x_label: chart.x_label?.trim() || chart.xLabel?.trim() || xSeries.name,
    y_label:
      chart.y_label?.trim() ||
      chart.yLabel?.trim() ||
      (series.length > 1 ? ySeries.name : undefined),
  };
}

/**
 * 将 chart 规范为 data: { label, value }[]。
 * 支持 labels[] + data[]（数值）、secondary_data[]（数值）与对象数组等后端格式。
 */
function normalizeChartType(type: unknown): string | undefined {
  if (type == null || type === "") return undefined;
  return String(type).trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeChart(chart: PptChart | undefined): PptChart | undefined {
  if (!chart) return chart;
  const typeNorm = normalizeChartType(chart.type);
  const chartNorm =
    typeNorm && typeNorm !== chart.type ? ({ ...chart, type: typeNorm } as PptChart) : chart;

  const scatterNorm = normalizeLabelsDatasetsChart(chartNorm);
  if (scatterNorm) return scatterNorm;

  const barNorm = normalizeBarFromLabelsDatasets(chartNorm);
  if (barNorm) return barNorm;

  const dataContainer = resolveChartSeriesContainer(chartNorm);

  if (dataContainer) {
    const multiSeries = normalizeCategoriesSeriesChart(chartNorm, dataContainer);
    if (multiSeries) return multiSeries;
    const pieNorm = normalizePieFromLabelsDatasets(chartNorm);
    if (pieNorm) return pieNorm;
    const comboNorm = normalizeComboFromLabelsDatasets(chartNorm);
    if (comboNorm) return comboNorm;
    const lineAreaNorm = normalizeLineAreaFromLabelsDatasets(chartNorm);
    if (lineAreaNorm) return lineAreaNorm;
    if (chartNorm.type === "radar") {
      const pack = readChartLabelsAndDatasets(chartNorm);
      if (pack) {
        const axisLabels = pack.labels;
        const rows = pack.datasets.map((row, i) => ({
          name: String(row.name ?? row.label ?? `Series ${i + 1}`),
          values: datasetNumericValues(row),
        }));
        if (axisLabels.length && rows.some((r) => r.values.length)) {
          return {
            ...chartNorm,
            categories: axisLabels,
            labels: axisLabels,
            data: rows as ChartDataItem[],
          };
        }
      }
    }
  }
  const axisLabels =
    chartNorm.labels ??
    chartNorm.categories ??
    (Array.isArray(dataContainer?.categories)
      ? (dataContainer!.categories as string[])
      : undefined) ??
    (Array.isArray(dataContainer?.labels)
      ? (dataContainer!.labels as string[])
      : undefined) ??
    [];
  const chartDataRaw = coerceToUnknownArray(chartNorm.data ?? dataContainer);

  const barRowsEarly = expandSingleSeriesBarRows(chartNorm, axisLabels, chartDataRaw);
  if (barRowsEarly?.length) {
    const seriesName = String(
      (chartDataRaw[0] as Record<string, unknown>)?.name ??
        (chartDataRaw[0] as Record<string, unknown>)?.label ??
        ""
    ).trim();
    return {
      ...chartNorm,
      categories: axisLabels,
      labels: axisLabels,
      data: barRowsEarly,
      ...(seriesName ? { series_names: [seriesName], y_label: chartNorm.y_label || seriesName } : {}),
    };
  }
  let primarySeriesRaw: unknown[] | undefined =
    chartDataRaw.length
      ? chartDataRaw
      : chartNorm.primary_data?.length
        ? chartNorm.primary_data
        : undefined;
  if (shouldRebuildChartDataFromPrimary(chartNorm, axisLabels, chartDataRaw)) {
    primarySeriesRaw = chartNorm.primary_data;
  }

  let data: ChartDataItem[] = chartDataRaw as ChartDataItem[];

  if (primarySeriesRaw?.length && isPrimitiveChartDataArray(primarySeriesRaw)) {
    data = primarySeriesRaw.map((raw, i) => {
      const n = typeof raw === "number" ? raw : Number(raw);
      return {
        label: axisLabels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  } else if (chartDataRaw.length && isPrimitiveChartDataArray(chartDataRaw)) {
    data = chartDataRaw.map((raw, i) => {
      const n = typeof raw === "number" ? raw : Number(raw);
      return {
        label: axisLabels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  } else if (chartDataRaw.length) {
    const barRows = expandSingleSeriesBarRows(chartNorm, axisLabels, chartDataRaw);
    if (barRows?.length) {
      data = barRows;
    } else {
      const mapItem =
        chartNorm.type === "stacked_bar" ? normalizeStackedBarChartItem : normalizeChartItem;
      data = chartDataRaw.map((d) => mapItem(d as ChartDataItem));
      if (axisLabels.length) {
        data = data.map((d, i) => ({
          ...d,
          label: d.label?.trim() ? d.label : axisLabels[i] ?? String(i + 1),
        }));
      }
    }
  }

  const rowLabels: string[] = data.some((d) => d.label?.trim())
    ? data.map((d, i) => d.label?.trim() || axisLabels[i] || String(i + 1))
    : axisLabels;
  const secondaryRaw =
    chartNorm.secondary_data ??
    (chartNorm as { secondaryData?: unknown[] }).secondaryData;
  const secondary_data = normalizeChartSeriesArray(secondaryRaw, rowLabels);

  const secondary_data_label =
    chartNorm.secondary_data_label?.trim() ||
    chartNorm.secondary_label?.trim() ||
    undefined;
  let primary_data_label =
    chartNorm.primary_data_label?.trim() ||
    chartNorm.primary_label?.trim() ||
    chartNorm.y_label?.trim() ||
    chartNorm.yLabel?.trim() ||
    undefined;
  if (chartNorm.type === "combo" && !primary_data_label && secondary_data_label) {
    primary_data_label = t("agent.pptComboPrimaryDefaultLabel");
  }

  const y_label =
    chartNorm.y_label?.trim() ||
    chartNorm.yLabel?.trim() ||
    (chartNorm.type === "combo" ? chartNorm.primary_label?.trim() : undefined) ||
    undefined;
  const x_label = chartNorm.x_label?.trim() || chartNorm.xLabel?.trim() || undefined;
  const secondary_y_label =
    chartNorm.secondary_y_label?.trim() || secondary_data_label || undefined;

  const colors = chartNorm.colors
    ?.map((c) => normalizeAccentColor(c))
    .filter(Boolean) as string[] | undefined;

  const next: PptChart = {
    ...chartNorm,
    data,
    ...(axisLabels.length && chartNorm.type === "bar" && !chartNorm.categories?.length
      ? { categories: axisLabels, labels: axisLabels }
      : {}),
    ...(colors?.length ? { colors } : {}),
    ...(secondary_data?.length ? { secondary_data } : {}),
    ...(secondary_data_label ? { secondary_data_label } : {}),
    ...(primary_data_label ? { primary_data_label } : {}),
    ...(y_label ? { y_label } : {}),
    ...(x_label ? { x_label } : {}),
    ...(secondary_y_label ? { secondary_y_label } : {}),
  };

  return next;
}

function isMetricCardsContentItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const type = String(o.type ?? o.layout ?? o.block ?? "")
    .trim()
    .toLowerCase();
  if (type === "metric_cards" || type === "metric_cards_row") return true;
  return Array.isArray(o.metric_cards) && !pickDisplayString(o.title ?? o.text);
}

/** 从 content 数组中的 { type: metric_cards, metric_cards: [...] } 提取 KPI 卡 */
function metricCardsFromContent(raw: unknown): PptSlide["metric_cards"] | undefined {
  if (!Array.isArray(raw)) return undefined;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!isMetricCardsContentItem(item)) continue;
    const cards = normalizeMetricCards(o.metric_cards);
    if (cards?.length) return cards;
  }
  return undefined;
}

function normalizeMetricCardSourceRefs(raw: unknown): number[] | undefined {
  if (raw == null) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  const refs = list.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  return refs.length ? refs : undefined;
}

function normalizeMetricCards(
  raw: unknown
): PptSlide["metric_cards"] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const cards = raw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      const value = String(o.value ?? "").trim();
      const label = String(o.label ?? "").trim();
      const detail = String(o.detail ?? "").trim();
      if (!value && !label) return null;
      const accent_color = normalizeAccentColor(o.accent_color);
      const source = String(o.source ?? "").trim();
      const sourceRefs = normalizeMetricCardSourceRefs(o.source_ref ?? o.source_refs);
      return {
        value,
        label,
        detail: detail || undefined,
        ...(source ? { source } : {}),
        ...(sourceRefs?.length
          ? { source_ref: sourceRefs.length === 1 ? sourceRefs[0] : sourceRefs }
          : {}),
        ...(accent_color ? { accent_color } : {}),
      };
    })
    .filter(Boolean) as NonNullable<PptSlide["metric_cards"]>;
  return cards.length ? cards : undefined;
}

function metricCardsFromHeroMetric(
  slide: PptSlide
): PptSlide["metric_cards"] | undefined {
  const hm = slide.hero_metric;
  if (!hm) return undefined;
  const value = String(hm.value ?? "").trim();
  const caption = String(hm.caption ?? "").trim();
  if (!value && !caption) return undefined;
  const accent_color = normalizeAccentColor(hm.accent_color);
  return [
    {
      value: value || caption,
      label: value ? caption : "",
      ...(accent_color ? { accent_color } : {}),
    },
  ];
}

function heroMetricStyle(
  hm: PptSlide["hero_metric"] | undefined
): Record<string, string> {
  const accent = normalizeAccentColor(hm?.accent_color);
  if (!accent) return {};
  return {
    borderLeftColor: accent,
    "--ppt-hero-accent": accent,
  };
}

function onHeroMetricBlur(event: Event, slideIdx: number, field: "value" | "caption") {
  const el = event.target as HTMLElement;
  const text = el.innerText.trim();
  const s = editableData.value.slides[slideIdx] as PptSlide;
  if (!s) return;
  if (!s.hero_metric) s.hero_metric = {};
  s.hero_metric[field] = text;
  isDirty.value = true;
}

/** data 页：左侧 metric_cards 纵列 + 右侧 chart */
function isMetricCardsChartSplitSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "data") return false;
  const cards = slide.metric_cards?.length ?? 0;
  if (!cards || (!slide.chart && !slide.table)) return false;
  const layout = String(slide.emphasis_layout || "")
    .trim()
    .toLowerCase();
  if (layout === "metric_cards_row") return false;
  if (
    layout === "metric_cards_column" ||
    layout === "metric_cards_split" ||
    layout === "metric_cards_left" ||
    layout === "kpi_chart"
  ) {
    return true;
  }
  return !resolveSlideBulletItems(slide).length;
}

function slideMetricCards(slide: PptSlide | undefined): NonNullable<PptSlide["metric_cards"]> {
  return slide?.metric_cards ?? [];
}

function slideEmphasisLayout(slide: PptSlide | undefined): string {
  return String(slide?.emphasis_layout ?? "")
    .trim()
    .toLowerCase();
}

function hasBodyPrimaryVisual(slide: PptSlide | undefined): boolean {
  return Boolean(slide?.table || slide?.chart);
}

function hasTableAndChart(slide: PptSlide | undefined): boolean {
  return Boolean(slide?.table && slide?.chart);
}

/** metric_cards_row：2+ 卡，主网格或 table/chart 上方 KPI 条 */
function shouldShowMetricCardsPrimaryGrid(slide: PptSlide | undefined): boolean {
  return slideMetricCards(slide).length >= 2 && slideEmphasisLayout(slide) === "metric_cards_row";
}

/** 无 emphasis_layout 时的 2+ 卡兜底网格（尺寸较小） */
function shouldShowMetricCardsCompactGrid(slide: PptSlide | undefined): boolean {
  if (isHeroLeftSlide(slide)) return false;
  const cards = slideMetricCards(slide).length;
  const layout = slideEmphasisLayout(slide);
  return cards >= 2 && layout !== "metric_cards_row";
}

function shouldShowMetricCardInline(slide: PptSlide | undefined): boolean {
  if (isHeroLeftSlide(slide)) return false;
  return slideMetricCards(slide).length === 1;
}

function isHeroLeftSlide(slide: PptSlide | undefined): boolean {
  return slideEmphasisLayout(slide) === "hero_left" && Boolean(slide?.hero_metric);
}

/** hero_left 右栏：无 right_items 时用 metric_cards 填充 */
function shouldShowHeroLeftMetricCards(slide: PptSlide | undefined): boolean {
  if (!isHeroLeftSlide(slide)) return false;
  if ((slide?.right_items?.length ?? 0) > 0) return false;
  return slideMetricCards(slide).length > 0;
}

/** hero_left 右栏：没有专用右侧内容时，把单表格放到右侧而不是落到下方 */
function shouldShowHeroLeftTable(slide: PptSlide | undefined): boolean {
  if (!isHeroLeftSlide(slide)) return false;
  if ((slide?.right_items?.length ?? 0) > 0) return false;
  if (shouldShowHeroLeftMetricCards(slide)) return false;
  return Boolean(slide?.table && !slide.chart);
}

/**
 * hero_left 右栏：从 content 列表生成叙事卡（去掉与 hero_metric 重复的一条）。
 * 可与 metric_cards 同栏叠放；有 right_items 或独占右栏的单表格时不使用。
 */
type HeroLeftFallbackCard = {
  title: string;
  description: string;
  index?: string;
  accent_color?: string;
};

function heroLeftContentRightItems(
  slide: PptSlide | undefined
): HeroLeftFallbackCard[] {
  if (!isHeroLeftSlide(slide)) return [];
  if ((slide?.right_items?.length ?? 0) > 0) return [];
  if (shouldShowHeroLeftTable(slide)) return [];

  const items = resolveSlideBulletItems(slide);
  if (!items.length) return [];

  const heroValue = String(slide?.hero_metric?.value || "").trim();
  const cards: HeroLeftFallbackCard[] = [];
  for (const item of items) {
    const { title, body } = splitContentItem(item);
    const cleanTitle = stripContentPointTitleMarkdown(title || "").trim();
    if (heroValue && cleanTitle && cleanTitle === heroValue) continue;

    const cardTitle = title || coerceContentItemText(item);
    const cardDesc = body;
    if (!cardTitle && !cardDesc) continue;
    cards.push({
      title: cardTitle,
      description: cardDesc,
    });
  }
  return cards;
}

function shouldShowHeroLeftContentItems(slide: PptSlide | undefined): boolean {
  return heroLeftContentRightItems(slide).length > 0;
}

/** @deprecated alias */
function heroLeftFallbackRightItems(slide: PptSlide | undefined): HeroLeftFallbackCard[] {
  return heroLeftContentRightItems(slide);
}

function shouldShowHeroLeftFallbackItems(slide: PptSlide | undefined): boolean {
  return shouldShowHeroLeftContentItems(slide);
}

/** 无正文/图表时，仅 metric_cards 铺满画布 */
function isMetricCardsOnlySlide(slide: PptSlide | undefined): boolean {
  if (!slide) return false;
  if (hasBodyPrimaryVisual(slide)) return false;
  if (isHeroLeftSlide(slide)) return false;
  if (shouldShowHeroMetricBanner(slide)) return false;
  if (slideMetricCards(slide).length < 1) return false;
  if (shouldShowContentBullets(slide)) return false;
  if ((slide.left_content?.length ?? 0) > 0) return false;
  if ((slide.right_content?.length ?? 0) > 0) return false;
  if ((slide.right_items?.length ?? 0) > 0) return false;
  return (
    shouldShowMetricCardsPrimaryGrid(slide) ||
    shouldShowMetricCardsCompactGrid(slide) ||
    shouldShowMetricCardInline(slide)
  );
}

function isMetricCardNumericValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /[0-9０-９]/.test(text);
}

function hasNarrativeMetricCards(slide: PptSlide | undefined): boolean {
  const cards = slideMetricCards(slide);
  if (!cards.length) return false;
  return cards.some((card) => {
    const value = String(card.value ?? "").trim();
    const label = String(card.label ?? "").trim();
    const hasDetail = Boolean(String(card.detail ?? "").trim());
    return hasDetail && (!isMetricCardNumericValue(value) || (label && label === value));
  });
}

function shouldFillMetricCards(slide: PptSlide | undefined): boolean {
  return isMetricCardsOnlySlide(slide) && !hasNarrativeMetricCards(slide);
}

function shouldUsePrimaryMetricCards(slide: PptSlide | undefined): boolean {
  return shouldShowMetricCardsPrimaryGrid(slide) && !hasBodyPrimaryVisual(slide) && !shouldFillMetricCards(slide);
}

function shouldShowHeroMetricBanner(slide: PptSlide | undefined): boolean {
  if (!slide?.hero_metric?.value && !slide?.hero_metric?.caption) return false;
  if (isHeroLeftSlide(slide)) return false;
  if (shouldShowMetricCardsPrimaryGrid(slide)) return false;
  if (shouldShowMetricCardsCompactGrid(slide)) return false;
  if (shouldShowMetricCardInline(slide)) return false;
  return true;
}

function shouldShowContentBullets(slide: PptSlide | undefined): boolean {
  if (isHeroLeftSlide(slide)) return false;
  return resolveSlideBulletItems(slide).length > 0;
}

/** 幻灯片正文区是否有文字要点（不含标题 / 图表标题） */
function slideHasTextBody(slide: PptSlide | undefined): boolean {
  if (!slide) return false;
  if (shouldShowContentBullets(slide)) return true;
  if ((slide.left_content?.length ?? 0) > 0) return true;
  if ((slide.right_content?.length ?? 0) > 0) return true;
  if ((slide.right_items?.length ?? 0) > 0) return true;
  if ((slide.content?.length ?? 0) > 0) return true;
  if (hasDocumentFigurePage(slide) && documentFigureLeftItems(slide).length > 0) return true;
  return false;
}

/** 无正文、仅图表/表格占主体的页面 */
function isVisualOnlySlide(slide: PptSlide | undefined): boolean {
  if (!slide) return false;
  if (!slide.chart && !slide.table) return false;
  return !slideHasTextBody(slide);
}

/** @deprecated 使用 shouldShowMetricCardsPrimaryGrid */
function isMetricCardsDataSlide(slide: PptSlide | undefined): boolean {
  return shouldShowMetricCardsPrimaryGrid(slide);
}

/** stacked_bar：从 values[] 或 value1/value2/... 提取分段数值 */
function extractStackedBarValues(item: ChartDataItem): number[] {
  const raw = item as unknown as Record<string, unknown>;
  if (Array.isArray(item.values) && item.values.length) {
    return item.values.map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
  }
  const keys = Object.keys(raw)
    .filter((k) => /^value\d+$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
  if (!keys.length) return [];
  return keys.map((k) => {
    const n = Number(raw[k]);
    return Number.isFinite(n) ? n : 0;
  });
}

function normalizeStackedBarChartItem(item: ChartDataItem): ChartDataItem {
  const base = normalizeChartItem(item);
  const values = extractStackedBarValues(item);
  if (!values.length) return base;
  return {
    ...base,
    values,
    value: values.reduce((a, b) => a + b, 0),
  };
}

function getStackedBarRowValues(d: ChartDataItem): number[] {
  return extractStackedBarValues(d);
}

function normalizeChartItem(item: ChartDataItem): ChartDataItem {
  const next: ChartDataItem = { ...item };
  const rawValue = (item as any).value;
  const series = toNumericSeries(rawValue);

  if (series.length) {
    next.value = series[0];
    if (next.secondary_value === undefined && series.length > 1) {
      next.secondary_value = series[1];
    }
    if (next.tertiary_value === undefined && series.length > 2) {
      next.tertiary_value = series[2];
    }
    return next;
  }

  // radar/fallback：当没有 value 但有 values 数组时，用第一个值兜底，避免 NaN
  if (Array.isArray(next.values) && next.values.length > 0) {
    next.value = Number(next.values[0]) || 0;
    return next;
  }

  next.value = 0;
  return next;
}

/**
 * 解析 TOC 条目的标题部分
 * 支持格式："01 市场现状 — 行业底部确认，止跌回稳" 或 "市场现状"
 */
function parseTocTitle(item: string): string {
  // 去掉开头的序号（如 "01 " 或 "01. "）
  const stripped = item.replace(/^\d{1,2}[\.\s]\s*/, "");
  // 按中文破折号或英文长短破折号分割（排除数字之间的连字符，如 2026-2030）
  const sep = stripped.search(/\s*[—–]\s*|\s+\-\s+|(?<!\d)\-(?!\d)/);
  return sep > 0 ? stripped.slice(0, sep).trim() : stripped.trim();
}

/**
 * 解析 TOC 条目的描述部分（破折号后面的文字）
 */
function parseTocDesc(item: string): string {
  const stripped = item.replace(/^\d{1,2}[\.\s]\s*/, "");
  // 排除数字之间的连字符（如 2026-2030）
  const sep = stripped.search(/\s*[—–]\s*|\s+\-\s+|(?<!\d)\-(?!\d)/);
  if (sep <= 0) return "";
  const match = stripped.slice(sep).match(/^[\s—–\-]+(.*)$/);
  return match ? match[1].trim() : "";
}

/** 目录页展示条目：优先 toc_items，回退 content 解析 */
function getTocEntries(slide: PptSlide | undefined): PptTocEntry[] {
  if (!slide) return [];
  const structured = slide.toc_items;
  if (Array.isArray(structured) && structured.length) {
    return structured
      .map((item, i) => ({
        number: item.number?.trim() || String(i + 1).padStart(2, "0"),
        title: item.title?.trim() || "",
        description: item.description?.trim() || "",
        icon: item.icon?.trim() || undefined,
      }))
      .filter((e) => e.title || e.description);
  }
  return (slide.content || []).map((item, i) => ({
    number: String(i + 1).padStart(2, "0"),
    title: parseTocTitle(item),
    description: parseTocDesc(item),
    raw: item,
  }));
}

/** 目录页密度：条目多时缩小字号与间距，保证一屏展示 */
function tocDensityLevel(slide: PptSlide | undefined): "default" | "medium" | "compact" {
  const n = getTocEntries(slide).length;
  if (n >= 6) return "compact";
  if (n >= 4) return "medium";
  return "default";
}

/** 目录图标槽位（0–5），与模板内 SVG 分支对应 */
function tocIconIndex(entry: PptTocEntry, ti: number): number {
  const icon = (entry.icon || "").toLowerCase();
  const map: Record<string, number> = {
    timeline: 0,
    wave: 0,
    diplomacy: 4,
    users: 4,
    people: 4,
    globe: 2,
    world: 2,
    search: 2,
    trend_up: 3,
    trending_up: 3,
    chart: 3,
    bar: 3,
    monitor: 1,
    screen: 1,
    doc: 5,
    document: 5,
  };
  if (icon && icon in map) return map[icon];
  return ti % 6;
}

const CONTENT_LIST_KEYS = [
  "items",
  "bullets",
  "bullet_points",
  "points",
  "entries",
  "list",
  "rows",
] as const;

/** 将任意后端字段安全转为展示用字符串，避免 [object Object] */
function pickDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = pickDisplayString(entry);
      if (text) return text;
    }
    return "";
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of [
      "text",
      "value",
      "label",
      "title",
      "content",
      "description",
      "body",
      "en",
      "zh",
      "name",
    ]) {
      const text = pickDisplayString(o[key]);
      if (text) return text;
    }
  }
  const fallback = String(value).trim();
  return fallback === "[object Object]" ? "" : fallback;
}

/** 将 content 单项统一为字符串（支持后端对象形态） */
function coerceContentItemText(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (Array.isArray(item)) {
    const nested = normalizeSlideContent(item);
    if (nested?.length === 1) return nested[0];
    if (nested?.length) return nested.join("\n");
    return "";
  }
  if (item && typeof item === "object") {
    if (isMetricCardsContentItem(item)) return "";
    const o = item as Record<string, unknown>;
    const title = pickDisplayString(
      o.title ?? o.heading ?? o.label ?? o.name ?? o.feature ?? o.module ?? o.point
    );
    const body = pickDisplayString(
      o.description ??
        o.body ??
        o.text ??
        o.detail ??
        o.content ??
        o.desc ??
        o.summary ??
        o.markdown ??
        o.md
    );
    if (title && body) return `${title} — ${body}`;
    if (title) return title;
    if (body) return body;
  }
  return pickDisplayString(item);
}

function displayText(item: unknown): string {
  return coerceContentItemText(item);
}

function modernLiteraryCleanText(item: unknown): string {
  return displayText(item)
    .replace(/(^|\s)\((\/resource\/[^)]+|https?:\/\/[^)\s]+#page=[^)]+)\)/g, "$1")
    .replace(/\bhttps?:\/\/\S+#page=\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shouldUseModernLiterarySlide(slide: PptSlide | null | undefined): boolean {
  if (!isModernLiteraryMinimal.value || !slide) return false;
  return ["cover", "section", "quote", "content", "two_column"].includes(slide.layout);
}

function isModernLiteraryQuotedFragment(item: unknown): boolean {
  const text = modernLiteraryCleanText(item);
  if (!text || !/\[\d+\]/.test(text)) return false;
  return (
    /[“”"「」『』《》]/.test(text) ||
    /(^|\s)(\.{3}|…)/.test(text) ||
    text.includes("...")
  );
}

function modernLiteraryQuoteText(slide: PptSlide): string {
  return modernLiteraryCleanText(
    slide.quote || slide.content?.[0] || slide.key_insight || slide.title || ""
  );
}

function modernLiteraryQuoteItems(slide: PptSlide): string[] {
  return (slide.content || []).filter(isModernLiteraryQuotedFragment).slice(0, 2);
}

function modernLiteraryBodyItems(slide: PptSlide): string[] {
  const all = slide.content || [];
  // 引文区已展示的条目（按清洗后文本去重），卡片区一律排除，避免重复渲染
  const usedInQuotes = new Set(
    modernLiteraryQuoteItems(slide).map((t) => modernLiteraryCleanText(t)).filter(Boolean)
  );
  const available = all.filter(
    (item) => !usedInQuotes.has(modernLiteraryCleanText(item))
  );
  const nonQuoted = available.filter((item) => !isModernLiteraryQuotedFragment(item));
  // 优先展示非引文条目；若全部都是引文片段，则展示引文区之外剩余的条目
  return (nonQuoted.length ? nonQuoted : available).slice(0, 4);
}

function modernLiteraryPlainItems(slide: PptSlide): string[] {
  return (slide.content || []).filter((item) => !isModernLiteraryQuotedFragment(item));
}

function modernLiteraryMultiItems(slide: PptSlide): string[] {
  const items = modernLiteraryPlainItems(slide);
  return items.length > 3 ? items.slice(0, 4) : [];
}

function isModernLiteraryMultiContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryMultiItems(slide).length > 3;
}

/** 恰好/超过 4 条 content 时，用卡片矩阵呈现（不过滤引用片段，避免拆成引文+卡片重复） */
function modernLiteraryQuadItems(slide: PptSlide): string[] {
  return (slide.content || []).filter((t) => !!modernLiteraryCleanText(t)).slice(0, 4);
}

function isModernLiteraryQuadContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryQuadItems(slide).length >= 4;
}

function modernLiteraryQuadVariant(slide: PptSlide): "numbered" | "panel" | "grid" {
  const hinted = slideEmphasisLayout(slide);
  if (hinted.includes("number")) return "numbered";
  if (hinted.includes("panel") || hinted.includes("card")) return "panel";
  if (hinted.includes("grid")) return "grid";
  const variants = ["numbered", "panel", "grid"] as const;
  const n = Number(slide.index || currentSlide.value + 1);
  return variants[Math.abs(n - 1) % variants.length];
}

type ModernLiteraryRightItem = NonNullable<PptSlide["right_items"]>[number];

function isModernLiteraryRightItemsContent(slide: PptSlide): boolean {
  return (
    slide.layout === "content" &&
    (slide.right_items?.length ?? 0) > 0 &&
    modernLiteraryPlainItems(slide).length === 0
  );
}

function modernLiterarySplitTitle(title: string): { kicker: string; hero: string } {
  const trimmed = (title ?? "").trim();
  for (const sep of [" — ", " – ", " - ", ": "]) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0) {
      return {
        kicker: trimmed.slice(0, idx).trim(),
        hero: trimmed.slice(idx + sep.length).trim(),
      };
    }
  }
  return { kicker: "", hero: trimmed };
}

function modernLiteraryPortraitKicker(slide: PptSlide): string {
  const { kicker } = modernLiterarySplitTitle(slide.title || "");
  return kicker || (slide.subtitle || "").trim();
}

function modernLiteraryPortraitHeroTitle(slide: PptSlide): string {
  const { hero, kicker } = modernLiterarySplitTitle(slide.title || "");
  return hero || kicker || slide.title || "";
}

function modernLiteraryPortraitHeroBody(slide: PptSlide): string {
  return (slide.speaker_notes || slide.subtitle || "").trim();
}

function modernLiteraryRightItemTitleAccentClass(
  ri: ModernLiteraryRightItem,
  idx: number,
): boolean {
  if (ri.highlight === true || ri.emphasis === true) return true;
  return idx === 1;
}

function modernLiteraryRightItemTitleAccentStyle(
  ri: ModernLiteraryRightItem,
  idx: number,
): Record<string, string> | undefined {
  if (!modernLiteraryRightItemTitleAccentClass(ri, idx)) return undefined;
  const accent = (ri.accent_color || "").trim();
  if (accent) return { color: accent };
  return { color: "var(--modern-accent)" };
}

function modernLiteraryDoubleItems(slide: PptSlide): string[] {
  const items = modernLiteraryPlainItems(slide);
  return items.length === 2 ? items : [];
}

function isModernLiteraryDoubleContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryDoubleItems(slide).length === 2;
}

function modernLiteraryDoubleVariant(
  slide: PptSlide,
): "contrast" | "split" | "stacked" | "numbered" {
  const hinted = slideEmphasisLayout(slide);
  if (hinted.includes("split") || hinted.includes("hero")) return "split";
  if (hinted.includes("stack") || hinted.includes("quote")) return "stacked";
  if (hinted.includes("number") || hinted.includes("list")) return "numbered";
  if (hinted.includes("contrast") || hinted.includes("compare")) return "contrast";
  const variants = ["contrast", "split", "stacked", "numbered"] as const;
  const n = Number(slide.index || currentSlide.value + 1);
  return variants[Math.abs(n - 1) % variants.length];
}

function modernLiteraryTripleItems(slide: PptSlide): string[] {
  const items = modernLiteraryPlainItems(slide);
  return items.length === 3 ? items : [];
}

function isModernLiteraryTripleContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryTripleItems(slide).length === 3;
}

function modernLiteraryInlineKeyInsight(slide: PptSlide): boolean {
  if (isModernLiteraryRightItemsContent(slide)) return true;
  if (isModernLiteraryDoubleContent(slide)) return true;
  if (isModernLiteraryQuadContent(slide)) return true;
  if (isModernLiteraryTripleContent(slide)) {
    return modernLiteraryTripleVariant(slide) !== "cards";
  }
  return false;
}

function modernLiteraryTriplePrefersCards(slide: PptSlide): boolean {
  const items = modernLiteraryTripleItems(slide);
  if (!items.length) return false;
  const bodyLengths = items.map((item) => parseContentBody(item).replace(/\s+/g, "").length);
  const maxLen = Math.max(...bodyLengths);
  const avgLen = bodyLengths.reduce((sum, len) => sum + len, 0) / bodyLengths.length;
  // Orbit/circle 仅适合竞品那种「标题 + 一句短引文」；长段落对比用卡片
  return maxLen > 56 || avgLen > 40;
}

function modernLiteraryTripleDarkIndex(slide: PptSlide): number {
  const n = Number(slide.index || currentSlide.value + 1);
  return Math.abs(n - 1) % 3;
}

function modernLiteraryTripleVariant(slide: PptSlide): "portrait" | "orbit" | "cards" {
  const hinted = slideEmphasisLayout(slide);
  const prefersCards = modernLiteraryTriplePrefersCards(slide);
  if (prefersCards) return "cards";
  if (hinted.includes("orbit") || hinted.includes("circle")) return "orbit";
  if (hinted.includes("card")) return "cards";
  if (hinted.includes("portrait") || hinted.includes("split")) return "portrait";
  const variants = ["portrait", "orbit", "cards"] as const;
  const n = Number(slide.index || currentSlide.value + 1);
  return variants[Math.abs(n - 1) % variants.length];
}

function modernLiteraryRightItems(slide: PptSlide): string[] {
  if (slide.right_items?.length) {
    return slide.right_items
      .map((item) => {
        const title = rightItemTitle(item);
        const desc = rightItemDescription(item);
        return modernLiteraryCleanText(title && desc ? `${title} — ${desc}` : title || desc);
      })
      .filter(Boolean)
      .slice(0, 3);
  }
  return (slide.right_content || []).map(modernLiteraryCleanText).filter(Boolean).slice(0, 3);
}

function modernLiteraryFooterQuote(slide: PptSlide): string {
  return modernLiteraryQuoteItems(slide)[0] || "";
}

/**
 * two_column 底部金句：优先用 key_insight，回退到引文片段。
 * content 为空时会被规范化成 left_content，导致 footer quote 与左栏首条重复，
 * 因此这里排除任何已展示在左/右栏的文本，避免重复渲染。
 */
function modernLiteraryTwoColumnFooter(slide: PptSlide): string {
  const used = new Set(
    [...(slide.left_content || []), ...(slide.right_content || [])]
      .map((t) => modernLiteraryCleanText(t))
      .filter(Boolean)
  );
  const candidates = [slide.key_insight || "", modernLiteraryFooterQuote(slide)];
  for (const candidate of candidates) {
    const clean = modernLiteraryCleanText(candidate);
    if (clean && !used.has(clean)) return candidate;
  }
  return "";
}

function modernLiteraryCompareTitleDuplicatesSlide(
  columnTitle?: string,
  slideTitle?: string,
): boolean {
  const col = (columnTitle ?? "").trim();
  const title = (slideTitle ?? "").trim();
  return Boolean(col && title && col === title);
}

function rightItemTitle(ri: { title?: unknown }): string {
  return pickDisplayString(ri.title);
}

function rightItemDescription(ri: { description?: unknown }): string {
  return pickDisplayString(ri.description);
}

function normalizeStringList(raw: unknown): string[] | undefined {
  const items = normalizeSlideContent(raw);
  return items?.length ? items : undefined;
}

/** 页底来源：后端可能发 string 或 page_reference[] */
function normalizeDataSourceLine(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const segments: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) segments.push(t);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const refId = o.ref_id ?? o.refId;
    const doc = pickDisplayString(o.document_name ?? o.title);
    const page = pickDisplayString(o.page_label);
    let seg = doc;
    if (page) seg = seg ? `${seg} — ${page}` : page;
    if (refId != null && refId !== "") seg = seg ? `${seg} [${refId}]` : `[${refId}]`;
    if (seg.trim()) segments.push(seg.trim());
  }
  return segments.length ? segments.join(" · ") : undefined;
}

function normalizeRightItems(raw: unknown): PptSlide["right_items"] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const out = raw
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { title: text } : null;
      }
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const title = pickDisplayString(o.title);
      const description = pickDisplayString(
        o.description ?? o.desc ?? o.body ?? o.text ?? o.content
      );
      const index = pickDisplayString(o.index);
      const accent_color = pickDisplayString(o.accent_color);
      const icon = pickDisplayString(o.icon);
      if (!title && !description) return null;
      return {
        ...(index ? { index } : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(accent_color ? { accent_color } : {}),
        ...(icon ? { icon } : {}),
      };
    })
    .filter(Boolean) as NonNullable<PptSlide["right_items"]>;
  return out.length ? out : undefined;
}

/** 标题与正文之间的分隔符（含多种 Unicode 破折号） */
const CONTENT_TITLE_SEP_RE =
  /\s*([—–\-－―‒−]|[：:])\s*/;

/** 拆分「标题 + 正文」：支持 **标题** — 正文 / 冒号 / 破折号 */
function splitContentItem(item: unknown): { title: string; body: string } {
  const text = coerceContentItemText(item);
  if (!text) return { title: "", body: "" };

  const stripped = text.replace(/^\d{1,2}[\.\s]\s*/, "");

  const boldLine = stripped.match(
    /^\*\*([^*]+)\*\*\s*(?:[—–\-－―‒−]|[：:])\s*([\s\S]+)$/
  );
  if (boldLine) {
    return {
      title: `**${boldLine[1].trim()}**`,
      body: boldLine[2].trim(),
    };
  }

  const sep = stripped.search(CONTENT_TITLE_SEP_RE);
  if (sep > 0) {
    const title = stripped.slice(0, sep).trim();
    const body = stripped
      .slice(sep)
      .replace(CONTENT_TITLE_SEP_RE, "")
      .trim();
    return { title, body };
  }

  const colon = stripped.match(/^(.{1,48}?)[：:]\s+([\s\S]+)$/);
  if (colon) {
    return { title: colon[1].trim(), body: colon[2].trim() };
  }

  return { title: stripped.trim(), body: "" };
}

function stripContentPointTitleMarkdown(title: string): string {
  return title.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
}

function parseContentHeading(item: unknown): string {
  return splitContentItem(item).title;
}

function parseContentBody(item: unknown): string {
  const { title, body } = splitContentItem(item);
  return body || coerceContentItemText(item);
}

function contentPointTitle(item: unknown): string {
  const { title, body } = splitContentItem(item);
  const raw = title || parseTocTitle(coerceContentItemText(item)) || body || coerceContentItemText(item);
  return stripContentPointTitleMarkdown(raw);
}

function contentPointBody(item: unknown): string {
  return parseContentBody(item);
}

function hasContentPointBody(item: unknown): boolean {
  const title = contentPointTitle(item).trim();
  const body = contentPointBody(item).trim();
  return body.length > 0 && body !== title;
}

function normalizeSlideContent(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const nested = normalizeSlideContent(JSON.parse(trimmed));
        if (nested?.length) return nested;
      } catch {
        /* 非 JSON 字符串，按正文处理 */
      }
    }
    const lines = trimmed
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length ? lines : [trimmed];
  }

  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (isMetricCardsContentItem(item)) continue;
      if (Array.isArray(item)) {
        const nested = normalizeSlideContent(item);
        if (nested?.length) out.push(...nested);
        continue;
      }
      const text = coerceContentItemText(item);
      if (text) out.push(text);
    }
    return out.length ? out : undefined;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of CONTENT_LIST_KEYS) {
      if (Array.isArray(o[key])) {
        return normalizeSlideContent(o[key]);
      }
    }
    const single = coerceContentItemText(raw);
    return single ? [single] : undefined;
  }

  return undefined;
}

/** 解析幻灯片要点列表（content / left_content / 嵌套 items 等） */
function resolveSlideBulletItemsRaw(slide: PptSlide | undefined): string[] | undefined {
  if (!slide) return undefined;
  const extra = slide as unknown as Record<string, unknown>;
  const candidates: unknown[] = [
    slide.content,
    slide.left_content,
    extra.bullets,
    extra.bullet_points,
    extra.points,
  ];
  for (const raw of candidates) {
    const items = normalizeSlideContent(raw);
    if (items?.length) return items;
  }
  return undefined;
}

function resolveSlideBulletItems(slide: PptSlide | undefined): string[] {
  return getContentItems(resolveSlideBulletItemsRaw(slide));
}

/** 无图表 topic 卡网格：2+ 项时均分剩余高度，避免卡片缩在顶部留白 */
function topicGridFillStyle(slide: PptSlide | undefined): Record<string, string> {
  const count = resolveSlideBulletItems(slide).length;
  if (count < 2) return {};
  const cols = count <= 3 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  return { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` };
}

/**
 * 判断一条 content 是否为底部总结
 */
function isSummaryItem(item: unknown): boolean {
  const text = coerceContentItemText(item);
  return /^(总结|结论|核心洞察|核心观点|小结|Summary|Conclusion|Key Insights|Key Takeaways)[：:]/i.test(
    text
  );
}

/**
 * 获取不含底部总结的内容项
 */
function getContentItems(content: string[] | undefined): string[] {
  if (!content?.length) return [];
  const items = content.map(coerceContentItemText).filter(Boolean);
  const last = items[items.length - 1];
  if (last && isSummaryItem(last)) return items.slice(0, -1);
  return items;
}

/**
 * 获取底部总结项（如果存在）
 */
function getSummaryItem(content: string[] | undefined): string | null {
  if (!content?.length) return null;
  const items = content.map(coerceContentItemText).filter(Boolean);
  const last = items[items.length - 1];
  return last && isSummaryItem(last) ? last : null;
}

function resolveSlideSpeakerNotes(s?: PptSlide | null): string {
  if (!s) return "";
  const raw = s as unknown as Record<string, unknown>;
  const notes = s.speaker_notes ?? raw.speakerNotes ?? raw.speaker_note;
  return typeof notes === "string" ? notes.trim() : "";
}

function enrichSlideSpeakerNotes(input: PptSlide): PptSlide {
  const notes = resolveSlideSpeakerNotes(input);
  if (!notes || input.speaker_notes === notes) return input;
  return { ...input, speaker_notes: notes };
}

function normalizeTable(table: PptTable | undefined): PptTable | undefined {
  if (!table) return undefined;
  const cols = Array.isArray(table.columns)
    ? table.columns.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];
  if (cols.length < 2 || cols.length > 8) return undefined;

  const colCount = cols.length;
  const rows = (Array.isArray(table.rows) ? table.rows : [])
    .slice(0, 12)
    .map((row) => {
      const cells = Array.isArray(row) ? row.map((c) => String(c ?? "")) : [];
      while (cells.length < colCount) cells.push("");
      return cells.slice(0, colCount);
    })
    .filter((row) => row.some((c) => c.trim()));
  if (!rows.length) return undefined;

  const notes = String(table.notes ?? table.note ?? "").trim();
  let highlight_column = table.highlight_column;
  if (
    highlight_column != null &&
    (!Number.isInteger(highlight_column) ||
      highlight_column < 0 ||
      highlight_column >= colCount)
  ) {
    highlight_column = undefined;
  }

  const sourceRefs = Array.isArray(table.source_refs)
    ? table.source_refs.filter((id) => id != null && !Number.isNaN(Number(id)))
    : undefined;

  return {
    ...table,
    columns: cols,
    rows,
    ...(notes ? { notes, note: notes } : {}),
    ...(highlight_column != null ? { highlight_column } : {}),
    ...(sourceRefs?.length ? { source_refs: sourceRefs } : {}),
  };
}

function normalizeSlideData(input: PptSlide | null): PptSlide | null {
  if (!input) return input;
  let withNotes = enrichSlideSpeakerNotes(input);
  const data_source_line = normalizeDataSourceLine(
    (withNotes as { data_source_line?: unknown }).data_source_line
  );
  if (data_source_line) {
    withNotes = { ...withNotes, data_source_line };
  }
  let chart = withNotes.chart ? normalizeChart(withNotes.chart) : undefined;
  let table = withNotes.table ? normalizeTable(withNotes.table) : undefined;
  let metric_cards = normalizeMetricCards(
    (withNotes as { metric_cards?: unknown }).metric_cards
  );
  let metricCardsFromContentBlock = false;
  if (!metric_cards?.length) {
    const fromContent = metricCardsFromContent(withNotes.content);
    if (fromContent?.length) {
      metric_cards = fromContent;
      metricCardsFromContentBlock = true;
    }
  }
  if (!metric_cards?.length) {
    const layout = String(withNotes.emphasis_layout ?? "")
      .trim()
      .toLowerCase();
    if (layout !== "hero_left") {
      metric_cards = metricCardsFromHeroMetric(withNotes);
    }
  }
  const content = resolveSlideBulletItemsRaw(withNotes);
  const left_content = normalizeStringList(withNotes.left_content);
  const right_content = normalizeStringList(withNotes.right_content);
  const right_items = normalizeRightItems(withNotes.right_items);
  const hero_metric = withNotes.hero_metric;
  if (
    !chart &&
    !table &&
    !metric_cards?.length &&
    !content?.length &&
    !left_content?.length &&
    !right_content?.length &&
    !right_items?.length &&
    !hero_metric
  ) {
    return withNotes;
  }
  const next: PptSlide = { ...withNotes };
  if (chart) next.chart = chart;
  if (table) next.table = table;
  if (metric_cards?.length) next.metric_cards = metric_cards;
  if (metricCardsFromContentBlock && !next.emphasis_layout) {
    next.emphasis_layout = "metric_cards_row";
  }
  if (content?.length) {
    next.content = content;
  } else if (Array.isArray(withNotes.content) && withNotes.content.length > 0) {
    const fallback = withNotes.content
      .filter((item) => !isMetricCardsContentItem(item))
      .map((item) =>
        typeof item === "string" ? item.trim() : coerceContentItemText(item)
      )
      .filter(Boolean);
    if (fallback.length) next.content = fallback;
  }
  if (Array.isArray(withNotes.left_content) || left_content?.length) {
    next.left_content = left_content ?? [];
  }
  if (Array.isArray(withNotes.right_content) || right_content?.length) {
    next.right_content = right_content ?? [];
  }
  if (Array.isArray(withNotes.right_items) || right_items?.length) {
    next.right_items = right_items ?? [];
  }
  if (hero_metric) next.hero_metric = hero_metric;
  return next;
}

function normalizePptData(data: PptData): PptData {
  return {
    ...data,
    slides: data.slides.map((s) => normalizeSlideData(s) ?? enrichSlideSpeakerNotes(s)),
  };
}

/** 当前数据源：编辑/查看均规范化 content、chart 等，避免对象形态 content 无法解析 */
const pptSource = computed<PptData>(() => {
  const base = isEditing.value ? editableData.value : props.pptData;
  return normalizePptData(base);
});

const MODERN_LITERARY_TEMPLATE_ID = "modern-literary-minimal";
/** modern-literary-minimal 中文回退：走 custom-chinese-fonts 目录，不再硬编码 Noto Serif SC */
const MODERN_LITERARY_ZH_DISPLAY = "ZCOOL XiaoWei";
const MODERN_LITERARY_ZH_BODY = "LXGW WenKai TC";
const MODERN_LITERARY_DEFAULT_GOOGLE_FONTS = [
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap",
  "https://fonts.googleapis.com/css2?family=Oxanium:wght@200;400;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap",
];

const modernLiteraryTokens = computed(() => pptSource.value.palette?.theme_tokens ?? {});
const modernLiteraryTemplateId = computed(
  () =>
    modernLiteraryTokens.value.template_id ||
    pptSource.value.html_template_recommendation?.template_id ||
    ""
);
const isModernLiteraryMinimal = computed(
  () => modernLiteraryTemplateId.value === MODERN_LITERARY_TEMPLATE_ID
);

const modernLiteraryColors = computed(() => {
  const palette = pptSource.value.palette || {};
  return {
    bg: palette.bg_color || "#fdfcf8",
    surface: palette.bg_color_secondary || "#f4f2ed",
    accent: palette.accent_color || "#c41e3a",
    text: palette.text_color || "#1a1a1a",
    muted: palette.text_secondary || "#888888",
  };
});

const modernLiteraryFonts = computed(() => {
  const typography = modernLiteraryTokens.value.typography || {};
  const display = typography.font_display || MODERN_LITERARY_ZH_DISPLAY;
  const heading = typography.font_heading || display;
  const body = typography.font_body || MODERN_LITERARY_ZH_BODY;
  const zhDisplay = MODERN_LITERARY_ZH_DISPLAY;
  const zhBody = MODERN_LITERARY_ZH_BODY;
  return {
    display: `${display}, "Playfair Display", "${zhDisplay}", serif`,
    heading: `${heading}, "Playfair Display", "${zhDisplay}", serif`,
    body: `${body}, "${zhBody}", "${zhDisplay}", "Oxanium", serif`,
  };
});

const modernLiteraryCoverTagline = computed(() => {
  const s = slide.value;
  const raw =
    s?.brand_footer ||
    pptSource.value.brand_footer ||
    currentBrandFooter.value ||
    "";
  const text = String(raw).trim();
  if (!text || text.length > 64) return "";
  return text;
});

const modernLiteraryGoogleFontUrls = computed(() => {
  const urls = pptSource.value.palette?.theme_tokens?.typography?.google_fonts_urls ?? [];
  if (!isModernLiteraryMinimal.value) return urls;
  return [...new Set([...urls, ...MODERN_LITERARY_DEFAULT_GOOGLE_FONTS])];
});

/** 章节联网配图索引（ppt_data.chapter_images + section slide 兜底） */
const chapterImageIndex = computed(() => buildChapterImageIndex(pptSource.value));

const currentChapterImages = computed(() =>
  getChapterImagesForSlide(
    pptSource.value.slides,
    currentSlide.value,
    chapterImageIndex.value
  )
);

const slideChapterImages = computed(() =>
  resolveSlideChapterImages(slide.value ?? undefined)
);

const documentFigure = computed(() =>
  normalizeDocumentFigure(slide.value ?? undefined)
);

/** cover 全页背景：仅 resolveSlideVisual kind === slide_background */
const coverBackdropUrl = computed(() => {
  const s = slide.value;
  if (!s || s.layout !== "cover") return "";
  const visual = resolveSlideVisual(s);
  return visual.kind === "slide_background" ? visual.url : "";
});

function documentFigureLeftItems(s: PptSlide): string[] {
  if (s.left_content?.length) return s.left_content as string[];
  const items = s.content ?? [];
  if (!items.length) return [];
  if (typeof s.column_split === "number" && s.column_split > 0) {
    return items.slice(0, Math.min(s.column_split, items.length));
  }
  return items;
}

function documentFigureColumnStyle(s: PptSlide): Record<string, string> | undefined {
  if (!hasDocumentFigurePage(s)) return undefined;
  const [leftPct, rightPct] = parseColumnSplit(s.column_split);
  return {
    display: "grid",
    gridTemplateColumns: `${leftPct}fr ${rightPct}fr`,
  };
}

function documentFigureImgStyle(fig: DocumentFigure): Record<string, string> {
  const style: Record<string, string> = {};
  if (fig.width && fig.height) {
    style.aspectRatio = `${fig.width} / ${fig.height}`;
  }
  return style;
}

function onDocumentFigureLeftItemBlur(event: Event, itemIdx: number) {
  const s = slide.value;
  if (!s) return;
  if (s.left_content?.length) {
    onListItemBlur(event, currentSlide.value, "left_content", itemIdx);
  } else {
    onContentItemBlur(event, currentSlide.value, itemIdx);
  }
}

function onDocumentFigureCaptionBlur(event: Event) {
  const s = slide.value;
  if (!s?.document_figure) {
    onCellBlur(event, `slides.${currentSlide.value}.image_caption`);
    return;
  }
  onCellBlur(event, `slides.${currentSlide.value}.document_figure.caption`);
}

/** 整份 PPT 统一字体（隶书/宋体/楷体/黑体/魏碑 择一，标题与正文同源） */
const pptDeckFontFamily = computed(() => resolvePptDeckFontFamilyFromData(pptSource.value));
const pptDeckFontCss = computed(() => buildFontFamilyCss(pptDeckFontFamily.value));

watch(
  pptDeckFontFamily,
  (family) => {
    if (isModernLiteraryMinimal.value) return;
    void loadFont(family);
  },
  { immediate: true }
);

watch(
  () => (isModernLiteraryMinimal.value ? modernLiteraryFonts.value : null),
  (fonts) => {
    if (!fonts) return;
    const families = new Set<string>();
    for (const stack of [fonts.display, fonts.heading, fonts.body]) {
      for (const family of parseFontFamilyCssStack(stack)) {
        families.add(family);
      }
    }
    for (const family of families) {
      void loadFont(family);
    }
  },
  { immediate: true }
);

watch(
  modernLiteraryGoogleFontUrls,
  (urls) => syncPptGoogleFontLinks(urls),
  { immediate: true }
);

function parseComputedFontFamily(raw: string): string[] {
  return raw
    .split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function probeRenderedFontFamily(family: string, sample: string): boolean {
  if (typeof document === "undefined" || !document.fonts) return false;
  return document.fonts.check(`16px "${family}"`, sample);
}

function resolveRenderedFontFamily(stack: string[], samples: string[]): string {
  for (const sample of samples) {
    for (const family of stack) {
      if (probeRenderedFontFamily(family, sample)) {
        return family;
      }
    }
  }
  return stack[0] || "unknown";
}

function describeFontCatalogSource(family: string): string {
  const entry = findRuntimeCustomFontEntry(family);
  if (!entry) return "google-or-system";
  if (entry.sourceType === "css" && entry.cssUrl) return `custom-chinese-fonts.cssUrl`;
  if (entry.sourceType === "file" && entry.files?.length) return `custom-chinese-fonts.file`;
  return `custom-chinese-fonts.${entry.sourceType}`;
}

function logModernLiteraryFontUsage() {
  if (!isModernLiteraryMinimal.value) return;

  const wrapper = slideWrapperRef.value;
  const fonts = modernLiteraryFonts.value;
  const typography = modernLiteraryTokens.value.typography ?? {};
  const targets: Array<{
    role: string;
    selector: string;
    configuredStack: string;
    cjkSample: string;
    latinSample: string;
  }> = [
    {
      role: "cover-title",
      selector: ".ppt-modern-cover-title",
      configuredStack: fonts.display,
      cjkSample: "杀死",
      latinSample: "Mockingbird",
    },
    {
      role: "cover-subtitle",
      selector: ".ppt-modern-cover-subtitle",
      configuredStack: fonts.heading,
      cjkSample: "成长",
      latinSample: "Scout",
    },
    {
      role: "slide-title",
      selector: ".ppt-modern-slide-title, .ppt-modern-section-title",
      configuredStack: fonts.display,
      cjkSample: "标题",
      latinSample: "Title",
    },
    {
      role: "body",
      selector:
        ".ppt-modern-multi-body, .ppt-modern-explain-body, .ppt-modern-cover-footer, .ppt-modern-double-card-body",
      configuredStack: fonts.body,
      cjkSample: "正文",
      latinSample: "body",
    },
  ];

  const rendered: Record<string, unknown> = {};
  for (const target of targets) {
    const el = wrapper?.querySelector(target.selector) as HTMLElement | null;
    if (!el) continue;
    const computedFontFamily = getComputedStyle(el).fontFamily;
    const computedStack = parseComputedFontFamily(computedFontFamily);
    const activeCjk = resolveRenderedFontFamily(computedStack, [target.cjkSample]);
    const activeLatin = resolveRenderedFontFamily(computedStack, [target.latinSample]);
    rendered[target.role] = {
      selector: target.selector,
      configuredStack: target.configuredStack,
      computedFontFamily,
      activeForCjk: activeCjk,
      activeForLatin: activeLatin,
      activeForCjkSource: describeFontCatalogSource(activeCjk),
      activeForLatinSource: describeFontCatalogSource(activeLatin),
    };
  }

  console.info("[PptViewer][Fonts] modern-literary-minimal", {
    slideIndex: currentSlide.value,
    layout: slide.value?.layout,
    typographyTokens: typography,
    cssVars: {
      "--ppt-font-display": paletteStyle.value["--ppt-font-display"],
      "--ppt-font-heading": paletteStyle.value["--ppt-font-heading"],
      "--ppt-font-body": paletteStyle.value["--ppt-font-body"],
    },
    configuredStacks: fonts,
    rendered,
  });
}

watch(
  () =>
    [
      isModernLiteraryMinimal.value,
      currentSlide.value,
      slide.value?.layout,
      modernLiteraryFonts.value.display,
      modernLiteraryFonts.value.heading,
      modernLiteraryFonts.value.body,
    ] as const,
  () => {
    void nextTick(async () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise<void>((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
      logModernLiteraryFontUsage();
    });
  },
  { immediate: true }
);

// 当前幻灯片（导出时可能被 overrideContent 覆盖）
const slideForExport = computed<PptSlide | null>(() => {
  const source = pptSource.value;
  const s = source.slides[currentSlide.value] ?? null;
  if (!s) return null;
  const base =
    overrideContent.value === null ? s : { ...s, content: overrideContent.value };
  return normalizeSlideData(base);
});

const slide = computed(() => slideForExport.value);

const currentBrandFooter = computed(() =>
  resolveBrandFooter(slide.value, pptSource.value)
);

const slideSpeakerNotesText = computed(() => resolveSlideSpeakerNotes(slide.value));

/** 浏览态：幻灯片正下方展示演讲备注（全屏演示时隐藏） */
const showSpeakerNotesBar = computed(
  () => Boolean(slideSpeakerNotesText.value) && !isPresentationFullscreen.value
);

/** 当前 section 页对应的章节编号（从 1 开始，按 section 出现顺序计数） */
const sectionChapterNum = computed(() => {
  const idx = currentSlide.value;
  let count = 0;
  for (let i = 0; i <= idx && i < pptSource.value.slides.length; i++) {
    if (pptSource.value.slides[i].layout === "section") count++;
  }
  return count;
});

/** section 页：章节配图或 AI 图作全屏背景 */
const sectionBackdropUrl = computed(() => {
  const s = slide.value;
  if (!s || s.layout !== "section") return "";
  return resolveChapterSlideBackdropUrl(s);
});

/** section 无背景图时：按章节号展示与封面同系列的意境 SVG */
const sectionDecorationSvg = computed(() => {
  const s = slide.value;
  if (!s || s.layout !== "section" || sectionBackdropUrl.value) return "";
  const key = s.chapter_number ?? sectionChapterNum.value;
  return getChapterDecorationByKey(key).svg;
});

/** 章节配图独立页背景 */
const chapterImagePageBackdropUrl = computed(() => {
  const s = slide.value;
  if (!s || !isChapterImagePage(s)) return "";
  return resolveChapterSlideBackdropUrl(s);
});

const chapterImagePageDecorationSvg = computed(() => {
  const s = slide.value;
  if (!s || !isChapterImagePage(s) || chapterImagePageBackdropUrl.value) return "";
  const chapter = findChapterForSlide(pptSource.value.slides, currentSlide.value);
  const key = chapter?.chapterNumber ?? s.chapter_number ?? currentSlide.value;
  return getChapterDecorationByKey(key).svg;
});

/** two_column：仅 chapter_images 线可用背景；document_figure 禁止 background-image */
const twoColumnBackdropUrl = computed(() => {
  const s = slide.value;
  if (!s || s.layout !== "two_column") return "";
  const visual = resolveSlideVisual(s);
  if (visual.kind === "chapter_images") {
    return resolveChapterSlideBackdropUrl(s);
  }
  return "";
});

const twoColumnSlideBackgroundStyle = computed(() => {
  const url = twoColumnBackdropUrl.value;
  return url ? { backgroundImage: `url(${url})` } : {};
});

/** 判断是否为分组柱状图（多系列 + categories，每系列一条 values[]） */
const isGroupedBar = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "bar") return false;
  const rows = chart.data ?? [];
  const seriesRows = rows.filter(
    (d) => Array.isArray(d.values) && d.values.length > 0
  );
  if (seriesRows.length <= 1) return false;
  const simpleRows = rows.filter(
    (d) =>
      d.label != null &&
      d.value != null &&
      Number.isFinite(Number(d.value)) &&
      !(Array.isArray(d.values) && d.values.length)
  );
  if (simpleRows.length === rows.length) return false;
  return !!(chart.categories?.length && seriesRows.length > 1);
});

const GROUPED_BAR_PLOT = {
  full: { left: 55, width: 400, labelRatio: 0.3 },
  compact: { left: 30, width: 340, labelRatio: 0.3 },
} as const;

const groupedBarCategories = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !isGroupedBar.value) return [] as string[];
  return (chart.categories ?? chart.labels ?? []).map((c) => String(c));
});

const groupedBarSeriesList = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !isGroupedBar.value) return [] as ChartDataItem[];
  return (chart.data ?? []).filter(
    (d) => Array.isArray(d.values) && d.values.length > 0
  );
});

function groupedBarSeriesLabel(s: ChartDataItem): string {
  return String(s.name ?? s.label ?? "").trim();
}

function groupedBarRectX(
  catIndex: number,
  seriesIndex: number,
  layout: keyof typeof GROUPED_BAR_PLOT = "full"
): number {
  const { left, width } = GROUPED_BAR_PLOT[layout];
  const catCount = groupedBarCategories.value.length || 1;
  const seriesCount = groupedBarSeriesList.value.length || 1;
  const groupW = width / catCount;
  const barAreaW = groupW * 0.65;
  const slotW = barAreaW / seriesCount;
  return left + catIndex * groupW + seriesIndex * slotW;
}

function groupedBarRectWidth(layout: keyof typeof GROUPED_BAR_PLOT = "full"): number {
  const { width } = GROUPED_BAR_PLOT[layout];
  const catCount = groupedBarCategories.value.length || 1;
  const seriesCount = groupedBarSeriesList.value.length || 1;
  const groupW = width / catCount;
  return (groupW * 0.65) / seriesCount - 2;
}

function groupedBarCategoryLabelX(
  catIndex: number,
  layout: keyof typeof GROUPED_BAR_PLOT = "full"
): number {
  const { left, width, labelRatio } = GROUPED_BAR_PLOT[layout];
  const catCount = groupedBarCategories.value.length || 1;
  const groupW = width / catCount;
  return left + catIndex * groupW + groupW * labelRatio;
}

function groupedBarValue(catIndex: number, seriesIndex: number): number {
  const series = groupedBarSeriesList.value[seriesIndex];
  const raw = series?.values?.[catIndex];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** 分组柱 SVG 用 inline style，避免 .ppt-bar-rect { fill } 覆盖系列色 */
function groupedBarRectStyle(seriesIndex: number, value: number): Record<string, string> {
  return {
    fill: value < 0 ? "#e74c3c" : getSeriesColor(seriesIndex),
    opacity: "0.88",
  };
}

function getLineChartSeriesRows(chart: PptChart | undefined): ChartDataItem[] {
  if (!chart || (chart.type !== "line" && chart.type !== "area")) return [];
  return (chart.data ?? []).filter((d) => Array.isArray(d.values) && d.values.length > 0);
}

function isMultiSeriesLineChart(chart: PptChart | undefined): boolean {
  if (!chart || (chart.type !== "line" && chart.type !== "area")) return false;
  const rows = chart.data ?? [];
  const seriesRows = getLineChartSeriesRows(chart);
  if (seriesRows.length <= 1) return false;
  const simpleRows = rows.filter(
    (d) =>
      d.label != null &&
      d.value != null &&
      Number.isFinite(Number(d.value)) &&
      !(Array.isArray(d.values) && d.values.length)
  );
  if (simpleRows.length === rows.length) return false;
  const cats = chart.categories ?? chart.labels ?? [];
  return cats.length > 0 && seriesRows.length > 1;
}

const isMultiSeriesLine = computed(() => isMultiSeriesLineChart(slide.value?.chart));

const lineChartCategories = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !isMultiSeriesLine.value) return [] as string[];
  return (chart.categories ?? chart.labels ?? []).map((c) => String(c));
});

const lineChartSeriesList = computed(() => {
  if (!isMultiSeriesLine.value) return [] as ChartDataItem[];
  return getLineChartSeriesRows(slide.value?.chart);
});

const lineChartLegendItems = computed(() => {
  const chart = slide.value?.chart;
  if (!chart) return [] as string[];
  if (isMultiSeriesLine.value) {
    return lineChartSeriesList.value.map(groupedBarSeriesLabel).filter(Boolean);
  }
  if (chart.series_names?.length) return chart.series_names;
  return [chart.primary_data_label, chart.secondary_data_label, chart.tertiary_data_label]
    .filter((l): l is string => !!String(l || "").trim())
    .map((l) => String(l).trim());
});

function lineSeriesValue(catIndex: number, seriesIndex: number): number {
  const series = lineChartSeriesList.value[seriesIndex];
  const raw = series?.values?.[catIndex];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function lineCategoryLabelX(
  catIndex: number,
  layout: keyof typeof GROUPED_BAR_PLOT = "full"
): number {
  const n = lineChartCategories.value.length || 1;
  const left = layout === "compact" ? 35 : 55;
  const width = layout === "compact" ? 340 : 400;
  return left + catIndex * (width / Math.max(n - 1, 1));
}

function lineSeriesPoints(
  seriesIndex: number,
  layout: keyof typeof GROUPED_BAR_PLOT = "full"
): string {
  const cats = lineChartCategories.value;
  if (!cats.length) return "";
  const n = cats.length;
  if (layout === "compact") {
    const { min: yMin, range: yRange } = lineChartYRange.value;
    return cats
      .map((_, ci) => {
        const x = lineCategoryLabelX(ci, layout);
        const y =
          165 - ((lineSeriesValue(ci, seriesIndex) - yMin) / yRange) * 140;
        return `${x},${y}`;
      })
      .join(" ");
  }
  return cats
    .map((_, ci) => {
      const x = lineCategoryLabelX(ci, layout);
      const y = mapLineY(lineSeriesValue(ci, seriesIndex));
      return `${x},${y}`;
    })
    .join(" ");
}

const maxChartValue = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !chart.data?.length) return 1;
  // For grouped bar / multi-series line, find max across all values arrays
  if (isGroupedBar.value || isMultiSeriesLine.value) {
    let mx = 0;
    chart.data.forEach((d) => {
      if (d.values?.length)
        d.values.forEach((v) => {
          mx = Math.max(mx, Math.abs(v));
        });
    });
    return mx || 1;
  }
  let allValues = chart.data.map((d) => Math.abs(d.value));
  if (chart.type === "line" || chart.type === "area") {
    if (chart.secondary_data?.length) {
      allValues = allValues.concat(
        chartSecondarySeries(chart).map((d) => Math.abs(d.value))
      );
    }
    chart.data.forEach((d) => {
      if (d.secondary_value !== undefined) allValues.push(Math.abs(d.secondary_value));
      if (d.tertiary_value !== undefined) allValues.push(Math.abs(d.tertiary_value));
    });
  } else if (chart.type === "combo") {
    chart.data.forEach((d) => {
      if (d.secondary_value !== undefined) allValues.push(Math.abs(d.secondary_value));
    });
  }
  // For stacked_bar, use the sum of values per item
  if (chart.type === "stacked_bar") {
    chart.data.forEach((d) => {
      const row = getStackedBarRowValues(d);
      if (row.length) allValues.push(row.reduce((a, b) => a + b, 0));
    });
  }
  // For horizontal_bar, use absolute values
  if (chart.type === "horizontal_bar") {
    allValues = chart.data.map((d) => Math.abs(d.value));
  }
  return Math.max(...allValues) || 1;
});

/** 水平条形图布局（左对齐，尽量占满横向空间） */
const HBAR_LAYOUT = {
  viewW: 520,
  labelX: 108,
  barX: 113,
  barMaxW: 395,
  rowH: 28,
  valueGap: 6,
} as const;
const HBAR_LAYOUT_DATA = { ...HBAR_LAYOUT, rowH: 32 } as const;
const HBAR_LAYOUT_COMPACT = {
  viewW: 400,
  labelX: 90,
  barX: 95,
  barMaxW: 285,
  rowH: 26,
  valueGap: 5,
} as const;

function horizontalBarPositiveValues(chart?: PptChart): number[] {
  return (chart?.data ?? [])
    .map((d) => Math.abs(Number(d.value) || 0))
    .filter((v) => v > 0);
}

/** 极差过大时用平方根缩放条长，数值标签仍显示原值 */
function horizontalBarNeedsSqrtScale(chart?: PptChart): boolean {
  const vals = horizontalBarPositiveValues(chart);
  if (vals.length < 2) return false;
  return Math.max(...vals) / Math.min(...vals) > 8;
}

function horizontalBarWidthPx(
  value: number,
  max: number,
  barMaxW: number,
  chart?: PptChart
): number {
  const v = Math.abs(value);
  if (v <= 0) return 0;
  const m = Math.max(Math.abs(max), 1);
  const ratio = horizontalBarNeedsSqrtScale(chart)
    ? Math.sqrt(v) / Math.sqrt(m)
    : v / m;
  return Math.max(6, Math.min(barMaxW, ratio * barMaxW));
}

function horizontalBarValueTextX(barX: number, barWidth: number, gap = 6): number {
  return barX + barWidth + gap;
}

function horizontalBarViewBoxHeight(count: number, rowH: number, pad = 40): number {
  return Math.max(120, count * rowH + pad);
}

function formatChartDataValue(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(v);
}

function funnelItemLabel(item: ChartDataItem): string {
  return String(item.label ?? item.stage ?? item.name ?? "").trim();
}

function funnelBarWidthPercent(value: number, max: number, chart?: PptChart): string {
  const pct = horizontalBarWidthPx(value, max, 100, chart);
  return `${pct}%`;
}

// Helper: compute max for secondary axis (combo chart where secondary has different scale)
const maxSecondaryValue = computed(() => {
  const chart = slide.value?.chart;
  if (!chart) return 1;
  const secondaryValues: number[] = [];
  if (chart.secondary_data?.length) {
    chartSecondarySeries(chart).forEach((d) => secondaryValues.push(d.value));
  }
  chart.data.forEach((d) => {
    if (d.secondary_value !== undefined) secondaryValues.push(d.secondary_value);
  });
  return secondaryValues.length ? Math.max(...secondaryValues) || 1 : maxChartValue.value;
});

/**
 * 生成 Y 轴刻度值数组（约 4~5 个刻度，包括 0 和接近最大值的刻度）
 */
function getYAxisTicks(maxVal: number): number[] {
  if (maxVal <= 0) return [0];
  // 计算合适的步长
  const rawStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = 1 * magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal * 1.05; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  if (ticks.length < 2) ticks.push(Math.round(maxVal * 1000) / 1000);
  return ticks;
}

/**
 * 柱状图/组合图 Y 轴范围（支持负值），返回 { min, max, range }
 * 映射区域: y:[20, 180], 160px 高度
 *   当 value = yMin  → y = 180（底部）
 *   当 value = yMax  → y = 20 （顶部）
 */
const barChartYRange = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !["bar", "combo"].includes(chart.type) || !chart.data?.length)
    return { min: 0, max: 1, range: 1 };
  let allVals: number[] = [];
  if (isGroupedBar.value) {
    chart.data.forEach((d) => {
      d.values?.forEach((v) => {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) allVals.push(n);
      });
    });
  } else {
    allVals = chart.data
      .map((d) => (typeof d.value === "number" ? d.value : Number(d.value)))
      .filter((n) => Number.isFinite(n));
  }
  // combo 次轴独立比例，勿将 secondary 并入主轴
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  // 确保 0 始终在范围内，柱状图从零线开始画
  if (yMin > 0) yMin = 0;
  if (yMax < 0) yMax = 0;
  // 加一点余量
  const padding = (yMax - yMin) * 0.08 || 1;
  yMax += padding;
  if (yMin < 0) yMin -= padding;
  yMax = ceilToNiceAxisMax(yMax);
  const range = yMax - yMin || 1;
  return { min: yMin, max: yMax, range };
});

/**
 * 根据柱状图 Y 轴范围生成刻度值数组（支持负值）
 */
function getBarYTicks(): number[] {
  const { min: yMin, max: yMax, range: yRange } = barChartYRange.value;
  if (yRange <= 0) return [0];
  const rawStep = yRange / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = 1 * magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks: number[] = [];
  const startTick = Math.floor(yMin / step) * step;
  for (let v = startTick; v <= yMax + step * 0.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

/**
 * 将数据值映射到 SVG Y 坐标（柱状图区域: y:[20, 180]）
 */
function mapBarY(value: number): number {
  const { min: yMin, range: yRange } = barChartYRange.value;
  const plotHeight = BAR_CHART_PLOT_BOTTOM - BAR_CHART_PLOT_TOP;
  return BAR_CHART_PLOT_BOTTOM - ((value - yMin) / yRange) * plotHeight;
}

/**
 * 将数据值映射到 SVG Y 坐标（小尺寸柱状图区域: viewBox 400x200, y:[20, 160]）
 */
function mapBarYSmall(value: number): number {
  const { min: yMin, range: yRange } = barChartYRange.value;
  return 160 - ((value - yMin) / yRange) * 140;
}

/**
 * 柱状图零线 Y 坐标
 */
const barZeroY = computed(() => mapBarY(0));

/**
 * 格式化刻度值，去掉多余的小数位
 */
function formatTickValue(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  // 保留最多2位小数
  return parseFloat(v.toFixed(2)).toString();
}

// Combo 次轴需要支持负值（例如净利润），因此使用 [min, max] 全范围映射
const secondaryAxisStats = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "combo") {
    return { min: 0, max: 1, range: 1 };
  }
  const values: number[] = [];
  if (chart.secondary_data?.length) {
    chartSecondarySeries(chart).forEach((d) => values.push(d.value));
  } else {
    chart.data.forEach((d) => values.push(Number(d.secondary_value ?? 0)));
  }
  if (!values.length) return { min: 0, max: 1, range: 1 };
  let min = Math.min(...values, 0);
  let max = Math.max(...values, 0);
  const padding = (max - min) * 0.08 || 1;
  max += padding;
  if (min < 0) min -= padding;
  const range = max - min || 1;
  return { min, max, range };
});

const mapComboSecondaryY = (value: number) => {
  const { min, range } = secondaryAxisStats.value;
  // chart plotting area is y:[20, 180], 160px height
  return 180 - ((value - min) / range) * 160;
};

const comboSecondaryZeroY = computed(() => mapComboSecondaryY(0));

/**
 * 折线图 Y 轴范围（支持负值），返回 { min, max, range }
 * Y 坐标映射公式: y = 195 - ((value - yMin) / yRange) * 170
 *   当 value = yMin  → y = 195（底部）
 *   当 value = yMax  → y = 25 （顶部）
 */
const lineChartYRange = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !["line", "area"].includes(chart.type) || !chart.data?.length)
    return { min: 0, max: 1, range: 1 };
  let allVals: number[] = [];
  if (isMultiSeriesLine.value) {
    lineChartSeriesList.value.forEach((s) => {
      (s.values ?? []).forEach((v) => {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) allVals.push(n);
      });
    });
  } else {
    allVals = chart.data.map((d) => d.value);
    // 也考虑 secondary_value / tertiary_value
    chart.data.forEach((d) => {
      if (d.secondary_value !== undefined) allVals.push(d.secondary_value);
      if (d.tertiary_value !== undefined) allVals.push(d.tertiary_value);
    });
    if (chart.secondary_data?.length) {
      allVals = allVals.concat(chartSecondarySeries(chart).map((d) => d.value));
    }
  }
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  // 如果全为正值，让 yMin 从 0 开始
  if (yMin >= 0) yMin = 0;
  // 如果全为负值，让 yMax 为 0
  if (yMax <= 0) yMax = 0;
  // 加一点余量
  const padding = (yMax - yMin) * 0.08 || 1;
  yMax += padding;
  if (yMin < 0) yMin -= padding;
  yMax = ceilToNiceAxisMax(yMax);
  const range = yMax - yMin || 1;
  return { min: yMin, max: yMax, range };
});

/**
 * 根据折线图 Y 轴范围生成刻度值数组（支持负值）
 */
function getLineYTicks(): number[] {
  const { min: yMin, max: yMax, range: yRange } = lineChartYRange.value;
  if (yRange <= 0) return [0];
  const rawStep = yRange / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = 1 * magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks: number[] = [];
  // 从 0 或最近的刻度开始向下/向上
  const startTick = Math.floor(yMin / step) * step;
  for (let v = startTick; v <= yMax + step * 0.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

/**
 * 将数据值映射到 SVG Y 坐标（折线图绘图区）
 */
function mapLineY(value: number): number {
  const { min: yMin, range: yRange } = lineChartYRange.value;
  const plotHeight = LINE_CHART_PLOT_BOTTOM - LINE_CHART_PLOT_TOP;
  return LINE_CHART_PLOT_BOTTOM - ((value - yMin) / yRange) * plotHeight;
}

// 判断 X 轴分类标签是否需要旋转（数据点多或标签过长时斜排）
const shouldRotateLabels = computed(() => shouldRotateChartXLabels(slide.value?.chart));

const linePoints = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !["line", "area"].includes(chart.type) || !chart.data?.length) return "";
  const n = chart.data.length;
  return chart.data
    .map((d, di) => {
      const x = 55 + di * (400 / (n - 1));
      const y = mapLineY(d.value);
      return `${x},${y}`;
    })
    .join(" ");
});

// 小尺寸折线图 (viewBox 400x200, x: 35~375, y: 165~25)
const linePointsSmall = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || !["line", "area"].includes(chart.type) || !chart.data?.length) return "";
  const n = chart.data.length;
  const { min: yMin, range: yRange } = lineChartYRange.value;
  return chart.data
    .map((d, di) => {
      const x = 35 + di * (340 / (n - 1));
      const y = 165 - ((d.value - yMin) / yRange) * 140;
      return `${x},${y}`;
    })
    .join(" ");
});

const multiLinePointsSmall = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "line" || !chart.data?.length)
    return { secondary: "" };
  const n = chart.data.length;
  const { min: yMin, range: yRange } = lineChartYRange.value;
  const secondary = chart.data
    .filter((d) => d.secondary_value !== undefined)
    .map((d, di) => {
      const x = 35 + di * (340 / (n - 1));
      const y = 165 - (((d.secondary_value ?? 0) - yMin) / yRange) * 140;
      return `${x},${y}`;
    })
    .join(" ");
  return { secondary };
});

// Area fill polygon points (line points + bottom corners)
const areaFillPoints = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "area" || !chart.data?.length) return "";
  const n = chart.data.length;
  const pts = chart.data.map((d, di) => {
    const x = 55 + di * (400 / (n - 1));
    const y = 200 - (d.value / maxChartValue.value) * 160 - 20;
    return `${x},${y}`;
  });
  // Close the polygon at the bottom
  const xEnd = 55 + (n - 1) * (400 / (n - 1));
  pts.push(`${xEnd},180`);
  pts.push(`55,180`);
  return pts.join(" ");
});

// Combo chart: primary bar data points
const comboPrimaryPoints = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "combo" || !chart.data?.length) return [];
  const zeroY = barZeroY.value;
  return chart.data.map((d, di) => {
    const valY = mapBarY(d.value);
    const barTop = Math.min(valY, zeroY);
    const barHeight = Math.abs(valY - zeroY);
    return {
      x: 55 + di * (400 / chart.data.length),
      y: barTop,
      h: Math.max(1, barHeight),
      w: (400 / chart.data.length) * 0.55,
      label: d.label,
      value: d.value,
      isNegative: d.value < 0,
    };
  });
});

// Combo chart: secondary line points
const comboSecondaryLinePoints = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "combo") return "";
  const n = chart.data.length;
  // Use secondary_data array if available, otherwise use secondary_value from data items
  const values: number[] = [];
  if (chart.secondary_data?.length) {
    chartSecondarySeries(chart).forEach((d) => values.push(d.value));
  } else {
    chart.data.forEach((d) => {
      values.push(d.secondary_value ?? 0);
    });
  }
  if (!values.length) return "";
  return values
    .map((v, di) => {
      const x = 55 + di * (400 / n) + (400 / n) * 0.275;
      const y = mapComboSecondaryY(v);
      return `${x},${y}`;
    })
    .join(" ");
});

// Combo chart: secondary dot positions
const comboSecondaryDots = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "combo") return [];
  const n = chart.data.length;
  const values: { value: number; label: string }[] = [];
  if (chart.secondary_data?.length) {
    chartSecondarySeries(chart).forEach((d) =>
      values.push({ value: d.value, label: d.label })
    );
  } else {
    chart.data.forEach((d) =>
      values.push({ value: d.secondary_value ?? 0, label: d.label })
    );
  }
  return values.map((v, di) => ({
    cx: 55 + di * (400 / n) + (400 / n) * 0.275,
    cy: mapComboSecondaryY(v.value),
    value: v.value,
  }));
});

// Multi-line chart points (for line charts with secondary/tertiary data)
const multiLinePoints = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "line" || !chart.data?.length)
    return { secondary: "", tertiary: "" };
  const n = chart.data.length;
  const secondary = chart.data
    .filter((d) => d.secondary_value !== undefined)
    .map((d, di) => {
      const x = 55 + di * (400 / (n - 1));
      const y = mapLineY(d.secondary_value ?? 0);
      return `${x},${y}`;
    })
    .join(" ");
  const tertiary = chart.data
    .filter((d) => d.tertiary_value !== undefined)
    .map((d, di) => {
      const x = 55 + di * (400 / (n - 1));
      const y = mapLineY(d.tertiary_value ?? 0);
      return `${x},${y}`;
    })
    .join(" ");
  return { secondary, tertiary };
});

// ── 饼图布局（左饼右图例，避免 220 宽 viewBox 内重叠）────────────────────────
const PIE_CHART_LAYOUT = {
  viewW: 260,
  viewH: 200,
  cx: 82,
  cy: 96,
  r: 64,
  legendX: 182,
  legendTextX: 196,
} as const;
const PIE_CHART_LAYOUT_WIDE = {
  ...PIE_CHART_LAYOUT,
  viewW: 300,
  legendX: 212,
  legendTextX: 228,
} as const;

// ── 饼图扇形路径计算 ────────────────────────────────────────────────────────
interface PieSlice {
  path: string;
  color: string;
  label: string;
  value: number;
  percent: number;
  lx: number;
  ly: number;
  tx: number;
  ty: number;
  anchor: string;
  leaderX1: number;
  leaderY1: number;
}

function buildPieSlices(
  data: { label: string; value: number }[],
  cx = 90,
  cy = 90,
  r = 72,
  colors?: string[]
): PieSlice[] {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return [];
  let startAngle = -Math.PI / 2; // start from top
  return data.map((d, i) => {
    const pct = d.value / total;
    const sweep = pct * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    // label line: midpoint of arc
    const midAngle = startAngle + sweep / 2;
    const lx = cx + (r + 10) * Math.cos(midAngle);
    const ly = cy + (r + 10) * Math.sin(midAngle);
    const tx = cx + (r + 18) * Math.cos(midAngle);
    const ty = cy + (r + 18) * Math.sin(midAngle);
    const anchor = tx > cx ? "start" : "end";
    const edgeAngle = Math.atan2(ly - cy, lx - cx);
    const leaderX1 = cx + r * Math.cos(edgeAngle);
    const leaderY1 = cy + r * Math.sin(edgeAngle);
    const palette = colors?.length ? colors : PIE_COLORS;
    const slice: PieSlice = {
      path,
      color: palette[i % palette.length],
      label: d.label,
      value: d.value,
      percent: Math.round(pct * 100),
      lx,
      ly,
      tx,
      ty,
      anchor,
      leaderX1,
      leaderY1,
    };
    startAngle = endAngle;
    return slice;
  });
}

const pieSlices = computed<PieSlice[]>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "pie" || !chart.data?.length) return [];
  const { cx, cy, r } = PIE_CHART_LAYOUT;
  return buildPieSlices(
    chart.data,
    cx,
    cy,
    r,
    resolveChartColorList(chart, pptSource.value.palette, chart.data.length)
  );
});

// Stacked bar max (sum of values per item)
const stackedBarMax = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "stacked_bar" || !chart.data?.length) return 100;
  return (
    Math.max(
      ...chart.data.map((d) => getStackedBarRowValues(d).reduce((a, b) => a + b, 0))
    ) || 100
  );
});

/** 堆叠图系列名（年份等）：categories 缺失时用 labels 或占位「系列 N」 */
function getStackedBarCategoryLabels(chart: PptChart | undefined): string[] {
  if (!chart?.data?.length) return [];
  const n = Math.max(0, ...chart.data.map((d) => getStackedBarRowValues(d).length));
  if (!n) return [];
  const cats = chart.categories;
  if (Array.isArray(cats) && cats.length >= n) {
    return cats.slice(0, n).map((c) => String(c ?? ""));
  }
  const lbls = chart.labels;
  if (Array.isArray(lbls) && lbls.length >= n) {
    return lbls.slice(0, n).map((c) => String(c ?? ""));
  }
  return Array.from({ length: n }, (_, i) =>
    t("agent.pptSeriesLabel", { index: i + 1 })
  );
}

function stackedBarSegmentUsesPercent(chart: PptChart | undefined): boolean {
  if (!chart) return false;
  if (chart.stacked_segment_as_percent === true) return true;
  if (chart.stacked_segment_as_percent === false) return false;
  const unit = String(chart.unit ?? "").trim();
  if (unit === "%") return true;
  const yl = String(chart.y_label ?? chart.yLabel ?? "");
  return /%|百分比|\bpercent\b/i.test(yl);
}

function formatStackedBarSegmentLabel(chart: PptChart | undefined, v: number): string {
  if (!chart || !Number.isFinite(v)) return "";
  const numStr =
    Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : String(v);
  return stackedBarSegmentUsesPercent(chart) ? `${numStr}%` : numStr;
}

function stackedBarSegmentTitle(chart: PptChart | undefined, vi: number, v: number): string {
  const labs = getStackedBarCategoryLabels(chart);
  const lab = labs[vi] ?? "";
  return lab ? `${lab}: ${v}` : String(v);
}

// ── Waterfall 瀑布图辅助 ──────────────────────────────────────────────────
interface WaterfallBar {
  label: string;
  value: number;
  y: number;      // SVG y (top of bar)
  h: number;      // bar height
  isTotal: boolean;
  isNegative: boolean;
  runningTotal: number;
}

const waterfallBars = computed<WaterfallBar[]>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "waterfall" || !chart.data?.length) return [];
  // 计算累计值
  let running = 0;
  const items: WaterfallBar[] = [];
  chart.data.forEach((d: any) => {
    if (d.is_total) {
      items.push({
        label: d.label,
        value: running,
        y: 0, // will be computed below
        h: 0,
        isTotal: true,
        isNegative: running < 0,
        runningTotal: running,
      });
    } else {
      const prevRunning = running;
      running += d.value;
      items.push({
        label: d.label,
        value: d.value,
        y: 0,
        h: 0,
        isTotal: false,
        isNegative: d.value < 0,
        runningTotal: running,
      });
    }
  });
  // 计算 Y 范围
  let allVals = items.map((b) => b.runningTotal);
  allVals.push(0); // 基线
  // 对于非总和项, 也考虑其前一个累计值
  let r2 = 0;
  chart.data.forEach((d: any) => {
    if (!d.is_total) {
      allVals.push(r2);
      r2 += d.value;
      allVals.push(r2);
    } else {
      allVals.push(r2);
    }
  });
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const yRange = (yMax - yMin) || 1;
  const chartH = 160; // 图表绘图区高度
  const chartTop = 20;
  // 映射函数: value → SVG y
  const mapY = (v: number) => chartTop + chartH - ((v - yMin) / yRange) * chartH;
  // 填充 y, h
  let prevTotal = 0;
  items.forEach((b, i) => {
    if (b.isTotal) {
      const top = mapY(b.runningTotal);
      const bottom = mapY(0);
      b.y = Math.min(top, bottom);
      b.h = Math.abs(top - bottom);
    } else {
      const top = mapY(prevTotal + b.value);
      const bottom = mapY(prevTotal);
      b.y = Math.min(top, bottom);
      b.h = Math.abs(top - bottom);
      prevTotal += b.value;
    }
  });
  return items;
});

const waterfallMaxLabel = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "waterfall" || !chart.data?.length) return 1;
  const vals = waterfallBars.value.map((b) => Math.abs(b.runningTotal));
  return Math.max(...vals, 1);
});

// ── Waterfall Y轴刻度 ──────────────────────────────────────────────────────
const waterfallYRange = computed(() => {
  const bars = waterfallBars.value;
  if (!bars.length) return { min: 0, max: 1, range: 1 };
  let allVals = bars.map((b) => b.runningTotal);
  allVals.push(0);
  let r2 = 0;
  const chart = slide.value?.chart;
  if (chart?.data?.length) {
    chart.data.forEach((d: any) => {
      if (!d.is_total) {
        allVals.push(r2);
        r2 += d.value;
        allVals.push(r2);
      } else {
        allVals.push(r2);
      }
    });
  }
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const yRange = (yMax - yMin) || 1;
  return { min: yMin, max: yMax, range: yRange };
});

function getWaterfallYTicks(): number[] {
  const { min: yMin, max: yMax, range: yRange } = waterfallYRange.value;
  if (yRange <= 0) return [0];
  const rawStep = yRange / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = 1 * magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks: number[] = [];
  const startTick = Math.floor(yMin / step) * step;
  for (let v = startTick; v <= yMax + step * 0.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  if (ticks.length < 2) ticks.push(Math.round(yMax * 1000) / 1000);
  return ticks;
}

function mapWaterfallY(value: number): number {
  const { min: yMin, range: yRange } = waterfallYRange.value;
  const chartH = 160;
  const chartTop = 20;
  return chartTop + chartH - ((value - yMin) / yRange) * chartH;
}

// ── Radar 多系列辅助 ──────────────────────────────────────────────────────
// 格式A（旧）：data[i] = { label, value } 或 { label, seriesName: value, ... }
// 格式B（新）：labels[] + data[i] = { name, values: number[] }
// 格式C：labels[] 为轴，data 与 labels 等长且每项一个分值（常见于多工具对比）

interface RadarLayout {
  axisLabels: string[];
  series: RadarSeriesNorm[];
}

function readRadarPointValue(item: Record<string, unknown>): number {
  if (Array.isArray(item.values) && item.values.length) {
    const n = Number(item.values[0]);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(item.value);
  return Number.isFinite(n) ? n : 0;
}

/** 每项一个轴标签 + 数值（如多工具对比），排除 details 等非数值字段 */
function isRadarLabelValueRows(data: Record<string, unknown>[]): boolean {
  if (data.some((d) => Array.isArray(d.values) && (d.values as unknown[]).length > 1)) {
    return false;
  }
  return (
    data.length >= 2 &&
    data.every((d) => {
      const v = readRadarPointValue(d);
      return Number.isFinite(v) && String(d.label ?? d.name ?? "").length > 0;
    })
  );
}

/** 将 radar 图规范为可渲染的 labels + series 行（兼容 chart.data 仍为对象的情况） */
function resolveRadarChartForRender(chart: PptChart | undefined): PptChart | undefined {
  if (!chart || chart.type !== "radar") return undefined;
  const normalized = normalizeChart(chart);
  if (!normalized) return undefined;
  const data = normalized.data as unknown;
  if (Array.isArray(data) && data.length) return normalized;
  const dc = resolveChartSeriesContainer(normalized);
  if (!dc) return normalized;
  const multi = normalizeCategoriesSeriesChart(normalized, dc);
  return multi ?? normalized;
}

function radarNumericSeriesKeys(item: Record<string, unknown>): string[] {
  return Object.keys(item).filter(
    (k) =>
      k !== "label" &&
      k !== "name" &&
      k !== "values" &&
      k !== "value" &&
      k !== "details" &&
      typeof item[k] === "number" &&
      Number.isFinite(item[k] as number)
  );
}

const radarLayout = computed<RadarLayout>(() => {
  const chart = resolveRadarChartForRender(slide.value?.chart);
  if (!chart || chart.type !== "radar") {
    return { axisLabels: [], series: [] };
  }
  const data = chart.data as unknown as Record<string, unknown>[];
  if (!Array.isArray(data) || !data.length) {
    return { axisLabels: [], series: [] };
  }
  const axisFromChart = chart.labels ?? chart.categories ?? [];

  // 格式C：chart.labels 为雷达轴，data 每项对应一个轴上的单值
  if (axisFromChart.length >= 2 && data.length === axisFromChart.length) {
    const pointValues = data.map((d) => readRadarPointValue(d));
    if (pointValues.every((v) => Number.isFinite(v))) {
      return {
        axisLabels: axisFromChart,
        series: [
          {
            name:
              chart.y_label ||
              chart.primary_data_label ||
              t("agent.pptValueLabel"),
            color: getSeriesColor(0),
            values: pointValues,
          },
        ],
      };
    }
  }

  const first = data[0];
  const firstValues = Array.isArray(first?.values) ? first.values : [];
  const hasValuesArray = firstValues.length > 0;
  const hasSeriesName =
    typeof first?.name === "string" || typeof first?.label === "string";

  // 格式A-简：data[i] = { label, value, details? }，轴为各 label
  if (isRadarLabelValueRows(data)) {
    return {
      axisLabels: data.map((d) => String(d.label ?? d.name ?? "")),
      series: [
        {
          name:
            chart.y_label ||
            chart.primary_data_label ||
            chart.title ||
            t("agent.pptValueLabel"),
          color: getSeriesColor(0),
          values: data.map((d) => readRadarPointValue(d)),
        },
      ],
    };
  }

  if (hasValuesArray && hasSeriesName) {
    const axisLabels = axisFromChart.length
      ? axisFromChart
      : Array.from(
          { length: Math.max(...data.map((d) => (d.values as unknown[])?.length ?? 0), 0) },
          (_, i) => t("agent.pptDimensionLabel", { index: i + 1 })
        );

    if (data.length === 1 && firstValues.length === axisLabels.length) {
      return {
        axisLabels,
        series: [
          {
            name: String(first.name ?? first.label ?? t("agent.pptValueLabel")),
            color: getSeriesColor(0),
            values: firstValues.map((v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            }),
          },
        ],
      };
    }

    return {
      axisLabels,
      series: data.map((d, i) => ({
        name: String(d.name ?? d.label ?? t("agent.pptSeriesLabel", { index: i + 1 })),
        color: getSeriesColor(i),
        values: (Array.isArray(d.values) ? d.values : []).map((v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }),
      })),
    };
  }

  // 格式A：多系列为 data[i] 上除 label 外的数值字段（如 sales、profit）
  const firstItem = data[0] as Record<string, unknown>;
  const seriesNames = radarNumericSeriesKeys(firstItem);
  if (seriesNames.length === 0) {
    const axisLabels = axisFromChart.length
      ? axisFromChart
      : data.map((d) => String(d.label ?? ""));
    return {
      axisLabels,
      series: [
        {
          name: chart.y_label || t("agent.pptValueLabel"),
          color: getSeriesColor(0),
          values: axisFromChart.length
            ? axisFromChart.map((lbl, i) => {
                const row =
                  data.find((d) => String(d.label ?? "") === lbl) ?? data[i];
                return readRadarPointValue(row as unknown as Record<string, unknown>);
              })
            : data.map((d) => readRadarPointValue(d)),
        },
      ],
    };
  }
  return {
    axisLabels: data.map((d) => String(d.label ?? "")),
    series: seriesNames.map((name, i) => ({
      name,
      color: getSeriesColor(i),
      values: data.map((d) => Number(d[name]) || 0),
    })),
  };
});

// 判断是否为新格式（data 项有 name + 非空 values 字段）
const isRadarNewFormat = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "radar" || !chart.data?.length) return false;
  const first = chart.data[0] as Record<string, unknown>;
  return (
    Array.isArray(first?.values) &&
    (first.values as unknown[]).length > 0 &&
    (typeof first?.name === "string" || typeof first?.label === "string")
  );
});

// 规范化后的雷达图系列（{ name, color, values: number[] }）
interface RadarSeriesNorm {
  name: string;
  color: string;
  values: number[];
}

interface RadarAxisPoint {
  label: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  anchor: "start" | "middle" | "end";
}

interface RadarSeriesShape {
  name: string;
  color: string;
  points: string;
  dots: Array<{ x: number; y: number; value: number }>;
}

const RADAR_CX = 120;
const RADAR_CY = 90;
const RADAR_R = 64;

const radarAngle = (index: number, total: number) =>
  -Math.PI / 2 + (index * 2 * Math.PI) / total;

const radarSeriesNorm = computed<RadarSeriesNorm[]>(() => radarLayout.value.series);

// 规范化后的雷达轴标签
const radarLabelsNorm = computed<string[]>(() => radarLayout.value.axisLabels);

// radar 最大值
const radarMaxValue = computed(() => {
  const allVals = radarSeriesNorm.value.flatMap((s) => s.values);
  return Math.max(...allVals, 1) || 5;
});

const radarAxes = computed<RadarAxisPoint[]>(() => {
  const labels = radarLabelsNorm.value;
  if (!labels.length) return [];
  const n = labels.length;
  return labels.map((label, i) => {
    const a = radarAngle(i, n);
    const x = RADAR_CX + RADAR_R * Math.cos(a);
    const y = RADAR_CY + RADAR_R * Math.sin(a);
    const tx = RADAR_CX + (RADAR_R + 12) * Math.cos(a);
    const ty = RADAR_CY + (RADAR_R + 12) * Math.sin(a);
    const c = Math.cos(a);
    const anchor: "start" | "middle" | "end" =
      c > 0.2 ? "start" : c < -0.2 ? "end" : "middle";
    return { label, x, y, tx, ty, anchor };
  });
});

const radarGridPolygons = computed(() => {
  const labels = radarLabelsNorm.value;
  if (!labels.length) return [];
  const n = labels.length;
  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  return levels.map((lv) => {
    const points = labels
      .map((_, i) => {
        const a = radarAngle(i, n);
        const r = RADAR_R * lv;
        return `${RADAR_CX + r * Math.cos(a)},${RADAR_CY + r * Math.sin(a)}`;
      })
      .join(" ");
    return {
      points,
      value: Math.round(radarMaxValue.value * lv),
    };
  });
});

const radarSeriesShapes = computed<RadarSeriesShape[]>(() => {
  const labels = radarLabelsNorm.value;
  if (!labels.length || !radarSeriesNorm.value.length) return [];
  const n = labels.length;
  const max = radarMaxValue.value || 1;
  return radarSeriesNorm.value.map((series) => {
    const dots = labels.map((_, i) => {
      const value = Number(series.values[i] ?? 0);
      const ratio = Math.max(0, value) / max;
      const a = radarAngle(i, n);
      const r = RADAR_R * ratio;
      return {
        x: RADAR_CX + r * Math.cos(a),
        y: RADAR_CY + r * Math.sin(a),
        value,
      };
    });
    return {
      name: series.name,
      color: series.color,
      points: dots.map((d) => `${d.x},${d.y}`).join(" "),
      dots,
    };
  });
});

// ── 以下保留旧的 radarSeries / getRadarValue 以兼容模板中其他引用 ──────────
const radarSeries = computed<{ name: string; color: string }[]>(() => {
  return radarSeriesNorm.value.map((s) => ({ name: s.name, color: s.color }));
});

const getRadarValue = (d: ChartDataItem, seriesName?: string): number => {
  if (seriesName) {
    return ((d as any)[seriesName] as number) ?? 0;
  }
  return d.value ?? 0;
};

// ── Scatter 散点图辅助 ──────────────────────────────────────────────────────
interface ScatterPoint {
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  label: string;
  color: string;
}

const scatterStats = computed(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "scatter" || !chart.data?.length) {
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }
  const xs = chart.data.map((d) => d.x ?? d.value ?? 0);
  const ys = chart.data.map((d) => d.y ?? d.secondary_value ?? d.value ?? 0);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (xMin >= 0) xMin = 0;
  if (yMin >= 0) yMin = 0;
  const xPad = (xMax - xMin) * 0.08 || 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  xMax += xPad;
  yMax += yPad;
  if (xMin < 0) xMin -= xPad;
  if (yMin < 0) yMin -= yPad;
  return { xMin, xMax, yMin, yMax };
});

const scatterPoints = computed<ScatterPoint[]>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "scatter" || !chart.data?.length) return [];
  const { xMin, xMax, yMin, yMax } = scatterStats.value;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  // SVG plotting area: x:[55, 455], y:[25, 195]
  return chart.data.map((d, i) => {
    const rawX = d.x ?? d.value ?? 0;
    const rawY = d.y ?? d.secondary_value ?? d.value ?? 0;
    return {
      x: rawX,
      y: rawY,
      svgX: 55 + ((rawX - xMin) / xRange) * 400,
      svgY: 195 - ((rawY - yMin) / yRange) * 170,
      label: d.label || '',
      color: getSeriesColor(i),
    };
  });
});

function getScatterXTicks(): number[] {
  const { xMin, xMax } = scatterStats.value;
  return getAxisTicks(xMin, xMax);
}

function getScatterYTicks(): number[] {
  const { yMin, yMax } = scatterStats.value;
  return getAxisTicks(yMin, yMax);
}

/** 通用轴刻度生成（支持负值） */
function getAxisTicks(min: number, max: number): number[] {
  const range = max - min;
  if (range <= 0) return [0];
  const rawStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = 1 * magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks: number[] = [];
  const startTick = Math.floor(min / step) * step;
  for (let v = startTick; v <= max + step * 0.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

function mapScatterX(val: number): number {
  const { xMin, xMax } = scatterStats.value;
  const xRange = xMax - xMin || 1;
  return 55 + ((val - xMin) / xRange) * 400;
}

function mapScatterY(val: number): number {
  const { yMin, yMax } = scatterStats.value;
  const yRange = yMax - yMin || 1;
  const plotHeight = LINE_CHART_PLOT_BOTTOM - LINE_CHART_PLOT_TOP;
  return LINE_CHART_PLOT_BOTTOM - ((val - yMin) / yRange) * plotHeight;
}

// ── Heatmap 热力图辅助 ──────────────────────────────────────────────────────
interface HeatmapCell {
  row: number;
  col: number;
  rowLabel: string;
  colLabel: string;
  value: number;
  color: string;
  svgX: number;
  svgY: number;
  width: number;
  height: number;
}

const heatmapParsed = computed<HeatmapData | null>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "heatmap") return null;

  // 优先使用 matrix_data
  if (chart.matrix_data?.length) {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    chart.matrix_data.forEach((m) => { rowSet.add(m.row); colSet.add(m.col); });
    const rows = chart.rows?.length ? chart.rows : Array.from(rowSet);
    const cols = chart.cols?.length ? chart.cols : Array.from(colSet);
    const values: number[][] = rows.map(() => cols.map(() => 0));
    chart.matrix_data.forEach((m) => {
      const ri = rows.indexOf(m.row);
      const ci = cols.indexOf(m.col);
      if (ri >= 0 && ci >= 0) values[ri][ci] = m.value;
    });
    return { rows, cols, values };
  }

  // 降级：用 data 数组，label 作 row，categories 作 col，values 作矩阵行
  if (chart.data?.length && chart.data[0]?.values?.length) {
    const rows = chart.data.map((d) => d.label);
    const cols = chart.categories || chart.data[0].values!.map((_: number, i: number) => `C${i + 1}`);
    const values = chart.data.map((d) => d.values || []);
    return { rows, cols, values };
  }

  return null;
});

const heatmapCells = computed<HeatmapCell[]>(() => {
  const hm = heatmapParsed.value;
  if (!hm) return [];
  const { rows, cols, values } = hm;
  // 求全局最大最小值
  let allVals: number[] = [];
  values.forEach((row) => row.forEach((v) => allVals.push(v)));
  const vMin = Math.min(...allVals, 0);
  const vMax = Math.max(...allVals, 1);
  const vRange = vMax - vMin || 1;

  // SVG plotting area: x:[60, 460], y:[25, 200]
  const plotX = 60;
  const plotY = 25;
  const plotW = 400;
  const plotH = 175;
  const cellW = plotW / cols.length;
  const cellH = plotH / rows.length;

  const cells: HeatmapCell[] = [];
  rows.forEach((rowLabel, ri) => {
    cols.forEach((colLabel, ci) => {
      const val = values[ri]?.[ci] ?? 0;
      const ratio = (val - vMin) / vRange;
      // 颜色映射：蓝 → 青 → 绿 → 黄 → 红
      const hue = (1 - ratio) * 240; // 240(蓝) → 0(红)
      const color = `hsl(${hue}, 70%, ${45 + ratio * 15}%)`;
      cells.push({
        row: ri,
        col: ci,
        rowLabel,
        colLabel,
        value: val,
        color,
        svgX: plotX + ci * cellW,
        svgY: plotY + ri * cellH,
        width: cellW,
        height: cellH,
      });
    });
  });
  return cells;
});

const heatmapValueRange = computed(() => {
  const hm = heatmapParsed.value;
  if (!hm) return { min: 0, max: 1 };
  let allVals: number[] = [];
  hm.values.forEach((row) => row.forEach((v) => allVals.push(v)));
  return { min: Math.min(...allVals, 0), max: Math.max(...allVals, 1) };
});

// ── Treemap 树形图辅助 ──────────────────────────────────────────────────────
interface TreemapRect {
  label: string;
  value: number;
  percent: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const treemapRects = computed<TreemapRect[]>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "treemap" || !chart.data?.length) return [];
  const total = chart.data.reduce((s, d) => s + Math.abs(d.value || 0), 0) || 1;
  // 简单的行式布局（squarified 简化版）
  // SVG: viewBox 500x240, 绘图区: x:[10,490], y:[25,225]
  const plotX = 10;
  const plotY = 25;
  const plotW = 480;
  const plotH = 200;

  const sorted = [...chart.data].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const rects: TreemapRect[] = [];
  let remaining = total;
  let cx = plotX;
  let cy = plotY;
  let cw = plotW;
  let ch = plotH;

  sorted.forEach((d, i) => {
    const val = Math.abs(d.value || 0);
    const ratio = val / remaining;
    const pct = Math.round((val / total) * 100);

    let rw: number, rh: number, rx: number, ry: number;
    if (cw >= ch) {
      // 水平切分
      rw = cw * ratio;
      rh = ch;
      rx = cx;
      ry = cy;
      cx += rw;
      cw -= rw;
    } else {
      // 垂直切分
      rw = cw;
      rh = ch * ratio;
      rx = cx;
      ry = cy;
      cy += rh;
      ch -= rh;
    }
    remaining -= val;

    rects.push({
      label: d.label,
      value: d.value,
      percent: pct,
      x: rx,
      y: ry,
      width: Math.max(rw, 1),
      height: Math.max(rh, 1),
      color: accentColorAt(
        resolveChartColorList(chart, pptSource.value.palette),
        i
      ),
    });
  });
  return rects;
});

// ── Gauge 仪表盘图辅助 ──────────────────────────────────────────────────────
interface GaugeData {
  value: number;
  min: number;
  max: number;
  ratio: number; // 0~1
  label: string;
  color: string;
  target?: number;
  unit: string;
}

const gaugeData = computed<GaugeData | null>(() => {
  const chart = slide.value?.chart;
  if (!chart || chart.type !== "gauge") return null;
  const val = chart.data?.[0]?.value ?? 0;
  const min = chart.min_value ?? 0;
  const max = chart.max_value ?? 100;
  const range = max - min || 1;
  const ratio = Math.max(0, Math.min(1, (val - min) / range));
  // 颜色：绿(好) → 黄(中) → 红(差)
  let color: string;
  if (ratio >= 0.7) color = '#34c78a';
  else if (ratio >= 0.4) color = '#f5a623';
  else color = '#e25c5c';
  return {
    value: val,
    min,
    max,
    ratio,
    label: chart.data?.[0]?.label || chart.title || '',
    color,
    target: chart.target_value,
    unit: chart.unit || '',
  };
});

// Gauge 弧形路径 (semicircle arc, SVG viewBox 260x160)
function gaugeArcPath(ratio: number, cx = 130, cy = 130, r = 100): string {
  // Arc from 180° (left) to 0° (right), covering ratio portion
  const startAngle = Math.PI; // 180°
  const endAngle = Math.PI - ratio * Math.PI; // sweep from left to right
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = ratio > 0.5 ? 1 : 0;
  return `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2}`;
}

// Gauge 刻度
function gaugeTickMarks(min: number, max: number, cx = 130, cy = 130, r = 100): Array<{ x1: number; y1: number; x2: number; y2: number; label: string }> {
  const ticks = getAxisTicks(min, max);
  const range = max - min || 1;
  return ticks.map((v) => {
    const ratio = (v - min) / range;
    const angle = Math.PI - ratio * Math.PI;
    return {
      x1: cx + (r - 8) * Math.cos(angle),
      y1: cy + (r - 8) * Math.sin(angle),
      x2: cx + (r + 2) * Math.cos(angle),
      y2: cy + (r + 2) * Math.sin(angle),
      label: formatTickValue(v),
    };
  });
}

// ── 主题色映射 ──────────────────────────────────────────────────────────────
const themePresetsMap: Record<string, { accent: string; bg: string; text: string }> = {
  blue: { accent: "#4a90e2", bg: "#0d1b2e", text: "#e8f0fe" },
  dark: { accent: "#7c5cfc", bg: "#12111a", text: "#e0dff8" },
  green: { accent: "#34c78a", bg: "#0d1f18", text: "#d4f5e5" },
  red: { accent: "#e25c5c", bg: "#1f0d0d", text: "#fde8e8" },
  gold: { accent: "#e2b34a", bg: "#1f1a0d", text: "#fdf3d4" },
};

/** 解析最终使用的主题色：优先 palette.accent_colors[0]，其次 accent_color，再预设 */
function resolveThemeColors(): { accent: string; bg: string; text: string } {
  const preset = themePresetsMap[props.pptData.theme || "blue"] || themePresetsMap.blue;
  const p = pptSource.value.palette ?? props.pptData.palette;
  if (!p) return preset;
  const deck = resolveDeckAccentColors(p);
  return {
    accent:
      deck[0] ||
      normalizeAccentColor(p.accent_color) ||
      preset.accent,
    bg: p.bg_color || preset.bg,
    text: p.text_color || preset.text,
  };
}

function hexForPptx(color: string): string {
  return color.replace(/^#/, "").toUpperCase();
}

/** 页底品牌标识：单页 brand_footer → deck brand_footer → 旧版 subtitle/title */
function resolveBrandFooter(
  slide?: PptSlide | null,
  deck?: Pick<PptData, "brand_footer" | "subtitle" | "title"> | null
): string {
  const fromSlide = String(slide?.brand_footer ?? "").trim();
  if (fromSlide) return fromSlide;
  const fromDeck = String(deck?.brand_footer ?? "").trim();
  if (fromDeck) return fromDeck;
  return String(deck?.subtitle || deck?.title || "").trim();
}

function addBrandFooterToPptSlide(
  pptSlide: any,
  slide: PptSlide,
  deck: PptData,
  bodyFont: string,
  textColor: string
) {
  const footer = resolveBrandFooter(slide, deck);
  if (!footer) return;
  pptSlide.addText(footer, {
    x: 0.5,
    y: 6.82,
    w: 12.3,
    h: 0.32,
    fontSize: 9,
    fontFace: bodyFont,
    color: hexForPptx(textColor),
    transparency: 70,
    align: "center",
  });
}

/** PPTX 目录页兜底：与在线 getTocEntries 一致，避免重复编号与纯文本列表 */
function addTocLayoutToPptSlide(
  pptSlide: any,
  slide: PptSlide,
  pptx: { ShapeType: { rect: string; roundRect: string } },
  theme: { accent: string; bg: string; text: string },
  bodyFont: string,
  headingFont: string = bodyFont
) {
  const accentHex = hexForPptx(theme.accent);
  const textHex = hexForPptx(theme.text);
  const entries = getTocEntries(slide);
  if (!entries.length) return;

  pptSlide.addShape(pptx.ShapeType.rect, {
    x: 0.52,
    y: 0.4,
    w: 0.07,
    h: 0.52,
    fill: { color: accentHex },
    line: { type: "none" },
  });
  pptSlide.addText(slide.title || "", {
    x: 0.72,
    y: 0.36,
    w: 11.5,
    h: 0.58,
    fontSize: 28,
    fontFace: headingFont,
    color: accentHex,
    bold: true,
  });
  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.72,
      y: 0.94,
      w: 11.5,
      h: 0.32,
      fontSize: 13,
      fontFace: bodyFont,
      color: textHex,
      transparency: 45,
    });
  }

  const cols = 2;
  const cardW = 5.85;
  const cardGapX = 0.42;
  const cardGapY = 0.26;
  const gridTop = 1.32;
  const gridBottom = 6.72;
  const rowCount = Math.max(1, Math.ceil(entries.length / cols));
  const cardH = (gridBottom - gridTop - (rowCount - 1) * cardGapY) / rowCount;

  entries.forEach((entry, ti) => {
    const col = ti % cols;
    const row = Math.floor(ti / cols);
    const x = 0.52 + col * (cardW + cardGapX);
    const y = gridTop + row * (cardH + cardGapY);

    pptSlide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: hexForPptx(theme.bg), transparency: 8 },
      line: { color: "FFFFFF", width: 0.5, transparency: 88 },
      rectRadius: 0.06,
    });

    pptSlide.addText(`${entry.number}  ${entry.title}`, {
      x: x + 0.14,
      y: y + 0.1,
      w: cardW - 0.22,
      h: cardH * 0.42,
      fontSize: 15,
      fontFace: headingFont,
      color: accentHex,
      bold: true,
      valign: "top",
    });

    if (entry.description) {
      pptSlide.addText(entry.description, {
        x: x + 0.14,
        y: y + cardH * 0.46,
        w: cardW - 0.22,
        h: cardH * 0.48,
        fontSize: 11,
        fontFace: bodyFont,
        color: textHex,
        transparency: 38,
        valign: "top",
      });
    }
  });
}

/** LAYOUT_WIDE 16:9 幻灯片尺寸（英寸） */
const PPT_SLIDE_W_IN = 13.333;
const PPT_SLIDE_H_IN = 7.5;

/**
 * PPTX 混合导出：仅栅格化图表、表格、配图等视觉块（html2canvas），
 * 标题/要点/章节文字等走 pptxgenjs 原生 addText，导出后可在 PPT 中编辑。
 */
function resolvePptVisualRasterSelectors(slide: PptSlide): string[] {
  const selectors: string[] = [];
  if (slide.table?.columns?.length && slide.table?.rows?.length) {
    selectors.push(".ppt-table-wrap");
  }
  if (slide.chart?.data?.length) {
    selectors.push(".ppt-content-chart-wrap");
  }
  // 配图块（不含栏目标题等文字）
  selectors.push(
    ".ppt-chapter-side-image",
    ".ppt-chapter-image-strip",
    ".ppt-chapter-image-page-gallery"
  );
  return selectors;
}

function mapDomRectToPptInches(
  rect: DOMRect,
  slideRect: DOMRect
): { x: number; y: number; w: number; h: number } {
  const relX = (rect.left - slideRect.left) / slideRect.width;
  const relY = (rect.top - slideRect.top) / slideRect.height;
  const relW = rect.width / slideRect.width;
  const relH = rect.height / slideRect.height;
  return {
    x: relX * PPT_SLIDE_W_IN,
    y: relY * PPT_SLIDE_H_IN,
    w: relW * PPT_SLIDE_W_IN,
    h: relH * PPT_SLIDE_H_IN,
  };
}

/** 将 DOM 视觉块栅格化为 PPTX 图片层（叠在原生文本之上） */
async function addPptVisualRasterOverlays(
  pptSlide: any,
  slideWrapper: HTMLElement | undefined | null,
  slide: PptSlide
): Promise<boolean> {
  if (!slideWrapper) return false;
  const slideEl = slideWrapper.querySelector<HTMLElement>(".ppt-slide");
  if (!slideEl) return false;

  const slideRect = slideEl.getBoundingClientRect();
  if (slideRect.width <= 0 || slideRect.height <= 0) return false;

  const selectors = resolvePptVisualRasterSelectors(slide);
  if (!selectors.length) return false;

  let captured = 0;
  const seen = new Set<Element>();

  for (const selector of selectors) {
    const nodes = Array.from(slideEl.querySelectorAll<HTMLElement>(selector));
    for (const el of nodes) {
      if (seen.has(el)) continue;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      try {
        const canvas = await capturePptSlideToCanvas(el, null);
        const { x, y, w, h } = mapDomRectToPptInches(rect, slideRect);
        pptSlide.addImage({
          data: canvas.toDataURL("image/png"),
          x,
          y,
          w,
          h,
        });
        captured++;
      } catch (err) {
        console.warn(`PPTX visual raster failed (${selector}):`, err);
      }
    }
  }
  return captured > 0;
}

/** 导出用全屏背景图：cover/section 的 image_url，或 chapter_image_page 章节配图 */
function resolvePptSlideExportBackdropUrl(slide: PptSlide): string {
  const visual = resolveSlideVisual(slide);
  if (visual.kind === "document_figure") return "";
  if (visual.kind === "slide_background") return visual.url;
  if (visual.kind === "chapter_images" && slide.layout === "two_column") {
    return resolveChapterSlideBackdropUrl(slide);
  }
  if (slide.layout === "section") {
    return resolveChapterSlideBackdropUrl(slide);
  }
  return "";
}

/** 无 URL 背景时，需栅格化意境 SVG + 渐变（封面/章节页） */
function needsPptSlideDecorativeBackground(slide: PptSlide): boolean {
  if (resolvePptSlideExportBackdropUrl(slide)) return false;
  return (
    slide.layout === "cover" ||
    slide.layout === "section" ||
    (slide.layout === "two_column" && isChapterImagePage(slide))
  );
}

const PPT_EXPORT_HIDE_FOR_BG_CAPTURE = [
  ".ppt-cover-content",
  ".ppt-cover-info",
  ".ppt-cover-bottom-line",
  ".ppt-section-label",
  ".ppt-section-title",
  ".ppt-section-divider",
  ".ppt-section-sub",
  ".ppt-section-footer",
  ".ppt-brand-footer",
  ".ppt-slide-title",
  ".ppt-chart-subtitle",
  ".ppt-two-col-body",
  ".ppt-content-body",
  ".ppt-content-split",
  ".ppt-data-body",
  ".ppt-content-left",
  ".ppt-content-right",
  ".ppt-content-insight",
  ".ppt-ref-list",
].join(", ");

/** 捕获幻灯片装饰性背景（渐变 + 意境 SVG / 角标），隐藏正文层 */
async function capturePptSlideDecorativeBackground(
  slideWrapper: HTMLElement | null | undefined,
  themeBg: string
): Promise<string | null> {
  if (!slideWrapper) return null;
  const slideEl = slideWrapper.querySelector<HTMLElement>(".ppt-slide");
  if (!slideEl) return null;

  const bodyCss = pptBodyFontCss.value;
  const headingCss = pptHeadingFontCss.value;
  const html2canvas = (await import("html2canvas")).default;

  try {
    const canvas = await html2canvas(slideEl, {
      backgroundColor: themeBg,
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc, clonedEl) => {
        if (clonedEl instanceof HTMLElement) {
          prepareHtml2CanvasClone(doc, slideEl, clonedEl);
        }
        const root = doc.querySelector(".ppt-slide-wrapper") ?? clonedEl;
        if (root instanceof HTMLElement) {
          root.style.setProperty("font-family", bodyCss, "important");
          root.style.setProperty("--ppt-font-body", bodyCss);
          root.style.setProperty("--ppt-font-heading", headingCss);
        }
        doc.querySelectorAll(PPT_EXPORT_HIDE_FOR_BG_CAPTURE).forEach((node) => {
          if (node instanceof HTMLElement) node.style.visibility = "hidden";
        });
      },
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("PPTX decorative background capture failed:", err);
    return null;
  }
}

/** 有背景图时的暗色蒙层（与在线 .ppt-slide-bg-overlay 一致） */
async function addPptSlideBackdropOverlay(
  pptSlide: any,
  slideWrapper: HTMLElement | null | undefined
): Promise<void> {
  if (!slideWrapper) return;
  const slideEl = slideWrapper.querySelector<HTMLElement>(".ppt-slide");
  const overlay = slideEl?.querySelector<HTMLElement>(".ppt-slide-bg-overlay");
  if (!slideEl || !overlay) return;
  try {
    const canvas = await capturePptSlideToCanvas(overlay, null);
    pptSlide.addImage({
      data: canvas.toDataURL("image/png"),
      x: 0,
      y: 0,
      w: PPT_SLIDE_W_IN,
      h: PPT_SLIDE_H_IN,
    });
  } catch (err) {
    console.warn("PPTX backdrop overlay capture failed:", err);
  }
}

/** 章节页序号：与在线 sectionChapterNum 一致 */
function resolveSectionChapterLabel(
  slide: PptSlide,
  slideIndex: number,
  slides: PptSlide[]
): string {
  const explicit = slide.chapter_number?.trim();
  if (explicit) return explicit;
  let count = 0;
  for (let i = 0; i <= slideIndex && i < slides.length; i++) {
    if (slides[i].layout === "section") count++;
  }
  return String(count || slide.index || 1).padStart(2, "0");
}

/** PPTX 章节页兜底：居中 CHAPTER + 标题 + 页脚 */
function addSectionLayoutToPptSlide(
  pptSlide: any,
  slide: PptSlide,
  chapterLabel: string,
  pptx: { ShapeType: { rect: string } },
  theme: { accent: string; bg: string; text: string },
  bodyFont: string,
  headingFont: string = bodyFont
) {
  const accentHex = hexForPptx(theme.accent);
  const textHex = hexForPptx(theme.text);
  const corner = (x: number, y: number, w: number, h: number, sides: string) => {
    if (sides.includes("t")) {
      pptSlide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w,
        h: 0.03,
        fill: { color: accentHex },
        line: { type: "none" },
      });
    }
    if (sides.includes("b")) {
      pptSlide.addShape(pptx.ShapeType.rect, {
        x,
        y: y + h - 0.03,
        w,
        h: 0.03,
        fill: { color: accentHex },
        line: { type: "none" },
      });
    }
    if (sides.includes("l")) {
      pptSlide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 0.03,
        h,
        fill: { color: accentHex },
        line: { type: "none" },
      });
    }
    if (sides.includes("r")) {
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: x + w - 0.03,
        y,
        w: 0.03,
        h,
        fill: { color: accentHex },
        line: { type: "none" },
      });
    }
  };
  corner(0.45, 0.35, 0.35, 0.35, "tl");
  corner(12.55, 0.35, 0.35, 0.35, "tr");
  corner(0.45, 6.8, 0.35, 0.35, "bl");
  corner(12.55, 6.8, 0.35, 0.35, "br");

  pptSlide.addText(t("agent.pptChapterHeading", { number: chapterLabel }), {
    x: 0.5,
    y: 2.05,
    w: 12.33,
    h: 0.38,
    fontSize: 13,
    fontFace: headingFont,
    color: accentHex,
    bold: true,
    align: "center",
    charSpacing: 5,
  });
  pptSlide.addText(
    pptInlineMarkdownToPptxRuns(slide.title || "", {
      fontSize: 28,
      fontFace: headingFont,
      color: accentHex,
      bold: true,
    }) as any,
    {
      x: 0.9,
      y: 2.55,
      w: 11.5,
      h: 1.35,
      fontSize: 28,
      fontFace: headingFont,
      color: accentHex,
      bold: true,
      align: "center",
      valign: "middle",
    }
  );
  pptSlide.addShape(pptx.ShapeType.rect, {
    x: 6.35,
    y: 4.05,
    w: 0.65,
    h: 0.045,
    fill: { color: accentHex },
    line: { type: "none" },
  });
  const sectionSubtitle = resolveSectionSubtitle(slide);
  if (sectionSubtitle) {
    pptSlide.addText(sectionSubtitle, {
      x: 1.2,
      y: 4.25,
      w: 10.9,
      h: 0.75,
      fontSize: 14,
      fontFace: bodyFont,
      color: textHex,
      transparency: 40,
      align: "center",
      valign: "top",
    });
  }
}

/** PPTX chartColors：chart.colors → palette.accent_colors → 内置 */
function chartColorsForPptx(chart: PptChart): string[] {
  return resolveChartColorList(chart, pptSource.value.palette).map(hexForPptx);
}

// ── html2canvas 不支持 color-mix()；导出时锁定 font-family 与在线一致 ────────
function injectPptExportStyles(bodyFontCss: string, headingFontCss?: string): HTMLStyleElement {
  const heading = headingFontCss || bodyFontCss;
  const { accent, bg } = resolveThemeColors();

  const mix = (hex: string, base: string, ratio: number) => {
    const parse = (h: string) => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    const [ar, ag, ab] = parse(hex);
    const [br, bg2, bb] = parse(base);
    const r = Math.round(ar * ratio + br * (1 - ratio));
    const g = Math.round(ag * ratio + bg2 * (1 - ratio));
    const b = Math.round(ab * ratio + bb * (1 - ratio));
    return `rgb(${r},${g},${b})`;
  };

  const coverEnd = mix(accent, "#000000", 0.25);
  const sectionStart = mix(accent, bg, 0.18);
  const quoteEnd = mix(accent, bg, 0.12);
  const endEnd = mix(accent, bg, 0.15);

  const style = document.createElement("style");
  style.id = "ppt-export-styles";
  style.textContent = `
    .ppt-cover {
      background-image: linear-gradient(180deg, ${bg} 0%, ${coverEnd} 100%) !important;
    }
    .ppt-section {
      background-image: linear-gradient(120deg, ${sectionStart} 0%, ${bg} 100%) !important;
    }
    .ppt-quote {
      background-image: linear-gradient(135deg, ${bg}, ${quoteEnd}) !important;
    }
    .ppt-end {
      background-image: linear-gradient(135deg, ${bg}, ${endEnd}) !important;
    }
    .ppt-slide-wrapper,
    .ppt-slide-wrapper .ppt-slide {
      font-family: ${bodyFontCss} !important;
      --ppt-font-body: ${bodyFontCss} !important;
      --ppt-font-heading: ${heading} !important;
      --ppt-font-family: ${bodyFontCss} !important;
      --ppt-quote-font-family: ${bodyFontCss} !important;
    }
    .ppt-slide-wrapper .ppt-cover-title,
    .ppt-slide-wrapper .ppt-slide-title,
    .ppt-slide-wrapper .ppt-section-title {
      font-family: ${heading} !important;
    }
    .ppt-slide-wrapper .ppt-chart-label,
    .ppt-slide-wrapper .ppt-pie-label,
    .ppt-slide-wrapper svg text {
      font-family: ${bodyFontCss} !important;
    }
    /* html2canvas 对 flex+gap 多行文本排版不稳定，导出时改用 block 布局 */
    .ppt-slide-wrapper .ppt-bullet-list {
      display: block !important;
      gap: 0 !important;
    }
    .ppt-slide-wrapper .ppt-bullet-item {
      display: block !important;
      position: relative !important;
      padding-left: 18px !important;
      margin-bottom: 10px !important;
      line-height: 1.55 !important;
    }
    .ppt-slide-wrapper .ppt-bullet-item:last-child {
      margin-bottom: 0 !important;
    }
    .ppt-slide-wrapper .ppt-bullet-dot {
      position: absolute !important;
      left: 0 !important;
      top: 0.5em !important;
      margin-top: 0 !important;
    }
    /* 标题/封面保持 block 换行，避免 html2canvas 把长标题挤成异常断行 */
    .ppt-slide-wrapper .ppt-cover-title .ppt-md-inline,
    .ppt-slide-wrapper .ppt-slide-title .ppt-md-inline,
    .ppt-slide-wrapper .ppt-section-title .ppt-md-inline,
    .ppt-slide-wrapper .ppt-toc-title .ppt-md-inline,
    .ppt-slide-wrapper .ppt-end-title .ppt-md-inline {
      display: block !important;
      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
      line-height: inherit !important;
    }
    /* 要点列表内联 markdown：html2canvas 对 flex 排版不稳定 */
    .ppt-slide-wrapper .ppt-bullet-item .ppt-md-inline,
    .ppt-slide-wrapper .ppt-content-point-body .ppt-md-inline,
    .ppt-slide-wrapper .ppt-content-summary-body .ppt-md-inline {
      line-height: inherit !important;
      display: inline !important;
      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
    }
    .ppt-slide-wrapper .ppt-md-inline .ppt-table-ref {
      line-height: inherit !important;
      vertical-align: baseline !important;
    }
    .ppt-slide-wrapper .ppt-content-point {
      margin-bottom: 10px !important;
    }
    .ppt-slide-wrapper .ppt-content-point-body {
      line-height: 1.6 !important;
    }
    .ppt-slide-wrapper .ppt-topic-grid--fill {
      height: 100% !important;
      min-height: 0 !important;
      align-content: stretch !important;
      align-items: stretch !important;
      overflow-y: hidden !important;
    }
    .ppt-slide-wrapper .ppt-topic-grid--fill .ppt-topic-card {
      height: 100% !important;
      min-height: 0 !important;
    }
    .ppt-slide-wrapper .ppt-content-with-side-image {
      align-items: stretch !important;
      flex: 1 1 auto !important;
      min-height: 0 !important;
    }
  `;
  document.head.appendChild(style);
  return style;
}

async function capturePptSlideToCanvas(
  target: HTMLElement,
  backgroundColor: string | null
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  const bodyCss = pptBodyFontCss.value;
  const headingCss = pptHeadingFontCss.value;
  const restoreTypography = pinPptExportTypography(target);
  try {
    return await html2canvas(target, {
      backgroundColor,
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc, clonedEl) => {
        if (clonedEl instanceof HTMLElement) {
          prepareHtml2CanvasClone(doc, target, clonedEl);
        }
        const root = doc.querySelector(".ppt-slide-wrapper") ?? clonedEl;
        if (root instanceof HTMLElement) {
          root.style.setProperty("font-family", bodyCss, "important");
          root.style.setProperty("--ppt-font-body", bodyCss);
          root.style.setProperty("--ppt-font-heading", headingCss);
          root.style.setProperty("--ppt-font-family", bodyCss);
        }
        doc.querySelectorAll("svg text").forEach((node) => {
          const el = node as SVGTextElement;
          el.style.fontFamily = bodyCss;
        });
      },
    });
  } finally {
    restoreTypography();
  }
}

async function preparePptExportFonts(): Promise<{ bodyFont: string; headingFont: string }> {
  syncPptGoogleFontLinks(
    pptSource.value.palette?.theme_tokens?.typography?.google_fonts_urls
  );
  const bodyStack = parseFontFamilyCssStack(pptBodyFontCss.value);
  const headingStack = parseFontFamilyCssStack(pptHeadingFontCss.value);
  const bodyFont = bodyStack[0] || resolvePptxFontFace(pptDeckFontFamily.value);
  const headingFont = headingStack[0] || bodyFont;
  for (const family of [...new Set([...bodyStack, ...headingStack])]) {
    await loadFont(family);
  }
  await ensureExportFontsReady(bodyFont);
  return { bodyFont, headingFont };
}

function sanitizeExportBasename(title: string): string {
  const cleaned = String(title || "presentation")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .trim();
  return cleaned.slice(0, 80) || "presentation";
}

function buildShareUrl(): string | null {
  const pid = props.projectId?.trim();
  if (pid) {
    return buildExploreProjectShareUrl(pid);
  }
  if (/^\/explore\/project\/[^/?#]+/.test(window.location.pathname)) {
    return window.location.href.split("#")[0];
  }
  return null;
}

function toggleShareMenu() {
  shareMenuOpen.value = !shareMenuOpen.value;
}

function closeShareMenu() {
  shareMenuOpen.value = false;
}

function onShareMenuPointerDown(e: PointerEvent) {
  if (!shareMenuOpen.value) return;
  const root = shareMenuRef.value;
  if (root && !root.contains(e.target as Node)) {
    closeShareMenu();
  }
}

async function copyShareLink() {
  const url = buildShareUrl();
  if (!url) {
    ElMessage.warning(t("agent.pptShareNoProject"));
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success(t("agent.pptShareLinkCopied"));
    closeShareMenu();
  } catch {
    ElMessage.error(t("agent.pptShareCopyFailed"));
  }
}

async function shareToLinkedIn() {
  const url = buildShareUrl();
  if (!url) {
    ElMessage.warning(t("agent.pptShareNoProject"));
    return;
  }
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
  closeShareMenu();
}

async function exportGoogleSlides() {
  closeShareMenu();
  await exportPPTX();
  window.open("https://docs.google.com/presentation/create", "_blank", "noopener,noreferrer");
  ElMessage.info(t("agent.pptExportGoogleSlidesHint"));
}

type PptShareAction = "pdf" | "pptx" | "google-slides" | "png" | "png-long" | "linkedin";

async function runShareAction(action: PptShareAction) {
  if (exporting.value) return;
  if (action === "linkedin") {
    await shareToLinkedIn();
    return;
  }
  if (action === "google-slides") {
    await exportGoogleSlides();
    return;
  }
  closeShareMenu();
  if (action === "pdf") await exportPDF();
  else if (action === "pptx") await exportPPTX();
  else if (action === "png") await exportPNGs();
  else if (action === "png-long") await exportLongPNG();
}

/** 导出时需截图的页数（references 分页按多张计） */
function countExportCaptureUnits(): number {
  let total = 0;
  for (const s of props.pptData.slides) {
    if (s.layout === "references" && (s.content?.length ?? 0) > REFS_PER_PAGE) {
      total += Math.ceil(s.content!.length / REFS_PER_PAGE);
    } else {
      total += 1;
    }
  }
  return total;
}

type CaptureSlidesOptions = {
  onProgress?: (current: number, total: number) => void;
  /** 逐页处理 canvas，不累积在内存中 */
  onCanvas?: (canvas: HTMLCanvasElement, index: number) => Promise<void>;
};

/** 逐页截图（references 分页与 PDF/PNG 导出共用） */
async function captureAllSlidesToCanvases(
  options?: CaptureSlidesOptions | ((current: number, total: number) => void),
): Promise<HTMLCanvasElement[]> {
  const opts: CaptureSlidesOptions =
    typeof options === "function" ? { onProgress: options } : (options ?? {});
  const savedSlide = currentSlide.value;
  const canvases: HTMLCanvasElement[] = [];
  const slideCount = props.pptData.slides.length;
  const captureTotal = countExportCaptureUnits();
  let captureIndex = 0;

  const captureSlide = async () => {
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    if (!slideWrapperRef.value) {
      throw new Error("Slide wrapper missing during export capture");
    }
    const refList = slideWrapperRef.value.querySelector<HTMLElement>(".ppt-ref-list");
    let origOverflow = "";
    let origMaxHeight = "";
    if (refList) {
      origOverflow = refList.style.overflow;
      origMaxHeight = refList.style.maxHeight;
      refList.style.overflow = "visible";
      refList.style.maxHeight = "none";
    }
    const canvas = await capturePptSlideToCanvas(slideWrapperRef.value, null);
    if (refList) {
      refList.style.overflow = origOverflow;
      refList.style.maxHeight = origMaxHeight;
    }
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      throw new Error("Slide capture produced empty canvas");
    }

    const index = captureIndex;
    captureIndex += 1;
    opts.onProgress?.(index + 1, captureTotal);

    if (opts.onCanvas) {
      await opts.onCanvas(canvas, index);
      disposeExportCanvas(canvas);
    } else {
      canvases.push(canvas);
    }
  };

  for (let i = 0; i < slideCount; i++) {
    currentSlide.value = i;
    const s = props.pptData.slides[i];

    if (s.layout === "references" && (s.content?.length ?? 0) > REFS_PER_PAGE) {
      const items = s.content!;
      for (let start = 0; start < items.length; start += REFS_PER_PAGE) {
        overrideContent.value = items.slice(start, start + REFS_PER_PAGE);
        await captureSlide();
      }
      overrideContent.value = null;
    } else {
      overrideContent.value = null;
      await captureSlide();
    }
  }

  currentSlide.value = savedSlide;
  overrideContent.value = null;
  return canvases;
}

// ── 导出图片包（ZIP，JPEG） ─────────────────────────────────────────────────
async function exportPNGs() {
  exporting.value = true;
  exportMessage.value = t("agent.pptExporting");
  resetPptExportSession();
  await preparePptExportFonts();
  const fallbackStyle = injectPptExportStyles(pptBodyFontCss.value, pptHeadingFontCss.value);
  try {
    exportMessage.value = t("agent.pptExportPngPackaging");
    const JSZip = (await import("jszip")).default;
    const { saveAs } = await import("file-saver");
    const zip = new JSZip();
    const base = sanitizeExportBasename(props.pptData.title || "presentation");
    const captureTotal = countExportCaptureUnits();
    let exportedCount = 0;

    await captureAllSlidesToCanvases({
      onProgress: (current, total) => {
        exportMessage.value = t("agent.pptExportCapturing", { current, total });
      },
      onCanvas: async (canvas, index) => {
        exportMessage.value = t("agent.pptExportEncoding", {
          current: index + 1,
          total: captureTotal,
        });
        const result = await canvasToExportBlob(canvas);
        if (!result) {
          throw new Error(`Slide ${index + 1} export encoding failed`);
        }
        const ext = pptExportImageExtension(result.mimeType);
        zip.file(
          `${base}-slide-${String(index + 1).padStart(2, "0")}.${ext}`,
          await result.blob.arrayBuffer(),
        );
        exportedCount += 1;
      },
    });

    if (exportedCount !== captureTotal) {
      ElMessage.error(t("agent.pptExportFailed"));
      return;
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    exportMessage.value = t("agent.pptExportDownloading");
    saveAs(blob, `${base}-slides.zip`);
  } catch (err) {
    console.error("Slide image export failed:", err);
    ElMessage.error(t("agent.pptExportFailed"));
  } finally {
    fallbackStyle.remove();
    overrideContent.value = null;
    exporting.value = false;
    exportMessage.value = "";
  }
}

// ── 导出长图（全部页面纵向拼接，JPEG） ─────────────────────────────────────
async function exportLongPNG() {
  exporting.value = true;
  exportMessage.value = t("agent.pptExporting");
  resetPptExportSession();
  await preparePptExportFonts();
  const fallbackStyle = injectPptExportStyles(pptBodyFontCss.value, pptHeadingFontCss.value);
  try {
    const canvases = await captureAllSlidesToCanvases({
      onProgress: (current, total) => {
        exportMessage.value = t("agent.pptExportCapturing", { current, total });
      },
    });
    if (!canvases.length) return;

    exportMessage.value = t("agent.pptExportPngStitching");
    const { bg } = resolveThemeColors();
    const scaledCanvases = prepareSlideCanvasesForLongExport(canvases);
    const stitched = stitchCanvasesVertically(scaledCanvases, { background: bg });
    scaledCanvases.forEach(disposeExportCanvas);
    if (scaledCanvases !== canvases) {
      canvases.forEach(disposeExportCanvas);
    }
    if (!stitched) {
      ElMessage.error(t("agent.pptExportFailed"));
      return;
    }

    exportMessage.value = t("agent.pptExportDownloading");
    const { saveAs } = await import("file-saver");
    const base = sanitizeExportBasename(props.pptData.title || "presentation");
    const result = await canvasToExportBlob(stitched, {
      targetSizeRatio: PPT_EXPORT_LONG_TARGET_SIZE_RATIO,
    });
    disposeExportCanvas(stitched);
    if (!result) {
      ElMessage.error(t("agent.pptExportPngLongTooLarge"));
      return;
    }
    const ext = pptExportImageExtension(result.mimeType);
    saveAs(result.blob, `${base}-long.${ext}`);
  } catch (err) {
    console.error("Long scroll image export failed:", err);
    ElMessage.error(t("agent.pptExportFailed"));
  } finally {
    fallbackStyle.remove();
    overrideContent.value = null;
    exporting.value = false;
    exportMessage.value = "";
  }
}

// ── 导出 PDF（html2canvas 逐页截图 → jsPDF 直接下载） ──────────────────────
async function exportPDF() {
  exporting.value = true;
  exportMessage.value = t("agent.pptExporting");
  await preparePptExportFonts();
  const fallbackStyle = injectPptExportStyles(pptBodyFontCss.value, pptHeadingFontCss.value);
  try {
    // @ts-expect-error UMD subpath has no bundled TS declaration in this project setup
    const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js");

    const canvases = await captureAllSlidesToCanvases({
      onProgress: (current, total) => {
        exportMessage.value = t("agent.pptExportCapturing", { current, total });
      },
    });

    if (canvases.length === 0) return;

    exportMessage.value = t("agent.pptExportMerging");
    const [firstCanvas, ...restCanvases] = canvases;
    const pdf = new jsPDF({
      orientation: firstCanvas.width >= firstCanvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [firstCanvas.width, firstCanvas.height],
      compress: true,
    });

    const addCanvasPage = (canvas: HTMLCanvasElement, addNewPage: boolean) => {
      if (addNewPage) {
        pdf.addPage(
          [canvas.width, canvas.height],
          canvas.width >= canvas.height ? "landscape" : "portrait"
        );
      }
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        canvas.width,
        canvas.height,
        undefined,
        "FAST"
      );
    };

    addCanvasPage(firstCanvas, false);
    restCanvases.forEach((canvas) => addCanvasPage(canvas, true));

    exportMessage.value = t("agent.pptExportDownloading");
    pdf.save(`${props.pptData.title || "presentation"}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
    ElMessage.error(t("agent.pptExportFailed"));
  } finally {
    // 移除降级样式，清理覆盖状态
    fallbackStyle.remove();
    overrideContent.value = null;
    exporting.value = false;
    exportMessage.value = "";
  }
}

// ── 导出 PPTX（使用 pptxgenjs） ────────────────────────────────────────────
async function exportPPTX() {
  exporting.value = true;
  exportMessage.value = t("agent.pptExporting");
  const savedSlideIdx = currentSlide.value;
  let fallbackStyle: HTMLStyleElement | null = null;
  try {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    const theme = resolveThemeColors();
    const { bodyFont, headingFont } = await preparePptExportFonts();
    fallbackStyle = injectPptExportStyles(pptBodyFontCss.value, pptHeadingFontCss.value);
    pptx.layout = "LAYOUT_WIDE"; // 16:9

    const addMarkdownTextBlock = (
      pptSlide: any,
      text: string,
      box: Record<string, unknown>,
      opts: Record<string, unknown>
    ) => {
      pptSlide.addText(pptInlineMarkdownToPptxRuns(text, opts) as any, box);
    };

    const addMarkdownBulletBlock = (
      pptSlide: any,
      items: string[],
      box: Record<string, unknown>,
      opts: Record<string, unknown>
    ) => {
      if (!items?.length) return;
      pptSlide.addText(buildPptxBulletTextRuns(items, opts) as any, box);
    };

    // ── 通用图表添加辅助函数 ──────────────────────────────────────────────
    const addChartToPptSlide = (
      pptSlide: any,
      chart: PptChart,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      if (!chart?.data?.length) return;

      const accentHex = theme.accent.replace("#", "");
      const textHex = theme.text.replace("#", "");
      const seriesColors = chartColorsForPptx(chart);
      const pickSeriesColor = (i: number) =>
        seriesColors[i % seriesColors.length] || accentHex;

      // 构建图表标题文本
      if (chart.title) {
        pptSlide.addText(chart.title, {
          x,
          y,
          w,
          h: 0.35,
          fontSize: 11,
          fontFace: bodyFont,
          color: textHex,
          bold: true,
        });
        y += 0.35;
        h -= 0.35;
      }

      const labels = chart.data.map((d) => d.label);

      // ── 水平条形图 horizontal_bar ──
      if (chart.type === "horizontal_bar") {
        const dataRows = [
          {
            name: chart.y_label || t("agent.pptValueLabel"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.bar, dataRows, {
          x,
          y,
          w,
          h,
          barDir: "bar",
          chartColors: seriesColors,
          showLegend: false,
          showValue: true,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          valAxisLineColor: "888888",
          catAxisLineColor: "888888",
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 堆叠柱状图 stacked_bar ──
      if (chart.type === "stacked_bar") {
        const rowLabels = chart.data.map((d) => d.label);
        const numSeries = Math.max(
          0,
          ...chart.data.map((d) => getStackedBarRowValues(d).length)
        );
        if (!numSeries || !rowLabels.length) return;
        const rawCats = chart.categories;
        const rawLabels = chart.labels;
        const cats: string[] = [];
        for (let i = 0; i < numSeries; i++) {
          const rc = rawCats?.[i];
          const rl = rawLabels?.[i];
          cats.push(
            rc != null && String(rc).trim() !== ""
              ? String(rc)
              : rl != null && String(rl).trim() !== ""
                ? String(rl)
                : t("agent.pptSeriesLabel", { index: i + 1 })
          );
        }
        const dataRows = cats.map((cat, ci) => ({
          name: cat,
          labels: rowLabels,
          values: chart.data.map((d) => getStackedBarRowValues(d)[ci] ?? 0),
        }));
        pptSlide.addChart((pptx as any).ChartType.bar, dataRows, {
          x,
          y,
          w,
          h,
          barDir: "col",
          barGrouping: "stacked",
          chartColors: seriesColors,
          showLegend: true,
          legendPos: "b",
          legendFontSize: 9,
          legendColor: textHex,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          showValue: true,
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 雷达图 radar ──
      if (chart.type === "radar") {
        const first = chart.data[0] as any;
        const isSeriesArrayFormat = Array.isArray(first?.values);
        const radarLabels = chart.labels?.length
          ? chart.labels
          : chart.categories?.length
          ? chart.categories
          : labels;
        const dataRows = isSeriesArrayFormat
          ? (chart.data as any[]).map((d, i) => ({
              name: d.name ?? d.label ?? t('agent.pptSeriesLabel', { index: i + 1 }),
              labels: radarLabels,
              values: d.values ?? [],
            }))
          : [
              {
                name: chart.y_label || t('agent.pptValueLabel'),
                labels,
                values: chart.data.map((d) => d.value),
              },
            ];
        pptSlide.addChart((pptx as any).ChartType.radar, dataRows, {
          x,
          y,
          w,
          h,
          chartColors: seriesColors,
          showLegend: dataRows.length > 1,
          legendPos: "b",
          legendFontSize: 9,
          legendColor: textHex,
          catAxisLabelColor: textHex,
          valAxisLabelColor: textHex,
        });
        return;
      }

      // ── 面积图 area ──
      if (chart.type === "area") {
        const dataRows = [
          {
            name: chart.y_label || t("agent.pptValueLabel"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.area, dataRows, {
          x,
          y,
          w,
          h,
          chartColors: [pickSeriesColor(0)],
          showLegend: false,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
        });
        return;
      }

      // ── 组合图 combo（柱+折线） ──
      if (chart.type === "combo") {
        const barData = [
          {
            name: chart.primary_data_label || t("agent.pptChartPrimary"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        const lineData = chart.secondary_data?.length
          ? [
              {
                name: chart.secondary_data_label || t("agent.pptChartSecondary"),
                labels: chartSecondarySeries(chart).map((d) => d.label),
                values: chartSecondarySeries(chart).map((d) => d.value),
              },
            ]
          : chart.data.some((d) => d.secondary_value !== undefined)
          ? [
              {
                name: chart.secondary_data_label || t("agent.pptChartSecondary"),
                labels,
                values: chart.data.map((d) => d.secondary_value ?? 0),
              },
            ]
          : [];
        if (lineData.length) {
          pptSlide.addChart(
            [
              {
                type: (pptx as any).ChartType.bar,
                data: barData,
                options: { chartColors: [pickSeriesColor(0)], barDir: "col" },
              },
              {
                type: (pptx as any).ChartType.line,
                data: lineData,
                options: {
                  chartColors: [pickSeriesColor(1)],
                  secondaryValAxis: true,
                  secondaryCatAxis: true,
                },
              },
            ],
            {
              x,
              y,
              w,
              h,
              showLegend: true,
              legendPos: "b",
              legendFontSize: 9,
              legendColor: textHex,
              valAxisLabelColor: textHex,
              catAxisLabelColor: textHex,
            }
          );
        } else {
          pptSlide.addChart((pptx as any).ChartType.bar, barData, {
            x,
            y,
            w,
            h,
            barDir: "col",
            chartColors: [pickSeriesColor(0)],
            showLegend: false,
            valAxisLabelColor: textHex,
            catAxisLabelColor: textHex,
          });
        }
        return;
      }

      // ── 折线图 line ──
      if (chart.type === "line") {
        if (isMultiSeriesLineChart(chart)) {
          const cats = (chart.categories ?? chart.labels ?? []).map((c) => String(c));
          const seriesRows = getLineChartSeriesRows(chart);
          const series = seriesRows.map((s) => ({
            name: groupedBarSeriesLabel(s) || t("agent.pptValueLabel"),
            labels: cats,
            values: cats.map((_, i) => s.values?.[i] ?? 0),
          }));
          pptSlide.addChart((pptx as any).ChartType.line, series, {
            x,
            y,
            w,
            h,
            chartColors: seriesColors,
            showLegend: series.length > 1,
            legendPos: "b",
            legendFontSize: 9,
            legendColor: textHex,
            valAxisLabelColor: textHex,
            catAxisLabelColor: textHex,
            lineDataSymbol: "circle",
            lineDataSymbolSize: 6,
          });
          return;
        }
        const series: any[] = [
          {
            name: chart.y_label || t("agent.pptValueLabel"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        if (chart.secondary_data?.length) {
          series.push({
            name: chart.secondary_data_label || t("agent.pptChartSecondary"),
            labels: chartSecondarySeries(chart).map((d) => d.label),
            values: chartSecondarySeries(chart).map((d) => d.value),
          });
        }
        if (chart.data.some((d) => d.secondary_value !== undefined)) {
          series.push({
            name: chart.secondary_data_label || t("agent.pptChartSecondary"),
            labels,
            values: chart.data.map((d) => d.secondary_value ?? 0),
          });
        }
        pptSlide.addChart((pptx as any).ChartType.line, series, {
          x,
          y,
          w,
          h,
          chartColors: seriesColors,
          showLegend: series.length > 1,
          legendPos: "b",
          legendFontSize: 9,
          legendColor: textHex,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          lineDataSymbol: "circle",
          lineDataSymbolSize: 6,
        });
        return;
      }

      // ── 饼图 pie ──
      if (chart.type === "pie") {
        const dataRows = [
          { name: chart.title || "Data", labels, values: chart.data.map((d) => d.value) },
        ];
        pptSlide.addChart((pptx as any).ChartType.pie, dataRows, {
          x,
          y,
          w,
          h,
          chartColors: seriesColors,
          showLegend: true,
          legendPos: "r",
          legendFontSize: 9,
          legendColor: textHex,
          showPercent: true,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 散点图 scatter ──
      if (chart.type === "scatter") {
        const dataRows = [
          {
            name: chart.y_label || "Y",
            labels,
            values: chart.data.map((d) => d.y ?? d.secondary_value ?? d.value ?? 0),
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.scatter, dataRows, {
          x, y, w, h,
          chartColors: seriesColors,
          showLegend: false,
          showValue: true,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 热力图 heatmap（pptxgenjs 无原生支持，用表格代替） ──
      if (chart.type === "heatmap") {
        // Fallback: render as a bar chart with the first row's data
        const dataRows = [
          {
            name: chart.y_label || t("agent.pptValueLabel"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.bar, dataRows, {
          x, y, w, h,
          barDir: "col",
          chartColors: seriesColors,
          showLegend: false,
          showValue: true,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 树形图 treemap（pptxgenjs 无原生支持，用饼图代替） ──
      if (chart.type === "treemap") {
        const dataRows = [
          { name: chart.title || "Data", labels, values: chart.data.map((d) => Math.abs(d.value)) },
        ];
        pptSlide.addChart((pptx as any).ChartType.pie, dataRows, {
          x, y, w, h,
          chartColors: seriesColors,
          showLegend: true,
          legendPos: "r",
          legendFontSize: 9,
          legendColor: textHex,
          showPercent: true,
          dataLabelFontSize: 9,
        });
        return;
      }

      // ── 仪表盘图 gauge（pptxgenjs 无原生支持，用 doughnut 代替） ──
      if (chart.type === "gauge") {
        const val = chart.data?.[0]?.value ?? 0;
        const gMin = chart.min_value ?? 0;
        const gMax = chart.max_value ?? 100;
        const ratio = Math.max(0, Math.min(1, (val - gMin) / ((gMax - gMin) || 1)));
        const dataRows = [
          {
            name: chart.data?.[0]?.label || t("agent.pptValueLabel"),
            labels: ["Completed", "Remaining"],
            values: [ratio * 100, (1 - ratio) * 100],
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.doughnut, dataRows, {
          x, y, w, h,
          chartColors: [accentHex, "E8E8E8"],
          showLegend: false,
          showTitle: true,
          title: `${val}${chart.unit || ''} / ${gMax}`,
          titleColor: textHex,
          titleFontSize: 14,
        });
        return;
      }

      // ── 默认柱状图 bar（含分组） ──
      const hasGroupedValues = !!(
        chart.categories?.length && chart.data.some((d) => d.values?.length)
      );
      if (hasGroupedValues) {
        // 分组柱状图
        const cats = chart.categories || [];
        const groupedDataRows = cats.map((cat, ci) => ({
          name: cat,
          labels,
          values: chart.data.map((d) => d.values?.[ci] ?? 0),
        }));
        pptSlide.addChart((pptx as any).ChartType.bar, groupedDataRows, {
          x,
          y,
          w,
          h,
          barDir: "col",
          barGrouping: "clustered",
          chartColors: seriesColors,
          showLegend: true,
          legendPos: "b",
          legendFontSize: 9,
          legendColor: textHex,
          showValue: true,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
      } else {
        const dataRows = [
          {
            name: chart.y_label || t("agent.pptValueLabel"),
            labels,
            values: chart.data.map((d) => d.value),
          },
        ];
        pptSlide.addChart((pptx as any).ChartType.bar, dataRows, {
          x,
          y,
          w,
          h,
          barDir: "col",
          chartColors: seriesColors,
          showLegend: false,
          showValue: true,
          valAxisLabelColor: textHex,
          catAxisLabelColor: textHex,
          dataLabelColor: textHex,
          dataLabelFontSize: 9,
        });
      }
    };
    // ── END addChartToPptSlide ────────────────────────────────────────────

    const addTableToPptSlide = (
      pptSlide: any,
      table: PptTable,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      const cols = table?.columns ?? [];
      const bodyRows = table?.rows ?? [];
      if (cols.length < 2 || !bodyRows.length) return;

      const accentHex = theme.accent.replace("#", "");
      const textHex = theme.text.replace("#", "");
      let curY = y;
      let curH = h;

      if (table.title) {
        pptSlide.addText(table.title, {
          x,
          y: curY,
          w,
          h: 0.35,
          fontSize: 11,
          fontFace: bodyFont,
          color: textHex,
          bold: true,
        });
        curY += 0.35;
        curH -= 0.35;
      }

      const hi = Number.isInteger(table.highlight_column) ? table.highlight_column! : -1;
      const headerRow = cols.map((col, ci) => ({
        text: stripPptInlineMarkdown(col),
        options: {
          bold: true,
          color: ci === hi ? "FFFFFF" : textHex,
          fill: ci === hi ? accentHex : "333333",
        },
      }));
      const dataRows = bodyRows.map((row) =>
        cols.map((_, ci) => ({
          text: stripPptInlineMarkdown(String(row?.[ci] ?? "")),
          options:
            ci === hi
              ? {
                  bold: true,
                  color: accentHex,
                  fill: "F5F5F5",
                }
              : {
                  color: textHex,
                },
        }))
      );

      pptSlide.addTable([headerRow, ...dataRows], {
        x,
        y: curY,
        w,
        h: Math.max(1.2, curH - 0.4),
        fontSize: 9,
        fontFace: bodyFont,
        border: { pt: 0.5, color: "CCCCCC" },
        valign: "top",
      });

      const notes = String(table.notes ?? table.note ?? "").trim();
      const source = String(table.source ?? "").trim();
      const footer = [source, notes].filter(Boolean).join(" · ");
      if (footer) {
        pptSlide.addText(footer, {
          x,
          y: curY + Math.max(1.2, curH - 0.4) + 0.08,
          w,
          h: 0.35,
          fontSize: 8,
          fontFace: bodyFont,
          color: textHex,
          italic: Boolean(notes),
        });
      }
    };
    // ── END addTableToPptSlide ────────────────────────────────────────────

    const addMetricCardsRowToPptSlide = (
      pptSlide: any,
      cards: NonNullable<PptSlide["metric_cards"]>,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      if (!cards.length) return;
      const accentHex = theme.accent.replace("#", "");
      const textHex = theme.text.replace("#", "");
      const gap = 0.12;
      const cardW = (w - gap * (cards.length - 1)) / cards.length;
      cards.forEach((card, i) => {
        const cx = x + i * (cardW + gap);
        if (card.value) {
          pptSlide.addText(String(card.value), {
            x: cx,
            y,
            w: cardW,
            h: Math.min(0.75, h * 0.35),
            fontSize: 24,
            fontFace: bodyFont,
            color: accentHex,
            bold: true,
            align: "center",
            valign: "middle",
          });
        }
        if (card.label) {
          pptSlide.addText(card.label, {
            x: cx,
            y: y + h * 0.38,
            w: cardW,
            h: Math.min(0.45, h * 0.22),
            fontSize: 11,
            fontFace: bodyFont,
            color: textHex,
            align: "center",
          });
        }
        if (card.detail) {
          pptSlide.addText(card.detail, {
            x: cx,
            y: y + h * 0.62,
            w: cardW,
            h: Math.min(0.55, h * 0.28),
            fontSize: 9,
            fontFace: bodyFont,
            color: textHex,
            align: "center",
          });
        }
      });
    };

    const addMetricCardsColumnToPptSlide = (
      pptSlide: any,
      cards: NonNullable<PptSlide["metric_cards"]>,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      if (!cards.length) return;
      const accentHex = theme.accent.replace("#", "");
      const textHex = theme.text.replace("#", "");
      const cardH = Math.min(1.15, h / cards.length - 0.08);
      cards.forEach((card, i) => {
        const cy = y + i * (cardH + 0.08);
        if (card.value) {
          pptSlide.addText(String(card.value), {
            x,
            y: cy,
            w,
            h: cardH * 0.42,
            fontSize: 20,
            fontFace: bodyFont,
            color: accentHex,
            bold: true,
          });
        }
        if (card.label) {
          pptSlide.addText(card.label, {
            x,
            y: cy + cardH * 0.44,
            w,
            h: cardH * 0.28,
            fontSize: 10,
            fontFace: bodyFont,
            color: textHex,
          });
        }
        if (card.detail) {
          pptSlide.addText(card.detail, {
            x,
            y: cy + cardH * 0.72,
            w,
            h: cardH * 0.28,
            fontSize: 9,
            fontFace: bodyFont,
            color: textHex,
          });
        }
      });
    };

    const applyPptNativeVisualFallback = (pptSlide: any, slide: PptSlide) => {
      const hasTable = !!(slide.table?.columns?.length && slide.table?.rows?.length);
      const hasChart = !!slide.chart?.data?.length;
      if (!hasTable && !hasChart) return;

      if (slide.layout === "content" || !slide.layout) {
        if (hasTable) addTableToPptSlide(pptSlide, slide.table!, 5.5, 1.4, 5.8, 4.2);
        else if (hasChart) addChartToPptSlide(pptSlide, slide.chart!, 5.5, 1.4, 5.8, 4.2);
        return;
      }
      if (slide.layout === "data") {
        const hasContent = !!resolveSlideBulletItems(slide).length;
        const visualH = hasContent ? 3.2 : 4.8;
        if (hasTable) addTableToPptSlide(pptSlide, slide.table!, 0.8, 1.4, 10, visualH);
        else if (hasChart) addChartToPptSlide(pptSlide, slide.chart!, 0.8, 1.4, 10, visualH);
        return;
      }
      if (slide.layout === "two_column" && !isChapterImagePage(slide)) {
        if (hasTable) {
          if (isTableLeftColumn(slide)) {
            addTableToPptSlide(pptSlide, slide.table!, 0.5, 2.1, 5.5, 3.5);
          } else {
            addTableToPptSlide(pptSlide, slide.table!, 6.5, 2.1, 5.3, 3.5);
          }
        } else if (hasChart) {
          addChartToPptSlide(pptSlide, slide.chart!, 6.5, 2.1, 5.3, 3.5);
        }
      }
    };

    const slidesList = props.pptData.slides;
    const totalSlides = slidesList.length;

    for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
      const rawSlide = slidesList[slideIdx];
      const s = normalizeSlideData(rawSlide) as PptSlide;

      currentSlide.value = slideIdx;
      exportMessage.value = t("agent.pptExportCapturing", {
        current: slideIdx + 1,
        total: totalSlides,
      });
      await nextTick();
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );

      const useVisualRaster = resolvePptVisualRasterSelectors(s).length > 0;
      const backdropUrl = resolvePptSlideExportBackdropUrl(s);

      const pptSlide = pptx.addSlide();
      if (backdropUrl) {
        pptSlide.background = { path: backdropUrl } as any;
        await addPptSlideBackdropOverlay(pptSlide, slideWrapperRef.value);
      } else if (needsPptSlideDecorativeBackground(s)) {
        const decorativeBg = await capturePptSlideDecorativeBackground(
          slideWrapperRef.value,
          theme.bg
        );
        if (decorativeBg) {
          pptSlide.background = { data: decorativeBg } as any;
        } else {
          pptSlide.background = { color: theme.bg.replace("#", "") };
        }
      } else {
        pptSlide.background = { color: theme.bg.replace("#", "") };
      }

      switch (s.layout) {
        case "cover":
          {
            const accentHex = theme.accent.replace("#", "");
            const textHex = theme.text.replace("#", "");
            addMarkdownTextBlock(
              pptSlide,
              s.title,
              {
                x: 0.5,
                y: 2,
                w: 12.33,
                h: 1.55,
                fontSize: 32,
                fontFace: headingFont,
                color: accentHex,
                bold: true,
                align: "center",
                valign: "middle",
              },
              {
                fontSize: 32,
                fontFace: headingFont,
                color: accentHex,
                bold: true,
              }
            );
            if (props.pptData.subtitle) {
              pptSlide.addText(props.pptData.subtitle, {
                x: 0.5,
                y: 3.65,
                w: 12.33,
                h: 0.75,
                fontSize: 17,
                fontFace: bodyFont,
                color: accentHex,
                italic: true,
                align: "center",
              });
            }
            const org =
              s.author || s.organization || t("agent.pptDefaultOrg");
            const dateStr =
              s.date ||
              new Date().toLocaleDateString(
                locale.value === "zh-cn" ? "zh-CN" : "en-US",
                { year: "numeric", month: "long" }
              );
            pptSlide.addText(`${org}\n${dateStr}`, {
              x: 3.66,
              y: 5.55,
              w: 6,
              h: 0.95,
              fontSize: 11,
              fontFace: bodyFont,
              color: textHex,
              align: "center",
              valign: "middle",
            });
          }
          break;

        case "section":
          addSectionLayoutToPptSlide(
            pptSlide,
            s,
            resolveSectionChapterLabel(s, slideIdx, slidesList),
            pptx,
            theme,
            bodyFont,
            headingFont
          );
          break;

        case "content":
        default:
          addMarkdownTextBlock(
            pptSlide,
            s.title,
            {
              x: 0.8,
              y: 0.4,
              w: 10,
              h: 0.8,
              fontSize: 24,
              fontFace: headingFont,
              color: theme.accent.replace("#", ""),
              bold: true,
            },
            {
              fontSize: 24,
              fontFace: headingFont,
              color: theme.accent.replace("#", ""),
              bold: true,
            }
          );
          if (isMetricCardsDataSlide(s) && s.metric_cards?.length) {
            addMetricCardsRowToPptSlide(pptSlide, s.metric_cards, 0.8, 1.4, 10, 2.4);
            if (resolveSlideBulletItems(s).length) {
              addMarkdownBulletBlock(
                pptSlide,
                resolveSlideBulletItems(s),
                {
                  x: 0.8,
                  y: 4.8,
                  w: 10,
                  h: 2.0,
                  valign: "top",
                },
                {
                  fontSize: 13,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  paraSpaceAfter: 5,
                }
              );
            }
          } else if (s.table?.columns?.length && s.table?.rows?.length) {
            // 有表格时：文字在左上，表格在右侧（对齐预览左右分栏）
            const tableContentItems = resolveSlideBulletItems(s);
            if (tableContentItems.length) {
              addMarkdownBulletBlock(
                pptSlide,
                tableContentItems,
                {
                  x: 0.8,
                  y: 1.4,
                  w: 4.5,
                  h: s.key_insight ? 3.05 : 4.0,
                  valign: "top",
                },
                {
                  fontSize: 13,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  paraSpaceAfter: 5,
                }
              );
            }
            if (s.key_insight) {
              addMarkdownTextBlock(
                pptSlide,
                s.key_insight,
                {
                  x: 0.8,
                  y: 4.52,
                  w: 4.5,
                  h: 0.95,
                  fontSize: 11,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  italic: true,
                  valign: "top",
                },
                {
                  fontSize: 11,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  italic: true,
                }
              );
            }
            if (!useVisualRaster) {
              addTableToPptSlide(pptSlide, s.table, 5.5, 1.4, 5.8, 4.2);
            }
          } else if (s.chart?.data?.length) {
            // 有图表时：文字在左上，图表在右侧或下方（对齐预览左右分栏）
            const chartContentItems = resolveSlideBulletItems(s);
            if (chartContentItems.length) {
              addMarkdownBulletBlock(
                pptSlide,
                chartContentItems,
                {
                  x: 0.8,
                  y: 1.4,
                  w: 4.5,
                  h: s.key_insight ? 3.05 : 4.0,
                  valign: "top",
                },
                {
                  fontSize: 13,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  paraSpaceAfter: 5,
                }
              );
            }
            if (s.key_insight) {
              addMarkdownTextBlock(
                pptSlide,
                s.key_insight,
                {
                  x: 0.8,
                  y: 4.52,
                  w: 4.5,
                  h: 0.95,
                  fontSize: 11,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  italic: true,
                  valign: "top",
                },
                {
                  fontSize: 11,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  italic: true,
                }
              );
            }
            if (!useVisualRaster) {
              addChartToPptSlide(pptSlide, s.chart, 5.5, 1.4, 5.8, 4.2);
            }
          } else if (s.content?.length) {
            addMarkdownBulletBlock(
              pptSlide,
              s.content,
              {
                x: 0.8,
                y: 1.5,
                w: 10,
                h: 4.5,
                valign: "top",
              },
              {
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
                paraSpaceAfter: 8,
              }
            );
          }
          break;

        case "two_column":
          addMarkdownTextBlock(
            pptSlide,
            s.title,
            {
              x: 0.8,
              y: 0.4,
              w: 10,
              h: 0.8,
              fontSize: 24,
              fontFace: headingFont,
              color: theme.accent.replace("#", ""),
              bold: true,
            },
            {
              fontSize: 24,
              fontFace: headingFont,
              color: theme.accent.replace("#", ""),
              bold: true,
            }
          );
          if (hasDocumentFigurePage(s)) {
            const fig = normalizeDocumentFigure(s)!;
            const [leftPct, rightPct] = parseColumnSplit(s.column_split);
            const totalPct = leftPct + rightPct;
            const leftW = (leftPct / totalPct) * 5.5;
            const rightX = 0.5 + leftW + 0.3;
            const rightW = (rightPct / totalPct) * 5.5;
            if (s.left_title) {
              pptSlide.addText(s.left_title, {
                x: 0.5,
                y: 1.5,
                w: leftW,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            addBulletBlock(documentFigureLeftItems(s), 0.5, 2.1, leftW, 3.5);
            if (s.right_title) {
              pptSlide.addText(s.right_title, {
                x: rightX,
                y: 1.5,
                w: rightW,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            if (fig.url) {
              try {
                pptSlide.addImage({
                  path: fig.url,
                  x: rightX,
                  y: 2.1,
                  w: rightW,
                  h: 3.2,
                  sizing: { type: "contain", w: rightW, h: 3.2 },
                });
              } catch (err) {
                console.warn("PPTX document figure image failed:", err);
              }
            }
            if (fig.caption) {
              pptSlide.addText(fig.caption, {
                x: rightX,
                y: 5.45,
                w: rightW,
                h: 0.45,
                fontSize: 10,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
                italic: true,
                align: "center",
              });
            }
            break;
          }
          if (isChapterImagePage(s)) {
            if (s.subtitle) {
              pptSlide.addText(s.subtitle, {
                x: 0.8,
                y: 1.15,
                w: 10,
                h: 0.45,
                fontSize: 13,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
              });
            }
            if (s.left_title) {
              pptSlide.addText(s.left_title, {
                x: 0.5,
                y: 1.65,
                w: 5.2,
                h: 0.4,
                fontSize: 14,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            if (s.right_title) {
              pptSlide.addText(s.right_title, {
                x: 6.2,
                y: 1.65,
                w: 5.2,
                h: 0.4,
                fontSize: 14,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            let cardY = 2.15;
            (s.right_items || []).forEach((ri, i) => {
              const titleLine =
                `${formatRightItemIndex(ri, i)}  ${rightItemTitle(ri)}`.trim();
              if (titleLine) {
                pptSlide.addText(titleLine, {
                  x: 6.2,
                  y: cardY,
                  w: 5.2,
                  h: 0.35,
                  fontSize: 12,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  bold: true,
                });
              }
              const desc = rightItemDescription(ri);
              if (desc) {
                pptSlide.addText(desc, {
                  x: 6.2,
                  y: cardY + 0.38,
                  w: 5.2,
                  h: 0.55,
                  fontSize: 10,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                });
                cardY += 1.05;
              } else {
                cardY += 0.55;
              }
            });
            if (s.key_insight) {
              pptSlide.addText(s.key_insight, {
                x: 0.8,
                y: 4.85,
                w: 10.5,
                h: 0.55,
                fontSize: 11,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
                italic: true,
              });
            }
            break;
          }
          const addBulletBlock = (
            items: string[],
            x: number,
            y: number,
            w: number,
            h: number
          ) => {
            addMarkdownBulletBlock(
              pptSlide,
              items,
              { x, y, w, h, valign: "top" },
              {
                fontSize: 14,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
                paraSpaceAfter: 6,
              }
            );
          };

          const hasExplicitColumns = !!(
            s.left_content?.length ||
            s.right_content?.length ||
            s.right_items?.length
          );

          const addRightItemCards = (startX: number, startY: number) => {
            let cardY = startY;
            (s.right_items || []).forEach((ri, i) => {
              const itemHex = hexForPptx(rightItemAccentColor(ri, i));
              const titleLine =
                `${formatRightItemIndex(ri, i)}  ${rightItemTitle(ri)}`.trim();
              if (titleLine) {
                pptSlide.addText(titleLine, {
                  x: startX,
                  y: cardY,
                  w: 5.5,
                  h: 0.38,
                  fontSize: 13,
                  fontFace: bodyFont,
                  color: itemHex,
                  bold: true,
                  valign: "top",
                });
              }
              const desc = rightItemDescription(ri);
              if (desc) {
                pptSlide.addText(desc, {
                  x: startX,
                  y: cardY + 0.4,
                  w: 5.5,
                  h: 0.78,
                  fontSize: 11,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  valign: "top",
                });
                cardY += 1.35;
              } else {
                cardY += 0.55;
              }
            });
          };

          // 1) 显式双列（left_content / right_content / right_items）
          if (hasExplicitColumns) {
            if (s.left_title) {
              pptSlide.addText(s.left_title, {
                x: 0.5,
                y: 1.5,
                w: 5.5,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            addBulletBlock(s.left_content || [], 0.5, 2.1, 5.5, 3.5);

            if (s.right_title) {
              pptSlide.addText(s.right_title, {
                x: 6.5,
                y: 1.5,
                w: 5.5,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            if (s.right_items?.length) {
              addRightItemCards(6.5, 2.1);
            } else {
              addBulletBlock(s.right_content || [], 6.5, 2.1, 5.5, 3.5);
            }
          } else if (s.content?.length) {
            const splitIdx = resolveContentSplitIndex(s.column_split, s.content.length);
            if (splitIdx) {
            // 2) 由 content + column_split 推导双列（当前很多两列页是这种结构）
            const leftItems = s.content.slice(0, splitIdx);
            const rightItems = s.content.slice(splitIdx);

            if (s.left_title) {
              pptSlide.addText(s.left_title, {
                x: 0.5,
                y: 1.5,
                w: 5.5,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }

            if (s.right_title) {
              pptSlide.addText(s.right_title, {
                x: 6.5,
                y: 1.5,
                w: 5.5,
                h: 0.5,
                fontSize: 16,
                fontFace: bodyFont,
                color: theme.accent.replace("#", ""),
                bold: true,
              });
            }
            if (s.table?.columns?.length && s.table?.rows?.length) {
              if (!useVisualRaster) {
                if (isTableLeftColumn(s)) {
                  addTableToPptSlide(pptSlide, s.table, 0.5, 2.1, 5.5, 3.5);
                } else {
                  addTableToPptSlide(pptSlide, s.table, 6.5, 2.1, 5.3, 3.5);
                }
              }
              if (isTableLeftColumn(s)) {
                addBulletBlock(rightItems, 6.5, 2.1, 5.5, 3.5);
              } else {
                addBulletBlock(leftItems, 0.5, 2.1, 5.5, 3.5);
              }
            } else if (s.chart?.data?.length) {
              addBulletBlock(leftItems, 0.5, 2.1, 5.5, 3.5);
              if (!useVisualRaster) {
                addChartToPptSlide(pptSlide, s.chart, 6.5, 2.1, 5.3, 3.5);
              }
            } else {
              addBulletBlock(leftItems, 0.5, 2.1, 5.5, 3.5);
              addBulletBlock(rightItems, 6.5, 2.1, 5.5, 3.5);
            }
            } else {
              // 3) 兜底：仅 content，整页展示
              addBulletBlock(s.content, 0.8, 1.5, 10.5, 4.5);
            }
          }
          break;

        case "data":
          {
            const accentHex = theme.accent.replace("#", "");
            const textHex = theme.text.replace("#", "");
            addMarkdownTextBlock(
              pptSlide,
              s.title,
              {
                x: 0.8,
                y: 0.4,
                w: 10,
                h: 0.8,
                fontSize: 24,
                fontFace: headingFont,
                color: accentHex,
                bold: true,
              },
              {
                fontSize: 24,
                fontFace: headingFont,
                color: accentHex,
                bold: true,
              }
            );
            const dataHasTable = !!(s.table?.columns?.length && s.table?.rows?.length);
            const dataHasChart = !!s.chart?.data?.length;
            const dataHasContent = !!resolveSlideBulletItems(s).length;
            const metricCards = s.metric_cards ?? [];
            const isMetricSplit = isMetricCardsChartSplitSlide(s);
            const isMetricRow = isMetricCardsDataSlide(s);
            const dataVisualH = dataHasContent ? 3.2 : 4.8;
            const dataContentY =
              dataHasTable || dataHasChart || isMetricRow || isMetricSplit ? 4.8 : 1.5;

            if (isMetricRow && metricCards.length) {
              addMetricCardsRowToPptSlide(
                pptSlide,
                metricCards,
                0.8,
                1.4,
                10,
                2.4
              );
            } else if (isMetricSplit && metricCards.length) {
              addMetricCardsColumnToPptSlide(
                pptSlide,
                metricCards,
                0.8,
                1.4,
                3.5,
                4.2
              );
            } else if (dataHasTable && !useVisualRaster) {
              addTableToPptSlide(pptSlide, s.table!, 0.8, 1.4, 10, dataVisualH);
            } else if (dataHasChart && !useVisualRaster) {
              addChartToPptSlide(pptSlide, s.chart!, 0.8, 1.4, 10, dataVisualH);
            }

            if (
              s.hero_metric?.value &&
              !isMetricRow &&
              !isMetricSplit &&
              !dataHasTable &&
              !dataHasChart
            ) {
              pptSlide.addText(String(s.hero_metric.value), {
                x: 0.8,
                y: 1.35,
                w: 10,
                h: 1.1,
                fontSize: 36,
                fontFace: bodyFont,
                color: accentHex,
                bold: true,
                align: "center",
                valign: "middle",
              });
              if (s.hero_metric.caption) {
                pptSlide.addText(s.hero_metric.caption, {
                  x: 1.2,
                  y: 2.55,
                  w: 9.6,
                  h: 0.55,
                  fontSize: 12,
                  fontFace: bodyFont,
                  color: textHex,
                  align: "center",
                });
              }
            }

            if (dataHasContent && !isMetricSplit) {
              addMarkdownBulletBlock(
                pptSlide,
                resolveSlideBulletItems(s),
                {
                  x: 0.8,
                  y: dataContentY,
                  w: 10,
                  h: 2.0,
                  valign: "top",
                },
                {
                  fontSize: 13,
                  fontFace: bodyFont,
                  color: textHex,
                  paraSpaceAfter: 5,
                }
              );
            }
          }
          break;

        case "quote":
          pptSlide.addText(`"${s.quote || s.title}"`, {
            x: 1.5,
            y: 2,
            w: 9,
            h: 2,
            fontSize: 28,
            fontFace: bodyFont,
            color: theme.text.replace("#", ""),
            italic: true,
            align: "center",
            valign: "middle",
          });
          if (s.author) {
            pptSlide.addText(`— ${s.author}`, {
              x: 1.5,
              y: 4.2,
              w: 9,
              h: 0.6,
              fontSize: 16,
              fontFace: bodyFont,
              color: theme.text.replace("#", ""),
              align: "center",
            });
          }
          break;

        case "end":
          pptSlide.addText(s.title, {
            x: 1,
            y: 2.5,
            w: 10,
            h: 1.5,
            fontSize: 40,
            fontFace: bodyFont,
            color: theme.text.replace("#", ""),
            bold: true,
            align: "center",
            valign: "middle",
          });
          break;

        case "toc":
          addTocLayoutToPptSlide(
            pptSlide,
            s,
            pptx,
            theme,
            bodyFont,
            headingFont
          );
          break;

        case "references": {
          // references 分页：每页最多 REFS_PER_PAGE 条，超出时生成多张幻灯片
          // 注意：pptSlide 已经是第一页，后续页通过 pptx.addSlide() 追加
          const refItems = s.content ?? [];
          const refsPerPage = REFS_PER_PAGE;
          const totalRefPages = Math.max(1, Math.ceil(refItems.length / refsPerPage));

          const renderRefPage = (
            slide: any,
            pageItems: string[],
            pageNum: number,
            totalPages: number
          ) => {
            const pageLabel = totalPages > 1 ? ` (${pageNum}/${totalPages})` : "";
            slide.addText(s.title + pageLabel, {
              x: 0.8,
              y: 0.4,
              w: 10,
              h: 0.7,
              fontSize: 22,
              fontFace: bodyFont,
              color: theme.accent.replace("#", ""),
              bold: true,
            });
            if (s.subtitle && pageNum === 1) {
              slide.addText(s.subtitle, {
                x: 0.8,
                y: 1.1,
                w: 10,
                h: 0.35,
                fontSize: 11,
                fontFace: bodyFont,
                color: theme.text.replace("#", ""),
                italic: true,
              });
            }
            const startY = s.subtitle && pageNum === 1 ? 1.5 : 1.2;
            slide.addText(
              pageItems.map((item) => ({
                text: item + "\n",
                options: {
                  fontSize: 10,
                  fontFace: bodyFont,
                  color: theme.text.replace("#", ""),
                  paraSpaceAfter: 3,
                },
              })) as any,
              { x: 0.8, y: startY, w: 10.5, h: 5.8 - startY, valign: "top" }
            );
            addBrandFooterToPptSlide(slide, s, props.pptData, bodyFont, theme.text);
          };

          // 第一页用已创建的 pptSlide
          renderRefPage(pptSlide, refItems.slice(0, refsPerPage), 1, totalRefPages);

          // 后续页追加新幻灯片
          for (let p = 1; p < totalRefPages; p++) {
            const extraSlide = pptx.addSlide();
            extraSlide.background = { color: theme.bg.replace("#", "") };
            renderRefPage(
              extraSlide,
              refItems.slice(p * refsPerPage, (p + 1) * refsPerPage),
              p + 1,
              totalRefPages
            );
            if (s.speaker_notes) extraSlide.addNotes(s.speaker_notes);
          }
          break;
        }
      }

      if (s.layout !== "references") {
        addBrandFooterToPptSlide(pptSlide, s, props.pptData, bodyFont, theme.text);
      }

      if (useVisualRaster) {
        const visualRasterOk = await addPptVisualRasterOverlays(
          pptSlide,
          slideWrapperRef.value,
          s
        );
        if (!visualRasterOk) {
          applyPptNativeVisualFallback(pptSlide, s);
        }
      }

      // 添加演讲者备注
      if (s.speaker_notes) {
        pptSlide.addNotes(s.speaker_notes);
      }
    }

    exportMessage.value = t("agent.pptExportDownloading");
    await pptx.writeFile({ fileName: `${props.pptData.title || "presentation"}.pptx` });
  } catch (err) {
    console.error("PPTX export failed:", err);
    ElMessage.error(t("agent.pptExportPptxFailed"));
  } finally {
    fallbackStyle?.remove();
    currentSlide.value = savedSlideIdx;
    exporting.value = false;
    exportMessage.value = "";
  }
}

// ── 截取指定幻灯片为 DataURL（供外部调用，用于项目缩略图） ──────────────────
async function captureSlideScreenshot(slideIndex: number = 0): Promise<string | null> {
  try {
    await preparePptExportFonts();
    const savedSlide = currentSlide.value;
    currentSlide.value = slideIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 300));

    if (!slideWrapperRef.value) return null;

    const fallbackStyle = injectPptExportStyles(pptBodyFontCss.value, pptHeadingFontCss.value);
    const canvas = await capturePptSlideToCanvas(slideWrapperRef.value, null);
    fallbackStyle.remove();
    currentSlide.value = savedSlide;

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("captureSlideScreenshot failed:", err);
    return null;
  }
}

defineExpose({
  captureSlideScreenshot,
});
</script>

<style lang="scss">
/* ═══════════════════════════════════════════════════════════════════════════
   PPT 渲染器样式（不使用 scoped，确保 Teleport 场景也能正常显示）
   ═══════════════════════════════════════════════════════════════════════════ */

.ppt-viewer-shell {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: stretch;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1d27;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

.ppt-viewer {
  flex: 1 1 0%;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  background: #1a1d27;
  display: flex;
  flex-direction: column;

  &:focus {
    outline: none;
  }

  &:fullscreen,
  &:-webkit-full-screen {
    z-index: 10001 !important;
    width: 100% !important;
    max-width: none !important;
    height: 100% !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    display: flex;
    flex-direction: column;
    background: #0a0c12;
    overflow: hidden;
    box-sizing: border-box;
  }

  /* CSS 演示模式（原生全屏失败或尚未进入时）：由父级 overlay-body 撑满，不用 fixed 以免脱离 flex 链 */
  &.ppt-viewer--presentation:not(:fullscreen):not(:-webkit-full-screen) {
    flex: 1 1 auto;
    min-height: 0;
    align-self: stretch;
    width: 100% !important;
    max-width: none !important;
    height: 100% !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    display: flex;
    flex-direction: column;
    background: #0a0c12;
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
  }

  &:fullscreen .ppt-toolbar,
  &:-webkit-full-screen .ppt-toolbar,
  &.ppt-viewer--presentation .ppt-toolbar {
    flex: 0 0 auto;
  }

  &:fullscreen .ppt-export-status,
  &:-webkit-full-screen .ppt-export-status,
  &.ppt-viewer--presentation .ppt-export-status {
    flex: 0 0 auto;
  }

  &:fullscreen .ppt-thumbs,
  &:-webkit-full-screen .ppt-thumbs,
  &.ppt-viewer--presentation .ppt-thumbs {
    flex: 0 0 auto;
  }

  &:fullscreen .ppt-stage,
  &:-webkit-full-screen .ppt-stage,
  &.ppt-viewer--presentation .ppt-stage {
    flex: 1 1 0%;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 12px 20px 16px;
    box-sizing: border-box;
  }

  &:fullscreen .ppt-slide-wrapper,
  &:-webkit-full-screen .ppt-slide-wrapper,
  &.ppt-viewer--presentation .ppt-slide-wrapper {
    box-sizing: border-box;
    aspect-ratio: 16 / 9;
    height: 100%;
    width: auto;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    flex: 0 0 auto;
    /* 全屏/演示：随 16:9 画布 cqi 等比放大（嵌入预览见 .ppt-slide-wrapper 默认 token） */
    --ppt-fs-display: clamp(24px, 5cqi, 88px);
    --ppt-fs-title: clamp(16px, 2.8cqi, 52px);
    --ppt-fs-heading: clamp(14px, 2.2cqi, 40px);
    --ppt-fs-body-lg: clamp(12px, 1.85cqi, 28px);
    --ppt-fs-body: clamp(10px, 1.55cqi, 24px);
    --ppt-fs-body-sm: clamp(9px, 1.35cqi, 20px);
    --ppt-fs-caption: clamp(8px, 1.15cqi, 18px);
    --ppt-fs-quote-mark: clamp(48px, 10cqi, 120px);
    --ppt-pad-y: clamp(24px, 3.5cqi, 56px);
    --ppt-pad-x: clamp(32px, 4.5cqi, 72px);
    --ppt-gap-sm: clamp(8px, 1.2cqi, 18px);
    --ppt-gap-md: clamp(12px, 1.8cqi, 28px);
    --ppt-gap-lg: clamp(18px, 2.5cqi, 36px);
    --ppt-icon-sm: clamp(18px, 2.4cqi, 36px);

    .ppt-hero-right-items {
      gap: clamp(10px, 2cqi, 28px);
    }

    .ppt-hero-right-card {
      padding: clamp(10px, 2cqi, 24px) clamp(12px, 2.4cqi, 32px);
    }

    .ppt-hero-right-card-index {
      font-size: clamp(13px, 2.4cqi, 28px);
    }

    .ppt-hero-right-card-title {
      font-size: clamp(14px, 2.6cqi, 30px);
    }

    .ppt-hero-right-card-desc {
      font-size: clamp(12px, 2.2cqi, 26px);
    }

    .ppt-data-source-line {
      font-size: clamp(10px, 1.6cqi, 22px);
    }

    .ppt-metric-chart-split .ppt-content-left {
      gap: clamp(10px, 1.8cqi, 28px);
    }

    .ppt-metric-card-value {
      font-size: clamp(22px, 4cqi, 56px);
    }

    .ppt-metric-card-label {
      font-size: clamp(11px, 1.8cqi, 24px);
    }

    .ppt-metric-card-detail {
      font-size: clamp(10px, 1.6cqi, 22px);
    }

    .ppt-topic-card {
      padding: clamp(12px, 1.8cqi, 28px) clamp(14px, 2cqi, 32px);
    }

    .ppt-topic-card-icon svg {
      width: clamp(14px, 1.8cqi, 28px);
      height: clamp(14px, 1.8cqi, 28px);
    }

    .ppt-content-chart-wrap {
      padding: clamp(12px, 1.8cqi, 28px) clamp(12px, 1.8cqi, 28px)
        clamp(10px, 1.4cqi, 22px);
    }

    .ppt-content-point {
      padding: clamp(8px, 1.2cqi, 18px) clamp(10px, 1.5cqi, 22px);
      border-radius: 0 clamp(6px, 0.8cqi, 12px) clamp(6px, 0.8cqi, 12px) 0;
    }

    .ppt-content-point-icon svg {
      width: clamp(14px, 1.8cqi, 28px);
      height: clamp(14px, 1.8cqi, 28px);
    }

    .ppt-content-point-body {
      padding-left: calc(var(--ppt-icon-sm) + var(--ppt-gap-sm));
    }

    .ppt-content-insight--page-callout {
      margin: 0 0 var(--ppt-gap-md);
      padding: clamp(10px, 1.5cqi, 22px) clamp(12px, 1.8cqi, 26px);
      font-size: var(--ppt-fs-body);
    }

    .ppt-slide-title {
      margin: 0 0 var(--ppt-gap-md);
      padding-left: clamp(10px, 1.2cqi, 18px);
    }

    .ppt-content-insight {
      padding: clamp(8px, 1.2cqi, 18px) clamp(10px, 1.5cqi, 22px);
      border-radius: clamp(6px, 0.8cqi, 12px);
    }

    .ppt-content-summary {
      padding: clamp(8px, 1.2cqi, 18px) clamp(12px, 1.8cqi, 28px);
    }

    .ppt-document-figure {
      min-height: 0;
      gap: var(--ppt-gap-sm);
      padding: clamp(12px, 1.8cqi, 28px);
    }

    .ppt-document-figure-img {
      max-height: 100%;
    }
  }

  &:fullscreen .ppt-slide.ppt-content,
  &:-webkit-full-screen .ppt-slide.ppt-content,
  &.ppt-viewer--presentation .ppt-slide.ppt-content {
    justify-content: flex-start !important;
    min-height: 0;
  }

  &:fullscreen .ppt-slide.ppt-section,
  &:-webkit-full-screen .ppt-slide.ppt-section,
  &.ppt-viewer--presentation .ppt-slide.ppt-section {
    justify-content: center !important;
  }

  &:fullscreen .ppt-content-split,
  &:-webkit-full-screen .ppt-content-split,
  &.ppt-viewer--presentation .ppt-content-split {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &:fullscreen .ppt-speaker-notes-pane,
  &:-webkit-full-screen .ppt-speaker-notes-pane,
  &.ppt-viewer--presentation .ppt-speaker-notes-pane {
    display: none;
  }
}

/* 工具栏 */
.ppt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ppt-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ppt-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #ddd;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.35);
  }
  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
}

.ppt-page-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 48px;
  text-align: center;
}

.ppt-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ppt-title-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppt-template-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: capitalize;
}

/* 分享 / 导出菜单 */
.ppt-share-wrap {
  position: relative;
}

.ppt-share-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(138, 92, 246, 0.45);
  background: rgba(138, 92, 246, 0.18);
  color: #e9e4ff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: rgba(138, 92, 246, 0.28);
    border-color: rgba(167, 139, 250, 0.55);
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.ppt-share-chevron {
  opacity: 0.75;
  transition: transform 0.15s;

  &--open {
    transform: rotate(180deg);
  }
}

.ppt-share-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 120;
  min-width: 280px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ppt-share-item {
  display: grid;
  grid-template-columns: 52px 1fr 28px;
  align-items: center;
  gap: 0;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: background 0.12s;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.ppt-share-item-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;

  svg {
    flex-shrink: 0;
  }
}

.ppt-share-item-brand--link {
  background: #f1f5f9;
  color: #64748b;
}

.ppt-share-item-brand--pdf {
  background: #fee2e2;
  color: #dc2626;
}

.ppt-share-item-brand--pptx {
  background: #ffedd5;
  color: #ea580c;
  font-size: 15px;
}

.ppt-share-item-brand--gslides {
  background: #fef9c3;
  color: #ca8a04;
}

.ppt-share-item-brand--png {
  background: #f3e8ff;
  color: #9333ea;
}

.ppt-share-item-brand--png-long {
  background: #ede9fe;
  color: #7c3aed;
}

.ppt-share-item-brand--linkedin {
  background: #dbeafe;
  color: #0a66c2;
  font-size: 13px;
}

.ppt-share-item-label {
  padding: 0 10px;
  line-height: 1.3;
}

.ppt-share-item-action {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding-right: 8px;
}

.ppt-fullscreen-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #ccc;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(138, 92, 246, 0.22);
    border-color: rgba(167, 139, 250, 0.45);
    color: #fff;
  }

  &.ppt-fullscreen-btn--active {
    background: rgba(138, 92, 246, 0.28);
    border-color: rgba(167, 139, 250, 0.55);
    color: #e9e4ff;
  }
}

/* 关闭按钮 */
/* ── 编辑模式按钮 ── */
/* ── 编辑模式样式（始终可编辑） ── */
.ppt-editing {
  [contenteditable="true"] {
    outline: none;
    border-radius: 3px;
    transition: box-shadow 0.15s;
    min-height: 1em;
    cursor: text;

    &:hover {
      box-shadow: 0 0 0 1.5px rgba(74, 144, 226, 0.35);
    }

    &:focus {
      box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.6);
      background: rgba(74, 144, 226, 0.08);
    }
  }

  /* 编辑状态下 TOC 原始文本显示 */
  .ppt-editable-full {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: var(--ppt-fs-body-lg);
    line-height: 1.5;
  }
}

.ppt-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #999;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 80, 80, 0.2);
    border-color: rgba(255, 80, 80, 0.4);
    color: #ff6b6b;
  }
}

/* 导出状态提示 */
.ppt-export-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(74, 144, 226, 0.12);
  border-bottom: 1px solid rgba(74, 144, 226, 0.15);
  font-size: 12px;
  color: #7cb8ff;
}

.ppt-spinner {
  animation: pptSpin 1s linear infinite;
}

@keyframes pptSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 舞台：16:9 幻灯片画布 + 画布外备注区 */
.ppt-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 幻灯片容器（仅正文画布，不含 speaker_notes） */
.ppt-slide-wrapper {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  container-type: inline-size;
  container-name: ppt-slide;
  font-family: var(--ppt-font-body, var(--ppt-font-family, inherit));
  /* 嵌入预览：与 edb5708c 之前 vw 上限一致；全屏 token 见 .ppt-viewer:fullscreen .ppt-slide-wrapper */
  --ppt-fs-display: clamp(24px, 3.5vw, 44px);
  --ppt-fs-title: clamp(16px, 2.2vw, 26px);
  --ppt-fs-heading: clamp(16px, 2.2vw, 26px);
  --ppt-fs-body-lg: clamp(12px, 1.3vw, 15px);
  --ppt-fs-body: clamp(10px, 1.05vw, 12px);
  --ppt-fs-body-sm: clamp(10px, 1.05vw, 13px);
  --ppt-fs-caption: clamp(9px, 0.9vw, 11px);
  --ppt-fs-quote-mark: clamp(60px, 8vw, 100px);
  --ppt-pad-y: 36px;
  --ppt-pad-x: 48px;
  --ppt-gap-sm: 10px;
  --ppt-gap-md: 12px;
  --ppt-gap-lg: 24px;
  --ppt-icon-sm: 22px;
  --ppt-image-strip-height: 96px;
  --ppt-image-sidebar-height: 120px;
  --ppt-image-card-max-width: 220px;
  --ppt-image-sidebar-max-width: 220px;
  --ppt-image-sidebar-min-width: 140px;
  --ppt-image-page-min-height: 160px;
  --ppt-image-page-max-height: 360px;
  --ppt-document-figure-min-height: 288px;
  --ppt-document-figure-max-height: 420px;
  --ppt-chart-grid: rgba(255, 255, 255, 0.12);
  --ppt-chart-zero-line: rgba(255, 255, 255, 0.28);
  --ppt-chart-label-fill: rgba(255, 255, 255, 0.58);
  --ppt-chart-value: rgba(232, 240, 254, 0.88);

  &.ppt-palette-light {
    --ppt-chart-grid: rgba(0, 0, 0, 0.1);
    --ppt-chart-zero-line: rgba(0, 0, 0, 0.22);
    --ppt-chart-label-fill: rgba(30, 45, 70, 0.72);
    --ppt-chart-value: rgba(30, 45, 70, 0.9);

    .ppt-content-chart-wrap,
    .ppt-topic-card {
      border-color: rgba(0, 0, 0, 0.1);
    }

    .ppt-content-summary {
      border-top-color: rgba(0, 0, 0, 0.1);
    }
  }

  &.ppt-theme-blue {
    --ppt-accent: #4a90e2;
    --ppt-bg: #0d1b2e;
    --ppt-text: #e8f0fe;
  }
  &.ppt-theme-dark {
    --ppt-accent: #7c5cfc;
    --ppt-bg: #12111a;
    --ppt-text: #e0dff8;
  }
  &.ppt-theme-green {
    --ppt-accent: #34c78a;
    --ppt-bg: #0d1f18;
    --ppt-text: #d4f5e5;
  }
  &.ppt-theme-red {
    --ppt-accent: #e25c5c;
    --ppt-bg: #1f0d0d;
    --ppt-text: #fde8e8;
  }
  &.ppt-theme-gold {
    --ppt-accent: #e2b34a;
    --ppt-bg: #1f1a0d;
    --ppt-text: #fdf3d4;
  }
}

/* 通用幻灯片基础 */
.ppt-slide {
  width: 100%;
  height: 100%;
  background-color: var(--ppt-bg, #0d1b2e);
  color: var(--ppt-text, #e8f0fe);
  padding: var(--ppt-pad-y) var(--ppt-pad-x);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  /* 背景图铺满：确保 image_url 总能覆盖整个幻灯片 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 背景图蒙层 —— 当 slide.image_url 存在时覆盖在背景图上方、内容下方 */
.ppt-slide-bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 0;
  pointer-events: none;
}

/* 当 slide 使用了背景图时，确保普通流子元素位于蒙层之上。
   排除本身已 absolute 定位的元素（skyline / info / bottom-line / corner / footer 等） */
.ppt-slide
  > *:not(.ppt-slide-bg-overlay):not(.ppt-cover-skyline):not(.ppt-scenic-skyline):not(.ppt-cover-info):not(.ppt-cover-bottom-line):not(.ppt-section-corner):not(.ppt-section-footer):not(.ppt-brand-footer) {
  position: relative;
  z-index: 1;
}

/* 通用标题 */
.ppt-slide-title {
  font-family: var(--ppt-font-heading, var(--ppt-font-family, inherit));
  letter-spacing: var(--ppt-heading-letter-spacing, normal);
  font-size: var(--ppt-fs-title);
  font-weight: 700;
  margin: 0 0 20px;
  color: var(--ppt-accent, #4a90e2);
  border-left: 4px solid var(--ppt-accent, #4a90e2);
  padding-left: 14px;
  line-height: 1.3;
}

/* 要点列表 */
.ppt-bullet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ppt-gap-sm);
}

.ppt-bullet-item {
  display: flex;
  align-items: flex-start;
  gap: var(--ppt-gap-sm);
  font-size: var(--ppt-fs-body-lg);
  line-height: 1.55;
  opacity: 0.92;
}

.ppt-bullet-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ppt-accent, #4a90e2);
  margin-top: 6px;
}

/* ── 子主题卡片网格（content 页面） ── */
.ppt-content {
  justify-content: flex-start !important;

  .ppt-content-summary {
    flex-shrink: 0;
  }
}

.ppt-slide--metric-only {
  .ppt-slide-title {
    margin-bottom: clamp(8px, 1.2cqi, 14px);
  }

  .ppt-chart-subtitle {
    flex-shrink: 0;
    margin-bottom: clamp(6px, 1cqi, 10px);
  }
}

.ppt-metric-cards-fullpage--active {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
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

/* ── right_items 叙事卡（content 分栏 / two_column） ── */
.ppt-hero-right-items {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2cqi, 16px);
}

.ppt-hero-right-card {
  border-left: 3px solid var(--ppt-item-accent, var(--ppt-hero-gold, #d4af37));
  padding: clamp(10px, 2cqi, 16px) clamp(12px, 2.4cqi, 18px);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.04));
  border-radius: 0 var(--ppt-radius-card, 8px) var(--ppt-radius-card, 8px) 0;
}

.ppt-hero-right-card-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.ppt-hero-right-card-index {
  flex-shrink: 0;
  font-size: clamp(13px, 2.4cqi, 17px);
  font-weight: 800;
  color: var(--ppt-item-accent, var(--ppt-hero-gold, #d4af37));
  letter-spacing: 0.04em;
}

.ppt-hero-right-card-title {
  font-size: clamp(14px, 2.6cqi, 18px);
  font-weight: 700;
  line-height: 1.35;
  color: var(--ppt-text, #e8f0fe);
}

.ppt-hero-right-card-desc {
  font-size: clamp(12px, 2.2cqi, 15px);
  line-height: 1.55;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.68));
  word-break: break-word;
}

.ppt-hero-right-card--after-metrics {
  margin-top: clamp(6px, 1.2cqi, 10px);
}

.ppt-data-source-line {
  flex-shrink: 0;
  font-size: clamp(10px, 1.6cqi, 12px);
  line-height: 1.45;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.5));
  opacity: 0.85;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.ppt-metric-chart-split .ppt-content-left {
  flex: 0 0 38%;
  gap: clamp(10px, 1.8cqi, 14px);
}

.ppt-metric-card--column {
  flex: 0 0 auto;
  border-top: none;
  border-left: 3px solid var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
}

.ppt-content-point {
  border-left-color: var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
}

.ppt-content-point-icon {
  color: var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
}

.ppt-metric-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: clamp(10px, 2cqi, 16px);
  margin: 0 0 clamp(12px, 2cqi, 18px);
  flex-wrap: wrap;
}

.ppt-metric-card {
  flex: 1 1 0;
  min-width: min(100%, 140px);
  max-width: 100%;
  padding: clamp(10px, 1.8cqi, 14px) clamp(12px, 2cqi, 16px);
  border-radius: var(--ppt-radius-card, 8px);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.06));
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid var(--ppt-metric-accent, var(--ppt-accent, #4a90e2));
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

.ppt-hero-left-split .ppt-hero-left-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38%;
}

.ppt-hero-left-split .ppt-content-right {
  flex: 1 1 0;
  min-height: 0;
}

.ppt-hero-left-split .ppt-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
}

.ppt-metric-content-split .ppt-metric-cards-side {
  flex: 0 0 38%;
  min-width: 0;
}

.ppt-body-inline-metric {
  margin-bottom: clamp(10px, 2cqi, 16px);
}

.ppt-palette-light {
  .ppt-hero-right-card {
    background: rgba(0, 0, 0, 0.03);
  }
  .ppt-data-source-line {
    border-top-color: rgba(0, 0, 0, 0.08);
  }
}

.ppt-topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ppt-gap-md);
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  align-content: start;
}

.ppt-topic-grid--fill {
  align-content: stretch;
  align-items: stretch;
  overflow-y: hidden;

  .ppt-topic-card {
    height: 100%;
    min-height: 0;
  }

  .ppt-topic-card-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
}

.ppt-topic-card {
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--ppt-radius-card, 10px);
  padding: clamp(12px, 2cqi, 22px) clamp(14px, 2.2cqi, 24px);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.03));
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1cqi, 12px);
  min-height: 0;
  overflow: visible;
}

.ppt-topic-grid--stack {
  grid-template-columns: 1fr;
}

.ppt-topic-card-header {
  display: flex;
  align-items: center;
  gap: var(--ppt-gap-sm);
}

.ppt-topic-card-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ppt-accent, #4a90e2);
}

.ppt-topic-card-title {
  font-size: clamp(14px, 2.2cqi, 22px);
  font-weight: 700;
  color: var(--ppt-text, #e8f0fe);
  line-height: 1.35;
}

.ppt-topic-card-body {
  font-size: clamp(13px, 1.85cqi, 18px);
  line-height: 1.6;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.88));
  opacity: 1;
  flex: 1;
  min-height: 0;
  word-break: break-word;
  white-space: normal;
}

/* 图表卡片 */
.ppt-topic-chart-card {
  padding: 12px 14px;
  overflow: hidden;

  .ppt-content-chart {
    margin-top: 0 !important;
  }

  .ppt-chart-svg {
    max-height: none;
    height: auto;
  }
}

/* ── content 页左右分栏布局（有图表时） ── */
.ppt-content-split {
  display: flex;
  gap: var(--ppt-gap-lg);
  flex: 1;
  min-height: 0;
  overflow: hidden;

  .ppt-content-right {
    overflow: visible;
  }
}

.ppt-content-split--table-chart-dual {
  .ppt-content-right {
    flex: 1;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(12px, 2cqi, 18px);
    align-items: stretch;
    min-height: 0;
  }

  .ppt-content-chart-wrap,
  .ppt-table-wrap {
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
}

.ppt-content-split--table-chart-with-bullets {
  .ppt-content-right {
    gap: clamp(10px, 1.8cqi, 14px);
  }

  .ppt-content-chart-wrap {
    flex: 0 1 46%;
    min-height: 160px;
  }

  .ppt-table-wrap {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.ppt-content-left {
  flex: 0 0 45%;
  display: flex;
  flex-direction: column;
  gap: var(--ppt-gap-md);
  min-height: 0;
  overflow-x: visible;
  overflow-y: auto;
  padding-left: 6px;
  padding-right: 8px;
}

.ppt-content-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ppt-content-chart-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.03));
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--ppt-radius-card, 10px);
  padding: 16px 16px 12px;
  min-height: 0;
  overflow: visible;

  .ppt-chart-title {
    flex: 0 0 auto;
    font-size: var(--ppt-fs-body-lg);
    margin-bottom: var(--ppt-gap-sm);
  }

  .ppt-line-chart-wrap {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .ppt-line-legend {
    flex: 0 0 auto;
  }

  .ppt-chart-svg {
    flex: 1 1 auto;
    width: 100%;
    min-height: 180px;
    max-height: none;
    height: auto;
    overflow: visible;
  }

  .ppt-pie-svg {
    max-height: none;
    min-height: 140px;
  }

  .ppt-radar-svg {
    max-height: none;
    min-height: 140px;
  }

  .ppt-grouped-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ppt-funnel-chart {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .ppt-timeline-chart {
    flex: 1;
    min-height: 0;
  }
}

/* 左栏内容要点 */
.ppt-content-point {
  flex-shrink: 0;
  padding: 10px 14px;
  border-left: 3px solid var(--ppt-accent, #4a90e2);
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.03));
  border-radius: 0 8px 8px 0;
}

.ppt-content-point-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ppt-content-point-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ppt-accent, #4a90e2);
}

.ppt-content-point-title {
  font-size: var(--ppt-fs-body-lg);
  font-weight: 700;
  color: var(--ppt-text, #e8f0fe);
  line-height: 1.3;
}

.ppt-content-point-body {
  font-size: var(--ppt-fs-body);
  line-height: 1.6;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.75));
  padding-left: 30px;
}

/* 行内 Markdown（**粗体** 等） */
.ppt-md-inline {
  :deep(strong),
  strong {
    font-weight: 700;
    color: inherit;
  }
  :deep(em),
  em {
    font-style: italic;
  }
  :deep(code),
  code {
    font-size: 0.92em;
    padding: 0 0.12em 0.2em;
    border-radius: 3px;
    background: rgba(128, 128, 128, 0.15);
  }
}

.ppt-content-point-title.ppt-md-inline,
.ppt-content-summary-body.ppt-md-inline,
.ppt-summary-label .ppt-md-inline {
  display: inline;
}

.ppt-cover-title .ppt-md-inline,
.ppt-slide-title .ppt-md-inline,
.ppt-section-title .ppt-md-inline,
.ppt-section-sub .ppt-md-inline,
.ppt-toc-title .ppt-md-inline,
.ppt-end-title .ppt-md-inline {
  display: block;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 关键洞察 */
.ppt-content-items-split .ppt-content-right {
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.ppt-content-insight--page-callout {
  flex-shrink: 0;
}

.ppt-hero-metric {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 clamp(12px, 2cqi, 16px);
  padding: 14px 18px;
  border-left: 4px solid var(--ppt-hero-accent, var(--ppt-accent, #4a90e2));
  border-radius: var(--ppt-radius-card, 10px);
  background: color-mix(
    in srgb,
    var(--ppt-hero-accent, var(--ppt-accent, #4a90e2)) 10%,
    transparent
  );
}

.ppt-hero-metric-value {
  font-size: clamp(28px, 4cqi, 42px);
  font-weight: 800;
  line-height: 1.1;
  color: var(--ppt-hero-accent, var(--ppt-accent, #4a90e2));
}

.ppt-hero-metric-caption {
  font-size: var(--ppt-fs-body-sm, 13px);
  line-height: 1.5;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.78));
}

.ppt-data-hero-metric {
  margin-bottom: clamp(10px, 1.6cqi, 14px);
}

/* 标题下全宽洞察条：比正文卡片更醒目 */
.ppt-content-insight--page-callout {
  width: 100%;
  margin: 0 0 clamp(12px, 2cqi, 18px);
  padding: clamp(12px, 1.8cqi, 16px) clamp(14px, 2.2cqi, 20px);
  font-size: clamp(12px, 1.35vw, 16px);
  font-weight: 600;
  line-height: 1.55;
  color: var(--ppt-text, #e8f0fe);
  border: 1px solid rgba(74, 144, 226, 0.35);
  border-left: 5px solid var(--ppt-accent, #4a90e2);
  border-radius: var(--ppt-radius-card, 10px);
  background: rgba(74, 144, 226, 0.16);
  box-sizing: border-box;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: var(--ppt-accent, #4a90e2);
  }

  .ppt-content-insight-text {
    flex: 1;
    min-width: 0;
    color: inherit;
  }
}

.ppt-palette-light .ppt-content-insight--page-callout {
  color: var(--ppt-text, #1e2d46);
  background: rgba(74, 144, 226, 0.1);
  border-color: rgba(74, 144, 226, 0.28);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.ppt-chart-note {
  font-size: var(--ppt-fs-body-sm);
  line-height: 1.45;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.72));
  margin: calc(-1 * var(--ppt-gap-sm) / 2) 0 var(--ppt-gap-sm);
  padding: 0 2px;
}

/* 画布外演讲备注（独立浅色区域，不继承幻灯片背景色） */
.ppt-speaker-notes-pane {
  flex: 0 0 auto;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 18px 14px;
  max-height: min(168px, 30vh);
  overflow-y: auto;
  background: #f6f7f9;
  border-top: 1px solid #e2e4e8;
  color: #374151;
  font-size: 12px;
  line-height: 1.65;

  .ppt-speaker-notes-label {
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 6px;
    opacity: 1;
  }

  .ppt-speaker-notes-content {
    color: #374151;
    opacity: 1;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.ppt-slide.ppt-content {
  justify-content: flex-start;
}

.ppt-content-footer-source {
  flex-shrink: 0;
  margin-top: auto;
}

.ppt-content-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  margin-top: auto;
  background: rgba(74, 144, 226, 0.08);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: 8px;
  font-size: var(--ppt-fs-body-sm);
  line-height: 1.5;
  color: var(--ppt-accent, #4a90e2);

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

/* 底部总结栏 */
.ppt-content-summary {
  margin-top: auto;
  padding: 10px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: var(--ppt-fs-body-sm);
  line-height: 1.6;
  opacity: 0.82;
  color: var(--ppt-text, #e8f0fe);
}

.ppt-summary-label {
  color: var(--ppt-accent, #4a90e2);
  font-weight: 700;
}

/* 来源 */
.ppt-sources {
  margin-top: 16px;
  font-size: 11px;
  opacity: 0.55;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.ppt-sources-label {
  font-weight: 600;
}

.ppt-source-link {
  color: var(--ppt-accent, #4a90e2);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

/* speaker_notes 内容参考 */
.ppt-speaker-notes {
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.72));
  overflow-y: auto;
}

.ppt-speaker-notes-label {
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.7;
  font-size: 10px;
}

.ppt-speaker-notes-content {
  opacity: 0.65;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── cover ── */
.ppt-cover {
  background-image: linear-gradient(
    180deg,
    var(--ppt-bg, #0d1b2e) 0%,
    color-mix(in srgb, var(--ppt-accent, #4a90e2) 8%, var(--ppt-bg, #0d1b2e)) 100%
  );
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 城市天际线 SVG 背景 */
.ppt-cover-skyline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 65%;
  color: var(--ppt-accent, #4a90e2);
  pointer-events: none;
  z-index: 0;

  :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.ppt-cover-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48px;
  margin-top: -5%;
}

.ppt-cover-title {
  font-family: var(--ppt-font-heading, var(--ppt-font-family, inherit));
  letter-spacing: var(--ppt-heading-letter-spacing, normal);
  font-size: var(--ppt-fs-display);
  font-weight: 800;
  margin: 0 0 16px;
  line-height: 1.25;
  color: var(--ppt-accent, #4a90e2);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.4);
}

.ppt-cover-subtitle {
  font-size: var(--ppt-fs-body-lg);
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.7));
  opacity: 1;
  margin: 0;
  letter-spacing: 2px;
}

/* 底部信息卡片 */
.ppt-cover-info {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.ppt-cover-info-inner {
  background: rgba(255, 255, 255, 0.06);
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.12);
  border-radius: var(--ppt-radius-card, 8px);
  padding: 12px 36px;
  backdrop-filter: blur(8px);
  text-align: center;
}

.ppt-cover-author {
  font-size: 13px;
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.75));
  font-weight: 500;
  margin-bottom: 4px;
}

.ppt-cover-date {
  font-size: 12px;
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.5));
}

/* 底部装饰线 */
.ppt-cover-bottom-line {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 3px;
  border-radius: 2px;
  background: var(--ppt-accent, #4a90e2);
  opacity: 0.6;
  z-index: 2;
}

/* ── section ── */
.ppt-section {
  background-image: linear-gradient(
    120deg,
    color-mix(in srgb, var(--ppt-accent, #4a90e2) 18%, var(--ppt-bg, #0d1b2e)) 0%,
    var(--ppt-bg, #0d1b2e) 100%
  );
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0;
  position: relative;
  overflow: hidden;
}

/* 章节页 / 配图页：与封面共用的底部意境装饰 */
.ppt-scenic-skyline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 65%;
  color: var(--ppt-accent, #4a90e2);
  pointer-events: none;
  z-index: 0;

  :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.ppt-section-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(88%, 960px);
  padding: 0 12px;
  margin-top: -4%;
}

.ppt-section-label,
.ppt-section-title,
.ppt-section-divider,
.ppt-section-sub {
  position: relative;
  z-index: 1;
}

/* 四角装饰 */
.ppt-section-corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: var(--ppt-accent, #4a90e2);
  border-style: solid;
  border-width: 0;
  opacity: 0.5;
  z-index: 2;

  &--tl {
    top: 24px;
    left: 28px;
    border-top-width: 2.5px;
    border-left-width: 2.5px;
  }
  &--tr {
    top: 24px;
    right: 28px;
    border-top-width: 2.5px;
    border-right-width: 2.5px;
  }
  &--bl {
    bottom: 24px;
    left: 28px;
    border-bottom-width: 2.5px;
    border-left-width: 2.5px;
  }
  &--br {
    bottom: 24px;
    right: 28px;
    border-bottom-width: 2.5px;
    border-right-width: 2.5px;
  }
}

/* CHAPTER 01 标签 */
.ppt-section-label {
  font-size: var(--ppt-fs-body-lg);
  font-weight: 600;
  color: var(--ppt-accent, #4a90e2);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.ppt-section-title {
  font-family: var(--ppt-font-heading, var(--ppt-font-family, inherit));
  letter-spacing: var(--ppt-heading-letter-spacing, normal);
  font-size: var(--ppt-fs-display);
  font-weight: 800;
  margin: 0;
  line-height: 1.3;
  width: 100%;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.35);
}

/* 标题下方短横线 */
.ppt-section-divider {
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: var(--ppt-accent, #4a90e2);
  margin: 18px 0;
}

.ppt-section-sub {
  font-size: var(--ppt-fs-body-lg);
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.6));
  opacity: 1;
  margin: 0;
  width: 100%;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

.ppt-section-chapter-images {
  position: relative;
  z-index: 1;
  width: min(92%, 720px);
  margin: 10px 0 6px;
}

.ppt-content-with-side-image {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 16px;
  flex: 1;
  min-height: 0;
  width: 100%;

  .ppt-topic-grid {
    flex: 1;
    min-width: 0;
  }
}

.ppt-data-metric-with-image {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  width: 100%;

  .ppt-metric-cards-row {
    flex: 1;
    min-width: 0;
  }
}

/* 页底品牌标识（brand_footer） */
.ppt-brand-footer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--ppt-fs-caption);
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.3));
  letter-spacing: 3px;
  text-transform: uppercase;
  white-space: nowrap;
  z-index: 2;
  pointer-events: none;
}

/* 底部报告标题（旧版，保留兼容） */
.ppt-section-footer {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--ppt-fs-caption);
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.3));
  letter-spacing: 3px;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── two_column ── */
.ppt-chapter-image-page {
  background-image: linear-gradient(
    180deg,
    var(--ppt-bg, #0d1b2e) 0%,
    color-mix(in srgb, var(--ppt-accent, #4a90e2) 8%, var(--ppt-bg, #0d1b2e)) 100%
  );
  overflow: hidden;
}

.ppt-chapter-image-page-sub {
  margin-top: -4px;
  margin-bottom: 8px;
}

.ppt-chapter-image-page-body {
  flex: 1;
  min-height: 0;
}

.ppt-chapter-image-page-col {
  min-width: 0;
}

.ppt-chapter-image-page-insight {
  margin-top: 10px;
  flex-shrink: 0;
}

.ppt-document-figure-page {
  background: var(--ppt-bg, #0d1b2e);
}

.ppt-document-figure-page-body {
  flex: 1;
  min-height: 0;
  gap: 0;
}

.ppt-document-figure-col {
  min-width: 0;
}

.ppt-document-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: min(40vh, var(--ppt-document-figure-min-height, 288px));
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.04));
  border-radius: var(--ppt-radius-card, 8px);
  padding: 12px;
}

.ppt-document-figure-img {
  max-width: 100%;
  max-height: min(55vh, var(--ppt-document-figure-max-height, 420px));
  width: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.ppt-document-figure-caption {
  margin: 0;
  font-size: var(--ppt-fs-caption, 12px);
  line-height: 1.45;
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.72));
  text-align: center;
}

.ppt-two-col-body {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
}

.ppt-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.ppt-col-header {
  font-size: var(--ppt-fs-body-lg);
  font-weight: 700;
  color: var(--ppt-accent, #4a90e2);
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ppt-col-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 20px;
  flex-shrink: 0;
}

/* ── right_items 结构化卡片 ── */
.ppt-right-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.ppt-right-item-card {
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.04));
  border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid var(--ppt-item-accent, var(--ppt-accent, #4a90e2));
  border-radius: var(--ppt-radius-card, 8px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ppt-right-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ppt-right-item-index {
  flex-shrink: 0;
  font-size: var(--ppt-fs-body-lg);
  font-weight: 800;
  color: var(--ppt-item-accent, var(--ppt-hero-gold, #d4af37));
  letter-spacing: 0.04em;
}

.ppt-right-item-icon {
  flex-shrink: 0;
  width: var(--ppt-icon-sm);
  height: var(--ppt-icon-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ppt-accent, #4a90e2);
}

.ppt-right-item-title {
  font-size: var(--ppt-fs-body-lg);
  font-weight: 700;
  color: var(--ppt-text, #e8f0fe);
}

.ppt-right-item-desc {
  font-size: var(--ppt-fs-body-sm);
  line-height: 1.6;
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.65));
}

/* ── 分组柱状图 grouped bar ── */
.ppt-grouped-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ppt-grouped-bar-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  opacity: 0.8;
  flex-wrap: wrap;
  padding: 0 4px;
}

.ppt-grouped-bar-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ppt-text, #e8f0fe);
}

/* ── data ── */
.ppt-chart-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.ppt-chart-area-full {
  .ppt-chart-svg {
    max-height: none;
    flex: 1;
    min-height: 200px;
  }

  .ppt-timeline-chart {
    flex: 1;
    min-height: 200px;
  }

  &.ppt-chart-contained {
    flex: 0 1 auto;
    align-self: center;
    width: 100%;
    max-width: 70%;
    padding: clamp(10px, 4cqi, 24px) clamp(12px, 5cqi, 32px);
    margin-inline: auto;

    .ppt-chart-svg {
      flex: 0 1 auto;
      min-height: 120px;
      max-height: min(46cqi, 42vh);
    }

    .ppt-timeline-chart {
      flex: 0 1 auto;
      max-height: min(46cqi, 42vh);
    }
  }
}

.ppt-table-area-full {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .ppt-table-wrap {
    flex: 1;
    min-height: 180px;
  }
}

.ppt-two-col-table {
  .ppt-table-wrap {
    max-height: 42cqi;
  }
}

.ppt-chart-title {
  font-size: var(--ppt-fs-body-sm);
  color: var(--ppt-text, #e8f0fe);
  opacity: 0.85;
}

.ppt-chart-svg {
  width: 100%;
  flex-shrink: 0;
}

/* 非分栏页内图表限制高度；content 分栏图表由 wrap 控制 */
.ppt-chart-area .ppt-chart-svg,
.ppt-data-chart .ppt-chart-svg {
  max-height: 160px;
}

.ppt-grouped-bar-wrap .ppt-bar-rect {
  /* 系列色由 groupedBarRectStyle inline style 提供 */
  fill: unset;
  opacity: unset;
}

.ppt-bar-rect {
  fill: var(--ppt-accent, #4a90e2);
  opacity: 0.85;
}

.ppt-bar-rect.ppt-bar-total {
  fill: var(--ppt-accent, #4a90e2);
  opacity: 0.95;
}

.ppt-bar-rect.ppt-bar-negative {
  fill: #e74c3c;
  opacity: 0.85;
}

.ppt-line-dot {
  fill: var(--ppt-accent, #4a90e2);
}

.ppt-polyline {
  stroke: var(--ppt-accent, #4a90e2);
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.ppt-chart-label {
  font-size: var(--ppt-fs-caption);
  fill: var(--ppt-chart-label-fill, rgba(255, 255, 255, 0.82));
  font-family: var(--ppt-font-family, inherit);
  font-weight: 500;
}

/* ── pie chart SVG ── */
.ppt-pie-svg {
  max-height: 200px;
  overflow: visible;
}
.ppt-pie-label {
  font-size: 9px;
  fill: var(--ppt-text, var(--ppt-chart-value, rgba(232, 240, 254, 0.88)));
  font-weight: 600;
}
.ppt-pie-legend-text {
  font-size: 9px;
  fill: var(--ppt-text, var(--ppt-chart-label-fill, rgba(255, 255, 255, 0.82)));
  dominant-baseline: middle;
}
.ppt-pie-leader {
  stroke: var(--ppt-chart-grid, rgba(255, 255, 255, 0.35));
  stroke-width: 1;
}

.ppt-pie-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 0;
}

.ppt-pie-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.ppt-pie-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ppt-data-notes {
  margin-top: 10px;
}

.ppt-chart-subtitle {
  font-size: var(--ppt-fs-body-sm);
  opacity: 0.55;
  margin: -12px 0 8px 18px;
}

/* ── combo / multi-line extras ── */
.ppt-line-secondary {
  stroke: #f5a623;
  stroke-width: 2;
}
.ppt-line-tertiary {
  stroke: #50e3c2;
  stroke-width: 2;
  stroke-dasharray: 4 2;
}
.ppt-dot-secondary {
  fill: #f5a623;
}
.ppt-fill-secondary {
  fill: #f5a623;
}
.ppt-fill-tertiary {
  fill: #50e3c2;
}
.ppt-chart-legend-text {
  font-size: 10px;
  fill: var(--ppt-chart-label-fill, rgba(255, 255, 255, 0.82));
}

/* ── axis labels ── */
.ppt-axis-label {
  font-size: var(--ppt-fs-caption);
  fill: var(--ppt-chart-label-fill, rgba(255, 255, 255, 0.82));
  font-family: var(--ppt-font-family, inherit);
  font-weight: 500;
}
.ppt-axis-label-secondary {
  fill: var(--ppt-accent, #4a90e2);
  opacity: 0.9;
}
.ppt-axis-zero-line {
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  stroke-dasharray: 4 3;
}
.ppt-axis-labels-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.ppt-axis-label-text {
  font-size: var(--ppt-fs-body-sm);
  color: rgba(255, 255, 255, 0.75);
  font-style: italic;
}

/* ── area chart ── */
.ppt-area-fill {
  fill: var(--ppt-accent, #4a90e2);
  opacity: 0.18;
}

/* ── horizontal bar ── */
.ppt-chart-svg-hbar {
  max-height: 200px;
}
.ppt-bar-negative {
  fill: #e25c5c;
  opacity: 0.85;
}
.ppt-chart-value-label {
  font-size: 11px;
  fill: var(--ppt-text, var(--ppt-chart-value, rgba(232, 240, 254, 0.88)));
  font-weight: 600;
}

/* ── timeline chart（事件时间线） ── */
.ppt-timeline-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 140px;
  max-height: min(340px, 46vh);
  overflow-x: hidden;
  overflow-y: auto;
  text-align: left;
  color: var(--ppt-text, #e8f0fe);
  -webkit-overflow-scrolling: touch;
}
.ppt-timeline-chart--compact {
  max-height: min(280px, 40vh);
  min-height: 120px;
}
.ppt-timeline-chart--full {
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  min-height: 200px;
  max-height: min(420px, 55vh);
}
.ppt-timeline-axis-hint {
  font-size: var(--ppt-fs-body-sm);
  color: rgba(232, 240, 254, 0.55);
  margin-bottom: 10px;
  line-height: 1.35;
}
.ppt-timeline-item {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.ppt-timeline-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}
.ppt-timeline-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  box-sizing: border-box;
}
.ppt-timeline-line {
  flex: 1;
  width: 2px;
  min-height: 10px;
  background: rgba(255, 255, 255, 0.2);
  margin: 2px 0 0;
  border-radius: 1px;
}
.ppt-timeline-body {
  flex: 1;
  padding-bottom: 14px;
  min-width: 0;
}
.ppt-timeline-step {
  font-size: 10px;
  font-weight: 600;
  color: rgba(232, 240, 254, 0.45);
  margin-bottom: 2px;
}
.ppt-timeline-date {
  font-size: var(--ppt-fs-body);
  font-weight: 600;
  color: rgba(232, 240, 254, 0.95);
  margin-bottom: 4px;
  line-height: 1.3;
  word-break: break-word;
}
.ppt-timeline-desc {
  font-size: var(--ppt-fs-body-sm);
  line-height: 1.45;
  color: rgba(232, 240, 254, 0.78);
  word-break: break-word;
}

/* ── funnel chart ── */
.ppt-funnel-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  justify-content: center;
}
.ppt-funnel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ppt-funnel-label {
  font-size: var(--ppt-fs-body-lg);
  line-height: 1.35;
  min-width: 84px;
  text-align: right;
  color: var(--ppt-text, #e8f0fe);
  opacity: 0.92;
  flex-shrink: 0;
}
.ppt-funnel-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
}
.ppt-funnel-bar {
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  min-width: 36px;
  transition: width 0.3s;
}
.ppt-funnel-value {
  font-size: 14px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

/* ── stacked bar ── */
.ppt-stacked-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.ppt-stacked-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  opacity: 0.8;
}
.ppt-stacked-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ppt-stacked-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ppt-stacked-label {
  font-size: 12px;
  min-width: 50px;
  text-align: right;
  opacity: 0.75;
}
.ppt-stacked-bar-track {
  flex: 1;
  display: flex;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.ppt-stacked-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s;
  min-width: 0;
}
.ppt-stacked-seg-text {
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

/* ── radar (svg spider chart) ── */
.ppt-radar-chart-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
}
.ppt-radar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 4px;
}
.ppt-radar-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--ppt-text-secondary, rgba(232, 240, 254, 0.68));
  opacity: 0.95;
}
.ppt-radar-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ppt-radar-svg {
  max-height: 220px;
  overflow: visible;
}
.ppt-radar-grid {
  fill: color-mix(in srgb, var(--ppt-text, #e8f0fe) 4%, transparent);
  stroke: var(--ppt-chart-grid, rgba(255, 255, 255, 0.22));
  stroke-width: 1;
}
.ppt-radar-axis {
  stroke: var(--ppt-chart-zero-line, rgba(255, 255, 255, 0.28));
  stroke-width: 1;
}
.ppt-radar-series-fill {
  fill-opacity: 0.25;
  stroke-width: 2.5;
  stroke-opacity: 0.9;
}
.ppt-radar-axis-label {
  font-size: 11px;
  fill: var(--ppt-text, #e8f0fe);
  font-family: var(--ppt-font-family, inherit);
  font-weight: 500;
}
.ppt-radar-tick {
  font-size: 9px;
  fill: var(--ppt-chart-label-fill, rgba(255, 255, 255, 0.56));
  font-family: var(--ppt-font-family, inherit);
}

/* ── scatter chart ── */
.ppt-chart-svg circle {
  transition: r 0.2s;
}

/* ── gauge chart ── */
.ppt-gauge-svg {
  max-width: 280px;
  margin: 0 auto;
}
.ppt-gauge-value {
  font-size: 24px;
  font-weight: 800;
  fill: var(--ppt-accent, #4a90e2);
}
.ppt-gauge-label {
  font-size: 11px;
  fill: rgba(255, 255, 255, 0.6);
}

/* ── treemap chart ── */
.ppt-chart-svg rect {
  transition: opacity 0.2s;
}

/* (ppt-content-split 已弃用，保留兼容) */
/* two_column 右栏内嵌图表 */
.ppt-col-chart-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
}

/* ── content page chart area ── */
.ppt-content-chart {
  margin-top: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

/* ── two_column chart area ── */
.ppt-two-col-chart {
  margin-top: 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  .ppt-chart-svg,
  .ppt-grouped-bar-wrap,
  .ppt-line-chart-wrap {
    width: 100%;
    max-width: 70%;
    max-height: min(40cqi, 36vh);
  }

  &.ppt-chart-contained {
    flex: 0 1 auto;
    width: 100%;
    max-width: 70%;
    padding: clamp(10px, 4cqi, 24px) clamp(12px, 5cqi, 32px);
    margin-inline: auto;

    .ppt-chart-svg,
    .ppt-grouped-bar-wrap,
    .ppt-line-chart-wrap,
    .ppt-timeline-chart,
    .ppt-funnel-chart {
      max-width: 100%;
      max-height: min(46cqi, 42vh);
    }
  }
}

.ppt-content-split.ppt-content-chart-only {
  justify-content: center;

  .ppt-content-right {
    flex: 0 1 auto !important;
    width: 100%;
    max-width: 70%;
    margin-inline: auto;
  }

  .ppt-content-chart-wrap {
    flex: 0 1 auto;
    width: 100%;

    .ppt-chart-svg,
    .ppt-grouped-bar-wrap,
    .ppt-line-chart-wrap {
      flex: 0 1 auto;
      max-height: min(46cqi, 42vh);
    }
  }
}

/* ── toc ── */
.ppt-toc {
  justify-content: flex-start;
  padding: clamp(20px, 3cqi, 32px) clamp(28px, 4cqi, 44px) clamp(12px, 2cqi, 20px);
  overflow: hidden;
}

.ppt-toc--medium {
  padding: clamp(16px, 2.4cqi, 26px) clamp(22px, 3.2cqi, 36px) clamp(10px, 1.6cqi, 16px);

  .ppt-toc-header {
    margin-bottom: clamp(8px, 1.4cqi, 14px);
  }

  .ppt-toc-title {
    font-size: clamp(18px, 3.6cqi, 28px);
  }

  .ppt-toc-subtitle {
    font-size: clamp(11px, 1.8cqi, 14px);
    margin-top: 4px;
  }
}

.ppt-toc--compact {
  padding: clamp(12px, 2cqi, 20px) clamp(18px, 2.8cqi, 28px) clamp(8px, 1.2cqi, 12px);

  .ppt-toc-header {
    margin-bottom: clamp(6px, 1cqi, 10px);
  }

  .ppt-toc-title {
    font-size: clamp(16px, 3cqi, 24px);
  }

  .ppt-toc-subtitle {
    font-size: clamp(11px, 1.65cqi, 13px);
    margin-top: 2px;
  }
}

/* 标题区域 */
.ppt-toc-header {
  margin-bottom: clamp(10px, 1.8cqi, 18px);
  flex-shrink: 0;
}

.ppt-toc-title {
  font-size: clamp(20px, 4cqi, 32px);
  font-weight: 800;
  margin: 0 0 2px;
  color: var(--ppt-accent, #4a90e2);
  border-left: 4px solid var(--ppt-accent, #4a90e2);
  padding-left: 14px;
  line-height: 1.3;
}

.ppt-toc-subtitle {
  font-size: clamp(12px, 2cqi, 15px);
  opacity: 0.55;
  margin: 6px 0 0 18px;
}

/* 卡片网格：2 列自适应 */
.ppt-toc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 1.8cqi, 16px);
  flex: 1;
  min-height: 0;
  align-content: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

.ppt-toc-grid--medium {
  gap: clamp(8px, 1.4cqi, 12px);

  .ppt-toc-card {
    padding: clamp(10px, 1.8cqi, 14px) clamp(12px, 2cqi, 16px);
    gap: clamp(8px, 1.4cqi, 10px);
  }

  .ppt-toc-card-icon {
    width: clamp(32px, 4.5cqi, 40px);
    height: clamp(32px, 4.5cqi, 40px);
    margin-top: 2px;

    svg {
      width: clamp(18px, 2.6cqi, 22px);
      height: clamp(18px, 2.6cqi, 22px);
    }
  }

  .ppt-toc-card-body {
    gap: clamp(4px, 0.8cqi, 8px);
  }

  .ppt-toc-card-title {
    font-size: clamp(14px, 2.6cqi, 18px);
    line-height: 1.3;
  }

  .ppt-toc-card-desc {
    font-size: clamp(11px, 1.8cqi, 14px);
    line-height: 1.35;
  }
}

.ppt-toc-grid--compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(6px, 1cqi, 10px);
  align-content: start;
  grid-auto-rows: auto;

  .ppt-toc-card {
    padding: clamp(8px, 1.4cqi, 12px) clamp(10px, 1.6cqi, 14px);
    gap: clamp(6px, 1cqi, 8px);
    align-items: center;
  }

  .ppt-toc-card-icon {
    width: clamp(28px, 3.8cqi, 36px);
    height: clamp(28px, 3.8cqi, 36px);
    margin-top: 0;

    svg {
      width: clamp(16px, 2.2cqi, 20px);
      height: clamp(16px, 2.2cqi, 20px);
    }
  }

  .ppt-toc-card-body {
    gap: clamp(3px, 0.6cqi, 6px);
  }

  .ppt-toc-card-title {
    font-size: clamp(13px, 2.3cqi, 17px);
    line-height: 1.3;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ppt-toc-card-num {
    margin-right: 6px;
    font-size: 0.95em;
  }

  .ppt-toc-card-desc {
    font-size: clamp(11px, 1.75cqi, 14px);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* 单个卡片 */
.ppt-toc-card {
  display: flex;
  align-items: flex-start;
  gap: clamp(10px, 1.8cqi, 14px);
  padding: clamp(12px, 2.2cqi, 18px) clamp(14px, 2.4cqi, 20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: var(--ppt-bg-secondary, rgba(255, 255, 255, 0.03));
  transition: border-color 0.25s, background 0.25s;
  cursor: default;
  min-height: 0;
  overflow: hidden;

  &:hover {
    border-color: var(--ppt-accent, #4a90e2);
    background: rgba(255, 255, 255, 0.05);
  }
}

/* 图标容器 */
.ppt-toc-card-icon {
  flex-shrink: 0;
  width: clamp(36px, 5cqi, 44px);
  height: clamp(36px, 5cqi, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ppt-accent, #4a90e2);
  margin-top: 2px;

  svg {
    width: clamp(20px, 3cqi, 26px);
    height: clamp(20px, 3cqi, 26px);
  }
}

/* 卡片文字区域 */
.ppt-toc-card-body {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9cqi, 8px);
  min-width: 0;
  flex: 1;
}

.ppt-toc-card-title {
  font-size: clamp(16px, 3.2cqi, 22px);
  font-weight: 800;
  color: var(--ppt-text, #e8f0fe);
  line-height: 1.35;
  word-break: break-word;
}

.ppt-toc-card-num {
  color: var(--ppt-accent, #4a90e2);
  font-weight: 800;
  font-size: 1.05em;
  margin-right: 8px;
}

.ppt-toc-card-desc {
  font-size: clamp(12px, 2.2cqi, 15px);
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.62));
  line-height: 1.4;
  word-break: break-word;
}

/* 底部报告标题 */
.ppt-toc-footer {
  text-align: center;
  font-size: clamp(11px, 1.8cqi, 13px);
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top: 12px;
  padding-top: 10px;
  flex-shrink: 0;
}

/* ── references ── */
.ppt-references {
  justify-content: flex-start;
  padding-top: 36px;
}
.ppt-ref-subtitle {
  font-size: var(--ppt-fs-body-sm);
  opacity: 0.5;
  margin: -12px 0 12px 18px;
}
.ppt-ref-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.ppt-ref-item {
  font-size: var(--ppt-fs-caption);
  line-height: 1.45;
  opacity: 0.6;
  word-break: break-all;
}
.ppt-ref-item--link {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.ppt-ref-item--link:hover {
  opacity: 0.9;
  text-decoration: underline;
}

/* ── quote ── */
.ppt-quote {
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 16px;
  background-image: linear-gradient(
    135deg,
    var(--ppt-bg, #0d1b2e),
    color-mix(in srgb, var(--ppt-accent, #4a90e2) 12%, var(--ppt-bg, #0d1b2e))
  );
}

.ppt-quote-mark {
  font-size: var(--ppt-fs-quote-mark);
  line-height: 0.8;
  color: var(--ppt-accent, #4a90e2);
  opacity: 0.3;
  font-family: Georgia, serif;
}

.ppt-quote-text {
  display: block;
  font-size: var(--ppt-fs-heading);
  font-family: var(--ppt-quote-font-family, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-style: italic;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
  max-width: 80%;
}

.ppt-quote-author {
  font-size: var(--ppt-fs-body-sm);
  opacity: 0.55;
}

/* ── end ── */
.ppt-end {
  align-items: center;
  text-align: center;
  gap: 16px;
  background-image: linear-gradient(
    135deg,
    var(--ppt-bg, #0d1b2e),
    color-mix(in srgb, var(--ppt-accent, #4a90e2) 15%, var(--ppt-bg, #0d1b2e))
  );
}

.ppt-end-icon {
  font-size: 48px;
}

.ppt-end-title {
  font-size: var(--ppt-fs-display);
  font-weight: 800;
  margin: 0;
}

.ppt-end-sub {
  font-size: var(--ppt-fs-body-lg);
  opacity: 0.6;
  margin: 0;
}

/* 缩略图导航 */
.ppt-thumbs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  overflow-x: auto;
  scrollbar-width: thin;
  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
}

.ppt-thumb {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 10px;
  transition: all 0.15s;
  min-width: 44px;
  max-width: 64px;
  &:hover {
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.75);
  }
  &.ppt-thumb-active {
    border-color: var(--ppt-accent, #4a90e2);
    color: #fff;
    background: rgba(74, 144, 226, 0.15);
  }
}

.ppt-thumb-num {
  font-weight: 700;
  font-size: 11px;
}

.ppt-thumb-label {
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 56px;
  opacity: 0.7;
}

.ppt-modern-literary {
  --modern-bg: var(--ppt-modern-bg, #fdfcf8);
  --modern-surface: var(--ppt-modern-surface, #f4f2ed);
  --modern-accent: var(--ppt-modern-accent, #c41e3a);
  --modern-text: var(--ppt-modern-text, #1a1a1a);
  --modern-muted: var(--ppt-modern-muted, #888888);
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  padding: 58px 70px;
  overflow: hidden;
  color: var(--modern-text);
  background: var(--modern-bg);
  font-family: var(--ppt-font-body, "LXGW WenKai TC", "ZCOOL XiaoWei", serif);
}

.ppt-modern-literary .ppt-table-ref {
  color: var(--modern-accent);
  font-size: 0.62em;
  opacity: 0.55;
  text-decoration: none;
  vertical-align: super;
}

.ppt-modern-literary::after {
  content: "";
  position: absolute;
  right: 34px;
  bottom: 28px;
  width: 46%;
  height: 120px;
  border-bottom: 18px solid var(--modern-text);
  opacity: 0.035;
  pointer-events: none;
}

.ppt-modern-kicker,
.ppt-modern-section-label {
  color: var(--modern-accent);
  font-family: var(--ppt-font-body, "LXGW WenKai TC", "ZCOOL XiaoWei", serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
}

.ppt-modern-cover-grid {
  display: grid;
  grid-template-columns: minmax(0, 9fr) minmax(80px, 3fr);
  align-items: center;
  min-height: calc(100% - 86px);
  padding-bottom: 72px;
}

.ppt-modern-cover-main {
  max-width: min(980px, 88%);
}

.ppt-modern-cover-title,
.ppt-modern-section-title,
.ppt-modern-slide-title {
  margin: 0;
  color: var(--modern-text);
  font-family: var(--ppt-font-display, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.02;
}

.ppt-modern-cover-title .ppt-md-inline,
.ppt-modern-slide-title .ppt-md-inline,
.ppt-modern-section-title .ppt-md-inline {
  display: block;
  font-family: inherit;
  color: inherit;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
}

.ppt-modern-cover-title {
  max-width: 980px;
  font-size: clamp(34px, 4.8cqi, 58px);
  line-height: 1.08;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-accent-line,
.ppt-modern-section-line {
  width: 118px;
  height: 6px;
  margin: 28px 0 22px;
  background: var(--modern-accent);
}

.ppt-modern-cover-subtitle {
  max-width: 680px;
  margin: 0;
  color: var(--modern-muted);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(20px, 2.4cqi, 34px);
  line-height: 1.35;
}

.ppt-modern-cover-footer {
  position: absolute;
  right: 70px;
  bottom: 42px;
  left: 70px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  color: var(--modern-muted);
  font-family: "Lora", var(--ppt-font-body, serif);
  font-size: 13px;
  font-style: italic;
  line-height: 1.25;
}

.ppt-modern-cover-footer-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppt-modern-cover-footer-date {
  white-space: nowrap;
}

.ppt-modern-literary--section {
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 52px;
  padding: 0;
}

.ppt-modern-section-rail {
  background: var(--modern-text);
}

.ppt-modern-section-block {
  align-self: center;
  max-width: 860px;
  padding-right: 80px;
  padding-left: 42px;
  border-left: 10px solid var(--modern-accent);
}

.ppt-modern-section-title {
  margin-top: 20px;
  font-size: clamp(36px, 5cqi, 64px);
  line-height: 1.08;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-section-subtitle {
  display: block;
  max-width: 620px;
  color: var(--modern-muted);
  font-size: clamp(18px, 1.8cqi, 28px);
  line-height: 1.55;
}

.ppt-modern-literary--quote {
  align-content: center;
  padding: 72px 86px;
}

.ppt-modern-quote-card,
.ppt-modern-inline-quote {
  position: relative;
  border-left: 12px solid var(--modern-accent);
  background: var(--modern-surface);
}

.ppt-modern-quote-card {
  min-height: 410px;
  padding: 58px 72px 46px;
}

.ppt-modern-quote-mark {
  position: absolute;
  top: 10px;
  left: 34px;
  color: var(--modern-accent);
  font-family: "Lora", var(--ppt-font-heading, serif);
  font-size: 118px;
  font-style: italic;
  line-height: 0.8;
  opacity: 0.18;
}

.ppt-modern-quote-text {
  position: relative;
  display: block;
  max-width: 920px;
  color: var(--modern-text);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(34px, 4.2cqi, 70px);
  font-style: italic;
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.12;
}

.ppt-modern-quote-author {
  margin-top: 34px;
  color: var(--modern-muted);
  font-size: 16px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.ppt-modern-insight {
  display: block;
  margin-top: 28px;
  color: var(--modern-accent);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(22px, 2.2cqi, 34px);
  font-weight: 900;
  line-height: 1.25;
}

.ppt-modern-content-header {
  align-self: start;
}

.ppt-modern-literary--content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 52px;
  overflow: hidden;
}

.ppt-modern-literary--content .ppt-modern-content-header {
  flex: 0 0 auto;
}

.ppt-modern-literary--content .ppt-modern-slide-title {
  max-width: 100%;
  color: var(--modern-accent);
  font-size: clamp(34px, 4.4cqi, 68px);
  line-height: 1.08;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-literary--content .ppt-modern-accent-line {
  width: 96px;
  margin: 14px 0 10px;
}

.ppt-modern-literary--content .ppt-modern-multi,
.ppt-modern-literary--content .ppt-modern-quad,
.ppt-modern-literary--content .ppt-modern-double,
.ppt-modern-literary--content .ppt-modern-triple,
.ppt-modern-literary--content .ppt-modern-content-body,
.ppt-modern-literary--content .ppt-modern-right-items-portrait {
  flex: 1 1 auto;
  min-height: 0;
}

.ppt-modern-literary--content .ppt-modern-content-body {
  align-self: stretch;
  align-content: center;
  overflow: hidden;
}

.ppt-modern-literary--content .ppt-modern-content-quotes,
.ppt-modern-literary--content .ppt-modern-explain-grid {
  min-height: 0;
  align-content: center;
  overflow: hidden;
}

.ppt-modern-literary--content .ppt-modern-insight--footer {
  position: static;
  flex: 0 0 auto;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(26, 26, 26, 0.08);
  max-width: 100%;
  font-size: clamp(14px, 1.22cqi, 20px);
  font-weight: 800;
  line-height: 1.38;
}

.ppt-modern-literary--content .ppt-brand-footer {
  bottom: 10px;
  font-size: 11px;
  opacity: 0.42;
}

.ppt-modern-literary--two_column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 48px;
  overflow: hidden;
}

.ppt-modern-literary--two_column .ppt-modern-content-header {
  flex: 0 0 auto;
}

.ppt-modern-literary--two_column .ppt-modern-slide-title {
  max-width: 100%;
  color: var(--modern-accent);
  font-size: clamp(28px, 3.2cqi, 48px);
  line-height: 1.1;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-literary--two_column .ppt-modern-accent-line {
  width: 88px;
  margin: 12px 0 8px;
}

.ppt-modern-literary--two_column .ppt-modern-two-col-grid {
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  min-height: 0;
  gap: 18px;
}

.ppt-modern-literary--two_column .ppt-modern-compare-card {
  display: flex;
  min-height: 0;
  max-height: 100%;
  padding: 22px 24px;
  flex-direction: column;
  overflow: hidden;
}

.ppt-modern-literary--two_column .ppt-modern-compare-card h3 {
  flex: 0 0 auto;
  margin-bottom: 14px;
  font-size: clamp(18px, 1.65cqi, 28px);
  line-height: 1.15;
  overflow-wrap: break-word;
}

.ppt-modern-literary--two_column .ppt-modern-compare-list {
  flex: 1 1 auto;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.ppt-modern-literary--two_column .ppt-modern-compare-item {
  font-size: clamp(12px, 1.05cqi, 16px);
  line-height: 1.42;
  overflow-wrap: break-word;
}

.ppt-modern-literary--two_column .ppt-modern-document-figure {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  padding: 8px;
}

.ppt-modern-literary--two_column .ppt-modern-document-figure-img {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
  height: 100%;
}

.ppt-modern-literary--two_column .ppt-modern-quote-strip {
  position: static;
  right: auto;
  bottom: auto;
  left: auto;
  flex: 0 0 auto;
  margin-top: 2px;
  padding: clamp(10px, 1.3cqi, 16px) clamp(16px, 1.8cqi, 22px);
  font-size: clamp(12px, 1.05cqi, 16px);
  line-height: 1.4;
}

.ppt-modern-literary--two_column .ppt-brand-footer {
  bottom: 10px;
  font-size: 11px;
  opacity: 0.42;
}

.ppt-modern-slide-title {
  max-width: 900px;
  font-size: clamp(48px, 5.6cqi, 92px);
}

.ppt-modern-content-body {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 34px;
  align-self: center;
}

.ppt-modern-content-quotes {
  display: grid;
  gap: 18px;
}

.ppt-modern-inline-quote {
  padding: 28px 34px;
  color: var(--modern-text);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(22px, 2.1cqi, 34px);
  font-style: italic;
  font-weight: 800;
  line-height: 1.28;
}

.ppt-modern-explain-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(14px, 1.8cqi, 22px);
}

.ppt-modern-explain-card {
  min-height: clamp(120px, 14cqi, 180px);
  padding: clamp(18px, 2cqi, 26px) clamp(20px, 2.2cqi, 28px);
  border: none;
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
}

.ppt-modern-explain-card:nth-child(2),
.ppt-modern-explain-card:nth-child(3) {
  color: var(--modern-bg);
  background: var(--modern-text);
  border-left-color: var(--modern-accent);
  box-shadow: none;
}

.ppt-modern-explain-card:nth-child(2) .ppt-modern-explain-title,
.ppt-modern-explain-card:nth-child(3) .ppt-modern-explain-title {
  color: var(--modern-bg);
}

.ppt-modern-explain-card:nth-child(2) .ppt-modern-explain-body,
.ppt-modern-explain-card:nth-child(3) .ppt-modern-explain-body {
  color: rgba(253, 252, 248, 0.82);
}

.ppt-modern-explain-title {
  display: block;
  color: var(--modern-text);
  font-size: clamp(20px, 1.75cqi, 30px);
  font-weight: 900;
  line-height: 1.15;
}

.ppt-modern-explain-body {
  display: block;
  margin-top: 12px;
  color: var(--modern-muted);
  font-size: clamp(15px, 1.25cqi, 22px);
  line-height: 1.5;
}

.ppt-modern-double {
  align-self: stretch;
  width: 100%;
}

/* ── 大色块冲击层：accent / dark / surface 对比 ── */
.ppt-modern-impact-block {
  display: grid;
  gap: 10px;
  margin-bottom: clamp(16px, 2cqi, 24px);
  padding: clamp(22px, 2.8cqi, 36px) clamp(24px, 3cqi, 40px);
  background: var(--modern-accent);
  color: var(--modern-bg);
}

.ppt-modern-impact-block .ppt-modern-portrait-kicker,
.ppt-modern-impact-block .ppt-modern-triple-kicker {
  margin-bottom: 0;
  color: rgba(253, 252, 248, 0.82);
}

.ppt-modern-impact-block .ppt-modern-portrait-title,
.ppt-modern-impact-block h3 {
  margin: 0;
  color: var(--modern-bg);
}

.ppt-modern-double--contrast {
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(20px, 2.8cqi, 36px);
  align-items: stretch;
}

.ppt-modern-double-card {
  display: flex;
  flex-direction: column;
  min-height: clamp(220px, 28cqi, 320px);
  padding: clamp(28px, 3.2cqi, 42px) clamp(30px, 3.4cqi, 46px);
  border: none;
  border-radius: 0;
  background: var(--modern-surface);
  box-shadow: none;
}

.ppt-modern-double-card--light {
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
}

.ppt-modern-double-card--dark {
  color: var(--modern-bg);
  background: var(--modern-text);
}

.ppt-modern-double-card h3 {
  margin: 0 0 22px;
  color: inherit;
  font-family: var(--ppt-font-display, "Playfair Display", serif);
  font-size: clamp(34px, 3.5cqi, 58px);
  font-weight: 900;
  line-height: 1.02;
}

.ppt-modern-double-card--dark h3 {
  color: var(--modern-accent);
}

.ppt-modern-double-card-body {
  display: block;
  color: var(--modern-muted);
  font-size: clamp(16px, 1.45cqi, 24px);
  line-height: 1.48;
}

.ppt-modern-double-card--dark .ppt-modern-double-card-body {
  color: rgba(253, 252, 248, 0.78);
}

.ppt-modern-double-quote-strip {
  grid-column: 1 / -1;
  margin-top: clamp(8px, 1cqi, 14px);
  padding: clamp(16px, 1.8cqi, 24px) clamp(22px, 2.4cqi, 32px);
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  background: var(--modern-surface);
  color: var(--modern-text);
  font-size: clamp(15px, 1.35cqi, 22px);
  font-style: italic;
  font-weight: 800;
  line-height: 1.38;
  text-align: left;
}

.ppt-modern-double--split {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  gap: clamp(28px, 3.6cqi, 48px);
  align-items: stretch;
}

.ppt-modern-double-split-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  padding: clamp(12px, 1.4cqi, 20px) clamp(16px, 2cqi, 28px) clamp(12px, 1.4cqi, 20px) 0;
  border-right: none;
  color: var(--modern-text);
  background: transparent;
}

.ppt-modern-double-split-hero::after {
  content: "";
  display: block;
  width: clamp(72px, 9cqi, 120px);
  height: 4px;
  margin: clamp(16px, 2cqi, 22px) 0;
  background: var(--modern-accent);
}

.ppt-modern-double-kicker {
  margin-bottom: 12px;
  color: var(--modern-muted);
  font-size: clamp(13px, 1.1cqi, 16px);
  font-weight: 900;
  letter-spacing: 0.14em;
}

.ppt-modern-double-split-hero h3,
.ppt-modern-double-aside h3 {
  margin: 0 0 18px;
  color: var(--modern-text);
  font-family: var(--ppt-font-display, "Playfair Display", serif);
  font-size: clamp(34px, 4.2cqi, 64px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.04;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-double-split-body,
.ppt-modern-double-aside-body {
  display: block;
  color: var(--modern-muted);
  font-size: clamp(15px, 1.35cqi, 22px);
  line-height: 1.55;
}

.ppt-modern-double-split-side {
  display: grid;
  align-content: center;
  gap: clamp(18px, 2.2cqi, 28px);
  min-height: 0;
  padding-left: 0;
}

.ppt-modern-double-split-side .ppt-modern-double-side-card {
  min-height: clamp(160px, 18cqi, 240px);
  padding: clamp(24px, 2.8cqi, 36px);
  border: none;
  border-left: 8px solid var(--modern-bg);
  border-radius: 0;
  color: var(--modern-bg);
  background: var(--modern-text);
  box-shadow: none;
}

.ppt-modern-double-split-side .ppt-modern-double-side-title {
  color: var(--modern-bg);
}

.ppt-modern-double-split-side .ppt-modern-double-side-body {
  color: rgba(253, 252, 248, 0.82);
}

.ppt-modern-double-split-side .ppt-modern-double-side-insight {
  padding: clamp(20px, 2.2cqi, 28px) clamp(22px, 2.4cqi, 32px);
  border: 1px solid rgba(26, 26, 26, 0.1);
  border-radius: 0;
  background: var(--modern-bg);
  color: var(--modern-text);
  font-size: clamp(14px, 1.2cqi, 19px);
  font-style: italic;
  line-height: 1.45;
}

.ppt-modern-double-side-card,
.ppt-modern-double-stacked-card {
  padding: clamp(24px, 2.8cqi, 34px) clamp(26px, 3cqi, 38px);
  border: 1px solid rgba(26, 26, 26, 0.1);
  border-radius: 0;
  background: var(--modern-bg);
  box-shadow: none;
}

.ppt-modern-double-side-title,
.ppt-modern-double-stacked-card h3 {
  display: block;
  margin: 0 0 14px;
  color: var(--modern-accent);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(24px, 2.2cqi, 38px);
  font-weight: 900;
  line-height: 1.18;
}

.ppt-modern-double-side-body,
.ppt-modern-double-stacked-body {
  display: block;
  color: var(--modern-text);
  font-size: clamp(15px, 1.35cqi, 22px);
  line-height: 1.5;
}

.ppt-modern-double-side-insight {
  display: block;
  color: var(--modern-muted);
  font-size: clamp(15px, 1.25cqi, 21px);
  font-style: italic;
  line-height: 1.45;
}

.ppt-modern-double--stacked {
  display: grid;
  min-height: 0;
  grid-template-rows: 1fr auto;
  gap: clamp(18px, 2.2cqi, 28px);
}

.ppt-modern-double-stacked-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(18px, 2.2cqi, 26px);
  align-content: center;
  width: 100%;
  max-width: none;
  margin: 0;
}

.ppt-modern-double-stacked-card--impact {
  color: var(--modern-bg);
  background: var(--modern-text);
  border: none;
  border-left: 8px solid var(--modern-accent);
}

.ppt-modern-double-stacked-card--impact h3,
.ppt-modern-double-stacked-card--impact .ppt-modern-double-stacked-body {
  color: rgba(253, 252, 248, 0.88);
}

.ppt-modern-double-stacked-card--impact h3 {
  color: var(--modern-bg);
}

.ppt-modern-double-stacked-card--soft {
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.1);
}

.ppt-modern-double-stacked-footer {
  display: block;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: clamp(16px, 1.8cqi, 24px) clamp(22px, 2.4cqi, 32px);
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  color: var(--modern-text);
  background: var(--modern-surface);
  font-size: clamp(15px, 1.35cqi, 22px);
  font-style: italic;
  font-weight: 800;
  line-height: 1.38;
  text-align: left;
}

.ppt-modern-double--numbered {
  display: grid;
  min-height: 430px;
  grid-template-columns: minmax(220px, 0.42fr) minmax(0, 1fr);
  gap: 58px;
  align-items: center;
}

.ppt-modern-double-aside {
  display: grid;
  align-content: center;
  min-height: 390px;
  padding: 42px 38px;
  border-radius: 18px;
  color: var(--modern-bg);
  background: var(--modern-text);
  box-shadow: 0 20px 42px rgba(26, 26, 26, 0.18);
}

.ppt-modern-double-numbered {
  position: relative;
  display: grid;
  align-content: center;
}

.ppt-modern-double-number {
  position: absolute;
  top: -8px;
  left: -72px;
  color: color-mix(in srgb, var(--modern-accent) 26%, transparent);
  font-family: "Lora", var(--ppt-font-heading, serif);
  font-size: clamp(58px, 6cqi, 96px);
  line-height: 1;
}

.ppt-modern-double-number-title {
  display: block;
  color: var(--modern-text);
  font-size: clamp(26px, 2.5cqi, 42px);
  font-weight: 900;
  line-height: 1.18;
}

.ppt-modern-double-number-body {
  display: block;
  margin-top: 14px;
  max-width: 760px;
  color: var(--modern-muted);
  font-size: clamp(15px, 1.35cqi, 22px);
  line-height: 1.5;
}

.ppt-modern-double-number-quote {
  display: block;
  margin-top: 34px;
  padding: 18px 24px;
  border: 1px dashed rgba(26, 26, 26, 0.16);
  border-radius: 14px;
  color: var(--modern-text);
  font-size: clamp(16px, 1.45cqi, 24px);
  font-style: italic;
  font-weight: 900;
  line-height: 1.35;
  text-align: center;
}

.ppt-modern-triple {
  align-self: center;
}

.ppt-modern-triple--portrait {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.06fr);
  gap: clamp(28px, 3.6cqi, 48px);
  align-items: start;
  align-self: stretch;
  width: 100%;
  min-height: 0;
}

.ppt-modern-triple-portrait-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  padding-right: 8px;
}

.ppt-modern-triple-kicker {
  margin-bottom: 18px;
  color: var(--modern-accent);
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.ppt-modern-triple-portrait-hero h3 {
  margin: 0 0 18px;
  color: var(--modern-text);
  font-family: var(--ppt-font-display, "Playfair Display", serif);
  font-size: clamp(34px, 4.2cqi, 64px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.04;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-triple-portrait-hero .ppt-modern-impact-block h3 {
  margin: 0;
  color: var(--modern-bg);
}

.ppt-modern-triple-portrait-body {
  display: block;
  max-width: 560px;
  color: var(--modern-muted);
  font-size: clamp(17px, 1.6cqi, 26px);
  line-height: 1.55;
}

.ppt-modern-triple-portrait-list {
  display: grid;
  gap: clamp(14px, 1.8cqi, 22px);
  align-content: start;
  padding: clamp(12px, 1.4cqi, 18px);
  background: color-mix(in srgb, var(--modern-surface) 72%, var(--modern-bg) 28%);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.06);
  min-height: 0;
}

.ppt-modern-triple-bullet {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.ppt-modern-triple-bullet--block {
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  padding: clamp(18px, 2cqi, 28px) clamp(20px, 2.2cqi, 30px);
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
}

.ppt-modern-triple-bullet--block > span {
  display: none;
}

.ppt-modern-triple-bullet--block .ppt-modern-triple-bullet-title {
  color: var(--modern-text);
}

.ppt-modern-triple-bullet > span {
  width: 10px;
  height: 10px;
  margin-top: 11px;
  border-radius: 999px;
  background: var(--modern-accent);
}

.ppt-modern-triple-bullet-title {
  display: block;
  color: var(--modern-accent);
  font-size: clamp(22px, 2.1cqi, 34px);
  font-weight: 900;
  line-height: 1.18;
}

.ppt-modern-triple-bullet-body {
  display: block;
  margin-top: 6px;
  color: var(--modern-muted);
  font-size: clamp(15px, 1.35cqi, 22px);
  line-height: 1.38;
}

.ppt-modern-triple-insight {
  display: block;
  grid-column: 1 / -1;
  margin-top: clamp(8px, 1cqi, 14px);
  padding: clamp(16px, 1.8cqi, 24px) clamp(22px, 2.4cqi, 32px);
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  color: var(--modern-text);
  background: var(--modern-surface);
  font-size: clamp(14px, 1.2cqi, 19px);
  font-style: italic;
  font-weight: 800;
  line-height: 1.38;
  overflow-wrap: break-word;
}

/* ── right_items portrait（content 空 + right_items 分栏） ── */
.ppt-modern-right-items-portrait {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: clamp(28px, 4cqi, 54px);
  align-items: stretch;
  align-self: stretch;
  width: 100%;
  min-height: 0;
}

.ppt-modern-portrait-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  padding-right: 8px;
}

.ppt-modern-portrait-kicker {
  margin-bottom: 14px;
  color: var(--modern-accent);
  font-size: clamp(13px, 1.1cqi, 16px);
  font-weight: 900;
  letter-spacing: 0.14em;
  line-height: 1.3;
}

.ppt-modern-portrait-title {
  margin: 0 0 20px;
  color: var(--modern-text);
  font-family: var(--ppt-font-display, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(36px, 4.8cqi, 72px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.02;
  overflow-wrap: break-word;
  text-wrap: balance;
}

.ppt-modern-portrait-lead {
  display: block;
  max-width: 520px;
  color: var(--modern-muted);
  font-size: clamp(14px, 1.35cqi, 20px);
  line-height: 1.55;
  overflow-wrap: break-word;
}

.ppt-modern-portrait-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  min-height: 0;
  padding: clamp(12px, 1.4cqi, 18px);
  background: color-mix(in srgb, var(--modern-surface) 72%, var(--modern-bg) 28%);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.06);
}

.ppt-modern-portrait-list {
  display: grid;
  gap: clamp(14px, 1.8cqi, 22px);
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.ppt-modern-portrait-list--dense {
  gap: clamp(10px, 1.2cqi, 16px);
}

.ppt-modern-portrait-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  padding: clamp(16px, 1.8cqi, 24px) clamp(18px, 2cqi, 26px);
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
}

.ppt-modern-portrait-item:nth-child(2) {
  color: var(--modern-bg);
  background: var(--modern-text);
  border-left: 8px solid var(--modern-accent);
}

.ppt-modern-portrait-item:nth-child(2) .ppt-modern-portrait-item-title,
.ppt-modern-portrait-item:nth-child(2) .ppt-modern-portrait-item-title--accent {
  color: var(--modern-bg);
}

.ppt-modern-portrait-item:nth-child(2) .ppt-modern-portrait-item-body {
  color: rgba(253, 252, 248, 0.82);
}

.ppt-modern-portrait-bullet {
  display: none;
}

.ppt-modern-portrait-item-title {
  display: block;
  color: var(--modern-text);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(18px, 1.75cqi, 28px);
  font-weight: 900;
  line-height: 1.2;
  overflow-wrap: break-word;
}

.ppt-modern-portrait-item-title--accent {
  color: var(--modern-accent);
}

.ppt-modern-portrait-item-body {
  display: block;
  margin-top: 5px;
  color: var(--modern-muted);
  font-size: clamp(13px, 1.15cqi, 18px);
  line-height: 1.42;
  overflow-wrap: break-word;
}

.ppt-modern-portrait-insight {
  display: block;
  flex: 0 0 auto;
  margin-top: auto;
  padding: clamp(16px, 1.8cqi, 24px) clamp(22px, 2.4cqi, 32px);
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  color: var(--modern-text);
  background: var(--modern-surface);
  font-size: clamp(14px, 1.2cqi, 19px);
  font-style: italic;
  font-weight: 800;
  line-height: 1.38;
  overflow-wrap: break-word;
}

.ppt-modern-triple--orbit {
  position: relative;
  display: grid;
  min-height: 420px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  justify-items: center;
  gap: 26px;
}

.ppt-modern-triple--orbit::after {
  content: "";
  position: absolute;
  right: 18%;
  bottom: 82px;
  left: 18%;
  border-top: 1px dashed rgba(26, 26, 26, 0.14);
}

.ppt-modern-orbit-node {
  position: relative;
  z-index: 1;
  display: grid;
  width: clamp(150px, 17cqi, 230px);
  aspect-ratio: 1;
  place-items: center;
  padding: 30px;
  border: 1px solid rgba(26, 26, 26, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 14px 32px rgba(26, 26, 26, 0.12);
  text-align: center;
}

.ppt-modern-orbit-node--dark {
  width: clamp(170px, 19cqi, 258px);
  color: var(--modern-bg);
  background: var(--modern-text);
}

.ppt-modern-orbit-kicker {
  display: block;
  color: var(--modern-accent);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.15;
}

.ppt-modern-orbit-title {
  display: block;
  margin-top: 8px;
  color: inherit;
  font-size: clamp(17px, 1.55cqi, 25px);
  line-height: 1.32;
}

.ppt-modern-orbit-insight {
  position: absolute;
  right: 12%;
  bottom: 18px;
  left: 12%;
  color: var(--modern-muted);
  font-size: clamp(16px, 1.45cqi, 23px);
  line-height: 1.45;
  text-align: center;
}

.ppt-modern-triple--cards {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2cqi, 24px);
  align-items: stretch;
}

.ppt-modern-triple-card {
  display: grid;
  align-content: start;
  min-height: clamp(200px, 24cqi, 320px);
  padding: clamp(24px, 2.8cqi, 38px) clamp(26px, 3cqi, 40px);
  border: none;
  border-radius: 0;
  background: var(--modern-surface);
  box-shadow: none;
}

.ppt-modern-triple-card--dark {
  color: var(--modern-bg);
  background: var(--modern-text);
  border-left: 8px solid var(--modern-accent);
}

.ppt-modern-triple-card h3 {
  margin: 0 0 18px;
  color: var(--modern-accent);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(22px, 2cqi, 34px);
  font-weight: 900;
  line-height: 1.18;
}

.ppt-modern-triple-card--dark h3 {
  color: var(--modern-bg);
}

.ppt-modern-triple-card-body {
  display: block;
  color: inherit;
  font-size: clamp(15px, 1.35cqi, 22px);
  line-height: 1.55;
}

.ppt-modern-triple-card--dark .ppt-modern-triple-card-body {
  color: rgba(253, 252, 248, 0.86);
}

/* ── 4-items 卡片矩阵：numbered / panel / grid 三种形态按页轮换 ── */
.ppt-modern-quad {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.6cqi, 20px);
  align-self: stretch;
  width: 100%;
  min-height: 0;
}

.ppt-modern-quad-grid {
  display: grid;
  flex: 1 1 auto;
  gap: clamp(14px, 1.8cqi, 22px);
  min-height: 0;
}

.ppt-modern-quad--numbered .ppt-modern-quad-grid,
.ppt-modern-quad--panel .ppt-modern-quad-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ppt-modern-quad--grid .ppt-modern-quad-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
}

.ppt-modern-quad-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: clamp(18px, 2.2cqi, 30px) clamp(18px, 2.2cqi, 28px);
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
  overflow: hidden;
}

.ppt-modern-quad--numbered .ppt-modern-quad-card {
  border-radius: 14px;
  box-shadow: 0 12px 28px rgba(26, 26, 26, 0.08);
}

.ppt-modern-quad-index {
  margin-bottom: clamp(4px, 0.8cqi, 10px);
  color: color-mix(in srgb, var(--modern-accent) 32%, transparent);
  font-family: var(--ppt-font-display, "Playfair Display", serif);
  font-size: clamp(30px, 3.6cqi, 56px);
  font-weight: 900;
  line-height: 1;
}

.ppt-modern-quad--panel .ppt-modern-quad-card {
  border-bottom: 5px solid var(--modern-accent);
}

.ppt-modern-quad-kicker {
  margin-bottom: clamp(6px, 0.9cqi, 12px);
  color: var(--modern-accent);
  font-size: clamp(13px, 1.15cqi, 17px);
  font-weight: 900;
  letter-spacing: 0.14em;
}

.ppt-modern-quad--grid .ppt-modern-quad-card {
  border-radius: 16px;
  border-left: 8px solid var(--modern-accent);
  background: color-mix(in srgb, var(--modern-surface) 72%, var(--modern-bg) 28%);
  box-shadow: none;
}

.ppt-modern-quad--grid .ppt-modern-quad-card:first-child .ppt-modern-quad-title {
  color: var(--modern-accent);
}

.ppt-modern-quad-title {
  display: block;
  margin-bottom: clamp(6px, 0.8cqi, 10px);
  color: var(--modern-text);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(17px, 1.7cqi, 26px);
  font-weight: 900;
  line-height: 1.2;
  overflow-wrap: break-word;
}

.ppt-modern-quad-body {
  display: block;
  color: var(--modern-muted);
  font-size: clamp(12px, 1.08cqi, 17px);
  font-style: italic;
  line-height: 1.42;
  overflow-wrap: break-word;
}

.ppt-modern-quad-insight {
  display: block;
  flex: 0 0 auto;
  overflow-wrap: break-word;
}

.ppt-modern-quad--numbered .ppt-modern-quad-insight {
  color: var(--modern-muted);
  font-size: clamp(13px, 1.2cqi, 19px);
  font-style: italic;
  line-height: 1.4;
  text-align: center;
}

.ppt-modern-quad--panel .ppt-modern-quad-insight {
  padding: clamp(14px, 1.6cqi, 20px) clamp(20px, 2.2cqi, 30px);
  border-left: 8px solid var(--modern-accent);
  color: var(--modern-bg);
  background: var(--modern-text);
  font-size: clamp(13px, 1.2cqi, 19px);
  font-weight: 800;
  line-height: 1.4;
}

.ppt-modern-quad--grid .ppt-modern-quad-insight {
  padding: clamp(12px, 1.4cqi, 18px) clamp(18px, 2cqi, 26px);
  border-left: 8px solid var(--modern-accent);
  color: var(--modern-text);
  background: var(--modern-surface);
  font-size: clamp(13px, 1.15cqi, 18px);
  font-style: italic;
  font-weight: 700;
  line-height: 1.38;
}

.ppt-modern-multi {
  align-self: center;
  width: 100%;
}

.ppt-modern-literary--content .ppt-modern-multi {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ppt-modern-multi-grid {
  display: grid;
  max-width: 850px;
  margin: 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px 42px;
}

.ppt-modern-literary--content .ppt-modern-multi-grid {
  max-width: none;
  width: 100%;
  gap: 18px 28px;
}

.ppt-modern-multi-card {
  display: flex;
  flex-direction: column;
  min-height: clamp(120px, 14cqi, 180px);
  padding: clamp(18px, 2cqi, 26px) clamp(20px, 2.2cqi, 28px) clamp(18px, 2cqi, 26px) clamp(26px, 2.8cqi, 34px);
  border: none;
  border-left: 8px solid var(--modern-accent);
  border-radius: 0;
  background: var(--modern-bg);
  box-shadow: inset 0 0 0 1px rgba(26, 26, 26, 0.08);
}

.ppt-modern-multi-card--impact {
  border-left-color: var(--modern-bg);
  color: var(--modern-bg);
  background: var(--modern-accent);
  box-shadow: none;
}

.ppt-modern-multi-card--impact h3 {
  color: var(--modern-bg);
}

.ppt-modern-multi-card--impact .ppt-modern-multi-body {
  color: rgba(253, 252, 248, 0.88);
  font-style: normal;
  font-weight: 600;
}

.ppt-modern-multi-card--dark {
  border-left-color: var(--modern-accent);
  color: var(--modern-bg);
  background: var(--modern-text);
  box-shadow: none;
}

.ppt-modern-multi-card--dark h3 {
  color: var(--modern-bg);
}

.ppt-modern-multi-card--dark .ppt-modern-multi-body {
  color: rgba(253, 252, 248, 0.82);
  font-style: normal;
  font-weight: 500;
}

.ppt-modern-literary--content .ppt-modern-multi-card {
  min-height: 0;
  padding: 14px 18px 14px 26px;
  border-radius: 20px;
}

.ppt-modern-multi-card h3 {
  margin: 0 0 8px;
  color: var(--modern-text);
  font-family: var(--ppt-font-heading, "ZCOOL XiaoWei", "Playfair Display", serif);
  font-size: clamp(20px, 1.85cqi, 30px);
  font-weight: 900;
  line-height: 1.15;
}

.ppt-modern-literary--content .ppt-modern-multi-card h3 {
  margin-bottom: 6px;
  font-size: clamp(16px, 1.45cqi, 22px);
}

.ppt-modern-multi-body {
  display: block;
  color: var(--modern-muted);
  font-family: var(--ppt-font-body, "LXGW WenKai TC", "ZCOOL XiaoWei", serif);
  font-size: clamp(13px, 1.18cqi, 19px);
  font-style: italic;
  font-weight: 700;
  line-height: 1.42;
}

.ppt-modern-literary--content .ppt-modern-multi-body {
  font-size: clamp(11px, 0.98cqi, 15px);
  font-weight: 500;
  line-height: 1.36;
}

.ppt-modern-insight--footer {
  position: absolute;
  right: 70px;
  bottom: 42px;
  left: 70px;
  max-width: 760px;
}

.ppt-modern-two-col-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-self: center;
  width: 100%;
  min-width: 0;
}

.ppt-modern-compare-card {
  min-height: 390px;
  min-width: 0;
  padding: 34px 38px;
  border-left: 10px solid var(--modern-accent);
  box-sizing: border-box;
}

.ppt-modern-compare-card h3 {
  margin: 0 0 28px;
  font-family: var(--ppt-font-display, "ZCOOL XiaoWei", serif);
  font-size: clamp(34px, 3.9cqi, 62px);
  font-weight: 900;
  letter-spacing: -0.045em;
  line-height: 0.95;
}

.ppt-modern-compare-card--light {
  color: var(--modern-text);
  background: var(--modern-surface);
}

.ppt-modern-compare-card--dark {
  color: var(--modern-bg);
  background: var(--modern-text);
}

.ppt-modern-compare-card--dark .ppt-modern-compare-item,
.ppt-modern-compare-card--dark .ppt-table-ref {
  color: rgba(253, 252, 248, 0.82);
}

.ppt-modern-compare-list {
  display: grid;
  gap: 16px;
}

.ppt-modern-document-figure {
  display: flex;
  min-height: 285px;
  max-height: none;
  margin: 0;
  padding: 12px;
  flex-direction: column;
  align-items: center;
  justify-content: stretch;
  gap: 10px;
  background: var(--modern-bg);
}

.ppt-modern-document-figure-img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  object-fit: contain;
  background: var(--modern-bg);
}

.ppt-modern-document-figure figcaption {
  width: 100%;
  overflow: hidden;
  color: var(--modern-muted);
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppt-modern-compare-item {
  display: block;
  color: inherit;
  font-size: clamp(17px, 1.55cqi, 25px);
  line-height: 1.38;
}

.ppt-modern-quote-strip {
  position: absolute;
  right: 70px;
  bottom: 36px;
  left: 70px;
  padding: 16px 22px;
  border-left: 8px solid var(--modern-accent);
  color: var(--modern-muted);
  background: rgba(255, 255, 255, 0.72);
  font-size: 16px;
  font-style: italic;
}

/* ── Mobile layout (≤767px) ── */
@media (max-width: 767px) {
  .ppt-viewer-shell {
    flex-direction: column;
    margin: 0;
    border-radius: 8px;
    overflow: visible;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) {
    overflow: visible;
    touch-action: pan-y;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-stage {
    flex: 0 1 auto;
    min-height: auto;
    overflow: visible;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-slide-wrapper {
    aspect-ratio: auto;
    height: auto;
    min-height: calc(100cqw * 9 / 16);
    overflow: visible;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-slide {
    height: auto;
    min-height: calc(100cqw * 9 / 16);
    justify-content: flex-start;
    overflow: visible;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-content-split,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-content-items-split,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-hero-left-split,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-metric-content-split,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-data-split,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-col,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-content-left {
    flex: 0 1 auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-topic-grid,
  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-topic-grid--fill {
    overflow: visible;

    .ppt-topic-card-body {
      overflow: visible;
    }
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-chapter-image-page-body {
    min-height: auto;
  }

  /* 全屏 / 演示：stage 作为固定视口内的纵向滚动容器 */
  .ppt-viewer:fullscreen,
  .ppt-viewer:-webkit-full-screen,
  .ppt-viewer.ppt-viewer--presentation {
    touch-action: pan-y;
  }

  .ppt-viewer:fullscreen .ppt-stage,
  .ppt-viewer:-webkit-full-screen .ppt-stage,
  .ppt-viewer.ppt-viewer--presentation .ppt-stage {
    align-items: stretch !important;
    justify-content: flex-start !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior-y: contain;
    padding: 8px 10px 12px;
  }

  .ppt-viewer:fullscreen .ppt-slide-wrapper,
  .ppt-viewer:-webkit-full-screen .ppt-slide-wrapper,
  .ppt-viewer.ppt-viewer--presentation .ppt-slide-wrapper {
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
    max-height: none !important;
    aspect-ratio: auto !important;
    min-height: calc(100cqw * 9 / 16);
    overflow: visible !important;
  }

  .ppt-viewer:fullscreen .ppt-slide,
  .ppt-viewer:-webkit-full-screen .ppt-slide,
  .ppt-viewer.ppt-viewer--presentation .ppt-slide {
    height: auto !important;
    min-height: calc(100cqw * 9 / 16) !important;
    overflow: visible !important;
  }

  .ppt-viewer:fullscreen .ppt-slide.ppt-content,
  .ppt-viewer:-webkit-full-screen .ppt-slide.ppt-content,
  .ppt-viewer.ppt-viewer--presentation .ppt-slide.ppt-content {
    min-height: calc(100cqw * 9 / 16) !important;
  }

  .ppt-viewer:fullscreen .ppt-content-split,
  .ppt-viewer:-webkit-full-screen .ppt-content-split,
  .ppt-viewer.ppt-viewer--presentation .ppt-content-split,
  .ppt-viewer:fullscreen .ppt-content-items-split,
  .ppt-viewer:-webkit-full-screen .ppt-content-items-split,
  .ppt-viewer.ppt-viewer--presentation .ppt-content-items-split,
  .ppt-viewer:fullscreen .ppt-hero-left-split,
  .ppt-viewer:-webkit-full-screen .ppt-hero-left-split,
  .ppt-viewer.ppt-viewer--presentation .ppt-hero-left-split,
  .ppt-viewer:fullscreen .ppt-metric-content-split,
  .ppt-viewer:-webkit-full-screen .ppt-metric-content-split,
  .ppt-viewer.ppt-viewer--presentation .ppt-metric-content-split,
  .ppt-viewer:fullscreen .ppt-data-split,
  .ppt-viewer:-webkit-full-screen .ppt-data-split,
  .ppt-viewer.ppt-viewer--presentation .ppt-data-split,
  .ppt-viewer:fullscreen .ppt-col,
  .ppt-viewer:-webkit-full-screen .ppt-col,
  .ppt-viewer.ppt-viewer--presentation .ppt-col,
  .ppt-viewer:fullscreen .ppt-content-left,
  .ppt-viewer:-webkit-full-screen .ppt-content-left,
  .ppt-viewer.ppt-viewer--presentation .ppt-content-left,
  .ppt-viewer:fullscreen .ppt-right-items,
  .ppt-viewer:-webkit-full-screen .ppt-right-items,
  .ppt-viewer.ppt-viewer--presentation .ppt-right-items {
    flex: 0 1 auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .ppt-viewer:fullscreen .ppt-topic-grid,
  .ppt-viewer:-webkit-full-screen .ppt-topic-grid,
  .ppt-viewer.ppt-viewer--presentation .ppt-topic-grid,
  .ppt-viewer:fullscreen .ppt-topic-grid--fill,
  .ppt-viewer:-webkit-full-screen .ppt-topic-grid--fill,
  .ppt-viewer.ppt-viewer--presentation .ppt-topic-grid--fill {
    overflow: visible !important;

    .ppt-topic-card-body {
      overflow: visible !important;
    }
  }

  .ppt-viewer:fullscreen .ppt-chapter-image-page-body,
  .ppt-viewer:-webkit-full-screen .ppt-chapter-image-page-body,
  .ppt-viewer.ppt-viewer--presentation .ppt-chapter-image-page-body {
    min-height: auto;
  }

  .ppt-viewer {
    min-height: 0;
    flex: 1 1 auto;
  }

  .ppt-toolbar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 6px 8px;
  }

  .ppt-nav {
    justify-content: center;
    gap: 8px;
  }

  .ppt-nav-btn {
    width: 36px;
    height: 36px;
  }

  .ppt-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .ppt-title-label {
    display: none;
  }

  .ppt-share-trigger > span:not(.ppt-share-chevron) {
    display: none;
  }

  .ppt-share-trigger {
    padding: 6px 10px;
  }

  .ppt-fullscreen-btn > span {
    display: none;
  }

  .ppt-fullscreen-btn,
  .ppt-close-btn {
    min-width: 36px;
    min-height: 36px;
  }

  .ppt-share-menu {
    min-width: min(280px, calc(100vw - 24px));
    max-width: calc(100vw - 16px);
    right: 0;
    left: auto;
  }

  .ppt-slide-wrapper {
    --ppt-pad-y: clamp(10px, 2.5vw, 22px);
    --ppt-pad-x: clamp(12px, 3.5vw, 28px);
    --ppt-gap-lg: clamp(8px, 2vw, 16px);
    --ppt-gap-md: clamp(6px, 1.5vw, 12px);
    --ppt-fs-display: clamp(18px, 5.5vw, 32px);
    --ppt-fs-title: clamp(14px, 4vw, 22px);
    --ppt-fs-heading: clamp(13px, 3.5vw, 20px);
  }

  .ppt-content-split,
  .ppt-content-items-split,
  .ppt-hero-left-split,
  .ppt-metric-content-split,
  .ppt-data-split {
    flex-direction: column;
  }

  .ppt-content-left,
  .ppt-hero-left-split .ppt-hero-left-panel,
  .ppt-metric-content-split .ppt-metric-cards-side {
    flex: 0 0 auto;
    width: 100%;
    max-height: none;
  }

  .ppt-content-split--table-chart-dual .ppt-content-right {
    grid-template-columns: 1fr;
  }

  .ppt-topic-grid {
    grid-template-columns: 1fr;
  }

  .ppt-toc-grid--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ppt-speaker-notes-pane {
    max-height: min(120px, 22vh);
    padding: 8px 12px 10px;
    font-size: 11px;
  }

  .ppt-thumbs {
    padding: 6px 8px;
  }

  .ppt-thumb {
    min-width: 40px;
    padding: 4px 6px;
  }
}
</style>
