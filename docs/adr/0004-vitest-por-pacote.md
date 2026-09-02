# 0004. Vitest configurado por pacote, orquestrado pelo Turborepo

**Estado:** aceito
**Fase:** 0
**Data:** 2026-09-02

## Contexto

O roadmap da Fase 0 previa "Vitest configurado na raiz com projetos por pacote",
gerando um relatório único de cobertura para o monorepo inteiro.

Ao escrever a configuração ficou claro que o requisito de cobertura não é
uniforme. A seção 7 do `AGENTS.md` exige 90% em `packages/domain` e não exige
número nenhum do front, onde a verificação de valor é o Playwright percorrendo o
scroll, não a cobertura de linha de um componente Vue. Um limite único na raiz
seria ou frouxo demais para o domínio ou arbitrário para o front.

Os ambientes também divergem. O domínio roda em Node sem DOM, o front vai
precisar de ambiente de navegador, e a API vai precisar de contexto do Nest.

## Decisão

Cada pacote tem o seu `vitest.config.ts`, e o Turborepo executa a tarefa `test`
pacote a pacote. O limite de 90% em linhas, ramos, funções e enunciados vive no
`vitest.config.ts` de `packages/domain`, que é o pacote que ele governa.

O limite entra já na Fase 0, com o pacote ainda vazio, e não na Fase 1. Um
limite ligado depois do código escrito é um limite que se ajusta ao código. Ele
precisa existir antes de haver o que medir.

## Consequências

- Não existe um relatório único de cobertura do monorepo. Cada pacote emite o
  seu `lcov`, e é assim que a leitura faz sentido
- `pnpm test` na raiz delega ao Turborepo, que respeita o cache. Alterar o front
  não reexecuta a suíte do domínio
- Isto é um desvio consciente do roadmap. O roadmap descreve intenção, o ADR
  registra o que a execução mostrou

## Alternativas descartadas

**`test.projects` num `vitest.config.ts` de raiz.** Dá um relatório único e uma
invocação única. Descartado porque forçaria um limite de cobertura comum, ou uma
tabela de exceções por projeto que é a mesma configuração por pacote, só que
longe do pacote.

**Nenhum limite de cobertura na Fase 0, para ligar na Fase 1.** Descartado
porque é o caminho conhecido para o limite acabar sendo escolhido depois, olhando
o número que o código já produz.
