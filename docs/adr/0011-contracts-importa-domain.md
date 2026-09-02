# 0011. `packages/contracts` importa `packages/domain`

**Estado:** aceito
**Fase:** 2
**Data:** 2026-09-02

## Contexto

O ADR 0006 deixou explícito que a remarcação de `Cents` na entrada é
responsabilidade da Fase 2. Ao escrever o primeiro schema, a pergunta apareceu:
`packages/contracts` pode importar `packages/domain`?

O grafo da seção 3 do `AGENTS.md` declara que `domain` não importa nada, e lista
o que `web`, `api` e `mcp-server` podem importar. Ele **não diz nada sobre as
dependências de `contracts`**. É omissão, não proibição, e alguém precisa
decidir.

O Zod tem `.brand()`, que resolveria o problema sem importar nada. Ele produz
`number & $brand<'Cents'>`, que é **estruturalmente diferente** do
`number & { [centsBrand]: 'Cents' }` do domínio. Os dois não são atribuíveis um
ao outro, então toda travessia de fronteira precisaria de um cast, que é
exatamente o buraco que o tipo de marca existe para fechar.

## Decisão

`packages/contracts` importa `packages/domain`, e apenas os tipos e construtores
de dinheiro: `Cents`, `Rate`, `cents` e `rate`.

Os schemas validam primeiro e marcam depois, com o próprio construtor do
domínio:

```ts
export const centsSchema: z.ZodType<Cents, number> = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger)
  .transform((valor) => cents(valor))
```

O valor que sai do `parse` é `Cents` de verdade e entra em `price` sem
conversão. Existe um teste que prova exatamente isso, e ele é o teste mais
importante do pacote.

A regra de lint ganhou dois blocos novos: `contracts` não pode importar
aplicação nem design system, e `tokens` não pode importar nada do monorepo.

## Consequências

- A aresta `contracts -> domain` passa a existir no grafo, e o `AGENTS.md`
  continua correto: a única restrição que ele declara, `domain` não importa
  nada, segue valendo
- Quem consome `contracts` carrega `domain` junto. Como os três consumidores já
  dependem de `domain` de qualquer forma, isso não acrescenta peso a ninguém
- A validação e a marcação acontecem no mesmo lugar, uma vez, na borda. Nenhum
  `as Cents` aparece em `apps/api` ou `apps/web`
- Se um dia `contracts` precisar de algo do domínio que não seja dinheiro, a
  decisão precisa ser revisitada: a aresta foi aberta para as marcas, não como
  permissão geral

## Alternativas descartadas

**`.brand()` do Zod.** Não importaria nada e daria segurança nominal dentro de
`contracts`. Descartado porque a marca resultante é incompatível com a do
domínio, e o preço seria um cast por travessia. Um cast que existe para
contornar o sistema de tipos é pior que não ter tipo de marca.

**Mover `Cents` e `Rate` para `contracts` e fazer `domain` importar de lá.**
Descartado porque violaria a única regra que o grafo declara com todas as
letras.

**Um quinto pacote só com os tipos de dinheiro, importado pelos dois.**
Resolveria sem abrir aresta nova. Descartado por criar diretório fora da árvore
declarada, pelo mesmo motivo do ADR 0003, e por acrescentar um pacote inteiro
para hospedar dois tipos.
