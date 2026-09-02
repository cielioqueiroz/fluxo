# 0016. O servidor MCP nao tem calculo proprio

**Estado:** aceito
**Fase:** 7
**Data:** 2026-09-02

## Contexto

A Fase 7 pede tres ferramentas MCP consumindo o dominio. A tentacao obvia e
escrever uma versao simplificada do calculo dentro do servidor: as ferramentas
respondem a um assistente, e um assistente aceita numero aproximado sem
reclamar.

Essa e exatamente a forma de o projeto passar a ter dois numeros para a mesma
pergunta, que e o que a regra 2 da secao 2 do `AGENTS.md` proibe.

## Decisao

As tres ferramentas chamam `packages/domain` e nada mais. Elas fazem tres
coisas: traduzem reais para centavos, chamam a funcao do dominio, e traduzem
centavos de volta para reais.

O teste que sustenta isso nao verifica formato, verifica **identidade**: chama a
tool e chama `price` diretamente, e exige o mesmo numero. Se alguem escrever uma
conta aqui, o teste quebra.

`buscar_norma` le `BRASIL` e `BRASIL_PROVENANCE` do preset do dominio, e nao uma
copia. Quando a regra mudar, muda o preset e a ferramenta muda junto, sem
ninguem lembrar de atualizar dois lugares.

### Reais na fronteira, centavos por dentro

A entrada aceita reais porque quem chama e um assistente conversando com uma
pessoa, e pessoa fala em reais. A conversao acontece uma vez, na entrada, e usa
o texto decimal em vez de multiplicar por cem, porque `0.1 * 100` da
`10.000000000000002`.

**O que essa conversao nao faz e recuperar precisao que a entrada ja perdeu.**
Um JSON com `1.005` chega como `1.00499999999999989`, e vira 100 centavos. Nao
ha conserto neste ponto: a perda aconteceu antes da funcao. A protecao real e
que dali em diante tudo e centavo inteiro. Isso esta em teste, com o nome
dizendo o que esta sendo aceito.

### `buscar_norma` nao usa busca vetorial

O RAG da Fase 6 existe porque o corpus e texto corrido e a pergunta e vaga. Aqui
o conjunto e pequeno, fechado e exato: quatro parametros com valor, norma e
data. Um assistente que pergunta qual e o teto do rotativo quer o numero, e nao
o trecho mais parecido.

A ferramenta tambem separa `norma` de `pratica de mercado`, porque o minimo de
15% nao e lei e um assistente que repetisse isso como regulacao estaria
espalhando o erro que o ADR 0008 existe para evitar.

## Consequencias

- Verificado por JSON-RPC real sobre stdio: `tools/list` devolve as tres, e
  `simular_financiamento` com 30.000 a 1,79% em 48 meses devolve total pago de
  44.963,30, 49,9% de juros sobre o principal e metade amortizada no mes 29. Os
  mesmos numeros da pagina e da API
- O pacote nao escuta porta, nao acessa rede, nao le arquivo e nao guarda estado.
  Nao precisa de banco, de chave nem de variavel de ambiente
- Toda resposta de simulacao carrega o aviso de material educativo, porque a
  saida vai direto para uma conversa

## Alternativas descartadas

**Chamar a API HTTP em vez do dominio.** Faria as ferramentas dependerem de um
servico no ar, com cold start de quase um minuto no plano gratuito, para obter
um numero que uma funcao local calcula em microssegundos.

**Uma unica ferramenta com um parametro de modo.** Menos entradas no catalogo e
pior para quem chama: o assistente escolhe ferramenta pelo nome e pela
descricao, e um nome generico com modo escondido torna a escolha um chute.
