import { describe, expect, it } from 'vitest'

import { DOMAIN_READY } from '../src/index.js'

describe('encanamento do pacote de dominio', () => {
  it('exporta o marcador de prontidao', () => {
    expect(DOMAIN_READY).toBe(true)
  })
})
