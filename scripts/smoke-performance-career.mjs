/**
 * Smoke: piso competitivo de performance + matriz de afinidade posicional.
 * Run: node scripts/smoke-performance-career.mjs
 */
import assert from 'node:assert/strict';

// Inline mirrors of core formulas (avoid TS transpile in smoke).
function multiplicadorFadigaPartida(energia) {
  const e = Math.max(0, Math.min(100, energia));
  if (e >= 80) return 1;
  if (e >= 65) {
    const t = (79 - e) / Math.max(1, 79 - 65);
    const pen = 0.02 + Math.max(0, Math.min(1, t)) * 0.03;
    return 1 - pen;
  }
  const t = Math.min(1, (65 - e) / 65);
  const pen = 0.05 + t * 0.04;
  return Math.max(0.91, 1 - pen);
}

function combinarCircunstanciais(fadiga, moral, motiv) {
  const bruto = 1 + (fadiga - 1) + (moral - 1) + (motiv - 1);
  return Math.max(0.88, Math.min(1.06, bruto));
}

const PENA = { natural: 0, alta: 5, media: 11, critico: 25, gol_emergencia: 65 };

// Fadiga: nunca −18% / −10 OVR entre jogos leves
assert.equal(multiplicadorFadigaPartida(100), 1);
assert.equal(multiplicadorFadigaPartida(80), 1);
assert.ok(multiplicadorFadigaPartida(70) >= 0.95);
assert.ok(multiplicadorFadigaPartida(50) >= 0.91);
assert.ok(multiplicadorFadigaPartida(20) >= 0.91);

const circCansado = combinarCircunstanciais(0.91, 0.92, 0.9);
assert.ok(circCansado >= 0.88, `piso circunstancial ${circCansado}`);

// OVR efetivo: 80 OVR a 50% energia não cai −10
const ovr50 = Math.round(80 * multiplicadorFadigaPartida(50));
assert.ok(ovr50 >= 72, `OVR a 50% energia deveria ≥72, got ${ovr50}`);
const ovr70 = Math.round(80 * multiplicadorFadigaPartida(70));
assert.ok(80 - ovr70 <= 5, `queda OVR a 70% deveria ≤5, got ${80 - ovr70}`);

// Afinidade: não é flat −20%
assert.equal(1 - PENA.alta / 100, 0.95);
assert.equal(1 - PENA.media / 100, 0.89);
assert.equal(1 - PENA.critico / 100, 0.75);
assert.equal(1 - PENA.gol_emergencia / 100, 0.35);
assert.notEqual(0.8, 1 - PENA.alta / 100);

console.log('smoke-performance-career: OK');
console.log(`  fadiga@50=${multiplicadorFadigaPartida(50).toFixed(3)} ovr80→${ovr50}`);
console.log(`  fadiga@70=${multiplicadorFadigaPartida(70).toFixed(3)} ovr80→${ovr70}`);
console.log(`  circ piso=${circCansado.toFixed(3)}`);
console.log(`  afinidade alta/média/crítica=${1 - PENA.alta / 100}/${1 - PENA.media / 100}/${1 - PENA.critico / 100}`);
