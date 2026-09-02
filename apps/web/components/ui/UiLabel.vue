<script setup lang="ts">
/**
 * Label mono de secao, no padrao da secao 4 do AGENTS.md.
 *
 * Monoespacada, 11px, caixa alta, com marcador. O marcador e um bullet real e
 * nao um emoji, porque emoji como icone e proibido.
 */
defineProps<{
  /** Numero da secao. Aparece antes do marcador, apagado. */
  index?: string
}>()
</script>

<template>
  <p class="label">
    <span v-if="index" class="label__index">{{ index }}</span>
    <span class="label__mark" aria-hidden="true">&bull;</span>
    <span class="label__text"><slot /></span>
  </p>
</template>

<style scoped>
.label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  font-weight: var(--weight-regular);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.label__index {
  color: var(--color-text-faint);
  font-variant-numeric: tabular-nums;
}

.label__mark {
  color: var(--color-text-faint);
}
</style>
