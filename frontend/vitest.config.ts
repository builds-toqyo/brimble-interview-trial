import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/coverage/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query')
    }
  }
})
