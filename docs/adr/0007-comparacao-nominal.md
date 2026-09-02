# 0007. Comparação nominal, sem valor do dinheiro no tempo

**Estado:** aceito
**Fase:** 1
**Data:** 2026-09-02

## Contexto

A seção 5 da narrativa compara manter, antecipar e portar, e destaca a diferença
em valor absoluto e em meses. Somar reais de hoje com reais de daqui a dez anos
como se fossem a mesma coisa é incorreto do ponto de vista financeiro: mil reais
pagos no mês 120 valem menos que mil reais pagos hoje.

A correção seria descontar cada fluxo a uma taxa. E aí vem o problema: qual
taxa. A escolha muda o resultado, não tem resposta única, e obrigaria a página a
explicar taxa de desconto antes de mostrar o primeiro número.

## Decisão

A comparação é nominal. `compare` soma os pagamentos como estão, sem descontar.

A simplificação é declarada em três lugares: aqui, na especificação de desenho, e
como aviso visível na interface na Fase 3. Aviso visível, não nota de rodapé.

## Consequências

- O número é explicável para quem nunca ouviu falar em valor presente, que é o
  público desta página
- A comparação favorece levemente as estratégias que pagam mais cedo, porque
  ignora que dinheiro adiado custa menos. Como as três estratégias comparadas
  são todas de quitação, o viés empurra na mesma direção em todas, e a ordem
  entre elas não se inverte na faixa de taxas que o produto simula
- A frase "você economiza X" na interface precisa vir acompanhada da unidade
  temporal, porque X é uma soma de reais de anos diferentes
- Se a Fase 6 fizer o agente afirmar que uma estratégia é melhor, ele precisa
  citar a mesma ressalva. Entra nos guardrails do prompt

## Alternativas descartadas

**Valor presente líquido com taxa de desconto fixa.** Mais correto e menos
explicável. Também exigiria escolher uma taxa arbitrária e defendê-la, o que
contradiz a regra de que o domínio não inventa número.

**Taxa de desconto como entrada do usuário.** Descartada porque acrescenta um
campo que quase ninguém sabe preencher, na primeira seção, que precisa ser leve.

**Mostrar os dois números, nominal e descontado.** Descartado por YAGNI e por
ruído: duas economias diferentes para a mesma decisão confunde mais do que
informa, em uma página cujo objetivo é fazer o comportamento do dinheiro ficar
óbvio.
