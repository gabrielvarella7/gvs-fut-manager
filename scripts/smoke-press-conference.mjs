/**
 * Smoke: banco 40/40/20 + gerarColetiva + processarResposta + moral clamp.
 * Uso: npx tsx scripts/smoke-press-conference.mjs
 */
import { BANCO_RESPOSTAS_COLETIVA, contagemBancoColetiva } from '../src/engine/pressConferenceBank.ts';
import {
  gerarColetivaPosJogo,
  processarRespostaColetiva,
} from '../src/engine/pressConferenceEngine.ts';
import { aplicarDeltasMoralColetiva, moralDe } from '../src/engine/pressConferenceMoral.ts';
import { montarColetivaPosPartida } from '../src/engine/pressConferenceFromMatch.ts';

const cont = contagemBancoColetiva();
if (cont.total !== 100 || cont.motivadora !== 40 || cont.critica !== 40 || cont.neutra !== 20) {
  console.error('FAIL: contagem banco', cont);
  process.exit(1);
}

const ids = new Set(BANCO_RESPOSTAS_COLETIVA.map((r) => r.id));
if (ids.size !== 100) {
  console.error('FAIL: ids duplicados', ids.size);
  process.exit(1);
}

const textos = new Set(BANCO_RESPOSTAS_COLETIVA.map((r) => r.textoImprensa));
if (textos.size !== 100) {
  console.error('FAIL: textoImprensa duplicado', textos.size);
  process.exit(1);
}

for (const r of BANCO_RESPOSTAS_COLETIVA) {
  if (!/\{jogador\}|\{clube\}|\{adversario\}|\{placar\}/.test(r.textoImprensa + r.rotuloBotao)) {
    // Neutras podem não usar todos; exige ao menos um placeholder no par
    if (!r.textoImprensa.includes('{') && !r.rotuloBotao.includes('{')) {
      console.error('FAIL: sem placeholder', r.id);
      process.exit(1);
    }
  }
}

const jogador = {
  id: 7,
  time_id: 'fla',
  nome: 'Pedro',
  idade: 27,
  posicao: 'ATA',
  atributos: {},
  overall: 82,
  energia: 70,
  status_escalacao: 'TITULAR',
  moral: 50,
};

const coletiva = gerarColetivaPosJogo({
  data: '2026-11-27T22:00:00.000Z',
  clubeSigla: 'FLA',
  clubeNome: 'Flamengo',
  adversarioNome: 'Palmeiras',
  placar: '2x1',
  resultado: 'VITORIA',
  elencoAtuou: [
    { jogador, nota: 8.2, gols: 2, assistencias: 0 },
    {
      jogador: { ...jogador, id: 8, nome: 'Arrascaeta', idade: 30 },
      nota: 7.4,
      gols: 0,
      assistencias: 1,
    },
  ],
  bancoRespostas: BANCO_RESPOSTAS_COLETIVA,
});

if (coletiva.opcoes.length !== 4) {
  console.error('FAIL: esperado 4 opções', coletiva.opcoes.length);
  process.exit(1);
}
const neutras = coletiva.opcoes.filter((o) => o.tom === 'NEUTRA');
if (neutras.length !== 1) {
  console.error('FAIL: exatamente 1 NEUTRA', neutras.length);
  process.exit(1);
}
if (coletiva.jogadorAlvo.nome !== 'Pedro') {
  console.error('FAIL: protagonista', coletiva.jogadorAlvo);
  process.exit(1);
}

const neutra = neutras[0];
const rNeutra = processarRespostaColetiva(coletiva, neutra, jogador);
if (rNeutra.deltaMoralJogador !== 1 || rNeutra.deltaMoralElenco !== 1) {
  console.error('FAIL: neutra em vitória deve ser +1', rNeutra);
  process.exit(1);
}

const elenco = [
  jogador,
  { ...jogador, id: 8, nome: 'Arrascaeta', moral: 50 },
  { ...jogador, id: 9, nome: 'Banco', moral: 50, status_escalacao: 'RESERVA' },
];
const apos = aplicarDeltasMoralColetiva(elenco, 'fla', 7, {
  deltaMoralJogador: 12,
  deltaMoralElenco: 3,
});
if (moralDe(apos.find((j) => j.id === 7)) !== 62) {
  console.error('FAIL: moral alvo', apos.find((j) => j.id === 7));
  process.exit(1);
}
if (moralDe(apos.find((j) => j.id === 8)) !== 53) {
  console.error('FAIL: moral elenco', apos.find((j) => j.id === 8));
  process.exit(1);
}

const clampTest = aplicarDeltasMoralColetiva(
  [{ ...jogador, moral: 95 }],
  'fla',
  7,
  { deltaMoralJogador: 20, deltaMoralElenco: 0 },
);
if (moralDe(clampTest[0]) !== 100) {
  console.error('FAIL: clamp max', clampTest[0]);
  process.exit(1);
}

const result = {
  mandanteId: 'fla',
  visitanteId: 'pal',
  golsMandante: 2,
  golsVisitante: 1,
  simSeed: 99,
  energiaFinal: [
    { id: 7, energia: 70 },
    { id: 8, energia: 72 },
  ],
  lancamentos: [
    { minuto: 20, tipo: 'gol', timeId: 'fla', jogadorId: 7, texto: 'Gol' },
    { minuto: 55, tipo: 'gol', timeId: 'fla', jogadorId: 7, texto: 'Gol2' },
    { minuto: 70, tipo: 'gol', timeId: 'pal', jogadorId: 99, texto: 'GolV' },
    { minuto: 90, tipo: 'fim', texto: 'Fim' },
  ],
  estatisticas: {},
  preJogo: {},
  forcaInicial: { mandante: {}, visitante: {} },
};

const fromMatch = montarColetivaPosPartida({
  result,
  clubeId: 'fla',
  clubeNome: 'Flamengo',
  adversarioNome: 'Palmeiras',
  elencoClube: elenco,
});
if (!fromMatch || fromMatch.opcoes.filter((o) => o.tom === 'NEUTRA').length !== 1) {
  console.error('FAIL: montarColetivaPosPartida', fromMatch);
  process.exit(1);
}

console.log('OK', {
  banco: cont,
  protagonista: coletiva.jogadorAlvo.nome,
  opcoes: coletiva.opcoes.map((o) => o.tom),
  neutraBonus: rNeutra.deltaMoralJogador,
  fromMatchAlvo: fromMatch.jogadorAlvo.nome,
});
