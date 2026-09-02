<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'solid' | 'ghost'
    type?: 'button' | 'submit'
    pressed?: boolean
  }>(),
  { variant: 'solid', type: 'button', pressed: undefined },
)
</script>

<template>
  <button class="button" :class="`button--${variant}`" :type="type" :aria-pressed="pressed">
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  border: 1px solid var(--color-border-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.button--solid {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: var(--color-bg-base);
}

.button--solid:hover {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
}

.button--ghost {
  background: transparent;
  color: var(--color-text-muted);
}

.button--ghost:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.button--ghost[aria-pressed='true'] {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  background: var(--color-bg-raised);
}
</style>
