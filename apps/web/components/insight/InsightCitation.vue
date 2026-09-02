<script setup lang="ts">
import type { Citation } from '@fluxo/contracts'

/**
 * Uma citacao com a fonte visivel.
 *
 * A URL fica na tela, e nao escondida atras de um icone: quem le precisa poder
 * conferir sem clicar. `rel="noopener noreferrer"` porque o destino e externo e
 * nao ha razao para lhe dar acesso a esta janela.
 */
defineProps<{ citation: Citation; index: number }>()
</script>

<template>
  <li class="citation">
    <span class="citation__index" aria-hidden="true">[{{ index }}]</span>
    <div class="citation__body">
      <a class="citation__source" :href="citation.url" target="_blank" rel="noopener noreferrer">
        {{ citation.source }}
      </a>
      <p class="citation__excerpt">{{ citation.excerpt }}</p>
    </div>
  </li>
</template>

<style scoped>
.citation {
  display: flex;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}

.citation__index {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-faint);
  padding-top: 2px;
}

.citation__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.citation__source {
  font-size: var(--text-small);
  color: var(--color-text-primary);
  text-decoration-color: var(--color-border-strong);
  text-underline-offset: 3px;
  transition: text-decoration-color var(--duration-fast) var(--ease-out);
}

.citation__source:hover {
  text-decoration-color: var(--color-text-primary);
}

.citation__excerpt {
  font-size: var(--text-small);
  color: var(--color-text-faint);
}
</style>
