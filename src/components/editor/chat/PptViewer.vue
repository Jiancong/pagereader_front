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
      <div v-if="activeDocumentView === 'ppt'" class="ppt-nav">
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

      <div
        v-if="hasMarkdownDocument || activeDocumentView === 'ppt'"
        class="ppt-view-tabs-row"
      >
        <div v-if="hasMarkdownDocument" class="ppt-view-tabs" role="tablist">
          <button
            type="button"
            class="ppt-view-tab"
            :class="{ 'ppt-view-tab--active': activeDocumentView === 'ppt' }"
            role="tab"
            :aria-selected="activeDocumentView === 'ppt'"
            @click="activeDocumentView = 'ppt'"
          >
            {{ t("agent.pptViewDeck") }}
          </button>
          <button
            type="button"
            class="ppt-view-tab"
            :class="{ 'ppt-view-tab--active': activeDocumentView === 'markmap' }"
            role="tab"
            :aria-selected="activeDocumentView === 'markmap'"
            @click="activeDocumentView = 'markmap'"
          >
            {{ t("agent.pptViewMarkmap") }}
          </button>
        </div>
        <div v-if="activeDocumentView === 'ppt'" class="ppt-audio-actions">
          <button
            type="button"
            class="ppt-audio-btn"
            :class="{
              'ppt-audio-btn--active': ttsPlaying && !ttsPlayAllActive,
              'ppt-audio-btn--loading': ttsLoading,
            }"
            :disabled="ttsLoading || !canPlaySlideAudio"
            :aria-label="slideAudioButtonTitle"
            @click="toggleSlideAudio"
          >
            <span class="ppt-audio-btn-tooltip" role="tooltip">{{
              slideAudioButtonTitle
            }}</span>
            <svg
              v-if="ttsLoading"
              class="ppt-audio-btn-icon ppt-audio-btn-icon--spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="m16.24 16.24 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="m16.24 7.76 2.83-2.83" />
            </svg>
            <svg
              v-else-if="ttsPlaying && !ttsPlayAllActive"
              class="ppt-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg
              v-else
              class="ppt-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11 4.5a.75.75 0 0 1 1.19-.61l7.5 5.5a.75.75 0 0 1 0 1.22l-7.5 5.5A.75.75 0 0 1 11 15.5v-11Z" />
              <path d="M5 7.25A1.75 1.75 0 0 0 3.25 9v6A1.75 1.75 0 0 0 5 16.75h1.5a.75.75 0 0 0 .75-.75V8a.75.75 0 0 0-.75-.75H5Z" />
            </svg>
            <span class="ppt-audio-btn-label">{{ t("agent.pptAudioLabel") }}</span>
          </button>
          <button
            type="button"
            class="ppt-audio-btn ppt-audio-btn--all"
            :class="{
              'ppt-audio-btn--active': ttsPlayAllActive,
              'ppt-audio-btn--loading': ttsLoading,
            }"
            :disabled="ttsLoading || !canPlaySlideAudio"
            :aria-label="slideAudioPlayAllButtonTitle"
            @click="togglePlayAllSlideAudio"
          >
            <span class="ppt-audio-btn-tooltip" role="tooltip">{{
              slideAudioPlayAllButtonTitle
            }}</span>
            <svg
              v-if="ttsPlayAllActive"
              class="ppt-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg
              v-else
              class="ppt-audio-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 6.5a1 1 0 0 1 1.55-.83l8 5.5a1 1 0 0 1 0 1.66l-8 5.5A1 1 0 0 1 6 17.5v-11Z" />
              <path d="M17 6.5h1.75a1 1 0 0 1 1 1v8.75a1 1 0 0 1-1 1H17V6.5Z" />
              <path d="M20.75 9.25h1.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-1.5v-5.5Z" />
            </svg>
            <span class="ppt-audio-btn-label">{{ t("agent.pptAudioPlayAllLabel") }}</span>
          </button>
        </div>
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
    <div v-if="activeDocumentView === 'ppt'" class="ppt-stage">
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
          <PptEditorialBrutalistSlide
            v-if="shouldUseEditorialBrutalistSlide(slide, isEditorialBrutalistModern)"
            :slide="slide"
          />

          <PptModernLiterarySlide
            v-else-if="shouldUseModernLiterarySlide(slide, isModernLiteraryMinimal)"
            :slide="slide"
          />
          <PptClassicSlide v-else :slide="slide" />
        </template>
      </div>

      <div v-if="showSpeakerNotesBar" class="ppt-speaker-notes-pane">
        <div class="ppt-speaker-notes-label">{{ t("agent.pptSpeakerNotes") }}</div>
        <div class="ppt-speaker-notes-content">{{ slideSpeakerNotesText }}</div>
      </div>
    </div>

    <!-- 缩略图导航 -->
    <div v-else class="ppt-markmap-stage">
      <MarkdownMarkmapViewer :markdown="markdownDocument" />
    </div>

    <!-- 缩略图导航 -->
    <div v-if="activeDocumentView === 'ppt'" class="ppt-thumbs">
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
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount, provide } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { authApi } from "@/api";
import { generatePageTts } from "@/api/agent";
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
import PptEditorialBrutalistSlide from "@/components/editor/chat/ppt/themes/editorialBrutalist/PptEditorialBrutalistSlide.vue";
import PptModernLiterarySlide from "@/components/editor/chat/ppt/themes/modernLiterary/PptModernLiterarySlide.vue";
import PptClassicSlide from "@/components/editor/chat/ppt/themes/classic/PptClassicSlide.vue";
import { pptChartContextKey } from "@/components/editor/chat/ppt/pptChartContext";
import { pptClassicContextKey } from "@/components/editor/chat/ppt/pptClassicContext";
import { pptSlideEditorKey } from "@/components/editor/chat/ppt/pptSlideContext";
import {
  EDITORIAL_BRUTALIST_TEMPLATE_ID,
  MODERN_LITERARY_TEMPLATE_ID,
  shouldUseEditorialBrutalistSlide,
  shouldUseModernLiterarySlide,
} from "@/components/editor/chat/ppt/themes/registry";
import MarkdownMarkmapViewer from "@/components/editor/chat/MarkdownMarkmapViewer.vue";
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

import type {
  ChartDataItem,
  PptChart,
  PptData,
  PptSlide,
  PptTocEntry,
} from "@/components/editor/chat/ppt/types";
import {
  coerceContentItemText,
  displayText,
  parseTocDesc,
  parseTocTitle,
  pickDisplayString,
  resolveSlideBulletItems,
  resolveSlideBulletItemsRaw,
  rightItemDescription,
  rightItemTitle,
  splitContentItem,
  stripContentPointTitleMarkdown,
} from "@/components/editor/chat/ppt/shared/contentHelpers";
import {
  accentColorAt,
  ceilToNiceAxisMax,
  colorRelativeLuminance,
  DEFAULT_ACCENT,
  DEFAULT_HERO_GOLD,
  ensureReadablePaletteVars,
  normalizeAccentColor,
  parseCssColorToRgb,
  PIE_COLORS,
  resolveChartColorList,
  resolveDeckAccentColors,
  resolveMetricCardAccent,
} from "@/components/editor/chat/ppt/shared/paletteHelpers";
import {
  chartSecondarySeries,
  getStackedBarRowValues,
  normalizeChart,
} from "@/components/editor/chat/ppt/shared/normalizeChart";
import {
  normalizePptData,
  normalizeSlideData,
  resolveSlideSpeakerNotes,
} from "@/components/editor/chat/ppt/shared/normalizePptSlide";
import { buildTtsPagesFromPptData } from "@/utils/pptTtsPages";


const props = defineProps<{
  pptData: PptData;
  initialSlide?: number;
  /** 项目 ID，用于生成 /explore/project/{id} 分享链接 */
  projectId?: string;
  /** 后端返回的文章 markdown（兼容 markdow 字段），用于生成 markmap 文档图谱 */
  markdown?: string;
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
const activeDocumentView = ref<"ppt" | "markmap">("ppt");

const markdownDocument = computed(() => String(props.markdown || "").trim());
const hasMarkdownDocument = computed(() => markdownDocument.value.length > 0);

watch(hasMarkdownDocument, (available) => {
  if (!available) activeDocumentView.value = "ppt";
});

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

  if (activeDocumentView.value !== "ppt") return;

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
  void resolveTtsUserId();
  nextTick(() => {
    viewerRef.value?.focus();
    observeSlideWrapperSize();
    updatePresentationScale();
  });
});

onBeforeUnmount(() => {
  syncPptGoogleFontLinks([]);
  stopSlideAudio();
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
  normalizePptData(JSON.parse(JSON.stringify(props.pptData)), {
    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),
  }),
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
      editableData.value = normalizePptData(JSON.parse(JSON.stringify(newVal)), { comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel") });
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
  if (isEditorialBrutalistModern.value) {
    const colors = editorialBrutalistColors.value;
    const fonts = editorialBrutalistFonts.value;
    Object.assign(vars, {
      "--ppt-bg": colors.bg,
      "--ppt-bg-alt": colors.surface,
      "--ppt-bg-secondary": colors.surface,
      "--ppt-accent": colors.accent,
      "--ppt-text": colors.text,
      "--ppt-text-muted": colors.muted,
      "--ppt-text-secondary": colors.muted,
      "--ppt-rule-hair": `1px solid ${colors.text}`,
      "--ppt-rule-bold": `8px solid ${colors.text}`,
      "--ppt-rule-accent": `8px solid ${colors.accent}`,
      "--ppt-grid-gutter": "clamp(16px, 2vw, 32px)",
      "--ppt-font-display": fonts.display,
      "--ppt-font-heading": fonts.heading,
      "--ppt-font-body": fonts.body,
      "--ppt-font-family": fonts.body,
      "--ppt-quote-font-family": fonts.heading,
      fontFamily: fonts.body,
    });
    for (const source of [
      p?.css_variables,
      pptSource.value.html_template_recommendation?.css_variables,
    ]) {
      for (const [rawKey, rawValue] of Object.entries(source ?? {})) {
        if (rawValue == null || rawValue === "") continue;
        const key = rawKey.trim().replace(/^--/, "");
        const value = String(rawValue);
        if (key === "bg") vars["--ppt-bg"] = value;
        else if (key === "c-bg-alt" || key === "soft") {
          vars["--ppt-bg-alt"] = value;
          vars["--ppt-bg-secondary"] = value;
        } else if (key === "text" || key === "black") vars["--ppt-text"] = value;
        else if (key === "text-muted" || key === "muted") {
          vars["--ppt-text-muted"] = value;
          vars["--ppt-text-secondary"] = value;
        } else if (key === "accent" || key === "primary") vars["--ppt-accent"] = value;
      }
    }
    vars["--ppt-rule-hair"] = `1px solid ${vars["--ppt-text"] || colors.text}`;
    vars["--ppt-rule-bold"] = `8px solid ${vars["--ppt-text"] || colors.text}`;
    vars["--ppt-rule-accent"] = `8px solid ${vars["--ppt-accent"] || colors.accent}`;
  }
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
  if (isContentMetricChartSlide(slide)) return false;
  const cards = slideMetricCards(slide).length;
  const layout = slideEmphasisLayout(slide);
  return cards >= 2 && layout !== "metric_cards_row";
}

function shouldShowMetricCardInline(slide: PptSlide | undefined): boolean {
  if (isHeroLeftSlide(slide)) return false;
  if (isContentMetricChartSlide(slide)) return false;
  return slideMetricCards(slide).length === 1;
}

/**
 * data 页同时有 content + metric_cards + chart：
 * 一侧统一展示 content，另一侧把 metric_cards 叠在图表上方。
 * 排除显式的 metric_cards_row / metric-chart-split，以保留作者指定的布局。
 */
function isContentMetricChartSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "data") return false;
  if (!slide.chart) return false;
  if ((slide.metric_cards?.length ?? 0) < 1) return false;
  if (slideEmphasisLayout(slide) === "metric_cards_row") return false;
  if (isMetricCardsChartSplitSlide(slide)) return false;
  return resolveSlideBulletItems(slide).length > 0;
}

function isHeroLeftSlide(slide: PptSlide | undefined): boolean {
  if (isContentMetricChartSlide(slide)) return false;
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
  if (isContentMetricChartSlide(slide)) return false;
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

/**
 * 解析 TOC 条目的标题部分
 * 支持格式："01 市场现状 — 行业底部确认，止跌回稳" 或 "市场现状"
 */

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

function editorialBrutalistCardGridDensity(
  slide: PptSlide,
): "default" | "medium" | "compact" {
  if (slide.layout === "toc") return tocDensityLevel(slide);
  const cards = editorialBrutalistContentCards(slide);
  const count = Math.max(cards.length, resolveSlideBulletItems(slide).length);
  const maxBodyLen = cards.reduce((max, card) => Math.max(max, (card.body || card.title || "").length), 0);
  if (count >= 6 || maxBodyLen >= 120) return "compact";
  if (count >= 4 || maxBodyLen >= 50) return "medium";
  if (count >= 3 || maxBodyLen >= 30) return "medium";
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


/** 无图表 topic 卡网格：2+ 项时均分剩余高度，避免卡片缩在顶部留白 */
function topicGridFillStyle(slide: PptSlide | undefined): Record<string, string> {
  const count = resolveSlideBulletItems(slide).length;
  if (count < 2) return {};
  const cols = count <= 3 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  return { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` };
}

/** 当前数据源：编辑/查看均规范化 content、chart 等，避免对象形态 content 无法解析 */
/** 当前数据源：编辑/查看均规范化 content、chart 等，避免对象形态 content 无法解析 */
const pptSource = computed<PptData>(() => {
  const base = isEditing.value ? editableData.value : props.pptData;
  return normalizePptData(base, {
    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),
  });
});

// 当前幻灯片（导出时可能被 overrideContent 覆盖；须在字体 watch immediate 之前定义）
const slideForExport = computed<PptSlide | null>(() => {
  const source = pptSource.value;
  const s = source.slides[currentSlide.value] ?? null;
  if (!s) return null;
  const base =
    overrideContent.value === null ? s : { ...s, content: overrideContent.value };
  return normalizeSlideData(base, {
    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),
  });
});

const slide = computed(() => slideForExport.value);

const ttsUserId = ref<number | null>(null);
const ttsLoading = ref(false);
const ttsPlaying = ref(false);
const ttsPlayAllActive = ref(false);
const ttsAutoAdvancing = ref(false);
const ttsItemsByPage = ref<Record<number, string>>({});
const ttsDeckKey = ref("");
let slideAudioEl: HTMLAudioElement | null = null;
let slideBgmEl: HTMLAudioElement | null = null;

const PPT_PLAY_ALL_BGM_URL = "/resources/track1.mp3";
const PPT_PLAY_ALL_BGM_VOLUME = 0.22;

const canPlaySlideAudio = computed(
  () =>
    Boolean(props.projectId?.trim()) &&
    ttsUserId.value != null &&
    pptSource.value.slides.length > 0,
);

const slideAudioButtonTitle = computed(() => {
  if (ttsLoading.value) return t("agent.pptAudioGenerating");
  if (!props.projectId?.trim()) return t("agent.pptAudioNoProject");
  if (!ttsUserId.value) return t("agent.pptAudioLoginRequired");
  if (ttsPlaying.value && !ttsPlayAllActive.value) return t("agent.pptAudioPause");
  return t("agent.pptAudioPlay");
});

const slideAudioPlayAllButtonTitle = computed(() => {
  if (ttsLoading.value) return t("agent.pptAudioGenerating");
  if (!props.projectId?.trim()) return t("agent.pptAudioNoProject");
  if (!ttsUserId.value) return t("agent.pptAudioLoginRequired");
  if (ttsPlayAllActive.value) return t("agent.pptAudioPlayAllStop");
  return t("agent.pptAudioPlayAll");
});

function resetSlideAudioCache() {
  ttsItemsByPage.value = {};
  ttsDeckKey.value = "";
}

function releaseSlideAudioEl() {
  if (slideAudioEl) {
    slideAudioEl.pause();
    slideAudioEl.onended = null;
    slideAudioEl.onerror = null;
    slideAudioEl = null;
  }
  ttsPlaying.value = false;
}

function stopSlideBgm() {
  if (slideBgmEl) {
    slideBgmEl.pause();
    slideBgmEl.onerror = null;
    slideBgmEl = null;
  }
}

async function startSlideBgm() {
  stopSlideBgm();
  slideBgmEl = new Audio(PPT_PLAY_ALL_BGM_URL);
  slideBgmEl.loop = true;
  slideBgmEl.volume = PPT_PLAY_ALL_BGM_VOLUME;
  slideBgmEl.onerror = () => {
    stopSlideBgm();
  };
  try {
    await slideBgmEl.play();
  } catch {
    stopSlideBgm();
  }
}

function finishPlayAll() {
  ttsPlayAllActive.value = false;
  stopSlideBgm();
}

function stopSlideAudio() {
  releaseSlideAudioEl();
  finishPlayAll();
}

function findNextPlayableSlideIndex(
  fromIndex: number,
  items: Record<number, string>,
): number {
  const total = pptSource.value.slides.length;
  for (let i = fromIndex; i < total; i++) {
    if (items[i + 1]) return i;
  }
  return -1;
}

async function goToSlideForAudio(index: number) {
  ttsAutoAdvancing.value = true;
  currentSlide.value = index;
  await nextTick();
  ttsAutoAdvancing.value = false;
}

function currentTtsDeckKey(): string {
  return [
    props.projectId?.trim() ?? "",
    pptSource.value.total_slides,
    pptSource.value.title,
  ].join("|");
}

async function resolveTtsUserId(): Promise<number | null> {
  if (ttsUserId.value != null) return ttsUserId.value;
  try {
    const detail = await authApi.getCurrentDetail();
    const id = detail?.id != null ? Number(detail.id) : NaN;
    ttsUserId.value = Number.isFinite(id) ? id : null;
  } catch {
    ttsUserId.value = null;
  }
  return ttsUserId.value;
}

async function ensureSlideAudioItems(): Promise<Record<number, string>> {
  const projectId = props.projectId?.trim();
  if (!projectId) throw new Error(t("agent.pptAudioNoProject"));

  const userId = await resolveTtsUserId();
  if (!userId) throw new Error(t("agent.pptAudioLoginRequired"));

  const deckKey = currentTtsDeckKey();
  if (ttsDeckKey.value !== deckKey) {
    resetSlideAudioCache();
    ttsDeckKey.value = deckKey;
  }

  if (Object.keys(ttsItemsByPage.value).length > 0) {
    return ttsItemsByPage.value;
  }

  ttsLoading.value = true;
  try {
    const result = await generatePageTts({
      projectId,
      userId,
      pages: buildTtsPagesFromPptData(pptSource.value),
    });
    const playable = (result?.items ?? []).filter((item) => item.url);
    if (!playable.length) {
      throw new Error(t("agent.pptAudioNoSlide"));
    }

    const map: Record<number, string> = {};
    for (const item of playable) {
      if (item.url) map[item.page] = item.url;
    }
    ttsItemsByPage.value = map;
    return map;
  } finally {
    ttsLoading.value = false;
  }
}

async function playSlideAudioAt(
  slideIndex: number,
  items: Record<number, string>,
  playAll: boolean,
) {
  const url = items[slideIndex + 1];
  if (!url) {
    if (playAll) {
      const nextIndex = findNextPlayableSlideIndex(slideIndex + 1, items);
      if (nextIndex >= 0) {
        await goToSlideForAudio(nextIndex);
        await playSlideAudioAt(nextIndex, items, true);
      } else {
        finishPlayAll();
      }
      return;
    }
    ElMessage.warning(t("agent.pptAudioNoSlide"));
    return;
  }

  releaseSlideAudioEl();
  if (playAll) ttsPlayAllActive.value = true;

  slideAudioEl = new Audio(url);
  slideAudioEl.onended = () => {
    releaseSlideAudioEl();
    if (!ttsPlayAllActive.value) return;

    const nextIndex = findNextPlayableSlideIndex(slideIndex + 1, items);
    if (nextIndex >= 0) {
      void (async () => {
        await goToSlideForAudio(nextIndex);
        if (!ttsPlayAllActive.value) return;
        await playSlideAudioAt(nextIndex, items, true);
      })();
      return;
    }
    finishPlayAll();
  };
  slideAudioEl.onerror = () => {
    stopSlideAudio();
    ElMessage.error(t("agent.pptAudioFailed"));
  };
  await slideAudioEl.play();
  ttsPlaying.value = true;
}

async function playSlideAudio(slideIndex = currentSlide.value) {
  try {
    const items = await ensureSlideAudioItems();
    await playSlideAudioAt(slideIndex, items, false);
  } catch (error) {
    stopSlideAudio();
    ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"));
  }
}

async function playAllSlideAudio(fromIndex = currentSlide.value) {
  try {
    const items = await ensureSlideAudioItems();
    let startIndex = fromIndex;
    if (!items[startIndex + 1]) {
      const nextIndex = findNextPlayableSlideIndex(startIndex, items);
      if (nextIndex < 0) {
        ElMessage.warning(t("agent.pptAudioNoSlide"));
        return;
      }
      startIndex = nextIndex;
      await goToSlideForAudio(startIndex);
    }
    ttsPlayAllActive.value = true;
    await startSlideBgm();
    await playSlideAudioAt(startIndex, items, true);
  } catch (error) {
    stopSlideAudio();
    ElMessage.error(error instanceof Error ? error.message : t("agent.pptAudioFailed"));
  }
}

async function toggleSlideAudio() {
  if (ttsPlaying.value) {
    stopSlideAudio();
    return;
  }
  await playSlideAudio(currentSlide.value);
}

async function togglePlayAllSlideAudio() {
  if (ttsPlayAllActive.value) {
    stopSlideAudio();
    return;
  }
  if (ttsPlaying.value) stopSlideAudio();
  await playAllSlideAudio(currentSlide.value);
}

watch(currentSlide, () => {
  if (ttsAutoAdvancing.value) return;
  if (ttsPlaying.value || ttsPlayAllActive.value) stopSlideAudio();
});

watch(
  () => props.pptData,
  () => {
    resetSlideAudioCache();
    stopSlideAudio();
  },
  { deep: true },
);

const EDITORIAL_BRUTALIST_DEFAULT_GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700;900&display=swap";
const EDITORIAL_BRUTALIST_ZH_STACK =
  '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "OPPO Sans", "Alibaba PuHuiTi 2.0", "方正兰亭黑", sans-serif';
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

const editorialBrutalistTokens = computed(
  () =>
    pptSource.value.palette?.theme_tokens ??
    pptSource.value.html_template_recommendation?.theme_tokens ??
    {}
);
const editorialBrutalistTemplateId = computed(
  () =>
    editorialBrutalistTokens.value.template_id ||
    pptSource.value.html_template_recommendation?.template_id ||
    pptSource.value.theme ||
    ""
);
const isEditorialBrutalistModern = computed(
  () =>
    [
      pptSource.value.theme,
      editorialBrutalistTokens.value.template_id,
      pptSource.value.html_template_recommendation?.template_id,
    ].includes(EDITORIAL_BRUTALIST_TEMPLATE_ID)
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

const editorialBrutalistColors = computed(() => {
  const palette = pptSource.value.palette || {};
  return {
    bg: palette.bg_color || "#ffffff",
    surface: palette.bg_color_secondary || "#f5f5f5",
    accent: palette.accent_color || "#ff3300",
    text: palette.text_color || "#000000",
    muted: palette.text_secondary || "#666666",
  };
});

const editorialBrutalistFonts = computed(() => {
  const typography = editorialBrutalistTokens.value.typography || {};
  const display = typography.font_display || "Anton";
  const heading = typography.font_heading || "Archivo";
  const body = typography.font_body || "Inter";
  return {
    display: `${display}, ${EDITORIAL_BRUTALIST_ZH_STACK}`,
    heading: `${heading}, ${EDITORIAL_BRUTALIST_ZH_STACK}`,
    body: `${body}, ${EDITORIAL_BRUTALIST_ZH_STACK}`,
  };
});

const editorialBrutalistGoogleFontUrls = computed(() => {
  const urls =
    pptSource.value.palette?.theme_tokens?.typography?.google_fonts_urls ??
    pptSource.value.html_template_recommendation?.theme_tokens?.typography?.google_fonts_urls ??
    [];
  if (!isEditorialBrutalistModern.value) return urls;
  return [...new Set([...urls, EDITORIAL_BRUTALIST_DEFAULT_GOOGLE_FONTS])];
});

const pptGoogleFontUrls = computed(() => {
  if (isEditorialBrutalistModern.value) return editorialBrutalistGoogleFontUrls.value;
  return modernLiteraryGoogleFontUrls.value;
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
    if (isModernLiteraryMinimal.value || isEditorialBrutalistModern.value) return;
    void loadFont(family);
  },
  { immediate: true }
);

watch(
  () => (isEditorialBrutalistModern.value ? editorialBrutalistFonts.value : null),
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
  pptGoogleFontUrls,
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
  onDocumentFigureCaptionBlur,
  onDocumentFigureLeftItemBlur,
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
  normalizeAccentColor,
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
  &:fullscreen .ppt-markmap-stage,
  &:-webkit-full-screen .ppt-markmap-stage,
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

  &.ppt-viewer--presentation .ppt-markmap-stage {
    flex: 1 1 0%;
    min-height: 0;
    width: 100%;
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

.ppt-view-tabs-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  margin-left: 14px;
}

.ppt-view-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.ppt-audio-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ppt-audio-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px 0 10px;
  border: 1px solid rgba(126, 210, 164, 0.55);
  border-radius: 999px;
  background: rgba(126, 210, 164, 0.16);
  color: #d8f5e4;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 0 0 1px rgba(126, 210, 164, 0.08);

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    color: #fff;
    background: rgba(126, 210, 164, 0.28);
    border-color: rgba(158, 230, 188, 0.85);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  }

  &:focus-visible {
    outline: 2px solid rgba(158, 230, 188, 0.65);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.ppt-audio-btn--active {
  background: #eef8f1;
  border-color: rgba(126, 210, 164, 0.75);
  color: #1f3d2d;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.ppt-audio-btn-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
}

.ppt-audio-btn-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 20;
  padding: 6px 10px;
  border: 1px solid rgba(126, 210, 164, 0.35);
  border-radius: 8px;
  background: rgba(18, 28, 22, 0.96);
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease,
    transform 0.15s ease;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(18, 28, 22, 0.96);
  }
}

.ppt-audio-btn:hover .ppt-audio-btn-tooltip,
.ppt-audio-btn:focus-visible .ppt-audio-btn-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.ppt-audio-btn-icon {
  display: block;
  flex-shrink: 0;
}

.ppt-audio-btn-icon--spin {
  animation: ppt-audio-spin 0.9s linear infinite;
}

@keyframes ppt-audio-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ppt-view-tab {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.58);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 7px 12px;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    color: rgba(255, 255, 255, 0.88);
  }
}

.ppt-view-tab--active {
  background: #f5f7f3;
  color: #27332b;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);

  &:hover {
    color: #27332b;
  }
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

.ppt-markmap-stage {
  flex: 1 1 auto;
  min-height: 560px;
  overflow: hidden;
  padding: 0;
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
/* ── Mobile layout (≤767px) ── */
@media (max-width: 767px) {
  .ppt-viewer-shell {
    flex-direction: column;
    width: 100vw;
    max-width: 100vw;
    margin: 0 calc(50% - 50vw);
    border-right: 0;
    border-left: 0;
    border-radius: 0;
    overflow: hidden;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) {
    background: #0a0c12;
    overflow: hidden;
    touch-action: pan-y;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-stage {
    flex: 0 1 auto;
    min-height: auto;
    max-width: 100%;
    padding: 6px 0 8px;
    background: #0a0c12;
    overflow: hidden;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-slide-wrapper {
    aspect-ratio: 16 / 9;
    height: auto;
    min-height: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .ppt-viewer:not(.ppt-viewer--presentation):not(:fullscreen):not(:-webkit-full-screen) .ppt-slide {
    height: 100%;
    min-height: 0;
    justify-content: flex-start;
    overflow: hidden;
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
    grid-template-columns: auto 1fr auto;
    gap: 6px 8px;
    align-items: center;
    padding: 7px 8px;
    min-width: 0;
  }

  .ppt-nav {
    grid-column: 1;
    grid-row: 1;
    justify-content: flex-start;
    gap: 8px;
  }

  .ppt-nav-btn {
    width: 32px;
    height: 32px;
  }

  .ppt-page-info {
    min-width: 44px;
    font-size: 11px;
  }

  .ppt-actions {
    grid-column: 3;
    grid-row: 1;
    width: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    justify-self: end;
    gap: 5px;
    min-width: 0;
  }

  .ppt-view-tabs-row {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    min-width: 0;
    margin: 0;
    justify-content: space-between;
    flex-wrap: nowrap;
    gap: 6px;
  }

  .ppt-view-tabs {
    flex: 0 1 auto;
    max-width: 100%;
    min-width: 0;
    padding: 2px;
  }

  .ppt-view-tab {
    padding: 6px 10px;
    font-size: 11px;
  }

  .ppt-audio-actions {
    gap: 5px;
    min-width: 0;
  }

  .ppt-audio-btn {
    height: 30px;
    gap: 4px;
    padding: 0 9px 0 8px;
  }

  .ppt-audio-btn-label {
    font-size: 11px;
  }

  .ppt-audio-btn-tooltip {
    display: none;
  }

  .ppt-title-label {
    display: none;
  }

  .ppt-share-trigger > span:not(.ppt-share-chevron) {
    display: none;
  }

  .ppt-share-trigger {
    min-width: 32px;
    min-height: 32px;
    justify-content: center;
    padding: 6px 8px;
  }

  .ppt-fullscreen-btn > span {
    display: none;
  }

  .ppt-fullscreen-btn,
  .ppt-close-btn {
    min-width: 32px;
    min-height: 32px;
  }

  .ppt-fullscreen-btn {
    justify-content: center;
    padding: 6px 8px;
  }

  .ppt-share-menu {
    position: fixed;
    top: auto;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    left: 8px;
    z-index: 12060;
    min-width: 0;
    max-width: none;
    max-height: min(420px, 68dvh);
    overflow-y: auto;
    border-radius: 16px;
    padding: 8px;
    -webkit-overflow-scrolling: touch;
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34), 0 4px 16px rgba(0, 0, 0, 0.18);
  }

  .ppt-share-item {
    grid-template-columns: 44px minmax(0, 1fr) 28px;
    min-height: 46px;
  }

  .ppt-share-item-brand {
    min-width: 44px;
  }

  .ppt-share-item-label {
    min-width: 0;
    padding: 0 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .ppt-thumbs {
    display: none;
  }

  .ppt-thumb {
    min-width: 40px;
    padding: 4px 6px;
  }

  .ppt-speaker-notes-pane {
    display: none;
  }
}
</style>
