import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Libraries only lazily loaded parts use (admin charts, maps, video compression).
const LAZY_ONLY = /[\\/]node_modules[\\/](mediabunny|recharts|d3-[^\\/]+|victory-vendor|internmap|@reduxjs|redux|react-redux|reselect|immer|es-toolkit|decimal\.js-light|eventemitter3|tiny-invariant|use-sync-external-store)[\\/]/

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The API is PHP (public/api). During development run it with
  //   php -S 127.0.0.1:8080 -t public ahost/dev-router.php
  // or point VITE_DEV_API_PROXY at the live site.
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8080'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: true },
      },
    },
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            // Libraries used only by lazily loaded parts are left to the bundler so
            // they load with those parts. A named 'charts-vendor' group had pulled
            // React itself in and was downloaded by every visitor.
            if (LAZY_ONLY.test(id) || id.includes('leaflet')) return undefined
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
            if (id.includes('@supabase')) return 'supabase-vendor'
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui-vendor'
            return 'vendor'
          },
        },
      },
    },
  }
})
