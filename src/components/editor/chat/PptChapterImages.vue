<script setup lang="ts">
import { computed } from "vue";
import {
  resolvePptSearchImageSrc,
  type PptSearchImage,
} from "@/utils/pptChapterImages";

const props = withDefaults(
  defineProps<{
    images: PptSearchImage[];
    /** strip: 横向多图；sidebar: 侧栏小图；page: 章节配图独立页主图区 */
    variant?: "strip" | "sidebar" | "page";
    altFallback?: string;
  }>(),
  {
    variant: "strip",
    altFallback: "",
  }
);

const displayImages = computed(() => {
  if (props.variant === "sidebar") return props.images.slice(0, 1);
  return props.images;
});
</script>

<template>
  <div
    v-if="displayImages.length"
    :class="{
      'ppt-chapter-side-image': variant === 'sidebar',
      'ppt-chapter-image-strip': variant === 'strip',
      'ppt-chapter-image-page-gallery': variant === 'page',
    }"
  >
    <figure
      v-for="(img, i) in displayImages"
      :key="(img.url || '') + i"
      class="ppt-chapter-image-item"
    >
      <img
        :src="resolvePptSearchImageSrc(img)"
        :alt="img.title || altFallback"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <figcaption v-if="img.title">{{ img.title }}</figcaption>
      <span v-if="img.source" class="ppt-chapter-image-source">{{ img.source }}</span>
    </figure>
  </div>
</template>

<style scoped lang="scss">
.ppt-chapter-image-strip {
  display: flex;
  gap: var(--ppt-gap-md, 12px);
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
}

.ppt-chapter-side-image {
  flex-shrink: 0;
  width: min(28%, var(--ppt-image-sidebar-max-width, 220px));
  min-width: var(--ppt-image-sidebar-min-width, 140px);
}

.ppt-chapter-image-item {
  flex: 1 1 140px;
  max-width: var(--ppt-image-card-max-width, 220px);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  img {
    width: 100%;
    height: var(--ppt-image-strip-height, 96px);
    object-fit: cover;
    border-radius: var(--ppt-radius-card, 6px);
    border: var(--ppt-card-border-width, 1px) solid rgba(255, 255, 255, 0.14);
    background: rgba(0, 0, 0, 0.12);
  }

  figcaption {
    font-size: var(--ppt-fs-caption, 10px);
    line-height: 1.35;
    color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.72));
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.ppt-chapter-side-image .ppt-chapter-image-item {
  flex: none;
  max-width: none;
  width: 100%;

  img {
    height: var(--ppt-image-sidebar-height, 120px);
  }
}

.ppt-chapter-image-page-gallery {
  display: flex;
  flex-direction: column;
  gap: var(--ppt-gap-md, 12px);
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;

  .ppt-chapter-image-item {
    flex: 0 0 auto;
    max-width: none;
    width: 100%;
    padding: 10px;
    border-radius: var(--ppt-radius-card, 10px);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

    img {
      width: 100%;
      height: auto;
      min-height: var(--ppt-image-page-min-height, 160px);
      max-height: min(42vh, var(--ppt-image-page-max-height, 360px));
      object-fit: cover;
      border-radius: calc(var(--ppt-radius-card, 10px) - 4px);
      background: rgba(0, 0, 0, 0.2);
    }
  }
}

.ppt-chapter-image-source {
  font-size: var(--ppt-fs-caption, 9px);
  opacity: 0.55;
  color: var(--ppt-text-secondary, rgba(255, 255, 255, 0.6));
}

:global(.ppt-palette-light) {
  .ppt-chapter-image-item img {
    border-color: rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.04);
  }

  .ppt-chapter-image-page-gallery .ppt-chapter-image-item {
    background: rgba(255, 255, 255, 0.72);
    border-color: rgba(0, 0, 0, 0.08);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
}
</style>
