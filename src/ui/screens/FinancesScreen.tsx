import { rotuloTendencia } from '../../data/perfilComercialDinamico';
import { resolverPerfilComercial, rotuloModeloGestao } from '../../data/perfilComercialClubes';
import { totalReceitasHistorico } from '../../career/financasMensais';
import { formatarDinheiro } from '../../career/playerUtils';
import type { LancamentoContabil } from '../../types/schema';
import type { PoliticaIngressos } from '../../types/commercial';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

const ROTULO_CATEGORIA: Record<LancamentoContabil['categoria'], string> = {
  BILHETERIA: 'Bilheteria',
  DIREITOS_TV: 'Direitos TV',
  PATROCINIO: 'Patrocínio',
  SOCIO_TORCEDOR: 'Sócio-torcedor',
  VENDA_ATLETA: 'Venda de atleta',
  FOLHA_CLT_ENCARGOS: 'Folha CLT + encargos',
  DIREITOS_IMAGEM: 'Direitos de imagem',
  OPERACAO_ESTADIO_CT: 'Operação (estádio/CT)',
  COMPRA_ATLETA_LUVAS: 'Compra (taxa + luvas)',
  RESCISAO_CONTRATUAL: 'Rescisão contratual',
};

const ROTULO_POLITICA: Record<PoliticaIngressos, string> = {
  POPULAR: 'Popular',
  EQUILIBRADO: 'Equilibrado',
  ELITIZADO: 'Elitizado',
};

export function FinancesScreen() {
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);
  const financas = useGameStore((s) => s.financas);
  const comercial = useGameStore((s) => s.comercial);
  const definirPoliticaIngressos = useGameStore((s) => s.definirPoliticaIngressos);
  const aceitarPropostaTvComercial = useGameStore((s) => s.aceitarPropostaTvComercial);
  const recusarPropostaTvComercial = useGameStore((s) => s.recusarPropostaTvComercial);
  const aceitarPropostaPatrocinioComercial = useGameStore((s) => s.aceitarPropostaPatrocinioComercial);
  const recusarPropostaPatrocinioComercial = useGameStore((s) => s.recusarPropostaPatrocinioComercial);

  const clube = timesReais.find((t) => t.id === clubeRealId);
  const perfilClube = clube ? resolverPerfilComercial(clube) : null;

  if (!clubeRealId || !financas) {
    return (
      <CmCareerShell titulo="Finanças" subtitulo="Carreira profissional">
        <CmPanel>
          <p className="text-sm text-zinc-400">Finanças disponíveis após assinar com um clube da Série A.</p>
        </CmPanel>
      </CmCareerShell>
    );
  }

  const receitas = financas.lancamentos.filter((l) => l.tipo === 'RECEITA');
  const totalRec = totalReceitasHistorico(financas);
  const ind = comercial?.indicadores;

  return (
    <CmCareerShell
      titulo="Finanças do clube"
      subtitulo={`${clube?.nome_completo ?? 'Clube'} · Caixa ${formatarDinheiro(financas.saldo_caixa)}`}
    >
      {financas.salarios_atrasados && (
        <CmPanel className="mb-4 border-rose-900/60 bg-rose-950/30">
          <p className="text-sm text-rose-200">
            Alerta: caixa negativo — risco de atraso salarial (impacta patrocínios e propostas).
          </p>
        </CmPanel>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CmPanel>
          <p className="text-xs text-zinc-500">Caixa</p>
          <p className="text-xl font-semibold text-emerald-300">{formatarDinheiro(financas.saldo_caixa)}</p>
        </CmPanel>
        <CmPanel>
          <p className="text-xs text-zinc-500">TV / mês</p>
          <p className="text-lg text-zinc-100">{formatarDinheiro(financas.receita_tv_mensal)}</p>
          {comercial?.contratoTvAtivo && (
            <p className="mt-1 text-xs text-zinc-500">
              {comercial.contratoTvAtivo.emissora} · {comercial.contratoTvAtivo.mesesRestantes} meses
              restantes
            </p>
          )}
          {comercial?.contratoTvSucessor && (
            <p className="mt-1 text-xs text-emerald-500/90">
              Renovação: {comercial.contratoTvSucessor.emissora} (após o vigente)
            </p>
          )}
        </CmPanel>
        <CmPanel>
          <p className="text-xs text-zinc-500">Patrocínio / mês</p>
          <p className="text-lg text-zinc-100">{formatarDinheiro(financas.receita_patrocinio_mensal)}</p>
          {comercial && comercial.patrociniosAtivos.length > 0 && (
            <p className="mt-1 text-xs text-zinc-500">{comercial.patrociniosAtivos.length} contrato(s) ativo(s)</p>
          )}
        </CmPanel>
        <CmPanel>
          <p className="text-xs text-zinc-500">Sócio / mês</p>
          <p className="text-lg text-zinc-100">{formatarDinheiro(financas.receita_socio_base_mensal)}</p>
          {comercial && (
            <p className="mt-1 text-xs text-zinc-500">
              {comercial.sociosTorcedor.baseAtiva.toLocaleString('pt-BR')} ativos · churn {comercial.sociosTorcedor.churnMesAnterior.toFixed(1)}%
            </p>
          )}
        </CmPanel>
      </div>

      {comercial && ind && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Pilares comerciais (GDD 04)
          </h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CmPanel>
              <p className="text-xs text-zinc-500">Hype mídia</p>
              <p className="text-lg text-zinc-100">{ind.hype_midia}</p>
            </CmPanel>
            <CmPanel>
              <p className="text-xs text-zinc-500">Humor torcida</p>
              <p className="text-lg text-zinc-100">{ind.humor_torcida}</p>
            </CmPanel>
            <CmPanel>
              <p className="text-xs text-zinc-500">Estabilidade gestão</p>
              <p className="text-lg text-zinc-100">{ind.estabilidade_gestao}</p>
            </CmPanel>
            <CmPanel>
              <p className="text-xs text-zinc-500">Apelo elenco / entretenimento</p>
              <p className="text-lg text-zinc-100">
                {ind.apelo_elenco} / {ind.indice_entretenimento}
              </p>
            </CmPanel>
          </div>

          {perfilClube && (
            <CmPanel className="mb-4 text-xs text-zinc-400">
              <p>
                <span className="text-zinc-500">Perfil do clube · </span>
                {rotuloModeloGestao(perfilClube.modelo_gestao)} · estádio{' '}
                {perfilClube.capacidade_estadio.toLocaleString('pt-BR')} lugares
              </p>
              {comercial.dimensoes ? (
                <p className="mt-2">
                  <span className="text-amber-200/90">{rotuloTendencia(comercial.dimensoes.tendencia)}</span>
                  {' · '}
                  marcas {comercial.dimensoes.prestigio_marca} (base{' '}
                  {comercial.dimensoes.prestigio_base}) · torcida {comercial.dimensoes.indice_torcida} (base{' '}
                  {comercial.dimensoes.indice_torcida_base}) · desempenho{' '}
                  {comercial.dimensoes.desempenho_recente} (base {comercial.dimensoes.desempenho_base})
                </p>
              ) : (
                <p className="mt-2">
                  Torcida {perfilClube.indice_torcida}/100 · desempenho recente{' '}
                  {perfilClube.desempenho_recente}/100
                </p>
              )}
              {comercial.dimensoes?.nota_mercado && (
                <p className="mt-1 text-zinc-500">{comercial.dimensoes.nota_mercado}</p>
              )}
            </CmPanel>
          )}

          <CmPanel className="mb-4">
            <p className="mb-2 text-sm font-medium text-zinc-200">Política de ingressos (bilheteria em casa)</p>
            <div className="flex flex-wrap gap-2">
              {(['POPULAR', 'EQUILIBRADO', 'ELITIZADO'] as PoliticaIngressos[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => definirPoliticaIngressos(p)}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    comercial.politicaIngressosPadrao === p
                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200'
                      : 'border-zinc-600 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {ROTULO_POLITICA[p]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Aplica-se a todos os jogos em casa: afeta público, margem líquida e bônus de fator casa.
            </p>
          </CmPanel>

          {(comercial.propostasTvPendentes.length > 0 ||
            comercial.propostasPatrocinioPendentes.length > 0) && (
            <div className="mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Propostas pendentes</h3>
              {comercial.propostasTvPendentes.map((p) => (
                <CmPanel key={p.id}>
                  <p className="font-medium text-zinc-100">{p.emissora}</p>
                  <p className="text-xs text-zinc-500">
                    {p.temporadas} ano(s) · {p.modelo === 'COTA_FIXA_GARANTIDA' ? 'Cota fixa' : 'Cota variável'} ·{' '}
                    {formatarDinheiro(p.cotaMensal)}/mês
                    {p.efeito === 'POS_ENCERRAMENTO' && (
                      <span className="text-amber-400"> · início após contrato atual</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{p.textoResumo}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-600"
                      onClick={() => aceitarPropostaTvComercial(p.id)}
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-300"
                      onClick={() => recusarPropostaTvComercial(p.id)}
                    >
                      Recusar
                    </button>
                  </div>
                </CmPanel>
              ))}
              {comercial.propostasPatrocinioPendentes.map((p) => {
                const bloqueado = ind.estabilidade_gestao < p.exigeEstabilidadeMin;
                return (
                  <CmPanel key={p.id}>
                    <p className="font-medium text-zinc-100">{p.empresa}</p>
                    <p className="text-xs text-zinc-500">
                      {Math.round(p.mesesDuracao / 12)} ano(s) ({p.mesesDuracao} meses) ·{' '}
                      {formatarDinheiro(p.valorMensal)}/mês · luvas{' '}
                      {formatarDinheiro(p.luvasAssinatura)}
                      {p.efeito === 'POS_ENCERRAMENTO' && (
                        <span className="text-amber-400"> · vigência após contrato do slot</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{p.textoResumo}</p>
                    {bloqueado && (
                      <p className="mt-1 text-xs text-amber-400">
                        Estabilidade de gestão insuficiente (mín. {p.exigeEstabilidadeMin}).
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={bloqueado}
                        className="rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-600 disabled:opacity-40"
                        onClick={() => aceitarPropostaPatrocinioComercial(p.id)}
                      >
                        Aceitar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-300"
                        onClick={() => recusarPropostaPatrocinioComercial(p.id)}
                      >
                        Recusar
                      </button>
                    </div>
                  </CmPanel>
                );
              })}
            </div>
          )}
        </>
      )}

      <CmPanel className="mb-4">
        <p className="text-xs text-zinc-500">Total receitas (histórico)</p>
        <p className="text-lg text-sky-300">{formatarDinheiro(totalRec)}</p>
      </CmPanel>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">Receitas</h2>
      {receitas.length === 0 ? (
        <CmPanel>
          <p className="text-sm text-zinc-500">
            Fechamento a cada 4 rodadas credita TV, patrocínio e sócio-torcedor. Jogos em casa geram bilheteria
            (matchday).
          </p>
        </CmPanel>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
          {receitas.map((r, i) => (
            <li key={`${r.categoria}_${r.rodada}_${i}`} className="flex justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block text-zinc-100">{r.descricao}</span>
                <span className="text-xs text-zinc-500">
                  {ROTULO_CATEGORIA[r.categoria]} · rod. {r.rodada || '—'} · mês {r.mes}
                </span>
              </span>
              <span className="font-semibold text-emerald-300">+{formatarDinheiro(r.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </CmCareerShell>
  );
}