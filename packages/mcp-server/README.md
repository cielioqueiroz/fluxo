# @fluxo/mcp-server

Servidor MCP que expõe o cálculo financeiro do Fluxo como ferramentas para um
assistente.

Ele consome exatamente o mesmo `packages/domain` que a página e a API consomem.
Não existe cálculo próprio aqui: as três ferramentas traduzem a entrada, chamam
o domínio e traduzem a saída. Se algum dia aparecer uma conta neste pacote, ela
está no lugar errado.

## As três ferramentas

| Ferramenta              | O que faz                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `simular_financiamento` | Tabela Price ou SAC. Devolve total pago, total de juros, prazo, primeira e última parcela, e em que mês metade do valor original foi amortizada |
| `comparar_cenarios`     | Compara manter com pagar a mais por mês, e devolve a taxa de equilíbrio da portabilidade                                                        |
| `buscar_norma`          | Os parâmetros regulados do cartão brasileiro, com norma, URL e data de vigência, separando lei de prática de mercado                            |

Valores entram e saem em **reais**, porque quem chama é um assistente
conversando com uma pessoa. A conversão para centavos inteiros acontece uma vez,
na entrada.

Toda resposta de simulação carrega o aviso de material educativo. Nenhuma
ferramenta recomenda produto financeiro.

## Instalar no Claude Desktop

Construa o pacote a partir da raiz do repositório:

```bash
pnpm install && pnpm --filter "./packages/*" build
```

Abra o arquivo de configuração do Claude Desktop:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Acrescente o servidor, com o caminho absoluto do seu clone:

```json
{
  "mcpServers": {
    "fluxo": {
      "command": "node",
      "args": ["/caminho/absoluto/para/fluxo/packages/mcp-server/dist/server.js"]
    }
  }
}
```

No Windows, escreva o caminho com barras duplas:
`"C:\\Projetos\\fluxo\\packages\\mcp-server\\dist\\server.js"`.

Reinicie o Claude Desktop. As três ferramentas aparecem no ícone de conectores.

## Verificar sem o Claude Desktop

O servidor fala JSON-RPC por stdio, então dá para conversar com ele pelo
terminal:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node packages/mcp-server/dist/server.js
```

A resposta lista as três ferramentas com seus schemas.

## O que ele não faz

Não escuta porta, não acessa rede, não lê nem escreve arquivo, e não guarda
estado entre chamadas. Não precisa de banco, de chave de API nem de variável de
ambiente.
