import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        // Sobe o processo, nao e importavel em teste.
        'src/main.ts',
        // Declaracao de injecao, sem logica propria.
        'src/**/*.module.ts',
        // Abrem conexao real com o Neon. Exercitar exigiria provisionar o
        // banco, e nao ha nenhuma decisao nestes arquivos para testar: o que
        // importa e o comportamento sem banco, que health.test.ts cobre.
        'src/database/drizzle.client.ts',
        'src/database/schema/index.ts',
      ],
      reporter: ['text'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})
