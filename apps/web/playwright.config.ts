import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright roda contra o build de producao, e nao contra o servidor de
 * desenvolvimento.
 *
 * O que a Fase 8 precisa verificar e o que o usuario recebe: o HTML servido, as
 * fontes com caminho estavel, o sitemap. Em desenvolvimento nada disso passa
 * pelo mesmo caminho.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  reporter: process.env.CI === 'true' ? 'github' : 'list',

  use: {
    baseURL: 'http://127.0.0.1:3210',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'movimento',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /*
       * O mesmo percurso com movimento reduzido.
       *
       * Nao e um teste de acessibilidade a parte: e o mesmo conjunto, rodado
       * com a preferencia ligada. A secao 5 do AGENTS.md trata isso como
       * requisito, e requisito verificado em suite separada e requisito que
       * ninguem roda.
       */
      name: 'movimento-reduzido',
      // A emulacao de fato acontece no beforeEach da suite: a opcao aqui nao
      // chegava ao contexto. O projeto existe para dar nome ao percurso.
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:3210',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: '3210', HOST: '127.0.0.1' },
  },
})
