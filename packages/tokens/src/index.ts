import { color } from './color.js'
import { motion } from './motion.js'
import { radius, space } from './space.js'
import { typography } from './type.js'

/**
 * A fonte unica do design system.
 *
 * Nenhum valor cru de cor, espaco ou duracao entra em componente. So token, e
 * todo token nasce aqui. O `tokens.css` que o front consome e gerado a partir
 * deste objeto por `build.ts`.
 */
export const tokens = {
  color,
  typography,
  space,
  motion,
  radius,
} as const

export type Tokens = typeof tokens

export { color, motion, radius, space, typography }
