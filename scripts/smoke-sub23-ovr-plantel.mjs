/**
 * Smoke: OVR inicial da base (Sub-20 / Sub-23) segue pirâmide 60/25/10/4/1, teto 80.
 * Potencial permanece independente (pode ser alto com OVR baixo).
 * Run: npx --yes tsx scripts/smoke-sub23-ovr-plantel.mjs
 */
import assert from 'node:assert/strict';
import { gerarAtletaSub23, gerarElencoSub23Clube } from '../src/career/sub23.ts';
import {
  clampOvrInicialBase,
  gerarJovemSub20,
  OVR_INICIAL_BASE_MAX,
  PIRAMIDE_OVR_INICIAL_BASE,
  sortearOvrInicialBase,
} from '../src/career/youthAcademy.ts';
import { criarRng } from '../src/engine/matchEngine.ts';

function bandaDe(ovr) {
  if (ovr <= 60) return 0;
  if (ovr <= 65) return 1;
  if (ovr <= 70) return 2;
  if (ovr <= 75) return 3;
  if (ovr <= 80) return 4;
  return -1;
}

// --- constantes da pirâmide ---
{
  assert.equal(OVR_INICIAL_BASE_MAX, 80);
  assert.equal(PIRAMIDE_OVR_INICIAL_BASE.reduce((s, b) => s + b.peso, 0), 100);
  assert.deepEqual(
    PIRAMIDE_OVR_INICIAL_BASE.map((b) => b.peso),
    [60, 25, 10, 4, 1],
  );
  assert.equal(clampOvrInicialBase(99), 80);
  assert.equal(clampOvrInicialBase(40), 48);
}

// --- sortearOvrInicialBase distribuição ---
{
  const N = 8000;
  const counts = [0, 0, 0, 0, 0];
  const rnd = criarRng(0x50b23);
  for (let i = 0; i < N; i++) {
    const ovr = sortearOvrInicialBase(rnd);
    assert.ok(ovr >= 48 && ovr <= 80, `alvo fora da faixa: ${ovr}`);
    const b = bandaDe(ovr);
    assert.ok(b >= 0, `banda inválida ${ovr}`);
    counts[b] += 1;
  }
  const expected = PIRAMIDE_OVR_INICIAL_BASE.map((b) => b.peso / 100);
  for (let i = 0; i < 5; i++) {
    const pct = counts[i] / N;
    assert.ok(
      Math.abs(pct - expected[i]) < 0.025,
      `banda ${i} got ${pct.toFixed(3)} expected ~${expected[i]}`,
    );
  }
}

// --- gerarAtletaSub23 respeita pirâmide + never >80 ---
{
  const rnd = criarRng(0xcafebabe);
  const N = 500;
  const counts = [0, 0, 0, 0, 0];
  let potencialAltoComOvrBaixo = 0;
  for (let i = 0; i < N; i++) {
    const a = gerarAtletaSub23({
      id: 900_000 + i,
      timeId: 't1',
      nome: `A${i}`,
      posicao: 'MEI',
      qualidade: 12,
      diretor: 10,
      rodada: 0,
      seed: 1000 + i,
      rnd,
    });
    assert.ok(a.overall <= OVR_INICIAL_BASE_MAX, `OVR ${a.overall} > 80`);
    assert.ok(a.overall >= 48, `OVR ${a.overall} < 48`);
    const b = bandaDe(a.overall);
    assert.ok(b >= 0, `overall ${a.overall} above 80`);
    counts[b] += 1;
    if (a.overall <= 60 && a.potencialOvr >= 85) potencialAltoComOvrBaixo += 1;
  }
  // Distribuição aproximada (attrs podem deslocar um pouco a banda)
  assert.ok(counts[0] / N > 0.45, `≤60 share ${counts[0] / N}`);
  assert.ok(counts[4] / N < 0.05, `76–80 share ${counts[4] / N} should be rare`);
  assert.ok(
    potencialAltoComOvrBaixo > 0,
    'potencial independente: ao menos um ≤60 com teto ≥85',
  );
}

// --- gerarJovemSub20 mesma regra ---
{
  const rnd = criarRng(0xabcdef);
  const N = 300;
  for (let i = 0; i < N; i++) {
    const j = gerarJovemSub20({
      id: 1000 + i,
      nome: `J${i}`,
      posicao: 'ATA',
      idade: 17,
      foco: 'EQUILIBRADO',
      qualidade: 14,
      diretor: 12,
      rodada: 1,
      seed: 50 + i,
      rnd,
    });
    assert.ok(j.overall <= 80, `Sub-20 OVR ${j.overall}`);
    assert.ok(j.potencialOvr >= j.overall, 'potencial ≥ overall');
  }
}

// --- elenco Sub-23 completo ---
{
  const { elenco } = gerarElencoSub23Clube({
    time: { id: 'flu', nome: 'Flu', prestigio: 80, forca_geral: 78 },
    qualidade: 14,
    diretor: 12,
    seed: 42,
    idInicio: 700_000,
  });
  assert.equal(elenco.length, 22);
  assert.ok(elenco.every((a) => a.overall <= 80), 'nenhum Sub-23 >80');
  const media = elenco.reduce((s, a) => s + a.overall, 0) / elenco.length;
  assert.ok(media < 68, `média elenco ${media} deve ficar baixa (pirâmide)`);
}

console.log('smoke-sub23-ovr-plantel: ok (pirâmide base)');
