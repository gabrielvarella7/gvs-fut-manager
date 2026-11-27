/**
 * Smoke: regras de cartão + médias pré-jogo.
 * Run: node scripts/smoke-prejogo-stats.mjs
 */
import assert from 'node:assert/strict';

// --- disciplina (inline mirror of career/disciplinaCartoes rules) ---
const AMARELOS_PARA_SUSPENSAO = 3;

function classificarCartoesNaPartida(lancamentos, jogadorId) {
  const cartoes = lancamentos.filter(
    (l) => l.tipo === 'cartao_amarelo' && l.jogadorId === jogadorId,
  );
  if (cartoes.length === 0) return { amarelos: 0, vermelho: false };
  const expulso =
    cartoes.length >= 2 ||
    cartoes.some((c) => c.expulsao === true || /expuls[aã]o/i.test(c.texto));
  if (expulso) return { amarelos: 0, vermelho: true };
  return { amarelos: cartoes.length, vermelho: false };
}

function aplicarCartoes(disciplina, desempenho) {
  const next = { ...disciplina };
  for (const d of desempenho) {
    const e = { ...(next[d.jogadorId] ?? { amarelos: 0, jogosSuspenso: 0 }) };
    if (d.amarelos > 0) {
      e.amarelos += d.amarelos;
      while (e.amarelos >= AMARELOS_PARA_SUSPENSAO) {
        e.amarelos -= AMARELOS_PARA_SUSPENSAO;
        e.jogosSuspenso += 1;
      }
    }
    if (d.vermelho) e.jogosSuspenso += 1;
    next[d.jogadorId] = e;
  }
  return next;
}

// 1 amarelo conta
{
  const c = classificarCartoesNaPartida(
    [{ tipo: 'cartao_amarelo', jogadorId: 1, texto: 'Advertido' }],
    1,
  );
  assert.equal(c.amarelos, 1);
  assert.equal(c.vermelho, false);
}

// 2 amarelos = vermelho, zeram amarelos da partida
{
  const c = classificarCartoesNaPartida(
    [
      { tipo: 'cartao_amarelo', jogadorId: 2, texto: 'Amarelo' },
      { tipo: 'cartao_amarelo', jogadorId: 2, texto: 'Expulsão — segundo', expulsao: true },
    ],
    2,
  );
  assert.equal(c.amarelos, 0);
  assert.equal(c.vermelho, true);
}

// vermelho direto via flag
{
  const c = classificarCartoesNaPartida(
    [{ tipo: 'cartao_amarelo', jogadorId: 3, texto: 'Expulsão', expulsao: true }],
    3,
  );
  assert.equal(c.amarelos, 0);
  assert.equal(c.vermelho, true);
}

// 3 amarelos isolados → suspensão
{
  let disc = {};
  disc = aplicarCartoes(disc, [{ jogadorId: 10, amarelos: 1, vermelho: false }]);
  disc = aplicarCartoes(disc, [{ jogadorId: 10, amarelos: 1, vermelho: false }]);
  disc = aplicarCartoes(disc, [{ jogadorId: 10, amarelos: 1, vermelho: false }]);
  assert.equal(disc[10].amarelos, 0);
  assert.equal(disc[10].jogosSuspenso, 1);
}

// vermelho → 1 jogo fora
{
  const disc = aplicarCartoes({}, [{ jogadorId: 11, amarelos: 0, vermelho: true }]);
  assert.equal(disc[11].jogosSuspenso, 1);
}

// média simples
{
  const partidas = [
    {
      mandanteId: 'a',
      visitanteId: 'b',
      estatisticas: {
        mandante: { possePercent: 60, xg: 2, finalizacoes: 10, defesasGoleiro: 2, escanteios: 4, faltas: 8, passes: 200, desarmes: 10 },
        visitante: { possePercent: 40, xg: 1, finalizacoes: 5, defesasGoleiro: 4, escanteios: 2, faltas: 12, passes: 150, desarmes: 14 },
      },
    },
    {
      mandanteId: 'c',
      visitanteId: 'a',
      estatisticas: {
        mandante: { possePercent: 55, xg: 1.5, finalizacoes: 8, defesasGoleiro: 3, escanteios: 3, faltas: 9, passes: 180, desarmes: 11 },
        visitante: { possePercent: 45, xg: 1.2, finalizacoes: 6, defesasGoleiro: 1, escanteios: 5, faltas: 10, passes: 220, desarmes: 9 },
      },
    },
  ];
  const doTime = partidas.filter((p) => p.mandanteId === 'a' || p.visitanteId === 'a');
  let posse = 0;
  for (const p of doTime) {
    const lado = p.mandanteId === 'a' ? p.estatisticas.mandante : p.estatisticas.visitante;
    posse += lado.possePercent;
  }
  assert.equal(Math.round(posse / doTime.length), 53); // (60+45)/2
}

console.log('smoke-prejogo-stats: OK');
