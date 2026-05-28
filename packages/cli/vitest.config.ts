import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@contentpulse/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
})
