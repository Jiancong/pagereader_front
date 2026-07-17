// Android (Capacitor) 构建入口：
//   1) 以 CAPACITOR=1 + SKIP_SEO=1 跑一次 vite build（相对 base，不生成 SEO 预渲染）
//   2) npx cap sync android 把 dist/ 同步到 android/app/src/main/assets/public/
//
// 用 Node 包装是为了避免 PowerShell 下 cross-env / && 的引号转义问题。
//
// 前置条件：
//   - 已执行 `npm run android:add`（即 `npx cap add android`）生成 android/ 工程
//   - 本机已装 JDK 17+ 与 Android SDK，且设置了 ANDROID_HOME / JAVA_HOME

import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function run(cmd, args, label) {
  console.log(`\n[build:android] ${label}: ${cmd} ${args.join(" ")}`)
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    // 不使用 shell：避免 Node 路径含空格（如 "d:\Program Files\nodejs"）时被错误切分
    env: {
      ...process.env,
      // 让 vite.config.js 走相对 base，并跳过 SEO 后处理
      CAPACITOR: "1",
      SKIP_SEO: "1",
    },
  })
  if (result.error) {
    console.error(`[build:android] ${label} 启动失败:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`[build:android] ${label} 失败，退出码 ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

function main() {
  // 1. 构建 Web 资源到 dist/（使用相对 base）
  run(process.execPath, ["./node_modules/vite/bin/vite.js", "build"], "vite build")

  // 2. 同步到 Android 工程
  run(process.execPath, ["./node_modules/@capacitor/cli/bin/capacitor", "sync", "android"], "cap sync android")

  console.log("\n[build:android] 完成。")
  console.log("  下一步（产出 APK）：")
  console.log("    调试包:  npx cap build android --keystorepath debug --keystorepass android --keystorealias androiddebugkey --keystorealiaspass android")
  console.log("    发布包:  npx cap build android   (需要在 android/app/build.gradle 配 release signingConfig)")
  console.log("    或直接:  npm run android:open  在 Android Studio 里 Build > Generate Signed APK")
}

main()
