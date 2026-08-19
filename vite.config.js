import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        try {
          if (pathname === '/api/health') {
            const mod = await server.ssrLoadModule('/api/health.ts')
            return await mod.default(req, res)
          }
          if (pathname === '/api/send-email') {
            const mod = await server.ssrLoadModule('/api/send-email.ts')
            return await mod.default(req, res)
          }
          if (pathname === '/api/auth/send-verification') {
            const mod = await server.ssrLoadModule('/api/auth/send-verification.ts')
            return await mod.default(req, res)
          }
          if (pathname === '/api/auth/send-welcome') {
            const mod = await server.ssrLoadModule('/api/auth/send-welcome.ts')
            return await mod.default(req, res)
          }
          if (pathname === '/api/auth/send-password-reset') {
            const mod = await server.ssrLoadModule('/api/auth/send-password-reset.ts')
            return await mod.default(req, res)
          }
        } catch (error) {
          console.error('[API Dev Server Error]', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error?.message || 'Dev server error' }))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || env.RESEND_API_KEY
  process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL

  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
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
  }
})
