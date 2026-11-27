/**
 * Smoke: substituição reserva/elenco → slot (e titular → banco) sem desfazer no "click" fantasma.
 * Espelha a lógica de aplicarSubstituicao em TacticsScreen + limiar de arrasto do painel.
 */
import assert from 'node:assert/strict';

const RESERVAS_PARTIDA = 11;
const LIMIAR_ARRASTO_PX = 8;

function aplicarSubstituicaoSlots(slotIds, bancoIds, slot, jogadorId) {
  const next = [...slotIds];
  const outroSlot = next.indexOf(jogadorId);
  const saida = next[slot];
  next[slot] = jogadorId;
  if (outroSlot >= 0 && outroSlot !== slot) next[outroSlot] = saida;
  let banco = bancoIds.filter((id) => id !== jogadorId);
  if (saida && saida > 0 && !next.includes(saida) && !banco.includes(saida)) {
    if (banco.length < RESERVAS_PARTIDA) banco = [...banco, saida];
  }
  return { slotIds: next, bancoIds: banco };
}

/**
 * Bug antigo: após drop, o click no item do elenco chamava toggleBanco com
 * slotIds/banco da renderização anterior e persistia o alinhamento velho.
 */
function persistAposClickFantasma(slotIdsStale, bancoIdsAposDrop, jogadorId) {
  if (slotIdsStale.includes(jogadorId)) {
    return { alinhamento11: slotIdsStale, banco11: bancoIdsAposDrop };
  }
  let banco = bancoIdsAposDrop;
  if (banco.includes(jogadorId)) {
    banco = banco.filter((id) => id !== jogadorId);
  } else if (banco.length < RESERVAS_PARTIDA) {
    banco = [...banco, jogadorId];
  }
  // persistirLineup(slotIds, next, ...) usava slotIds stale
  return { alinhamento11: slotIdsStale, banco11: banco };
}

function deveIgnorarClickAposArrasto(dx, dy) {
  return Math.hypot(dx, dy) >= LIMIAR_ARRASTO_PX;
}

const titulares = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const banco = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

// Reserva 12 entra no slot 0; titular 1 vai ao banco.
const aposDrop = aplicarSubstituicaoSlots(titulares, banco, 0, 12);
assert.equal(aposDrop.slotIds[0], 12);
assert.ok(aposDrop.bancoIds.includes(1));
assert.ok(!aposDrop.bancoIds.includes(12));
assert.equal(aposDrop.slotIds.length, 11);

const persistBug = persistAposClickFantasma(titulares, aposDrop.bancoIds, 12);
assert.equal(
  persistBug.alinhamento11[0],
  1,
  'click fantasma persistia titular antigo no slot 0',
);
assert.notEqual(persistBug.alinhamento11[0], 12);

// Com limiar de arrasto, o click após drag é ignorado — lineup do drop permanece.
assert.equal(deveIgnorarClickAposArrasto(40, 120), true);
assert.equal(deveIgnorarClickAposArrasto(2, 2), false);

const persistOk = deveIgnorarClickAposArrasto(40, 120)
  ? { alinhamento11: aposDrop.slotIds, banco11: aposDrop.bancoIds }
  : persistAposClickFantasma(titulares, aposDrop.bancoIds, 12);
assert.equal(persistOk.alinhamento11[0], 12);
assert.ok(persistOk.banco11.includes(1));

// Campo → banco: titular volta, reserva sai do XI.
const volta = aplicarSubstituicaoSlots(aposDrop.slotIds, aposDrop.bancoIds, 0, 1);
assert.equal(volta.slotIds[0], 1);
assert.ok(volta.bancoIds.includes(12));
assert.ok(!volta.bancoIds.includes(1));

console.log('smoke-lineup-elenco-campo: ok');
