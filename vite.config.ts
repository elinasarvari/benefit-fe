import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const apiTarget = process.env.API_BASE_URL ?? 'http://localhost:8000'
const proxy = { '/api': { target: apiTarget, changeOrigin: false } }
// UI_PORT moves the dev and preview servers (benefit-be's `make verify` runs its own stack on free
// ports); unset, Vite's defaults apply as before.
const uiPort = process.env.UI_PORT ? Number(process.env.UI_PORT) : undefined
const ports = uiPort ? { port: uiPort, strictPort: true } : {}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { proxy, ...ports },
  preview: { proxy, ...ports },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    env: { TZ: 'America/Chicago' },
    globals: true,
  },
})
