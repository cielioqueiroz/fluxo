# 0006. Dinheiro em `Cents` de marca, com arredondamento meio para cima

**Estado:** aceito
**Fase:** 1
**Data:** 2026-09-02

## Contexto

A seção 7 do `AGENTS.md` diz que ponto flutuante em cálculo monetário é bug. A
frase resolve o armazenamento e não resolve três perguntas que aparecem na
primeira hora de implementação: como impedir que um `number` cru entre onde se
espera dinheiro, em que direção arredondar, e o que fazer com a marca quando o
valor atravessa JSON.

## Decisão

`Cents` é um tipo de marca sobre `number`, com construtor que recusa o que não
for inteiro seguro. `Rate` é outro tipo de marca, e os dois não se somam.

O arredondamento é meio para cima, afastando do zero, e acontece em toda
fronteira monetária, nunca acumulado para o fim. `Math.round` sozinho não serve
porque arredonda para o infinito positivo, o que trataria `-0.5` e `0.5` de
formas diferentes. A implementação é explícita e tem teste que compara com o
comportamento nativo.

A marca é preservada até a fronteira de serialização, inclusive em
`InsightInput`, que é o objeto que atravessa JSON até o modelo.

**`number` e não `bigint`.** Inteiro seguro cobre noventa trilhões de reais em
centavos. O `bigint` cobraria serialização mais chata na fronteira HTTP da Fase
5 sem proteção adicional relevante.

## Consequências

- Um `number` cru não entra onde se espera dinheiro, e o compilador cobra isso
  em todos os quinze arquivos do pacote
- `InsightInput` mantém `Cents` mesmo atravessando JSON. A marca só existe em
  tempo de compilação, então `JSON.stringify` já entrega número puro sem custo.
  Degradar o tipo perderia verificação dentro do domínio sem ganhar nada
- A remarcação na entrada é responsabilidade da Fase 2, em `packages/contracts`,
  com Zod validando antes de marcar. Nunca por conversão silenciosa
- Toda operação monetária passa por uma função, o que é mais verboso que `a + b`
  e é o preço de o compilador conseguir reclamar

## Alternativas descartadas

**`number` cru com convenção de nome, tipo `valorEmCentavos`.** Descartado
porque convenção de nome não é verificada, e a Fase 1 tem sete arquivos
passando dinheiro entre si.

**`bigint`.** Descartado pelo custo de serialização sem ganho prático na faixa
de valores que este produto simula.

**`number` na saída de `summarizeForInsight`, com a marca terminando ali.** Era
o desenho original, e a justificativa estava errada: dizia que a marca não
sobrevive à serialização, quando na verdade ela é apagada em tempo de execução
de qualquer forma, e o custo de mantê-la é zero.

**Classe `Money` com métodos.** Descartada porque o domínio produz tabelas de
até 360 linhas com sete valores cada, e alocar objeto por centavo é caro sem
necessidade. O tipo de marca dá a mesma segurança com o custo de um `number`.
