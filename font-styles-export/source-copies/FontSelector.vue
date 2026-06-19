<template>
  <div class="font-selector">
    <!-- 搜索框 -->
    <div class="search-box">
      <el-input
        v-model="searchText"
        :placeholder="t('editor.searchFont')"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <i class="el-icon-search"></i>
        </template>
      </el-input>
    </div>

    <!-- 字体分类标签（用于悬停放大镜 top 下限，避免盖住本行） -->
    <div ref="fontCategoriesBarRef" class="font-categories">
      <div
        v-for="category in categories"
        :key="category.value"
        :class="['category-tab', { active: activeCategory === category.value }]"
        @click="activeCategory = category.value"
      >
        <span class="category-tab__label">{{ category.label }}</span>
        <!-- 始终占位，避免仅激活项多出图标导致整行文字基线/底边距不一致 -->
        <i
          class="el-icon-arrow-down category-tab__chevron"
          :class="{ 'category-tab__chevron--visible': activeCategory === category.value }"
          aria-hidden="true"
        />
      </div>
    </div>

    <!-- 字体列表 -->
    <div class="font-list" @scroll.passive="onFontListScroll">
      <!-- 本地上传（仅「我的字体」分类） -->
      <div
        v-if="activeCategory === 'uploaded'"
        class="font-upload-panel"
        @dragover.prevent
        @drop.prevent="onUploadDrop"
      >
        <input
          ref="uploadInputRef"
          type="file"
          class="font-upload-input"
          accept=".otf,.ttf,.ttc,.woff,.woff2"
          multiple
          @change="onUploadInputChange"
        />
        <p class="font-upload-hint">
          支持 OTF、TTF、TTC、WOFF、WOFF2，单文件最大 20MB。字体保存在当前浏览器标签页会话，刷新页面后需重新上传。
        </p>
        <el-button type="primary" size="small" @click="triggerFilePick">
          选择字体文件
        </el-button>
        <span class="font-upload-or">或拖拽到此处</span>
      </div>

      <!-- 推荐字体（醒目展示） -->
      <div v-if="activeCategory === 'recommended' && !searchText" class="featured-fonts">
        <div
          v-for="font in featuredFonts"
          :key="font.value"
          ref="featuredFontEls"
          :class="['featured-font-item', { selected: modelValue === font.value }]"
          :data-font="font.value"
          @click="selectFont(font)"
          @mouseenter="onFeaturedFontEnter(font, $event)"
          @mouseleave="onFontRowLeave"
        >
          <div
            class="font-preview"
            :style="
              getFontPreviewStyle(font.value, {
                fontSizePx: FONT_FEATURED_PREVIEW_PX,
                lineHeight: 1.2,
              })
            "
          >
            {{ font.preview || font.label }}
          </div>
          <div class="font-name">{{ font.label }}</div>
        </div>
      </div>

      <!-- 常规字体列表（短列表直接渲染，长列表虚拟滚动） -->
      <div v-if="!useVirtualRegularList" class="regular-fonts">
        <div
          v-for="font in filteredFonts"
          :key="font.value"
          :class="['font-item', { selected: modelValue === font.value }]"
          @click="selectFont(font)"
          @mouseenter="onRegularFontEnter(font, font.label, $event)"
          @mouseleave="onFontRowLeave"
        >
          <span
            class="font-preview-text"
            :style="
              getFontPreviewStyle(font.value, {
                fontSizePx: FONT_LIST_PREVIEW_PX,
                lineHeight: FONT_LIST_PREVIEW_LINE_HEIGHT,
              })
            "
          >
            {{ font.label }}
          </span>
          <button
            v-if="font.category === 'uploaded'"
            type="button"
            class="font-item-remove"
            title="移除此字体"
            @click.stop="removeUploadedFont(font.value)"
          >
            ×
          </button>
          <i v-if="modelValue === font.value" class="el-icon-check selected-icon"></i>
        </div>
      </div>
      <div
        v-else
        ref="virtualScrollEl"
        class="regular-fonts regular-fonts--virtual"
        @scroll.passive="onVirtualScroll"
      >
        <div class="virtual-sizer" :style="{ height: `${virtualTotalHeight}px` }">
          <div
            class="virtual-window"
            :style="{ transform: `translateY(${virtualOffsetY}px)` }"
          >
            <div
              v-for="font in virtualSlice"
              :key="font.value"
              :class="['font-item', { selected: modelValue === font.value }]"
              @click="selectFont(font)"
              @mouseenter="onRegularFontEnter(font, font.label, $event)"
              @mouseleave="onFontRowLeave"
            >
              <span
                class="font-preview-text"
                :style="
                  getFontPreviewStyle(font.value, {
                    fontSizePx: FONT_LIST_PREVIEW_PX,
                    lineHeight: FONT_LIST_PREVIEW_LINE_HEIGHT,
                  })
                "
              >
                {{ font.label }}
              </span>
              <button
                v-if="font.category === 'uploaded'"
                type="button"
                class="font-item-remove"
                title="移除此字体"
                @click.stop="removeUploadedFont(font.value)"
              >
                ×
              </button>
              <i v-if="modelValue === font.value" class="el-icon-check selected-icon"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="fontHoverPreview"
        class="font-hover-magnifier"
        :style="fontHoverPreview.panelStyle"
      >
        <div class="font-hover-magnifier__ring" aria-hidden="true" />
        <div
          class="font-hover-magnifier__preview"
          :style="
            getFontPreviewStyle(fontHoverPreview.font.value, {
              fontSizePx: FONT_MAGNIFIER_SAMPLE_PX,
              lineHeight: 1.2,
            })
          "
        >
          {{ fontHoverPreview.previewText }}
        </div>
        <div
          class="font-hover-magnifier__label"
          :style="
            getFontPreviewStyle(fontHoverPreview.font.value, {
              fontSizePx: FONT_MAGNIFIER_LABEL_PX,
              lineHeight: 1.35,
            })
          "
        >
          {{ fontHoverPreview.font.label }}
        </div>
        <div
          v-if="fontHoverPreview.font.label !== fontHoverPreview.font.value"
          class="font-hover-magnifier__meta"
        >
          {{ fontHoverPreview.font.value }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  triggerRef,
  shallowRef,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  loadFont,
  preloadFeaturedFonts,
  normalizeFontFamily,
  buildFontFamilyCss,
} from "@/composables/useFontLoader";
import type { CustomChineseFontCatalogEntry } from "@/composables/useCustomChineseFontsCatalog";
import { useUserUploadedFonts } from "@/composables/useUserUploadedFonts";

const { t } = useI18n();

defineOptions({
  name: "FontSelector",
});

interface FontOption {
  label: string;
  value: string;
  category?: string;
  preview?: string;
  sourceType?: "css" | "file";
  cssUrl?: string;
  cssText?: string;
  files?: CustomChineseFontCatalogEntry["files"];
}

const uploadInputRef = ref<HTMLInputElement | null>(null);
const fontCategoriesBarRef = ref<HTMLElement | null>(null);
const { uploadedFonts, addFontFiles, removeFont: removeUploadedFontEntry } =
  useUserUploadedFonts();

const fontLoadVersion = ref(0);

const onFontsLoaded = () => {
  fontLoadVersion.value++;
};

onBeforeUnmount(() => {
  clearFontHover();
  document.fonts?.removeEventListener("loadingdone", onFontsLoaded);
  fontObserver?.disconnect();
  fontObserver = null;
});

/** 列表与放大镜用同一套字号比例，避免「样本大字」与「信息小字」像两种字体 */
const FONT_LIST_PREVIEW_PX = 18;
const FONT_LIST_PREVIEW_LINE_HEIGHT = 1.25;
const FONT_MAGNIFIER_SAMPLE_PX = 44;
const FONT_MAGNIFIER_LABEL_PX = 16;
const FONT_FEATURED_PREVIEW_PX = 26;
/** 悬停面板实际高度大于旧代码假设的 96px，低估会导致整体上移盖住「推荐字体」上方分类栏 */
const FONT_MAGNIFIER_PANEL_EST_HEIGHT = 176;
const FONT_MAGNIFIER_VIEWPORT_PAD = 12;

function getFontPreviewStyle(
  fontValue: string,
  opts?: { fontSizePx?: number; lineHeight?: number; fontWeight?: string | number }
) {
  void fontLoadVersion.value;
  const style: Record<string, string> = {
    fontFamily: buildFontFamilyCss(fontValue),
  };
  if (opts?.fontSizePx != null) {
    style.fontSize = `${opts.fontSizePx}px`;
  }
  if (opts?.lineHeight != null) {
    style.lineHeight = String(opts.lineHeight);
  }
  if (opts?.fontWeight != null) {
    style.fontWeight = String(opts.fontWeight);
  }
  return style;
}

const fontHoverPreview = shallowRef<{
  font: FontOption;
  previewText: string;
  panelStyle: Record<string, string>;
} | null>(null);

let hoverLeaveTimer: ReturnType<typeof setTimeout> | null = null;

function clearFontHover() {
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  fontHoverPreview.value = null;
}

function scheduleClearFontHover() {
  if (hoverLeaveTimer) clearTimeout(hoverLeaveTimer);
  hoverLeaveTimer = setTimeout(() => {
    fontHoverPreview.value = null;
    hoverLeaveTimer = null;
  }, 120);
}

function cancelClearFontHover() {
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
}

function computeMagnifierPanelStyle(rect: DOMRect): Record<string, string> {
  const gap = 12;
  const estWidth = 360;
  const estH = FONT_MAGNIFIER_PANEL_EST_HEIGHT;
  const pad = FONT_MAGNIFIER_VIEWPORT_PAD;
  const bar = fontCategoriesBarRef.value?.getBoundingClientRect();
  const minTop =
    bar != null && bar.height > 0 && bar.bottom > 0 ? bar.bottom + 8 : pad;

  let left = rect.right + gap;
  let top = rect.top + (rect.height - estH) / 2;

  if (left + estWidth > window.innerWidth - pad) {
    left = rect.left - estWidth - gap;
  }
  left = Math.max(pad, Math.min(left, window.innerWidth - estWidth - pad));

  const maxTop = window.innerHeight - estH - pad;
  top = Math.max(minTop, Math.min(top, maxTop));

  return {
    left: `${left}px`,
    top: `${top}px`,
  };
}

function onFeaturedFontEnter(font: FontOption, e: MouseEvent) {
  cancelClearFontHover();
  void loadFont(font.value, resolveCustomFontEntryByValue(font.value));
  const el = e.currentTarget as HTMLElement;
  fontHoverPreview.value = {
    font,
    previewText: font.preview || font.label,
    panelStyle: computeMagnifierPanelStyle(el.getBoundingClientRect()),
  };
}

function onRegularFontEnter(font: FontOption, previewText: string, e: MouseEvent) {
  cancelClearFontHover();
  void loadFont(font.value, resolveCustomFontEntryByValue(font.value));
  const el = e.currentTarget as HTMLElement;
  fontHoverPreview.value = {
    font,
    previewText,
    panelStyle: computeMagnifierPanelStyle(el.getBoundingClientRect()),
  };
}

function onFontRowLeave() {
  scheduleClearFontHover();
}

function onFontListScroll() {
  clearFontHover();
}

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  allFonts: {
    type: Array as () => FontOption[],
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);
const customChineseCatalogState = useState<CustomChineseFontCatalogEntry[]>(
  "custom-chinese-fonts-catalog",
  () => []
);

// 搜索文本
const searchText = ref("");

// 当前激活的分类
const activeCategory = ref("recommended");

/** 西文系统字体：放在「系统字体」；不可当作中文字体（否则会污染「中文字体」列表） */
const latinSystemFontValues = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Helvetica",
  "Tahoma",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
  "Bodoni 72",
];

const systemFontValues = [
  ...latinSystemFontValues,
  "Songti SC",
  "微软雅黑",
  "宋体",
  "黑体",
  "思源黑体",
  "PingFang SC",
  "SimHei",
  "SimSun",
  "华文行楷",
  "华文新魏",
  "华文琥珀",
  "华文隶书",
  "华文彩云",
  "方正舒体",
  "方正姚体",
  "方正黑体",
  "方正楷体",
  "方正仿宋",
];

const chineseCatalogPatterns = [
  /^Noto Sans (SC|TC|HK)$/i,
  /^Noto Serif (SC|TC|HK)$/i,
  /^ZCOOL /i,
  /^Ma Shan Zheng$/i,
  /^Liu Jian Mao Cao$/i,
  /^Long Cang$/i,
  /^LXGW /i,
  /^WDXL /i,
  /^Bpmf /i,
  /^Huninn$/i,
  /^Iansui$/i,
  /^Zen Kaku /i,
  /^Zen Maru /i,
  /^Murecho$/i,
  /** OSS 商用免费中文包（commercial-free-zh-oss-manifest / manifest.json） */
  /^CFZh-/i,
];

function isSystemFont(fontValue: string) {
  return systemFontValues.includes(fontValue);
}

function isLatinSystemFont(fontValue: string) {
  return latinSystemFontValues.includes(fontValue);
}

function isChineseFont(fontValue: string) {
  if (isLatinSystemFont(fontValue)) {
    return false;
  }
  if (isSystemFont(fontValue)) {
    return true;
  }
  return chineseCatalogPatterns.some((pattern) => pattern.test(fontValue));
}

function isEnglishFont(font: FontOption) {
  if (font.category === "uploaded") {
    return false;
  }
  if (isSystemFont(font.value)) {
    return false;
  }
  if (font.category === "chinese") {
    return false;
  }
  return !isChineseFont(font.value);
}

function resolveCustomFontEntryByValue(
  value: string
): CustomChineseFontCatalogEntry | undefined {
  const fromAll = props.allFonts.find((f) => f.value === value);
  if (fromAll) return resolveCustomFontEntry(fromAll);
  const fromFeatured = featuredFonts.value.find((f) => f.value === value);
  return fromFeatured ? resolveCustomFontEntry(fromFeatured) : undefined;
}

function resolveCustomFontEntry(
  font: FontOption
): CustomChineseFontCatalogEntry | undefined {
  if (font.sourceType) {
    return font as CustomChineseFontCatalogEntry;
  }
  return customChineseCatalogState.value.find((item) => item.value === font.value);
}

// 分类选项
const categories = [
  { label: "推荐字体", value: "recommended" },
  { label: "我的字体", value: "uploaded" },
  { label: "中文字体", value: "chinese" },
  { label: "英文字体", value: "english" },
  { label: "系统字体", value: "system" },
  { label: "全部字体", value: "all" },
];

// 精选艺术字体（醒目展示）
const featuredFonts = computed<FontOption[]>(() => [
  // 中文艺术字体（优先展示）
  { label: "站酷快乐体", value: "ZCOOL KuaiLe", preview: "站酷快乐体" },
  { label: "站酷庆科黄油体", value: "ZCOOL QingKe HuangYou", preview: "黄油体" },
  { label: "站酷小薇LOGO体", value: "ZCOOL XiaoWei", preview: "小薇LOGO" },
  { label: "刘建毛草", value: "Liu Jian Mao Cao", preview: "刘建毛草" },
  { label: "龙藏", value: "Long Cang", preview: "龙藏体" },
  { label: "马善政", value: "Ma Shan Zheng", preview: "马善政" },
  { label: "智萌星", value: "Zhi Mang Xing", preview: "智萌星" },
  { label: "思源黑体 SC", value: "Noto Sans SC", preview: "思源黑体" },
  { label: "思源宋体 SC", value: "Noto Serif SC", preview: "思源宋体" },

  // 新增 20+ 款艺术变体字 (支持中文汉字)
  { label: "极粗艺术黑", value: "Dela Gothic One", preview: "冲击文字" },
  { label: "双线霓虹", value: "Train One", preview: "霓虹双线" },
  { label: "复古像素", value: "DotGothic16", preview: "像素世界" },
  { label: "艺术摇滚", value: "RocknRoll One", preview: "艺术摇滚" },
  { label: "雷鬼艺术", value: "Reggae One", preview: "雷鬼艺术" },
  { label: "波谱圆体", value: "Potta One", preview: "波谱圆圆" },
  { label: "摩登流行", value: "Mochiy Pop One", preview: "摩登流行" },
  { label: "线条木棒", value: "Stick", preview: "线条木棒" },
  { label: "八丸流行", value: "Hachi Maru Pop", preview: "可爱流行" },
  { label: "优雅手写", value: "Klee One", preview: "优雅楷书" },
  { label: "奇异圆体", value: "Kiwi Maru", preview: "奇异圆体" },
  { label: "水墨狂草", value: "Yuji Boku", preview: "水墨狂草" },
  { label: "佑字书法", value: "Yuji Syuku", preview: "佑字书法" },
  { label: "红道手迹", value: "Zen Kurenaido", preview: "红道手迹" },
  { label: "新手写书", value: "New Tegomin", preview: "新手写书" },
  { label: "解星特民", value: "Kaisei Tokumin", preview: "解星特民" },
  { label: "商务明朝", value: "Biz UDPMincho", preview: "商务明朝" },
  { label: "雏风明朝", value: "Hina Mincho", preview: "雏风明朝" },
  { label: "小衫圆体", value: "Kosugi Maru", preview: "小衫圆体" },

  // 镂空/线条艺术字体
  { label: "Monoton", value: "Monoton", preview: "MONOTON" },
  { label: "Bungee Outline", value: "Bungee Outline", preview: "OUTLINE" },
  { label: "Bungee Hairline", value: "Bungee Hairline", preview: "HAIRLINE" },
  { label: "Faster One", value: "Faster One", preview: "STENCIL" },
  { label: "Londrina Outline", value: "Londrina Outline", preview: "LONDRINA" },
  { label: "Fascinate Inline", value: "Fascinate Inline", preview: "FASCINATE" },
  { label: "Sancreek", value: "Sancreek", preview: "SANCREEK" },
  { label: "Smokum", value: "Smokum", preview: "SMOKUM" },
  { label: "Nosifer", value: "Nosifer", preview: "NOSIFER" },
  { label: "Rye", value: "Rye", preview: "RYE" },
  { label: "UnifrakturCook", value: "UnifrakturCook", preview: "UnifrakturCook" },
  { label: "Shadows Into Light", value: "Shadows Into Light", preview: "Shadows" },

  // 装饰性艺术字体
  { label: "Cinzel Decorative", value: "Cinzel Decorative", preview: "CINZEL" },
  { label: "Emblema One", value: "Emblema One", preview: "EMBLEMA" },
  { label: "Fredericka the Great", value: "Fredericka the Great", preview: "Fredericka" },
  { label: "Luckiest Guy", value: "Luckiest Guy", preview: "LUCKIEST" },
  { label: "Shrikhand", value: "Shrikhand", preview: "Shrikhand" },
  { label: "Vampire Wars", value: "Vampire Wars", preview: "VAMPIRE" },
  { label: "Metal Mania", value: "Metal Mania", preview: "METAL" },
  { label: "Butcherman", value: "Butcherman", preview: "BUTCHER" },
  { label: "Eater", value: "Eater", preview: "EATER" },

  // 粗体艺术字体
  { label: "Bebas Neue", value: "Bebas Neue", preview: "BEBAS NEUE" },
  { label: "Black Ops One", value: "Black Ops One", preview: "BLACK OPS" },
  { label: "Alfa Slab One", value: "Alfa Slab One", preview: "ALFA SLAB" },
  { label: "Bungee", value: "Bungee", preview: "BUNGEE" },
  { label: "Russo One", value: "Russo One", preview: "RUSSO ONE" },
  { label: "Anton", value: "Anton", preview: "ANTON" },
  { label: "Passion One", value: "Passion One", preview: "PASSION" },
  { label: "Ultra", value: "Ultra", preview: "ULTRA" },

  // 手写/脚本艺术字体
  { label: "Pacifico", value: "Pacifico", preview: "Pacifico" },
  { label: "Oleo Script", value: "Oleo Script", preview: "Oleo Script" },
  { label: "Lobster", value: "Lobster", preview: "Lobster" },
  { label: "Permanent Marker", value: "Permanent Marker", preview: "Permanent" },
  { label: "Satisfy", value: "Satisfy", preview: "Satisfy" },
  { label: "Courgette", value: "Courgette", preview: "Courgette" },
  { label: "Kaushan Script", value: "Kaushan Script", preview: "Kaushan" },
  { label: "Caveat", value: "Caveat", preview: "Caveat" },

  // Amsterdam 字体系列
  { label: "The Amsterdam",         value: "The Amsterdam",                   preview: "The Amsterdam" },
  { label: "New Amsterdam",         value: "New Amsterdam",                   preview: "New Amsterdam" },
  { label: "Amsterdam Script",      value: "Amsterdam Script",                preview: "Amsterdam Script" },
  { label: "Amsterdam",             value: "Amsterdam",                       preview: "Amsterdam" },
  { label: "Amsterdam Graffiti",    value: "Amsterdam Graffiti",              preview: "Amsterdam Graffiti" },
  { label: "Amsterdam Handwriting", value: "Amsterdam Handwriting",           preview: "Amsterdam Handwriting" },
  { label: "Soul Amsterdams",       value: "Soul Amsterdams Reguler",         preview: "Soul Amsterdams" },
  { label: "Amsterdam Kindom",      value: "Amsterdam Kindom - Personal use", preview: "Amsterdam Kindom" },
  { label: "Tour To Amsterdam",     value: "Tour To Amsterdam",               preview: "Tour To Amsterdam" },
  { label: "Amsterdam Bridge",      value: "Amsterdam Bridge",                preview: "Amsterdam Bridge" },
  { label: "Amsterdam Signature",   value: "Amsterdam Signature",             preview: "Amsterdam Signature" },
  { label: "Amsterdam CITY",        value: "Amsterdam CITY",                  preview: "Amsterdam CITY" },
  { label: "Amsterdam Bright",      value: "Amsterdam Bright",                preview: "Amsterdam Bright" },
  { label: "South Amsterdam",       value: "South Amsterdam",                 preview: "South Amsterdam" },
  { label: "North Amsterdam",       value: "North Amsterdam",                 preview: "North Amsterdam" },
  { label: "Vivaldi",               value: "Vivaldi",                         preview: "Vivaldi" },

  // 复古/特殊效果字体
  { label: "Lemon", value: "Lemon", preview: "Lemon" },
  { label: "Righteous", value: "Righteous", preview: "Righteous" },
  { label: "Bangers", value: "Bangers", preview: "BANGERS" },
  { label: "Creepster", value: "Creepster", preview: "Creepster" },
  { label: "Press Start 2P", value: "Press Start 2P", preview: "PRESS START" },
  { label: "VT323", value: "VT323", preview: "VT323" },
  { label: "Special Elite", value: "Special Elite", preview: "SPECIAL" },
  { label: "Fredoka One", value: "Fredoka One", preview: "FREDOKA" },

  // 科技/几何字体
  { label: "Orbitron", value: "Orbitron", preview: "ORBITRON" },
  { label: "Krona One", value: "Krona One", preview: "KRONA ONE" },
  { label: "Audiowide", value: "Audiowide", preview: "AUDIOWIDE" },
  { label: "Electrolize", value: "Electrolize", preview: "ELECTROLIZE" },
  { label: "Wallpoet", value: "Wallpoet", preview: "WALLPOET" },
  { label: "Turret Road", value: "Turret Road", preview: "TURRET" },

  // 怪异/独特艺术字体
  { label: "Rubik Glitch", value: "Rubik Glitch", preview: "GLITCH" },
  { label: "Rubik Burned", value: "Rubik Burned", preview: "BURNED" },
  { label: "Rubik Distressed", value: "Rubik Distressed", preview: "DISTRESSED" },
  { label: "Emblema One", value: "Emblema One", preview: "EMBLEMA" },
  { label: "Hanalei Fill", value: "Hanalei Fill", preview: "HANALEI" },
  { label: "Kumar One Outline", value: "Kumar One Outline", preview: "KUMAR" },
  { label: "Modak", value: "Modak", preview: "MODAK" },

  // 3D/立体效果字体
  { label: "Bungee Shade", value: "Bungee Shade", preview: "SHADE" },
  { label: "Shojumaru", value: "Shojumaru", preview: "SHOJUMARU" },
  { label: "Flavors", value: "Flavors", preview: "FLAVORS" },
  { label: "Fascinate", value: "Fascinate", preview: "FASCINATE" },
]);

// 根据分类过滤字体
const filteredFonts = computed(() => {
  let fonts = props.allFonts;

  // 按分类过滤
  if (activeCategory.value === "recommended") {
    // 推荐字体显示精选艺术字体
    fonts = featuredFonts.value;
  } else if (activeCategory.value === "uploaded") {
    fonts = props.allFonts.filter((font) => font.category === "uploaded");
  } else if (activeCategory.value === "chinese") {
    fonts = props.allFonts.filter(
      (font) =>
        font.category !== "uploaded" &&
        (font.category === "chinese" || isChineseFont(font.value))
    );
  } else if (activeCategory.value === "english") {
    fonts = props.allFonts.filter(
      (font) => font.category !== "uploaded" && isEnglishFont(font)
    );
  } else if (activeCategory.value === "system") {
    fonts = props.allFonts.filter((font) => isSystemFont(font.value));
  }

  // 按搜索文本过滤
  if (searchText.value) {
    fonts = fonts.filter((font) =>
      font.label.toLowerCase().includes(searchText.value.toLowerCase())
    );
  }

  return fonts;
});

/** 超过该数量时用虚拟列表，避免上千 DOM */
const VIRTUAL_THRESHOLD = 72;
const VIRTUAL_ITEM_HEIGHT = 48;
const VIRTUAL_VIEWPORT = 360;
const VIRTUAL_BUFFER = 10;

const useVirtualRegularList = computed(
  () => filteredFonts.value.length > VIRTUAL_THRESHOLD
);

const virtualScrollEl = ref<HTMLElement | null>(null);
const virtualScrollTop = ref(0);

function onVirtualScroll(e: Event) {
  clearFontHover();
  const el = e.target as HTMLElement;
  virtualScrollTop.value = el.scrollTop;
}

const virtualTotalHeight = computed(
  () => filteredFonts.value.length * VIRTUAL_ITEM_HEIGHT
);

const virtualStartIndex = computed(() =>
  Math.max(0, Math.floor(virtualScrollTop.value / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER)
);

const virtualEndIndex = computed(() =>
  Math.min(
    filteredFonts.value.length,
    Math.ceil((virtualScrollTop.value + VIRTUAL_VIEWPORT) / VIRTUAL_ITEM_HEIGHT) +
      VIRTUAL_BUFFER
  )
);

const virtualSlice = computed(() =>
  filteredFonts.value.slice(virtualStartIndex.value, virtualEndIndex.value)
);

const virtualOffsetY = computed(() => virtualStartIndex.value * VIRTUAL_ITEM_HEIGHT);

watch([filteredFonts, activeCategory, searchText], () => {
  virtualScrollTop.value = 0;
  nextTick(() => {
    if (virtualScrollEl.value) {
      virtualScrollEl.value.scrollTop = 0;
    }
  });
});

watch(
  virtualSlice,
  (fonts) => {
    fonts
      .slice(0, 24)
      .forEach((f) => loadFont(f.value, resolveCustomFontEntryByValue(f.value)));
  },
  { flush: "post" }
);

// 处理搜索
const handleSearch = () => {
  // 如果有搜索文本，切换到全部字体
  if (searchText.value) {
    activeCategory.value = "all";
  }
};

// 选择字体
const selectFont = async (font: FontOption) => {
  await loadFont(font.value, resolveCustomFontEntryByValue(font.value));

  emit("update:modelValue", font.value);
  emit("change", font.value);
};

function triggerFilePick() {
  uploadInputRef.value?.click();
}

async function finishUploadAfterAdd(result: {
  added: number;
  lastValue?: string;
}) {
  if (!result.added || !result.lastValue) return;
  await nextTick();
  const font = props.allFonts.find((f) => f.value === result.lastValue);
  if (font) {
    await selectFont(font);
  }
}

function onUploadInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const r = addFontFiles(input.files);
  input.value = "";
  void finishUploadAfterAdd(r);
}

function onUploadDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  void finishUploadAfterAdd(addFontFiles(files));
}

function removeUploadedFont(value: string) {
  if (props.modelValue === value) {
    emit("update:modelValue", "Noto Sans SC");
    emit("change", "Noto Sans SC");
    void loadFont("Noto Sans SC");
  }
  removeUploadedFontEntry(value);
}

const featuredFontEls = ref<HTMLElement[]>([]);
let fontObserver: IntersectionObserver | null = null;

function setupFontObserver() {
  if (fontObserver) return;
  fontObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const fontValue = (entry.target as HTMLElement).dataset.font;
        if (fontValue) {
          loadFont(fontValue, resolveCustomFontEntryByValue(fontValue));
          fontObserver?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "200px" }
  );
}

function observeFeaturedEls() {
  if (!fontObserver) return;
  for (const el of featuredFontEls.value) {
    fontObserver.observe(el);
  }
}

watch(
  () =>
    [
      props.modelValue,
      customChineseCatalogState.value.length,
      uploadedFonts.value.length,
    ] as [string, number, number],
  () => {
    if (!props.modelValue) return;
    void loadFont(
      props.modelValue,
      resolveCustomFontEntryByValue(props.modelValue)
    );
  },
  { flush: "post", immediate: true }
);

onMounted(async () => {
  document.fonts?.addEventListener("loadingdone", onFontsLoaded);

  const firstScreen = featuredFonts.value.slice(0, 12);
  preloadFeaturedFonts(
    firstScreen.map((f) => f.value),
    [...customChineseCatalogState.value, ...uploadedFonts.value],
    12
  );

  setupFontObserver();
  await nextTick();
  observeFeaturedEls();
});

watch(activeCategory, async () => {
  await nextTick();
  observeFeaturedEls();
});
</script>

<style lang="scss" scoped>
.font-selector {
  width: 100%;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.font-upload-panel {
  margin-bottom: 12px;
  padding: 14px;
  background: #2a2a2a;
  border: 1px dashed #555;
  border-radius: 8px;
  text-align: center;
}

.font-upload-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.font-upload-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #9a9a9a;
  text-align: left;
}

.font-upload-or {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #777;
}

.font-item-remove {
  flex-shrink: 0;
  margin-left: 8px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #888;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: #3a2a2a;
    color: #ff6b6b;
  }
}

// 搜索框
.search-box {
  padding: 12px;
  border-bottom: 1px solid #333;

  :deep(.el-input) {
    .el-input__wrapper {
      background: #2a2a2a;
      border: 1px solid #444;
      box-shadow: none;

      &:hover {
        border-color: #be95ff;
      }
    }

    .el-input__inner {
      color: #fff;

      &::placeholder {
        color: #888;
      }
    }
  }
}

// 分类标签（单行：避免 flex 子项被压窄后「推荐字体」等四字拆成两行）
// flex 列 + max-height 时，overflow-x: auto 会使本项 min-height 按 0 算，整行被压扁导致文字被裁切只剩一条色带
.font-categories {
  flex-shrink: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  background: #252525;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 2px;
  }
}

.category-tab {
  flex-shrink: 0;
  white-space: nowrap;
  word-break: keep-all;
  box-sizing: border-box;
  min-height: 32px;
  padding: 5px 10px;
  font-size: 13px;
  line-height: 1.25;
  color: #aaa;
  cursor: pointer;
  border-radius: 4px;
  border: 2px solid transparent;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  &:hover {
    background: #333;
    color: #fff;
  }

  &.active {
    background: #be95ff;
    color: #fff;
    font-weight: 500;
  }
}

.category-tab__label {
  line-height: 1.25;
}

/* 固定宽度占位，隐藏时不参与视觉但保持与激活项相同的 flex 布局 */
.category-tab__chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  margin: 0;
  padding: 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.category-tab__chevron--visible {
  opacity: 1;
  visibility: visible;
}

// 字体列表
.font-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;

    &:hover {
      background: #555;
    }
  }
}

// 精选字体（醒目展示）
.featured-fonts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.featured-font-item {
  background: #2a2a2a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 16px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;

  &:hover {
    border-color: #be95ff;
    background: #333;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(190, 149, 255, 0.3);
  }

  &.selected {
    border-color: #be95ff;
    background: rgba(190, 149, 255, 0.1);
    box-shadow: 0 0 0 2px rgba(190, 149, 255, 0.2);
  }

  .font-preview {
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .font-name {
    font-size: 11px;
    color: #aaa;
    margin-top: 4px;
  }
}

// 常规字体列表
.regular-fonts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.regular-fonts--virtual {
  max-height: 360px;
  overflow-y: auto;
  padding-right: 2px;
}

.virtual-sizer {
  position: relative;
  width: 100%;
}

.virtual-window {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.regular-fonts--virtual .font-item {
  height: 48px;
  min-height: 48px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.font-item {
  display: flex;
  align-items: center;
  position: relative;
  justify-content: space-between;
  padding: 12px 16px;
  background: #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background: #333;
    border-color: #be95ff;
    transform: translateX(4px);
  }

  &.selected {
    background: rgba(190, 149, 255, 0.15);
    border-color: #be95ff;

    .font-preview-text {
      color: #be95ff;
      font-weight: 600;
    }
  }

  .font-preview-text {
    color: #fff;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selected-icon {
    color: #be95ff;
    font-size: 18px;
    font-weight: bold;
  }
}
</style>

<style lang="scss">
/* Teleport 到 body，需非 scoped；叠在 Element Plus 弹层之上 */
.font-hover-magnifier {
  position: fixed;
  z-index: 12000;
  pointer-events: none;
  min-width: 200px;
  max-width: min(420px, calc(100vw - 24px));
  padding: 18px 22px 14px;
  padding-top: 22px;
  background: linear-gradient(145deg, #2f2f2f 0%, #232323 100%);
  border: 2px solid rgba(190, 149, 255, 0.9);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.4),
    0 16px 48px rgba(0, 0, 0, 0.55),
    0 0 40px rgba(190, 149, 255, 0.12);
}

.font-hover-magnifier__ring {
  position: absolute;
  width: 44px;
  height: 44px;
  left: 10px;
  top: 8px;
  border: 3px solid rgba(190, 149, 255, 0.5);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    rgba(255, 255, 255, 0.08) 0%,
    transparent 55%
  );
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.15);
  pointer-events: none;
}

.font-hover-magnifier__preview {
  position: relative;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 52px;
  min-height: 1.2em;
}

.font-hover-magnifier__label {
  margin-top: 10px;
  padding-left: 52px;
  font-weight: 500;
  color: #c4c4c4;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.font-hover-magnifier__meta {
  margin-top: 6px;
  padding-left: 52px;
  font-size: 10px;
  line-height: 1.3;
  color: #6a6a6a;
  font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
