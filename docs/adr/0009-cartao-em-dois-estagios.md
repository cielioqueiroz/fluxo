# 0009. Dívida de cartão em dois estágios

**Estado:** aceito
**Fase:** 1
**Data:** 2026-09-02

## Contexto

O desenho original simulava pagamento mínimo no rotativo por vários meses
seguidos, com o saldo crescendo. É o cenário que quase toda calculadora de
dívida mostra, e é a imagem que a seção 4 da narrativa queria produzir.

Ao verificar os números do preset brasileiro, apareceu um problema: **desde a
Resolução CMN 4.549 de 2017, o saldo só pode ficar no rotativo até o vencimento
da fatura seguinte.** Depois disso o banco é obrigado a converter em crédito
parcelado, em condições melhores que as do rotativo. A regra continua vigente.

Ou seja, o cenário que a página ia mostrar não é permitido no Brasil desde 2017,
enquanto a seção 6 da mesma página cita norma brasileira. É uma peça de
portfólio, e é exatamente o tipo de contradição que um leitor atento encontra.

## Decisão

A dívida de cartão tem dois estágios em uma tabela só:

1. **Rotativo**, limitado por `revolvingCycleLimit`, que vale 1 no preset
   brasileiro
2. **Parcelamento** do saldo que sobrar, como tabela Price com taxa e prazo
   próprios

O teto de encargos conta os dois estágios somados, porque é assim que a Lei
14.690 conta. Cada `Installment` carrega `stage`, o que permite à seção 4
desenhar o degrau entre os dois.

`installmentTermMonths: 0` quer dizer que não há parcelamento e o rotativo segue
sozinho até o limite de ciclos. É como o motor genérico exprime um país sem a
regra brasileira, e é o único caminho em que `neverSettles` pode ser verdadeiro.

**O estágio relata fato, o orquestrador decide.** `revolvingStage` devolve
`grewEveryCycle`, uma observação sobre as linhas que produziu. Quem transforma
isso em "a dívida nunca quita" é `cardDebt`.

## Consequências

- No Brasil, a dívida de cartão sempre quita, porque o parcelamento é uma tabela
  Price finita. `neverSettles` só aparece na configuração genérica
- A narrativa da seção 4 fica mais forte, não mais fraca: o degrau entre os
  estágios é onde o número muda de comportamento, e isso é mais interessante que
  uma curva monotonicamente crescente
- O formulário no ramo de cartão troca o campo prazo pela taxa de parcelamento.
  Continua com quatro campos
- Custa um orquestrador a mais e cinco casos de borda a mais nos testes: teto
  mordendo dentro de cada estágio, continuidade do saldo na fronteira, e o caso
  de um ciclo com mínimo insuficiente

## O defeito que este desenho evitou

A primeira versão deixava `revolvingStage` decidir `neverSettles` sozinho. Com
`revolvingCycleLimit` valendo 1, qualquer cenário em que o mínimo não cobrisse
os encargos naquele único mês seria classificado como dívida eterna, e o código
**pularia o parcelamento obrigatório**, que é justamente a regra que motivou
este ADR.

A auto-revisão do plano pegou isso antes de virar código. Existe um teste com
nome explícito para o caso: `um ciclo com minimo insuficiente ainda vai para o
parcelamento e quita`.

## Alternativas descartadas

**Manter N meses de mínimo, rotulado como cenário ilustrativo.** Mais simples e
visualmente mais dramático. Descartado porque a página mostraria um número que a
lei brasileira não permite enquanto cita norma brasileira ao lado.

**Derivar a taxa de parcelamento da taxa do rotativo por um fator típico.** Não
mexeria no formulário. Descartado porque o domínio passaria a carregar uma
constante de mercado que ninguém escolheu, e fazer o domínio inventar número é
pior do que fazer a IA inventar.
