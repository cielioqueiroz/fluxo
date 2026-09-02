/**
 * Movimento da secao 5 do AGENTS.md.
 *
 * Transicoes de UI entre 120ms e 200ms, easing proprio, nunca o `ease-in-out`
 * padrao. Estes tokens governam a interface. O parallax da Fase 4 le progresso
 * de scroll e nao usa duracao.
 */
export const motion = {
  durations: {
    fast: '120ms',
    base: '160ms',
    slow: '200ms',
  },

  easings: {
    /** Entrada de elemento. Comeca rapido, assenta devagar. */
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    /** Saida de elemento. */
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
    /** Movimento que comeca e termina parado, sem o achatamento do padrao. */
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
} as const
