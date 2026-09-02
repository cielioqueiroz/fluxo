// Campo de ruido de fundo, camada 1 do parallax.
//
// Precisa ser quase invisivel. O fundo do produto e quase preto e a secao 4 do
// AGENTS.md proibe blob desfocado e gradiente decorativo: isto e atmosfera, nao
// ornamento. A amplitude fica em poucos por cento entre bg-base e bg-raised.

precision mediump float;

varying vec2 vUv;

uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uRaised;

// Ruido de valor. Hash barato, sem textura e sem dependencia.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Interpolacao suave de Hermite, para o ruido nao virar xadrez.
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Quatro oitavas bastam. Mais que isso custa quadro e nao muda o que se ve.
float fbm(vec2 p) {
  float soma = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    soma += amplitude * valueNoise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return soma;
}

void main() {
  // Corrige o aspecto para o campo nao esticar em tela larga.
  vec2 uv = vUv;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);

  // Deriva lenta. O tempo entra dividido porque a camada 1 tem fator 0.1: ela
  // e a coisa mais parada da tela.
  vec2 p = uv * 2.6 + vec2(uTime * 0.012, uTime * -0.008);

  // O parallax da camada 1 acontece aqui, e nao em um transform no DOM.
  //
  // O canvas e fixo e o conteudo e procedural, entao deslocar o elemento seria
  // mover um retangulo cheio de pixels para simular o que uma soma na
  // coordenada ja faz. O fator vem da tabela da secao 5: 1 - 0.1, ou seja, a
  // camada anda 90% ao contrario do scroll, que e o maximo da cena.
  p.y -= uProgress * 0.9 * 0.55;

  float n = fbm(p);
  // Uma segunda passada deslocada da textura, sem virar nuvem.
  n = fbm(p + n * 0.4);

  // Vinheta suave: o centro respira, as bordas assentam no fundo.
  float centro = 1.0 - smoothstep(0.15, 0.95, length(vUv - 0.5));

  // O progresso da narrativa clareia o campo em alguns por cento, nada mais.
  float peso = (0.35 + n * 0.65) * centro * (0.55 + uProgress * 0.45);

  vec3 cor = mix(uBase, uRaised, peso);

  // Granulado fino por cima, para matar o listrado de gradiente em 8 bits.
  float grao = (hash(gl_FragCoord.xy) - 0.5) * 0.012;
  cor += grao;

  gl_FragColor = vec4(cor, 1.0);
}
