// iOS (Capacitor) 构建入口：
//   1) 以 CAPACITOR=1 + SKIP_SEO=1 跑一次 vite build（相对 base，不生成 SEO 预渲染）
//   2) npx cap sync ios 把 dist/ 同步到 ios/App/App/public/
//
// 用 Node 包装是为了避免 PowerShell 下 cross-env / && 的引号转义问题。
//
// 前置条件：
//   - 已执行 `npm run ios:add`（即 `npx cap add ios`）生成 ios/ 工程
//   - 本机为 macOS，已装 Xcode 15+ 及 Xcode Command Line Tools
//     （Windows/Linux 上可生成工程文件，但编译/签名必须在 macOS 上进行）

import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function run(cmd, args, label) {
  console.log(`\n[build:ios] ${label}: ${cmd} ${args.join(" ")}`)
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      CAPACITOR: "1",
      SKIP_SEO: "1",
    },
  })
  if (result.error) {
    console.error(`[build:ios] ${label} 启动失败:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`[build:ios] ${label} 失败，退出码 ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

function main() {
  // 1. 构建 Web 资源到 dist/（使用相对 base）
  run(process.execPath, ["./node_modules/vite/bin/vite.js", "build"], "vite build")

  // 2. 同步到 iOS 工程
  run(process.execPath, ["./node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"], "cap sync ios")

  console.log("\n[build:ios] 完成。")
  console.log("  下一步（产出 IPA）：")
  console.log("    调试包:  npx cap run ios                （需要连接模拟器或真机）")
  console.log("    发布包:  npm run ios:build-release      （需要在 Xcode 配置签名）")
  console.log("    或直接:  npm run ios:open  在 Xcode 里 Product > Archive")
}

main()
