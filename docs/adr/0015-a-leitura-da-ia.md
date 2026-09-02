# 0015. Como a leitura da IA foi construida

**Estado:** aceito
**Fase:** 6
**Data:** 2026-09-02

## Contexto

A secao 6 do `AGENTS.md` fixa cinco exigencias: orcamento de contexto com teto
de 800 tokens, prompts versionados em arquivo com hash persistido, saida em JSON
validada por Zod com uma segunda tentativa e degradacao silenciosa, cache por
hash de parametros mais hash de prompt, e RAG com citacao obrigatoria em que
afirmacao sem chunk correspondente e removida.

A regra 3 da secao 2 e o pano de fundo de tudo: a IA nao inventa numero.

## Decisoes

### A degradacao e um valor, e nao uma excecao

`LlmPort.generate` **nunca lanca**. A falha volta como
`{ ok: false, reason }`, com a razao em categoria e nao em mensagem crua do
provedor. Um adapter que lanca empurra o tratamento de falha para todo chamador,
e basta um esquecer para a pagina quebrar por causa do modelo.

`InsightService.read` tambem nunca lanca e nunca devolve nulo. Sem chave, com
cota estourada, com JSON malformado duas vezes: em todos os casos a resposta
volta com `degraded: true`.

**A resposta degradada nao tem texto.** O front ja tem o resumo deterministico
desde a Fase 3 e vai mostra-lo. Inventar no servidor uma frase de consolo seria
gerar conteudo que ninguem pediu, para preencher um espaco que ja esta cheio.

Isso obrigou uma correcao no `insightResponseSchema`: `headline` e `reading`
deixaram de exigir texto, e um `superRefine` passou a exigi-lo **apenas quando
`degraded` e falso**. O schema agora distingue os dois casos em vez de proibir
um deles.

### Uma correcao, e so uma

A segunda tentativa recebe os erros do schema como instrucao, e nao o mesmo
pedido de novo: repetir identico tende a repetir a falha. No segundo erro,
desiste, porque a terceira chamada gastaria cota para atrasar a mesma
degradacao.

Falha de cota nao dispara segunda tentativa. Insistir contra um limite que
acabou de ser atingido e gastar o que nao ha.

### A citacao e conferida contra o corpus, e nao contra o schema

O schema ja garante que o indice de uma afirmacao aponta para uma citacao
existente. Isso nao basta: o modelo pode devolver uma citacao inteira inventada,
consistente consigo mesma.

`dropUngroundedClaims` compara a URL de cada citacao com as URLs dos trechos que
o RAG realmente recuperou. Citacao que nao veio do corpus cai, e toda afirmacao
que dependia dela cai junto. Os indices restantes sao **remapeados**, e nao
deixados apontando para o vazio.

### O reordenamento e lexical, e nao um segundo modelo

Um reranker cruzado seria mais preciso e custaria uma inferencia por consulta, o
que sai da cota gratuita. O reordenamento soma tres sinais em memoria: a
similaridade que o pgvector ja calculou, quantos termos da consulta aparecem
literalmente no trecho, e uma penalidade para trechos longos. O segundo sinal e
o que importa: numero e nome de norma precisam bater ao pe da letra, e busca
vetorial sozinha casa significado, nao literal.

### O corpus e resumo proprio, e nao transcricao

Cada documento e um resumo em linguagem propria do que a norma determina, com a
URL de onde conferi-la. Reproduzir texto integral de terceiros traria questao de
licenca para dentro do repositorio, e o que o agente precisa para sustentar uma
afirmacao e o conteudo da regra, nao o texto dela.

### O front pede a leitura, e nao a recebe automaticamente

Cada tecla digitada muda o cenario. Disparar por tecla gastaria a cota gratuita
em uma sessao. A leitura e um botao, e o estado de espera diz a verdade sobre o
cold start do plano gratuito.

## Consequencias

- Verificado com a API rodando sem banco e sem chave: `POST /insight` responde
  201 com `degraded: true`, e a resposta passa pelo `insightResponseSchema`
- O cache funciona sem banco: vira uma camada que sempre erra a leitura e nunca
  escreve. Pior desempenho, mesmo resultado
- O `fetch` direto substitui o SDK do provedor. O SDK traz autenticacao por
  conta de servico, streaming e upload de arquivo, e este produto faz duas
  chamadas
- **Nada disto foi exercitado contra o Gemini de verdade.** Nao ha chave neste
  ambiente, e obter uma exige criar conta, que nao e coisa que eu faca pelo
  usuario. O que esta testado e todo o comportamento em torno do modelo, com um
  duble: caminho feliz, retry, degradacao, remocao de citacao inventada

## Alternativas descartadas

**Lancar excecao no adapter e tratar no controller.** E o padrao em servico onde
falha do provedor e falha da requisicao. Aqui seria errado: a pagina continua
util sem a leitura, entao a falha do modelo nao e falha da rota.

**Deixar o modelo escrever o aviso de material educativo.** Descartado porque o
aviso e a unica parte do texto que nao pode variar, e pedir a um modelo que
repita uma frase exata e mais fragil que escrever a frase.

**Guardar a resposta degradada no cache.** Economizaria a chamada seguinte e
congelaria a degradacao: o cenario ficaria sem leitura mesmo depois de a chave
voltar. Degradacao nao e resultado, e ausencia de resultado.
