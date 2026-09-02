#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { buscarNorma, buscarNormaSchema } from './tools/buscar-norma.js'
import { compararCenarios, compararCenariosSchema } from './tools/comparar-cenarios.js'
import { simularFinanciamento, simularFinanciamentoSchema } from './tools/simular-financiamento.js'

/**
 * Servidor MCP do Fluxo.
 *
 * Expoe o mesmo `packages/domain` que a pagina e a API consomem. Nenhuma conta
 * acontece aqui: as tres ferramentas traduzem entrada, chamam o dominio e
 * traduzem a saida.
 *
 * O transporte e stdio, que e o que o Claude Desktop usa. Nada escuta porta,
 * nada acessa rede, e nao ha estado entre chamadas.
 */

const servidor = new McpServer({ name: 'fluxo', version: '0.0.0' })

const json = (dados: unknown): { content: { type: 'text'; text: string }[] } => ({
  content: [{ type: 'text', text: JSON.stringify(dados, null, 2) }],
})

servidor.registerTool(
  'simular_financiamento',
  {
    title: 'Simular financiamento',
    description:
      'Calcula a tabela de amortizacao de um financiamento pelo sistema Price ou SAC e devolve total pago, total de juros, prazo, primeira e ultima parcela, e em que mes metade do valor original foi amortizada. Dinheiro em reais.',
    inputSchema: simularFinanciamentoSchema.shape,
  },
  (entrada) => json(simularFinanciamento(simularFinanciamentoSchema.parse(entrada))),
)

servidor.registerTool(
  'comparar_cenarios',
  {
    title: 'Comparar estrategias de quitacao',
    description:
      'Compara manter a divida como esta com pagar um valor a mais todo mes, e devolve a taxa de equilibrio da portabilidade: abaixo dela, trocar de instituicao ganha de antecipar. Aceita uma taxa de destino opcional para o calculo concreto.',
    inputSchema: compararCenariosSchema.shape,
  },
  (entrada) => json(compararCenarios(compararCenariosSchema.parse(entrada))),
)

servidor.registerTool(
  'buscar_norma',
  {
    title: 'Consultar regra do cartao de credito no Brasil',
    description:
      'Devolve os parametros regulados do cartao de credito brasileiro, com a norma, a URL e a data de vigencia de cada um, distinguindo o que e lei do que e pratica de mercado.',
    inputSchema: buscarNormaSchema.shape,
  },
  (entrada) => json(buscarNorma(buscarNormaSchema.parse(entrada))),
)

const transporte = new StdioServerTransport()
await servidor.connect(transporte)
