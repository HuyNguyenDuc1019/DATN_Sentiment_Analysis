import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '.vite-cache',
  build: {
    // html2pdf is isolated in the lazy-loaded Report page; it does not delay initial startup.
    chunkSizeWarningLimit: 750,
  },
  plugins: [react()],
})
