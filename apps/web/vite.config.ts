// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
  proxy: {
    '/api/generate-emails': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          const accept = String(req.headers['accept'] || '')
          const url = String(req.url || '')
          if (accept.includes('text/event-stream') || url.includes('stream=1')) {
            proxyReq.setHeader('Accept', 'text/event-stream')
          }
        })
      },
    },
    '/api/brand':    { target: 'http://127.0.0.1:3001', changeOrigin: true },
    '/api/products': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    '/api/generate': { target: 'http://127.0.0.1:3001', changeOrigin: true },
  },
},
})