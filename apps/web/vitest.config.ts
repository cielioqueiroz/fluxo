import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // O Nuxt resolve `~~` para a raiz do app. O Vitest roda fora do Nuxt, entao
  // o apelido precisa ser declarado aqui tambem.
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/format.ts'],
      reporter: ['text'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
})
