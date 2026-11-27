/**
 * Smoke: calcularJogadorDaPartida a partir de um resultado mínimo.
 * Uso: npx tsx scripts/smoke-jogador-da-partida.mjs
 */
import { calcularJogadorDaPartida } from '../src/engine/jogadorDaPartida.ts';

const result = {
  mandanteId: 't1',
  visitanteId: 't2',
  golsMandante: 2,
  golsVisitante: 1,
  simSeed: 42,
  energiaFinal: [
    { id: 1, energia: 80 },
    { id: 2, energia: 72 },
    { id: 3, energia: 65 },
    { id: 4, energia: 88 },
  ],
  lancamentos: [
    { minuto: 12, tipo: 'gol', timeId: 't1', jogadorId: 1, texto: 'Gol A' },
    { minuto: 40, tipo: 'gol', timeId: 't1', jogadorId: 1, texto: 'Gol A2' },
    { minuto: 55, tipo: 'gol', timeId: 't2', jogadorId: 3, texto: 'Gol B' },
    { minuto: 70, tipo: 'cartao_amarelo', timeId: 't2', jogadorId: 4, texto: 'Cartão' },
    { minuto: 90, tipo: 'fim', texto: 'Fim' },
  ],
  estatisticas: {},
  preJogo: {},
  forcaInicial: { mandante: {}, visitante: {} },
};

const mapa = new Map([
  [1, { id: 1, nome: 'Artilheiro', timeId: 't1' }],
  [2, { id: 2, nome: 'Meia', timeId: 't1' }],
  [3, { id: 3, nome: 'Atacante V', timeId: 't2' }],
  [4, { id: 4, nome: 'Zagueiro V', timeId: 't2' }],
]);

const dados = calcularJogadorDaPartida(result, mapa, 'Casa', 'Fora');
if (!dados) {
  console.error('FAIL: null');
  process.exit(1);
}
if (dados.destaqueNota.id !== 1) {
  console.error('FAIL: esperado MotM nota = Artilheiro', dados.destaqueNota);
  process.exit(1);
}
if (dados.topNotas.length < 2 || dados.topFans.length < 2) {
  console.error('FAIL: listas curtas', dados);
  process.exit(1);
}
console.log('OK', {
  nota: `${dados.destaqueNota.nome} ${dados.destaqueNota.nota}`,
  fans: `${dados.destaqueFans.nome} ${dados.destaqueFans.votosPct}%`,
  votos: dados.totalVotos,
});
