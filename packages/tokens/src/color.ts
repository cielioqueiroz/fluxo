/**
 * As cores da secao 4 do AGENTS.md.
 *
 * Uma unica cor de sotaque por intencao, aplicada so ao dinheiro. Superficies
 * separadas por borda de 1px, elevacao zero, nenhuma sombra difusa.
 */
export const color = {
  'bg-base': '#0A0A0A',
  'bg-raised': '#141414',
  'bg-sunken': '#060606',

  'border-subtle': 'rgba(255, 255, 255, 0.08)',
  'border-strong': 'rgba(255, 255, 255, 0.16)',

  'text-primary': '#EDEDED',
  'text-muted': '#8A8A8A',
  'text-faint': '#5A5A5A',

  /** O dinheiro que sai. Juros, encargos, o que a divida custa. */
  'intent-debt': '#C4552F',
  /** O dinheiro que fica. Economia, quitacao, o que a estrategia devolve. */
  'intent-relief': '#6F8F6A',
} as const satisfies Record<string, string>
