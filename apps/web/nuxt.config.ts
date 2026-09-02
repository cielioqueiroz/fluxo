// Importado em vez de usar o auto import global: assim o ESLint enxerga o tipo
// e a configuracao e verificada como qualquer outro arquivo.
import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-02',

  /**
   * A arvore vem do AGENTS.md secao 3, e nao do padrao do Nuxt 4.
   *
   * `app/` guarda app.vue, layouts e pages. `components/`, `composables/`,
   * `stores/`, `lib/` e `assets/` ficam na raiz de apps/web. Onde o padrao e a
   * arvore declarada divergem, a arvore declarada vence.
   */
  srcDir: 'app',
  dir: {
    public: '../public',
  },
  // pathPrefix desligado porque os arquivos ja carregam o prefixo no nome:
  // components/ui/UiLabel.vue e <UiLabel>, nao <UiUiLabel>.
  components: [{ path: '../components', pathPrefix: false }],
  imports: {
    dirs: ['../composables', '../stores', '../lib'],
  },

  modules: ['@pinia/nuxt', '@tresjs/nuxt'],

  runtimeConfig: {
    public: {
      /*
       * Endereco da API. Vazio de proposito no padrao.
       *
       * Sem ele o front nao oferece a leitura do agente e continua completo
       * com o resumo deterministico, que e o comportamento correto para quem
       * roda o projeto localmente sem subir a API.
       */
      apiBase: '',
    },
  },

  css: ['~~/assets/css/tokens.css', '~~/assets/css/base.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'dark' },
      ],
    },
  },

  /**
   * Fase 3 e estatica de proposito. Nenhuma biblioteca de animacao entra aqui,
   * e a pagina precisa parecer boa parada antes de ganhar movimento na Fase 4.
   */
  future: { compatibilityVersion: 4 },
})
