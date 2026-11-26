import type { PreJogoInfo } from '../../engine/matchStats';
import type { ProbabilidadesResultado } from '../../engine/matchEngine';

type Props = {
  mandanteNome: string;
  visitanteNome: string;
  estadio?: string;
  preJogo: PreJogoInfo;
};

function pollFromProb(p: ProbabilidadesResultado) {
  let vm = Math.round(p.vitoriaMandante * 100);
  let e = Math.round(p.empate * 100);
  let vv = Math.round(p.vitoriaVisitante * 100);
  const soma = vm + e + vv;
  if (soma !== 100) {
    const vals = [
      { k: 'vm' as const, v: vm },
      { k: 'e' as const, v: e },
      { k: 'vv' as const, v: vv },
    ].sort((a, b) => b.v - a.v);
    vals[0].v += 100 - soma;
    for (const x of vals) {
      if (x.k === 'vm') vm = x.v;
      else if (x.k === 'e') e = x.v;
      else vv = x.v;
    }
  }
  return { vm, e, vv };
}

export function MatchPreGame({ mandanteNome, visitanteNome, estadio, preJogo }: Props) {
  const voto = pollFromProb(preJogo.probabilidades);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Antes do jogo</p>
        <h2 className="mt-1 text-lg font-medium text-zinc-100">
          {mandanteNome} <span className="text-zinc-500">x</span> {visitanteNome}
        </h2>
        {estadio && <p className="text-sm text-zinc-400">{estadio}</p>}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Quem vencerá?</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1 text-sm">
            {mandanteNome} {voto.vm}%
          </span>
          <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-sm">
            Empate {voto.e}%
          </span>
          <span className="rounded-full border border-sky-800 bg-sky-950/50 px-3 py-1 text-sm">
            {visitanteNome} {voto.vv}%
          </span>
        </div>
      </div>

      {preJogo.mandoBonus > 1 && (
        <p className="text-xs text-zinc-500">
          Mandante com bônus de mando de campo (+{((preJogo.mandoBonus - 1) * 100).toFixed(0)}%).
        </p>
      )}
    </div>
  );
}