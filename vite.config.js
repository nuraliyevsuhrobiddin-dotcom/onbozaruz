import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui-vendor'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor'
          return 'vendor'
        },
      },
    },
  },
})
