# Registros de decisão de arquitetura

Toda decisão técnica relevante deste repositório vira um arquivo aqui. A regra
vem da seção 7 do `AGENTS.md` e da regra 4 da seção 8: ambiguidade de produto
vira pergunta, ambiguidade técnica vira decisão registrada.

## Formato

Arquivos numerados em sequência, `NNNN-titulo-em-kebab-case.md`, com quatro
seções fixas:

1. **Contexto.** O que forçou a decisão
2. **Decisão.** O que foi escolhido, em voz ativa
3. **Consequências.** O que passa a ser verdade, incluindo o que piora
4. **Alternativas descartadas.** O que foi considerado e por que não

Um ADR não é editado depois de aceito. Se a decisão mudar, escreva um novo ADR
que substitua o anterior e marque o antigo como substituído.

## Índice

| #                                             | Título                                                                | Fase | Estado |
| --------------------------------------------- | --------------------------------------------------------------------- | ---- | ------ |
| [0001](0001-monorepo-pnpm-turborepo.md)       | Monorepo com pnpm workspaces e Turborepo                              | 0    | aceito |
| [0002](0002-fronteira-de-import-por-lint.md)  | A fronteira do grafo de dependência é regra de lint                   | 0    | aceito |
| [0003](0003-tsconfig-base-na-raiz.md)         | `tsconfig.base.json` na raiz, sem pacote de configuração              | 0    | aceito |
| [0004](0004-vitest-por-pacote.md)             | Vitest configurado por pacote, orquestrado pelo Turborepo             | 0    | aceito |
| [0005](0005-typescript-5-9-com-eslint-10.md)  | TypeScript fixado em 5.9 por causa do typescript-eslint               | 0    | aceito |
| [0006](0006-dinheiro-em-centavos-de-marca.md) | Dinheiro em `Cents` de marca, com arredondamento meio para cima       | 1    | aceito |
| [0007](0007-comparacao-nominal.md)            | Comparação nominal, sem valor do dinheiro no tempo                    | 1    | aceito |
| [0008](0008-regulacao-em-preset.md)           | Regulação do cartão isolada em preset, com norma e data em cada campo | 1    | aceito |
| [0009](0009-cartao-em-dois-estagios.md)       | Dívida de cartão em dois estágios                                     | 1    | aceito |
| [0010](0010-residuo-na-ultima-parcela.md)     | Resíduo de divisão na última parcela                                  | 1    | aceito |
| [0011](0011-contracts-importa-domain.md)      | `packages/contracts` importa `packages/domain`                        | 2    | aceito |
| [0012](0012-nuxt-segue-a-arvore-do-agents.md) | O Nuxt e configurado para seguir a arvore do AGENTS.md                | 3    | aceito |
