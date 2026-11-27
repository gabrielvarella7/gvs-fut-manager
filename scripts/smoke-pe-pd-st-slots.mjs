/**
 * Smoke: PE/PD duas alturas, ST atrás do CA, meia lento ≠ AE grátis.
 * Run: npx --yes tsx scripts/smoke-pe-pd-st-slots.mjs
 */
import assert from 'node:assert/strict';
import {
  linhaDaCelula,
  posicaoNaCelula,
  rotuloPosicaoCampinho,
} from '../src/data/gradeCampinho.ts';
import { PositionRecalculator } from '../src/career/positionRecalculator.ts';
import { temParidadeOvr, metricasParidadeDe } from '../src/career/afinidadePosicional.ts';

function attrsBase(over = {}) {
  const t = {
    dominio: 14,
    passe: 14,
    chute: 14,
    cabeceio: 10,
    drible: 14,
    lancamentos: 12,
    bola_parada: 12,
    ...over.tecnicos,
  };
  const m = {
    leitura_jogo: 14,
    cobertura: 12,
    criatividade: 14,
    agressividade: 10,
    lideranca: 12,
    pressao: 12,
    ...over.mentais,
  };
  const f = {
    fora_por_lesao: 12,
    velocidade: 14,
    forca: 12,
    ...over.fisicos,
  };
  return { tecnicos: t, mentais: m, fisicos: f };
}

function jogadorStub(posicao, overall, attrOver = {}) {
  return {
    id: 42,
    nome: 'Stub',
    posicao,
    overall,
    idade: 24,
    energia: 100,
    posicoes_secundarias: [],
    atributos: attrsBase(attrOver),
  };
}

// ——— Labels / schema ———
assert.equal(rotuloPosicaoCampinho({ col: 0, row: 0 }), 'PE');
assert.equal(rotuloPosicaoCampinho({ col: 0, row: 1 }), 'PE');
assert.equal(rotuloPosicaoCampinho({ col: 4, row: 0 }), 'PD');
assert.equal(rotuloPosicaoCampinho({ col: 4, row: 1 }), 'PD');
assert.equal(rotuloPosicaoCampinho({ col: 2, row: 1 }), 'ST');
assert.equal(rotuloPosicaoCampinho({ col: 2, row: 0 }), 'CA');

assert.equal(posicaoNaCelula({ col: 0, row: 0 }), 'ATA');
assert.equal(posicaoNaCelula({ col: 0, row: 1 }), 'ATA'); // PE alto ≠ MEI
assert.equal(posicaoNaCelula({ col: 4, row: 1 }), 'ATA');
assert.equal(posicaoNaCelula({ col: 2, row: 1 }), 'ATA'); // ST
assert.equal(posicaoNaCelula({ col: 1, row: 1 }), 'ATA'); // AE MO
assert.equal(linhaDaCelula({ col: 0, row: 1 }), 'MO');

// ——— Ponta (vel alta, força ok): PE baixo e PE alto = 100% OVR ———
const ponta = jogadorStub('ATA', 78, {
  tecnicos: { chute: 16, drible: 15 },
  fisicos: { velocidade: 17, forca: 16 },
});
const ovrPeBaixo = PositionRecalculator.getOverallNaPosicaoSchema(ponta, 'ATA', {
  col: 0,
  linha: 'ATA',
});
const ovrPeAlto = PositionRecalculator.getOverallNaPosicaoSchema(ponta, 'ATA', {
  col: 0,
  linha: 'MO',
});
assert.equal(ovrPeBaixo, 78, 'PE baixo nativo');
assert.equal(ovrPeAlto, 78, 'PE alto nativo (mesma ponta)');

const ovrSt = PositionRecalculator.getOverallNaPosicaoSchema(ponta, 'ATA', {
  col: 2,
  linha: 'MO',
});
assert.equal(ovrSt, 78, 'ST atrás do CA = OVR cheio p/ ponta com força ok');

const nativoPe = PositionRecalculator.multiplicadorNaPosicaoSchema(ponta, 'ATA', {
  col: 0,
  linha: 'MO',
});
assert.equal(nativoPe.nativa, true, 'dot verde PE alto');

// ——— Paulo: meia chute bom, vel 12, drible 10 → pena em AE ———
const paulo = jogadorStub('MEI', 75, {
  tecnicos: {
    dominio: 20,
    passe: 18,
    chute: 15,
    cabeceio: 8,
    drible: 10,
    lancamentos: 16,
    bola_parada: 16,
  },
  mentais: {
    leitura_jogo: 15,
    cobertura: 10,
    criatividade: 20,
    agressividade: 9,
    lideranca: 13,
    pressao: 13,
  },
  fisicos: { fora_por_lesao: 11, velocidade: 12, forca: 11 },
});

const ovrAe = PositionRecalculator.getOverallNaPosicaoSchema(paulo, 'ATA', {
  col: 1,
  linha: 'MO',
});
assert.ok(ovrAe < 75, `Paulo em AE deve perder OVR, got ${ovrAe}`);
assert.ok(ovrAe >= Math.round(75 * 0.9), `pena leve, got ${ovrAe}`);

const m = metricasParidadeDe(paulo);
assert.equal(
  temParidadeOvr('MEI', 'ATA', m, { col: 1 }),
  false,
  'sem paridade livre MEI→AE',
);
assert.equal(
  temParidadeOvr('MEI', 'ATA', m, { col: 2 }),
  true,
  'paridade MEI→ST/CA centro ainda ok (chute/passe)',
);

const nativoAe = PositionRecalculator.multiplicadorNaPosicaoSchema(paulo, 'ATA', {
  col: 1,
  linha: 'MO',
});
assert.equal(nativoAe.nativa, false, 'Paulo AE sem dot verde nativo');

// ——— Kevin: ponta vel 17 / força 13 → wing livre, pena leve em CA ———
const kevin = jogadorStub('ATA', 76, {
  tecnicos: {
    dominio: 17,
    passe: 15,
    chute: 15,
    cabeceio: 18,
    drible: 14,
    lancamentos: 12,
    bola_parada: 15,
  },
  mentais: {
    leitura_jogo: 11,
    cobertura: 10,
    criatividade: 17,
    agressividade: 16,
    lideranca: 12,
    pressao: 13,
  },
  fisicos: { fora_por_lesao: 14, velocidade: 17, forca: 13 },
});

const ovrKevinPe = PositionRecalculator.getOverallNaPosicaoSchema(kevin, 'ATA', {
  col: 0,
  linha: 'ATA',
});
assert.equal(ovrKevinPe, 76, 'Kevin ponta em PE = OVR cheio');

const ovrKevinCa = PositionRecalculator.getOverallNaPosicaoSchema(kevin, 'ATA', {
  col: 2,
  linha: 'ATA',
});
assert.ok(ovrKevinCa < 76, `Kevin em CA deve perder OVR, got ${ovrKevinCa}`);
assert.ok(
  ovrKevinCa >= Math.round(76 * 0.9),
  `Kevin CA pena leve, got ${ovrKevinCa}`,
);

const nativoKevinCa = PositionRecalculator.multiplicadorNaPosicaoSchema(kevin, 'ATA', {
  col: 2,
  linha: 'ATA',
});
assert.equal(nativoKevinCa.nativa, false, 'Kevin CA sem nativo 100%');
assert.equal(nativoKevinCa.adaptada, true, 'Kevin CA adaptado');

console.log('smoke-pe-pd-st-slots: OK');
console.log('  PE/PD duas alturas, ST label, meia→AE e ponta→CA penalizados');
