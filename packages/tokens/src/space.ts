/**
 * Escala de espaco em base 4, e o raio unico.
 *
 * O AGENTS.md fixa o raio em 4px e proibe 12px ou mais, entao existe um raio
 * so e ele nao tem variantes.
 */
export const space = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '6': '24px',
  '8': '32px',
  '12': '48px',
  '16': '64px',
  '24': '96px',
  '32': '128px',
  /** Respiro entre secoes da narrativa. */
  section: '160px',
} as const satisfies Record<string, string>

export const radius = '4px'
