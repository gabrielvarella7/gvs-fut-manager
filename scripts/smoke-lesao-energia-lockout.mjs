/**
 * Smoke: lesão (contusão+) + energia < 60% → não pode jogar;
 * Assistente 11+11 também exclui qualquer lesão ativa.
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
/** Assistente: trava manual + qualquer lesão ativa. */
function jogadorAptoAssistente(j) {
  return jogadorPodeJogar(j) && !temLesaoAtiva(j);
}
function filtrarAptosAssistente(elenco) {
  return elenco.filter(jogadorAptoAssistente);
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

/** Espelha escalacaoAssistenteMelhorOverall (filtro + sanitizar + guarda). */
function escalacaoAssistenteMelhorOverall(elenco) {
  const aptos = filtrarAptosAssistente(elenco);
  const bruto = [...aptos].sort((a, b) => b.overall - a.overall).slice(0, 11).map((j) => j.id);
  const limpos = sanitizarAlinhamento11(aptos, bruto);
  const setAptos = new Set(aptos.map((j) => j.id));
  return limpos.filter((id) => setAptos.has(id));
}

function idsBancoPadrao(elenco, titularesIds) {
  const setTit = new Set(titularesIds);
  return [...elenco]
    .filter((j) => !setTit.has(j.id) && jogadorAptoAssistente(j))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11)
    .map((j) => j.id);
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
const estrelaLesionada = {
  id: 5,
  nome: 'E',
  energia: 74,
  overall: 99,
  lesao: { diasRestantes: 3, gravidade: 'LEVE', descricao: 'contusão' },
};

assert.equal(jogadorPodeJogar(saudavel), true);
assert.equal(jogadorPodeJogar(lesionadoFresco), true); // lesão mas energia ≥60
assert.equal(jogadorPodeJogar(lesionadoCansado), false); // AND
assert.equal(jogadorPodeJogar(cansadoSemLesao), true); // sem lesão

assert.equal(jogadorAptoAssistente(saudavel), true);
assert.equal(jogadorAptoAssistente(lesionadoFresco), false); // assistente ignora lesão
assert.equal(jogadorAptoAssistente(lesionadoCansado), false);
assert.equal(jogadorAptoAssistente(estrelaLesionada), false); // OVR alto não importa
assert.equal(jogadorAptoAssistente(cansadoSemLesao), true);

const elenco = [
  saudavel,
  lesionadoFresco,
  lesionadoCansado,
  cansadoSemLesao,
  estrelaLesionada,
  { id: 10, nome: 'F', energia: 100, overall: 77, lesao: null },
  { id: 11, nome: 'G', energia: 100, overall: 76, lesao: null },
  { id: 12, nome: 'H', energia: 100, overall: 75, lesao: null },
  { id: 13, nome: 'I', energia: 100, overall: 74, lesao: null },
  { id: 14, nome: 'J', energia: 100, overall: 73, lesao: null },
  { id: 15, nome: 'K', energia: 100, overall: 72, lesao: null },
  { id: 16, nome: 'L', energia: 100, overall: 71, lesao: null },
  { id: 17, nome: 'M', energia: 100, overall: 70, lesao: null },
  { id: 18, nome: 'N', energia: 100, overall: 69, lesao: null },
  { id: 19, nome: 'O', energia: 100, overall: 68, lesao: null },
  { id: 20, nome: 'P', energia: 100, overall: 67, lesao: null },
  { id: 21, nome: 'Q', energia: 100, overall: 66, lesao: null },
  { id: 22, nome: 'R', energia: 100, overall: 65, lesao: null },
  { id: 23, nome: 'S', energia: 100, overall: 64, lesao: null },
  { id: 24, nome: 'T', energia: 100, overall: 63, lesao: null },
  { id: 25, nome: 'U', energia: 100, overall: 62, lesao: null },
];

const limpo = sanitizarAlinhamento11(elenco, [3, 1, 2, 4]);
assert.ok(!limpo.includes(3), 'lesionado+energia baixa removido do XI');
assert.ok(limpo.includes(1));

const xi = escalacaoAssistenteMelhorOverall(elenco);
assert.ok(!xi.includes(3), 'assistente: lockout lesão+energia');
assert.ok(!xi.includes(2), 'assistente: lesão ativa (energia ≥60) fora');
assert.ok(!xi.includes(5), 'assistente: estrela lesionada (74%) fora');
assert.ok(xi.includes(1), 'assistente: saudável entra');
assert.equal(xi.length, 11);

const banco = idsBancoPadrao(elenco, xi);
assert.ok(!banco.includes(2) && !banco.includes(3) && !banco.includes(5), 'banco sem lesionados');
assert.ok(banco.every((id) => jogadorAptoAssistente(elenco.find((j) => j.id === id))));

console.log('smoke-lesao-energia-lockout: OK');
void createRequire;
