# 0008. Regulação do cartão isolada em preset, com norma e data em cada campo

**Estado:** aceito
**Fase:** 1
**Data:** 2026-09-02

## Contexto

O cartão de crédito brasileiro tem quatro parâmetros que vêm de fora do
cálculo: quantos ciclos o rotativo pode durar, qual o teto de encargos, quanto
de IOF, e qual o percentual do pagamento mínimo.

Três deles vêm de norma. O quarto não: o mínimo de 15% veio da Circular BCB
3.512 de 2010 e **não é mais obrigatório**, cada instituição fixa o seu. Um
preset que apresentasse os quatro como se fossem lei estaria mentindo em um
deles, e a Fase 6 cita fonte pública, então a mentira sairia impressa.

## Decisão

`revolving.ts`, `card-debt.ts` e `minimum-payment.ts` não conhecem nenhuma
constante de lei. Recebem `CardParams` e não sabem de que país vieram.

`presets/brasil.ts` carrega os valores, e `BRASIL_PROVENANCE` carrega, para cada
campo, a autoridade, a URL, a data de vigência, e um campo `kind` que separa
`regulation` de `market-practice`. O mínimo de 15% entra marcado como prática.

A procedência é dado, não comentário. Um teste percorre as chaves de
`CardParams` e falha se algum campo estiver sem fonte, e outro falha se houver
fonte declarada para campo que não existe.

## Consequências

- Quando a regra mudar, muda o preset, e nenhum teste de cálculo é tocado
- A Fase 6 tem de onde tirar a citação sem inventá-la, o que é o que torna a
  regra 3 da seção 2 do `AGENTS.md` verificável para os números do cartão
- O motor fica exercitável fora do Brasil, e o teste com `revolvingCycleLimit`
  maior que um existe justamente para provar que ele não embutiu a regra local
- Custa um objeto de procedência que precisa ser mantido em sincronia com os
  parâmetros. O teste de completude é o que impede a sincronia de se perder

## Alternativas descartadas

**Constantes dentro do cálculo.** Menos indireção para ler, e dá data de
validade ao cálculo: quando a regulação mudar, a mudança atravessa as funções e
os testes. Também tornaria o pacote menos reaproveitável, o que enfraquece o
argumento de que o domínio é puro.

**Preset sem procedência, com as fontes só na documentação.** Descartado porque
documentação e código se separam, e porque a Fase 6 precisa da URL em tempo de
execução para citar.

**Um preset por ano de vigência.** Descartado por YAGNI. O produto simula o
presente, e o campo `effectiveFrom` já registra desde quando cada valor vale.
