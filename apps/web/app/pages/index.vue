<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { formatCurrency, formatTerm } from '~~/lib/format'
import { useSimulationStore } from '~~/stores/simulation.store'

useHead({
  title: 'Fluxo, anatomia de uma divida',
  meta: [
    {
      name: 'description',
      content:
        'Simule um financiamento ou uma fatura de cartao e veja o que acontece com o dinheiro ao longo do tempo. Calculo deterministico, material educativo.',
    },
  ],
})

const store = useSimulationStore()
const { kind, schedule, comparison, summary, card, isEmpty } = storeToRefs(store)

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
    <!-- 1. Entrada -->
    <section class="section" aria-labelledby="s1">
      <div class="section__text">
        <UiLabel index="01">A divida</UiLabel>
        <h1 id="s1" class="headline">
          Todo mundo sabe quanto pega emprestado.
          <span class="headline__dim">Quase ninguem sabe quanto devolve.</span>
        </h1>
        <p class="prose">
          Preencha os quatro campos ao lado. O calculo roda aqui no seu navegador, nada e enviado
          para lugar nenhum, e a pagina inteira abaixo se refaz enquanto voce digita.
        </p>
      </div>

      <div class="section__stage">
        <SimulatorForm />
      </div>
    </section>

    <!-- 2. O emprestimo nasce -->
    <section class="section" aria-labelledby="s2">
      <div class="section__text">
        <UiLabel index="02">Como funciona</UiLabel>
        <h2 id="s2" class="title">
          A divida nasce dividida em partes iguais.
          <span class="title__dim">O que muda em cada uma e o que voce esta pagando.</span>
        </h2>
        <p v-if="schedule" class="prose">
          Sao <strong>{{ formatTerm(schedule.termMonths) }}</strong> de pagamento. A altura de cada
          coluna e o valor da parcela, e a parte marcada e o quanto dela some em juros antes de
          encostar na divida.
        </p>
        <p v-else class="prose">Informe um valor para ver as parcelas.</p>
      </div>

      <div class="section__stage">
        <ChartInstallments v-if="schedule" :schedule="schedule" />
        <div v-else class="empty">Sem valor</div>
      </div>
    </section>

    <!-- 3. Onde o dinheiro vai -->
    <section class="section" aria-labelledby="s3">
      <div class="section__text">
        <UiLabel index="03">Onde o dinheiro vai</UiLabel>
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
      </div>

      <div class="section__stage">
        <ChartAmortization v-if="schedule" :schedule="schedule" />
        <div v-else class="empty">Sem valor</div>
      </div>
    </section>

    <!-- 4. O caminho lento -->
    <section class="section" aria-labelledby="s4">
      <div class="section__text">
        <UiLabel index="04">O caminho lento</UiLabel>
        <h2 id="s4" class="title">
          Levar ate o fim tem um preco.
          <span class="title__dim">Ele so aparece somado.</span>
        </h2>
        <p v-if="kind === 'card' && card" class="prose">
          No Brasil o rotativo dura um mes. Depois disso o saldo vira parcelamento obrigatorio, e e
          nele que o dinheiro fica.
        </p>
        <p v-else-if="metade" class="prose">
          Metade do valor original so e amortizada no mes <strong>{{ metade.period }}</strong
          >, quando ainda restam <strong>{{ formatCurrency(metade.balance) }}</strong> em aberto.
        </p>
      </div>

      <div class="section__stage">
        <SimulatorSummary v-if="summary && !isEmpty" :summary="summary" />
        <div v-else class="empty">Sem valor</div>
      </div>
    </section>

    <!-- 5. As saidas -->
    <section class="section" aria-labelledby="s5">
      <div class="section__text">
        <UiLabel index="05">As saidas</UiLabel>
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
      </div>

      <div class="section__stage">
        <ChartComparison v-if="comparison" :comparison="comparison" />
        <div v-else class="empty">Disponivel para financiamento</div>
      </div>
    </section>

    <!-- 6. A leitura -->
    <section class="section" aria-labelledby="s6">
      <div class="section__text">
        <UiLabel index="06">A leitura</UiLabel>
        <h2 id="s6" class="title">
          O numero ja esta na tela.
          <span class="title__dim">Falta dizer o que ele significa.</span>
        </h2>
      </div>

      <div class="section__stage">
        <InsightPanel v-if="summary && !isEmpty" :summary="summary" />
        <div v-else class="empty">Sem valor</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
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
