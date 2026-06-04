# SlideAI - Vue 3 + Tailwind CSS

AI驱动的PPT生成器，支持一句话生成和文档分析。

## 技术栈

- Vue 3 (Composition API + `<script setup>`)
- Vite 5
- Tailwind CSS 3
- Lucide Vue Next (图标)
- pptxgenjs (PPT生成)

## 安装和运行

```bash
# 安装依赖
npm install
# 或
pnpm install

# 启动开发服务器
npm run dev
# 或
pnpm dev

# 构建生产版本
npm run build
# 或
pnpm build
```

## 项目结构

```
vue-export/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── style.css
    └── components/
        ├── AppHeader.vue      # 顶部导航
        ├── HeroSection.vue    # 首页英雄区
        ├── GeneratorSection.vue # PPT生成器
        ├── FeatureCards.vue   # 功能特性卡片
        └── AppFooter.vue      # 页脚
```

## 功能特性

1. **一句话生成PPT** - 输入主题描述，AI自动生成大纲
2. **上传资料分析** - 支持 PDF、Word、TXT、Markdown
3. **下载PPTX** - 生成标准 PowerPoint 文件

## 自定义配色

修改 `tailwind.config.js` 中的 `colors` 配置即可调整主题颜色。

## 接入真实 AI API

在 `GeneratorSection.vue` 中替换 `generatePPT` 和 `analyzeDocument` 函数中的模拟逻辑，接入你的 AI 服务（如 OpenAI、Claude 等）。
