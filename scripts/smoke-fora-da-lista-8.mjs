/**
 * Smoke: estrutura 11+11+8 (=30) — completar plantel curto e banco do Assistente.
 * Run: npx --yes tsx scripts/smoke-fora-da-lista-8.mjs
 */
import assert from 'node:assert/strict';
import {
  FORA_DA_LISTA_ALVO,
  RESERVAS_PARTIDA,
  TAMANHO_ELENCO_ESTRUTURA,
  TITULARES_PARTIDA,
  idsBancoPadrao,
  idsEscalacaoPadrao,
} from '../src/career/lineup.ts';
import {
  alvoForaDaLista,
  completarElencoEstrutura30,
  completarTimesFicticiosEstrutura30,
  statusEscalacaoPorSlot,
  SLOTS_PLANTEL_30,
} from '../src/career/plantelEstrutura.ts';
import { gerarTimesFicticios } from '../src/career/fictionalLeague.ts';

assert.equal(TAMANHO_ELENCO_ESTRUTURA, 30);
assert.equal(FORA_DA_LISTA_ALVO, 8);
assert.equal(SLOTS_PLANTEL_30.length, 30);
assert.equal(statusEscalacaoPorSlot(0), 'TITULAR');
assert.equal(statusEscalacaoPorSlot(10), 'TITULAR');
assert.equal(statusEscalacaoPorSlot(11), 'RESERVA');
assert.equal(statusEscalacaoPorSlot(21), 'RESERVA');
assert.equal(statusEscalacaoPorSlot(22), 'NAO_RELACIONADO');
assert.equal(statusEscalacaoPorSlot(29), 'NAO_RELACIONADO');

assert.equal(alvoForaDaLista(30), 8);
assert.equal(alvoForaDaLista(25), 3);
assert.equal(alvoForaDaLista(22), 0);
assert.equal(alvoForaDaLista(18), 0);

function stub(id, timeId, pos, ovr) {
  return {
    id,
    time_id: timeId,
    nome: `J${id}`,
    idade: 24,
    posicao: pos,
    atributos: {
      tecnicos: {
        dominio: 12,
        passe: 12,
        chute: 12,
        cabeceio: 12,
        drible: 12,
        lancamentos: 12,
        bola_parada: 12,
      },
      mentais: {
        leitura_jogo: 12,
        cobertura: 12,
        criatividade: 12,
        agressividade: 12,
        lideranca: 12,
        pressao: 12,
      },
      fisicos: { fora_por_lesao: 12, velocidade: 12, forca: 12 },
    },
    overall: ovr,
    energia: 100,
    status_escalacao: 'NAO_RELACIONADO',
  };
}

const curto = [];
for (let i = 1; i <= 22; i++) {
  const pos = SLOTS_PLANTEL_30[i - 1] ?? 'MEI';
  curto.push(stub(i, 'clube_a', pos, 70 + (i % 10)));
}
const times = [{ id: 'clube_a', nome: 'Clube A', forca_geral: 75, prestigio: 75 }];
const completo = completarElencoEstrutura30(curto, times);
const doClube = completo.filter((j) => j.time_id === 'clube_a');
assert.equal(doClube.length, 30, 'completa 22→30');
assert.equal(
  doClube.filter((j) => j.status_escalacao === 'NAO_RELACIONADO').length >= 8,
  true,
  'extras entram fora da lista',
);

const tit = idsEscalacaoPadrao(doClube, '4-3-3');
assert.equal(tit.length, TITULARES_PARTIDA);
const banco = idsBancoPadrao(doClube, tit);
assert.equal(banco.length, RESERVAS_PARTIDA);
const titSet = new Set(tit);
const banSet = new Set(banco);
const fora = doClube.filter((j) => !titSet.has(j.id) && !banSet.has(j.id));
assert.equal(fora.length, FORA_DA_LISTA_ALVO, `Assistente deixa ${FORA_DA_LISTA_ALVO} fora`);

const fic = gerarTimesFicticios(42, 1);
assert.equal(fic[0].jogadores.length, 30);
const st = { T: 0, R: 0, N: 0 };
for (const j of fic[0].jogadores) {
  if (j.status_escalacao === 'TITULAR') st.T += 1;
  else if (j.status_escalacao === 'RESERVA') st.R += 1;
  else st.N += 1;
}
assert.deepEqual(st, { T: 11, R: 11, N: 8 });

// Idempotente: já com 30 não duplica.
const deNovo = completarElencoEstrutura30(completo, times);
assert.equal(deNovo.filter((j) => j.time_id === 'clube_a').length, 30);

// Migração de save fictício antigo (18 → 30).
const velho = {
  id: 'FIC_99',
  forca: 64,
  jogadores: curto.map((j, i) => ({ ...j, id: 9000 + i, time_id: 'FIC_99' })).slice(0, 18),
};
const migrado = completarTimesFicticiosEstrutura30([velho]);
assert.equal(migrado[0].jogadores.length, 30);

console.log('smoke-fora-da-lista-8: ok');
