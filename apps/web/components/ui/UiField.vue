<script setup lang="ts">
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    id: string
    label: string
    /** Unidade impressa dentro do campo, a direita. */
    suffix?: string
    prefix?: string
    hint?: string
    inputmode?: 'decimal' | 'numeric'
  }>(),
  { suffix: undefined, prefix: undefined, hint: undefined, inputmode: 'decimal' },
)
</script>

<template>
  <div class="field">
    <label class="field__label" :for="id">{{ label }}</label>

    <div class="field__control">
      <span v-if="prefix" class="field__affix" aria-hidden="true">{{ prefix }}</span>
      <input
        :id="id"
        v-model="model"
        class="field__input"
        type="text"
        :inputmode="inputmode"
        autocomplete="off"
        spellcheck="false"
        :aria-describedby="hint ? `${id}-hint` : undefined"
      />
      <span v-if="suffix" class="field__affix" aria-hidden="true">{{ suffix }}</span>
    </div>

    <p v-if="hint" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

/* Borda de 1px sobre superficie elevada. Sem sombra, sem raio grande. */
.field__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.field__control:focus-within {
  border-color: var(--color-border-strong);
}

.field__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.field__input:focus {
  outline: none;
}

.field__affix {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--color-text-faint);
}

.field__hint {
  font-size: var(--text-small);
  color: var(--color-text-faint);
}
</style>
