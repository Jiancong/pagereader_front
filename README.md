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

---

## Android APK 构建

本项目使用 [Capacitor 6](https://capacitorjs.com/) 把同一套 Vue 3 + Vite 前端打包成 Android 应用。构建流程：`vite build`（相对 base）→ `cap sync android`（同步到 `android/app/src/main/assets/public`）→ Gradle 编译 APK。

### 本机环境前置条件

> ⚠️ 你**必须**先在本机装好以下工具，否则 Gradle 编译会失败。代码侧的所有改造已经完成，下面只是补齐工具链。

1. **JDK 17+**（不是 JRE）
   - Capacitor 6 / Android Gradle Plugin 8.x 要求 JDK 17。
   - 下载：[Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17)
   - 设置环境变量 `JAVA_HOME` 指向 JDK 安装目录（例如 `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`），并把 `%JAVA_HOME%\bin` 加入 `PATH`。
   - 验证：`java -version` 应显示 `17.x`。

2. **Android Studio**（含 Android SDK）
   - 下载：[developer.android.com/studio](https://developer.android.com/studio)
   - 首次启动时通过 Studio Installer 安装 **Android SDK Platform 34** 和 **Android SDK Build-Tools**。
   - 设置环境变量 `ANDROID_HOME`（或 `ANDROID_SDK_ROOT`）指向 SDK 目录，通常是 `C:\Users\<你>\AppData\Local\Android\Sdk`。

3. 接受 SDK 许可协议：在 Android Studio 里 Tools → SDK Manager 安装任一 Platform 时会自动弹出；命令行可执行 `sdkmanager --licenses`。

> 当前机器只装了 JDK 11、没有 Android SDK，所以 `npx cap build android` 还无法在本机直接产出 APK。完成上面三步后即可。

### 已落地的代码改造

以下改动已经完成，构建命令开箱即用：

| 文件 | 作用 |
| --- | --- |
| `capacitor.config.json` | 应用 `appId=top.page2.app`、`appName=Page2Top`、`webDir=dist`，使用 `https` scheme |
| `vite.config.js` | 当环境变量 `CAPACITOR=1` 时 `base` 设为 `./`，使 `file://`/WebView 下资源路径正确 |
| `src/router.ts` | 在原生壳内自动切换为 `createWebHashHistory()`，避免 history 模式 404 |
| `scripts/buildAndroid.mjs` | 一键脚本：`CAPACITOR=1 SKIP_SEO=1 vite build` + `cap sync android` |
| `android/` | 已通过 `npx cap add android` 生成的完整 Gradle 工程 |

### 构建命令一览

```bash
# 1. 构建 Web 资源并同步到 android/ 工程（不需要 SDK，纯 Node）
npm run build:android

# 2. 把 dist/ 重新同步到 android/（不重新 build Web，调试时常用）
npm run android:sync

# 3. 在 Android Studio 里打开 android/ 工程
npm run android:open

# 4. 连接真机/模拟器，直接安装并运行 debug 版
npm run android:run

# 5. 产出 release APK（需要先配置签名，见下）
npm run android:build-release

# 清理 Gradle 缓存（编译异常时使用）
npm run android:clean
```

### 产出可发布的 release APK（签名配置）

Play Console 只接受带 release 签名的 APK/AAB。一次性配置：

1. **生成自己的 keystore**（只需做一次，妥善备份，丢了就无法再更新该应用）：

   ```bash
   keytool -genkey -v -keystore page2top.keystore -alias page2top -keyalg RSA -keysize 2048 -validity 36500
   ```

   把生成的 `page2top.keystore` 放到 `android/app/` 下（已被 `.gitignore` 忽略，不会入库）。

2. **在 `android/` 下创建 `keystore.properties`**（同样不入库）：

   ```properties
   storeFile=page2top.keystore
   storePassword=你设置的密码
   keyAlias=page2top
   keyPassword=你设置的密码
   ```

3. **在 `android/app/build.gradle` 配置 release signingConfig**。在 `android { ... }` 块顶部读取 properties，并在 `buildTypes.release` 引用：

   ```gradle
   // android/app/build.gradle 顶部加
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('keystore.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       // ... 既有内容 ...

       signingConfigs {
           release {
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
           }
       }
       buildTypes {
           release {
               minifyEnabled false
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
               signingConfig signingConfigs.release
           }
       }
   }
   ```

4. **构建 release APK**：

   ```bash
   npm run android:build-release
   ```

   产物路径：`android/app/build/outputs/apk/release/app-release.apk`。

   也可以用 Android Studio：`npm run android:open` → `Build > Generate Signed Bundle / APK`。

### 发布到 Google Play

1. 在 [Play Console](https://play.google.com/console) 创建应用，包名填 `top.page2.app`（即 `capacitor.config.json` 里的 `appId`）。
2. 推荐上传 **AAB**（Android App Bundle）而非 APK：`npm run android:open` → Build > Generate Signed Bundle → Android App Bundle。
3. 首次上传需要填写内容分级、隐私政策 URL（项目里已有 `/privacy` 路由，可直接用线上地址）、目标受众等。
4. 应用图标默认用的是 Capacitor 自带的机器人图标，建议替换 `android/app/src/main/res/mipmap-*/ic_launcher.png` 为自己的图标，或用 [Image Asset Studio](https://developer.android.com/studio/write/image-asset-studio) 生成。

### 修改包名 / 应用名

- **包名（appId）**：同时改 `capacitor.config.json` 的 `appId` 和 `android/app/build.gradle` 的 `applicationId` / `namespace`，然后 `npm run android:clean && npm run android:sync`。
- **应用名**：改 `capacitor.config.json` 的 `appName`，以及 `android/app/src/main/res/values/strings.xml` 里的 `app_name`、`title_activity_main`，再 `npm run android:sync`。

