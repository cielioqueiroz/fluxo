<template>
  <div class="shell">
    <a class="shell__skip" href="#narrativa">Pular para a narrativa</a>

    <header class="shell__header">
      <p class="shell__mark">Fluxo<span class="shell__markDim">, anatomia de uma divida</span></p>
      <p class="shell__meta">Simulacao educativa</p>
    </header>

    <main id="narrativa">
      <slot />
    </main>

    <footer class="shell__footer">
      <p class="shell__meta">
        Calculo deterministico. Nenhum valor desta pagina foi escrito por um modelo de linguagem.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.shell__skip {
  position: absolute;
  inset-inline-start: var(--space-4);
  inset-block-start: calc(var(--space-4) * -4);
  z-index: 10;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.shell__skip:focus {
  inset-block-start: var(--space-4);
}

/*
 * Cabecalho e rodape sao filetes, nao barras. Uma linha de 1px separa, e nada
 * mais. Elevacao zero vale para a casca tambem.
 */
.shell__header,
.shell__footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  max-width: 1400px;
  width: 100%;
  margin-inline: auto;
  padding: var(--space-4) var(--space-6);
}

.shell__header {
  border-bottom: 1px solid var(--color-border-subtle);
}

.shell__footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border-subtle);
}

.shell__mark {
  font-size: var(--text-small);
  letter-spacing: 0.01em;
}

.shell__markDim {
  color: var(--color-text-faint);
}

.shell__meta {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
}

@media (max-width: 900px) {
  .shell__header,
  .shell__footer {
    padding-inline: var(--space-4);
  }

  .shell__meta {
    display: none;
  }
}
</style>
