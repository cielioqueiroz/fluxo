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

| Questão                    | Decisão                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Cartão de crédito          | Núcleo genérico parametrizado, com a regulação brasileira isolada em um preset        |
| Modelo da dívida de cartão | Dois estágios, um ciclo de rotativo e depois parcelamento, fiel à Resolução CMN 4.549 |
| Portabilidade              | O domínio devolve a taxa de equilíbrio, sem exigir campo novo no formulário           |
| Antecipação                | Aporte mensal recorrente, reduzindo prazo. Uma estratégia, não quatro                 |

## 3. Arquitetura

Todos os cálculos desembocam no mesmo tipo, `Schedule`. Comparação e resumo só
sabem ler `Schedule`. A consequência prática é que a regra do centavo e as
invariantes vivem em um construtor único, e não espalhadas por quatro arquivos.

```
money/decimal.ts   Cents, aritmetica, residuo por parcela, arredondamento
money/rate.ts      Rate, conversao mensal e anual

amortization/schedule.ts   Installment, Schedule, buildSchedule, invariantes
amortization/price.ts      parcela fixa
amortization/sac.ts        amortizacao constante

credit-card/params.ts          os tipos CardParams e PaymentPolicy
credit-card/presets/brasil.ts  os parametros regulados, isolados
credit-card/minimum-payment.ts resolve uma politica em um pagamento
credit-card/revolving.ts       o estagio 1, o rotativo
credit-card/card-debt.ts       orquestra os dois estagios e o teto

strategy/prepayment.ts   aporte mensal recorrente
strategy/compare.ts      manter, antecipar, portar
summary/insight-input.ts o resumo que a Fase 6 manda ao modelo

index.ts   superficie publica explicita
```

`params.ts`, `card-debt.ts` e `presets/` são acréscimos dentro de
`credit-card/`, que a árvore do `AGENTS.md` já prevê. Nenhum diretório novo
aparece em `src/`. O estágio de parcelamento não ganha arquivo próprio porque
ele é uma tabela Price, e `amortization/price.ts` já existe.

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

**Superfície.** `cents`, `add`, `sub`, `mulRate`,
`distributeOverInstallments`, `compare`, `isZero`, `abs`, `max`, `min`, `ZERO`.

**`distributeOverInstallments(total, partes)`** reparte um total em partes
iguais e coloca o resíduo na última.

```
distributeOverInstallments(10000, 3)  ->  [3333, 3333, 3334]
distributeOverInstallments(10000, 1)  ->  [10000]
distributeOverInstallments(0, 12)     ->  doze zeros
```

**O nome é longo de propósito, porque existe uma convenção oposta e ela está
certa para outro problema.** O `allocate` do padrão Money de Martin Fowler
distribui o resto nas primeiras partes, em rodízio, justamente para que nenhuma
parte fique sistematicamente com o troco. Isso resolve repartir um valor entre
partes, como sócios ou centros de custo.

Amortização não é repartir entre partes. A convenção da indústria é ajustar o
pagamento final para o saldo cair exatamente em zero, absorvendo o erro
acumulado, e é o que a seção 7 do `AGENTS.md` pede com todas as letras.

Se algum dia o produto precisar repartir um valor entre partes, isso é uma
função nova seguindo Fowler, e não um parâmetro nesta.

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
  readonly stage: 'loan' | 'revolving' | 'installment'
  readonly openingBalance: Cents
  readonly interest: Cents
  readonly fees: Cents // IOF e encargos. Zero em emprestimo
  readonly amortization: Cents // pode ser negativo no cartao
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
  readonly settled: boolean // quitou dentro do horizonte simulado
  readonly neverSettles: boolean // o pagamento nao cobre os encargos
  readonly termMonths: number
}
```

**`amortization` pode ser negativo, e isso não é defeito.** Quando o pagamento
não cobre juros mais encargos, o saldo cresce. Amortização negativa é o termo
contábil estabelecido para isso, e é exatamente o que a seção 4 da narrativa
existe para mostrar.

**`settled` e `neverSettles` são fatos diferentes e não podem virar um só.**
`settled: false` diz que a dívida não acabou dentro do horizonte simulado, o que
é uma limitação da simulação. `neverSettles` diz que o pagamento é
estruturalmente menor que os encargos, então a dívida não acaba nunca, e isso é
um fato sobre a dívida.

A distinção não é preciosismo. Nos Estados Unidos, o CARD Act obriga o emissor a
avisar em destaque quando o mínimo nunca quita a fatura. Um cenário que nunca
fecha merece tratamento visual próprio na seção 4, e o domínio precisa dizer
qual dos dois casos ocorreu para que a UI possa fazer isso.

**Invariantes, verificadas pelo construtor `buildSchedule`:**

1. Por linha: `closingBalance = openingBalance + interest + fees - payment`
2. Por linha: `amortization = payment - interest - fees`
3. Global: `soma(amortization) + finalBalance = principal`
4. Global: `totalPaid = soma(payment)`
5. Global: `totalInterest = soma(interest)` e `totalFees = soma(fees)`
6. Quando `settled`: `finalBalance = ZERO`
7. `settled` e `neverSettles` nunca são ambos verdadeiros

`price` e `sac` sempre produzem `settled: true`, `neverSettles: false` e
`finalBalance` zero, e o construtor recebe a exigência disso. O cartão não, e é
por isso que os dois campos existem no tipo em vez de serem presumidos.

## 7. Amortização

### Price

Parcela fixa. Com `i > 0`:

```
PMT = PV * i / (1 - (1 + i) ** -n)
```

Com `i = 0`, a fórmula divide por zero. O caso é tratado como caso, não como
exceção: `PMT` vira `distributeOverInstallments(PV, n)`, e a tabela sai sem
juros.

Construção período a período, com o pagamento arredondado uma vez e mantido
constante nos períodos 1 até n-1. No período n a linha é montada ao contrário:
`amortization` recebe o saldo em aberto e `payment` é a soma dela com os juros.
É isso que garante o saldo final exatamente zero sem depender de sorte de
arredondamento.

### SAC

Amortização constante vinda de `distributeOverInstallments(PV, n)`, juros sobre
o saldo, parcela decrescente. O resíduo já está na última amortização por
construção.

## 8. Cartão de crédito

### Núcleo genérico

A dívida de cartão tem dois estágios, e o tipo diz isso.

```ts
export interface CardParams {
  /** Quantos ciclos o saldo pode ficar no rotativo antes de virar parcelamento. */
  readonly revolvingCycleLimit: number
  /** Fracao da fatura cobrada no pagamento minimo. Nao e lei, e pratica. */
  readonly minimumFraction: Rate
  readonly iof: {
    readonly fixed: Rate
    readonly daily: Rate
    readonly dailyCapDays: number
  } | null
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
  readonly installmentTermMonths: number
  readonly policy: PaymentPolicy
  readonly params: CardParams
}
```

Nenhuma constante de lei aparece em `revolving.ts` ou em `minimum-payment.ts`.
O cálculo recebe os parâmetros e não sabe de que país vieram.
`revolvingCycleLimit` é o que torna a regra brasileira exprimível sem que o
motor a conheça: no Brasil ele vale 1, e um país sem essa restrição usaria o
horizonte inteiro.

### Preset brasileiro

`presets/brasil.ts` carrega os parâmetros vigentes, cada um com a norma que o
sustenta e a data de vigência como campos do próprio objeto, porque a Fase 6 vai
precisar citar fonte e não pode inventá-la.

| Parâmetro             | Valor    | Origem                                                                                                                                                                                         |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revolvingCycleLimit` | 1        | Resolução CMN 4.549 de 2017, o saldo só fica no rotativo até o vencimento da fatura seguinte                                                                                                   |
| `totalChargeCap`      | 1.0      | Lei 14.690 de 2023 e Resolução CMN 5.112, juros e encargos somados não passam de 100% do valor original, vigente desde 3 de janeiro de 2024                                                    |
| `iof.fixed`           | 0.0038   | IOF de crédito para pessoa física                                                                                                                                                              |
| `iof.daily`           | 0.000082 | Alíquota diária                                                                                                                                                                                |
| `iof.dailyCapDays`    | 365      | A parcela diária para de correr em 365 dias                                                                                                                                                    |
| `minimumFraction`     | 0.15     | **Não é lei.** O mínimo de 15% valeu por circular de 2010 e não é mais obrigatório. Hoje cada instituição fixa o seu. Entra como valor típico, marcado no preset como prática e não como norma |

O campo `minimumFraction` carrega essa distinção explicitamente, porque um
preset que apresenta prática de mercado como regulação é pior do que não ter
preset nenhum.

### Estágio 1, o rotativo

```
saldo = fatura
para cada ciclo ate revolvingCycleLimit:
  encargos = juros(saldo, revolvingRate) + iof(saldo)
  encargos = min(encargos, teto restante)
  fatura do mes = saldo + encargos
  pagamento = politica(fatura do mes)
  saldo = fatura do mes - pagamento
  se saldo <= 0: quitado, para
```

### Estágio 2, o parcelamento

O saldo que sobrar do último ciclo de rotativo entra em uma tabela Price com
`installmentRate` e `installmentTermMonths`, e o teto continua contando de onde
parou. As linhas dos dois estágios entram no mesmo `Schedule`, em sequência,
porque para o usuário é uma dívida só.

É o campo `stage` de cada `Installment` que permite à seção 4 desenhar o degrau
entre os dois, que é o momento em que o número muda de comportamento.
Empréstimos preenchem `stage` com `'loan'` em todas as linhas.

### As duas simplificações do IOF

O IOF mensal usa trinta dias, e o limite de 365 dias da parcela diária é contado
em meses de trinta dias. O domínio não tem calendário e não vai ter: uma função
que lê o relógio deixa de ser determinística, e o determinismo é o que sustenta
a regra 3 do `AGENTS.md`. Fica declarado aqui e repetido no aviso da UI.

### O teto

Encargo é juros mais IOF, acumulado desde o primeiro mês e **somando os dois
estágios**, porque é assim que a Lei 14.690 conta. O teto morde quando esse
acumulado alcança `totalChargeCap * faturaOriginal`. No mês em que morde, os
encargos são cortados no valor que falta para completar o teto, e não zerados. A
partir do mês seguinte o saldo só se move por pagamento.

```ts
export interface CardOutcome {
  readonly schedule: Schedule
  readonly capReachedAtPeriod: number | null
  readonly revolvingEndedAtPeriod: number | null
}
```

### Pagamento mínimo

`payment = min(fatura, arredonda(fatura * minimumFraction))`. Se o resultado for
zero com fatura maior que zero, o pagamento vira a fatura inteira, porque uma
dívida de um centavo não pode gerar tabela infinita.

**O mínimo que não cobre os juros não é erro.** É saída válida, com
`neverSettles: true` e amortização negativa nas linhas do estágio em que
acontece. Tem teste próprio.

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
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly termMonths: number
  readonly savedVersusKeep: Cents // zero no proprio manter
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
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly interestOverPrincipalPercent: number // uma casa decimal
  readonly termMonths: number
  readonly settled: boolean
  readonly neverSettles: boolean
  readonly capReachedAtPeriod: number | null
  readonly milestones: readonly {
    readonly fraction: 0.25 | 0.5 | 0.75
    readonly period: number
    readonly balance: Cents
  }[]
}
```

Marco é o primeiro período em que a amortização acumulada alcança a fração do
principal. Cenário não quitado devolve `milestones` vazio, porque marco de
amortização que não aconteceu não existe.

O teto de 800 tokens da seção 6 do `AGENTS.md` é garantido por construção: a
estrutura tem tamanho fixo e no máximo três marcos. O array de parcelas nunca
sai do domínio em direção ao modelo.

**Os campos monetários saem como `Cents`, e não como `number` cru.** A marca em
TypeScript existe só em tempo de compilação, então `JSON.stringify` já a ignora
e o que atravessa a rede já é um número puro, sem custo nenhum. Degradar o tipo
não compraria nada e perderia a verificação dentro do domínio.

O padrão estabelecido é este: marca artesanal nos tipos internos, e a fronteira
de serialização valida e remarca na entrada. Essa fronteira é a Fase 2,
`packages/contracts`, com Zod. É lá que um número que voltou de um JSON vira
`Cents` de novo, depois de ser validado, e não por conversão silenciosa.

## 11. Testes

Vitest, com o limite de 90% em linhas, ramos, funções e enunciados já ligado
desde a Fase 0.

**Invariantes, verificadas em toda tabela produzida:**

- Saldo final zero quando `settled`
- Soma das amortizações mais saldo final igual ao principal
- Total pago igual à soma dos pagamentos
- Nenhum valor monetário fracionário em lugar nenhum

**Casos de borda, um teste nomeado para cada:**

| Caso                                                                  | Onde                                         |
| --------------------------------------------------------------------- | -------------------------------------------- |
| Taxa zero                                                             | `price`, `sac`                               |
| Prazo de um mês                                                       | `price`, `sac`                               |
| Valor que não divide pelo prazo                                       | `distributeOverInstallments`, `price`, `sac` |
| Resíduo na última parcela                                             | `sac`                                        |
| Fatura quitada no próprio ciclo de rotativo, sem estágio 2            | `card-debt`                                  |
| Mínimo que não cobre os encargos, com `neverSettles`                  | `card-debt`                                  |
| Teto mordendo dentro do rotativo                                      | `card-debt`                                  |
| Teto mordendo já no parcelamento, contando os dois estágios           | `card-debt`                                  |
| Continuidade do saldo na fronteira entre os estágios                  | `card-debt`                                  |
| `revolvingCycleLimit` maior que 1, para provar que o motor é genérico | `card-debt`                                  |
| Fatura de um centavo                                                  | `minimum-payment`                            |
| Aporte zero                                                           | `prepayment`                                 |
| Aporte maior que o saldo devedor                                      | `prepayment`                                 |
| Aporte que quita no penúltimo mês                                     | `prepayment`                                 |
| Bisseção com aporte zero                                              | `portabilityBreakEven`                       |
| Cenário não quitado devolve marcos vazios                             | `summarize`                                  |
| O preset brasileiro carrega norma e data em todo campo regulado       | `presets/brasil`                             |

## 12. O que este pacote não faz

Não formata moeda, não conhece locale, não lê relógio nem calendário, não
persiste, não valida entrada de HTTP, e não sabe o que é Zod. A validação de
borda é da Fase 2, em `packages/contracts`. A formatação é da Fase 3, em
`apps/web/lib/format.ts`.

## 13. ADRs que saem desta fase

| #    | Assunto                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0006 | Dinheiro em `Cents` de marca sobre `number`, com arredondamento meio para cima, e a marca preservada até a fronteira de serialização |
| 0007 | Comparação nominal, sem valor do dinheiro no tempo                                                                                   |
| 0008 | Regulação do cartão isolada em preset, fora do cálculo, com norma e data em cada campo                                               |
| 0009 | Dívida de cartão em dois estágios, por causa da Resolução CMN 4.549                                                                  |
| 0010 | Resíduo de divisão na última parcela, e por que o `allocate` de Fowler resolve outro problema                                        |

## 14. Fontes das regras brasileiras

Toda regra que entra no preset tem fonte, e a fonte entra no código como campo,
não como comentário. A Fase 6 vai citar estes mesmos endereços.

| Regra                                | Fonte                                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Rotativo limitado a um ciclo         | Resolução CMN 4.549 de 26 de janeiro de 2017, `https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50330/Res_4549_v1_O.pdf` |
| Teto de 100% sobre juros e encargos  | Lei 14.690 de 2023 e Resolução CMN 5.112, em vigor desde 3 de janeiro de 2024                                                      |
| Mínimo de 15% não é mais obrigatório | Circular BCB 3.512 de 2010, revogada nesse ponto. Hoje cada instituição fixa o seu                                                 |
| IOF de crédito para pessoa física    | 0,38% fixo mais 0,0082% ao dia, com o diário limitado a 365 dias                                                                   |
