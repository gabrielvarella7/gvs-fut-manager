/**
 * Smoke: pipeline de venda multi-dia calibrado (survey 1.000 transferências).
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
import {
  classificarJanelaCalendario,
  classificarTipoNegocio,
  DESFECHO_NEGOCIACAO_PESOS,
  distribuirFasesPipeline,
  sortearDesfechoNegociacao,
  sortearDiasCiclo,
  CICLO_NEGOCIACAO_POR_TIPO,
  veteranoRecusaContratoCurto,
} from '../src/career/transferMarket.ts';

// Exames/assinatura calibrados 1–2 (Parte 3); jogador varia por tipo.
for (let i = 0; i < 40; i++) {
  const rng = () => (i + 0.5) / 40;
  const e = diasExamesMedicos(rng, 'compra_nacional');
  assert.ok(e >= 1 && e <= 2, `exames fora de 1-2: ${e}`);
  const a = diasAssinaturaContrato(rng, 'compra_nacional');
  assert.ok(a >= 1 && a <= 2, `assinatura fora de 1-2: ${a}`);
  const d = diasNegociacaoJogador(rng, 'compra_nacional');
  assert.ok(d >= 1 && d <= 26, `negociacao fora do ciclo nacional: ${d}`);
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

// Veterano 33+ / 12 meses sem luvas +35%.
const vet = veteranoRecusaContratoCurto({ ...jogador, idade: 34 }, 12, 10_000);
assert.equal(vet.recusa, true);

assert.equal(classificarJanelaCalendario('2026-01-15').id, 'inicio_temporada');
assert.equal(classificarJanelaCalendario('2026-03-20').id, 'pos_estaduais');
assert.equal(classificarJanelaCalendario('2026-08-01').id, 'meio_ano');
assert.equal(classificarJanelaCalendario('2026-05-10').id, 'entressafra');
assert.ok(classificarJanelaCalendario('2026-01-15').mediaNoticiasDia > 5);
assert.ok(classificarJanelaCalendario('2026-05-10').mediaNoticiasDia < 1);

const pesos = Object.values(DESFECHO_NEGOCIACAO_PESOS).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(pesos - 1) < 1e-9, `pesos desfecho != 1: ${pesos}`);

const counts = { assinada: 0, recusada_clube: 0, contraproposta: 0, recusada_jogador: 0, melada: 0 };
for (let i = 0; i < 10_000; i++) {
  counts[sortearDesfechoNegociacao(() => i / 10_000)] += 1;
}
assert.ok(counts.assinada > 4000 && counts.assinada < 5300, `assinada ${counts.assinada}`);
assert.ok(counts.recusada_clube > 2000 && counts.recusada_clube < 2800, `clube ${counts.recusada_clube}`);

for (const tipo of Object.keys(CICLO_NEGOCIACAO_POR_TIPO)) {
  const cfg = CICLO_NEGOCIACAO_POR_TIPO[tipo];
  for (let i = 0; i < 30; i++) {
    const d = sortearDiasCiclo(tipo, () => (i + 0.3) / 30);
    assert.ok(d >= cfg.min && d <= cfg.max, `${tipo} dias ${d} fora de ${cfg.min}-${cfg.max}`);
  }
  const fases = distribuirFasesPipeline(tipo, () => 0.4);
  assert.ok(fases.jogador >= 1);
  assert.ok(fases.exames >= 1);
  assert.ok(fases.assinatura >= 1);
}

assert.equal(
  classificarTipoNegocio({ jogador: { ...jogador, time_id: null }, oferta: ofertaBoa }),
  'livre',
);
assert.equal(
  classificarTipoNegocio({ jogador, oferta: { ...ofertaBoa, isEmprestimo: true } }),
  'emprestimo',
);
assert.equal(
  classificarTipoNegocio({
    jogador,
    oferta: { ...ofertaBoa, valorTransferencia: 50_000_000, pagaMultaRescisoria: true },
  }),
  'multa_rescisoria',
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
    tipoNegocio: 'compra_nacional',
    diasFaseJogador: 3,
    diasFaseExames: 2,
    diasFaseAssinatura: 1,
  },
  jogador.nome,
  () => 0,
  jogador,
);
assert.equal(neg.status, 'negociando_jogador');
assert.equal(neg.diasRestantesFase, 3);

// rng alto o bastante para passar do limiar de melada (~0.114) e ainda aceitar o atleta.
const ctx = {
  jogador,
  forcaClubeAtual: 80,
  forcaClubeComprador: 78,
  nomeComprador: 'REM',
  rng: () => 0.2,
};

let steps = 0;
let assinou = false;
while (steps < 30 && !assinou) {
  const r = avancarPipelineVendaPorDia(neg, {
    ...ctx,
    // Na fase do atleta força aceite; nas demais evita melada.
    rng: neg.status === 'negociando_jogador' && (neg.diasRestantesFase ?? 0) <= 1 ? () => 0.01 : () => 0.2,
  });
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
  if (r.tipo === 'melada') {
    assert.fail('não deveria melar com rng=0.2');
  }
  neg = r.neg;
  steps += 1;
}

assert.ok(assinou, 'deveria concluir assinatura');
assert.ok(steps >= 3, `pipeline multi-dia curto demais: ${steps}`);
assert.ok(steps <= 26, `pipeline multi-dia longo demais: ${steps}`);
console.log(`smoke-pipeline-venda: ok (${steps} ticks até assinar)`);
