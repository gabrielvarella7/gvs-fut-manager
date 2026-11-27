/**
 * Smoke: Assistente 11+11 mantém geometria personalizada e preenche pelos papéis da grade.
 * Run: npx --yes tsx scripts/smoke-assistente-keep-grade.mjs
 */
import assert from 'node:assert/strict';
import { escalacaoAssistenteMelhorOverall } from '../src/career/assistenteTecnico.ts';
import { idsBancoPadrao } from '../src/career/lineup.ts';
import {
  gradePadrao,
  gradesIguais,
  moverSlotNaGrade,
  posicaoNaCelula,
  rotuloPosicaoCampinho,
} from '../src/data/gradeCampinho.ts';

function stub(id, posicao, overall) {
  return {
    id,
    nome: `J${id}`,
    posicao,
    overall,
    idade: 24,
    energia: 100,
    lesao: null,
    status_escalacao: 'NAO_RELACIONADO',
    posicoes_secundarias: [],
    atributos: {
      tecnicos: {
        dominio: 12,
        passe: 12,
        chute: 12,
        cabeceio: 10,
        drible: 12,
        lancamentos: 10,
        bola_parada: 10,
      },
      mentais: {
        leitura_jogo: 12,
        cobertura: 12,
        criatividade: 12,
        agressividade: 10,
        lideranca: 10,
        pressao: 12,
      },
      fisicos: {
        fora_por_lesao: 10,
        velocidade: 12,
        forca: 12,
      },
    },
  };
}

const esquema = '4-2-3-1';

const elenco = [
  stub(1, 'GOL', 78),
  stub(2, 'GOL', 70),
  stub(3, 'ZAG', 76),
  stub(4, 'ZAG', 75),
  stub(5, 'ZAG', 68),
  stub(6, 'LAT', 74),
  stub(7, 'LAT', 73),
  stub(8, 'LAT', 66),
  stub(9, 'VOL', 77),
  stub(10, 'VOL', 76),
  stub(11, 'VOL', 65),
  stub(12, 'MEI', 80), // melhor MEI
  stub(13, 'MEI', 72),
  stub(14, 'MEI', 64),
  stub(15, 'ATA', 82),
  stub(16, 'ATA', 81),
  stub(17, 'ATA', 79),
  stub(18, 'ATA', 78),
  stub(19, 'ATA', 70),
  stub(20, 'ZAG', 67),
  stub(21, 'VOL', 63),
  stub(22, 'MEI', 62),
  stub(23, 'ATA', 61),
  stub(24, 'LAT', 60),
];

const gradeBase = gradePadrao(esquema);
assert.equal(gradeBase.length, 11);

// ST central na faixa MO (row 1) — em 4-2-3-1 costuma ser índice 8.
const idxMo = gradeBase.findIndex((c) => !c.gol && c.row === 1 && c.col === 2);
assert.ok(idxMo >= 0, 'deve existir slot central na faixa MO');
assert.equal(rotuloPosicaoCampinho(gradeBase[idxMo]), 'ST');
assert.equal(posicaoNaCelula(gradeBase[idxMo]), 'ATA');

// Arrasta ST para MC (row 2) → Personalizado: papel schema vira MEI.
const gradeCustom = moverSlotNaGrade(gradeBase, idxMo, { col: 2, row: 2 });
assert.equal(rotuloPosicaoCampinho(gradeCustom[idxMo]), 'MC');
assert.equal(posicaoNaCelula(gradeCustom[idxMo]), 'MEI');
assert.equal(gradesIguais(gradeCustom, gradeBase), false);

const idsTemplate = escalacaoAssistenteMelhorOverall(elenco, esquema, null);
const idsCustom = escalacaoAssistenteMelhorOverall(elenco, esquema, gradeCustom);

assert.equal(idsCustom.length, 11);
assert.equal(idsTemplate.length, 11);

// Slot arrastado para MC (MEI) recebe o melhor MEI.
assert.equal(
  idsCustom[idxMo],
  12,
  'slot arrastado para MC deve receber o melhor MEI disponível',
);

// Geometria custom ≠ template — o UI deve reutilizar gradeCustom, não gradePadrao.
assert.equal(gradesIguais(gradeCustom, gradePadrao(esquema)), false);

const banco = idsBancoPadrao(elenco, idsCustom);
assert.equal(banco.length, 11);
assert.ok(banco.every((id) => !idsCustom.includes(id)), 'banco sem titular');

console.log('smoke-assistente-keep-grade: OK');
