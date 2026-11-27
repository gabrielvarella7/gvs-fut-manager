/**
 * Smoke: pipeline de venda multi-dia (negociar 3–7 → exames 2–4 → assinar 1–3).
 * Uso: npx tsx scripts/smoke-pipeline-venda.mjs
 */
import assert from 'node:assert/strict';
import {
  diasNegociacaoJogador,
  diasExamesMedicos,
  diasAssinaturaContrato,
  avaliarDecisaoSaidaJogador,
  iniciarFaseNegociacaoJogador,
  avancarPipelineVendaPorDia,
  noticiaAssinouContrato,
} from '../src/career/pipelineVenda.ts';

for (let i = 0; i < 40; i++) {
  const d = diasNegociacaoJogador(() => i / 40);
  assert.ok(d >= 3 && d <= 7, `negociacao fora de 3-7: ${d}`);
  const e = diasExamesMedicos(() => i / 40);
  assert.ok(e >= 2 && e <= 4, `exames fora de 2-4: ${e}`);
  const a = diasAssinaturaContrato(() => i / 40);
  assert.ok(a >= 1 && a <= 3, `assinatura fora de 1-3: ${a}`);
}

const jogador = {
  id: 1,
  nome: 'Teste Silva',
  overall: 78,
  idade: 27,
  posicao: 'MEI',
  time_id: 'FLA',
  salario_mensal: 100_000,
  contrato: {
    salario_clt_mensal: 70_000,
    direito_imagem_mensal: 30_000,
    duracao_meses: 36,
    meses_restantes: 24,
    percentual_direitos_clube: 100,
    multa_nacional: 50_000_000,
    multa_internacional: 80_000_000,
    meses_no_clube: 12,
  },
};

const ofertaBoa = {
  valorTransferencia: 20_000_000,
  percentualDireitos: 100,
  salarioCltMensal: 90_000,
  direitoImagemMensal: 40_000,
  luvas: 200_000,
  duracaoMeses: 36,
};

assert.equal(
  avaliarDecisaoSaidaJogador({
    jogador,
    forcaClubeAtual: 80,
    forcaClubeComprador: 82,
    oferta: ofertaBoa,
    tendencia: 80,
    rng: () => 0.01,
  }).aceita,
  true,
);

assert.equal(
  avaliarDecisaoSaidaJogador({
    jogador,
    forcaClubeAtual: 85,
    forcaClubeComprador: 60,
    oferta: {
      ...ofertaBoa,
      salarioCltMensal: 50_000,
      direitoImagemMensal: 20_000,
    },
    tendencia: 40,
    rng: () => 0.99,
  }).aceita,
  false,
);

let neg = iniciarFaseNegociacaoJogador(
  {
    id: 'neg_1',
    tipo: 'venda',
    jogadorId: 1,
    timeVendedorId: 'FLA',
    timeCompradorId: 'REM',
    ofertaAtual: ofertaBoa,
    contraOfertaClube: ofertaBoa,
    contraOfertaJogador: null,
    status: 'aguardando_jogador',
    mensagem: '',
    atualizadoEm: new Date().toISOString(),
    tendenciaAceitarSaida: 85,
  },
  jogador.nome,
  () => 0,
);
assert.equal(neg.status, 'negociando_jogador');
assert.equal(neg.diasRestantesFase, 3);

const ctx = {
  jogador,
  forcaClubeAtual: 80,
  forcaClubeComprador: 78,
  nomeComprador: 'REM',
  rng: () => 0.01,
};

let steps = 0;
let assinou = false;
while (steps < 20 && !assinou) {
  const r = avancarPipelineVendaPorDia(neg, ctx);
  assert.ok(r, 'pipeline deveria avançar');
  if (r.tipo === 'pronta_para_assinar') {
    assinou = true;
    const noticia = noticiaAssinouContrato(jogador.nome, 'REM', '2026-11-27');
    assert.equal(noticia.titulo, 'Assinou contrato');
    assert.match(noticia.texto, /assinou contrato/i);
    break;
  }
  if (r.tipo === 'recusada') {
    assert.fail('não deveria recusar com rng baixo e salário alto');
  }
  neg = r.neg;
  steps += 1;
}

assert.ok(assinou, 'deveria concluir assinatura');
assert.ok(steps >= 5, `pipeline multi-dia curto demais: ${steps}`);
assert.ok(steps <= 14, `pipeline multi-dia longo demais: ${steps}`);

console.log(`smoke-pipeline-venda: ok (${steps} ticks até assinar)`);
