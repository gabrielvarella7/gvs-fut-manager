/**
 * Smoke: Sub-23 OVR na aparição vs plantel pro (5% top-11 / 95% ≤ resto).
 * Run: npx --yes tsx scripts/smoke-sub23-ovr-plantel.mjs
 */
import assert from 'node:assert/strict';
import {
  CHANCE_OVR_NIVEL_TITULARES,
  gerarAtletaSub23,
  gerarElencoSub23Clube,
  referenciasOvrPlantelPro,
  sortearOvrAlvoVsPlantel,
} from '../src/career/sub23.ts';
import { criarRng } from '../src/engine/matchEngine.ts';

function media(ns) {
  return ns.reduce((s, n) => s + n, 0) / Math.max(1, ns.length);
}

function plantelStub(top11Avg, restAvg, nRest = 14) {
  const elenco = [];
  for (let i = 0; i < 11; i++) elenco.push({ overall: Math.round(top11Avg) });
  for (let i = 0; i < nRest; i++) elenco.push({ overall: Math.round(restAvg) });
  return elenco;
}

// --- referenciasOvrPlantelPro ---
{
  const refs = referenciasOvrPlantelPro(plantelStub(80, 70));
  assert.ok(Math.abs(refs.mediaTop11 - 80) < 0.01, 'mediaTop11');
  assert.ok(Math.abs(refs.mediaResto - 70) < 0.01, 'mediaResto');
  const empty = referenciasOvrPlantelPro([]);
  assert.equal(empty.mediaTop11, 72);
  assert.equal(empty.mediaResto, 64);
}

// --- sortearOvrAlvoVsPlantel distribution ---
{
  const mediaTop11 = 80;
  const mediaResto = 70;
  const N = 4000;
  let titulares = 0;
  let restoOk = 0;
  let restoEstourou = 0;
  const rnd = criarRng(0x50b23);
  for (let i = 0; i < N; i++) {
    const r = sortearOvrAlvoVsPlantel({
      mediaTop11,
      mediaResto,
      tier: 'MEDIO',
      precoceEstagnado: false,
      diamanteBruto: false,
      rnd,
    });
    if (r.nivelTitulares) {
      titulares += 1;
      assert.ok(r.ovrAlvo >= mediaTop11 - 2 && r.ovrAlvo <= mediaTop11 + 3, 'titulares band');
    } else {
      if (r.ovrAlvo <= Math.floor(mediaResto)) restoOk += 1;
      else restoEstourou += 1;
    }
  }
  const pct = titulares / N;
  assert.ok(pct > 0.03 && pct < 0.08, `~5% titulares got ${pct}`);
  assert.equal(restoEstourou, 0, '95% path never exceeds rest avg');
  assert.ok(restoOk / (N - titulares) > 0.99, 'rest band');
  assert.equal(CHANCE_OVR_NIVEL_TITULARES, 0.05);
}

// --- gerarAtletaSub23 respects plantel caps ---
{
  const elencoPro = plantelStub(82, 71);
  const refs = referenciasOvrPlantelPro(elencoPro);
  const rnd = criarRng(0xcafebabe);
  const N = 220;
  const tetoResto = Math.floor(refs.mediaResto);
  const capTitulares = Math.ceil(refs.mediaTop11 + 2);
  let acimaResto = 0;
  const ovrs = [];
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
      elencoPro,
    });
    ovrs.push(a.overall);
    assert.ok(a.overall <= capTitulares, `never above titulares cap (${a.overall})`);
    if (a.overall > tetoResto) {
      acimaResto += 1;
      // 5% path: near top-11 (allow diamante/attr drift)
      assert.ok(
        a.overall >= Math.round(refs.mediaTop11) - 6,
        `above-rest OVR ${a.overall} should be starters-quality vs top11 ${refs.mediaTop11}`,
      );
    }
  }
  const pctAltos = acimaResto / N;
  assert.ok(pctAltos > 0.02 && pctAltos < 0.12, `~5% above rest got ${pctAltos}`);
  assert.ok(media(ovrs) <= refs.mediaResto + 1.5, `mean OVR ${media(ovrs)} vs resto ${refs.mediaResto}`);
  // Regression vs bug screenshot (many 78–82 when rest avg ~71)
  const muitoAltos = ovrs.filter((o) => o >= 78).length;
  assert.ok(muitoAltos / N < 0.15, `≥78 share ${muitoAltos / N} should be rare when resto=71`);
}

// --- elenco generation wires plantel ---
{
  const elencoPro = plantelStub(78, 68);
  const { elenco } = gerarElencoSub23Clube({
    time: { id: 'flu', nome: 'Flu', prestigio: 80, forca_geral: 78 },
    qualidade: 14,
    diretor: 12,
    seed: 42,
    idInicio: 700_000,
    elencoPro,
  });
  assert.equal(elenco.length, 22);
  const refs = referenciasOvrPlantelPro(elencoPro);
  const altos = elenco.filter((a) => a.overall > Math.floor(refs.mediaResto) + 2);
  for (const a of altos) {
    assert.ok(
      a.overall <= Math.ceil(refs.mediaTop11 + 2),
      `${a.nome} OVR ${a.overall} above titulares cap`,
    );
  }
  assert.ok(altos.length <= 4, `at most a few starters-quality in 22, got ${altos.length}`);
}

console.log('smoke-sub23-ovr-plantel: ok');
