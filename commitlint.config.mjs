/**
 * Conventional Commits, exigido pela secao 7 do AGENTS.md.
 *
 * Os escopos batem com a arquitetura de pastas, para que o historico do git
 * conte a mesma historia que a arvore do repositorio.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'ci',
        'domain',
        'contracts',
        'tokens',
        'mcp',
        'web',
        'api',
        'insight',
        'rag',
        'llm',
        'docs',
      ],
    ],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
}
