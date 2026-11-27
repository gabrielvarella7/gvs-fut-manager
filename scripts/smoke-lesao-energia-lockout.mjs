/**
 * Smoke: lesão (contusão+) + energia < 60% → não pode jogar.
 * Uso: node scripts/smoke-lesao-energia-lockout.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Pure logic mirror (kept in sync with aptidaoEscalacao.ts)
const ENERGIA_MINIMA_COM_LESAO = 60;
function temLesaoAtiva(j) {
  return Boolean(j.lesao && j.lesao.diasRestantes > 0);
}
function bloqueadoPorLesaoComEnergiaBaixa(j) {
  return temLesaoAtiva(j) && (j.energia ?? 0) < ENERGIA_MINIMA_COM_LESAO;
}
function jogadorPodeJogar(j) {
  return !bloqueadoPorLesaoComEnergiaBaixa(j);
}
function sanitizarAlinhamento11(elenco, ids) {
  const porId = new Map(elenco.map((j) => [j.id, j]));
  const usados = new Set();
  const next = [];
  const banco = () =>
    elenco.filter((j) => !usados.has(j.id) && jogadorPodeJogar(j)).sort((a, b) => b.overall - a.overall);
  for (const id of ids.slice(0, 11)) {
    const j = porId.get(id);
    if (j && jogadorPodeJogar(j) && !usados.has(j.id)) {
      next.push(j.id);
      usados.add(j.id);
      continue;
    }
    const sub = banco()[0];
    if (sub) {
      next.push(sub.id);
      usados.add(sub.id);
    }
  }
  return next;
}

const saudavel = { id: 1, nome: 'A', energia: 90, overall: 80, lesao: null };
const lesionadoFresco = {
  id: 2,
  nome: 'B',
  energia: 75,
  overall: 82,
  lesao: { diasRestantes: 5, gravidade: 'LEVE', descricao: 'contusão muscular' },
};
const lesionadoCansado = {
  id: 3,
  nome: 'C',
  energia: 55,
  overall: 85,
  lesao: { diasRestantes: 8, gravidade: 'LEVE', descricao: 'contusão muscular' },
};
const cansadoSemLesao = { id: 4, nome: 'D', energia: 40, overall: 78, lesao: null };

assert.equal(jogadorPodeJogar(saudavel), true);
assert.equal(jogadorPodeJogar(lesionadoFresco), true); // lesão mas energia ≥60
assert.equal(jogadorPodeJogar(lesionadoCansado), false); // AND
assert.equal(jogadorPodeJogar(cansadoSemLesao), true); // sem lesão

const elenco = [saudavel, lesionadoFresco, lesionadoCansado, cansadoSemLesao];
const limpo = sanitizarAlinhamento11(elenco, [3, 1, 2, 4]);
assert.ok(!limpo.includes(3), 'lesionado+energia baixa removido do XI');
assert.ok(limpo.includes(1));

console.log('smoke-lesao-energia-lockout: OK');
void createRequire;
