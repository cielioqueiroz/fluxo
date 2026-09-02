# Fluxo, anatomia de uma dívida

Página única de narrativa por scroll onde você simula um financiamento ou uma
fatura de cartão e acompanha, em camadas de parallax, o que acontece com o
dinheiro ao longo do tempo. No fim, um agente de IA escreve a leitura do cenário
e compara estratégias de quitação, sempre com citação de fonte pública.

A IA é uma camada de interpretação sobre um cálculo determinístico, nunca a
fonte do número.

> **Estado:** Fases 0, 1 e 2 concluídas. O cálculo financeiro, a fronteira
> entre front e back e o design system estão prontos e testados. Ainda não há
> interface. Este README acompanha o repositório e é reescrito a cada fase.

## Fases

| Fase | Entrega                                                                          | Estado    |
| ---- | -------------------------------------------------------------------------------- | --------- |
| 0    | Monorepo, TypeScript estrito, ESLint com a fronteira do grafo, Vitest, Husky, CI | concluída |
| 1    | `packages/domain`, todo o cálculo financeiro                                     | concluída |
| 2    | `packages/contracts` com Zod e `packages/tokens` gerando o CSS                   | concluída |
| 3    | `apps/web` estático, seis seções, zero animação                                  | a fazer   |
| 4    | Movimento: Lenis, ScrollTrigger, TresJS, shader, movimento reduzido              | a fazer   |
| 5    | `apps/api` em NestJS, Drizzle e Neon                                             | a fazer   |
| 6    | Agente de leitura, prompts versionados, RAG com pgvector                         | a fazer   |
| 7    | `packages/mcp-server` com três tools                                             | a fazer   |
| 8    | Acabamento, Playwright, Lighthouse acima de 95                                   | a fazer   |

## O que já existe

190 testes nos três pacotes, com 100% de cobertura em linhas, ramos, funções e
enunciados em cada um.

| Pacote             | O que é                                        | Testes |
| ------------------ | ---------------------------------------------- | ------ |
| `@fluxo/domain`    | O cálculo financeiro inteiro. Não importa nada | 123    |
| `@fluxo/contracts` | A fronteira entre front e back, em Zod         | 53     |
| `@fluxo/tokens`    | A fonte única do visual, que gera `tokens.css` | 14     |

### O domínio

`packages/domain` não importa nada. Nem Vue, nem Nest, nem Zod, nem `node:fs`.

| Módulo                | O que resolve                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `money`               | `Cents` e `Rate` como tipos de marca, arredondamento meio para cima, resíduo na última parcela |
| `amortization`        | Tabela Price e SAC, com taxa zero tratada como caso e saldo final exatamente zero              |
| `credit-card`         | Rotativo e parcelamento em dois estágios, teto de encargos, IOF, tudo parametrizado            |
| `credit-card/presets` | Os parâmetros brasileiros, cada um com a norma, a URL e a data de vigência                     |
| `strategy`            | Aporte mensal recorrente e a taxa de equilíbrio da portabilidade                               |
| `summary`             | O resumo estruturado que o agente da Fase 6 vai consumir no lugar da tabela                    |

Duas descobertas mudaram o modelo durante a Fase 1, e as duas estão em ADR:

- **O rotativo brasileiro dura no máximo um ciclo.** Desde a Resolução CMN 4.549
  de 2017, o saldo vira parcelamento obrigatório na fatura seguinte. Simular
  vinte e quatro meses de pagamento mínimo seria mostrar um cenário que a lei
  não permite
- **O mínimo de 15% não é mais obrigatório.** Ele entra no preset marcado como
  prática de mercado, não como norma

### A fronteira

`packages/contracts` valida na borda e devolve o valor **já marcado**, então o
que sai do `parse` entra no domínio sem nenhum cast. Três coisas que o schema
impede antes de virarem problema:

- O cliente manda o **nome** do preset de regulação, nunca o objeto de
  parâmetros. Ninguém simula um teto de encargos que a lei não permite
- A saída do modelo é recusada se uma afirmação apontar para citação
  inexistente, ou se não houver citação nenhuma
- Travessão na saída da IA é recusado pelo schema, não pedido no prompt

### O design system

`packages/tokens` é a fonte única. `build.ts` gera
`apps/web/assets/css/tokens.css`, e o CI recusa o build se o CSS versionado
estiver dessincronizado do TypeScript.

## Como rodar

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Requer Node 24, conforme o `.nvmrc`, e pnpm 10.28.2, fixado no campo
`packageManager`.

## Onde ler

| Documento                         | O que é                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)          | O contrato. Arquitetura, design system, regras de parallax e de contexto    |
| [`docs/plan/`](docs/plan)         | O roadmap das oito fases e o plano de execução de cada uma                  |
| [`docs/spec/`](docs/spec)         | A especificação de desenho do domínio                                       |
| [`docs/adr/`](docs/adr/README.md) | As onze decisões de arquitetura e por que as alternativas foram descartadas |

## Arquitetura em uma tela

Todo cálculo financeiro vive em `packages/domain`. O front, o back e o servidor
MCP consomem esse mesmo pacote, e uma regra de lint quebra o CI se alguém
atravessar a fronteira.

```
apps/web            -> contracts, tokens, domain
apps/api            -> contracts, domain
packages/mcp-server -> contracts, domain
packages/domain     -> nada
```

Dinheiro é centavo em inteiro. Ponto flutuante em cálculo monetário é bug.

Nada no projeto exige cartão de crédito em nenhuma camada. Se a única saída para
um problema for um serviço pago, o trabalho para e reporta.

## Licença

Ainda não definida.
