# AGENTS.md

Contrato de trabalho para qualquer agente de IA que atue neste repositório.
Leia este arquivo inteiro antes da primeira alteração de código.

---

## 1. O projeto

**Fluxo, anatomia de uma dívida.**

Aplicação de página única com narrativa por scroll onde o usuário simula um
financiamento ou uma fatura de cartão de crédito e vê, em camadas de parallax,
o que acontece com o dinheiro ao longo do tempo. Ao final, um agente de IA
escreve a leitura personalizada do cenário e compara estratégias de quitação.

Não é um chatbot. A IA é uma camada de interpretação sobre um cálculo
determinístico, nunca a fonte do número.

**Objetivo secundário:** o repositório é peça de portfólio. Ele será lido por
recrutadores e por engenheiros. A qualidade da arquitetura vale tanto quanto o
resultado visual.

---

## 2. Regras inegociáveis

1. **Custo zero.** Nenhuma dependência, serviço ou API que exija cartão de
   crédito. Se a única solução para um problema for paga, pare e reporte em vez
   de contornar.
2. **Cálculo financeiro nunca sai de `packages/domain`.** Nenhum componente Vue,
   controller Nest ou prompt calcula juros. Todos consomem o domínio.
3. **A IA não inventa número.** O agente recebe o resultado já calculado e o
   traduz em linguagem natural. Se um valor não veio do domínio, ele não entra
   na resposta.
4. **Sem travessão no texto.** Nem na UI, nem na documentação, nem na saída da
   IA. Use vírgula, dois pontos ou ponto final.
5. **Nada de dado sensível persistido.** O usuário não cria conta. Simulações
   ficam em memória e no `localStorage`. Se algo for ao banco, vai anonimizado e
   sem CPF, e-mail ou nome.
6. **Nenhum segredo no cliente.** Chave de modelo de IA só existe no Nest. O
   front nunca fala com provedor de LLM diretamente.
7. **Zod nas bordas.** Toda entrada de HTTP, toda variável de ambiente e toda
   saída de LLM passa por schema antes de ser usada.
8. **Sem `any`.** TypeScript em modo estrito nos dois apps.

---

## 3. Arquitetura de pastas

Monorepo pnpm com separação rígida entre front, back e código compartilhado.
O front nunca importa de `apps/api`. O back nunca importa de `apps/web`. Os dois
se comunicam apenas por `packages/contracts`.

```
fluxo/
├── apps/
│   ├── web/                          FRONT, Nuxt 4 + Vue 3
│   │   ├── app/
│   │   │   ├── app.vue
│   │   │   ├── layouts/
│   │   │   │   └── default.vue
│   │   │   └── pages/
│   │   │       └── index.vue         narrativa única
│   │   ├── components/
│   │   │   ├── ui/                   base, sem regra de negócio
│   │   │   │   ├── UiButton.vue
│   │   │   │   ├── UiField.vue
│   │   │   │   ├── UiLabel.vue       label mono de seção
│   │   │   │   └── UiValue.vue       número tabular
│   │   │   ├── scenes/               camadas de parallax
│   │   │   │   ├── SceneNoise.vue    camada 1, shader de fundo
│   │   │   │   ├── SceneColumns.vue  camada 2, parcelas em 3D
│   │   │   │   ├── SceneCurve.vue    camada 3, curva de juros
│   │   │   │   └── SceneStage.vue    orquestrador das camadas
│   │   │   ├── chart/
│   │   │   │   ├── ChartAmortization.vue
│   │   │   │   └── ChartComparison.vue
│   │   │   ├── simulator/
│   │   │   │   ├── SimulatorForm.vue
│   │   │   │   └── SimulatorSummary.vue
│   │   │   └── insight/
│   │   │       ├── InsightPanel.vue
│   │   │       └── InsightCitation.vue
│   │   ├── composables/
│   │   │   ├── useScrollScene.ts     progresso de scroll por seção
│   │   │   ├── useParallaxLayer.ts   registra camada e velocidade
│   │   │   ├── useSimulation.ts      ponte com packages/domain
│   │   │   ├── useInsight.ts         chamada à API de insight
│   │   │   └── useReducedMotion.ts
│   │   ├── stores/
│   │   │   ├── simulation.store.ts   Pinia, estado do cenário
│   │   │   └── narrative.store.ts    seção ativa, progresso global
│   │   ├── lib/
│   │   │   ├── api-client.ts         fetch tipado por contracts
│   │   │   ├── gsap.ts               registro central de plugins
│   │   │   └── format.ts             moeda, percentual, prazo
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   │   ├── tokens.css        gerado por packages/tokens
│   │   │   │   └── base.css
│   │   │   ├── fonts/
│   │   │   └── shaders/
│   │   │       ├── noise.vert
│   │   │       └── noise.frag
│   │   ├── public/                   favicon, og-image, manifest
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── e2e/                  Playwright
│   │   ├── nuxt.config.ts
│   │   └── package.json
│   │
│   └── api/                          BACK, NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   ├── env.schema.ts     Zod das variáveis
│       │   │   └── config.module.ts
│       │   ├── common/
│       │   │   ├── filters/          exception filter global
│       │   │   ├── guards/           rate limit
│       │   │   ├── interceptors/     logging, request id
│       │   │   └── pipes/            ZodValidationPipe
│       │   ├── modules/
│       │   │   ├── simulation/       expõe o domínio via HTTP
│       │   │   │   ├── simulation.controller.ts
│       │   │   │   ├── simulation.service.ts
│       │   │   │   └── simulation.module.ts
│       │   │   ├── insight/          agente de leitura
│       │   │   │   ├── insight.controller.ts
│       │   │   │   ├── insight.service.ts
│       │   │   │   ├── insight.cache.ts
│       │   │   │   ├── prompts/
│       │   │   │   │   ├── system.v1.md
│       │   │   │   │   ├── insight.v1.md
│       │   │   │   │   └── registry.ts   hash e versão
│       │   │   │   └── insight.module.ts
│       │   │   ├── rag/
│       │   │   │   ├── ingest/       scripts de carga
│       │   │   │   ├── chunking.ts
│       │   │   │   ├── embedding.service.ts
│       │   │   │   ├── retrieval.service.ts
│       │   │   │   ├── rerank.service.ts
│       │   │   │   └── rag.module.ts
│       │   │   ├── llm/              adaptador de provedor
│       │   │   │   ├── llm.port.ts   interface
│       │   │   │   ├── gemini.adapter.ts
│       │   │   │   └── llm.module.ts
│       │   │   └── health/
│       │   ├── database/
│       │   │   ├── schema/           Drizzle
│       │   │   ├── migrations/
│       │   │   └── drizzle.client.ts
│       │   └── test/
│       └── package.json
│
├── packages/
│   ├── domain/                       CÁLCULO PURO, sem framework
│   │   ├── src/
│   │   │   ├── amortization/
│   │   │   │   ├── price.ts
│   │   │   │   ├── sac.ts
│   │   │   │   └── schedule.ts
│   │   │   ├── credit-card/
│   │   │   │   ├── minimum-payment.ts
│   │   │   │   └── revolving.ts
│   │   │   ├── strategy/
│   │   │   │   ├── prepayment.ts
│   │   │   │   └── compare.ts
│   │   │   ├── money/
│   │   │   │   ├── decimal.ts        centavos em inteiro
│   │   │   │   └── rate.ts           conversão mensal e anual
│   │   │   └── index.ts
│   │   └── tests/                    Vitest, cobertura mínima 90%
│   │
│   ├── contracts/                    fronteira front e back
│   │   └── src/
│   │       ├── simulation.schema.ts
│   │       ├── insight.schema.ts
│   │       └── index.ts
│   │
│   ├── tokens/                       fonte única do design system
│   │   ├── src/
│   │   │   ├── color.ts
│   │   │   ├── type.ts
│   │   │   ├── space.ts
│   │   │   ├── motion.ts
│   │   │   └── build.ts              gera tokens.css
│   │   └── package.json
│   │
│   └── mcp-server/                   servidor MCP publicável
│       ├── src/
│       │   ├── server.ts
│       │   └── tools/
│       │       ├── simular-financiamento.ts
│       │       ├── comparar-cenarios.ts
│       │       └── buscar-norma.ts
│       └── package.json
│
├── docs/
│   ├── adr/                          decisões de arquitetura
│   ├── design-system.md
│   └── context-engineering.md
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── turbo.json
└── AGENTS.md
```

**Grafo de dependência permitido**

```
apps/web   →  packages/contracts, packages/tokens, packages/domain
apps/api   →  packages/contracts, packages/domain
packages/mcp-server → packages/domain, packages/contracts
packages/domain     → nada
```

Qualquer import fora desse grafo é erro. `packages/domain` não conhece Vue, Nest,
Drizzle nem `fetch`.

---

## 4. Design system

O visual não pode parecer gerado por IA. Isso é critério de aceite, não gosto.

**Proibido**

- Gradiente roxo para azul, glassmorphism, blob desfocado atrás do hero
- Sombra difusa em card, raio de borda 12px ou maior
- Inter, Geist ou Roboto
- Emoji como ícone, badge de "powered by AI"
- Hero centralizado seguido de três colunas de features
- Fade in genérico em todo elemento que entra na viewport

**Obrigatório**

- Fundo quase preto, superfícies separadas por borda de 1px, elevação zero
- Headline em dois tons na mesma frase, parte clara e parte apagada
- Label de seção em monoespaçada, 11px, caixa alta, com marcador, no padrão
  `• Como funciona`
- Uma única cor de sotaque, aplicada só ao dinheiro
- Números sempre em monoespaçada com `font-variant-numeric: tabular-nums`

**Tokens**

```
bg.base        #0A0A0A
bg.raised      #141414
bg.sunken      #060606
border.subtle  rgba(255,255,255,.08)
border.strong  rgba(255,255,255,.16)
text.primary   #EDEDED
text.muted     #8A8A8A
text.faint     #5A5A5A
intent.debt    #C4552F
intent.relief  #6F8F6A
radius         4px
```

**Tipografia**

- Display e corpo: General Sans (Fontshare, licença livre)
- Mono: JetBrains Mono (SIL OFL)
- Escala: 64 / 40 / 24 / 16 / 13 / 11
- Peso 300 em títulos grandes, 400 no corpo, 500 no máximo

Nenhum valor cru de cor, espaço ou duração dentro de componente. Só token.

---

## 5. Parallax e movimento

Quatro camadas, com velocidade relativa ao scroll:

| Camada | Conteúdo                  | Fator |
| ------ | ------------------------- | ----- |
| 1      | Shader de ruído no fundo  | 0.1   |
| 2      | Colunas de parcelas em 3D | 0.4   |
| 3      | Curva de juros em SVG     | 0.8   |
| 4      | Texto e labels            | 1.0   |

Regras:

- Anime apenas `transform` e `opacity`. Nunca `top`, `left`, `width` ou `height`
- Um único `ScrollTrigger` mestre por seção, camadas se registram nele
- Lenis controla o scroll, GSAP lê o progresso, nada de listener próprio de
  `scroll`
- `will-change` só na seção ativa, removido ao sair
- Cena 3D pausa o loop de render quando fora da viewport
- Transições de UI entre 120ms e 200ms, easing custom, nunca `ease-in-out` padrão
- `prefers-reduced-motion: reduce` desliga TresJS e parallax, mantém a narrativa
  legível em estático. Isso é requisito de acessibilidade, não opcional
- Meta de performance: LCP abaixo de 2.5s, CLS abaixo de 0.1, 60fps no scroll em
  hardware médio

---

## 6. Engenharia de contexto e prompts

**Orçamento de contexto.** O agente nunca recebe o array bruto de parcelas. Ele
recebe um resumo estruturado gerado pelo domínio, com no máximo 800 tokens:
total pago, total de juros, percentual de juros sobre o principal, prazo, e
marcos em 25%, 50% e 75% da amortização.

**Prompts versionados.** Vivem em `apps/api/src/modules/insight/prompts/` como
arquivos `.md`. Cada arquivo tem versão no nome. O `registry.ts` calcula o hash
e o persiste junto do insight gerado, para rastrear qual versão produziu qual
saída.

**Saída estruturada.** O modelo responde em JSON validado por Zod. Falha de
parse dispara uma segunda tentativa com instrução de correção, e no segundo erro
o app mostra o resumo determinístico sem a leitura da IA. A página nunca quebra
por causa do modelo.

**RAG.** Corpus de material público de educação financeira, com fonte e URL em
cada chunk. Recuperação com pgvector, reranking, e citação obrigatória.
Afirmação sem chunk correspondente é removida antes de chegar à UI.

**Cache.** Chave é o hash dos parâmetros da simulação mais o hash do prompt.
Cenário repetido não gera nova chamada. Isso mantém o projeto dentro da cota
gratuita.

**Guardrails.** O agente não recomenda produto financeiro específico, não fala em
nome de instituição e sempre marca o resultado como material educativo.

---

## 7. Qualidade

- `packages/domain` com Vitest e cobertura mínima de 90%, incluindo casos de
  borda: taxa zero, prazo de um mês, arredondamento de centavo na última parcela
- `apps/api` com teste de contrato por rota
- `apps/web` com Playwright cobrindo o percurso completo de scroll e o estado de
  movimento reduzido
- Dinheiro em centavos como inteiro. Ponto flutuante em cálculo monetário é bug
- Commits em Conventional Commits
- Toda decisão relevante vira um ADR em `docs/adr/`

---

## 8. Como o agente deve trabalhar

1. Antes de escrever, declare em uma frase o que vai mudar e em quais arquivos
2. Construa na ordem: `domain` com testes, depois `contracts`, depois `tokens`,
   depois a UI estática, depois o parallax, depois a API, depois RAG e MCP
3. Nunca marque uma etapa como pronta sem rodar o teste ou o build e mostrar a
   saída real
4. Ao encontrar ambiguidade de produto, pergunte. Ao encontrar ambiguidade
   técnica, escolha, implemente e registre o porquê em um ADR
5. Não instale biblioteca nova sem justificar em uma linha por que o que já
   existe no repositório não resolve

---

# 9. Estado do trabalho

**Esta seção não é contrato. Ela é o registro de onde a implementação parou, para
quem retomar em outra sessão.** As seções 1 a 8 acima continuam sendo a fonte de
verdade sobre o que construir. Atualize esta seção ao fim de cada fase.

**Última atualização:** 2026-09-02, ao fim da Fase 8.

## O que está pronto

As oito fases estão implementadas e commitadas em `main`, com CI verde.

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build     tudo verde
367 testes: 339 unitários e de contrato, 28 de ponta a ponta
```

| Pacote | Testes | Cobertura |
|---|---|---|
| `packages/domain` | 125 | 100% nas quatro métricas |
| `packages/contracts` | 57 | 100% nas quatro métricas |
| `packages/tokens` | 14 | 100% nas quatro métricas |
| `packages/mcp-server` | 27 | acima de 90% |
| `apps/api` | 78 | acima de 90%, exceto conexão real |
| `apps/web` | 38 unitários mais 28 no Playwright | `lib/format.ts` acima de 90% |

O Playwright roda o mesmo percurso duas vezes, com movimento e com
`prefers-reduced-motion`, contra o build de produção.

Verificações feitas rodando, e não apenas por teste:

- A API responde sem banco e sem chave, e devolve os mesmos números que o front
  calcula no navegador
- O servidor MCP responde por JSON-RPC real sobre stdio, com os mesmos números
- O Lighthouse mede LCP de 1,8s e CLS de 0,004 no build de produção

## O que falta, em ordem de prioridade

1. **Lighthouse performance está em 85, e a meta é 95.** O que sobra é custo de
   JavaScript: TresJS, three, GSAP e Lenis entram no bundle inicial mesmo quando
   não vão ser usados. O caminho é importá-los sob demanda, só quando `comCena`
   for verdadeiro em `apps/web/app/pages/index.vue`. É a próxima tarefa técnica.
2. **Capturas de tela no README.** O `apps/web` roda com
   `pnpm --filter @fluxo/web dev`.
3. **Deploy no Vercel e no Render.** O código está pronto. Falta publicar.
4. **Banco Neon e ingestão do corpus.** O schema, as migrações e o script de
   ingestão existem e nunca rodaram, porque exigem `DATABASE_URL`.
5. **Verificação contra o Gemini de verdade.** Tudo em torno do modelo está
   testado com dublê, mas nada foi exercitado contra o provedor.

Os itens 3, 4 e 5 dependem de credenciais que só o dono do projeto pode criar.
Não crie conta, não insira credencial, e não contorne isso: pare e reporte, como
manda a regra 1 da seção 2.

## Decisões que um agente novo precisa conhecer antes de mexer

Todas estão detalhadas em `docs/adr/`. As que mais mudam o que você faria por
padrão:

- **ADR 0009.** O rotativo brasileiro dura um ciclo, não vários. A dívida de
  cartão tem dois estágios, e o teto conta os dois somados
- **ADR 0011.** `packages/contracts` importa `packages/domain` de propósito,
  para o valor validado sair já marcado. Não use `.brand()` do Zod
- **ADR 0013.** Anime apenas `transform` e `opacity`. A curva é revelada por
  escala de recorte, e o parallax do ruído acontece dentro do shader
- **ADR 0015.** A porta do modelo nunca lança. Falha é valor, e degradação é
  resposta válida com `degraded: true`
- **ADR 0017.** WebGL ausente não pode custar a narrativa. Qualquer cena nova
  precisa passar pela mesma guarda `comCena`

## Armadilhas já pisadas

Coisas que custaram depuração e não vão parecer óbvias:

- **O lint precisa do `dist` dos pacotes.** No CI, `pnpm --filter "./packages/*"
  build` roda antes do lint. Sem isso, todo import de `@fluxo/domain` vira tipo
  de erro e o lint acusa 150 falsos positivos
- **`inject` não enxerga o próprio `provide`.** O `SceneStage` passa a cena na
  mão para `useParallaxLayer`
- **`dir.public` do Nuxt resolve a partir de `rootDir`, não de `srcDir`**
- **Dependência transitiva não resolve com pnpm.** `fastify`, `@tresjs/core` e
  outros precisaram ser declarados como dependência direta de quem os usa
- **O `commitlint` recusa assunto começando em maiúscula**
- **A conversão de reais para centavos nunca multiplica por cem.** Trabalhe
  sobre os dígitos
