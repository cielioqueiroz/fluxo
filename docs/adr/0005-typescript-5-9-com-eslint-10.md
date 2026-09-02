# 0005. TypeScript fixado em 5.9 por causa do typescript-eslint

**Estado:** aceito
**Fase:** 0
**Data:** 2026-09-02

## Contexto

Na primeira instalação, `typescript` resolveu para 7.0.2, a versão mais recente
publicada. O `typescript-eslint` 8.69.0, que é o mais recente do seu canal,
declara o par `typescript: >=4.8.4 <6.1.0`. A instalação terminou com quatro
avisos de par não atendido.

Par não atendido em analisador estático não é aviso cosmético. O
`typescript-eslint` lê a árvore de sintaxe pela API do compilador, então uma
versão fora da faixa suportada significa que a proibição de `any` da regra 8 do
`AGENTS.md` pode simplesmente parar de ser verificada, sem erro visível.

O mesmo pacote declara `eslint: ^8.57.0 || ^9.0.0 || ^10.0.0`. O ESLint 9.39,
tentado como alternativa, saiu do suporte e foi descartado.

## Decisão

`typescript` fixado em `~5.9.0` e `eslint` em `^10.9.1`. É a combinação que o
`typescript-eslint` 8.69 declara suportar nas duas pontas.

O til em `~5.9.0` é deliberado. Aceita correção de defeito e não aceita a
próxima menor, para que uma instalação futura não atravesse a faixa suportada
sem alguém decidir.

## Consequências

- O repositório não usa o compilador nativo do TypeScript 7 nesta fase. Ele será
  reavaliado quando o `typescript-eslint` publicar suporte
- A revisão deste ADR tem gatilho claro: uma versão de `typescript-eslint` cujo
  par de `typescript` alcance a faixa 7. Até lá, subir o TypeScript sozinho é
  regressão de garantia, não atualização
- `pnpm install` termina sem aviso de par não atendido, o que devolve valor de
  sinal aos avisos que aparecerem depois

## Alternativas descartadas

**Manter o TypeScript 7 e conviver com o aviso.** Descartado porque troca uma
garantia executável, a proibição de `any` verificada no CI, por uma versão mais
nova sem benefício para esta fase.

**Sobrescrever o par com `pnpm.overrides`.** Descartado por ser pior que o
problema: silencia o aviso sem tornar a combinação suportada, e esconde do
próximo leitor exatamente a informação que este ADR existe para preservar.
