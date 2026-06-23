// 构建后 SEO 步骤：prerender → injectBookSeoPages → generate-sitemap
//
// 跳过全部 SEO（本地快速构建）：
//   SKIP_SEO=1 npm run build
//   PowerShell: $env:SKIP_SEO=1; npm run build
// 或直接使用：npm run build:fast
//
// 也可单独跳过某一步：
//   SKIP_PRERENDER=1 | SKIP_INJECT_SEO=1 | SKIP_SITEMAP=1

import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function isSkipEnv(name) {
  return /^(1|true|yes)$/i.test(String(process.env[name] || ""))
}

function runNodeScript(scriptName) {
  const scriptPath = resolve(ROOT, "scripts", scriptName)
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  if (isSkipEnv("SKIP_SEO")) {
    console.log(
      "[build] SKIP_SEO=1 — skipping prerender, injectBookSeoPages, generate-sitemap",
    )
    return
  }

  runNodeScript("prerender.mjs")
  runNodeScript("injectBookSeoPages.mjs")
  runNodeScript("generate-sitemap.mjs")
}

main()
