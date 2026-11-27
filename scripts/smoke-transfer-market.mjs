/**
 * Smoke: calibração transferMarket (survey 1.000).
 * Uso: npx tsx scripts/smoke-transfer-market.mjs
 */
import assert from 'node:assert/strict';
import {
  CICLO_NEGOCIACAO_POR_TIPO,
  DESFECHO_NEGOCIACAO_PESOS,
  JANELAS_CALENDARIO_MERCADO,
  classificarJanelaCalendario,
  diasRespostaContraproposta,
  diasRespostaSondagemInicial,
  diasExamesBid,
  distribuirFasesPipeline,
  ehPicoInicioTemporada,
  ehPicoMeioAno,
  emprestimoAceiteRapido,
  sortearDesfechoNegociacao,
  sortearQuantidadeNoticiasDia,
  TEMPO_RESPOSTA_MERCADO,
} from '../src/career/transferMarket.ts';

assert.equal(JANELAS_CALENDARIO_MERCADO.inicio_temporada.mediaNoticiasDia, 7.58);
assert.equal(JANELAS_CALENDARIO_MERCADO.pos_estaduais.mediaNoticiasDia, 3.33);
assert.equal(JANELAS_CALENDARIO_MERCADO.meio_ano.mediaNoticiasDia, 5.81);
assert.equal(JANELAS_CALENDARIO_MERCADO.entressafra.mediaNoticiasDia, 0.68);
assert.equal(JANELAS_CALENDARIO_MERCADO.inicio_temporada.probNoticiaDia, 0.72);
assert.equal(JANELAS_CALENDARIO_MERCADO.entressafra.probNoticiaDia, 0.28);

assert.deepEqual(CICLO_NEGOCIACAO_POR_TIPO.livre, {
  media: 3.4,
  min: 1,
  max: 9,
  pctAte4Dias: 0.82,
});
assert.equal(CICLO_NEGOCIACAO_POR_TIPO.emprestimo.media, 6.2);
assert.equal(CICLO_NEGOCIACAO_POR_TIPO.compra_nacional.media, 11.8);
assert.equal(CICLO_NEGOCIACAO_POR_TIPO.compra_internacional.media, 18.5);
assert.equal(CICLO_NEGOCIACAO_POR_TIPO.multa_rescisoria.media, 1.5);

assert.equal(DESFECHO_NEGOCIACAO_PESOS.assinada, 0.465);
assert.equal(DESFECHO_NEGOCIACAO_PESOS.recusada_clube, 0.24);
assert.equal(DESFECHO_NEGOCIACAO_PESOS.contraproposta, 0.135);
assert.equal(DESFECHO_NEGOCIACAO_PESOS.recusada_jogador, 0.1);
assert.equal(DESFECHO_NEGOCIACAO_PESOS.melada, 0.06);

assert.ok(ehPicoInicioTemporada('2026-02-25'));
assert.ok(!ehPicoInicioTemporada('2026-02-10'));
assert.ok(ehPicoMeioAno('2026-09-01'));
assert.ok(classificarJanelaCalendario('2026-02-25').mediaNoticiasDia >= 12);

for (let i = 0; i < 20; i++) {
  const d0 = diasRespostaSondagemInicial(() => i / 20);
  assert.ok(d0 >= TEMPO_RESPOSTA_MERCADO.sondagemInicialMin && d0 <= TEMPO_RESPOSTA_MERCADO.sondagemInicialMax);
  const d1 = diasRespostaContraproposta(() => i / 20);
  assert.ok(d1 >= 1 && d1 <= 2);
  const d2 = diasExamesBid(() => i / 20);
  assert.ok(d2 >= 1 && d2 <= 2);
}

const qPeak = sortearQuantidadeNoticiasDia('2026-02-25', () => 0.01);
assert.ok(qPeak >= 0 && qPeak <= 4);

const reserva = {
  idade: 26,
  status_escalacao: 'RESERVA',
  suscetibilidade: { indice: 75, camada: 'INSATISFEITO', motivo_principal: 'x' },
  contrato: { salario_clt_mensal: 80_000, direito_imagem_mensal: 20_000 },
  salario_mensal: 100_000,
};
assert.equal(
  emprestimoAceiteRapido(reserva, {
    valorTransferencia: 0,
    percentualDireitos: 0,
    salarioCltMensal: 80_000,
    direitoImagemMensal: 20_000,
    luvas: 0,
    duracaoMeses: 12,
    isEmprestimo: true,
  }),
  true,
);

// Multi-dia mínimo preservado (exceto multa).
for (const tipo of ['livre', 'emprestimo', 'compra_nacional', 'compra_internacional']) {
  const f = distribuirFasesPipeline(tipo, () => 0.1);
  assert.ok(f.jogador + f.exames + f.assinatura >= 3, `${tipo} regressou multi-dia`);
}

const hist = { assinada: 0, recusada_clube: 0, contraproposta: 0, recusada_jogador: 0, melada: 0 };
for (let i = 0; i < 20_000; i++) hist[sortearDesfechoNegociacao(() => (i + 0.5) / 20_000)]++;
assert.ok(Math.abs(hist.assinada / 20_000 - 0.465) < 0.02);
assert.ok(Math.abs(hist.melada / 20_000 - 0.06) < 0.015);

console.log('smoke-transfer-market: ok');
