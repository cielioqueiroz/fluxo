# 0001. Monorepo com pnpm workspaces e Turborepo

**Estado:** aceito
**Fase:** 0
**Data:** 2026-09-02

## Contexto

O `AGENTS.md` declara uma árvore com seis unidades publicáveis: dois aplicativos
e quatro pacotes. Três dessas unidades, `apps/web`, `apps/api` e
`packages/mcp-server`, precisam consumir exatamente o mesmo cálculo financeiro
de `packages/domain`, e o valor central do projeto depende de que esse cálculo
seja um só. Publicar o domínio em um registro e versioná-lo entre repositórios
separados custaria uma etapa de publicação a cada mudança de fórmula, o que na
prática garante divergência.

O `AGENTS.md` também exige um grafo de dependência rígido, verificável, e a
regra 1 proíbe qualquer serviço pago.

## Decisão

Um único repositório com pnpm workspaces para a resolução de dependências e
Turborepo para a orquestração das tarefas.

O pnpm foi escolhido pelo armazenamento endereçado por conteúdo, que evita
duplicar Nuxt, Nest e as ferramentas entre os pacotes, e por não achatar o
`node_modules`. Um pacote só enxerga o que declarou. Isso transforma o grafo do
`AGENTS.md` em algo que a própria instalação ajuda a manter, e não só o lint.

O Turborepo entra pelo cache de tarefas por hash de entradas. Alterar o front
não deve reexecutar a suíte do domínio.

## Consequências

- `packages/domain` nasce sem nenhuma dependência declarada. Não é estilo, é a
  aplicação literal do grafo. Ele não tem o que importar
- O cache do Turborepo é local nesta configuração. Nenhum cache remoto é
  contratado, porque cache remoto é serviço pago e a regra 1 é inegociável
- Quem clonar o repositório precisa de pnpm. O campo `packageManager` fixa a
  versão e o CI a lê pelo `pnpm/action-setup`
- Nesta máquina o `corepack enable` falhou com EPERM em
  `C:\Program Files\nodejs` por falta de permissão de administrador. O pnpm foi
  instalado pelo npm no prefixo do usuário. O campo `packageManager` continua
  fixando a versão para quem tiver o corepack habilitado

## Alternativas descartadas

**Nx.** Resolve o mesmo problema com mais capacidade, incluindo geradores e
grafo visual. Foi descartado porque o que este repositório precisa da ferramenta
é cache e ordem de execução, e o Turborepo entrega isso com um arquivo de
configuração que cabe na tela. Numa peça de portfólio, a configuração é lida.

**Repositórios separados com o domínio publicado no npm.** Descartado pelo custo
de publicação a cada mudança de fórmula e pela janela de divergência entre as
versões consumidas por front, back e servidor MCP.

**npm ou yarn workspaces.** Descartado pelo achatamento de `node_modules`, que
permite importar pacote não declarado. Isso enfraquece justamente a fronteira
que o `AGENTS.md` exige.
