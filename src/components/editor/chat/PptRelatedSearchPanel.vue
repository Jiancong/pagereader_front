<template>

  <Teleport to="body">

    <div

      v-if="visible"

      class="ppt-related-search-overlay"

      :style="{ zIndex: overlayZIndex }"

      @click.self="emit('close')"

    >

      <div class="ppt-related-search-panel" role="dialog" aria-modal="true">

        <header class="ppt-related-search-header">

          <div class="ppt-related-search-heading">

            <h3 class="ppt-related-search-title">

              {{ t("agent.pptRelatedSearchTitle", { term }) }}

            </h3>

            <p class="ppt-related-search-subtitle">

              {{ t("agent.pptRelatedSearchHint") }}

            </p>

          </div>

          <div class="ppt-related-search-header-actions">

            <button

              type="button"

              class="ppt-related-search-font-btn"

              :aria-label="t('agent.pptRelatedSearchIncreaseFont')"

              :title="t('agent.pptRelatedSearchIncreaseFont')"

              :disabled="contentFontSize >= MAX_CONTENT_FONT_SIZE"

              @click="increaseContentFontSize"

            >

              A+

            </button>

            <button

              type="button"

              class="ppt-related-search-close"

              :aria-label="t('editor.close')"

              @click="emit('close')"

            >

              ×

            </button>

          </div>

        </header>



        <div v-if="loading" class="ppt-related-search-loading">

          <span class="ppt-related-search-spinner" aria-hidden="true"></span>

          <span>{{ t("agent.pptRelatedSearchLoading") }}</span>

        </div>



        <div v-else-if="error" class="ppt-related-search-error">

          {{ errorMessage }}

        </div>



        <div

          v-else-if="content.trim() || imageResults.length"

          class="ppt-related-search-body"

          :style="bodyFontStyle"

          @contextmenu.prevent="onPanelContextMenu"

        >

          <div

            v-if="isSearchResponse || isRagResponse || knowledgeBased"

            class="ppt-related-search-badge"

          >

            <template v-if="isSearchResponse">

              <i class="bi bi-search"></i>{{ t("agent.sourceFromSearch") }}

            </template>

            <template v-else-if="knowledgeBased">

              <i class="bi bi-book"></i>{{ t("agent.sourceFromKnowledge") }}

            </template>

            <template v-else-if="isRagResponse">

              <i class="bi bi-stars"></i>{{ t("agent.sourceFromRag") }}

            </template>

          </div>

          <ChatMarkdownBody

            v-if="content.trim()"

            :content="content"

            root-class="ppt-related-search-md"

          />

          <section v-if="imageResults.length" class="ppt-related-search-images">

            <div class="ppt-related-search-images-title">

              <i class="bi bi-images"></i>

              <span>{{ t("agent.imageResults") }}</span>

              <span class="ppt-related-search-images-count">{{ imageResults.length }}</span>

            </div>

            <div class="ppt-related-search-image-grid">

              <button

                v-for="(img, index) in imageResults"

                :key="`${img.url}-${index}`"

                type="button"

                class="ppt-related-search-image-item"

                @click="previewImage = img"

              >

                <img

                  :src="img.thumbnail || img.url"

                  :alt="img.title || img.caption || `image-${index + 1}`"

                  class="ppt-related-search-image-thumb"

                  loading="lazy"

                />

                <div class="ppt-related-search-image-overlay">

                  <i class="bi bi-zoom-in"></i>

                </div>

                <p v-if="img.title || img.caption" class="ppt-related-search-image-caption">

                  {{ img.title || img.caption }}

                </p>

              </button>

            </div>

          </section>

        </div>



        <div v-else class="ppt-related-search-empty">

          {{ t("agent.pptRelatedSearchEmpty") }}

        </div>

      </div>

    </div>



    <PptContextMenu

      :show="contextMenuVisible"

      :x="contextMenuX"

      :y="contextMenuY"

      :selection-text="contextSelection"

      :z-index="contextMenuZIndex"

      @related-search="onNestedRelatedSearch"

      @close="closeContextMenu"

    />



    <PptRelatedSearchPanel

      v-if="searchContext && childSearchState.visible"

      :visible="childSearchState.visible"

      :term="childSearchState.term"

      :content="childSearchState.content"

      :image-results="childSearchState.imageResults"

      :loading="childSearchState.loading"

      :error="childSearchState.error"

      :is-rag-response="childSearchState.isRagResponse"

      :knowledge-based="childSearchState.knowledgeBased"

      :is-search-response="childSearchState.isSearchResponse"

      :stack-depth="stackDepth + 1"

      :search-context="searchContext"

      @close="onChildPanelClose"

    />



    <div

      v-if="previewImage"

      class="ppt-related-search-preview-mask"

      :style="{ zIndex: previewZIndex }"

      @click="previewImage = null"

    >

      <div class="ppt-related-search-preview-box" @click.stop>

        <img

          :src="previewImage.url"

          :alt="previewImage.title || previewImage.caption || ''"

          class="ppt-related-search-preview-img"

        />

        <div class="ppt-related-search-preview-footer">

          <span class="ppt-related-search-preview-title">

            {{ previewImage.title || previewImage.caption || "" }}

          </span>

          <a

            v-if="previewImage.pageUrl"

            :href="previewImage.pageUrl"

            target="_blank"

            rel="noopener noreferrer"

            class="ppt-related-search-preview-link"

            @click.stop

          >

            <i class="bi bi-box-arrow-up-right"></i>

            {{ t("agent.viewSource") }}

          </a>

        </div>

        <button

          type="button"

          class="ppt-related-search-preview-close"

          :aria-label="t('editor.close')"

          @click="previewImage = null"

        >

          ×

        </button>

      </div>

    </div>

  </Teleport>

</template>



<script setup lang="ts">

import { computed, onBeforeUnmount, ref, watch } from "vue";

import { useI18n } from "vue-i18n";

import { ElMessage } from "element-plus";

import ChatMarkdownBody from "@/components/editor/chat/ChatMarkdownBody.vue";

import PptContextMenu from "@/components/editor/chat/PptContextMenu.vue";

import PptRelatedSearchPanel from "@/components/editor/chat/PptRelatedSearchPanel.vue";

import {

  usePptRelatedSearch,

  type PptRelatedSearchContext,

  type PptRelatedSearchImage,

} from "@/composables/usePptRelatedSearch";

import { resolveContextSelectionText } from "@/utils/pptContextSelection";



defineOptions({ name: "PptRelatedSearchPanel" });



const props = defineProps<{

  visible: boolean;

  term: string;

  content: string;

  imageResults?: PptRelatedSearchImage[];

  loading: boolean;

  error: string | null;

  isRagResponse?: boolean;

  knowledgeBased?: boolean;

  isSearchResponse?: boolean;

  stackDepth?: number;

  searchContext?: PptRelatedSearchContext;

}>();



const emit = defineEmits<{

  (e: "close"): void;

}>();



const { t } = useI18n();

const previewImage = ref<PptRelatedSearchImage | null>(null);

const contextMenuVisible = ref(false);

const contextMenuX = ref(0);

const contextMenuY = ref(0);

const contextSelection = ref("");

const DEFAULT_CONTENT_FONT_SIZE = 14;

const MAX_CONTENT_FONT_SIZE = 24;

const CONTENT_FONT_SIZE_STEP = 2;

const contentFontSize = ref(DEFAULT_CONTENT_FONT_SIZE);

const bodyFontStyle = computed(() => ({

  "--ppt-related-search-font-size": `${contentFontSize.value}px`,

}));

function increaseContentFontSize() {

  if (contentFontSize.value >= MAX_CONTENT_FONT_SIZE) return;

  contentFontSize.value = Math.min(

    MAX_CONTENT_FONT_SIZE,

    contentFontSize.value + CONTENT_FONT_SIZE_STEP

  );

}



const stackDepth = computed(() => props.stackDepth ?? 0);

const overlayZIndex = computed(() => 12040 + stackDepth.value * 40);

const contextMenuZIndex = computed(() => overlayZIndex.value + 10);

const previewZIndex = computed(() => overlayZIndex.value + 20);



const imageResults = computed(() => props.imageResults ?? []);



const {

  state: childSearchState,

  runRelatedSearch: runChildRelatedSearch,

  closePanel: closeChildRelatedSearchPanel,

  closeStream: closeChildRelatedSearchStream,

} = usePptRelatedSearch();



function closeContextMenu() {

  contextMenuVisible.value = false;

}



function onPanelContextMenu(event: MouseEvent) {

  if (!props.searchContext) return;

  contextSelection.value = resolveContextSelectionText(event);

  contextMenuX.value = event.clientX;

  contextMenuY.value = event.clientY;

  contextMenuVisible.value = true;

}



function onContextMenuPointerDown(event: PointerEvent) {

  if (!contextMenuVisible.value) return;

  const target = event.target as Element | null;

  if (target?.closest?.(".ppt-context-menu")) return;

  closeContextMenu();

}



async function onNestedRelatedSearch() {

  const term = contextSelection.value.trim();

  if (!term) {

    ElMessage.warning(t("agent.pptRelatedSearchSelectText"));

    return;

  }

  if (!props.searchContext) return;

  closeContextMenu();

  await runChildRelatedSearch({

    term,

    pptTitle: props.searchContext.pptTitle,

    projectId: props.searchContext.projectId,

    uploadedDocuments: props.searchContext.uploadedDocuments,

    buildMessage: props.searchContext.buildMessage,

  });

}



function onChildPanelClose() {

  closeChildRelatedSearchPanel();

}



function onPanelKeydown(event: KeyboardEvent) {

  if (!props.visible || event.key !== "Escape") return;

  if (childSearchState.value.visible) return;



  if (previewImage.value) {

    event.preventDefault();

    previewImage.value = null;

    return;

  }

  if (contextMenuVisible.value) {

    event.preventDefault();

    closeContextMenu();

    return;

  }

  event.preventDefault();

  emit("close");

}



function bindPanelListeners() {

  document.addEventListener("pointerdown", onContextMenuPointerDown);

  window.addEventListener("keydown", onPanelKeydown);

}



function unbindPanelListeners() {

  document.removeEventListener("pointerdown", onContextMenuPointerDown);

  window.removeEventListener("keydown", onPanelKeydown);

}



watch(

  () => props.visible,

  (visible) => {

    if (!visible) {

      previewImage.value = null;

      contentFontSize.value = DEFAULT_CONTENT_FONT_SIZE;

      closeContextMenu();

      closeChildRelatedSearchStream();

      closeChildRelatedSearchPanel();

      unbindPanelListeners();

      return;

    }

    bindPanelListeners();

  },

  { immediate: true }

);



onBeforeUnmount(() => {

  unbindPanelListeners();

  closeChildRelatedSearchStream();

  closeContextMenu();

});



const errorMessage = computed(() => {

  if (props.error === "login_required") {

    return t("editor.loginRequired");

  }

  if (props.error === "empty") {

    return t("agent.pptRelatedSearchEmpty");

  }

  return t("agent.pptRelatedSearchFailed");

});

</script>



<style scoped lang="scss">

.ppt-related-search-overlay {

  position: fixed;

  inset: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 24px;

  background: rgba(0, 0, 0, 0.55);

  backdrop-filter: blur(2px);

}



.ppt-related-search-panel {

  width: min(720px, 100%);

  max-height: min(78vh, 860px);

  display: flex;

  flex-direction: column;

  background: #1f1f1f;

  border: 1px solid rgba(255, 255, 255, 0.08);

  border-radius: 14px;

  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);

  overflow: hidden;

}



.ppt-related-search-header {

  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 16px;

  padding: 18px 20px 14px;

  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

}



.ppt-related-search-title {

  margin: 0;

  font-size: 18px;

  line-height: 1.35;

  color: #f3f3f3;

}



.ppt-related-search-subtitle {

  margin: 6px 0 0;

  font-size: 13px;

  color: rgba(255, 255, 255, 0.55);

}



.ppt-related-search-header-actions {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-shrink: 0;

}



.ppt-related-search-font-btn {

  min-width: 40px;

  height: 32px;

  padding: 0 10px;

  border: 1px solid rgba(255, 255, 255, 0.14);

  border-radius: 8px;

  background: rgba(255, 255, 255, 0.06);

  color: rgba(255, 255, 255, 0.86);

  font-size: 13px;

  font-weight: 600;

  line-height: 1;

  cursor: pointer;



  &:hover:not(:disabled) {

    background: rgba(255, 255, 255, 0.12);

    color: #fff;

  }



  &:disabled {

    opacity: 0.4;

    cursor: not-allowed;

  }

}



.ppt-related-search-close {

  border: none;

  background: transparent;

  color: rgba(255, 255, 255, 0.72);

  font-size: 28px;

  line-height: 1;

  cursor: pointer;

  padding: 0 4px;



  &:hover {

    color: #fff;

  }

}



.ppt-related-search-loading,

.ppt-related-search-error,

.ppt-related-search-empty {

  padding: 28px 24px 32px;

  color: rgba(255, 255, 255, 0.78);

  font-size: 14px;

}



.ppt-related-search-loading {

  display: flex;

  align-items: center;

  gap: 12px;

}



.ppt-related-search-spinner {

  width: 18px;

  height: 18px;

  border: 2px solid rgba(255, 255, 255, 0.18);

  border-top-color: #409eff;

  border-radius: 50%;

  animation: ppt-related-spin 0.8s linear infinite;

}



.ppt-related-search-body {

  padding: 18px 22px 24px;

  overflow: auto;

  user-select: text;

  --ppt-related-search-font-size: 14px;

}



.ppt-related-search-badge {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  margin-bottom: 14px;

  padding: 4px 10px;

  border-radius: 999px;

  background: rgba(64, 158, 255, 0.12);

  color: #8ec5ff;

  font-size: 12px;

}



@keyframes ppt-related-spin {

  to {

    transform: rotate(360deg);

  }

}



:deep(.ppt-related-search-md) {

  color: #ececec;

  font-size: var(--ppt-related-search-font-size, 14px);

  line-height: 1.7;

}



.ppt-related-search-images {

  margin-top: 18px;

  padding-top: 18px;

  border-top: 1px solid rgba(255, 255, 255, 0.08);

}



.ppt-related-search-images-title {

  display: flex;

  align-items: center;

  gap: 8px;

  margin-bottom: 12px;

  color: rgba(255, 255, 255, 0.82);

  font-size: 13px;

  font-weight: 600;

}



.ppt-related-search-images-count {

  min-width: 20px;

  padding: 0 7px;

  border-radius: 999px;

  background: rgba(255, 255, 255, 0.08);

  color: rgba(255, 255, 255, 0.62);

  font-size: 12px;

  line-height: 20px;

  text-align: center;

}



.ppt-related-search-image-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));

  gap: 12px;

}



.ppt-related-search-image-item {

  position: relative;

  display: flex;

  flex-direction: column;

  gap: 8px;

  padding: 0;

  border: 1px solid rgba(255, 255, 255, 0.08);

  border-radius: 10px;

  background: rgba(255, 255, 255, 0.03);

  overflow: hidden;

  cursor: pointer;

  text-align: left;



  &:hover .ppt-related-search-image-overlay {

    opacity: 1;

  }

}



.ppt-related-search-image-thumb {

  width: 100%;

  aspect-ratio: 4 / 3;

  object-fit: cover;

  display: block;

  background: rgba(255, 255, 255, 0.04);

}



.ppt-related-search-image-overlay {

  position: absolute;

  inset: 0 0 auto 0;

  height: calc(100% - 42px);

  display: flex;

  align-items: center;

  justify-content: center;

  background: rgba(0, 0, 0, 0.35);

  color: #fff;

  font-size: 22px;

  opacity: 0;

  transition: opacity 0.15s ease;

}



.ppt-related-search-image-caption {

  margin: 0;

  padding: 0 10px 10px;

  color: rgba(255, 255, 255, 0.72);

  font-size: 12px;

  line-height: 1.4;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

}



.ppt-related-search-preview-mask {

  position: fixed;

  inset: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 24px;

  background: rgba(0, 0, 0, 0.72);

}



.ppt-related-search-preview-box {

  position: relative;

  width: min(920px, 100%);

  max-height: min(86vh, 920px);

  display: flex;

  flex-direction: column;

  background: #181818;

  border: 1px solid rgba(255, 255, 255, 0.1);

  border-radius: 12px;

  overflow: hidden;

}



.ppt-related-search-preview-img {

  width: 100%;

  max-height: min(72vh, 760px);

  object-fit: contain;

  background: #111;

}



.ppt-related-search-preview-footer {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 12px;

  padding: 12px 16px;

  border-top: 1px solid rgba(255, 255, 255, 0.08);

}



.ppt-related-search-preview-title {

  color: rgba(255, 255, 255, 0.86);

  font-size: 13px;

  line-height: 1.4;

}



.ppt-related-search-preview-link {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  color: #8ec5ff;

  font-size: 12px;

  text-decoration: none;



  &:hover {

    color: #b8daff;

  }

}



.ppt-related-search-preview-close {

  position: absolute;

  top: 10px;

  right: 10px;

  width: 34px;

  height: 34px;

  border: none;

  border-radius: 999px;

  background: rgba(0, 0, 0, 0.55);

  color: #fff;

  font-size: 24px;

  line-height: 1;

  cursor: pointer;

}

</style>


