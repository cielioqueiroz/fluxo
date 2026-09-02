# Fluxo, anatomia de uma dívida

Página única de narrativa por scroll onde você simula um financiamento ou uma
fatura de cartão e acompanha, em camadas de parallax, o que acontece com o
dinheiro ao longo do tempo. No fim, um agente de IA escreve a leitura do cenário
e compara estratégias de quitação, sempre com citação de fonte pública.

A IA é uma camada de interpretação sobre um cálculo determinístico, nunca a
fonte do número.

> **Estado:** Fases 0 a 4 concluídas. A página existe, calcula no navegador e
> tem as quatro camadas de parallax. Sem interface de API ainda. Este README
> acompanha o repositório e é reescrito a cada fase.

## Fases

| Fase | Entrega                                                                          | Estado    |
| ---- | -------------------------------------------------------------------------------- | --------- |
| 0    | Monorepo, TypeScript estrito, ESLint com a fronteira do grafo, Vitest, Husky, CI | concluída |
| 1    | `packages/domain`, todo o cálculo financeiro                                     | concluída |
| 2    | `packages/contracts` com Zod e `packages/tokens` gerando o CSS                   | concluída |
| 3    | `apps/web` estático, seis seções, zero animação                                  | concluída |
| 4    | Movimento: Lenis, ScrollTrigger, TresJS, shader, movimento reduzido              | concluída |
| 5    | `apps/api` em NestJS, Drizzle e Neon                                             | a fazer   |
| 6    | Agente de leitura, prompts versionados, RAG com pgvector                         | a fazer   |
| 7    | `packages/mcp-server` com três tools                                             | a fazer   |
| 8    | Acabamento, Playwright, Lighthouse acima de 95                                   | a fazer   |

## O que já existe

226 testes nos quatro pacotes.

| Pacote             | O que é                                            | Testes |
| ------------------ | -------------------------------------------------- | ------ |
| `@fluxo/domain`    | O cálculo financeiro inteiro. Não importa nada     | 123    |
| `@fluxo/contracts` | A fronteira entre front e back, em Zod             | 53     |
| `@fluxo/tokens`    | A fonte única do visual, que gera `tokens.css`     | 14     |
| `@fluxo/web`       | Nuxt 4, as seis seções da narrativa, zero animação | 34     |

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

### A página

Seis seções em Nuxt 4, grid assimétrico de doze colunas, fundo quase preto,
superfícies separadas por filete de 1px e nenhuma sombra. General Sans e
JetBrains Mono auto hospedadas, sem CDN de terceiro. Números sempre em
monoespaçada com `tabular-nums`, e a cor de sotaque aplicada só ao dinheiro.

O cálculo roda no navegador contra `@fluxo/domain`, então a página é completa e
instantânea sem a API. Nenhuma biblioteca de animação está instalada: elas
entram na Fase 4.

Dois defeitos apareceram durante a construção e viraram teste:

- **A mesma taxa de juros aparecia como 49,88% na seção 4 e 49,90% na seção 6**,
  porque um componente recalculava o percentual em vez de usar o que o domínio
  já produzira. Número único exige fonte única
- **`parseCurrencyInput` errava o centavo.** Fazia `Math.round(valor * 100)`, e
  `1.005 * 100` dá `100.49999999999999` em ponto flutuante. Agora ela trabalha
  sobre os dígitos, e essa é a última fronteira do produto onde float podia
  aparecer

## Como rodar

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Requer Node 24, conforme o `.nvmrc`, e pnpm 10.28.2, fixado no campo
`packageManager`.

## Onde ler

| Documento                         | O que é                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)          | O contrato. Arquitetura, design system, regras de parallax e de contexto     |
| [`docs/plan/`](docs/plan)         | O roadmap das oito fases e o plano de execução de cada uma                   |
| [`docs/spec/`](docs/spec)         | A especificação de desenho do domínio                                        |
| [`docs/adr/`](docs/adr/README.md) | As treze decisões de arquitetura e por que as alternativas foram descartadas |

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
