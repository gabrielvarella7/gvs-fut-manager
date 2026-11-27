/**
 * Smoke: paridade OVR na matriz de afinidade (VOL↔MC, alas, ZAG↔VOL, CA/ST/AE…).
 * Run: node scripts/smoke-affinity-ovr-parity.mjs
 */
import assert from 'node:assert/strict';

// Inline mirror of temParidadeOvr gates (TS source of truth: afinidadePosicional.ts).
const L = {
  volZagDefesa: 78,
  zagVolVel: 74,
  latAtaAtaqueMedia: 72,
  ataLatDribleVel: 74,
  paraAcChuteOuCabeca: 74,
  meiAtaChuteOuPasse: 74,
  latMeiPasse: 74,
  meiLatVel: 74,
};

function media(...ns) {
  return ns.reduce((s, n) => s + n, 0) / ns.length;
}

function temParidadeOvr(natural, escalada, m, opts = {}) {
  if (natural === escalada) return true;
  const colAsa =
    opts.col === 0 || opts.col === 1 || opts.col === 3 || opts.col === 4;
  if (
    (natural === 'VOL' && escalada === 'MEI') ||
    (natural === 'MEI' && escalada === 'VOL')
  ) {
    return true;
  }
  if (opts.linhaNatural && opts.linhaEscalada) {
    const asas = new Set(['DEF', 'VOL', 'MC', 'MO', 'ATA']);
    if (
      asas.has(opts.linhaNatural) &&
      asas.has(opts.linhaEscalada) &&
      ((natural === 'LAT' && escalada === 'ATA') ||
        (natural === 'ATA' && escalada === 'LAT') ||
        (natural === 'LAT' && escalada === 'LAT') ||
        (natural === 'ATA' && escalada === 'ATA'))
    ) {
      return true;
    }
  }
  if (
    natural === 'LAT' &&
    escalada === 'ATA' &&
    media(m.chute, m.drible, m.velocidade) >= L.latAtaAtaqueMedia
  ) {
    return true;
  }
  if (natural === 'VOL' && escalada === 'ZAG' && m.defesa >= L.volZagDefesa) return true;
  if (natural === 'ZAG' && escalada === 'VOL' && m.velocidade >= L.zagVolVel) return true;
  if (
    natural === 'ATA' &&
    escalada === 'LAT' &&
    media(m.drible, m.velocidade) >= L.ataLatDribleVel
  ) {
    return true;
  }
  if (
    escalada === 'ATA' &&
    (natural === 'LAT' || natural === 'MEI') &&
    !colAsa &&
    (m.chute >= L.paraAcChuteOuCabeca || m.cabeceio >= L.paraAcChuteOuCabeca)
  ) {
    return true;
  }
  if (
    natural === 'MEI' &&
    escalada === 'ATA' &&
    !colAsa &&
    (m.chute >= L.meiAtaChuteOuPasse || m.passe >= L.meiAtaChuteOuPasse)
  ) {
    return true;
  }
  if (natural === 'LAT' && escalada === 'MEI' && m.passe >= L.latMeiPasse) return true;
  if (natural === 'MEI' && escalada === 'LAT' && m.velocidade >= L.meiLatVel) return true;
  return false;
}

const fraco = { defesa: 50, passe: 50, chute: 50, velocidade: 50, drible: 50, cabeceio: 50 };
const forteDef = { ...fraco, defesa: 80 };
const veloz = { ...fraco, velocidade: 80 };
const ala = { ...fraco, chute: 75, drible: 75, velocidade: 75 };
const finalizador = { ...fraco, chute: 80, cabeceio: 60 };
const passador = { ...fraco, passe: 80 };

// VOL ↔ MC sempre
assert.equal(temParidadeOvr('VOL', 'MEI', fraco), true);
assert.equal(temParidadeOvr('MEI', 'VOL', fraco), true);

// PD profundidade via linhas
assert.equal(
  temParidadeOvr('LAT', 'ATA', fraco, { linhaNatural: 'DEF', linhaEscalada: 'ATA' }),
  true,
);

// LAT→ATA com ataque; sem attrs não (sem linhas)
assert.equal(temParidadeOvr('LAT', 'ATA', ala), true);
assert.equal(temParidadeOvr('LAT', 'ATA', fraco), false);

// VOL→ZAG / ZAG→VOL
assert.equal(temParidadeOvr('VOL', 'ZAG', forteDef), true);
assert.equal(temParidadeOvr('VOL', 'ZAG', fraco), false);
assert.equal(temParidadeOvr('ZAG', 'VOL', veloz), true);

// CA→AE/AD; ST/AE→AC; MC→ST; ME→MC; MC→ME
assert.equal(temParidadeOvr('ATA', 'LAT', ala), true);
assert.equal(temParidadeOvr('LAT', 'ATA', finalizador), true);
assert.equal(temParidadeOvr('MEI', 'ATA', finalizador), true);
assert.equal(temParidadeOvr('MEI', 'ATA', passador), true);
assert.equal(temParidadeOvr('LAT', 'MEI', passador), true);
assert.equal(temParidadeOvr('MEI', 'LAT', veloz), true);

// Crítico sem attrs continua sem paridade
assert.equal(temParidadeOvr('ATA', 'ZAG', fraco), false);
assert.equal(temParidadeOvr('MEI', 'ZAG', fraco), false);

console.log('smoke-affinity-ovr-parity: OK');
console.log('  VOL↔MC, PD depth, LAT/ATA/ZAG/VOL/MEI gates covered');
