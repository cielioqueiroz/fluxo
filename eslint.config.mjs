// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Fronteira do grafo de dependencia declarado no AGENTS.md secao 3.
 *
 *   apps/web            -> contracts, tokens, domain
 *   apps/api            -> contracts, domain
 *   packages/mcp-server -> contracts, domain
 *   packages/domain     -> nada
 *
 * A regra vive aqui, e nao em um plugin novo, porque `no-restricted-imports`
 * ja resolve. Ver docs/adr/0002-fronteira-de-import-por-lint.md
 */
const PROIBIDO_NO_DOMINIO = [
  '@fluxo/*',
  'node:*',
  'vue',
  'vue/*',
  'nuxt',
  'nuxt/*',
  'pinia',
  '@vueuse/*',
  '@nestjs/*',
  'fastify',
  'fastify/*',
  'drizzle-orm',
  'drizzle-orm/*',
  'zod',
  'zod/*',
  'gsap',
  'gsap/*',
  'three',
  'three/*',
  '@tresjs/*',
  'lenis',
]

/** Nenhum lado da aplicacao enxerga o outro. So `contracts` atravessa. */
const PROIBIDO_ENTRE_APPS = {
  web: ['@fluxo/api', '**/apps/api/**'],
  api: ['@fluxo/web', '@fluxo/tokens', '**/apps/web/**'],
  mcp: ['@fluxo/web', '@fluxo/api', '@fluxo/tokens', '**/apps/**'],
}

/** @param {readonly string[]} group @param {string} message */
const restringir = (group, message) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    { patterns: [{ group: [...group], message }] },
  ],
})

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.nitro/**',
      '**/tokens.css',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // AGENTS.md regra 8, sem `any` em lugar nenhum.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // Arquivos de configuracao em JavaScript ficam fora da analise por tipo.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    files: ['packages/domain/**/*.ts'],
    ignores: ['packages/domain/vitest.config.ts', 'packages/domain/tests/**/*.ts'],
    rules: restringir(
      PROIBIDO_NO_DOMINIO,
      'packages/domain nao importa nada. Calculo puro, sem framework e sem plataforma. AGENTS.md secao 3.',
    ),
  },
  {
    files: ['apps/web/**/*.{ts,vue}'],
    rules: restringir(
      PROIBIDO_ENTRE_APPS.web,
      'apps/web nao enxerga apps/api. A fronteira entre os dois e packages/contracts. AGENTS.md secao 3.',
    ),
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: restringir(
      PROIBIDO_ENTRE_APPS.api,
      'apps/api nao enxerga apps/web nem os tokens de design. AGENTS.md secao 3.',
    ),
  },
  {
    files: ['packages/mcp-server/**/*.ts'],
    rules: restringir(
      PROIBIDO_ENTRE_APPS.mcp,
      'packages/mcp-server so consome domain e contracts. AGENTS.md secao 3.',
    ),
  },

  prettier,
)
