# Fase 2, contratos e tokens. Plano de implementação

**Roadmap:** `docs/plan/2026-09-02-roadmap.md`
**Contrato:** `AGENTS.md`, seções 3 e 4

**Objetivo:** a fronteira entre front e back, e a fonte única do visual.

**Definição de pronto:** `pnpm lint`, `pnpm typecheck`, `pnpm test` e
`pnpm build` verdes, `tokens.css` gerado e conferido pelo CI, e teste provando
que os schemas recusam entrada inválida.

## A decisão que esta fase precisa tomar

O ADR 0006 deixou explícito que a remarcação de `Cents` na entrada é
responsabilidade desta fase. Isso levanta a pergunta que o grafo do `AGENTS.md`
não responde: **`packages/contracts` pode importar `packages/domain`?**

O grafo declara que `domain` não importa nada, e lista o que `web`, `api` e
`mcp-server` podem importar. Não diz nada sobre as dependências de `contracts`.

**Decisão: sim, `contracts` importa `domain`, e só os tipos e construtores de
dinheiro.** A alternativa seria usar `.brand()` do Zod, que produz
`number & $brand<'Cents'>`, estruturalmente diferente do `Cents` do domínio.
Os dois não seriam atribuíveis um ao outro, e cada travessia de fronteira
exigiria um cast, que é exatamente o buraco que o tipo de marca existe para
fechar.

Com `.transform(cents)`, um payload validado sai do Zod já sendo `Cents` de
verdade, pronto para entrar no domínio sem conversão. Vira o ADR 0011, e a regra
de lint ganha a aresta nova.

## Estrutura de arquivos

| Arquivo                                       | Responsabilidade                                               |
| --------------------------------------------- | -------------------------------------------------------------- |
| `packages/tokens/src/color.ts`                | as cores da seção 4 do AGENTS.md, copiadas exatamente          |
| `packages/tokens/src/type.ts`                 | famílias, escala e pesos                                       |
| `packages/tokens/src/space.ts`                | escala de espaço e o raio                                      |
| `packages/tokens/src/motion.ts`               | durações e easing                                              |
| `packages/tokens/src/index.ts`                | o objeto de tokens inteiro, tipado                             |
| `packages/tokens/src/build.ts`                | gera `tokens.css` como custom properties                       |
| `packages/contracts/src/money.schema.ts`      | `centsSchema` e `rateSchema`, a ponte com as marcas do domínio |
| `packages/contracts/src/simulation.schema.ts` | entrada e resultado da simulação                               |
| `packages/contracts/src/insight.schema.ts`    | pedido e resposta do agente, com citações                      |
| `packages/contracts/src/index.ts`             | superfície pública                                             |

---

### Tarefa 1: tokens, a fonte única do visual

**Arquivos:** criar `packages/tokens/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts}`,
`src/{color,type,space,motion,index,build}.ts`, `tests/tokens.test.ts`

**Produz:**

```ts
const color: { readonly [k: string]: string }
const typography: { families; scale; weights }
const space: { readonly [k: string]: string }
const motion: { durations; easings }
const tokens: { color; typography; space; motion; radius }
function toCss(t: typeof tokens): string
```

- [ ] **Passo 1: escrever o teste que falha**, cobrindo três coisas: os valores
      batem com o `AGENTS.md` ao caractere, o CSS gerado tem uma custom property
      por token, e nenhum token some entre o objeto e o CSS
- [ ] **Passo 2: rodar e ver falhar**
- [ ] **Passo 3: implementar os quatro arquivos de token e o `toCss`**
- [ ] **Passo 4: rodar e ver passar**
- [ ] **Passo 5: `build.ts` escreve em `apps/web/assets/css/tokens.css`**, que é
      onde a árvore do `AGENTS.md` diz. O diretório é criado se não existir, e o
      arquivo fica lá esperando a Fase 3
- [ ] **Passo 6: commitar**

### Tarefa 2: o CI recusa `tokens.css` dessincronizado

**Arquivos:** modificar `.github/workflows/ci.yml`, `packages/tokens/package.json`

- [ ] **Passo 1:** script `tokens:check` que regenera em arquivo temporário e
      compara com o versionado
- [ ] **Passo 2:** etapa no CI entre formatação e lint
- [ ] **Passo 3:** provar que funciona, editando o CSS à mão e vendo o script
      recusar, depois desfazendo
- [ ] **Passo 4: commitar**

### Tarefa 3: a ponte de dinheiro

**Arquivos:** criar `packages/contracts/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts}`,
`src/money.schema.ts`, `tests/money.schema.test.ts`

**Produz:**

```ts
const centsSchema: z.ZodType<Cents, number>
const rateSchema: z.ZodType<Rate, number>
```

- [ ] **Passo 1: escrever o teste que falha.** O ponto central: o valor que sai
      do `parse` é aceito por uma função do domínio sem cast. Recusa fração,
      recusa negativo, recusa não seguro, recusa `NaN`
- [ ] **Passo 2: rodar e ver falhar**
- [ ] **Passo 3: implementar com `.transform(cents)` e `.transform(rate)`**
- [ ] **Passo 4: rodar e ver passar**
- [ ] **Passo 5: commitar**

### Tarefa 4: schema da simulação

**Arquivos:** criar `src/simulation.schema.ts`, `tests/simulation.schema.test.ts`

**Produz:** `simulationInputSchema` como união discriminada por `kind`,
`simulationResultSchema`, e os tipos inferidos.

O ramo de cartão carrega `preset: 'brasil'`, um nome, e nunca o objeto
`CardParams` inteiro. Cliente não dita regulação: ele escolhe qual preset o
servidor deve aplicar.

- [ ] **Passo 1: escrever o teste que falha**, incluindo o caso de segurança:
      um payload que tenta injetar `params` com teto próprio é recusado
- [ ] **Passo 2: rodar e ver falhar**
- [ ] **Passo 3: implementar**
- [ ] **Passo 4: rodar e ver passar**
- [ ] **Passo 5: commitar**

### Tarefa 5: schema do insight

**Arquivos:** criar `src/insight.schema.ts`, `tests/insight.schema.test.ts`

**Produz:** `insightRequestSchema`, `citationSchema`, `insightResponseSchema`.

Este é o schema que valida a saída do modelo na Fase 6, então ele é o que
impede a página de quebrar por causa do LLM. Três exigências entram no tipo:

1. Toda afirmação carrega o índice da citação que a sustenta
2. `citations` não pode ser vazio quando há afirmação
3. O aviso de material educativo é campo, não texto solto

- [ ] **Passo 1: escrever o teste que falha**, incluindo resposta sem citação e
      afirmação apontando para citação inexistente
- [ ] **Passo 2: rodar e ver falhar**
- [ ] **Passo 3: implementar, com `superRefine` para o cruzamento de índices**
- [ ] **Passo 4: rodar e ver passar**
- [ ] **Passo 5: commitar**

### Tarefa 6: fronteira, ADR e fechamento

- [ ] **Passo 1:** `index.ts` dos dois pacotes, com teste de superfície
- [ ] **Passo 2:** aresta `contracts -> domain` na regra de lint, e a proibição
      de `contracts` importar qualquer app
- [ ] **Passo 3:** ADR 0011, por que `contracts` importa `domain` em vez de usar
      `.brand()` do Zod
- [ ] **Passo 4:** `pnpm lint typecheck test build`, saída real colada
- [ ] **Passo 5:** README e About atualizados, commit e push, CI verde
