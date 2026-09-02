# 0002. A fronteira do grafo de dependência é regra de lint

**Estado:** aceito
**Fase:** 0
**Data:** 2026-09-02

## Contexto

A seção 3 do `AGENTS.md` declara um grafo e encerra com "qualquer import fora
desse grafo é erro". A palavra é erro, não recomendação. Precisa de um
verificador que rode no CI.

O grafo tem duas partes com naturezas diferentes. A primeira é entre pacotes
publicáveis: `apps/web` não pode importar `@fluxo/api`. Essa parte já é coberta
pelo pnpm, porque um pacote que não declarou a dependência não a resolve. A
segunda é dentro do pacote: `packages/domain` não pode importar Vue, Nest, Zod
nem sequer `node:fs`, e disso o gerenciador de pacotes não sabe nada.

## Decisão

A fronteira é escrita em `@typescript-eslint/no-restricted-imports`, no
`eslint.config.mjs` da raiz, com um bloco por pacote endereçado por `files`.
Nenhum plugin novo é instalado.

A regra da extensão do typescript-eslint foi preferida à regra base do ESLint
porque também alcança `import type`, e um tipo importado de Vue dentro do
domínio já é acoplamento.

`packages/domain` recebe a lista mais dura, que inclui `node:*`. Um cálculo de
amortização que lê arquivo ou relógio deixa de ser determinístico, e o
determinismo é o que permite à seção 6 do `AGENTS.md` afirmar que a IA nunca
produz número.

## Consequências

- Violar o grafo quebra o CI na etapa de lint, com uma mensagem que cita a seção
  do `AGENTS.md`. A regra explica a si mesma para quem a encontrar
- A lista de módulos proibidos no domínio é enumerada, não inferida. Ao adicionar
  uma biblioteca nova ao front ou ao back, ela precisa entrar na lista. O custo é
  baixo e o esquecimento é parcialmente coberto pelo fato de que
  `packages/domain` não tem dependências declaradas
- O lint roda uma vez na raiz, e não por pacote pelo Turborepo. A fronteira é
  cruzada por natureza, então uma passada única sobre o monorepo é mais barata e
  mais correta do que uma passada por pacote

## Alternativas descartadas

**`eslint-plugin-boundaries`.** Expressa o grafo com mais elegância, por camadas
nomeadas. Descartado pela regra 5 da seção 8 do `AGENTS.md`: instalar biblioteca
exige justificar por que o que já existe não resolve, e `no-restricted-imports`
resolve. A configuração inteira cabe em quarenta linhas legíveis.

**`dependency-cruiser`.** Ferramenta mais completa, com grafo visual e regras
por caminho de arquivo. Descartada pelo mesmo motivo, mais o fato de acrescentar
uma segunda etapa de verificação ao CI onde o lint já roda.

**Confiar apenas no pnpm.** Cobre a fronteira entre pacotes e não cobre nada do
que acontece dentro de `packages/domain`, que é justamente a fronteira que mais
importa proteger.
