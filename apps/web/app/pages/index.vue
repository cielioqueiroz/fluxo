<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { PARALLAX } from '~~/composables/useParallaxLayer'
import { useReducedMotion } from '~~/composables/useReducedMotion'
import { useWebgl } from '~~/composables/useWebgl'
import { formatCurrency, formatTerm } from '~~/lib/format'
import { useSimulationStore } from '~~/stores/simulation.store'

const DESCRICAO =
  'Simule um financiamento ou uma fatura de cartao e veja o que acontece com o dinheiro ao longo do tempo. Calculo deterministico, material educativo.'

const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: 'Fluxo, anatomia de uma divida',
  description: DESCRICAO,
  ogTitle: 'Fluxo, anatomia de uma divida',
  ogDescription: DESCRICAO,
  ogType: 'website',
  ogLocale: 'pt_BR',
  ogUrl: siteUrl,
  ogImage: `${siteUrl}/og.svg`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: 'Fluxo, anatomia de uma divida. Duas curvas que se cruzam sobre fundo escuro.',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Fluxo, anatomia de uma divida',
  twitterDescription: DESCRICAO,
  twitterImage: `${siteUrl}/og.svg`,
})

useHead({
  link: [{ rel: 'canonical', href: siteUrl }],
})

const store = useSimulationStore()
const { kind, schedule, comparison, summary, card, isEmpty } = storeToRefs(store)

const movimentoReduzido = useReducedMotion()
const webglDisponivel = useWebgl()

/**
 * Se as cenas 3D podem ser montadas.
 *
 * Duas razoes independentes para nao montar, e a mesma consequencia: os
 * graficos estaticos da Fase 3 assumem. Movimento reduzido e escolha do
 * usuario; WebGL ausente e limite do navegador. Nenhuma das duas pode custar a
 * narrativa.
 */
const comCena = computed(() => !movimentoReduzido.value && webglDisponivel.value)

/** O mes em que a divida passa a devolver mais principal do que custa em juros. */
const viradaDaCurva = computed(() => {
  const tabela = schedule.value
  if (!tabela) {
    return null
  }
  const linha = tabela.installments.find((l) => l.amortization > l.interest + l.fees)
  return linha?.period ?? null
})

const metade = computed(() => summary.value?.milestones.find((m) => m.fraction === 0.5) ?? null)
</script>

<template>
  <div class="narrative">
    <SceneNoise v-if="comCena" />

    <div class="narrative__content">
      <!-- 1. Entrada -->
      <SceneStage index="01" label="A divida" labelled-by="s1" :stage-factor="PARALLAX.text">
        <template #text>
          <h1 id="s1" class="headline">
            Todo mundo sabe quanto pega emprestado.
            <span class="headline__dim">Quase ninguem sabe quanto devolve.</span>
          </h1>
          <p class="prose">
            Preencha os quatro campos ao lado. O calculo roda aqui no seu navegador, nada e enviado
            para lugar nenhum, e a pagina inteira abaixo se refaz enquanto voce digita.
          </p>
        </template>

        <template #stage>
          <SimulatorForm />
        </template>
      </SceneStage>

      <!-- 2. O emprestimo nasce -->
      <SceneStage
        index="02"
        label="Como funciona"
        labelled-by="s2"
        :stage-factor="PARALLAX.columns"
      >
        <template #text>
          <h2 id="s2" class="title">
            A divida nasce dividida em partes iguais.
            <span class="title__dim">O que muda em cada uma e o que voce esta pagando.</span>
          </h2>
          <p v-if="schedule" class="prose">
            Sao <strong>{{ formatTerm(schedule.termMonths) }}</strong> de pagamento. A altura de
            cada coluna e o valor da parcela, e a parte marcada e o quanto dela some em juros antes
            de encostar na divida.
          </p>
          <p v-else class="prose">Informe um valor para ver as parcelas.</p>
        </template>

        <template #stage="{ progress }">
          <template v-if="schedule">
            <SceneColumns v-if="comCena" :schedule="schedule" :progress="progress" />
            <ChartInstallments v-else :schedule="schedule" />
          </template>
          <div v-else class="empty">Sem valor</div>
        </template>
      </SceneStage>

      <!-- 3. Onde o dinheiro vai -->
      <SceneStage
        index="03"
        label="Onde o dinheiro vai"
        labelled-by="s3"
        :stage-factor="PARALLAX.curve"
      >
        <template #text>
          <h2 id="s3" class="title">
            As duas curvas contam a mesma historia.
            <span class="title__dim">Uma sobe para voce, a outra sobe contra voce.</span>
          </h2>
          <p v-if="viradaDaCurva" class="prose">
            Ate o mes <strong>{{ viradaDaCurva }}</strong> cada parcela devolve mais em juros do que
            abate da divida. Depois disso a conta se inverte.
          </p>
          <p v-else-if="schedule" class="prose">
            Neste cenario a parcela abate mais principal do que juros desde o primeiro mes.
          </p>
          <p v-else class="prose">Informe um valor para ver as curvas.</p>
        </template>

        <template #stage>
          <template v-if="schedule">
            <SceneCurve v-if="comCena" :schedule="schedule" />
            <ChartAmortization v-else :schedule="schedule" />
          </template>
          <div v-else class="empty">Sem valor</div>
        </template>
      </SceneStage>

      <!-- 4. O caminho lento -->
      <SceneStage index="04" label="O caminho lento" labelled-by="s4">
        <template #text>
          <h2 id="s4" class="title">
            Levar ate o fim tem um preco.
            <span class="title__dim">Ele so aparece somado.</span>
          </h2>
          <p v-if="kind === 'card' && card" class="prose">
            No Brasil o rotativo dura um mes. Depois disso o saldo vira parcelamento obrigatorio, e
            e nele que o dinheiro fica.
          </p>
          <p v-else-if="metade" class="prose">
            Metade do valor original so e amortizada no mes <strong>{{ metade.period }}</strong
            >, quando ainda restam <strong>{{ formatCurrency(metade.balance) }}</strong> em aberto.
          </p>
        </template>

        <template #stage>
          <SimulatorSummary v-if="summary && !isEmpty" :summary="summary" />
          <div v-else class="empty">Sem valor</div>
        </template>
      </SceneStage>

      <!-- 5. As saidas -->
      <SceneStage index="05" label="As saidas" labelled-by="s5">
        <template #text>
          <h2 id="s5" class="title">
            Tres caminhos, dois numeros.
            <span class="title__dim"
              >Quanto voce deixa de gastar, e quanto tempo ganha de volta.</span
            >
          </h2>
          <p v-if="kind === 'card'" class="prose">
            A comparacao entre antecipar, portar e manter vale para financiamento. Troque o tipo de
            divida acima para ver as tres saidas.
          </p>
        </template>

        <template #stage>
          <ChartComparison v-if="comparison" :comparison="comparison" />
          <div v-else class="empty">Disponivel para financiamento</div>
        </template>
      </SceneStage>

      <!-- 6. A leitura -->
      <SceneStage index="06" label="A leitura" labelled-by="s6" :stage-factor="PARALLAX.text">
        <template #text>
          <h2 id="s6" class="title">
            O numero ja esta na tela.
            <span class="title__dim">Falta dizer o que ele significa.</span>
          </h2>
        </template>

        <template #stage>
          <InsightPanel v-if="summary && !isEmpty" :summary="summary" />
          <div v-else class="empty">Sem valor</div>
        </template>
      </SceneStage>
    </div>
  </div>
</template>

<style scoped>
/* O conteudo sobe acima do canvas de ruido, que e fixo em z-index 0. */
.narrative__content {
  position: relative;
  z-index: 1;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 120px;
  border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
}
</style>
