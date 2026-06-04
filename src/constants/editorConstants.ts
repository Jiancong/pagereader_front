// 编辑器常量定义

// 字体列表
export const systemFonts = [
  'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
  'Helvetica', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
  'Bodoni 72', 'Songti SC',
  '微软雅黑', '宋体', '黑体', '思源黑体', 'PingFang SC', 'SimHei', 'SimSun',
  // 中文艺术字体
  '华文行楷', '华文新魏', '华文琥珀', '华文隶书', '华文彩云',
  '方正舒体', '方正姚体', '方正黑体', '方正楷体', '方正仿宋'
];

// Google Fonts：完整目录由 public/fonts/google-fonts-catalog.json 提供（npm run fonts:sync 更新）。
// 以下为请求失败时的最小回退。
export const googleFontsFallback: { label: string; value: string }[] = [
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Noto Sans SC", value: "Noto Sans SC" },
  { label: "Noto Serif SC", value: "Noto Serif SC" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Raleway", value: "Raleway" },
  { label: "Oswald", value: "Oswald" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Nunito", value: "Nunito" },
  { label: "Rubik", value: "Rubik" },
  { label: "Work Sans", value: "Work Sans" },
  { label: "Ubuntu", value: "Ubuntu" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Anton", value: "Anton" },
  { label: "Barlow", value: "Barlow" },
  { label: "Fira Sans", value: "Fira Sans" },
  { label: "Source Sans 3", value: "Source Sans 3" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Manrope", value: "Manrope" },
  { label: "Outfit", value: "Outfit" },
  { label: "Sora", value: "Sora" },
  { label: "JetBrains Mono", value: "JetBrains Mono" },
  { label: "IBM Plex Sans", value: "IBM Plex Sans" },
  { label: "Space Grotesk", value: "Space Grotesk" },
  { label: "Great Vibes", value: "Great Vibes" },
  { label: "ZCOOL KuaiLe", value: "ZCOOL KuaiLe" },
  { label: "Liu Jian Mao Cao", value: "Liu Jian Mao Cao" },
];

export const customFonts = [
  { label: 'Arimo', value: 'Arimo' },
  { label: 'Oxanium', value: 'Oxanium' },
  { label: 'Bodoni 72 + Songti SC', value: 'Bodoni 72, Songti SC' },
  { label: 'Playfair Display + Songti SC', value: 'Playfair Display, Songti SC' },
  { label: 'The Amsterdam',             value: 'The Amsterdam',             sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/the-amsterdam' },
  { label: 'New Amsterdam',             value: 'New Amsterdam',             sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/new-amsterdam' },
  { label: 'Amsterdam Script',          value: 'Amsterdam Script',          sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-script' },
  { label: 'Amsterdam',                 value: 'Amsterdam',                 sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam' },
  { label: 'Amsterdam Graffiti',        value: 'Amsterdam Graffiti',        sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-graffiti' },
  { label: 'Amsterdam Handwriting',     value: 'Amsterdam Handwriting',     sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-handwriting' },
  { label: 'Soul Amsterdams',           value: 'Soul Amsterdams Reguler',   sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/soul-amsterdams-reguler' },
  { label: 'Amsterdam Kindom',          value: 'Amsterdam Kindom - Personal use', sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-kindom-personal-use' },
  { label: 'Tour To Amsterdam',         value: 'Tour To Amsterdam',         sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/tour-to-amsterdam' },
  { label: 'Amsterdam Bridge',          value: 'Amsterdam Bridge',          sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-bridge' },
  { label: 'Amsterdam Signature',       value: 'Amsterdam Signature',       sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-signature-4' },
  { label: 'Amsterdam CITY',            value: 'Amsterdam CITY',            sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-city' },
  { label: 'Amsterdam Bright',          value: 'Amsterdam Bright',          sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/amsterdam-bright-2' },
  { label: 'South Amsterdam',           value: 'South Amsterdam',           sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/south-amsterdam' },
  { label: 'North Amsterdam',           value: 'North Amsterdam',           sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/north-amsterdam' },
  { label: 'Vivaldi',                  value: 'Vivaldi',                  sourceType: 'css' as const, cssUrl: 'https://fonts.cdnfonts.com/css/vivaldi' },
  {
    label: 'Didot 2',
    value: 'didot-2',
    sourceType: 'file' as const,
    files: [
      { url: '/fonts/didot-2/didot-2-regular.otf', format: 'opentype' as const, weight: '400', style: 'normal' },
      { url: '/fonts/didot-2/didot-2-bold.otf', format: 'opentype' as const, weight: '700', style: 'normal' },
      { url: '/fonts/didot-2/didot-2-italic.otf', format: 'opentype' as const, weight: '400', style: 'italic' },
      { url: '/fonts/didot-2/didot-2-title.otf', format: 'opentype' as const, weight: '600', style: 'normal' },
    ],
  },
  {
    label: 'Bodoni',
    value: 'bodoni-bundled',
    sourceType: 'file' as const,
    files: [
      {
        url: '/fonts/bodoni-bundled/bodoni-bundled-regular.ttf',
        format: 'truetype' as const,
        weight: '400',
        style: 'normal',
      },
    ],
  },
];

/**
 * Legacy font names from old saved projects mapped to [realFontFamily, cssWeight].
 * Used to normalize "Arimo-Light" → font-family: "Arimo" + font-weight: 300.
 */
export const legacyFontAliases: Record<string, { fontFamily: string; fontWeight: string }> = {
  'Arimo-Light':          { fontFamily: 'Arimo', fontWeight: '300' },
  'Arimo-Regular':        { fontFamily: 'Arimo', fontWeight: '400' },
  'Arimo-Bold':           { fontFamily: 'Arimo', fontWeight: '700' },
  'Canva Sans-Light':     { fontFamily: 'Arial', fontWeight: '300' },
  'Canva Sans-Regular':   { fontFamily: 'Arial', fontWeight: '400' },
  'Canva Sans-Bold':      { fontFamily: 'Arial', fontWeight: '700' },
  'Montserrat-Light':     { fontFamily: 'Montserrat', fontWeight: '300' },
  'Montserrat-Regular':   { fontFamily: 'Montserrat', fontWeight: '400' },
  'Montserrat-Bold':      { fontFamily: 'Montserrat', fontWeight: '700' },
  'Open Sans-Light':      { fontFamily: 'Open Sans', fontWeight: '300' },
  'Open Sans-Regular':    { fontFamily: 'Open Sans', fontWeight: '400' },
  'Open Sans-Bold':       { fontFamily: 'Open Sans', fontWeight: '700' },
  'Poppins-Light':        { fontFamily: 'Poppins', fontWeight: '300' },
  'Poppins-Regular':      { fontFamily: 'Poppins', fontWeight: '400' },
  'Poppins-Bold':         { fontFamily: 'Poppins', fontWeight: '700' },
  'KOMKOT DISPLAY OUTLINE': { fontFamily: 'Anton', fontWeight: '400' },
  'Zico Display Inline':  { fontFamily: 'Playfair Display', fontWeight: '400' },
};

/**
 * fonts.google.com 展示名 / 外部设计稿里的写法 → Google CSS @font-face 里实际注册的 font-family。
 * 若不映射，浏览器找不到字族会整段回退到 sans-serif，画布/导出与列表预览会「像两种字体」。
 * （例：Museo Moderno ↔ API 中的 MuseoModerno）
 */
export const googleFontFaceCanonicalNames: Record<string, string> = {
  "Museo Moderno": "MuseoModerno",
};

// 预设文本样式
export const defaultTextStyles = [
  // === 中文艺术花字样式 ===
  {
    name: '海誓山盟',
    fontFamily: 'Liu Jian Mao Cao',
    fontSize: 48,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FFD700',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    stroke: '#8B4513',
    strokeWidth: 1
  },
  {
    name: '龙飞凤舞',
    fontFamily: 'Long Cang',
    fontSize: 52,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FF4500',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '3px 3px 6px rgba(255,0,0,0.4)',
    stroke: '#8B0000',
    strokeWidth: 2
  },
  {
    name: '春日花开',
    fontFamily: 'Ma Shan Zheng',
    fontSize: 46,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#FF69B4',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '2px 2px 8px rgba(255,105,180,0.6)',
    stroke: '#C71585',
    strokeWidth: 1
  },
  {
    name: '站酷快乐',
    fontFamily: 'ZCOOL KuaiLe',
    fontSize: 44,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#00CED1',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '2px 2px 4px rgba(0,206,209,0.5)',
    stroke: '#008B8B',
    strokeWidth: 1.5
  },
  {
    name: '黄油奶油',
    fontFamily: 'ZCOOL QingKe HuangYou',
    fontSize: 50,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FFD700',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '3px 3px 6px rgba(255,215,0,0.6)',
    stroke: '#FF8C00',
    strokeWidth: 2
  },
  {
    name: '智萌可爱',
    fontFamily: 'Zhi Mang Xing',
    fontSize: 42,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#FF1493',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '2px 2px 6px rgba(255,20,147,0.5)',
    stroke: '#C71585',
    strokeWidth: 1
  },
  // === 新增 20+ 款艺术变体样式 ===
  {
    name: '极粗冲击',
    fontFamily: 'Dela Gothic One',
    fontSize: 50,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    textShadow: '4px 4px 0px #2C3E50',
    stroke: '#ffffff',
    strokeWidth: 1
  },
  {
    name: '霓虹双线',
    fontFamily: 'Train One',
    fontSize: 48,
    color: '#00FF00',
    textAlign: 'center',
    textShadow: '0 0 10px #00FF00, 0 0 20px #008000',
  },
  {
    name: '复古像素',
    fontFamily: 'DotGothic16',
    fontSize: 40,
    color: '#F1C40F',
    textAlign: 'center',
    textShadow: '3px 3px 0px #7F8C8D',
  },
  {
    name: '摇滚时代',
    fontFamily: 'RocknRoll One',
    fontSize: 46,
    color: '#9B59B6',
    textAlign: 'center',
    stroke: '#ffffff',
    strokeWidth: 2
  },
  {
    name: '解构艺术',
    fontFamily: 'Reggae One',
    fontSize: 44,
    color: '#3498DB',
    textAlign: 'center',
    textShadow: '2px 2px 8px rgba(52,152,219,0.5)',
  },
  {
    name: '波谱圆圆',
    fontFamily: 'Potta One',
    fontSize: 42,
    color: '#FF8C00',
    textAlign: 'center',
    stroke: '#8B4513',
    strokeWidth: 1.5
  },
  {
    name: '摩登糖果',
    fontFamily: 'Mochiy Pop One',
    fontSize: 44,
    color: '#FF69B4',
    textAlign: 'center',
    textShadow: '3px 3px 0px #FFC0CB',
  },
  {
    name: '直线线条',
    fontFamily: 'Stick',
    fontSize: 40,
    color: '#2ECC71',
    textAlign: 'center',
  },
  {
    name: '八丸流行',
    fontFamily: 'Hachi Maru Pop',
    fontSize: 42,
    color: '#FFB6C1',
    textAlign: 'center',
    stroke: '#FF1493',
    strokeWidth: 1
  },
  {
    name: '优雅手写',
    fontFamily: 'Klee One',
    fontSize: 38,
    color: '#4B0082',
    textAlign: 'center',
  },
  {
    name: '奇异圆体',
    fontFamily: 'Kiwi Maru',
    fontSize: 40,
    color: '#008080',
    textAlign: 'center',
  },
  {
    name: '佑字书法',
    fontFamily: 'Yuji Syuku',
    fontSize: 46,
    color: '#8B0000',
    textAlign: 'center',
  },
  {
    name: '红道手迹',
    fontFamily: 'Zen Kurenaido',
    fontSize: 42,
    color: '#556B2F',
    textAlign: 'center',
  },
  {
    name: '商务简洁',
    fontFamily: 'Biz UDPMincho',
    fontSize: 36,
    color: '#2F4F4F',
    textAlign: 'center',
  },
  {
    name: '雏风明朝',
    fontFamily: 'Hina Mincho',
    fontSize: 38,
    color: '#483D8B',
    textAlign: 'center',
  },
  {
    name: '水墨狂草',
    fontFamily: 'Yuji Boku',
    fontSize: 52,
    color: '#1A1A1A',
    textAlign: 'center',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  
  // === 中文简约风格 ===
  {
    name: '简约黑',
    fontFamily: 'Noto Sans SC',
    fontSize: 36,
    fontWeight: '500',
    fontStyle: 'normal',
    color: '#333333',
    textAlign: 'center',
    textDecoration: 'none'
  },
  {
    name: '简约白',
    fontFamily: 'Noto Sans SC',
    fontSize: 36,
    fontWeight: '300',
    fontStyle: 'normal',
    color: '#FFFFFF',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
  },
  {
    name: '优雅宋体',
    fontFamily: 'Noto Serif SC',
    fontSize: 38,
    fontWeight: '400',
    fontStyle: 'normal',
    color: '#2C3E50',
    textAlign: 'center',
    textDecoration: 'none'
  },
  {
    name: '现代简洁',
    fontFamily: 'Noto Sans SC',
    fontSize: 34,
    fontWeight: '600',
    fontStyle: 'normal',
    color: '#1ABC9C',
    textAlign: 'center',
    textDecoration: 'none'
  },
  
  // === 英文艺术花字样式 ===
  {
    name: 'Neon Glow',
    fontFamily: 'Monoton',
    fontSize: 48,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#00FFFF',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF',
    stroke: '#00CED1',
    strokeWidth: 1
  },
  {
    name: 'Retro Wave',
    fontFamily: 'Bungee Outline',
    fontSize: 46,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#FF00FF',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '3px 3px 0px #00FFFF, 6px 6px 0px #FF00FF',
    stroke: '#8B008B',
    strokeWidth: 2
  },
  {
    name: 'Gold Luxury',
    fontFamily: 'Cinzel Decorative',
    fontSize: 44,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FFD700',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 10px #FFD700',
    stroke: '#B8860B',
    strokeWidth: 1.5
  },
  {
    name: 'Fire Blaze',
    fontFamily: 'Nosifer',
    fontSize: 50,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#FF4500',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '0 0 10px #FF4500, 0 0 20px #FF6347, 0 0 30px #FF0000',
    stroke: '#8B0000',
    strokeWidth: 2
  },
  {
    name: 'Ice Crystal',
    fontFamily: 'Faster One',
    fontSize: 48,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#E0FFFF',
    textAlign: 'center',
    textDecoration: 'none',
    textShadow: '0 0 10px #00CED1, 0 0 20px #00BFFF, 2px 2px 4px rgba(0,0,0,0.3)',
    stroke: '#4682B4',
    strokeWidth: 1.5
  },
  
  // === 原有样式保留 ===
  {
    name: '标题',
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'center',
    textDecoration: 'none'
  },
  {
    name: '副标题',
    fontFamily: 'Open Sans',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'center',
    textDecoration: 'none'
  },
  {
    name: '正文',
    fontFamily: 'Arimo',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'left',
    textDecoration: 'none'
  },
  {
    name: 'Outline Text',
    fontFamily: 'Anton',
    fontSize: 28,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'center',
    textDecoration: 'none'
  },
  {
    name: 'Inline Text',
    fontFamily: 'Playfair Display',
    fontSize: 28,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'center',
    textDecoration: 'none'
  }
];

// 默认文本图层属性
export const defaultTextLayerProps = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#ffffff',
  strokeWidth: 0,
  strokeColor: '#8B0000',
  textAlign: 'left' as 'left' | 'center' | 'right',
  opacity: 100,
  textDecoration: 'none' as 'none' | 'underline'
};

// 默认图片图层属性
export const defaultImageLayerProps = {
  opacity: 100,
  rotation: 0
};