import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Dev: Vite on 5173, Express API on 3000 (proxied).
// Prod: Express serves the built client on 3000.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT ?? 3000}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: false,
    testTimeout: 15_000,
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx',
      'server/__tests__/**/*.test.ts',
      'bin/**/__tests__/**/*.test.mjs'
    ]
  }
})
