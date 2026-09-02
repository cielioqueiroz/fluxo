# Fluxo, anatomia de uma dívida

Página única de narrativa por scroll onde você simula um financiamento ou uma
fatura de cartão e acompanha, em camadas de parallax, o que acontece com o
dinheiro ao longo do tempo. No fim, um agente de IA escreve a leitura do cenário
e compara estratégias de quitação, sempre com citação de fonte pública.

A IA é uma camada de interpretação sobre um cálculo determinístico, nunca a
fonte do número.

> **Estado:** as oito fases estão implementadas. Falta acabamento medido e o
> deploy, listados em [O que ainda falta](#o-que-ainda-falta). O que existe está
> testado e verificado rodando.

## Como rodar

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Requer Node 24, conforme o `.nvmrc`, e pnpm 10.28.2, fixado no campo
`packageManager`.

Para ver a página:

```bash
pnpm --filter @fluxo/web dev
```

A API e a leitura da IA são opcionais. A página calcula tudo no navegador e é
completa sem elas.

## Estado por fase

| Fase | Entrega                                                                          | Estado    |
| ---- | -------------------------------------------------------------------------------- | --------- |
| 0    | Monorepo, TypeScript estrito, ESLint com a fronteira do grafo, Vitest, Husky, CI | concluída |
| 1    | `packages/domain`, todo o cálculo financeiro                                     | concluída |
| 2    | `packages/contracts` com Zod e `packages/tokens` gerando o CSS                   | concluída |
| 3    | `apps/web` estático, seis seções, zero animação                                  | concluída |
| 4    | Movimento: Lenis, ScrollTrigger, TresJS, shader, movimento reduzido              | concluída |
| 5    | `apps/api` em NestJS, Drizzle e Neon                                             | concluída |
| 6    | Agente de leitura, prompts versionados, RAG com pgvector                         | concluída |
| 7    | `packages/mcp-server` com três tools                                             | concluída |
| 8    | Acabamento, Playwright, Lighthouse                                               | parcial   |

## O que existe

367 testes, sendo 339 unitários e de contrato mais 28 de ponta a ponta.

| Pacote              | O que é                                                  | Testes     |
| ------------------- | -------------------------------------------------------- | ---------- |
| `@fluxo/domain`     | O cálculo financeiro inteiro. Não importa nada           | 125        |
| `@fluxo/api`        | NestJS com Fastify, o domínio por HTTP e a leitura da IA | 78         |
| `@fluxo/contracts`  | A fronteira entre front e back, em Zod                   | 57         |
| `@fluxo/web`        | Nuxt 4, as seis seções e as quatro camadas de parallax   | 38 mais 28 |
| `@fluxo/mcp-server` | Três tools sobre o mesmo domínio, para o Claude Desktop  | 27         |
| `@fluxo/tokens`     | A fonte única do visual, que gera `tokens.css`           | 14         |

### O domínio

`packages/domain` não importa nada. Nem Vue, nem Nest, nem Zod, nem `node:fs`.

| Módulo                | O que resolve                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `money`               | `Cents` e `Rate` como tipos de marca, arredondamento meio para cima, resíduo na última parcela |
| `amortization`        | Tabela Price e SAC, com taxa zero tratada como caso e saldo final exatamente zero              |
| `credit-card`         | Rotativo e parcelamento em dois estágios, teto de encargos, IOF, tudo parametrizado            |
| `credit-card/presets` | Os parâmetros brasileiros, cada um com a norma, a URL e a data de vigência                     |
| `strategy`            | Aporte mensal recorrente e a taxa de equilíbrio da portabilidade                               |
| `summary`             | O resumo estruturado que o agente consome no lugar da tabela                                   |

Duas descobertas mudaram o modelo, e as duas estão em ADR:

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
- A saída do modelo é recusada se uma afirmação apontar para citação inexistente
- Travessão na saída da IA é recusado pelo schema, não pedido no prompt

### A página

Seis seções em Nuxt 4, grid assimétrico de doze colunas, fundo quase preto,
superfícies separadas por filete de 1px e nenhuma sombra. General Sans e
JetBrains Mono auto hospedadas, sem CDN de terceiro.

Quatro camadas de parallax com Lenis e um único ScrollTrigger por seção. A curva
é revelada escalando um recorte, e não por `stroke-dashoffset`, porque a regra
manda animar apenas `transform` e `opacity`.

**Nada disso é obrigatório para a página funcionar.** Com movimento reduzido, ou
sem WebGL, as cenas não montam e os gráficos estáticos assumem. O HTML que o
servidor entrega já é essa versão.

### A leitura da IA

Porta e adapter: um arquivo só sabe que existe Gemini. Prompts em `.md` com
versão no nome e hash persistido, saída validada por Zod com uma correção e
degradação silenciosa, cache por hash de parâmetros mais hash de prompt, e RAG
com pgvector onde afirmação sem citação correspondente é removida antes de
chegar à tela.

Sem chave de modelo, a API responde com `degraded: true` e a página mostra o
resumo determinístico. Isso é o comportamento correto, não um erro.

## O que ainda falta

| Item                               | Situação                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse performance acima de 95 | Está em **85**. Sobra custo de JavaScript: TresJS, three, GSAP e Lenis carregam sempre, e deveriam carregar sob demanda quando `comCena` for verdadeiro |
| Deploy no Vercel e no Render       | Nada foi publicado. O código está pronto para receber as variáveis                                                                                      |
| Banco Neon provisionado            | O schema e as migrações existem. Nenhum banco foi criado                                                                                                |
| Ingestão do corpus                 | O script e o corpus existem. Nunca rodou, porque exige `DATABASE_URL` e `GEMINI_API_KEY`                                                                |
| Verificação contra o Gemini real   | Todo o comportamento em torno do modelo está testado com dublê. Contra o provedor de verdade, nada foi exercitado                                       |
| Capturas de tela neste README      | Faltam                                                                                                                                                  |

Os cinco primeiros dependem de credenciais que só o dono do projeto pode criar.

Medições reais do Lighthouse, no build de produção, em Chrome sem GPU:

```
performance 85   acessibilidade 96   boas praticas 81   seo 100
LCP 1,8s   CLS 0,004   TBT 0ms   erros de console 0
```

`boas praticas` fica em 81 por dois itens que só existem localmente: HTTP em vez
de HTTPS, e ausência de source maps no bundle de produção.

## Onde ler

| Documento                                                        | O que é                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                         | O contrato. Arquitetura, design system, regras de parallax e de contexto         |
| [`docs/plan/`](docs/plan)                                        | O roadmap das oito fases e o plano de execução de cada uma                       |
| [`docs/spec/`](docs/spec)                                        | A especificação de desenho do domínio                                            |
| [`docs/adr/`](docs/adr/README.md)                                | As dezessete decisões de arquitetura e por que as alternativas foram descartadas |
| [`packages/mcp-server/README.md`](packages/mcp-server/README.md) | Como instalar as três tools no Claude Desktop                                    |

## Arquitetura em uma tela

Todo cálculo financeiro vive em `packages/domain`. O front, o back e o servidor
MCP consomem esse mesmo pacote, e uma regra de lint quebra o CI se alguém
atravessar a fronteira.

```
apps/web            -> contracts, tokens, domain
apps/api            -> contracts, domain
packages/mcp-server -> contracts, domain
packages/contracts  -> domain
packages/domain     -> nada
```

Dinheiro é centavo em inteiro. Ponto flutuante em cálculo monetário é bug.

Nada no projeto exige cartão de crédito em nenhuma camada. Se a única saída para
um problema for um serviço pago, o trabalho para e reporta.

## Licença

Ainda não definida.
