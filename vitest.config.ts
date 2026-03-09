/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: [
        'src/contexts/AuthContext.tsx',
        'src/lib/utils.ts',
        'src/lib/dose-calculator.ts',
        'src/data/glossary.ts',
        'src/data/dose-presets.ts',
        'src/components/TrialBanner.tsx',
        'src/components/PaymentProcessing.tsx',
        'src/pages/Login.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
