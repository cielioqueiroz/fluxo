<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useSimulationStore } from '~~/stores/simulation.store'

const store = useSimulationStore()
const {
  kind,
  amountInput,
  monthlyRateInput,
  termInput,
  system,
  monthlyExtraInput,
  installmentRateInput,
  installmentTermInput,
} = storeToRefs(store)
</script>

<template>
  <form class="form" @submit.prevent>
    <fieldset class="form__kind">
      <legend class="sr-only">Tipo de divida</legend>
      <UiButton variant="ghost" :pressed="kind === 'loan'" @click="kind = 'loan'">
        Financiamento
      </UiButton>
      <UiButton variant="ghost" :pressed="kind === 'card'" @click="kind = 'card'">
        Cartao de credito
      </UiButton>
    </fieldset>

    <div class="form__grid">
      <UiField
        id="valor"
        v-model="amountInput"
        :label="kind === 'loan' ? 'Valor financiado' : 'Valor da fatura'"
        prefix="R$"
      />

      <UiField
        id="taxa"
        v-model="monthlyRateInput"
        :label="kind === 'loan' ? 'Taxa mensal' : 'Taxa do rotativo'"
        suffix="% a.m."
      />

      <!--
        No cartao o campo prazo nao existe: quem manda e o parcelamento
        obrigatorio depois do rotativo. O formulario continua com quatro campos.
      -->
      <UiField
        v-if="kind === 'loan'"
        id="prazo"
        v-model="termInput"
        label="Prazo"
        suffix="meses"
        inputmode="numeric"
      />
      <UiField
        v-else
        id="taxa-parcelamento"
        v-model="installmentRateInput"
        label="Taxa do parcelamento"
        suffix="% a.m."
        hint="O rotativo dura um mes, depois vira parcelamento."
      />

      <UiField
        v-if="kind === 'loan'"
        id="aporte"
        v-model="monthlyExtraInput"
        label="Aporte mensal"
        prefix="R$"
        hint="Quanto voce consegue pagar a mais, todo mes."
      />
      <UiField
        v-else
        id="prazo-parcelamento"
        v-model="installmentTermInput"
        label="Prazo do parcelamento"
        suffix="meses"
        inputmode="numeric"
      />
    </div>

    <fieldset v-if="kind === 'loan'" class="form__system">
      <legend class="form__legend">Sistema de amortizacao</legend>
      <UiButton variant="ghost" :pressed="system === 'price'" @click="system = 'price'">
        Price
      </UiButton>
      <UiButton variant="ghost" :pressed="system === 'sac'" @click="system = 'sac'"> SAC </UiButton>
    </fieldset>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.form__kind,
.form__system {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  border: 0;
  padding: 0;
  margin: 0;
}

.form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.form__legend {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
  padding: 0;
  margin-bottom: var(--space-3);
}

@media (max-width: 520px) {
  .form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
