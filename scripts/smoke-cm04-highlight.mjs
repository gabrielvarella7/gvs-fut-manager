/**
 * Smoke: CM04 highlight sim freezes clock, moves 22 players, organic phases.
 */
import { buildCm04HighlightClip, gerarLanceHighlightCM04 } from '../src/engine/highlights/gerarLanceCM04.ts';

function fakeRoster(side, startId) {
  const pos = ['GOL', 'ZAG', 'ZAG', 'LAT', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'];
  return pos.map((p, i) => ({
    id: startId + i,
    nome: `${side} Jogador${i + 1}`,
    numero: i + 1,
    posicao: p,
  }));
}

const roster = {
  mandante: fakeRoster('Flu', 1),
  visitante: fakeRoster('Atletico', 100),
};

const lance = gerarLanceHighlightCM04({
  minuto: 4,
  segundoTempo: false,
  mandanteTitulares: roster.mandante,
  visitanteTitulares: roster.visitante,
  timeAtacante: 'VISITANTE',
  desfecho: 'GOL',
  autorId: 110,
  assistenteId: 108,
  seed: 42,
});

const clocks = new Set(lance.frames.map((f) => f.clock ?? lance.minutoCongelado));
const simClocks = new Set(
  buildCm04HighlightClip({
    event: 'GOAL',
    minuto: 4,
    roster,
    attackingHome: false,
    autorId: 110,
    assistenteId: 108,
    tipoLance: 'gol',
  }).frames.map((f) => f.clock),
);

const xs = lance.frames.map((f) => f.bola.x);
const ballMoved = Math.max(...xs) - Math.min(...xs) > 20;
const playerMoved = (() => {
  const first = lance.frames[0].jogadores;
  const last = lance.frames[lance.frames.length - 1].jogadores;
  let moved = 0;
  for (let i = 0; i < first.length; i++) {
    if (Math.hypot(first[i].x - last[i].x, first[i].y - last[i].y) > 3) moved++;
  }
  return moved;
})();

const fases = new Set(lance.frames.map((f) => f.faseOrganica));
const homeGk = lance.frames[0].jogadores.find((j) => j.numero === 1 && j.time === 'MANDANTE');
const awayGk = lance.frames[0].jogadores.find((j) => j.numero === 1 && j.time === 'VISITANTE');
// Away attacks left→right in 1st half? Visitante attacks toward x=0 when mandanteAtacaDireita
// Away GK should be near x≈96 (defending right), home GK near x≈4
const sidesOk = homeGk && awayGk && homeGk.x < 20 && awayGk.x > 80;

const ok =
  lance.minutoCongelado === 4 &&
  simClocks.size === 1 &&
  [...simClocks][0] === 4 &&
  ballMoved &&
  playerMoved >= 10 &&
  fases.has('CONSTRUCAO') &&
  fases.has('FINALIZACAO') &&
  fases.has('ENCERRAMENTO') &&
  sidesOk &&
  lance.frames.length >= 100;

console.log(
  JSON.stringify(
    {
      ok,
      minutoCongelado: lance.minutoCongelado,
      uniqueSimClocks: [...simClocks],
      frames: lance.frames.length,
      duracao: lance.duracaoTotalSegundos,
      ballSpan: Math.max(...xs) - Math.min(...xs),
      playersMoved: playerMoved,
      fases: [...fases],
      homeGkX: homeGk?.x,
      awayGkX: awayGk?.x,
      clocksVarUnused: [...clocks],
    },
    null,
    2,
  ),
);

if (!ok) process.exit(1);
