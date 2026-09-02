# Fase 1, o domínio. Plano de implementação

> **Para executores:** os passos usam caixa de seleção. Cada tarefa termina com
> um entregável testável sozinho, e com um commit. Não pule o passo de ver o
> teste falhar: ele é o que prova que o teste testa alguma coisa.

**Objetivo:** `packages/domain` com todo o cálculo financeiro do Fluxo, testado
acima de 90%, sem nenhuma dependência.

**Arquitetura:** tudo desemboca em `Schedule`. Um construtor único verifica as
invariantes e calcula os agregados, então a regra do centavo mora em um lugar
só. O cartão é um motor genérico parametrizado, e a regulação brasileira vive
em um preset separado.

**Stack:** TypeScript 5.9 estrito, Vitest 4, zero dependências de produção.

**Spec:** `docs/spec/2026-09-02-dominio-design.md`. O plano argumenta a partir
dela, e quem executa lê as duas.

## Restrições globais

Valem em toda tarefa. Não se repetem tarefa a tarefa.

- Sem `any`. O ESLint quebra o CI
- Sem `import` de nada, nem `node:*`. A regra de lint da Fase 0 já barra
- Dinheiro é `Cents`, inteiro. Nenhum `number` cru atravessa a superfície pública
- Arredondamento só nas fronteiras monetárias, meio para cima, afastando do zero
- Sem travessão em código, comentário ou documentação
- Todo arquivo novo é `.ts` com `export`, e o import interno usa sufixo `.js`,
  que é o que `NodeNext` exige
- Commits em Conventional Commits, escopo `domain`
- `pnpm --filter @fluxo/domain test` verde antes de cada commit

## Um desvio da spec, decidido na hora de escrever as assinaturas

A spec listava `mulRate` na superfície de `money/decimal.ts`. Na implementação
ele vira `applyRate` e muda de casa, para `money/rate.ts`.

O motivo é acoplamento: se `decimal.ts` conhecesse `Rate`, os dois arquivos se
importariam em círculo. Com `applyRate` em `rate.ts`, a dependência é de mão
única, `rate.ts` importa `decimal.ts`, e a multiplicação continua exigindo uma
`Rate` de verdade em vez de aceitar qualquer `number`. Ganha segurança e perde
o ciclo.

## Estrutura de arquivos

| Arquivo                              | Responsabilidade                                              |
| ------------------------------------ | ------------------------------------------------------------- |
| `src/money/decimal.ts`               | `Cents`, aritmética, arredondamento, resíduo por parcela      |
| `src/money/rate.ts`                  | `Rate`, conversões, `applyRate`                               |
| `src/amortization/schedule.ts`       | `Installment`, `Schedule`, `buildSchedule` e as invariantes   |
| `src/amortization/price.ts`          | parcela fixa, e `pricePayment` reaproveitado pelo cartão      |
| `src/amortization/sac.ts`            | amortização constante                                         |
| `src/credit-card/params.ts`          | `CardParams`, `PaymentPolicy`, `CardInput`, `ParamProvenance` |
| `src/credit-card/minimum-payment.ts` | resolve uma política em um pagamento                          |
| `src/credit-card/revolving.ts`       | estágio 1, o rotativo                                         |
| `src/credit-card/card-debt.ts`       | orquestra os dois estágios e o teto                           |
| `src/credit-card/presets/brasil.ts`  | os parâmetros brasileiros e a fonte de cada um                |
| `src/strategy/prepayment.ts`         | aporte mensal recorrente                                      |
| `src/strategy/compare.ts`            | `portabilityBreakEven` e `compare`                            |
| `src/summary/insight-input.ts`       | o resumo que a Fase 6 manda ao modelo                         |
| `src/index.ts`                       | superfície pública explícita                                  |

---

### Tarefa 1: dinheiro

**Arquivos:**

- Criar: `packages/domain/src/money/decimal.ts`
- Criar: `packages/domain/tests/money/decimal.test.ts`

**Interfaces produzidas:**

```ts
type Cents = number & { readonly [centsBrand]: 'Cents' }
const ZERO: Cents
function cents(value: number): Cents
function roundHalfUp(x: number): number
function add(a: Cents, b: Cents): Cents
function sub(a: Cents, b: Cents): Cents
function smallest(a: Cents, b: Cents): Cents
function distributeOverInstallments(total: Cents, parts: number): readonly Cents[]
```

`smallest` em vez de `min` para não colidir com `Math.min` quando alguém
importar tudo em um namespace.

**A superfície é só isto.** A spec listava também `absolute`, `largest`,
`compareCents` e `isZero`. Nenhum consumidor das tarefas 2 a 13 usa essas
quatro, então elas não entram. A trava de cobertura de 90% é o que faz essa
regra valer sozinha: função exportada e não usada derruba a suíte, e a saída
certa é apagar, não escrever teste para código morto.

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import {
  ZERO,
  add,
  cents,
  distributeOverInstallments,
  roundHalfUp,
  sub,
} from '../../src/money/decimal.js'

describe('cents', () => {
  it('aceita inteiro', () => {
    expect(cents(1234)).toBe(1234)
  })

  it('recusa fracao, porque centavo fracionario e bug', () => {
    expect(() => cents(12.5)).toThrow(RangeError)
  })

  it('recusa nao finito', () => {
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('roundHalfUp', () => {
  it('arredonda meio para cima no positivo', () => {
    expect(roundHalfUp(0.5)).toBe(1)
    expect(roundHalfUp(1.5)).toBe(2)
  })

  it('arredonda afastando do zero no negativo, diferente de Math.round', () => {
    expect(roundHalfUp(-0.5)).toBe(-1)
    expect(Math.round(-0.5)).toBe(-0)
  })
})

describe('aritmetica', () => {
  it('soma e subtrai mantendo a marca', () => {
    expect(add(cents(100), cents(23))).toBe(123)
    expect(sub(cents(100), cents(23))).toBe(77)
  })

  it('ZERO e zero', () => {
    expect(ZERO).toBe(0)
  })
})

describe('distributeOverInstallments', () => {
  it('reparte igualmente quando divide exato', () => {
    expect(distributeOverInstallments(cents(9000), 3)).toEqual([3000, 3000, 3000])
  })

  it('poe o residuo na ultima parcela', () => {
    expect(distributeOverInstallments(cents(10000), 3)).toEqual([3333, 3333, 3334])
  })

  it('devolve o total inteiro quando ha uma parcela so', () => {
    expect(distributeOverInstallments(cents(10000), 1)).toEqual([10000])
  })

  it('reparte zero sem inventar centavo', () => {
    expect(distributeOverInstallments(ZERO, 12)).toEqual(Array<number>(12).fill(0))
  })

  it('nunca perde centavo, para qualquer total e qualquer prazo', () => {
    for (const total of [1, 7, 99, 100000, 123457]) {
      for (const parts of [1, 2, 3, 7, 12, 360]) {
        const partes = distributeOverInstallments(cents(total), parts)
        expect(partes).toHaveLength(parts)
        expect(partes.reduce<number>((a, b) => a + b, 0)).toBe(total)
      }
    }
  })

  it('recusa prazo zero', () => {
    expect(() => distributeOverInstallments(cents(100), 0)).toThrow(RangeError)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `pnpm --filter @fluxo/domain exec vitest run tests/money/decimal.test.ts`
Esperado: falha com `Cannot find module '../../src/money/decimal.js'`

- [ ] **Passo 3: implementar**

```ts
declare const centsBrand: unique symbol

/** Dinheiro em centavos inteiros. Ponto flutuante em calculo monetario e bug. */
export type Cents = number & { readonly [centsBrand]: 'Cents' }

export const ZERO = 0 as Cents

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Dinheiro precisa ser inteiro seguro em centavos, recebido ${value}`)
  }
  return value as Cents
}

/**
 * Meio para cima, afastando do zero.
 * `Math.round` sozinho nao serve: ele arredonda para o infinito positivo, entao
 * trata -0.5 e 0.5 de formas diferentes.
 */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

export const add = (a: Cents, b: Cents): Cents => cents(a + b)
export const sub = (a: Cents, b: Cents): Cents => cents(a - b)
export const smallest = (a: Cents, b: Cents): Cents => (a <= b ? a : b)

/**
 * Reparte um total em parcelas iguais e poe o residuo na ultima.
 *
 * O `allocate` do padrao Money de Fowler poe o resto nas primeiras partes, em
 * rodizio, para que nenhuma parte fique sempre com o troco. Aquilo resolve
 * repartir entre partes. Isto e amortizacao, e a convencao e a ultima parcela
 * absorver o residuo.
 */
export function distributeOverInstallments(total: Cents, parts: number): readonly Cents[] {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new RangeError(`Prazo precisa ser inteiro positivo, recebido ${parts}`)
  }
  const base = Math.trunc(total / parts)
  const residue = total - base * parts
  const result: Cents[] = Array<Cents>(parts).fill(cents(base))
  result[parts - 1] = cents(base + residue)
  return result
}
```

- [ ] **Passo 4: rodar e ver passar**

Rodar: `pnpm --filter @fluxo/domain exec vitest run tests/money/decimal.test.ts`
Esperado: todos verdes

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/money/decimal.ts packages/domain/tests/money/decimal.test.ts
git commit -m "feat(domain): dinheiro em centavos inteiros com residuo na ultima parcela"
```

---

### Tarefa 2: taxa

**Arquivos:**

- Criar: `packages/domain/src/money/rate.ts`
- Criar: `packages/domain/tests/money/rate.test.ts`

**Interfaces consumidas:** `Cents`, `cents`, `roundHalfUp` de `money/decimal.js`

**Interfaces produzidas:**

```ts
type Rate = number & { readonly [rateBrand]: 'Rate' }
const ZERO_RATE: Rate
function rate(fraction: number): Rate
function fromPercent(percent: number): Rate
function toAnnual(monthly: Rate): Rate
function fromAnnual(annual: Rate): Rate
function applyRate(amount: Cents, r: Rate): Cents
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { cents } from '../../src/money/decimal.js'
import { applyRate, fromAnnual, fromPercent, rate, toAnnual } from '../../src/money/rate.js'

describe('rate', () => {
  it('aceita zero, que e taxa valida e nao caso degenerado', () => {
    expect(rate(0)).toBe(0)
  })

  it('recusa negativo', () => {
    expect(() => rate(-0.01)).toThrow(RangeError)
  })

  it('converte percentual em fracao', () => {
    expect(fromPercent(1.5)).toBeCloseTo(0.015, 10)
  })
})

describe('conversao mensal e anual', () => {
  it('capitaliza doze meses', () => {
    expect(toAnnual(rate(0.01))).toBeCloseTo(0.12682503, 8)
  })

  it('volta ao mensal', () => {
    expect(fromAnnual(rate(0.12682503))).toBeCloseTo(0.01, 8)
  })

  it('ida e volta preserva a taxa', () => {
    expect(fromAnnual(toAnnual(rate(0.0234)))).toBeCloseTo(0.0234, 10)
  })

  it('taxa zero continua zero nos dois sentidos', () => {
    expect(toAnnual(rate(0))).toBe(0)
    expect(fromAnnual(rate(0))).toBe(0)
  })
})

describe('applyRate', () => {
  it('arredonda o resultado para centavo', () => {
    expect(applyRate(cents(10000), rate(0.015))).toBe(150)
  })

  it('arredonda meio para cima', () => {
    expect(applyRate(cents(101), rate(0.005))).toBe(1)
  })

  it('taxa zero nao gera juros', () => {
    expect(applyRate(cents(999999), rate(0))).toBe(0)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `pnpm --filter @fluxo/domain exec vitest run tests/money/rate.test.ts`
Esperado: falha com módulo não encontrado

- [ ] **Passo 3: implementar**

```ts
import { cents, roundHalfUp, type Cents } from './decimal.js'

declare const rateBrand: unique symbol

/** Fracao decimal ao mes. 0.015 e um e meio por cento ao mes, nunca 1.5. */
export type Rate = number & { readonly [rateBrand]: 'Rate' }

export function rate(fraction: number): Rate {
  if (!Number.isFinite(fraction) || fraction < 0) {
    throw new RangeError(`Taxa precisa ser finita e nao negativa, recebido ${fraction}`)
  }
  return fraction as Rate
}

export const ZERO_RATE = rate(0)

export const fromPercent = (percent: number): Rate => rate(percent / 100)
export const toAnnual = (monthly: Rate): Rate => rate((1 + monthly) ** 12 - 1)
export const fromAnnual = (annual: Rate): Rate => rate((1 + annual) ** (1 / 12) - 1)

/**
 * Multiplica dinheiro por taxa e arredonda para centavo.
 *
 * Mora aqui, e nao em decimal.ts, porque exigir uma `Rate` de verdade impede
 * passar 1.5 no lugar de 0.015, e porque decimal.ts nao pode conhecer Rate sem
 * criar importacao circular.
 */
export const applyRate = (amount: Cents, r: Rate): Cents => cents(roundHalfUp(amount * r))
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/money/rate.ts packages/domain/tests/money/rate.test.ts
git commit -m "feat(domain): taxa como tipo proprio com conversao mensal e anual"
```

---

### Tarefa 3: `Schedule` e as invariantes

**Arquivos:**

- Criar: `packages/domain/src/amortization/schedule.ts`
- Criar: `packages/domain/tests/amortization/schedule.test.ts`

**Interfaces consumidas:** `Cents`, `ZERO`, `cents`, `add`, `sub` de `money/decimal.js`

**Interfaces produzidas:**

```ts
type Stage = 'loan' | 'revolving' | 'installment'
interface Installment {
  readonly period: number
  readonly stage: Stage
  readonly openingBalance: Cents
  readonly interest: Cents
  readonly fees: Cents
  readonly amortization: Cents
  readonly payment: Cents
  readonly closingBalance: Cents
}
interface Schedule {
  readonly installments: readonly Installment[]
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly finalBalance: Cents
  readonly settled: boolean
  readonly neverSettles: boolean
  readonly termMonths: number
}
interface BuildOptions {
  readonly requireSettled: boolean
  readonly neverSettles: boolean
}
function buildSchedule(
  rows: readonly Installment[],
  principal: Cents,
  options: BuildOptions,
): Schedule
```

`buildSchedule` é o único lugar do pacote que decide se uma tabela é válida.
Todo cálculo passa por aqui.

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { cents, ZERO } from '../../src/money/decimal.js'
import { buildSchedule, type Installment } from '../../src/amortization/schedule.js'

const linha = (over: Partial<Installment> = {}): Installment => ({
  period: 1,
  stage: 'loan',
  openingBalance: cents(1000),
  interest: ZERO,
  fees: ZERO,
  amortization: cents(1000),
  payment: cents(1000),
  closingBalance: ZERO,
  ...over,
})

const quitada = { requireSettled: true, neverSettles: false } as const

describe('buildSchedule', () => {
  it('soma os agregados a partir das linhas', () => {
    const s = buildSchedule(
      [
        linha({
          period: 1,
          interest: cents(10),
          amortization: cents(500),
          payment: cents(510),
          closingBalance: cents(500),
        }),
        linha({
          period: 2,
          openingBalance: cents(500),
          interest: cents(5),
          amortization: cents(500),
          payment: cents(505),
        }),
      ],
      cents(1000),
      quitada,
    )
    expect(s.totalPaid).toBe(1015)
    expect(s.totalInterest).toBe(15)
    expect(s.totalFees).toBe(0)
    expect(s.termMonths).toBe(2)
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
  })

  it('recusa linha em que o saldo final nao fecha com a conta', () => {
    expect(() =>
      buildSchedule([linha({ closingBalance: cents(1) })], cents(1000), quitada),
    ).toThrow(/saldo final da linha/i)
  })

  it('recusa linha em que a amortizacao nao fecha com o pagamento', () => {
    expect(() =>
      buildSchedule([linha({ amortization: cents(999) })], cents(1000), quitada),
    ).toThrow(/amortizacao da linha/i)
  })

  it('recusa tabela cuja soma de amortizacoes nao devolve o principal', () => {
    expect(() => buildSchedule([linha()], cents(2000), quitada)).toThrow(/principal/i)
  })

  it('recusa tabela vazia', () => {
    expect(() => buildSchedule([], cents(1000), quitada)).toThrow(/vazia/i)
  })

  it('recusa nao quitada quando o chamador exige quitacao', () => {
    const naoQuita = linha({
      amortization: cents(400),
      payment: cents(400),
      closingBalance: cents(600),
    })
    expect(() => buildSchedule([naoQuita], cents(1000), quitada)).toThrow(/quitar/i)
  })

  it('aceita nao quitada quando o chamador nao exige', () => {
    const naoQuita = linha({
      stage: 'revolving',
      amortization: cents(400),
      payment: cents(400),
      closingBalance: cents(600),
    })
    const s = buildSchedule([naoQuita], cents(1000), { requireSettled: false, neverSettles: true })
    expect(s.settled).toBe(false)
    expect(s.neverSettles).toBe(true)
    expect(s.finalBalance).toBe(600)
  })

  it('recusa settled e neverSettles ao mesmo tempo', () => {
    expect(() =>
      buildSchedule([linha()], cents(1000), { requireSettled: false, neverSettles: true }),
    ).toThrow(/ao mesmo tempo/i)
  })

  it('aceita amortizacao negativa, que e a divida crescendo', () => {
    const cresce = linha({
      stage: 'revolving',
      interest: cents(150),
      amortization: cents(-50),
      payment: cents(100),
      closingBalance: cents(1050),
    })
    const s = buildSchedule([cresce], cents(1000), { requireSettled: false, neverSettles: true })
    expect(s.installments[0]?.amortization).toBe(-50)
    expect(s.finalBalance).toBe(1050)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `pnpm --filter @fluxo/domain exec vitest run tests/amortization/schedule.test.ts`

- [ ] **Passo 3: implementar**

```ts
import { add, sub, ZERO, type Cents } from '../money/decimal.js'

export type Stage = 'loan' | 'revolving' | 'installment'

export interface Installment {
  readonly period: number
  readonly stage: Stage
  readonly openingBalance: Cents
  readonly interest: Cents
  readonly fees: Cents
  /** Negativo quando o pagamento nao cobre os encargos e a divida cresce. */
  readonly amortization: Cents
  readonly payment: Cents
  readonly closingBalance: Cents
}

export interface Schedule {
  readonly installments: readonly Installment[]
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly finalBalance: Cents
  /** Quitou dentro do horizonte simulado. */
  readonly settled: boolean
  /** O pagamento e estruturalmente menor que os encargos, entao nao quita nunca. */
  readonly neverSettles: boolean
  readonly termMonths: number
}

export interface BuildOptions {
  readonly requireSettled: boolean
  readonly neverSettles: boolean
}

export function buildSchedule(
  rows: readonly Installment[],
  principal: Cents,
  options: BuildOptions,
): Schedule {
  if (rows.length === 0) {
    throw new RangeError('Tabela vazia nao e tabela de amortizacao')
  }

  let totalPaid = ZERO
  let totalInterest = ZERO
  let totalFees = ZERO
  let totalAmortized = ZERO

  for (const row of rows) {
    const esperado = sub(add(add(row.openingBalance, row.interest), row.fees), row.payment)
    if (esperado !== row.closingBalance) {
      throw new RangeError(
        `Saldo final da linha ${row.period} nao fecha: esperado ${esperado}, recebido ${row.closingBalance}`,
      )
    }
    const amortizacaoEsperada = sub(sub(row.payment, row.interest), row.fees)
    if (amortizacaoEsperada !== row.amortization) {
      throw new RangeError(
        `Amortizacao da linha ${row.period} nao fecha: esperado ${amortizacaoEsperada}, recebido ${row.amortization}`,
      )
    }
    totalPaid = add(totalPaid, row.payment)
    totalInterest = add(totalInterest, row.interest)
    totalFees = add(totalFees, row.fees)
    totalAmortized = add(totalAmortized, row.amortization)
  }

  const last = rows[rows.length - 1]
  if (last === undefined) {
    throw new RangeError('Tabela vazia nao e tabela de amortizacao')
  }
  const finalBalance = last.closingBalance

  if (add(totalAmortized, finalBalance) !== principal) {
    throw new RangeError(
      `Amortizacoes mais saldo final devem devolver o principal ${principal}, deram ${add(totalAmortized, finalBalance)}`,
    )
  }

  const settled = finalBalance === ZERO
  if (settled && options.neverSettles) {
    throw new RangeError('Uma tabela nao pode quitar e nunca quitar ao mesmo tempo')
  }
  if (options.requireSettled && !settled) {
    throw new RangeError(`Esta tabela precisa quitar, mas sobrou saldo de ${finalBalance}`)
  }

  return {
    installments: rows,
    principal,
    totalPaid,
    totalInterest,
    totalFees,
    finalBalance,
    settled,
    neverSettles: options.neverSettles,
    termMonths: rows.length,
  }
}

/** Usado por quem constroi linhas, para nao repetir a conta em cada calculo. */
export function closeRow(
  openingBalance: Cents,
  interest: Cents,
  fees: Cents,
  payment: Cents,
): Cents {
  return sub(add(add(openingBalance, interest), fees), payment)
}
```

O `import` de `cents` não entra neste arquivo: ele não constrói dinheiro novo,
só verifica o que recebeu. Importar sem usar quebra o lint.

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/amortization/schedule.ts packages/domain/tests/amortization/schedule.test.ts
git commit -m "feat(domain): tabela unica de amortizacao com invariantes verificadas"
```

---

### Tarefa 4: Price

**Arquivos:**

- Criar: `packages/domain/src/amortization/price.ts`
- Criar: `packages/domain/tests/amortization/price.test.ts`

**Interfaces consumidas:** `buildSchedule`, `Installment`, `Schedule`;
`applyRate`, `Rate`; `Cents`, `add`, `sub`, `cents`, `ZERO`, `roundHalfUp`

**Interfaces produzidas:**

```ts
interface LoanInput {
  readonly principal: Cents
  readonly monthlyRate: Rate
  readonly termMonths: number
}
function pricePayment(principal: Cents, monthlyRate: Rate, termMonths: number): Cents
function price(input: LoanInput): Schedule
```

`pricePayment` é exportada porque o estágio de parcelamento do cartão reusa
exatamente esta fórmula, e duplicá-la seria a forma mais fácil de os dois
divergirem.

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { price, pricePayment } from '../../src/amortization/price.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

describe('pricePayment', () => {
  it('calcula a parcela fixa da tabela Price', () => {
    // 10000,00 em 12 meses a 1% ao mes
    expect(pricePayment(cents(1000000), rate(0.01), 12)).toBe(88849)
  })

  it('com taxa zero, e o principal dividido pelo prazo', () => {
    expect(pricePayment(cents(1000000), rate(0), 12)).toBe(83333)
  })
})

describe('price', () => {
  it('quita exatamente, sem sobra nem falta', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
    expect(s.installments).toHaveLength(12)
  })

  it('total pago e a soma das parcelas, e juros e a diferenca para o principal', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    const soma = s.installments.reduce<number>((acc, i) => acc + i.payment, 0)
    expect(s.totalPaid).toBe(soma)
    expect(s.totalInterest).toBe(s.totalPaid - s.principal)
  })

  it('mantem a parcela constante, exceto a ultima que absorve o residuo', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    const menosAUltima = s.installments.slice(0, -1).map((i) => i.payment)
    expect(new Set(menosAUltima).size).toBe(1)
  })

  it('taxa zero nao cobra juros e ainda quita', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0), termMonths: 12 })
    expect(s.totalInterest).toBe(0)
    expect(s.totalPaid).toBe(1000000)
    expect(s.settled).toBe(true)
  })

  it('prazo de um mes paga principal mais um mes de juros', () => {
    const s = price({ principal: cents(100000), monthlyRate: rate(0.02), termMonths: 1 })
    expect(s.installments).toHaveLength(1)
    expect(s.totalInterest).toBe(2000)
    expect(s.totalPaid).toBe(102000)
    expect(s.settled).toBe(true)
  })

  it('valor que nao divide pelo prazo ainda fecha em zero', () => {
    const s = price({ principal: cents(100001), monthlyRate: rate(0), termMonths: 3 })
    expect(s.finalBalance).toBe(0)
    expect(s.totalPaid).toBe(100001)
  })

  it('marca toda linha como emprestimo', () => {
    const s = price({ principal: cents(500000), monthlyRate: rate(0.015), termMonths: 6 })
    expect(s.installments.every((i) => i.stage === 'loan')).toBe(true)
  })

  it('recusa prazo zero', () => {
    expect(() => price({ principal: cents(1000), monthlyRate: rate(0.01), termMonths: 0 })).toThrow(
      RangeError,
    )
  })
})
```

**Nota para quem executa:** os dois números literais, `88849` e `83333`, foram
conferidos à mão antes de entrar no plano. Se a implementação discordar deles,
o suspeito é a implementação, não o teste. Confira a fórmula antes de mexer no
número esperado.

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { add, cents, roundHalfUp, sub, ZERO, type Cents } from '../money/decimal.js'
import { applyRate, type Rate } from '../money/rate.js'
import { buildSchedule, closeRow, type Installment, type Schedule } from './schedule.js'

export interface LoanInput {
  readonly principal: Cents
  readonly monthlyRate: Rate
  readonly termMonths: number
}

export function assertTerm(termMonths: number): void {
  if (!Number.isSafeInteger(termMonths) || termMonths < 1) {
    throw new RangeError(`Prazo precisa ser inteiro positivo, recebido ${termMonths}`)
  }
}

/**
 * Parcela fixa da tabela Price.
 *
 * Com taxa zero a formula dividiria por zero, entao o caso e tratado como caso:
 * a parcela vira o principal dividido pelo prazo, truncado, e a ultima parcela
 * do cronograma absorve o residuo.
 */
export function pricePayment(principal: Cents, monthlyRate: Rate, termMonths: number): Cents {
  assertTerm(termMonths)
  if (monthlyRate === 0) {
    return cents(Math.trunc(principal / termMonths))
  }
  return cents(roundHalfUp((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths)))
}

export function price(input: LoanInput): Schedule {
  const { principal, monthlyRate, termMonths } = input
  assertTerm(termMonths)

  const fixed = pricePayment(principal, monthlyRate, termMonths)
  const rows: Installment[] = []
  let balance = principal

  for (let period = 1; period <= termMonths; period += 1) {
    const interest = applyRate(balance, monthlyRate)
    const isLast = period === termMonths
    // Na ultima linha a conta e invertida: a amortizacao e o saldo em aberto,
    // e o pagamento e o que decorre dela. E isso que garante o zero exato.
    const amortization = isLast ? balance : sub(fixed, interest)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(balance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'loan',
      openingBalance: balance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return buildSchedule(rows, principal, { requireSettled: true, neverSettles: false })
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/amortization/price.ts packages/domain/tests/amortization/price.test.ts
git commit -m "feat(domain): tabela Price com taxa zero tratada como caso"
```

---

### Tarefa 5: SAC

**Arquivos:**

- Criar: `packages/domain/src/amortization/sac.ts`
- Criar: `packages/domain/tests/amortization/sac.test.ts`

**Interfaces consumidas:** `LoanInput`, `assertTerm` de `amortization/price.js`;
`distributeOverInstallments` de `money/decimal.js`

**Interfaces produzidas:** `function sac(input: LoanInput): Schedule`

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { sac } from '../../src/amortization/sac.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

describe('sac', () => {
  it('quita exatamente', () => {
    const s = sac({ principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 })
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
  })

  it('mantem a amortizacao constante, exceto a ultima com o residuo', () => {
    const s = sac({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 3 })
    expect(s.installments.map((i) => i.amortization)).toEqual([333333, 333333, 333334])
  })

  it('tem parcela decrescente', () => {
    const s = sac({ principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 })
    const pagamentos = s.installments.map((i) => i.payment)
    for (let i = 1; i < pagamentos.length; i += 1) {
      expect(pagamentos[i]!).toBeLessThan(pagamentos[i - 1]!)
    }
  })

  it('paga menos juros que a Price no mesmo cenario', async () => {
    const { price } = await import('../../src/amortization/price.js')
    const entrada = { principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 } as const
    expect(sac(entrada).totalInterest).toBeLessThan(price(entrada).totalInterest)
  })

  it('taxa zero e parcela constante igual a amortizacao', () => {
    const s = sac({ principal: cents(900000), monthlyRate: rate(0), termMonths: 3 })
    expect(s.installments.map((i) => i.payment)).toEqual([300000, 300000, 300000])
    expect(s.totalInterest).toBe(0)
  })

  it('prazo de um mes', () => {
    const s = sac({ principal: cents(100000), monthlyRate: rate(0.02), termMonths: 1 })
    expect(s.installments).toHaveLength(1)
    expect(s.totalPaid).toBe(102000)
  })

  it('recusa prazo zero', () => {
    expect(() => sac({ principal: cents(1000), monthlyRate: rate(0.01), termMonths: 0 })).toThrow(
      RangeError,
    )
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { add, distributeOverInstallments, ZERO } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'
import { assertTerm, type LoanInput } from './price.js'
import { buildSchedule, closeRow, type Installment, type Schedule } from './schedule.js'

export function sac(input: LoanInput): Schedule {
  const { principal, monthlyRate, termMonths } = input
  assertTerm(termMonths)

  // O residuo ja sai na ultima amortizacao, entao o saldo fecha em zero sozinho.
  const plan = distributeOverInstallments(principal, termMonths)
  const rows: Installment[] = []
  let balance = principal

  for (const [index, amortization] of plan.entries()) {
    const interest = applyRate(balance, monthlyRate)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(balance, interest, ZERO, payment)

    rows.push({
      period: index + 1,
      stage: 'loan',
      openingBalance: balance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return buildSchedule(rows, principal, { requireSettled: true, neverSettles: false })
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/amortization/sac.ts packages/domain/tests/amortization/sac.test.ts
git commit -m "feat(domain): tabela SAC com amortizacao constante"
```

---

### Tarefa 6: parâmetros de cartão e pagamento

**Arquivos:**

- Criar: `packages/domain/src/credit-card/params.ts`
- Criar: `packages/domain/src/credit-card/minimum-payment.ts`
- Criar: `packages/domain/tests/credit-card/minimum-payment.test.ts`

**Interfaces produzidas:**

```ts
interface IofParams {
  readonly fixed: Rate
  readonly daily: Rate
  readonly dailyCapDays: number
}
interface CardParams {
  readonly revolvingCycleLimit: number
  readonly minimumFraction: Rate
  readonly iof: IofParams | null
  readonly totalChargeCap: Rate | null
}
type PaymentPolicy =
  | { readonly kind: 'minimum' }
  | { readonly kind: 'fixed'; readonly amount: Cents }
  | { readonly kind: 'full' }
interface CardInput {
  readonly invoice: Cents
  readonly revolvingRate: Rate
  readonly installmentRate: Rate
  /** Zero quer dizer que nao ha parcelamento depois do rotativo. */
  readonly installmentTermMonths: number
  readonly policy: PaymentPolicy
  readonly params: CardParams
}
interface ParamProvenance {
  readonly field: keyof CardParams
  readonly authority: string
  readonly source: string
  readonly effectiveFrom: string
  readonly kind: 'regulation' | 'market-practice'
}
function resolvePayment(invoice: Cents, policy: PaymentPolicy, minimumFraction: Rate): Cents
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { resolvePayment } from '../../src/credit-card/minimum-payment.js'
import { cents, ZERO } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const quinzePorCento = rate(0.15)

describe('resolvePayment', () => {
  it('paga a fatura inteira na politica full', () => {
    expect(resolvePayment(cents(100000), { kind: 'full' }, quinzePorCento)).toBe(100000)
  })

  it('paga a fracao minima', () => {
    expect(resolvePayment(cents(100000), { kind: 'minimum' }, quinzePorCento)).toBe(15000)
  })

  it('nunca paga mais que a fatura na politica fixa', () => {
    expect(
      resolvePayment(cents(1000), { kind: 'fixed', amount: cents(50000) }, quinzePorCento),
    ).toBe(1000)
  })

  it('fatura de um centavo quita, em vez de gerar tabela infinita', () => {
    expect(resolvePayment(cents(1), { kind: 'minimum' }, quinzePorCento)).toBe(1)
  })

  it('fatura zerada nao gera pagamento', () => {
    expect(resolvePayment(ZERO, { kind: 'minimum' }, quinzePorCento)).toBe(0)
  })

  it('fracao minima zero faz o minimo virar a fatura inteira', () => {
    expect(resolvePayment(cents(100000), { kind: 'minimum' }, rate(0))).toBe(100000)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar `params.ts`**

```ts
import { type Cents } from '../money/decimal.js'
import { type Rate } from '../money/rate.js'

export interface IofParams {
  readonly fixed: Rate
  readonly daily: Rate
  /** A parcela diaria para de correr depois deste numero de dias. */
  readonly dailyCapDays: number
}

export interface CardParams {
  /** Quantos ciclos o saldo pode ficar no rotativo antes de virar parcelamento. */
  readonly revolvingCycleLimit: number
  /** Fracao da fatura cobrada no pagamento minimo. */
  readonly minimumFraction: Rate
  readonly iof: IofParams | null
  /** Teto de encargos sobre o valor original, somando os dois estagios. */
  readonly totalChargeCap: Rate | null
}

export type PaymentPolicy =
  | { readonly kind: 'minimum' }
  | { readonly kind: 'fixed'; readonly amount: Cents }
  | { readonly kind: 'full' }

export interface CardInput {
  readonly invoice: Cents
  readonly revolvingRate: Rate
  readonly installmentRate: Rate
  /**
   * Prazo do parcelamento obrigatorio depois do rotativo.
   * Zero quer dizer que nao ha parcelamento e o rotativo segue sozinho ate o
   * limite de ciclos. So um motor sem a regra brasileira usa zero.
   */
  readonly installmentTermMonths: number
  readonly policy: PaymentPolicy
  readonly params: CardParams
}

/**
 * De onde veio cada parametro de um preset.
 *
 * `kind` separa o que e norma do que e pratica de mercado. Um preset que
 * apresenta pratica como regulacao e pior do que nao ter preset.
 */
export interface ParamProvenance {
  readonly field: keyof CardParams
  readonly authority: string
  readonly source: string
  readonly effectiveFrom: string
  readonly kind: 'regulation' | 'market-practice'
}
```

- [ ] **Passo 4: implementar `minimum-payment.ts`**

```ts
import { smallest, ZERO, type Cents } from '../money/decimal.js'
import { applyRate, type Rate } from '../money/rate.js'
import { type PaymentPolicy } from './params.js'

export function resolvePayment(
  invoice: Cents,
  policy: PaymentPolicy,
  minimumFraction: Rate,
): Cents {
  if (invoice <= ZERO) {
    return ZERO
  }
  switch (policy.kind) {
    case 'full':
      return invoice
    case 'fixed':
      return smallest(invoice, policy.amount)
    case 'minimum': {
      const minimum = applyRate(invoice, minimumFraction)
      // Minimo que arredonda para zero quitaria nunca. Quita agora.
      return minimum <= ZERO ? invoice : smallest(invoice, minimum)
    }
  }
}
```

- [ ] **Passo 5: rodar e ver passar**

- [ ] **Passo 6: commitar**

```bash
git add packages/domain/src/credit-card/params.ts packages/domain/src/credit-card/minimum-payment.ts packages/domain/tests/credit-card/minimum-payment.test.ts
git commit -m "feat(domain): parametros de cartao e resolucao de politica de pagamento"
```

---

### Tarefa 7: o rotativo, estágio 1

**Arquivos:**

- Criar: `packages/domain/src/credit-card/revolving.ts`
- Criar: `packages/domain/tests/credit-card/revolving.test.ts`

**Interfaces produzidas:**

```ts
interface StageResult {
  readonly rows: readonly Installment[]
  readonly balance: Cents
  readonly chargesUsed: Cents
  readonly capReachedAtPeriod: number | null
  /** Nenhuma linha amortizou nada: o saldo so cresceu. */
  readonly grewEveryCycle: boolean
  readonly iofDaysUsed: number
}
interface RevolvingInput {
  readonly invoice: Cents
  readonly monthlyRate: Rate
  readonly policy: PaymentPolicy
  readonly params: CardParams
  readonly startPeriod: number
  readonly chargeAllowance: Cents | null
}
function revolvingStage(input: RevolvingInput): StageResult
```

`chargeAllowance` é quanto ainda cabe de encargo antes do teto. `null` quer
dizer sem teto. O estágio devolve `chargesUsed` para que o estágio seguinte
continue contando de onde este parou, porque a Lei 14.690 conta os dois somados.

**O estágio relata fato, não decide.** Ele devolve `grewEveryCycle`, que é uma
observação sobre as linhas que produziu. Quem decide se a dívida nunca quita é
o orquestrador da Tarefa 8, porque só ele sabe se existe um estágio de
parcelamento depois. Com o limite brasileiro de um ciclo, um mês em que o
mínimo não cobre os encargos não significa dívida eterna: significa que o saldo
que entra no parcelamento é maior que a fatura original.

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { revolvingStage } from '../../src/credit-card/revolving.js'
import { type CardParams } from '../../src/credit-card/params.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const semIof: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: null,
  totalChargeCap: null,
}

describe('revolvingStage', () => {
  it('cobra juros e aplica o pagamento minimo em um ciclo', () => {
    // fatura 100000, juros 15% no ciclo = 15000, fatura do mes 115000,
    // minimo 15% de 115000 = 17250, saldo 97750
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.interest).toBe(15000)
    expect(r.rows[0]?.payment).toBe(17250)
    expect(r.balance).toBe(97750)
    expect(r.chargesUsed).toBe(15000)
  })

  it('marca a linha como rotativo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.1),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows[0]?.stage).toBe('revolving')
  })

  it('quita no proprio ciclo quando a politica e pagar tudo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'full' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.balance).toBe(0)
    expect(r.grewEveryCycle).toBe(false)
  })

  it('cobra IOF fixo mais diario de trinta dias', () => {
    // 0.38% + 0.0082% * 30 dias = 0.626% de 100000 = 626
    const comIof: CardParams = {
      ...semIof,
      iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
    }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0),
      policy: { kind: 'fixed', amount: cents(0) },
      params: comIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows[0]?.fees).toBe(626)
    expect(r.iofDaysUsed).toBe(30)
  })

  it('corta o encargo no teto restante, sem zera-lo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'fixed', amount: cents(0) },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: cents(4000),
    })
    expect(r.rows[0]?.interest).toBe(4000)
    expect(r.capReachedAtPeriod).toBe(1)
    expect(r.chargesUsed).toBe(4000)
  })

  it('com limite de ciclos maior que um, relata que o saldo so cresceu', () => {
    // juros de 20% ao mes contra minimo de 15%: a divida so cresce
    const generico: CardParams = { ...semIof, revolvingCycleLimit: 24 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.2),
      policy: { kind: 'minimum' },
      params: generico,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(24)
    expect(r.grewEveryCycle).toBe(true)
    expect(r.balance).toBeGreaterThan(100000)
    expect(r.rows.every((linha) => linha.amortization < 0)).toBe(true)
  })

  it('um unico ciclo em que o minimo nao cobre os encargos ainda amortiza negativo, sem julgar a divida', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.2),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(1)
    expect(r.grewEveryCycle).toBe(true)
    expect(r.balance).toBeGreaterThan(100000)
  })

  it('numera os periodos a partir de startPeriod', () => {
    const generico: CardParams = { ...semIof, revolvingCycleLimit: 3 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.05),
      policy: { kind: 'minimum' },
      params: generico,
      startPeriod: 7,
      chargeAllowance: null,
    })
    expect(r.rows.map((linha) => linha.period)).toEqual([7, 8, 9])
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { add, cents, smallest, sub, ZERO, type Cents } from '../money/decimal.js'
import { applyRate, rate, type Rate } from '../money/rate.js'
import { closeRow, type Installment } from '../amortization/schedule.js'
import { resolvePayment } from './minimum-payment.js'
import { type CardParams, type IofParams, type PaymentPolicy } from './params.js'

/** Trinta dias por ciclo. O dominio nao tem calendario e nao vai ter. */
const DAYS_PER_CYCLE = 30

export interface StageResult {
  readonly rows: readonly Installment[]
  readonly balance: Cents
  readonly chargesUsed: Cents
  readonly capReachedAtPeriod: number | null
  /** Nenhuma linha amortizou nada. Observacao, nao veredito. */
  readonly grewEveryCycle: boolean
  readonly iofDaysUsed: number
}

export interface RevolvingInput {
  readonly invoice: Cents
  readonly monthlyRate: Rate
  readonly policy: PaymentPolicy
  readonly params: CardParams
  readonly startPeriod: number
  readonly chargeAllowance: Cents | null
}

function iofFor(balance: Cents, iof: IofParams | null, daysUsed: number): [Cents, number] {
  if (iof === null) {
    return [ZERO, daysUsed]
  }
  const daysLeft = Math.max(0, iof.dailyCapDays - daysUsed)
  const days = Math.min(DAYS_PER_CYCLE, daysLeft)
  const effective = rate(iof.fixed + iof.daily * days)
  return [applyRate(balance, effective), daysUsed + days]
}

export function revolvingStage(input: RevolvingInput): StageResult {
  const { invoice, monthlyRate, policy, params, startPeriod, chargeAllowance } = input

  const rows: Installment[] = []
  let balance = invoice
  let chargesUsed = ZERO
  let capReachedAtPeriod: number | null = null
  let iofDaysUsed = 0
  let grewEveryCycle = true

  for (let cycle = 0; cycle < params.revolvingCycleLimit; cycle += 1) {
    if (balance <= ZERO) {
      break
    }
    const period = startPeriod + cycle
    const openingBalance = balance

    const interestRaw = applyRate(openingBalance, monthlyRate)
    const [feesRaw, novosDias] = iofFor(openingBalance, params.iof, iofDaysUsed)
    iofDaysUsed = novosDias

    const desejado = add(interestRaw, feesRaw)
    const disponivel = chargeAllowance === null ? desejado : sub(chargeAllowance, chargesUsed)
    const cobrado = smallest(desejado, cents(Math.max(0, disponivel)))
    if (cobrado < desejado && capReachedAtPeriod === null) {
      capReachedAtPeriod = period
    }

    // O corte do teto atinge primeiro os juros, depois o IOF, para que a linha
    // continue somando exatamente o que foi cobrado.
    const interest = smallest(interestRaw, cobrado)
    const fees = sub(cobrado, interest)
    chargesUsed = add(chargesUsed, cobrado)

    const invoiceOfCycle = add(openingBalance, cobrado)
    const payment = resolvePayment(invoiceOfCycle, policy, params.minimumFraction)
    const closingBalance = closeRow(openingBalance, interest, fees, payment)
    const amortization = sub(sub(payment, interest), fees)

    if (amortization >= ZERO) {
      grewEveryCycle = false
    }

    rows.push({
      period,
      stage: 'revolving',
      openingBalance,
      interest,
      fees,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return {
    rows,
    balance,
    chargesUsed,
    capReachedAtPeriod,
    // Fato observado sobre as linhas. Quem transforma isso em "nunca quita" e o
    // orquestrador, porque so ele sabe se existe parcelamento depois.
    grewEveryCycle: rows.length > 0 && grewEveryCycle,
    iofDaysUsed,
  }
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/credit-card/revolving.ts packages/domain/tests/credit-card/revolving.test.ts
git commit -m "feat(domain): estagio de rotativo com teto de encargos e IOF parametrizados"
```

---

### Tarefa 8: a dívida de cartão em dois estágios

**Arquivos:**

- Criar: `packages/domain/src/credit-card/card-debt.ts`
- Criar: `packages/domain/tests/credit-card/card-debt.test.ts`

**Interfaces consumidas:** `revolvingStage`, `StageResult`; `pricePayment`;
`buildSchedule`, `closeRow`; `CardInput`

**Interfaces produzidas:**

```ts
interface CardOutcome {
  readonly schedule: Schedule
  readonly capReachedAtPeriod: number | null
  readonly revolvingEndedAtPeriod: number | null
}
function cardDebt(input: CardInput): CardOutcome
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { cardDebt } from '../../src/credit-card/card-debt.js'
import { type CardInput, type CardParams } from '../../src/credit-card/params.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const brasilLike: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: null,
  totalChargeCap: rate(1),
}

const entrada = (over: Partial<CardInput> = {}): CardInput => ({
  invoice: cents(100000),
  revolvingRate: rate(0.15),
  installmentRate: rate(0.08),
  installmentTermMonths: 12,
  policy: { kind: 'minimum' },
  params: brasilLike,
  ...over,
})

describe('cardDebt', () => {
  it('tem um ciclo de rotativo e depois parcelamento', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.installments[0]?.stage).toBe('revolving')
    expect(r.schedule.installments[1]?.stage).toBe('installment')
    expect(r.revolvingEndedAtPeriod).toBe(1)
    expect(r.schedule.installments).toHaveLength(13)
  })

  it('o saldo atravessa a fronteira dos estagios sem buraco', () => {
    const r = cardDebt(entrada())
    const rotativo = r.schedule.installments[0]!
    const primeiroParcelado = r.schedule.installments[1]!
    expect(primeiroParcelado.openingBalance).toBe(rotativo.closingBalance)
  })

  it('quita ao fim do parcelamento', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.settled).toBe(true)
    expect(r.schedule.finalBalance).toBe(0)
    expect(r.schedule.neverSettles).toBe(false)
  })

  it('nao cria estagio de parcelamento quando o rotativo ja quitou', () => {
    const r = cardDebt(entrada({ policy: { kind: 'full' } }))
    expect(r.schedule.installments).toHaveLength(1)
    expect(r.revolvingEndedAtPeriod).toBe(1)
    expect(r.schedule.settled).toBe(true)
  })

  it('o teto conta os dois estagios somados', () => {
    // juros altissimos nos dois estagios: os encargos batem no teto de 100%
    const r = cardDebt(
      entrada({ revolvingRate: rate(0.5), installmentRate: rate(0.5), installmentTermMonths: 24 }),
    )
    const encargos = r.schedule.totalInterest + r.schedule.totalFees
    expect(encargos).toBeLessThanOrEqual(r.schedule.principal)
    expect(r.capReachedAtPeriod).not.toBeNull()
  })

  it('o principal da tabela e a fatura original', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.principal).toBe(100000)
  })

  it('sem parcelamento e com o rotativo se estendendo, a divida nunca quita', () => {
    const generico: CardParams = {
      revolvingCycleLimit: 24,
      minimumFraction: rate(0.15),
      iof: null,
      totalChargeCap: null,
    }
    const r = cardDebt(
      entrada({ params: generico, revolvingRate: rate(0.2), installmentTermMonths: 0 }),
    )
    expect(r.schedule.neverSettles).toBe(true)
    expect(r.schedule.settled).toBe(false)
    expect(r.revolvingEndedAtPeriod).toBeNull()
  })

  it('um ciclo em que o minimo nao cobre os encargos ainda vai para o parcelamento e quita', () => {
    // Este e o teste que impede o defeito obvio: com o limite brasileiro de um
    // ciclo, saldo crescendo no rotativo nao e divida eterna, e sim um saldo
    // maior entrando no parcelamento obrigatorio.
    const r = cardDebt(entrada({ revolvingRate: rate(0.2) }))
    expect(r.schedule.neverSettles).toBe(false)
    expect(r.schedule.settled).toBe(true)
    expect(r.schedule.installments[0]?.amortization).toBeLessThan(0)
    expect(r.schedule.installments[1]?.stage).toBe('installment')
    expect(r.schedule.installments[1]?.openingBalance).toBeGreaterThan(100000)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { pricePayment } from '../amortization/price.js'
import {
  buildSchedule,
  closeRow,
  type Installment,
  type Schedule,
} from '../amortization/schedule.js'
import { add, cents, smallest, sub, ZERO } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'
import { type CardInput } from './params.js'
import { revolvingStage } from './revolving.js'

export interface CardOutcome {
  readonly schedule: Schedule
  readonly capReachedAtPeriod: number | null
  /** Em que periodo o rotativo terminou. Nulo quando ele nunca terminou. */
  readonly revolvingEndedAtPeriod: number | null
}

export function cardDebt(input: CardInput): CardOutcome {
  const { invoice, revolvingRate, installmentRate, installmentTermMonths, policy, params } = input

  const allowance =
    params.totalChargeCap === null ? null : applyRate(invoice, params.totalChargeCap)

  const stage1 = revolvingStage({
    invoice,
    monthlyRate: revolvingRate,
    policy,
    params,
    startPeriod: 1,
    chargeAllowance: allowance,
  })

  const rows: Installment[] = [...stage1.rows]
  let capReachedAtPeriod = stage1.capReachedAtPeriod
  const ultimoPeriodoDoRotativo = stage1.rows[stage1.rows.length - 1]?.period ?? null

  const rotativoQuitou = stage1.balance <= ZERO
  const temParcelamento = installmentTermMonths > 0

  // "Nunca quita" so e verdade quando nao ha parcelamento depois. Com o limite
  // brasileiro de um ciclo, saldo crescendo no rotativo nao e divida eterna: e
  // um saldo maior entrando no parcelamento obrigatorio.
  const neverSettles = !rotativoQuitou && !temParcelamento && stage1.grewEveryCycle

  if (rotativoQuitou || !temParcelamento) {
    return {
      schedule: buildSchedule(rows, invoice, { requireSettled: false, neverSettles }),
      capReachedAtPeriod,
      revolvingEndedAtPeriod: rotativoQuitou ? ultimoPeriodoDoRotativo : null,
    }
  }

  // Estagio 2: o saldo vira uma tabela Price, e o teto continua contando.
  let balance = stage1.balance
  let chargesUsed = stage1.chargesUsed
  const fixed = pricePayment(balance, installmentRate, installmentTermMonths)
  const startPeriod = (ultimoPeriodoDoRotativo ?? 0) + 1

  for (let k = 0; k < installmentTermMonths; k += 1) {
    if (balance <= ZERO) {
      break
    }
    const period = startPeriod + k
    const openingBalance = balance

    const desejado = applyRate(openingBalance, installmentRate)
    const disponivel = allowance === null ? desejado : sub(allowance, chargesUsed)
    const interest = smallest(desejado, cents(Math.max(0, disponivel)))
    if (interest < desejado && capReachedAtPeriod === null) {
      capReachedAtPeriod = period
    }
    chargesUsed = add(chargesUsed, interest)

    const isLast = k === installmentTermMonths - 1
    const candidata = sub(fixed, interest)
    const amortization = isLast || candidata >= openingBalance ? openingBalance : candidata
    const payment = add(amortization, interest)
    const closingBalance = closeRow(openingBalance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'installment',
      openingBalance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return {
    schedule: buildSchedule(rows, invoice, { requireSettled: true, neverSettles: false }),
    capReachedAtPeriod,
    revolvingEndedAtPeriod: ultimoPeriodoDoRotativo,
  }
}
```

**Sobre `installmentTermMonths: 0`.** Zero quer dizer "não há parcelamento
depois, o rotativo segue sozinho até o limite de ciclos". É assim que o motor
genérico exprime um país sem a regra brasileira, e é o único caminho em que
`neverSettles` pode ser verdadeiro. O preset brasileiro nunca usa zero.

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/credit-card/card-debt.ts packages/domain/tests/credit-card/card-debt.test.ts
git commit -m "feat(domain): divida de cartao em dois estagios com teto sobre os dois"
```

---

### Tarefa 9: o preset brasileiro

**Arquivos:**

- Criar: `packages/domain/src/credit-card/presets/brasil.ts`
- Criar: `packages/domain/tests/credit-card/presets/brasil.test.ts`

**Interfaces produzidas:**

```ts
const BRASIL: CardParams
const BRASIL_PROVENANCE: readonly ParamProvenance[]
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { BRASIL, BRASIL_PROVENANCE } from '../../../src/credit-card/presets/brasil.js'
import { type CardParams } from '../../../src/credit-card/params.js'

describe('preset brasileiro', () => {
  it('limita o rotativo a um ciclo, como manda a Resolucao CMN 4.549', () => {
    expect(BRASIL.revolvingCycleLimit).toBe(1)
  })

  it('limita os encargos a cem por cento do valor original', () => {
    expect(BRASIL.totalChargeCap).toBe(1)
  })

  it('carrega o IOF de pessoa fisica com o limite de 365 dias', () => {
    expect(BRASIL.iof).toEqual({ fixed: 0.0038, daily: 0.000082, dailyCapDays: 365 })
  })

  it('documenta a fonte de todo campo do preset', () => {
    const campos: readonly (keyof CardParams)[] = [
      'revolvingCycleLimit',
      'minimumFraction',
      'iof',
      'totalChargeCap',
    ]
    for (const campo of campos) {
      const entrada = BRASIL_PROVENANCE.find((p) => p.field === campo)
      expect(entrada, `campo ${campo} sem fonte declarada`).toBeDefined()
      expect(entrada?.authority.length).toBeGreaterThan(0)
      expect(entrada?.source).toMatch(/^https?:\/\//)
      expect(entrada?.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('marca o minimo de quinze por cento como pratica, nao como norma', () => {
    const minimo = BRASIL_PROVENANCE.find((p) => p.field === 'minimumFraction')
    expect(minimo?.kind).toBe('market-practice')
  })

  it('marca o teto e o limite de ciclos como norma', () => {
    for (const campo of ['totalChargeCap', 'revolvingCycleLimit'] as const) {
      expect(BRASIL_PROVENANCE.find((p) => p.field === campo)?.kind).toBe('regulation')
    }
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { rate } from '../../money/rate.js'
import { type CardParams, type ParamProvenance } from '../params.js'

/**
 * Parametros do cartao de credito no Brasil.
 *
 * Nenhum destes valores aparece dentro do calculo. Quando a regra mudar, muda
 * este arquivo, e nenhum teste de calculo e tocado.
 */
export const BRASIL: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
  totalChargeCap: rate(1),
}

export const BRASIL_PROVENANCE: readonly ParamProvenance[] = [
  {
    field: 'revolvingCycleLimit',
    authority: 'Resolucao CMN 4.549, de 26 de janeiro de 2017',
    source: 'https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50330/Res_4549_v1_O.pdf',
    effectiveFrom: '2017-04-03',
    kind: 'regulation',
  },
  {
    field: 'totalChargeCap',
    authority: 'Lei 14.690, de 2023, regulamentada pela Resolucao CMN 5.112',
    source: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14690.htm',
    effectiveFrom: '2024-01-03',
    kind: 'regulation',
  },
  {
    field: 'iof',
    authority: 'IOF de credito para pessoa fisica, 0,38% fixo mais 0,0082% ao dia',
    source: 'https://www.gov.br/receitafederal/pt-br',
    effectiveFrom: '2025-07-01',
    kind: 'regulation',
  },
  {
    field: 'minimumFraction',
    authority:
      'Pratica de mercado. O minimo de 15% veio da Circular BCB 3.512 de 2010 e nao e mais obrigatorio: hoje cada instituicao fixa o seu',
    source: 'https://www.bcb.gov.br/estabilidadefinanceira/buscanormas',
    effectiveFrom: '2017-04-03',
    kind: 'market-practice',
  },
]
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/credit-card/presets packages/domain/tests/credit-card/presets
git commit -m "feat(domain): preset brasileiro com a fonte de cada parametro"
```

---

### Tarefa 10: aporte mensal recorrente

**Arquivos:**

- Criar: `packages/domain/src/strategy/prepayment.ts`
- Criar: `packages/domain/tests/strategy/prepayment.test.ts`

**Interfaces produzidas:**

```ts
function prepayWithMonthlyExtra(loan: LoanInput, extra: Cents): Schedule
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { prepayWithMonthlyExtra } from '../../src/strategy/prepayment.js'
import { cents, ZERO } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const emprestimo = { principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 } as const

describe('prepayWithMonthlyExtra', () => {
  it('aporte zero devolve a mesma coisa que a tabela original', () => {
    const original = price(emprestimo)
    const com = prepayWithMonthlyExtra(emprestimo, ZERO)
    expect(com.termMonths).toBe(original.termMonths)
    expect(com.totalPaid).toBe(original.totalPaid)
  })

  it('encurta o prazo e reduz o total pago', () => {
    const original = price(emprestimo)
    const com = prepayWithMonthlyExtra(emprestimo, cents(20000))
    expect(com.termMonths).toBeLessThan(original.termMonths)
    expect(com.totalPaid).toBeLessThan(original.totalPaid)
    expect(com.settled).toBe(true)
  })

  it('aporte maior que o saldo devedor quita no primeiro mes', () => {
    const com = prepayWithMonthlyExtra(emprestimo, cents(5000000))
    expect(com.termMonths).toBe(1)
    expect(com.settled).toBe(true)
  })

  it('nunca gera periodo fantasma com saldo zero', () => {
    for (const extra of [1000, 5000, 12345, 99999]) {
      const com = prepayWithMonthlyExtra(emprestimo, cents(extra))
      expect(com.installments.every((linha) => linha.payment > 0)).toBe(true)
      expect(com.finalBalance).toBe(0)
    }
  })

  it('nunca paga menos que o principal', () => {
    const com = prepayWithMonthlyExtra(emprestimo, cents(30000))
    expect(com.totalPaid).toBeGreaterThanOrEqual(com.principal)
  })

  it('funciona com taxa zero', () => {
    const com = prepayWithMonthlyExtra(
      { principal: cents(1200000), monthlyRate: rate(0), termMonths: 12 },
      cents(100000),
    )
    expect(com.totalPaid).toBe(1200000)
    expect(com.termMonths).toBe(6)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { assertTerm, pricePayment, type LoanInput } from '../amortization/price.js'
import {
  buildSchedule,
  closeRow,
  type Installment,
  type Schedule,
} from '../amortization/schedule.js'
import { add, smallest, sub, ZERO, type Cents } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'

/**
 * Paga a parcela normal mais `extra` todo mes, com o excedente abatendo
 * principal. O prazo encurta e a parcela nao muda.
 */
export function prepayWithMonthlyExtra(loan: LoanInput, extra: Cents): Schedule {
  const { principal, monthlyRate, termMonths } = loan
  assertTerm(termMonths)

  const fixed = pricePayment(principal, monthlyRate, termMonths)
  const rows: Installment[] = []
  let balance = principal
  let period = 0

  while (balance > ZERO && period < termMonths) {
    period += 1
    const openingBalance = balance
    const interest = applyRate(openingBalance, monthlyRate)
    const isLast = period === termMonths

    const desejada = add(sub(fixed, interest), extra)
    const amortization = isLast ? openingBalance : smallest(desejada, openingBalance)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(openingBalance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'loan',
      openingBalance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return buildSchedule(rows, principal, { requireSettled: true, neverSettles: false })
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/strategy/prepayment.ts packages/domain/tests/strategy/prepayment.test.ts
git commit -m "feat(domain): aporte mensal recorrente reduzindo prazo"
```

---

### Tarefa 11: taxa de equilíbrio e comparação

**Arquivos:**

- Criar: `packages/domain/src/strategy/compare.ts`
- Criar: `packages/domain/tests/strategy/compare.test.ts`

**Interfaces produzidas:**

```ts
interface ScenarioSummary {
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly termMonths: number
  readonly savedVersusKeep: Cents
  readonly savedVersusKeepMonths: number
}
interface Comparison {
  readonly keep: ScenarioSummary
  readonly prepay: ScenarioSummary
  readonly portability: {
    readonly breakEvenMonthlyRate: Rate
    readonly atTargetRate: ScenarioSummary | null
  }
}
function portabilityBreakEven(loan: LoanInput, extra: Cents): Rate
function compare(loan: LoanInput, extra: Cents, targetRate: Rate | null): Comparison
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { compare, portabilityBreakEven } from '../../src/strategy/compare.js'
import { prepayWithMonthlyExtra } from '../../src/strategy/prepayment.js'
import { cents, ZERO } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const emprestimo = { principal: cents(1000000), monthlyRate: rate(0.02), termMonths: 24 } as const

describe('portabilityBreakEven', () => {
  it('com aporte zero, a taxa de equilibrio e a propria taxa atual', () => {
    expect(portabilityBreakEven(emprestimo, ZERO)).toBeCloseTo(0.02, 6)
  })

  it('fica entre zero e a taxa atual', () => {
    const r = portabilityBreakEven(emprestimo, cents(20000))
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(0.02)
  })

  it('portar na taxa de equilibrio paga praticamente o mesmo que antecipar', () => {
    const extra = cents(20000)
    const equilibrio = portabilityBreakEven(emprestimo, extra)
    const portado = price({ ...emprestimo, monthlyRate: equilibrio })
    const antecipado = prepayWithMonthlyExtra(emprestimo, extra)
    // um centavo por parcela e o maximo que o arredondamento pode separar
    expect(Math.abs(portado.totalPaid - antecipado.totalPaid)).toBeLessThanOrEqual(
      emprestimo.termMonths,
    )
  })

  it('aporte maior empurra a taxa de equilibrio para baixo', () => {
    const pequeno = portabilityBreakEven(emprestimo, cents(10000))
    const grande = portabilityBreakEven(emprestimo, cents(50000))
    expect(grande).toBeLessThan(pequeno)
  })
})

describe('compare', () => {
  it('manter nao economiza contra si mesmo', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.keep.savedVersusKeep).toBe(0)
    expect(c.keep.savedVersusKeepMonths).toBe(0)
  })

  it('antecipar economiza em dinheiro e em meses', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.prepay.savedVersusKeep).toBeGreaterThan(0)
    expect(c.prepay.savedVersusKeepMonths).toBeGreaterThan(0)
  })

  it('sem taxa de destino, portabilidade traz so o limiar', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.portability.atTargetRate).toBeNull()
    expect(c.portability.breakEvenMonthlyRate).toBeGreaterThan(0)
  })

  it('com taxa de destino melhor que o limiar, portar ganha de antecipar', () => {
    const extra = cents(20000)
    const limiar = portabilityBreakEven(emprestimo, extra)
    const melhor = rate(limiar * 0.5)
    const c = compare(emprestimo, extra, melhor)
    expect(c.portability.atTargetRate).not.toBeNull()
    expect(c.portability.atTargetRate!.savedVersusKeep).toBeGreaterThan(c.prepay.savedVersusKeep)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { price, type LoanInput } from '../amortization/price.js'
import { type Schedule } from '../amortization/schedule.js'
import { sub, type Cents } from '../money/decimal.js'
import { rate, type Rate } from '../money/rate.js'
import { prepayWithMonthlyExtra } from './prepayment.js'

export interface ScenarioSummary {
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly termMonths: number
  readonly savedVersusKeep: Cents
  readonly savedVersusKeepMonths: number
}

export interface Comparison {
  readonly keep: ScenarioSummary
  readonly prepay: ScenarioSummary
  readonly portability: {
    /** Abaixo desta taxa, portar ganha de pagar mais por mes. */
    readonly breakEvenMonthlyRate: Rate
    readonly atTargetRate: ScenarioSummary | null
  }
}

const BISSECTION_STEPS = 60

/**
 * A taxa de destino na qual portar economiza exatamente o mesmo que o aporte.
 *
 * A raiz sempre existe: com taxa zero o total pago e o proprio principal, e
 * nenhuma estrategia de pagamento fica abaixo do principal. Como o total pago
 * cresce monotonicamente com a taxa, a bissecao converge sempre.
 */
export function portabilityBreakEven(loan: LoanInput, extra: Cents): Rate {
  const alvo = prepayWithMonthlyExtra(loan, extra).totalPaid

  let baixo = 0
  let alto = loan.monthlyRate as number

  for (let i = 0; i < BISSECTION_STEPS; i += 1) {
    const meio = (baixo + alto) / 2
    const total = price({ ...loan, monthlyRate: rate(meio) }).totalPaid
    if (total < alvo) {
      baixo = meio
    } else {
      alto = meio
    }
  }

  return rate((baixo + alto) / 2)
}

function summarize(schedule: Schedule, keep: Schedule): ScenarioSummary {
  return {
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    termMonths: schedule.termMonths,
    savedVersusKeep: sub(keep.totalPaid, schedule.totalPaid),
    savedVersusKeepMonths: keep.termMonths - schedule.termMonths,
  }
}

export function compare(loan: LoanInput, extra: Cents, targetRate: Rate | null): Comparison {
  const keep = price(loan)
  const prepay = prepayWithMonthlyExtra(loan, extra)

  return {
    keep: summarize(keep, keep),
    prepay: summarize(prepay, keep),
    portability: {
      breakEvenMonthlyRate: portabilityBreakEven(loan, extra),
      atTargetRate:
        targetRate === null ? null : summarize(price({ ...loan, monthlyRate: targetRate }), keep),
    },
  }
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/strategy/compare.ts packages/domain/tests/strategy/compare.test.ts
git commit -m "feat(domain): taxa de equilibrio da portabilidade e comparacao de cenarios"
```

---

### Tarefa 12: o resumo para a IA

**Arquivos:**

- Criar: `packages/domain/src/summary/insight-input.ts`
- Criar: `packages/domain/tests/summary/insight-input.test.ts`

**Interfaces produzidas:**

```ts
interface Milestone {
  readonly fraction: 0.25 | 0.5 | 0.75
  readonly period: number
  readonly balance: Cents
}
interface InsightInput {
  readonly kind: 'loan' | 'card'
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly interestOverPrincipalPercent: number
  readonly termMonths: number
  readonly settled: boolean
  readonly neverSettles: boolean
  readonly capReachedAtPeriod: number | null
  readonly milestones: readonly Milestone[]
}
function summarizeForInsight(
  schedule: Schedule,
  kind: 'loan' | 'card',
  capReachedAtPeriod: number | null,
): InsightInput
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { cardDebt } from '../../src/credit-card/card-debt.js'
import { summarizeForInsight } from '../../src/summary/insight-input.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const emprestimo = price({ principal: cents(1000000), monthlyRate: rate(0.02), termMonths: 24 })

describe('summarizeForInsight', () => {
  it('traz os tres marcos em ordem crescente de periodo', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(r.milestones.map((m) => m.fraction)).toEqual([0.25, 0.5, 0.75])
    const periodos = r.milestones.map((m) => m.period)
    expect(periodos[0]!).toBeLessThan(periodos[1]!)
    expect(periodos[1]!).toBeLessThan(periodos[2]!)
  })

  it('calcula o percentual de juros sobre o principal com uma casa', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(r.interestOverPrincipalPercent).toBeCloseTo(
      Math.round((emprestimo.totalInterest / emprestimo.principal) * 1000) / 10,
      10,
    )
  })

  it('nunca carrega o array de parcelas', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(Object.keys(r)).not.toContain('installments')
    expect(JSON.stringify(r).length).toBeLessThan(1200)
  })

  it('cenario que nunca quita devolve marcos vazios', () => {
    const r = cardDebt({
      invoice: cents(100000),
      revolvingRate: rate(0.2),
      installmentRate: rate(0.08),
      installmentTermMonths: 12,
      policy: { kind: 'minimum' },
      params: {
        revolvingCycleLimit: 24,
        minimumFraction: rate(0.15),
        iof: null,
        totalChargeCap: null,
      },
    })
    const resumo = summarizeForInsight(r.schedule, 'card', r.capReachedAtPeriod)
    expect(resumo.milestones).toEqual([])
    expect(resumo.neverSettles).toBe(true)
    expect(resumo.settled).toBe(false)
  })

  it('carrega o periodo em que o teto mordeu', () => {
    const resumo = summarizeForInsight(emprestimo, 'loan', 7)
    expect(resumo.capReachedAtPeriod).toBe(7)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

- [ ] **Passo 3: implementar**

```ts
import { type Schedule } from '../amortization/schedule.js'
import { add, ZERO, type Cents } from '../money/decimal.js'

const FRACTIONS = [0.25, 0.5, 0.75] as const

export type MilestoneFraction = (typeof FRACTIONS)[number]

export interface Milestone {
  readonly fraction: MilestoneFraction
  readonly period: number
  readonly balance: Cents
}

/**
 * Tudo o que o modelo da Fase 6 enxerga de uma simulacao.
 *
 * O array de parcelas nunca entra aqui. A estrutura tem tamanho fixo e no
 * maximo tres marcos, entao o teto de 800 tokens da secao 6 do AGENTS.md e
 * garantido por construcao, e nao por contagem.
 */
export interface InsightInput {
  readonly kind: 'loan' | 'card'
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly interestOverPrincipalPercent: number
  readonly termMonths: number
  readonly settled: boolean
  readonly neverSettles: boolean
  readonly capReachedAtPeriod: number | null
  readonly milestones: readonly Milestone[]
}

export function summarizeForInsight(
  schedule: Schedule,
  kind: 'loan' | 'card',
  capReachedAtPeriod: number | null,
): InsightInput {
  const milestones: Milestone[] = []

  // Marco de amortizacao que nao aconteceu nao existe.
  if (schedule.settled) {
    let acumulado = ZERO
    let indiceFracao = 0
    for (const row of schedule.installments) {
      acumulado = add(acumulado, row.amortization)
      while (
        indiceFracao < FRACTIONS.length &&
        acumulado >= schedule.principal * FRACTIONS[indiceFracao]!
      ) {
        milestones.push({
          fraction: FRACTIONS[indiceFracao]!,
          period: row.period,
          balance: row.closingBalance,
        })
        indiceFracao += 1
      }
    }
  }

  const percent =
    schedule.principal === ZERO
      ? 0
      : Math.round((schedule.totalInterest / schedule.principal) * 1000) / 10

  return {
    kind,
    principal: schedule.principal,
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    totalFees: schedule.totalFees,
    interestOverPrincipalPercent: percent,
    termMonths: schedule.termMonths,
    settled: schedule.settled,
    neverSettles: schedule.neverSettles,
    capReachedAtPeriod,
    milestones,
  }
}
```

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: commitar**

```bash
git add packages/domain/src/summary packages/domain/tests/summary
git commit -m "feat(domain): resumo estruturado que a IA consome no lugar da tabela"
```

---

### Tarefa 13: superfície pública, ADRs e fechamento

**Arquivos:**

- Modificar: `packages/domain/src/index.ts`
- Remover: `packages/domain/tests/toolchain.test.ts`
- Criar: `docs/adr/0006-dinheiro-em-centavos-de-marca.md`,
  `0007-comparacao-nominal.md`, `0008-regulacao-em-preset.md`,
  `0009-cartao-em-dois-estagios.md`, `0010-residuo-na-ultima-parcela.md`
- Modificar: `docs/adr/README.md`

**Interfaces consumidas:** tudo o que as tarefas 1 a 12 produziram

- [ ] **Passo 1: escrever o teste de superfície que falha**

Criar `packages/domain/tests/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import * as domain from '../src/index.js'

describe('superficie publica', () => {
  it('exporta tudo o que os consumidores precisam', () => {
    const esperado = [
      'cents',
      'ZERO',
      'add',
      'sub',
      'distributeOverInstallments',
      'rate',
      'fromPercent',
      'toAnnual',
      'fromAnnual',
      'applyRate',
      'buildSchedule',
      'price',
      'pricePayment',
      'sac',
      'resolvePayment',
      'revolvingStage',
      'cardDebt',
      'BRASIL',
      'BRASIL_PROVENANCE',
      'prepayWithMonthlyExtra',
      'portabilityBreakEven',
      'compare',
      'summarizeForInsight',
    ]
    for (const nome of esperado) {
      expect(Object.keys(domain), `falta exportar ${nome}`).toContain(nome)
    }
  })

  it('nao exporta mais o marcador da Fase 0', () => {
    expect(Object.keys(domain)).not.toContain('DOMAIN_READY')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Esperado: falha porque `index.ts` ainda só exporta `DOMAIN_READY`

- [ ] **Passo 3: escrever o `index.ts`**

```ts
export {
  ZERO,
  add,
  cents,
  distributeOverInstallments,
  roundHalfUp,
  smallest,
  sub,
  type Cents,
} from './money/decimal.js'

export {
  ZERO_RATE,
  applyRate,
  fromAnnual,
  fromPercent,
  rate,
  toAnnual,
  type Rate,
} from './money/rate.js'

export {
  buildSchedule,
  closeRow,
  type BuildOptions,
  type Installment,
  type Schedule,
  type Stage,
} from './amortization/schedule.js'

export { assertTerm, price, pricePayment, type LoanInput } from './amortization/price.js'
export { sac } from './amortization/sac.js'

export {
  type CardInput,
  type CardParams,
  type IofParams,
  type ParamProvenance,
  type PaymentPolicy,
} from './credit-card/params.js'
export { resolvePayment } from './credit-card/minimum-payment.js'
export { revolvingStage, type RevolvingInput, type StageResult } from './credit-card/revolving.js'
export { cardDebt, type CardOutcome } from './credit-card/card-debt.js'
export { BRASIL, BRASIL_PROVENANCE } from './credit-card/presets/brasil.js'

export { prepayWithMonthlyExtra } from './strategy/prepayment.js'
export {
  compare,
  portabilityBreakEven,
  type Comparison,
  type ScenarioSummary,
} from './strategy/compare.js'

export {
  summarizeForInsight,
  type InsightInput,
  type Milestone,
  type MilestoneFraction,
} from './summary/insight-input.js'
```

- [ ] **Passo 4: remover o teste de encanamento da Fase 0**

```bash
git rm packages/domain/tests/toolchain.test.ts
```

Ele existia para provar a ferramenta e cumpriu o papel. A superfície real
tomou o lugar.

- [ ] **Passo 5: escrever os cinco ADRs**

Cada um no formato de `docs/adr/README.md`: contexto, decisão, consequências,
alternativas descartadas. O conteúdo argumentativo já está na spec, nas seções
indicadas:

| ADR  | Assunto                                                                            | Seção da spec de onde vem o argumento |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| 0006 | `Cents` de marca, arredondamento meio para cima, marca preservada até a fronteira  | 4 e 10                                |
| 0007 | Comparação nominal, sem valor do dinheiro no tempo                                 | 9                                     |
| 0008 | Regulação em preset, com norma e data em cada campo                                | 8                                     |
| 0009 | Cartão em dois estágios por causa da Resolução CMN 4.549                           | 8 e 14                                |
| 0010 | Resíduo na última parcela, e por que o `allocate` de Fowler resolve outro problema | 4                                     |

Atualizar a tabela de índice de `docs/adr/README.md` com as cinco linhas.

- [ ] **Passo 6: rodar a verificação completa**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Esperado: quatro verdes, com a cobertura de `@fluxo/domain` acima de 90% em
linhas, ramos, funções e enunciados. Se a cobertura ficar abaixo, o caminho é
achar o ramo não exercitado e escrever o teste que faltou, nunca baixar o
limite.

- [ ] **Passo 7: commitar e empurrar**

```bash
git add -A
git commit -m "feat(domain): superficie publica do dominio e ADRs da Fase 1"
git push
```

- [ ] **Passo 8: conferir o CI verde**

```bash
gh run watch "$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status --compact
```

---

## Verificação final da fase

Antes de declarar a Fase 1 pronta, conferir uma a uma:

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, com saída real colada
- [ ] Cobertura acima de 90% nas quatro métricas, com o número colado
- [ ] `packages/domain/package.json` continua sem campo `dependencies`
- [ ] Nenhum `any` e nenhum travessão no pacote
- [ ] Os doze casos de borda da seção 11 da spec têm teste nomeado
- [ ] Os cinco ADRs escritos e indexados
- [ ] CI verde no GitHub
