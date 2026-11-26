import type { EstatisticasTime } from '../../engine/matchStats';
import { StatBar } from './StatBar';

type Props = {
  mandante: EstatisticasTime;
  visitante: EstatisticasTime;
  mandanteNome: string;
  visitanteNome: string;
};

export function MatchStatsPanel({ mandante, visitante, mandanteNome, visitanteNome }: Props) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-200">Visão geral da partida</h3>
      <StatBar
        label="Posse de bola"
        mandante={`${mandante.possePercent}`}
        visitante={`${visitante.possePercent}`}
        mandanteNome={mandanteNome}
        visitanteNome={visitanteNome}
        max={100}
        sufixo="%"
      />
      <StatBar
        label="Gols esperados (xG)"
        mandante={mandante.xg}
        visitante={visitante.xg}
        mandanteNome={mandanteNome}
        visitanteNome={visitanteNome}
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
    </div>
  );
}