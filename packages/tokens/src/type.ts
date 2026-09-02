/**
 * Tipografia da secao 4 do AGENTS.md.
 *
 * General Sans e JetBrains Mono, auto hospedadas na Fase 3. Inter, Geist e
 * Roboto sao proibidas por nome, entao nem aparecem no fallback.
 */
export const typography = {
  families: {
    display: "'General Sans', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
  },

  /** Escala fechada: 64 / 40 / 24 / 16 / 13 / 11. Nada entre. */
  scale: {
    display: '64px',
    title: '40px',
    heading: '24px',
    body: '16px',
    small: '13px',
    label: '11px',
  },

  /** Peso 300 em titulos grandes, 400 no corpo, 500 no maximo. */
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
  },
} as const
