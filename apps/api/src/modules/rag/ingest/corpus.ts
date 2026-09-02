import type { ChunkInput } from '../chunking.js'

/**
 * O corpus publico de educacao financeira.
 *
 * Cada documento carrega fonte e URL, porque a secao 6 do AGENTS.md exige
 * citacao obrigatoria e o schema de contratos recusa afirmacao sem citacao. Sem
 * a URL aqui, a citacao teria de ser inventada, que e o que a regra 3 proibe.
 *
 * O texto e um resumo em linguagem propria do que a norma determina, e nao a
 * transcricao dela. Isso e deliberado: reproduzir o texto integral de terceiros
 * traria questao de licenca para dentro do repositorio, e o que o agente precisa
 * para sustentar uma afirmacao e o conteudo da regra, com o endereco de onde
 * conferi-la.
 *
 * Para acrescentar documento novo, some um item aqui e rode a ingestao. O
 * `documentId` precisa ser estavel: ele forma o id de cada pedaco.
 */
export const CORPUS: readonly ChunkInput[] = [
  {
    documentId: 'cmn-4549-rotativo',
    source: 'Resolucao CMN 4.549, de 26 de janeiro de 2017',
    url: 'https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50330/Res_4549_v1_O.pdf',
    text: `O saldo devedor da fatura de cartao de credito que nao for pago integralmente no vencimento so pode permanecer em credito rotativo ate o vencimento da fatura seguinte. Na pratica, isso limita o rotativo a um unico ciclo, em geral trinta dias.

Passado esse prazo, a instituicao financeira e obrigada a oferecer a conversao do saldo restante em credito parcelado, em condicoes mais vantajosas que as do rotativo, inclusive quanto aos encargos financeiros cobrados. A regra vale desde 3 de abril de 2017 e continua em vigor.

O efeito pratico para quem simula uma divida de cartao e que o cenario de pagar apenas o minimo por muitos meses seguidos, com o saldo crescendo indefinidamente no rotativo, nao corresponde ao que a norma brasileira permite. A divida atravessa um mes de rotativo e depois vira parcelamento.`,
  },
  {
    documentId: 'lei-14690-teto-encargos',
    source: 'Lei 14.690, de 3 de outubro de 2023, regulamentada pela Resolucao CMN 5.112',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14690.htm',
    text: `O valor total cobrado a titulo de juros e demais encargos financeiros no credito rotativo e no parcelamento da fatura de cartao de credito nao pode ultrapassar cem por cento do valor original da divida.

Na pratica, a divida de cartao pode no maximo dobrar. Alcancado esse limite, os encargos param de ser somados ao saldo, e o que resta so diminui com pagamento.

O teto conta os dois estagios somados, rotativo e parcelamento, e nao cada um separadamente. A regra vale desde 3 de janeiro de 2024. Antes dela, a taxa media do rotativo passava de quatrocentos por cento ao ano, sem limite para o total acumulado.`,
  },
  {
    documentId: 'amortizacao-antecipada',
    source: 'Banco Central do Brasil, Cidadania Financeira',
    url: 'https://www.bcb.gov.br/cidadaniafinanceira',
    text: `A amortizacao antecipada reduz o saldo devedor e, com ele, os juros que ainda seriam cobrados. O consumidor tem direito a liquidacao antecipada, total ou parcial, com reducao proporcional dos juros futuros.

Pagar um valor a mais em cada parcela abate principal alem do previsto no contrato. Como os juros de cada mes incidem sobre o saldo daquele mes, cada real antecipado deixa de gerar juros em todos os meses seguintes, e o efeito se acumula.

Em financiamentos longos, o aporte recorrente costuma encurtar o prazo antes de reduzir de forma perceptivel o custo total, porque as primeiras parcelas sao majoritariamente juros. O ganho aparece somado no fim.`,
  },
  {
    documentId: 'sistemas-de-amortizacao',
    source: 'Banco Central do Brasil, Cidadania Financeira',
    url: 'https://www.bcb.gov.br/cidadaniafinanceira',
    text: `Na tabela Price, a parcela e constante do inicio ao fim. No comeco do contrato a maior parte de cada parcela e juros, e a amortizacao do principal e pequena. Essa proporcao se inverte ao longo do tempo.

No sistema SAC, a amortizacao do principal e constante e a parcela e decrescente, porque os juros incidem sobre um saldo que cai mais rapido. O total de juros pago ao final e menor que no Price para o mesmo prazo e a mesma taxa, em troca de parcelas iniciais mais altas.

A escolha entre os dois nao muda a taxa contratada, muda como o pagamento se distribui no tempo.`,
  },
  {
    documentId: 'portabilidade-de-credito',
    source: 'Banco Central do Brasil, Cidadania Financeira',
    url: 'https://www.bcb.gov.br/cidadaniafinanceira',
    text: `A portabilidade de credito permite transferir uma operacao de credito de uma instituicao para outra que ofereca condicoes melhores, mantendo o saldo devedor e o prazo remanescente.

A instituicao de origem nao pode recusar a portabilidade nem cobrar tarifa por ela. Antes de transferir, o consumidor pode apresentar a proposta recebida a instituicao atual, que tem a oportunidade de cobrir a oferta.

Comparar duas propostas exige olhar o Custo Efetivo Total, e nao apenas a taxa de juros nominal, porque tarifas e seguros embutidos mudam o valor efetivamente pago.`,
  },
  {
    documentId: 'pagamento-minimo-fatura',
    source: 'Banco Central do Brasil, Cidadania Financeira',
    url: 'https://www.bcb.gov.br/cidadaniafinanceira',
    text: `O pagamento minimo da fatura do cartao de credito e o menor valor que o titular pode pagar sem ficar inadimplente. O percentual nao e mais fixado por norma: cada instituicao define o seu, e ele consta do contrato e da propria fatura.

Pagar apenas o minimo transfere o restante do saldo para o credito rotativo, que costuma ter a taxa de juros mais alta do mercado brasileiro. Quando o valor pago nao cobre sequer os encargos do periodo, o saldo devedor cresce mesmo com o pagamento em dia.

O custo do credito rotativo e significativamente maior que o de linhas de credito pessoal, o que faz do parcelamento ou da troca por uma linha mais barata alternativas usualmente menos onerosas.`,
  },
]
