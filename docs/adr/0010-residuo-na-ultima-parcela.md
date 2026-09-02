# 0010. Resíduo de divisão na última parcela

**Estado:** aceito
**Fase:** 1
**Data:** 2026-09-02

## Contexto

Dez mil centavos divididos em três parcelas dão 3333,33 cada. Como centavo não
se divide, uma das três precisa receber o centavo que sobra, e a escolha de qual
é uma decisão, não um detalhe.

O padrão Money de Martin Fowler resolve isso com `allocate`, que distribui o
resto **nas primeiras** partes, em rodízio. A justificativa é boa: quando um
valor é repartido entre partes, nenhuma delas pode ficar sistematicamente com o
troco a menos.

A seção 7 do `AGENTS.md`, por outro lado, pede explicitamente "arredondamento de
centavo na última parcela".

## Decisão

`distributeOverInstallments` põe o resíduo na última parcela, e a tabela Price
vai além: na última linha a conta é invertida, a amortização recebe o saldo em
aberto e o pagamento decorre dela. É isso que garante saldo final exatamente
zero sem depender de sorte de arredondamento.

O nome da função é longo de propósito. Ela não é um alocador genérico, e o nome
precisa impedir que alguém a use para repartir um valor entre sócios.

## Consequências

- O saldo final de toda tabela de empréstimo é exatamente zero, verificado como
  invariante em `buildSchedule` e não por teste pontual
- A última parcela pode diferir das outras em até `prazo - 1` centavos. Em 360
  meses, até três reais e cinquenta e nove centavos. É a mesma coisa que
  calculadoras de amortização fazem, e é visível na tabela
- Se o produto algum dia precisar repartir um valor entre partes, isso é uma
  função nova seguindo Fowler, e não um parâmetro nesta

## Alternativas descartadas

**`allocate` de Fowler, com rodízio nas primeiras partes.** Está certo para o
problema dele e errado para este. Repartir entre partes exige justiça entre as
partes. Amortização exige que o saldo feche em zero, e a convenção da indústria
é ajustar o pagamento final absorvendo o erro acumulado.

**Distribuir o resíduo ao longo do cronograma, um centavo por parcela.** Mantém
todas as parcelas dentro de um centavo umas das outras, o que fica mais bonito
na tabela. Descartado por contrariar a frase literal do `AGENTS.md` e por
complicar a invariante de fechamento sem ganho real: a diferença é de centavos
em um número que a interface arredonda para reais.

**Deixar o resíduo sobrar e o saldo final ficar em alguns centavos.** Descartado
porque `buildSchedule` recusaria a tabela, e com razão: uma dívida quitada tem
saldo zero, não saldo pequeno.
