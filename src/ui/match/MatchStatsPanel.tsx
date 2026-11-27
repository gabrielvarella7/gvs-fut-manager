import { useMemo, useState } from 'react';
import type { EstatisticasTime, PeriodoEstatisticas } from '../../engine/matchStats';
import { PossessionBar, StatBar } from './StatBar';

type Props = {
  mandante: EstatisticasTime;
  visitante: EstatisticasTime;
  mandanteNome: string;
  visitanteNome: string;
  /** Quando informado, o painel filtra 1º/2º via callback externo (MatchCenter). */
  periodo?: PeriodoEstatisticas;
  onPeriodo?: (p: PeriodoEstatisticas) => void;
};

const PERIODOS: { id: PeriodoEstatisticas; label: string }[] = [
  { id: 'todos', label: 'TODOS' },
  { id: '1', label: '1º' },
  { id: '2', label: '2º' },
];

function fmtXg(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function MatchStatsPanel({
  mandante,
  visitante,
  mandanteNome,
  visitanteNome,
  periodo: periodoControlado,
  onPeriodo,
}: Props) {
  const [periodoLocal, setPeriodoLocal] = useState<PeriodoEstatisticas>('todos');
  const periodo = periodoControlado ?? periodoLocal;
  const setPeriodo = onPeriodo ?? setPeriodoLocal;

  const finForaM = Math.max(0, mandante.finalizacoes - mandante.finalizacoesNoGol);
  const finForaV = Math.max(0, visitante.finalizacoes - visitante.finalizacoesNoGol);
  // Chutes defendidos = defesas do goleiro adversário
  const chutesDefM = visitante.defesasGoleiro;
  const chutesDefV = mandante.defesasGoleiro;

  const dentroFora = useMemo(() => {
    const split = (fin: number, noGol: number) => {
      const dentro = Math.min(fin, Math.round(fin * 0.62 + noGol * 0.15));
      return { dentro, fora: Math.max(0, fin - dentro) };
    };
    return {
      m: split(mandante.finalizacoes, mandante.finalizacoesNoGol),
      v: split(visitante.finalizacoes, visitante.finalizacoesNoGol),
    };
  }, [mandante.finalizacoes, mandante.finalizacoesNoGol, visitante.finalizacoes, visitante.finalizacoesNoGol]);

  return (
    <div className="space-y-3">
      <div
        className="inline-flex rounded-full border border-zinc-700/80 bg-zinc-950/80 p-0.5"
        role="tablist"
        aria-label="Período das estatísticas"
      >
        {PERIODOS.map((p) => {
          const ativo = periodo === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setPeriodo(p.id)}
              className={`min-w-[3.25rem] rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                ativo
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
          <h3 className="mb-1 text-sm font-semibold text-zinc-100">Visão geral da partida</h3>
          <PossessionBar
            mandante={mandante.possePercent}
            visitante={visitante.possePercent}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Gols esperados (xG)"
            mandante={fmtXg(mandante.xg)}
            visitante={fmtXg(visitante.xg)}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
            max={Math.max(mandante.xg, visitante.xg, 0.01)}
          />
          <StatBar
            label="Finalizações"
            mandante={mandante.finalizacoes}
            visitante={visitante.finalizacoes}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Defesas do goleiro"
            mandante={mandante.defesasGoleiro}
            visitante={visitante.defesasGoleiro}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Escanteios"
            mandante={mandante.escanteios}
            visitante={visitante.escanteios}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Faltas"
            mandante={mandante.faltas}
            visitante={visitante.faltas}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Passes"
            mandante={mandante.passes}
            visitante={visitante.passes}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Desarmes"
            mandante={mandante.desarmes}
            visitante={visitante.desarmes}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
        </section>

        <section className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-4">
          <h3 className="mb-1 text-sm font-semibold text-zinc-100">Finalizações</h3>
          <StatBar
            label="Finalizações"
            mandante={mandante.finalizacoes}
            visitante={visitante.finalizacoes}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Finalizações no gol"
            mandante={mandante.finalizacoesNoGol}
            visitante={visitante.finalizacoesNoGol}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Gols esperados (xG)"
            mandante={fmtXg(mandante.xg)}
            visitante={fmtXg(visitante.xg)}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
            max={Math.max(mandante.xg, visitante.xg, 0.01)}
          />
          <StatBar
            label="Finalizações para fora"
            mandante={finForaM}
            visitante={finForaV}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Chutes defendidos"
            mandante={chutesDefM}
            visitante={chutesDefV}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Finalizações de dentro da área"
            mandante={dentroFora.m.dentro}
            visitante={dentroFora.v.dentro}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <StatBar
            label="Finalizações de fora da área"
            mandante={dentroFora.m.fora}
            visitante={dentroFora.v.fora}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
        </section>
      </div>
    </div>
  );
}
