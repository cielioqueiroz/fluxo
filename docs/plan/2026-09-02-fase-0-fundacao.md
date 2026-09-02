# Fase 0, fundação. Plano de execução

**Roadmap:** `docs/plan/2026-09-02-roadmap.md`
**Spec:** `AGENTS.md` na raiz

**Objetivo:** deixar o monorepo compilando, lintando, testando e passando no CI,
sem nenhuma linha de código de produto.

**Definição de pronto:** `pnpm lint`, `pnpm typecheck`, `pnpm test` e
`pnpm build` verdes na raiz, com a saída real colada na resposta, e o arquivo de
workflow do CI escrito.

## Ambiente apurado antes de começar

| Item | Valor   | Observação                                                                                                                                          |
| ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node | 24.14.1 | `.nvmrc` fica em `24`                                                                                                                               |
| pnpm | 10.28.2 | `corepack enable` falhou por EPERM em `C:\Program Files\nodejs`. Instalado por `npm i -g pnpm@10.28.2`, no prefixo do usuário. Sem admin, sem custo |
| git  | 2.55.0  | o diretório ainda não é um repositório                                                                                                              |

## Desvio consciente do roadmap

O roadmap dizia "Vitest configurado na raiz com projetos por pacote". Na
execução, cada pacote passa a ter o seu próprio `vitest.config.ts` e o
Turborepo orquestra a tarefa `test`. O motivo é que o limite de cobertura de 90%
da Fase 1 vale para `packages/domain` e não para o front, então o limite mora no
pacote que ele governa. Registrado no ADR 0004.

## Nomes de pacote

`@fluxo/domain`, `@fluxo/contracts`, `@fluxo/tokens`, `@fluxo/mcp-server`,
`@fluxo/web`, `@fluxo/api`. O prefixo existe para que a regra de fronteira do
grafo possa ser escrita por padrão de nome.

---

### Tarefa 1, raiz do workspace

**Arquivos:** criar `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`,
`.gitignore`, `.editorconfig`

- [ ] Passo 1. `package.json` privado, com `packageManager` fixo em
      `pnpm@10.28.2`, campo `engines` exigindo Node 24, e os scripts `lint`,
      `typecheck`, `test`, `build` e `format` delegando ao Turborepo
- [ ] Passo 2. `pnpm-workspace.yaml` com `apps/*` e `packages/*`
- [ ] Passo 3. `.nvmrc` com `24`
- [ ] Passo 4. `.gitignore` cobrindo `node_modules`, `.turbo`, `dist`, `.nuxt`,
      `.output`, `coverage` e `.env*` menos `.env.example`
- [ ] Passo 5. `.editorconfig` com LF, UTF-8 e indentação de dois espaços
- [ ] Passo 6. `pnpm install` e conferir que a árvore sobe vazia sem erro

### Tarefa 2, TypeScript estrito compartilhado

**Arquivos:** criar `tsconfig.base.json` e `tsconfig.json` na raiz

- [ ] Passo 1. `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`,
      `exactOptionalPropertyTypes`, `noImplicitOverride`,
      `noFallthroughCasesInSwitch`, `noImplicitReturns`, `verbatimModuleSyntax`,
      `isolatedModules`, `module` e `moduleResolution` em `nodenext`, `target`
      em `es2023`, `declaration` e `sourceMap` ligados
- [ ] Passo 2. `tsconfig.json` na raiz que só referencia a base, para o editor

O ADR 0003 registra por que a base vive na raiz e não em um pacote
`packages/tsconfig`: a árvore declarada no `AGENTS.md` não prevê esse pacote, e
inventar diretório fora da árvore é desvio de contrato.

### Tarefa 3, casca de `packages/domain`

**Arquivos:** criar `packages/domain/package.json`,
`packages/domain/tsconfig.json`, `packages/domain/vitest.config.ts`,
`packages/domain/src/index.ts`, `packages/domain/tests/toolchain.test.ts`

O pacote nasce com o campo `dependencies` ausente de propósito. A regra G9 diz
que `packages/domain` não importa nada, e a forma mais forte de garantir isso é
não ter dependência nenhuma para importar.

- [ ] Passo 1. Escrever o teste que falha, provando que o encanamento roda:

```ts
import { describe, expect, it } from 'vitest'
import { DOMAIN_READY } from '../src/index.js'

describe('encanamento do pacote de domínio', () => {
  it('exporta o marcador de prontidão', () => {
    expect(DOMAIN_READY).toBe(true)
  })
})
```

- [ ] Passo 2. Rodar e ver falhar. Esperado: erro de módulo não encontrado
- [ ] Passo 3. Escrever `src/index.ts` com
      `export const DOMAIN_READY = true` e nada mais
- [ ] Passo 4. Rodar e ver passar
- [ ] Passo 5. Rodar `tsc --noEmit` e ver passar

Este é o único código deste tipo que o repositório vai conter. Ele existe para
provar a ferramenta e some na Fase 1, quando o `index.ts` passa a exportar a
superfície real do domínio.

### Tarefa 4, ESLint, Prettier e a fronteira do grafo

**Arquivos:** criar `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`

- [ ] Passo 1. Instalar `eslint`, `@eslint/js`, `typescript-eslint`,
      `eslint-config-prettier`, `prettier` e `globals` como devDependencies da
      raiz. Justificativa exigida pela regra 5 da seção 8 do `AGENTS.md`: não
      existe nada no repositório que faça análise estática, e a proibição de
      `any` da regra 8 precisa de um verificador
- [ ] Passo 2. Config base com as regras recomendadas de tipo, mais
      `@typescript-eslint/no-explicit-any` como erro
- [ ] Passo 3. A fronteira do grafo escrita em `no-restricted-imports`, um bloco
      por pacote, sem instalar plugin novo. Justificativa no ADR 0002
- [ ] Passo 4. Rodar `pnpm lint` e ver passar

### Tarefa 5, Turborepo

**Arquivos:** criar `turbo.json`

- [ ] Passo 1. Instalar `turbo` como devDependency da raiz
- [ ] Passo 2. `turbo.json` com as tarefas `build`, `lint`, `typecheck` e `test`,
      declarando `dependsOn` de `^build` onde faz sentido e as saídas cacheáveis
- [ ] Passo 3. Rodar `pnpm turbo run lint typecheck test build` e colar a saída

### Tarefa 6, Husky, lint-staged e commitlint

**Arquivos:** criar `.husky/pre-commit`, `.husky/commit-msg`,
`commitlint.config.mjs`, e a chave `lint-staged` no `package.json`

- [ ] Passo 1. `git init` e primeiro `git add`
- [ ] Passo 2. Instalar `husky`, `lint-staged`, `@commitlint/cli` e
      `@commitlint/config-conventional`. Justificativa: a regra 11 das
      restrições globais exige Conventional Commits, e regra sem verificação é
      recomendação
- [ ] Passo 3. `husky init`, depois `pre-commit` rodando `lint-staged` e
      `commit-msg` rodando `commitlint`
- [ ] Passo 4. Provar que funciona: tentar um commit com mensagem fora do padrão
      e mostrar a recusa, depois commitar no padrão e mostrar o sucesso

### Tarefa 7, CI

**Arquivos:** criar `.github/workflows/ci.yml`

- [ ] Passo 1. Workflow em `push` e `pull_request`, com checkout, `pnpm/action-setup`
      lendo o campo `packageManager`, `setup-node` com cache de pnpm,
      `pnpm install --frozen-lockfile`, depois `lint`, `typecheck`, `test` e
      `build`
- [ ] Passo 2. Cache do Turborepo entre execuções
- [ ] Passo 3. O workflow só roda de verdade quando existir o remoto. Fica
      escrito e verificado por leitura nesta fase

### Tarefa 8, ADRs

**Arquivos:** criar `docs/adr/0001-monorepo-pnpm-turborepo.md`,
`0002-fronteira-de-import-por-lint.md`, `0003-tsconfig-base-na-raiz.md`,
`0004-vitest-por-pacote.md`, e o `docs/adr/README.md` com o formato adotado

- [ ] Passo 1. Escrever os quatro ADRs no formato contexto, decisão,
      consequências, alternativas descartadas
- [ ] Passo 2. Commitar

### Tarefa 9, verificação final

- [ ] Passo 1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, saída
      real colada
- [ ] Passo 2. Árvore de arquivos criados
- [ ] Passo 3. Conferir a lista de restrições globais G1 a G12 uma a uma
