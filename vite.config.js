import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 兼容 Next 时代 .env.production：NEXT_PUBLIC_API_BASE / NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const apiUrl = env.VITE_API_URL || env.NEXT_PUBLIC_API_BASE || ''
  const googleClientId =
    env.VITE_GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  const gtmId = env.VITE_GTM_ID || env.NEXT_PUBLIC_GTM_ID || ''
  const paypalClientId =
    env.VITE_PAYPAL_CLIENT_ID || env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_GTM_ID': JSON.stringify(gtmId),
      'import.meta.env.VITE_PAYPAL_CLIENT_ID': JSON.stringify(paypalClientId),
    },
  }
})
