# 字体选择器使用指南

## 概述

新的字体选择器提供了类似 Canva 的字体选择体验，包括：
- 📂 **分类浏览**：推荐字体、Google 字体、系统字体、全部字体
- 🎨 **醒目展示**：精选艺术字体以大卡片形式展示
- 🔍 **智能搜索**：快速查找字体
- 👁️ **实时预览**：每个字体都用自己的样式显示

## 功能特性

### 1. 字体分类

#### 推荐字体
精选的 20 款醒目艺术字体，以大卡片形式展示：

| 字体名称 | 特点 | 适用场景 |
|---------|------|---------|
| **Pacifico** | 手写风格，优雅流畅 | 标题、海报 |
| **Faster One** (Futurist Stencil) | 未来感、镂空效果 | 科技、现代设计 |
| **Krona One** | 粗体、几何感 | 标题、Logo |
| **Righteous** (Imagica) | 复古、厚重 | 海报、标题 |
| **Oleo Script** | 手写脚本，优雅 | 邀请函、艺术设计 |
| **Lemon** | 复古、粗体 | 海报、标题 |
| **Black Ops One** (Dob Bold) | 军事风格、粗体 | 游戏、动作主题 |
| **Shrikhand** | 印度风格、装饰性 | 海报、标题 |
| **Orbitron** (D-DIN) | 科技感、几何 | 科技、未来主题 |
| **Bebas Neue** | 窄体、大写 | 标题、海报 |
| **Bangers** | 漫画风格 | 儿童、卡通设计 |
| **Fredoka One** | 圆润、可爱 | 儿童、友好设计 |
| **Monoton** | 线条、装饰性 | 复古、艺术设计 |
| **Alfa Slab One** | 粗体、衬线 | 标题、海报 |
| **Bungee** | 多彩、立体感 | 海报、标题 |
| **Righteous** | 复古、厚重 | 海报、标题 |
| **Permanent Marker** | 手写、马克笔 | 手绘、涂鸦风格 |
| **Lobster** | 手写脚本、优雅 | 标题、装饰 |
| **Russo One** | 粗体、几何 | 标题、Logo |
| **Creepster** | 恐怖、万圣节 | 主题设计 |

#### Google 字体
1000+ Google Fonts，按字母顺序排列，支持搜索。

#### 系统字体
常用系统字体：
- 英文：Arial, Times New Roman, Georgia, Verdana 等
- 中文：微软雅黑, 宋体, 黑体, 思源黑体等

#### 全部字体
所有可用字体的完整列表。

### 2. 搜索功能

在搜索框中输入字体名称，快速定位：
- 支持模糊搜索
- 自动切换到"全部字体"分类
- 实时过滤结果

### 3. 视觉效果

#### 精选字体卡片
- **网格布局**：每行 3-4 个卡片
- **大字号预览**：24px 字体大小
- **悬停效果**：
  - 边框高亮（紫色）
  - 向上浮动 2px
  - 阴影效果
- **选中状态**：
  - 紫色边框
  - 背景高亮
  - 外发光效果

#### 常规字体列表
- **列表布局**：单列显示
- **字体预览**：16px 字体大小
- **悬停效果**：
  - 背景变化
  - 向右平移 4px
  - 边框高亮
- **选中标记**：紫色勾选图标

## 使用方式

### 在编辑器中使用

1. **打开字体选择器**
   - 在文本工具栏中点击字体按钮
   - 弹出字体选择面板

2. **浏览字体**
   - 点击顶部分类标签切换分类
   - 滚动浏览字体列表
   - 在推荐字体中查看醒目的艺术字体

3. **搜索字体**
   - 在搜索框中输入字体名称
   - 查看过滤后的结果

4. **选择字体**
   - 点击字体卡片或列表项
   - 字体自动应用到选中的文本
   - 选择器自动关闭

### 代码集成

```vue
<template>
  <FontSelector
    :model-value="currentFont"
    :all-fonts="fontList"
    @update:model-value="handleFontChange"
    @change="handleFontChange"
  />
</template>

<script setup>
import FontSelector from './FontSelector.vue';

const currentFont = ref('Arial');
const fontList = ref([
  { label: 'Arial', value: 'Arial' },
  { label: 'Pacifico', value: 'Pacifico' },
  // ... 更多字体
]);

const handleFontChange = (fontValue) => {
  currentFont.value = fontValue;
  // 应用字体到文本
};
</script>
```

## 自定义配置

### 添加更多精选字体

在 `FontSelector.vue` 中修改 `featuredFonts` computed 属性：

```typescript
const featuredFonts = computed<FontOption[]>(() => [
  { label: "你的字体名称", value: "字体值", preview: "预览文本" },
  // ... 更多字体
]);
```

### 修改分类

在 `categories` 数组中添加或修改分类：

```typescript
const categories = [
  { label: "推荐字体", value: "recommended" },
  { label: "Google 字体", value: "google" },
  { label: "系统字体", value: "system" },
  { label: "你的分类", value: "custom" }, // 新增分类
  { label: "全部字体", value: "all" },
];
```

### 调整样式

修改 `FontSelector.vue` 中的 SCSS 变量：

```scss
// 卡片尺寸
grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));

// 字体预览大小
.font-preview {
  font-size: 24px; // 精选字体
}

.font-preview-text {
  font-size: 16px; // 常规字体
}

// 主题色
border-color: #be95ff; // 紫色
```

## 性能优化

### 1. 虚拟滚动（推荐）

当字体数量超过 100 个时，建议使用虚拟滚动：

```bash
npm install vue-virtual-scroller
```

```vue
<template>
  <RecycleScroller
    :items="filteredFonts"
    :item-size="48"
    key-field="value"
  >
    <template #default="{ item }">
      <div class="font-item" @click="selectFont(item)">
        {{ item.label }}
      </div>
    </template>
  </RecycleScroller>
</template>
```

### 2. 延迟加载字体

只在用户选择时加载字体文件：

```typescript
const loadFont = async (fontFamily: string) => {
  const font = new FontFace(fontFamily, `url(https://fonts.googleapis.com/...)`);
  await font.load();
  document.fonts.add(font);
};
```

### 3. 字体预加载

预加载常用字体：

```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Pacifico" as="style">
```

## 样式定制

### 深色主题（默认）

```scss
.font-selector {
  background: #1e1e1e;
  color: #fff;
}
```

### 浅色主题

```scss
.font-selector {
  background: #ffffff;
  color: #000;

  .featured-font-item {
    background: #f5f5f5;
    border-color: #e0e0e0;
  }

  .font-item {
    background: #f5f5f5;
  }
}
```

## 故障排查

### 字体不显示？

1. 检查 Google Fonts 是否正确加载
2. 打开浏览器开发者工具 -> Network
3. 查看字体文件是否加载成功
4. 确认 `nuxt.config.ts` 中的字体链接正确

### 字体选择器不弹出？

1. 检查 `el-popover` 是否正确配置
2. 确认 `showFontSelector` 状态正确
3. 检查 z-index 是否被其他元素遮挡

### 搜索不工作？

1. 确认 `searchText` ref 正确绑定
2. 检查 `filteredFonts` computed 逻辑
3. 查看控制台是否有错误

## 后续优化建议

1. **字体收藏功能**
   - 允许用户收藏常用字体
   - 在顶部显示收藏的字体

2. **最近使用**
   - 记录用户最近使用的字体
   - 快速访问历史字体

3. **字体标签**
   - 为字体添加标签（手写、衬线、无衬线等）
   - 按标签过滤字体

4. **字体对比**
   - 支持多个字体并排对比
   - 帮助用户做出选择

5. **自定义字体上传**
   - 允许用户上传自己的字体文件
   - 支持 .ttf, .otf, .woff 等格式

## 相关文件

- `src/components/editor/FontSelector.vue` - 字体选择器组件
- `src/components/editor/TextToolbar.vue` - 文本工具栏（集成字体选择器）
- `src/constants/editorConstants.ts` - 字体列表定义
- `nuxt.config.ts` - Google Fonts 配置
- `GOOGLE_FONTS_SETUP.md` - Google Fonts 配置指南

## 截图示例

### 推荐字体（精选艺术字体）
```
┌─────────────┬─────────────┬─────────────┐
│  Pacifico   │ FUTURIST    │ Krona One   │
│             │  STENCIL    │             │
└─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┐
│  IMAGICA    │ Oleo Script │   Lemon     │
│             │             │             │
└─────────────┴─────────────┴─────────────┘
```

### 常规字体列表
```
┌────────────────────────────────────┐
│ Arial                           ✓  │
├────────────────────────────────────┤
│ Roboto                             │
├────────────────────────────────────┤
│ Open Sans                          │
└────────────────────────────────────┘
```
