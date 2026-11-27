/**
 * Smoke checks for genética + energia + departamento médico (sem Vitest).
 * Uso: node scripts/smoke-medico-energia.mjs
 */
import assert from 'node:assert/strict';

// Inline mirrors of critical formulas (keep in sync with TS modules).
function multRiscoPorEnergia(e) {
  if (e >= 85) return 0.8;
  if (e >= 70) return 1.35;
  if (e >= 68) return 1.85;
  return 2.4;
}
function fatorIdadeRecuperacao(idade) {
  if (idade <= 23) return 1.15;
  if (idade <= 29) return 1.0;
  if (idade <= 33) return 0.85;
  return 0.68;
}
function multChanceLesaoFisiologista(n) {
  return Math.max(0.3, 1 - (n - 10) * 0.07);
}
function multDuracaoFisioterapeuta(n) {
  return Math.max(0.55, 1 - (n - 10) * 0.04);
}
function multiplicadorXpPorTeto(ovr, pot) {
  const gap = pot - ovr;
  if (gap <= 0) return 0;
  if (gap >= 8) return 1;
  if (gap >= 4) return 0.55 + ((gap - 4) / 4) * 0.45;
  if (gap >= 2) return 0.28 + ((gap - 2) / 2) * 0.27;
  return 0.08 + gap * 0.1;
}
function multiplicadorDrainPosicao(pos) {
  if (pos === 'GOL') return 0.45;
  if (pos === 'ZAG') return 0.88;
  if (pos === 'ATA') return 1.0;
  return 1.1;
}
function partidasBaselineTemporada(idade) {
  return idade >= 23 && idade <= 32 ? 50 : 40;
}
function tetoDrainPartidaPct(idade, posicao) {
  if (posicao === 'GOL') return 8;
  if (idade >= 23 && idade <= 32) return 16;
  if (idade < 23) return 14;
  return 20;
}
function multiplicadorDensidadeCalendario(d) {
  if (d <= 0) return 1.55;
  if (d === 1) return 1.42;
  if (d === 2) return 1.28;
  if (d === 3) return 1.16;
  if (d <= 5) return 1.06;
  return 1.0;
}

assert.equal(multRiscoPorEnergia(90), 0.8);
assert.equal(multRiscoPorEnergia(75), 1.35);
assert.equal(multRiscoPorEnergia(60), 2.4);
assert.equal(fatorIdadeRecuperacao(20), 1.15);
assert.equal(fatorIdadeRecuperacao(35), 0.68);
assert.equal(multChanceLesaoFisiologista(20), 0.3);
assert.ok(Math.abs(multDuracaoFisioterapeuta(20) - 0.6) < 1e-9);
assert.equal(multiplicadorXpPorTeto(80, 80), 0);
assert.equal(multiplicadorXpPorTeto(70, 90), 1);
assert.equal(multiplicadorDrainPosicao('GOL'), 0.45);
assert.equal(multiplicadorDrainPosicao('MEI'), 1.1);
assert.equal(partidasBaselineTemporada(27), 50);
assert.equal(partidasBaselineTemporada(34), 40);
assert.equal(tetoDrainPartidaPct(27, 'ATA'), 16);
assert.equal(tetoDrainPartidaPct(27, 'GOL'), 8);
assert.equal(tetoDrainPartidaPct(35, 'MEI'), 20);
assert.equal(multiplicadorDensidadeCalendario(7), 1.0);
assert.equal(multiplicadorDensidadeCalendario(3), 1.16);
assert.ok(multiplicadorDensidadeCalendario(3) > multiplicadorDensidadeCalendario(7));

// Seed DB has genetica
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const db = JSON.parse(
  fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/database/jogadores.json'),
    'utf-8',
  ),
);
assert.ok(db.every((j) => j.genetica?.potencial_maximo && j.genetica?.fator_absorcao && j.genetica?.propensao_lesao));
const ney = db.find((j) => j.nome === 'Neymar');
assert.equal(ney.genetica.propensao_lesao, 1.95);
assert.equal(ney.genetica.potencial_maximo, 94);

const treinos = JSON.parse(
  fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/database/treinos.json'),
    'utf-8',
  ),
);
const planoPrev = treinos.planos_individuais.find((p) => p.id === 'PREVENCAO_MUSCULAR');
assert.ok(planoPrev, 'plano PREVENCAO_MUSCULAR deve existir');
assert.equal(planoPrev.nome, 'Prevenção Muscular');
const sessaoPrev = treinos.sessoes_coletivas.find((s) => s.id === 'PREVENCAO_LESOES');
assert.ok(sessaoPrev, 'sessão PREVENCAO_LESOES deve existir');
assert.equal(sessaoPrev.nome, 'Prevenção Muscular');
assert.ok(sessaoPrev.multiplicador_risco_lesao <= 0.5);
const regen = treinos.regimes_intensidade.find((r) => r.id === 'REGENERATIVO');
assert.ok(regen, 'regime REGENERATIVO deve existir');
assert.match(regen.nome, /Regenerativo/);

console.log('smoke-medico-energia: OK');
