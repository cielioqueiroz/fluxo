# 0012. O Nuxt e configurado para seguir a arvore do `AGENTS.md`

**Estado:** aceito
**Fase:** 3
**Data:** 2026-09-02

## Contexto

O Nuxt 4 usa `app/` como diretorio de origem, e espera encontrar dentro dele
`app.vue`, `pages/`, `layouts/`, `components/`, `composables/` e `assets/`.

A arvore da secao 3 do `AGENTS.md` divide diferente: `app/` guarda apenas
`app.vue`, `layouts/` e `pages/`, enquanto `components/`, `composables/`,
`stores/`, `lib/` e `assets/` ficam na raiz de `apps/web`.

## Decisao

A arvore declarada vence, e o `nuxt.config.ts` carrega a diferenca:

```ts
srcDir: 'app',
dir: { public: '../public' },
components: [{ path: '../components', pathPrefix: false }],
imports: { dirs: ['../composables', '../stores', '../lib'] },
css: ['~~/assets/css/tokens.css', '~~/assets/css/base.css'],
```

`pathPrefix` fica desligado porque os arquivos ja carregam o prefixo no nome:
`components/ui/UiLabel.vue` precisa ser `<UiLabel>`, e nao `<UiUiLabel>`.

E o mesmo raciocinio do ADR 0003. Quando o padrao de uma ferramenta e a arvore
declarada divergem, a arvore declarada vence, porque ela e o contrato.

## Consequencias

- Cinco linhas de configuracao a mais, todas com comentario dizendo por que
  existem
- Quem conhece Nuxt e nao leu o `AGENTS.md` vai estranhar. O comentario no
  proprio arquivo resolve
- Atualizacao maior do Nuxt pode mexer nestas chaves. O risco e pequeno e o
  build quebra alto se acontecer

## Decisoes menores da mesma fase, registradas aqui

**ESLint com o parser do Vue.** `eslint-plugin-vue` e `vue-eslint-parser`
entraram porque nao existe outra forma de lintar componentes de unica arquivo, e
lint que enxerga so metade do aplicativo e lint que mente. Os auto imports do
Nuxt entraram como lista explicita de globais, e nao desligando `no-undef`, para
que a lista fique visivel.

**`defineNuxtConfig` importado em vez de global.** Como global ele nao tem tipo,
e a analise por tipo do ESLint acusava chamada insegura. Importado de
`nuxt/config`, a configuracao passa a ser verificada como qualquer outro
arquivo.

**Fontes auto hospedadas.** General Sans da Fontshare e JetBrains Mono sob SIL
OFL, baixadas para `assets/fonts/`, cinco arquivos, cerca de 110 KB. Nenhuma
requisicao a CDN de terceiro em tempo de execucao, o que tambem evita que a
pagina dependa de rede alheia para renderizar o texto.

## Alternativas descartadas

**Seguir o padrao do Nuxt e ajustar o `AGENTS.md`.** Descartado porque o
`AGENTS.md` e o contrato, e o `PROMPT-fluxo.md` diz que em conflito ele vence.

**`srcDir: '.'`, o layout do Nuxt 3.** Poria `app.vue` na raiz de `apps/web`, o
que contraria a arvore tanto quanto o padrao do Nuxt 4.

**`@nuxt/eslint` para gerar a configuracao de lint.** Resolveria parser e
globais de uma vez. Descartado porque ele gera a propria configuracao plana, que
teria de conviver com as regras de fronteira do grafo escritas a mao, e o
ADR 0002 depende dessas regras serem legiveis em um arquivo so.
