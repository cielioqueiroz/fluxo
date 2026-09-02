<script setup lang="ts">
import type { InsightInput } from '@fluxo/domain'
import { computed } from 'vue'

import { useInsight } from '~~/composables/useInsight'
import { formatCurrency, formatPercent, formatTerm } from '~~/lib/format'

const props = defineProps<{ summary: InsightInput }>()

/**
 * A leitura da IA entra por cima do texto calculado, nunca no lugar dele.
 *
 * O endereco da API vem da configuracao publica do Nuxt. Vazio, o botao nao
 * aparece e a secao continua sendo o resumo deterministico, que e o
 * comportamento correto e nao um erro.
 */
const { apiBase } = useRuntimeConfig().public
const insight = useInsight(apiBase)

const pedir = (): void => {
  void insight.request(props.summary)
}

/**
 * A leitura deterministica.
 *
 * Sai inteira do resumo que o dominio produziu, e nenhum numero aqui foi
 * inventado. Na Fase 6 a leitura da IA entra por cima disto, nunca no lugar:
 * se o modelo falhar duas vezes, e este texto que fica na tela.
 */
const leitura = computed(() => {
  const s = props.summary
  const frases: string[] = []

  if (s.neverSettles) {
    frases.push(
      'Neste cenario o pagamento nao cobre nem os encargos do mes, entao o saldo cresce e a divida nao termina.',
    )
  } else if (!s.settled) {
    frases.push('Dentro do horizonte simulado a divida ainda nao termina.')
  } else {
    frases.push(
      `Voce devolve ${formatCurrency(s.totalPaid)} por ${formatCurrency(s.principal)}, ao longo de ${formatTerm(s.termMonths)}.`,
    )
  }

  if (s.totalInterest > 0) {
    frases.push(
      `Juros e encargos somam ${formatCurrency(s.totalInterest)}, o equivalente a ${formatPercent(s.interestOverPrincipalPercent / 100)} do valor original.`,
    )
  }

  const metade = s.milestones.find((m) => m.fraction === 0.5)
  if (metade) {
    frases.push(
      `Metade do valor original so e amortizada no mes ${String(metade.period)}, quando ainda restam ${formatCurrency(metade.balance)}.`,
    )
  }

  if (s.capReachedAtPeriod !== null) {
    frases.push(
      `No mes ${String(s.capReachedAtPeriod)} os encargos batem no teto de 100% do valor original e param de crescer.`,
    )
  }

  return frases
})
</script>

<template>
  <div class="insight">
    <div class="insight__body">
      <p v-for="(frase, indice) in leitura" :key="indice" class="prose">{{ frase }}</p>
    </div>

    <!--
      A leitura do agente vem depois do texto calculado, e some sem deixar
      buraco quando o modelo nao responde. O que esta acima continua na tela em
      todos os estados.
    -->
    <section
      v-if="insight.state.value === 'pronto' && insight.response.value"
      class="insight__agent"
    >
      <UiLabel>Leitura do agente</UiLabel>
      <p class="insight__headline">{{ insight.response.value.headline }}</p>
      <p class="prose">{{ insight.response.value.reading }}</p>

      <ul v-if="insight.response.value.citations.length > 0" class="insight__citations">
        <InsightCitation
          v-for="(citacao, indice) in insight.response.value.citations"
          :key="citacao.url + String(indice)"
          :citation="citacao"
          :index="indice"
        />
      </ul>
    </section>

    <p v-else-if="insight.state.value === 'carregando'" class="insight__pending">
      <span aria-hidden="true">&bull;</span>
      Escrevendo a leitura. O servidor gratuito pode levar quase um minuto para acordar.
    </p>

    <div v-else-if="apiBase !== ''" class="insight__action">
      <UiButton variant="ghost" @click="pedir">
        {{
          insight.state.value === 'indisponivel' ? 'Tentar de novo' : 'Pedir a leitura do agente'
        }}
      </UiButton>
      <p v-if="insight.state.value === 'indisponivel'" class="insight__pending">
        <span aria-hidden="true">&bull;</span>
        O agente nao respondeu. O texto acima continua valendo: ele e calculado, nao gerado.
      </p>
    </div>

    <p class="insight__notice">
      Material educativo. Nao e recomendacao de produto financeiro. Os valores sao uma simulacao e
      podem diferir do contrato do seu banco. A comparacao e nominal, sem correcao pelo valor do
      dinheiro no tempo.
    </p>
  </div>
</template>

<style scoped>
.insight {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.insight__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.insight__body .prose {
  font-size: var(--text-heading);
  line-height: 1.45;
  color: var(--color-text-primary);
  max-width: 54ch;
}

.insight__agent {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.insight__headline {
  font-size: var(--text-heading);
  font-weight: var(--weight-light);
  line-height: 1.3;
  text-wrap: balance;
}

.insight__citations {
  list-style: none;
  margin: 0;
  padding: 0;
  margin-top: var(--space-2);
}

.insight__action {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.insight__pending {
  display: flex;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  line-height: 1.7;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
  max-width: 60ch;
}

.insight__notice {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--text-small);
  color: var(--color-text-faint);
  max-width: 60ch;
}
</style>
