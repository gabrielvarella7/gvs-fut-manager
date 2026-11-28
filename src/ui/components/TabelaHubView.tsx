import React, { useMemo, useState } from 'react';
import {
  DEFINICOES_RANKING_TIMES,
  type CategoriaRankingTime,
  type EstatisticasAcumuladasClube,
} from '../../types/estatisticasEcossistema';
import type { Time } from '../../types/schema';

type SubAbaTabela = 'CLASSIFICACAO' | 'TIMES' | 'JOGADORES';

interface TabelaHubViewProps {
  times: Time[];
  estatisticasClubes: EstatisticasAcumuladasClube[];
  renderizarClassificacao: () => React.ReactNode;
  renderizarRankingJogadores: () => React.ReactNode;
}

export const TabelaHubView: React.FC<TabelaHubViewProps> = ({
  times,
  estatisticasClubes,
  renderizarClassificacao,
  renderizarRankingJogadores,
}) => {
  const [subAbaAtiva, setSubAbaAtiva] = useState<SubAbaTabela>('CLASSIFICACAO');
  const [metricaSelecionada, setMetricaSelecionada] =
    useState<CategoriaRankingTime>('nota_media_sofascore');

  const mapaTimes = useMemo(() => {
    const m = new Map<string, Time>();
    times.forEach((t) => m.set(t.id, t));
    return m;
  }, [times]);

  const definicaoAtual = useMemo(
    () => DEFINICOES_RANKING_TIMES.find((d) => d.chave === metricaSelecionada) || DEFINICOES_RANKING_TIMES[0],
    [metricaSelecionada]
  );

  const rankingTimesCalculado = useMemo(() => {
    const extrairValorBruto = (st: EstatisticasAcumuladasClube): number => {
      const j = Math.max(1, st.jogos_disputados);
      switch (metricaSelecionada) {
        case 'nota_media_sofascore': return st.soma_notas_sofascore / j;
        case 'gols_marcados': return st.gols_marcados;
        case 'gols_sofridos': return st.gols_sofridos;
        case 'grandes_chances': return st.grandes_chances;
        case 'grandes_chances_perdidas': return st.grandes_chances_perdidas;
        case 'distancia_por_partida_km': return st.distancia_total_km / j;
        case 'sprints_por_partida': return st.sprints_totais / j;
        case 'finalizacoes_na_trave': return st.finalizacoes_na_trave;
        case 'cartoes_amarelos': return st.cartoes_amarelos;
        case 'cartoes_vermelhos': return st.cartoes_vermelhos;
        case 'posse_de_bola_pct': return st.soma_posse_pct / j;
        case 'passes_certos': return st.passes_certos / j;
        case 'bolas_longas_certas': return st.bolas_longas_certas / j;
        case 'cruzamentos_certos': return st.cruzamentos_certos / j;
        case 'finalizacoes': return st.finalizacoes / j;
        case 'finalizacoes_no_gol': return st.finalizacoes_no_gol / j;
        case 'dribles_certos': return st.dribles_certos / j;
        case 'desarmes': return st.desarmes / j;
        case 'interceptacoes': return st.interceptacoes / j;
        case 'cortes': return st.cortes / j;
        case 'escanteios': return st.escanteios / j;
        case 'faltas': return st.faltas / j;
        case 'gols_de_penalti': return st.gols_de_penalti;
        case 'penaltis_concedidos': return st.penaltis_concedidos;
        case 'jogos_sem_sofrer_gols': return st.jogos_sem_sofrer_gols;
        case 'xg': return st.xg;
        case 'xgot': return st.xgot;
        case 'xa': return st.xa;
        case 'gols_evitados': return st.gols_evitados;
        case 'acoes_com_a_bola': return st.acoes_com_a_bola / j;
        case 'passes_decisivos': return st.passes_decisivos / j;
        case 'contribuicoes_defensivas': return st.contribuicoes_defensivas / j;
      }
    };

    return estatisticasClubes
      .map((st) => ({
        time: mapaTimes.get(st.time_id),
        jogos: st.jogos_disputados,
        valor: extrairValorBruto(st),
      }))
      .filter((item) => Boolean(item.time))
      .sort((a, b) => b.valor - a.valor);
  }, [estatisticasClubes, metricaSelecionada, mapaTimes]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex border-b border-slate-700 bg-slate-900 rounded-t-xl overflow-hidden">
        {(
          [
            { id: 'CLASSIFICACAO', label: 'Classificação' },
            { id: 'TIMES', label: 'Times' },
            { id: 'JOGADORES', label: 'Jogadores' },
          ] as const
        ).map((aba) => {
          const ativa = subAbaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setSubAbaAtiva(aba.id)}
              className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 cursor-pointer ${
                ativa
                  ? 'text-sky-400 border-sky-400 bg-slate-800/70'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {aba.label}
            </button>
          );
        })}
      </div>

      {subAbaAtiva === 'CLASSIFICACAO' && renderizarClassificacao()}

      {subAbaAtiva === 'TIMES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-white">
              Melhores equipes — Estatísticas da Temporada
            </h2>

            <select
              value={metricaSelecionada}
              onChange={(e) => setMetricaSelecionada(e.target.value as CategoriaRankingTime)}
              className="bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-sky-400"
            >
              {DEFINICOES_RANKING_TIMES.map((def) => (
                <option key={def.chave} value={def.chave}>
                  {def.label}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-800">
            {rankingTimesCalculado.map((item, idx) => (
              <div
                key={item.time!.id}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/40 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-slate-400">{idx + 1}.</span>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/30"
                    style={{ backgroundColor: item.time!.cor_primaria }}
                  />
                  <span className="text-sm font-bold text-slate-100">{item.time!.nome}</span>
                  <span className="text-xs text-slate-500">({item.jogos} J)</span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${
                    metricaSelecionada === 'nota_media_sofascore'
                      ? item.valor >= 7.0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-sky-300 border border-slate-700'
                  }`}
                >
                  {item.valor.toFixed(definicaoAtual.casasDecimais)}
                  {definicaoAtual.sufixo || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subAbaAtiva === 'JOGADORES' && renderizarRankingJogadores()}
    </div>
  );
};
