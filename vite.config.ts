import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'

// The build is one self-contained dist/index.html: it runs by double-click (file://) or from any static host.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
