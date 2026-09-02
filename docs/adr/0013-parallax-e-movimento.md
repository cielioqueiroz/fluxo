# 0013. Como o movimento foi construido

**Estado:** aceito
**Fase:** 4
**Data:** 2026-09-02

## Contexto

A secao 5 do `AGENTS.md` fixa quatro camadas com fatores, manda animar apenas
`transform` e `opacity`, exige um unico `ScrollTrigger` mestre por secao, proibe
listener proprio de `scroll`, e trata `prefers-reduced-motion` como requisito de
acessibilidade. Cinco restricoes que, juntas, decidem quase toda a arquitetura.

## Decisoes

### O movimento reduzido e o padrao, e nao a excecao

`useReducedMotion` comeca em `true`. Durante a renderizacao no servidor nao
existe `matchMedia`, e assumir que o usuario quer movimento seria assumir a
favor do enfeite. A primeira leitura no cliente corrige.

A consequencia util e que **o HTML que o servidor entrega ja e a versao sem
movimento**. Verificado: nenhum `<canvas>`, seis secoes, os graficos estaticos
da Fase 3, os numeros calculados e o aviso educativo. A narrativa e completa
antes de qualquer script rodar.

### A cena vai na mao para as camadas do proprio orquestrador

`useParallaxLayer` acha a cena por `inject`. Isso funciona para componentes
filhos e **nao funciona para o proprio `SceneStage`**, porque no Vue o `inject`
resolve a partir do pai: um componente nao enxerga o `provide` que ele mesmo
fez. Custou uma sessao de depuracao com o parallax mudo.

O composable passou a aceitar a cena como parametro, com `inject` de padrao.

### A curva e revelada escalando um recorte, e nao por `stroke-dashoffset`

O caminho obvio para desenhar uma linha conforme o scroll e animar
`stroke-dashoffset`. Ele nao e `transform` nem `opacity`, entao a regra o
proibe. A curva e envolvida por um `clipPath` cujo retangulo tem a escala
horizontal animada, o que da o mesmo desenho progressivo animando `transform`.

Parado, o retangulo esta em escala cheia. E por isso que o mesmo componente
serve de versao estatica sem nenhum ramo condicional.

### O parallax da camada 1 acontece no shader

O campo de ruido e fixo e procedural. Desloca-lo por `transform` seria mover um
retangulo cheio de pixels para simular o que uma soma na coordenada do fragmento
ja faz, e ainda exigiria um canvas maior que a viewport para nao descobrir
borda. O fator 0.1 da tabela entra como `uProgress * 0.9` dentro do
`noise.frag`.

### O loop de render para de dois jeitos diferentes

O canvas do ruido desmonta quando a aba fica oculta. Ele e o unico que desenha
continuamente, e nao ha o que desenhar para quem nao esta olhando.

As colunas usam `render-mode="on-demand"` e so pedem quadro quando o progresso
da secao muda. Como o progresso so muda enquanto a secao esta na viewport, o
loop para sozinho quando ela sai, **sem destruir o contexto WebGL a cada
rolagem**, que seria o custo de desmontar.

### O progresso global do ruido e lido no ticker

O ruido nao pertence a secao nenhuma, entao nao tem gatilho mestre para se
registrar. Em vez de criar um `ScrollTrigger` so para ele, o valor e lido uma
vez por quadro dentro do ticker que ja estava girando. Nao existe listener de
`scroll`, que e o que a regra proibe: existe uma leitura de posicao dentro de um
laco que ja existia.

## Consequencias

- CLS medido em **zero** no build de producao. O canvas de fundo e `position:
fixed` com `contain: strict`, entao nao participa de layout
- **LCP nao foi medido.** O navegador nao registra LCP para paginas que nunca
  ficam visiveis, e o painel usado na verificacao fica oculto. `DOMContentLoaded`
  no build de producao ficou em 102ms. A medicao de LCP fica para o Lighthouse
  da Fase 8, com a pagina em primeiro plano
- `will-change: transform` entra quando a secao fica ativa e sai quando ela sai.
  Deixar as seis secoes marcadas permanentemente obrigaria o navegador a manter
  seis camadas de composicao vivas, que e o oposto de otimizar
- O Lenis recebeu `anchors: true`. Sem isso o link de pular para a narrativa
  saltaria por scroll nativo, o Lenis nao emitiria evento, e o `ScrollTrigger`
  ficaria com o progresso velho

## Alternativas descartadas

**Um `ScrollTrigger` por camada.** Quatro gatilhos por secao seriam quatro
leituras de layout por quadro para produzir o mesmo numero. A regra do gatilho
unico nao e estetica, e orcamento de quadro.

**Desmontar o canvas das colunas quando a secao sai da tela.** Criar e destruir
contexto WebGL a cada rolagem custa muito mais do que deixar um contexto ocioso
sem pedir quadro.

**`@tresjs/cientos` para o material de shader.** Descartado por nao acrescentar
nada: `TresShaderMaterial` do proprio core resolve, e o pacote extra traria um
catalogo inteiro de abstracoes que este projeto nao usa.
