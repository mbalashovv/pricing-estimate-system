import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function resolveBackendOrigin(apiBaseUrl: string) {
  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    return new URL(apiBaseUrl).origin
  }

  return 'http://127.0.0.1:8000'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || '/api'
  const backendOrigin = resolveBackendOrigin(apiBaseUrl)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
        '/media': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})
