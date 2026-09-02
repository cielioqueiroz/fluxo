# 0017. WebGL ausente nao pode custar a narrativa

**Estado:** aceito
**Fase:** 8
**Data:** 2026-09-02

## Contexto

O Lighthouse da Fase 8 devolveu performance 55 e acessibilidade 86, muito longe
da meta de 95. As metricas nao faziam sentido: LCP de 9,5 segundos contra um
servidor local, e uma falha de contraste apontando para
`<p class="mb-4 px-2 text-[#64748B]">`, uma classe do Tailwind que este projeto
nao usa.

O elemento veio do `error-500` do proprio Nuxt. E o log de console explicava:

```
THREE.WebGLRenderer: A WebGL context could not be created.
THREE.WebGLRenderer: Error creating WebGL context.
```

O Chrome rodava com `--disable-gpu`. O TresJS falhava ao criar o contexto, o
erro subia durante a hidratacao, e o Nuxt trocava a pagina inteira pela tela de
erro.

**A pagina nao estava lenta. Ela estava quebrada.** E nao so no Lighthouse:
qualquer pessoa com a GPU na lista de bloqueio do navegador, com WebGL
desligado, ou em maquina virtual, perdia a narrativa inteira por causa de um
campo de ruido decorativo.

## Decisao

A montagem das cenas passa a depender de duas condicoes independentes, com a
mesma consequencia:

```ts
const comCena = computed(() => !movimentoReduzido.value && webglDisponivel.value)
```

Movimento reduzido e escolha do usuario. WebGL ausente e limite do navegador.
Nenhuma das duas pode custar o conteudo, e o caminho de fallback ja existia: sao
os graficos estaticos da Fase 3.

`useWebgl` detecta uma vez, **antes** de qualquer canvas montar, criando um
contexto de teste e devolvendo-o em seguida com `WEBGL_lose_context`, para nao
ocupar um dos poucos contextos que o navegador permite por pagina. Comeca em
`false`, porque no servidor nao ha canvas e prometer uma cena que talvez nunca
monte seria pior que nao prometer.

## Consequencias

Medido no mesmo Chrome sem GPU, antes e depois:

|                  | antes | depois |
| ---------------- | ----- | ------ |
| Performance      | 55    | 85     |
| Acessibilidade   | 86    | 96     |
| SEO              | 91    | 100    |
| LCP              | 9,5 s | 1,8 s  |
| CLS              | 0     | 0,004  |
| Erros de console | 5     | 0      |

O LCP entrou na meta de 2,5 segundos e o CLS ficou muito abaixo de 0,1. A
acessibilidade passou de 95, e a falha de contraste desapareceu junto com a tela
de erro que a causava.

**Performance ficou em 85, abaixo da meta de 95 do `AGENTS.md`.** O que sobra e
custo de JavaScript: TresJS, three.js, GSAP e Lenis somam um pacote grande para
uma pagina que precisa ser legivel sem nenhum deles. O caminho e carregar o
runtime de movimento sob demanda, so quando `comCena` for verdadeiro, e isso
ainda nao foi feito.

## O que este defeito ensina sobre o resto

O erro so apareceu porque o Lighthouse rodou em um ambiente hostil. Nos testes,
no navegador de desenvolvimento e na verificacao manual, havia GPU e tudo
funcionava.

O teste de ponta a ponta cobre movimento reduzido porque o `AGENTS.md` pede.
Ninguem tinha pedido um teste sem WebGL, e era exatamente ele que faltava.

## Alternativas descartadas

**Envolver o canvas em um limite de erro do Vue.** Pegaria a excecao depois de
ela acontecer, o que deixa o rastro no console e depende de o erro ser sincrono
e capturavel. Detectar antes e mais barato e mais previsivel.

**Ignorar, porque WebGL existe em praticamente todo navegador moderno.**
Descartado pelo custo assimetrico: a falha e rara e total. Quem cai nela nao ve
uma cena degradada, ve uma tela de erro no lugar de um simulador financeiro.
