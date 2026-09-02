<script setup lang="ts">
/**
 * Numero na tela.
 *
 * Sempre monoespacado e sempre com `tabular-nums`, para que colunas de valores
 * alinhem digito com digito. A cor de sotaque so aparece aqui, porque a secao 4
 * do AGENTS.md diz que ela e aplicada somente ao dinheiro.
 */
withDefaults(
  defineProps<{
    /** `debt` para o que a divida custa, `relief` para o que a estrategia devolve. */
    intent?: 'neutral' | 'debt' | 'relief'
    size?: 'display' | 'title' | 'heading' | 'body' | 'small'
    /** Rotulo lido por leitor de tela antes do valor. */
    label?: string
  }>(),
  { intent: 'neutral', size: 'heading', label: undefined },
)
</script>

<template>
  <span class="value" :class="[`value--${intent}`, `value--${size}`]">
    <span v-if="label" class="sr-only">{{ label }}: </span>
    <slot />
  </span>
</template>

<style scoped>
.value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-regular);
  letter-spacing: -0.01em;
  line-height: 1.1;
  white-space: nowrap;
}

.value--neutral {
  color: var(--color-text-primary);
}

.value--debt {
  color: var(--color-intent-debt);
}

.value--relief {
  color: var(--color-intent-relief);
}

.value--display {
  font-size: var(--text-display);
  font-weight: var(--weight-light);
}

.value--title {
  font-size: var(--text-title);
  font-weight: var(--weight-light);
}

.value--heading {
  font-size: var(--text-heading);
}

.value--body {
  font-size: var(--text-body);
}

.value--small {
  font-size: var(--text-small);
}

@media (max-width: 900px) {
  .value--display {
    font-size: var(--text-title);
  }
}
</style>
