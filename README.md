# Fluxo, anatomia de uma dívida

Página única de narrativa por scroll onde você simula um financiamento ou uma
fatura de cartão e acompanha, em camadas de parallax, o que acontece com o
dinheiro ao longo do tempo. No fim, um agente de IA escreve a leitura do cenário
e compara estratégias de quitação, sempre com citação de fonte pública.

A IA é uma camada de interpretação sobre um cálculo determinístico, nunca a
fonte do número.

> **Estado:** Fase 0 de 8 concluída, a fundação do monorepo. Ainda não há
> produto. Este README é provisório e é reescrito na Fase 8.

## Como rodar

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Requer Node 24, conforme o `.nvmrc`, e pnpm 10.28.2, fixado no campo
`packageManager`.

## Onde ler

| Documento                                                            | O que é                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`AGENTS.md`](AGENTS.md)                                             | O contrato. Arquitetura, design system, regras de parallax e de contexto |
| [`docs/plan/2026-09-02-roadmap.md`](docs/plan/2026-09-02-roadmap.md) | As oito fases, o que entra em cada uma e os riscos conhecidos            |
| [`docs/adr/`](docs/adr/README.md)                                    | As decisões de arquitetura e por que as alternativas foram descartadas   |

## Arquitetura em uma tela

Todo cálculo financeiro vive em `packages/domain`, que não importa nada. Nem
Vue, nem Nest, nem Zod, nem `node:fs`. O front, o back e o servidor MCP consomem
esse mesmo pacote, e uma regra de lint quebra o CI se alguém atravessar a
fronteira.

```
apps/web            -> contracts, tokens, domain
apps/api            -> contracts, domain
packages/mcp-server -> contracts, domain
packages/domain     -> nada
```

Dinheiro é centavo em inteiro. Ponto flutuante em cálculo monetário é bug.

## Licença

Ainda não definida.
