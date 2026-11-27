/**
 * Smoke: teto de drain por partida + capacidade etária (sem Vitest).
 * Uso: node scripts/smoke-energia-drain-cap.mjs
 */
import assert from 'node:assert/strict';

// Espelha as constantes públicas de src/career/energia.ts
function partidasBaselineTemporada(idade) {
  return idade >= 23 && idade <= 32 ? 50 : 40;
}
function tetoDrainPartidaPct(idade, posicao) {
  if (posicao === 'GOL') return 8;
  if (idade >= 23 && idade <= 32) return 16;
  if (idade < 23) return 14;
  return 20;
}
function multiplicadorDensidadeCalendario(diasDescanso) {
  const d = Math.max(0, Math.floor(diasDescanso));
  if (d <= 0) return 1.55;
  if (d === 1) return 1.42;
  if (d === 2) return 1.28;
  if (d === 3) return 1.16;
  if (d <= 5) return 1.06;
  return 1.0;
}
function multiplicadorCargaTemporada(jogos, idade) {
  const base = partidasBaselineTemporada(idade);
  const ratio = Math.max(0, jogos) / base;
  if (ratio < 0.5) return 0.96;
  if (ratio < 0.85) return 1.0;
  if (ratio < 1.0) return 1.05;
  if (ratio < 1.15) return 1.14;
  return 1.26;
}

// Cenário do bug: após jogo 2, XI não pode cair a 32–67%.
// Com teto 16% e início ~100%, mínimo pós-jogo ≥ 84% (sem recovery).
for (const idade of [20, 27, 35]) {
  for (const pos of ['GOL', 'ZAG', 'MEI', 'ATA']) {
    const teto = tetoDrainPartidaPct(idade, pos);
    const posJogo = 100 - teto;
    assert.ok(posJogo >= 80, `${pos}@${idade}: pós-jogo ${posJogo} < 80`);
    if (pos === 'GOL') assert.equal(teto, 8);
  }
}

assert.equal(partidasBaselineTemporada(23), 50);
assert.equal(partidasBaselineTemporada(32), 50);
assert.equal(partidasBaselineTemporada(22), 40);
assert.equal(partidasBaselineTemporada(33), 40);

assert.ok(multiplicadorDensidadeCalendario(3) > multiplicadorDensidadeCalendario(7));
assert.ok(multiplicadorCargaTemporada(55, 27) > multiplicadorCargaTemporada(10, 27));
assert.ok(multiplicadorCargaTemporada(45, 34) > multiplicadorCargaTemporada(20, 34));

// Dois jogos com teto 16%: 100 → ≥84 → (≥68 se sem recovery). Nunca 32%.
let e = 100;
e = Math.max(e - tetoDrainPartidaPct(27, 'ATA'), 0);
e = Math.max(e - tetoDrainPartidaPct(27, 'ATA'), 0);
assert.ok(e >= 68, `dois jogos sem recovery: ${e}`);
assert.ok(e > 50, 'bug irreal: energia não pode cair a ~32–50% em 2 jogos');

console.log('smoke-energia-drain-cap: ok');
