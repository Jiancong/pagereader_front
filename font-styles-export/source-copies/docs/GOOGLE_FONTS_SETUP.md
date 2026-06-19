# Google Fonts 配置说明

## 已完成的配置

### 1. 字体列表添加 (`src/constants/editorConstants.ts`)

添加了 **1000+ Google Fonts** 到 `googleFonts` 数组，包括：
- ABeeZee, Abel, Abhaya Libre, Abril Fatface
- Akatab, Akaya Kanadaka, Akaya Telivigala
- Aladin, Alata, Aleo, Alex Brush
- Alfa Slab One, Alice, Alike, Allerta
- ... 以及更多常用 Google Fonts

### 2. 字体加载配置 (`nuxt.config.ts`)

在 `app.head.link` 中添加了 Google Fonts CDN 链接：
- 使用 `preconnect` 预连接 Google Fonts 服务器
- 使用异步加载策略 (`media='print'` + `onload="this.media='all'"`)
- 避免阻塞页面渲染
- 一次性加载所有常用字体（约 1000+ 字体）

### 3. 字体选择器增强 (`src/components/editor/TextToolbar.vue`)

#### 新增功能：
1. **实时字体预览**
   - 每个字体选项都使用其自己的字体样式显示
   - 用户可以直观看到字体效果

2. **搜索过滤**
   - 添加了 `filterable` 属性
   - 用户可以快速搜索字体名称

3. **美化样式**
   - 自定义下拉框样式
   - 悬停效果（hover）
   - 选中标记（✓）
   - 平滑过渡动画

#### 样式特性：
```scss
// 字体选项高度自适应
min-height: 40px;

// 悬停时向右移动
transform: translateX(4px);

// 选中后显示勾选标记
&::after {
  content: '✓';
  color: #BE95FF;
}
```

### 4. 字体合并逻辑 (`src/pages/editor/index.vue`)

更新了 `allFonts` computed 属性：
```typescript
const allFonts = computed(() => {
  const fonts = [
    ...systemFonts.map((font) => ({ label: font, value: font })),
    ...customFonts,
    ...googleFonts,  // 新增
  ];
  // 确保字体不重复
  const uniqueFonts = new Map();
  fonts.forEach((font) => uniqueFonts.set(font.value, font));
  return Array.from(uniqueFonts.values());
});
```

## 使用方式

### 在编辑器中使用

1. 打开编辑器页面
2. 选择或添加文本图层
3. 在 `TextToolbar` 中点击字体选择器
4. 可以：
   - 滚动浏览所有字体（带实时预览）
   - 输入字体名称进行搜索
   - 点击选择字体应用到文本

### 字体预览效果

- **系统字体**：Arial, 微软雅黑, 宋体等
- **自定义字体**：Arimo, Canva Sans, Montserrat等
- **Google Fonts**：ABeeZee, Abel, Abril Fatface等 1000+ 字体

每个字体在下拉列表中都会使用其自己的字体样式显示，让用户一目了然。

## 性能优化

### 1. 异步加载
使用 `media='print'` + `onload="this.media='all'"` 策略：
- 字体文件不会阻塞页面首次渲染
- 页面加载完成后再加载字体
- 提升用户体验

### 2. CDN 加速
使用 Google Fonts CDN：
- 全球 CDN 加速
- 浏览器缓存
- 自动字体格式优化（woff2, woff等）

### 3. 按需加载（可选优化）

如果发现字体加载太慢，可以考虑以下优化：

#### 方案 1: 分批加载
将 1000+ 字体分成多个 CSS 文件，按需加载：

```typescript
// 动态加载字体
const loadFontBatch = (batchNumber: number) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=...batch${batchNumber}...`;
  document.head.appendChild(link);
};
```

#### 方案 2: 使用 Nuxt Google Fonts 模块
```bash
npm install @nuxtjs/google-fonts
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/google-fonts'],
  googleFonts: {
    families: {
      // 只加载常用字体
      'Open Sans': [300, 400, 700],
      'Roboto': [300, 400, 500, 700],
      'Montserrat': [300, 400, 600, 700],
      // ... 按需添加
    },
    display: 'swap',
    preload: true,
    prefetch: true,
    preconnect: true,
  }
})
```

## 注意事项

1. **首次加载时间**
   - 1000+ 字体的 CSS 文件较大（约 100-200KB）
   - 首次访问可能需要几秒钟加载
   - 后续访问会使用浏览器缓存

2. **字体渲染**
   - 某些字体可能不支持中文字符
   - 建议为中文内容保留系统中文字体

3. **浏览器兼容性**
   - 现代浏览器完全支持
   - IE 11 可能需要额外的 polyfill

## 故障排查

### 字体没有显示预览效果？

1. 检查网络连接
2. 打开浏览器开发者工具 -> Network
3. 查看 `fonts.googleapis.com` 的请求是否成功
4. 如果被墙，考虑使用国内 CDN 镜像

### 字体加载太慢？

1. 减少加载的字体数量（按需加载）
2. 使用 Nuxt Google Fonts 模块
3. 考虑自托管常用字体

### 字体选择器卡顿？

1. 减少一次性渲染的字体数量
2. 使用虚拟滚动（vue-virtual-scroller）
3. 延迟加载字体预览

## 后续优化建议

1. **虚拟滚动**
   - 当字体列表超过 100 个时，使用虚拟滚动
   - 只渲染可见区域的字体选项

2. **字体分类**
   - 按类型分类：Serif, Sans-serif, Display, Handwriting, Monospace
   - 添加标签过滤功能

3. **收藏功能**
   - 允许用户收藏常用字体
   - 在列表顶部显示收藏的字体

4. **字体预加载**
   - 预加载用户最近使用的字体
   - 提升字体切换速度

## 相关文件

- `src/constants/editorConstants.ts` - 字体列表定义
- `src/pages/editor/index.vue` - 字体合并逻辑
- `src/components/editor/TextToolbar.vue` - 字体选择器 UI
- `nuxt.config.ts` - Google Fonts CDN 配置
