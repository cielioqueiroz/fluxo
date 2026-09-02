import { expect, test, type Page } from '@playwright/test'

/**
 * O percurso completo da narrativa.
 *
 * Roda duas vezes, uma com movimento e outra com `prefers-reduced-motion`
 * ligado, pelos dois projetos do `playwright.config.ts`. Tudo aqui precisa
 * valer nos dois estados: e essa a promessa do AGENTS.md, de que a narrativa
 * continua legivel em estatico.
 */

const movimentoReduzido = (nome: string): boolean => nome === 'movimento-reduzido'

async function preencher(page: Page, campo: string, valor: string): Promise<void> {
  const entrada = page.locator(`#${campo}`)
  await entrada.fill(valor)
  await entrada.blur()
}

test.beforeEach(async ({ page }, testInfo) => {
  /*
   * A preferencia e emulada aqui, explicitamente, e nao apenas pela opcao
   * `reducedMotion` do projeto.
   *
   * Medido: com a opcao sozinha, matchMedia respondia falso dentro da pagina
   * nos dois projetos, entao o teste do canvas passava por engano em um e
   * falhava no outro. Com `emulateMedia` a consulta responde verdadeiro e
   * nenhum canvas e montado.
   */
  if (movimentoReduzido(testInfo.project.name)) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  await page.goto('/')
})

test('as seis secoes existem, na ordem, com as labels certas', async ({ page }) => {
  // Escopo na coluna de texto: o comparativo tambem usa UiLabel, e contar
  // todas confundiria label de secao com label de componente.
  const labels = page.locator('.section__text .label')
  await expect(labels).toHaveCount(6)

  // O texto e comparado como esta no DOM, e nao como aparece na tela: a caixa
  // alta vem de `text-transform`, que muda a renderizacao e nao o conteudo.
  const esperado = [
    'A divida',
    'Como funciona',
    'Onde o dinheiro vai',
    'O caminho lento',
    'As saidas',
    'A leitura',
  ]
  for (const [indice, texto] of esperado.entries()) {
    await expect(labels.nth(indice)).toContainText(texto)
  }
})

test('a headline e um h1 unico e em dois tons', async ({ page }) => {
  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).toContainText('Todo mundo sabe quanto pega emprestado')
  await expect(h1.locator('.headline__dim')).toContainText('Quase ninguem sabe quanto devolve')
})

test('o calculo roda no navegador e a pagina inteira se refaz ao digitar', async ({ page }) => {
  const totalPago = page.locator('.summary__row').first()
  await expect(totalPago).toContainText('44.963,30')

  await preencher(page, 'valor', '10.000,00')
  await expect(totalPago).not.toContainText('44.963,30')
  await expect(totalPago).toContainText('14.987')
})

test('o formulario tem quatro campos, e o cartao troca prazo por taxa de parcelamento', async ({
  page,
}) => {
  await expect(page.locator('.field')).toHaveCount(4)
  await expect(page.locator('#prazo')).toBeVisible()

  await page.getByRole('button', { name: 'Cartao de credito' }).click()

  await expect(page.locator('.field')).toHaveCount(4)
  await expect(page.locator('#prazo')).toHaveCount(0)
  await expect(page.locator('#taxa-parcelamento')).toBeVisible()
})

test('o cartao mostra os dois estagios brasileiros', async ({ page }) => {
  await page.getByRole('button', { name: 'Cartao de credito' }).click()
  // Espera a troca de ramo acontecer de fato antes de afirmar sobre o texto.
  // Sem isso o teste corre com a hidratacao e falha de vez em quando.
  await expect(page.locator('#taxa-parcelamento')).toBeVisible()

  // A frase aparece duas vezes de proposito: na dica do campo e na secao 4.
  // O teste procura a da narrativa, que e a que carrega a explicacao.
  const secaoDoCaminhoLento = page.locator('.section').nth(3)
  await expect(secaoDoCaminhoLento).toContainText('rotativo dura um mes')
  await expect(secaoDoCaminhoLento).toContainText('parcelamento obrigatorio')
})

test('SAC paga menos juros que Price no mesmo cenario', async ({ page }) => {
  const custo = page.locator('.summary__row').nth(1)
  const comPrice = await custo.innerText()

  await page.getByRole('button', { name: 'SAC' }).click()
  const comSac = await custo.innerText()

  const numero = (texto: string): number =>
    Number(
      texto
        .replace(/[^\d,]/g, '')
        .replace(/\./g, '')
        .replace(',', '.'),
    )
  expect(numero(comSac)).toBeLessThan(numero(comPrice))
})

test('a leitura final e calculada, e o aviso educativo esta na tela', async ({ page }) => {
  const painel = page.locator('.insight')
  await expect(painel).toContainText('Voce devolve')
  await expect(painel).toContainText('Material educativo')
  await expect(painel).toContainText('Nao e recomendacao de produto financeiro')
})

test('o comparativo traz a economia e o limiar da portabilidade', async ({ page }) => {
  const comparativo = page.locator('.comparison')
  await expect(comparativo).toContainText('Manter como esta')
  await expect(comparativo).toContainText('Pagar mais por mes')
  await expect(comparativo).toContainText('deixa de gastar')
  await expect(comparativo).toContainText('taxa abaixo de')
})

test('percorre a pagina inteira sem deslocamento horizontal', async ({ page }) => {
  const secoes = page.locator('.section')
  const total = await secoes.count()

  for (let i = 0; i < total; i += 1) {
    await secoes.nth(i).scrollIntoViewIfNeeded()
    const estouro = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(estouro, `secao ${String(i + 1)} causou rolagem horizontal`).toBe(false)
  }
})

test('nao ha travessao em lugar nenhum do texto visivel', async ({ page }) => {
  const texto = await page.locator('body').innerText()
  expect(texto).not.toMatch(/[–—]/)
})

test('o link de pular para a narrativa funciona pelo teclado', async ({ page }) => {
  await page.keyboard.press('Tab')
  const atalho = page.locator('.shell__skip')
  await expect(atalho).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#narrativa')).toBeVisible()
})

test('o canvas so existe quando ha movimento', async ({ page }, testInfo) => {
  // Espera o suficiente para a hidratacao decidir montar ou nao a cena.
  await page.waitForTimeout(1500)
  const canvases = await page.locator('canvas').count()

  if (movimentoReduzido(testInfo.project.name)) {
    // O requisito de acessibilidade: nenhum WebGL, e a narrativa inteira ainda
    // de pe, verificada pelos testes acima que rodam neste mesmo projeto.
    expect(canvases).toBe(0)
    await expect(page.locator('.chart__svg').first()).toBeVisible()
  } else {
    expect(canvases).toBeGreaterThan(0)
  }
})

test('os ativos de compartilhamento e o sitemap respondem', async ({ request }) => {
  for (const caminho of ['/favicon.svg', '/og.svg', '/site.webmanifest', '/robots.txt']) {
    const resposta = await request.get(caminho)
    expect(resposta.status(), caminho).toBe(200)
  }

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  expect(await sitemap.text()).toContain('<urlset')
})

test('a fonte de display e servida do caminho estavel que o preload aponta', async ({
  request,
}) => {
  const resposta = await request.get('/fonts/general-sans-300.woff2')
  expect(resposta.status()).toBe(200)
})
