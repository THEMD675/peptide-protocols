/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://test.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'),
  },
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
        'src/data/glossary.ts',
        'src/data/dose-presets.ts',
        'src/components/TrialBanner.tsx',
        'src/components/PaymentProcessing.tsx',
        'src/pages/Login.tsx',
        'src/pages/DoseCalculator.tsx',
      ],
      thresholds: {
        lines: 3,
        branches: 5,
        functions: 1,
        statements: 3,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
