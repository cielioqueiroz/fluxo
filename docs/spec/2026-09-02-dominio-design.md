# Especificação de desenho, `packages/domain`

**Fase:** 1
**Data:** 2026-09-02
**Roadmap:** `docs/plan/2026-09-02-roadmap.md`
**Contrato:** `AGENTS.md`, seções 2, 3 e 7

---

## 1. O que este pacote é

O cálculo financeiro inteiro do Fluxo, em TypeScript puro. Sem framework, sem
rede, sem relógio, sem sistema de arquivos. Ele não importa nada, e por isso
`packages/domain/package.json` não declara nenhuma dependência.

Três consumidores usam exatamente estas funções: `apps/web` calcula no
navegador, `apps/api` expõe por HTTP e `packages/mcp-server` publica como tool.
Se um número aparece em qualquer lugar do produto, ele saiu daqui.

A regra 3 da seção 2 do `AGENTS.md` diz que a IA não inventa número. Esta spec é
o que torna essa regra verificável: o modelo recebe a saída de `summarize` e mais
nada.

## 2. Decisões de produto tomadas antes do desenho

| Questão           | Decisão                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| Cartão de crédito | Núcleo genérico parametrizado, com a regulação brasileira isolada em um preset |
| Portabilidade     | O domínio devolve a taxa de equilíbrio, sem exigir campo novo no formulário    |
| Antecipação       | Aporte mensal recorrente, reduzindo prazo. Uma estratégia, não quatro          |

## 3. Arquitetura

Todos os cálculos desembocam no mesmo tipo, `Schedule`. Comparação e resumo só
sabem ler `Schedule`. A consequência prática é que a regra do centavo e as
invariantes vivem em um construtor único, e não espalhadas por quatro arquivos.

```
money/decimal.ts   Cents, aritmetica, distribute, arredondamento
money/rate.ts      Rate, conversao mensal e anual

amortization/schedule.ts   Installment, Schedule, buildSchedule, invariantes
amortization/price.ts      parcela fixa
amortization/sac.ts        amortizacao constante

credit-card/params.ts          os tipos CardParams e PaymentPolicy
credit-card/presets/brasil.ts  os parametros regulados, isolados
credit-card/minimum-payment.ts resolve uma politica em um pagamento
credit-card/revolving.ts       o rotativo mes a mes

strategy/prepayment.ts   aporte mensal recorrente
strategy/compare.ts      manter, antecipar, portar
summary/insight-input.ts o resumo que a Fase 6 manda ao modelo

index.ts   superficie publica explicita
```

`params.ts` e `presets/` são acréscimos dentro de `credit-card/`, que a árvore do
`AGENTS.md` já prevê. Nenhum diretório novo aparece em `src/`.

## 4. Dinheiro

```ts
declare const brand: unique symbol
export type Cents = number & { readonly [brand]: 'Cents' }
```

Tipo de marca sobre `number`. Um `number` cru não entra onde se espera `Cents`,
e `Cents` não se soma a `Rate` por acidente. O construtor `cents(valor)` recusa
o que não for inteiro seguro.

**Por que `number` e não `bigint`.** Inteiro seguro em JavaScript cobre até
noventa trilhões de reais em centavos. O custo do `bigint` seria serialização
mais chata na fronteira HTTP da Fase 5 e nenhuma proteção adicional relevante.

**Arredondamento.** Meio para cima, afastando do zero, aplicado em toda
fronteira monetária e nunca acumulado para o fim. `Math.round` sozinho não serve
porque arredonda para o infinito positivo, o que trata valores negativos de
forma diferente dos positivos. A implementação é explícita:

```ts
const roundHalfUp = (x: number): number => Math.sign(x) * Math.round(Math.abs(x))
```

**Superfície.** `cents`, `add`, `sub`, `mulRate`, `distribute`, `compare`,
`isZero`, `abs`, `max`, `min`, `ZERO`.

**`distribute(total, partes)`** reparte um total em partes iguais e coloca o
resíduo na última. A escolha da última, e não da primeira, é literalmente a
frase "arredondamento de centavo na última parcela" da seção 7 do `AGENTS.md`.

```
distribute(10000, 3)  ->  [3333, 3333, 3334]
distribute(10000, 1)  ->  [10000]
distribute(0, 12)     ->  doze zeros
```

## 5. Taxa

```ts
export type Rate = number & { readonly [brand]: 'Rate' }
```

Fração decimal ao mês. `0.015` é um e meio por cento ao mês. Nunca percentual
inteiro, para que não exista a dúvida de fator cem em nenhuma chamada.

- `rate(fracao)` recusa negativo e recusa não finito. Zero é válido e tem teste
- `fromPercent(p)` divide por cem, para a fronteira com a UI
- `toAnnual(m)` aplica `(1 + m) ** 12 - 1`
- `fromAnnual(a)` aplica `(1 + a) ** (1 / 12) - 1`

Taxa não é dinheiro e não é arredondada para centavo. A precisão de ponto
flutuante fica aqui, contida, e só vira `Cents` depois de multiplicar por um
saldo e arredondar.

## 6. `Schedule`, o tipo do meio

```ts
export interface Installment {
  readonly period: number // 1-based
  readonly openingBalance: Cents
  readonly interest: Cents
  readonly fees: Cents // IOF e encargos. Zero em emprestimo
  readonly amortization: Cents // pode ser negativo no rotativo
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
  readonly settled: boolean // quitou dentro do horizonte
  readonly termMonths: number
}
```

**`amortization` pode ser negativo, e isso não é defeito.** No rotativo com
pagamento mínimo, quando o pagamento não cobre juros mais IOF, o saldo cresce. A
amortização negativa é a descrição correta do que aconteceu, e é exatamente o
que a seção 4 da narrativa existe para mostrar.

**Invariantes, verificadas pelo construtor `buildSchedule`:**

1. Por linha: `closingBalance = openingBalance + interest + fees - payment`
2. Por linha: `amortization = payment - interest - fees`
3. Global: `soma(amortization) + finalBalance = principal`
4. Global: `totalPaid = soma(payment)`
5. Global: `totalInterest = soma(interest)` e `totalFees = soma(fees)`
6. Quando `settled`: `finalBalance = ZERO`

`price` e `sac` sempre produzem `settled: true` e `finalBalance` zero, e o
construtor recebe a exigência disso. O rotativo não, e é por isso que
`settled` existe no tipo em vez de ser presumido.

## 7. Amortização

### Price

Parcela fixa. Com `i > 0`:

```
PMT = PV * i / (1 - (1 + i) ** -n)
```

Com `i = 0`, a fórmula divide por zero. O caso é tratado como caso, não como
exceção: `PMT` vira `distribute(PV, n)`, e a tabela sai sem juros.

Construção período a período, com o pagamento arredondado uma vez e mantido
constante nos períodos 1 até n-1. No período n a linha é montada ao contrário:
`amortization` recebe o saldo em aberto e `payment` é a soma dela com os juros.
É isso que garante o saldo final exatamente zero sem depender de sorte de
arredondamento.

### SAC

Amortização constante vinda de `distribute(PV, n)`, juros sobre o saldo, parcela
decrescente. O resíduo já está na última amortização por construção.

## 8. Cartão de crédito

### Núcleo genérico

```ts
export interface CardParams {
  readonly minimumFraction: Rate // fracao da fatura no pagamento minimo
  readonly iof: { readonly fixed: Rate; readonly daily: Rate } | null
  readonly totalChargeCap: Rate | null // teto de encargos sobre o valor original
}

export type PaymentPolicy =
  | { readonly kind: 'minimum' }
  | { readonly kind: 'fixed'; readonly amount: Cents }
  | { readonly kind: 'full' }
```

Nenhuma constante de lei aparece em `revolving.ts` ou em `minimum-payment.ts`.
O cálculo recebe os parâmetros e não sabe de que país vieram.

### Preset brasileiro

`presets/brasil.ts` carrega os parâmetros regulados vigentes: mínimo de 15% da
fatura, IOF de 0,38% fixo mais 0,0082% ao dia, e teto que limita os encargos
acumulados a 100% do valor original da dívida. Quando a regra mudar, muda o
preset, e nenhum teste de cálculo é tocado.

O preset carrega a data de vigência e a URL da norma como campos, porque a Fase
6 vai precisar citar fonte e não pode inventá-la.

### O rotativo, mês a mês

```
saldo inicial = fatura
para cada mes ate o horizonte:
  encargos = juros(saldo) + iof(saldo), limitados pelo teto restante
  fatura do mes = saldo + encargos
  pagamento = politica(fatura do mes)
  saldo = fatura do mes - pagamento
  se saldo <= 0: quitado, para
```

O IOF mensal usa trinta dias. É uma simplificação, declarada aqui e repetida no
aviso da UI, porque o domínio não tem calendário e não vai ter: uma função que
lê o relógio deixa de ser determinística, e o determinismo é o que sustenta a
regra 3 do `AGENTS.md`.

**O que o teto conta.** Encargo é juros mais IOF, acumulado desde o primeiro
mês. O teto morde quando esse acumulado alcança
`totalChargeCap * faturaOriginal`. No mês em que morde, os encargos são cortados
no valor que falta para completar o teto, e não zerados. A partir do mês
seguinte o saldo para de crescer por encargo, e só se move por pagamento. O
período em que isso acontece é devolvido.

```ts
export interface CardOutcome {
  readonly schedule: Schedule
  readonly capReachedAtPeriod: number | null
}
```

### Pagamento mínimo

`payment = min(fatura, arredonda(fatura * minimumFraction))`. Se o resultado for
zero com fatura maior que zero, o pagamento vira a fatura inteira, porque uma
dívida de um centavo não pode gerar tabela infinita.

**O mínimo que não cobre os juros não é erro.** É saída válida, com
`settled: false` e amortização negativa em todas as linhas. Tem teste próprio.

## 9. Estratégia

### Aporte mensal recorrente

`prepayWithMonthlyExtra(loan, extra)`. Toda parcela paga o valor normal mais
`extra`, e o excedente abate principal. O prazo encurta. O último período paga
o que restar, nunca mais.

Casos de borda com teste: `extra` zero devolve a tabela original, `extra` maior
que o saldo devedor quita no primeiro mês, e `extra` que quita exatamente no
penúltimo mês não gera período fantasma.

### Taxa de equilíbrio da portabilidade

`portabilityBreakEven(loan, extra): Rate` devolve a taxa mensal de destino na
qual portar economiza exatamente o mesmo que o aporte mensal.

Resolvida por bisseção no intervalo entre zero e a taxa atual. Válida porque o
total pago de uma tabela Price cresce monotonicamente com a taxa.

**A raiz sempre existe, e isso é demonstrável.** A taxa zero produz total pago
igual ao principal, e nenhuma estratégia de pagamento produz total abaixo do
principal. Logo o alvo está sempre dentro do intervalo, e a função devolve
sempre uma `Rate`, nunca nulo. Quarenta iterações levam o intervalo abaixo da
precisão do centavo.

### Comparação

Manter e antecipar são cenários. Portar não é, e o tipo precisa dizer isso.

```ts
export interface ScenarioSummary {
  readonly totalPaidCents: Cents
  readonly totalInterestCents: Cents
  readonly termMonths: number
  readonly savedVersusKeepCents: Cents   // zero no proprio manter
  readonly savedVersusKeepMonths: number
}

export interface Comparison {
  readonly keep: ScenarioSummary
  readonly prepay: ScenarioSummary
  readonly portability: {
    readonly breakEvenMonthlyRate: Rate
    readonly atTargetRate: ScenarioSummary | null
  }
}

compare(loan, extra, targetRate: Rate | null): Comparison
```

Na taxa de equilíbrio, portar economiza por definição o mesmo que antecipar, e
seria desonesto apresentá-la como um terceiro número de economia. O que ela é,
e o que a seção 5 vai mostrar, é um limiar: abaixo desta taxa, portar ganha de
pagar mais por mês. Acima, não ganha.

`targetRate` preenchido devolve `atTargetRate` com a economia concreta daquela
taxa. Nulo devolve só o limiar. É por isso que o formulário da seção 1 continua
com quatro campos.

A comparação é **nominal**: soma reais de hoje com reais de daqui a dez anos,
sem valor do dinheiro no tempo.

Isso é uma simplificação consciente. Introduzir taxa de desconto tornaria o
número mais correto e menos explicável, e esta é uma página educativa. Vira ADR
e vira aviso visível na UI, não nota de rodapé.

## 10. Resumo para a IA

```ts
export interface InsightInput {
  readonly kind: 'loan' | 'card'
  readonly principalCents: number
  readonly totalPaidCents: number
  readonly totalInterestCents: number
  readonly totalFeesCents: number
  readonly interestOverPrincipalPercent: number // uma casa decimal
  readonly termMonths: number
  readonly settled: boolean
  readonly capReachedAtPeriod: number | null
  readonly milestones: readonly {
    readonly fraction: 0.25 | 0.5 | 0.75
    readonly period: number
    readonly balanceCents: number
  }[]
}
```

Marco é o primeiro período em que a amortização acumulada alcança a fração do
principal. Cenário não quitado devolve `milestones` vazio, porque marco de
amortização que não aconteceu não existe.

O teto de 800 tokens da seção 6 do `AGENTS.md` é garantido por construção: a
estrutura tem tamanho fixo e no máximo três marcos. O array de parcelas nunca
sai do domínio em direção ao modelo.

Os campos saem como `number` e não como `Cents`, porque este objeto atravessa
JSON e a marca não sobrevive à serialização. A conversão é explícita e acontece
uma vez, aqui.

## 11. Testes

Vitest, com o limite de 90% em linhas, ramos, funções e enunciados já ligado
desde a Fase 0.

**Invariantes, verificadas em toda tabela produzida:**

- Saldo final zero quando `settled`
- Soma das amortizações mais saldo final igual ao principal
- Total pago igual à soma dos pagamentos
- Nenhum valor monetário fracionário em lugar nenhum

**Casos de borda, um teste nomeado para cada:**

| Caso                              | Onde                         |
| --------------------------------- | ---------------------------- |
| Taxa zero                         | `price`, `sac`               |
| Prazo de um mês                   | `price`, `sac`               |
| Valor que não divide pelo prazo   | `distribute`, `price`, `sac` |
| Resíduo na última parcela         | `sac`                        |
| Mínimo que não cobre os juros     | `revolving`                  |
| Teto do rotativo mordendo no meio | `revolving`                  |
| Fatura de um centavo              | `minimum-payment`            |
| Aporte zero                       | `prepayment`                 |
| Aporte maior que o saldo devedor  | `prepayment`                 |
| Aporte que quita no penúltimo mês | `prepayment`                 |
| Bisseção com aporte zero          | `portabilityBreakEven`       |
| Cenário não quitado               | `summarize`                  |

## 12. O que este pacote não faz

Não formata moeda, não conhece locale, não lê relógio nem calendário, não
persiste, não valida entrada de HTTP, e não sabe o que é Zod. A validação de
borda é da Fase 2, em `packages/contracts`. A formatação é da Fase 3, em
`apps/web/lib/format.ts`.

## 13. ADRs que saem desta fase

| #    | Assunto                                                                        |
| ---- | ------------------------------------------------------------------------------ |
| 0006 | Dinheiro em `Cents` de marca sobre `number`, com arredondamento meio para cima |
| 0007 | Comparação nominal, sem valor do dinheiro no tempo                             |
| 0008 | Regulação do cartão isolada em preset, fora do cálculo                         |
