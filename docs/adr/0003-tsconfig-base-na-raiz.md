# 0003. `tsconfig.base.json` na raiz, sem pacote de configuração

**Estado:** aceito
**Fase:** 0
**Data:** 2026-09-02

## Contexto

A Fase 0 pede "TypeScript estrito compartilhado" entre seis unidades. O padrão
mais difundido em monorepos é criar um pacote de configuração, algo como
`packages/tsconfig`, e fazer cada unidade estendê-lo por nome.

A seção 3 do `AGENTS.md` desenha a árvore de pastas inteira, e `packages/`
contém exatamente quatro entradas: `domain`, `contracts`, `tokens` e
`mcp-server`. Um quinto pacote de configuração não está previsto.

## Decisão

A configuração compartilhada vive em `tsconfig.base.json` na raiz. Cada unidade
a estende por caminho relativo.

Quando a árvore declarada e o hábito da comunidade divergem, a árvore declarada
vence. O `AGENTS.md` é o contrato, e o `PROMPT-fluxo.md` diz explicitamente que
em caso de conflito ele é quem manda.

Além de `strict`, a base liga `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`,
`noFallthroughCasesInSwitch` e `noPropertyAccessFromIndexSignature`. A escolha
não é purismo. `noUncheckedIndexedAccess` é o que obriga a tratar o acesso a uma
linha inexistente da tabela de amortização, e `exactOptionalPropertyTypes` é o
que impede confundir campo ausente com campo indefinido na saída do modelo.

## Consequências

- Um pacote novo estende `../../tsconfig.base.json`. Se a árvore ganhar mais um
  nível de profundidade, o caminho relativo muda junto
- Não existe versionamento independente da configuração de tipos, o que é
  irrelevante num repositório onde tudo é versionado junto
- `noUncheckedIndexedAccess` vai custar verificações explícitas na Fase 1, ao
  percorrer a tabela de parcelas. Esse custo é a razão de existir da opção

## Alternativas descartadas

**`packages/tsconfig` como pacote.** Descartado por criar diretório fora da
árvore declarada. O ganho, referência por nome em vez de caminho relativo, não
paga o desvio de contrato.

**Configuração duplicada em cada pacote.** Descartado porque a regra 8 do
`AGENTS.md` proíbe `any` em toda parte, e uma opção de rigor que precisa ser
copiada seis vezes acaba divergindo em alguma delas.
