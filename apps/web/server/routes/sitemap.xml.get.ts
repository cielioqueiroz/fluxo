/**
 * Sitemap.
 *
 * Uma pagina so, entao um sitemap gerado por modulo seria um pacote inteiro
 * para produzir dez linhas. A URL base vem da configuracao publica, com
 * reposicao para o endereco de producao: sitemap com `localhost` dentro e pior
 * que sitemap nenhum.
 */
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig().public
  const base = siteUrl.replace(/\/$/, '')
  const hoje = new Date().toISOString().slice(0, 10)

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  // Uma pagina que muda pouco, entao cache longo na borda.
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
})
