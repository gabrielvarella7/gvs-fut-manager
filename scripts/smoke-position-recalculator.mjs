/**
 * Smoke: PositionRecalculator port (Native / Adapted / Improvised).
 * Run: node scripts/smoke-position-recalculator.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Mirror of key attr gates + improviso (source: positionRecalculator.ts).
function escalaMotor(n20) {
  return Math.max(5, Math.min(100, n20 * 5));
}

function attrsFrom20(t, m, f) {
  const defesa = escalaMotor(m.cobertura * 0.45 + t.cabeceio * 0.2 + f.forca * 0.25 + t.passe * 0.1);
  const passe = escalaMotor(t.passe * 0.55 + t.dominio * 0.25 + t.lancamentos * 0.2);
  const chute = escalaMotor(t.chute * 0.65 + t.cabeceio * 0.15 + t.dominio * 0.1 + f.forca * 0.1);
  const velocidade = escalaMotor(f.velocidade * 0.75 + t.drible * 0.15 + f.forca * 0.1);
  return {
    velocidade,
    aceleracao: escalaMotor(f.velocidade * 0.55 + t.drible * 0.25 + f.forca * 0.2),
    passe,
    drible: escalaMotor(t.drible),
    finalizacao: chute,
    defesa,
    cobertura: escalaMotor(m.cobertura),
    ataque: escalaMotor(t.chute * 0.4 + t.drible * 0.35 + m.criatividade * 0.25),
    forca: escalaMotor(f.forca),
    resistencia: escalaMotor(f.fora_por_lesao * 0.45 + f.forca * 0.35 + f.velocidade * 0.2),
    pernaRuim: 3,
    visao: escalaMotor(m.leitura_jogo),
    compostura: escalaMotor(m.pressao),
  };
}

function recalcular(orig, attr, seedNativas) {
  const nativas = new Set([orig, ...seedNativas]);
  const adaptadas = new Map();
  const addAdaptada = (pos, fator) => {
    if (!nativas.has(pos)) {
      const atual = adaptadas.get(pos) ?? 0;
      if (fator > atual) adaptadas.set(pos, fator);
    }
  };
  const isDir = orig === 'LD' || nativas.has('LD');
  const isEsq = orig === 'LE' || nativas.has('LE');

  if (orig === 'LD' || orig === 'LE' || nativas.has('LD') || nativas.has('LE')) {
    if (attr.ataque >= 75 && attr.resistencia >= 75) {
      if (isDir) nativas.add('AD');
      if (isEsq) nativas.add('AE');
    }
    if (attr.passe >= 78 && attr.visao >= 74) nativas.add('MC');
    if (attr.passe >= 75 && attr.velocidade >= 80) {
      if (isDir) nativas.add('MD');
      if (isEsq) nativas.add('ME');
    }
    if (attr.velocidade >= 82 && attr.drible >= 78) {
      if (isDir) nativas.add('PD');
      if (isEsq) nativas.add('PE');
    }
  }
  if (orig === 'ZAG' || nativas.has('ZAG')) {
    if (attr.velocidade >= 78 && attr.aceleracao >= 75) {
      nativas.add('LD');
      nativas.add('LE');
    }
    if (attr.cobertura >= 78 && attr.velocidade >= 75 && attr.passe >= 70) nativas.add('VOL');
  }
  if (orig === 'VOL' || nativas.has('VOL')) {
    if (attr.velocidade >= 76 && attr.passe >= 70) {
      nativas.add('LD');
      nativas.add('LE');
    }
    if (attr.defesa >= 80 && attr.forca >= 75) nativas.add('ZAG');
    if (attr.passe >= 75 && attr.drible >= 70) addAdaptada('MC', 0.97);
  }
  if (nativas.has('PD') || nativas.has('PE')) {
    nativas.add('PD');
    nativas.add('PE');
  }
  if (nativas.has('ST') || nativas.has('AE') || nativas.has('AD')) {
    addAdaptada('CA', attr.forca >= 75 || attr.finalizacao >= 78 ? 0.97 : 0.95);
  }
  for (const n of nativas) adaptadas.delete(n);
  return { nativas: [...nativas], adaptadas };
}

function getOvr(overall, nativas, adaptadas, pos) {
  if (nativas.includes(pos)) return overall;
  const a = adaptadas.get(pos);
  if (a != null) return Math.round(overall * a);
  if (pos === 'GOL') return Math.max(15, Math.round(overall * 0.25));
  return Math.round(overall * 0.85);
}

const alto = attrsFrom20(
  { dominio: 14, passe: 16, chute: 15, cabeceio: 12, drible: 16, lancamentos: 14, bola_parada: 10 },
  { leitura_jogo: 16, cobertura: 16, criatividade: 14, agressividade: 12, lideranca: 12, pressao: 15 },
  { fora_por_lesao: 16, velocidade: 16, forca: 16 },
);

// LAT (LD) com ataque+resist → AD nativo → OVR 100%
{
  const r = recalcular('LD', alto, ['LD', 'LE']);
  assert.ok(r.nativas.includes('AD'), 'LD→AD native');
  assert.equal(getOvr(80, r.nativas, r.adaptadas, 'AD'), 80);
}

// VOL defensivo → ZAG nativo (Def≥80 Força≥75)
{
  const def = attrsFrom20(
    { dominio: 12, passe: 14, chute: 10, cabeceio: 16, drible: 12, lancamentos: 12, bola_parada: 10 },
    { leitura_jogo: 14, cobertura: 18, criatividade: 10, agressividade: 14, lideranca: 12, pressao: 14 },
    { fora_por_lesao: 14, velocidade: 14, forca: 18 },
  );
  assert.ok(def.defesa >= 80 && def.forca >= 75, `defesa=${def.defesa} forca=${def.forca}`);
  const r = recalcular('VOL', def, ['VOL']);
  assert.ok(r.nativas.includes('ZAG'), 'VOL→ZAG native');
  assert.equal(getOvr(78, r.nativas, r.adaptadas, 'ZAG'), 78);
}

// VOL com passe+drible → MC adaptado ~97%
{
  const r = recalcular('VOL', alto, ['VOL']);
  assert.ok(r.adaptadas.has('MC') || r.nativas.includes('MC'), 'VOL→MC adapted/native');
  if (r.adaptadas.has('MC')) {
    assert.equal(getOvr(80, r.nativas, r.adaptadas, 'MC'), Math.round(80 * 0.97));
  }
}

// Improviso GOL emergência
assert.equal(getOvr(80, ['CA'], new Map(), 'GOL'), 20);

// PD↔PE auto
{
  const r = recalcular('PD', alto, ['PD']);
  assert.ok(r.nativas.includes('PE'), 'PD↔PE');
}

console.log('smoke-position-recalculator: OK');
