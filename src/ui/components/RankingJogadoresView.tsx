import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DEFINICOES_RANKING_JOGADORES,
  extrairValorRankingJogador,
  type CategoriaRankingJogador,
  type EstatisticasTemporadaJogador,
} from '../../engine/playerRankingsAndValuation';
import type { Jogador, Time } from '../../types/schema';

interface RankingJogadoresViewProps {
  jogadores: Jogador[];
  times: Time[];
  estatisticasJogadores: EstatisticasTemporadaJogador[];
  rodadaAtual: number;
  onAbrirFichaJogador: (jogador: Jogador) => void;
}

const ITENS_POR_PAGINA = 10;
const LIMITE_TOP = 50;

export const RankingJogadoresView: React.FC<RankingJogadoresViewProps> = ({
  jogadores,
  times,
  estatisticasJogadores,
  rodadaAtual,
  onAbrirFichaJogador,
}) => {
  const [categoria, setCategoria] = useState<CategoriaRankingJogador>('nota_media_sofascore');
  const [pagina, setPagina] = useState<number>(1);

  const mapaJogadores = useMemo(() => {
    const m = new Map<number, Jogador>();
    jogadores.forEach((j) => m.set(j.id, j));
    return m;
  }, [jogadores]);

  const mapaTimes = useMemo(() => {
    const m = new Map<string, Time>();
    times.forEach((t) => m.set(t.id, t));
    return m;
  }, [times]);

  const definicao = useMemo(
    () => DEFINICOES_RANKING_JOGADORES.find((d) => d.chave === categoria) || DEFINICOES_RANKING_JOGADORES[0],
    [categoria]
  );

  const listaTop50 = useMemo(() => {
    const minimoJogos = Math.max(1, Math.floor(rodadaAtual * 0.35));

    return estatisticasJogadores
      .filter((st) => {
        if (st.jogos_disputados < minimoJogos) return false;
        const jog = mapaJogadores.get(st.jogador_id);
        if (!jog) return false;
        if (definicao.apenasGoleiros && jog.posicao !== 'GOL') return false;
        return true;
      })
      .map((st) => {
        const jogador = mapaJogadores.get(st.jogador_id)!;
        const time = mapaTimes.get(jogador.time_id || '');
        const valor = extrairValorRankingJogador(st, categoria);
        return { jogador, time, jogos: st.jogos_disputados, valor };
      })
      .filter(
        (item): item is { jogador: Jogador; time: Time | undefined; jogos: number; valor: number } =>
          item.valor !== null
      )
      .sort((a, b) => (definicao.ordem === 'DESC' ? b.valor - a.valor : a.valor - b.valor))
      .slice(0, LIMITE_TOP);
  }, [estatisticasJogadores, categoria, definicao, mapaJogadores, mapaTimes, rodadaAtual]);

  const totalPaginas = Math.max(1, Math.ceil(listaTop50.length / ITENS_POR_PAGINA));
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const itensPagina = listaTop50.slice(inicio, inicio + ITENS_POR_PAGINA);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white">
            Melhores jogadores — Estatísticas Individuais
          </h2>
          <p className="text-xs text-slate-400">
            Top 3 valoriza automaticamente no mercado de transferências
          </p>
        </div>

        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value as CategoriaRankingJogador);
            setPagina(1);
          }}
          className="bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-sky-400"
        >
          {DEFINICOES_RANKING_JOGADORES.map((def) => (
            <option key={def.chave} value={def.chave}>
              {def.label}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-slate-800">
        {itensPagina.map((item, idx) => {
          const posicaoGeral = inicio + idx + 1;
          const ehTop3 = posicaoGeral <= 3 && definicao.tierValorizacao !== 'NENHUM';

          return (
            <button
              key={item.jogador.id}
              type="button"
              onClick={() => onAbrirFichaJogador(item.jogador)}
              className="w-full flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/50 rounded-lg text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-xs font-bold text-slate-400 shrink-0">{posicaoGeral}</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                  style={{ backgroundColor: item.time?.cor_primaria || '#64748b' }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 truncate">{item.jogador.nome}</span>
                    {ehTop3 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Top {posicaoGeral} ↑$
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.time?.nome_curto || 'LIV'} · {item.jogador.posicao} · {item.jogos} J
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded text-xs font-extrabold shrink-0 ${
                  categoria === 'nota_media_sofascore'
                    ? item.valor >= 7.0
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-sky-300 border border-slate-700'
                }`}
              >
                {item.valor.toFixed(definicao.casasDecimais)}
                {definicao.sufixo || ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          className="p-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span>
          {listaTop50.length === 0
            ? '0 jogadores'
            : `${inicio + 1}-${Math.min(inicio + ITENS_POR_PAGINA, listaTop50.length)} de ${listaTop50.length}`}
        </span>

        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          className="p-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
