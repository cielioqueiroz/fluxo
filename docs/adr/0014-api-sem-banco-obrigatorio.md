# 0014. A API sobe sem banco e sem chave de modelo

**Estado:** aceito
**Fase:** 5
**Data:** 2026-09-02

## Contexto

A Fase 5 traz `apps/api` com Drizzle e Neon. O caminho comum seria exigir
`DATABASE_URL` na inicializacao: sem banco, sem servico.

Duas coisas empurram para o outro lado. A primeira e que **a simulacao nao
precisa de banco**: ela e deterministica, roda inteira em `packages/domain`, e
nao persiste nada, porque a regra 5 do `AGENTS.md` proibe dado pessoal
persistido. A segunda e a regra 1, custo zero: o plano gratuito do Render dorme
por inatividade e o do Neon suspende, e um servico que se recusa a subir sem
dependencia externa quebra com mais frequencia do que precisa.

## Decisao

`DATABASE_URL` e `GEMINI_API_KEY` sao **opcionais** no schema de ambiente. Sem
elas a API sobe, calcula e responde.

O provedor de banco entrega `null` quando nao ha URL, e o tipo obriga quem
consome a tratar a ausencia. Nao existe caminho em que alguem presuma conexao.

O health check separa tres estados, e a distincao e o ponto: `ausente` e
configuracao, `falha` e problema, `ok` e ok. Sem essa separacao, a API sem banco
pareceria quebrada quando na verdade ela faz tudo o que a Fase 5 promete.

A rota de health nunca devolve erro. Um health check que cai junto com a
dependencia nao serve para diagnosticar a dependencia.

## Consequencias

- Verificado com a API rodando sem nenhuma variavel: `health` responde
  `{"status":"ok","dependencies":{"database":"ausente","model":"ausente"}}`, e
  `POST /simulation` devolve os mesmos numeros que o front calcula no navegador
- O banco passa a ser exigido apenas por quem realmente depende dele, que e o
  cache de insight e o RAG da Fase 6. Esses modulos degradam sozinhos
- O deploy no Render funciona antes de existir qualquer banco provisionado, o
  que separa dois passos que costumam falhar juntos

## Duas decisoes menores da mesma fase

**Rate limit em memoria, e nao em Redis.** Redis gratuito com persistencia nao
existe sem cartao, e o plano gratuito do Render roda uma instancia so. Um
contador em memoria protege exatamente o que precisa ser protegido, que e a cota
gratuita do provedor de modelo. Se um dia houver mais de uma instancia, isto
vira um limite por instancia, e o lugar de corrigir e a guarda, com um ADR novo.

**O servico e tipado pelo dominio, e nao pelo schema.** O schema de
`packages/contracts` descreve a forma que atravessa a rede, com arrays mutaveis,
porque e isso que o JSON entrega. O dominio devolve estruturas somente leitura.
Forcar os dois a serem o mesmo tipo obrigaria a copiar a tabela inteira para
tirar o `readonly`, ou seja, copiar 360 linhas por requisicao para agradar o
compilador. A relacao entre os dois e verificada onde importa: o teste de
contrato passa a resposta HTTP de verdade pelo `simulationResultSchema`.

## O teste que mudou o codigo

O teste de contrato tentou recusar `monthlyRate: 1.79`, que e alguem digitando
1,79% sem dividir por cem, e a API aceitou. O teto do `rateSchema` estava em
1000% ao mes, valor que nao protegia nada.

O teto desceu para 100% ao mes. O rotativo brasileiro, que e a taxa mais alta
que este produto simula, gira perto de 14% ao mes, entao cem por cento ja e sete
vezes o pior caso real, e o erro de fator cem passa a ser recusado na borda.

## Alternativas descartadas

**Exigir `DATABASE_URL` sempre.** Mais simples de raciocinar e pior de operar:
tornaria a Fase 5 indeployavel ate a Fase 6 estar pronta, e acoplaria a
simulacao, que nao usa banco, a disponibilidade do banco.

**Um health check que devolve 503 quando o banco cai.** E o padrao em servico
que depende de banco para funcionar. Aqui seria mentira: a simulacao continua
respondendo, entao o servico continua util.
