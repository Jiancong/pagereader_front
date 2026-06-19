/**
 * Nuxt 3 集成示例
 * 将 link 合并进 nuxt.config.ts → app.head.link
 */
export const brandFontHeadLinks = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" as const },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Oxanium:wght@200;400;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap",
    media: "print",
    // @ts-expect-error onload 为 HTML 属性字符串
    onload: "this.media='all'",
  },
];

// nuxt.config.ts 用法：
// css: ['~/path/to/font-styles-export/styles/index.css'],
// app: { head: { link: [...brandFontHeadLinks] } },
