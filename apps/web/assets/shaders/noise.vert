// Quad de tela cheia. A geometria e um plano 2x2 desenhado sem camera, entao a
// posicao ja vem em coordenada de recorte e nao ha matriz para multiplicar.

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
