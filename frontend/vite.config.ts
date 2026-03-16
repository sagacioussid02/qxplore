import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['use-sync-external-store/shim/with-selector'],
  },
  server: {
    port: 5173,
  },
})
