# Prompt de execução, projeto Fluxo

Cole este arquivo inteiro no Claude Code, na raiz de um diretório vazio, junto
com o `AGENTS.md`.

---

## Papel

Você atua como engenheiro de software sênior responsável por este repositório do
início ao fim. Você não é um gerador de trechos de código. Você toma decisões de
arquitetura, justifica trade-offs e verifica o próprio trabalho antes de dizer
que algo está pronto.

Leia `AGENTS.md` na raiz antes de qualquer ação. Ele é a fonte de verdade sobre
arquitetura de pastas, design system, regras de parallax, engenharia de contexto
e critérios de qualidade. Em caso de conflito entre este prompt e o `AGENTS.md`,
o `AGENTS.md` vence.

## Skills a invocar

Use as skills disponíveis conforme a fase:

- `brainstorming` antes de definir o modelo de domínio e a narrativa das seções
- `typescript-pro` no `packages/domain` e nos schemas de contrato
- `senior-backend` e `nodejs-best-practices` no `apps/api`
- `senior-frontend`, `ui-ux-pro-max` e `frontend-design` no `apps/web`
- `supabase-postgres-best-practices` no schema Drizzle e nos índices do pgvector
- `api-security-testing` e `senior-security` antes de expor qualquer rota
- `clean-code` e `code-reviewer` ao final de cada fase
- `verification-before-completion` obrigatoriamente antes de declarar qualquer
  fase concluída
- `git-commit-helper` nos commits

## O que construir

**Fluxo, anatomia de uma dívida.** Página de scroll único onde o usuário simula
um financiamento ou uma fatura de cartão de crédito e acompanha, em camadas de
parallax, o comportamento do dinheiro no tempo. Ao final, um agente de IA escreve
a leitura personalizada do cenário e compara estratégias de quitação, sempre com
citação de fonte pública.

**Stack fixa**

- Front: Nuxt 4, Vue 3, TypeScript estrito, Pinia, VueUse
- Visual: TresJS, GSAP com ScrollTrigger, Lenis, shaders GLSL próprios
- Back: NestJS com adapter Fastify
- Dados: Neon Postgres com pgvector, Drizzle ORM
- Monorepo: pnpm workspaces com Turborepo
- Hospedagem: Vercel Hobby no front, Render free no back
- Modelo: adaptador com porta e implementação para Google Gemini na cota
  gratuita. Trocar de provedor deve custar um arquivo

**Restrição absoluta:** nada pago em nenhuma camada. Se a única saída for um
serviço com cartão, pare e reporte.

## Narrativa das seções

1. **Entrada.** Formulário mínimo: valor, taxa mensal, prazo, tipo de dívida.
   Título em dois tons, label mono de seção, nenhuma ilustração
2. **O empréstimo nasce.** Colunas 3D sobem representando as parcelas. Camada de
   fundo com ruído se move devagar
3. **Onde o dinheiro vai.** Curva de juros contra principal, desenhada conforme o
   progresso do scroll. A cor de sotaque aparece pela primeira vez
4. **O caminho lento.** Cenário de pagamento mínimo ou prazo cheio. Números
   crescem enquanto o usuário rola
5. **As saídas.** Comparativo entre antecipar, portar e manter. Diferença
   destacada em valor absoluto e em meses
6. **A leitura.** Painel de insight gerado pelo agente, com citações e o aviso de
   material educativo

Cada seção tem sua label mono. O texto nunca compete com a cena, ele ancora.

## Ordem de execução

Execute em fases. Ao final de cada uma, rode os testes ou o build, mostre a saída
real do comando e só então avance. Não pule fase.

**Fase 0.** Monorepo, pnpm workspaces, Turborepo, TypeScript estrito compartilhado,
ESLint, Prettier, Vitest, Husky, CI no GitHub Actions. Nenhuma linha de produto
ainda.

**Fase 1.** `packages/domain`. Amortização Price e SAC, rotativo de cartão,
pagamento mínimo, estratégias de antecipação e comparação. Dinheiro em centavos
inteiros. Vitest com cobertura mínima de 90% e casos de borda explícitos: taxa
zero, prazo de um mês, arredondamento da última parcela. Zero dependência de
framework.

**Fase 2.** `packages/contracts` com Zod e `packages/tokens` com o script que
gera `tokens.css`. Os tokens do `AGENTS.md` entram aqui, e só aqui.

**Fase 3.** `apps/web` estático. Nuxt configurado, fontes locais, tokens
aplicados, as seis seções em HTML e CSS, formulário funcionando contra o domínio
no cliente. Sem uma única animação. Nesta fase o site já tem que parecer bom
parado.

**Fase 4.** Movimento. Lenis, ScrollTrigger mestre por seção, as quatro camadas
de parallax, cenas TresJS, shader de ruído. Implemente `prefers-reduced-motion`
junto, não depois. Meça: LCP abaixo de 2.5s, CLS abaixo de 0.1, 60fps no scroll.

**Fase 5.** `apps/api`. NestJS, validação Zod das variáveis de ambiente, rate
limit, exception filter, request id, health check. Módulo de simulação expondo o
domínio. Drizzle e migrações no Neon.

**Fase 6.** IA. Módulo `llm` com porta e adapter Gemini. Módulo `insight` com
prompts versionados em `.md`, registro de hash, saída em JSON validada por Zod,
retry único e degradação silenciosa para o resumo determinístico. Cache por hash
de parâmetros mais hash de prompt. Módulo `rag` com ingestão do corpus público,
chunking, embeddings, pgvector, reranking e citação obrigatória.

**Fase 7.** `packages/mcp-server` com as tools `simular_financiamento`,
`comparar_cenarios` e `buscar_norma`, consumindo o domínio. README com instruções
de instalação no Claude Desktop e teste de contrato de cada tool.

**Fase 8.** Acabamento. Favicon, card de compartilhamento Open Graph, manifest,
sitemap, meta tags. Playwright cobrindo o percurso completo e o estado de
movimento reduzido. Lighthouse acima de 95 em performance e acessibilidade.
README com screenshots, decisões de arquitetura e instruções de execução local.
ADRs preenchidos em `docs/adr/`.

## Como responder a mim

- Antes de escrever código, diga em uma frase o que vai mudar e onde
- Ao terminar uma fase, mostre a árvore de arquivos criados e a saída real dos
  testes ou do build
- Ambiguidade de produto: pergunte. Ambiguidade técnica: decida, implemente e
  registre em ADR
- Não instale biblioteca sem justificar por que o que já existe não resolve
- Não declare nada pronto sem evidência de execução

Comece pela Fase 0. Antes de criar qualquer arquivo, me apresente o plano das
oito fases com o que entra em cada uma e aguarde minha confirmação.
