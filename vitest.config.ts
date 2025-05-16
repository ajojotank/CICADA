import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/tests/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'istanbul',
      include: ['src/services/api/**/*'],
      exclude: [
        'src/services/api/**/*.d.ts',
        'src/services/api/**/index.ts',
        "src/services/api/**/privateDocumentService.ts",
        "src/services/api/publicDocumentService.ts",
        "src/services/api/documentService.ts",
      ]
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },
})