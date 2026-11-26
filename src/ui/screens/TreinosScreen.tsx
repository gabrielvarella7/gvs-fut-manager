import { useMemo, useState } from 'react';
import { MICROCICLOS } from '../../career/treinos';
import { nivelStaff } from '../../career/staffEfeitos';
import type { MicrocicloTreino } from '../../types/mundoClube';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

export function TreinosScreen() {
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const jogadores = useGameStore((s) => s.jogadoresReais);
  const mundo = useGameStore((s) => s.mundoClube);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const aplicar = useGameStore((s) => s.aplicarTreinoSemana);

  const [plano, setPlano] = useState<MicrocicloTreino>('tatico');
  const [destaques, setDestaques] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const rodada = brasileirao?.rodadaAtual ?? 0;
  const jaTreinou = mundo?.ultimoTreino?.rodadaAplicada === rodada;
  const prep = mundo ? nivelStaff(mundo, 'PREPARADOR_FISICO') : 10;

  const elenco = useMemo(
    () =>
      clubeRealId
        ? [...jogadores.filter((j) => j.time_id === clubeRealId)].sort((a, b) => b.overall - a.overall)
        : [],
    [jogadores, clubeRealId],
  );

  const toggleDestaque = (id: number) => {
    setDestaques((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const executar = () => {
    const err = aplicar(plano, destaques);
    if (err) {
      setFeedback(err);
    } else {
      setFeedback('Treino registrado. Confira o elenco e as notícias.');
      setDestaques([]);
    }
    window.setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <CmCareerShell
      titulo="Treinos"
      subtitulo={`Rodada ${rodada} · preparador físico ${prep}/20 · 1 sessão por rodada`}
    >
      {feedback && (
        <p className="mb-3 rounded border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {feedback}
        </p>
      )}

      {jaTreinou && (
        <CmPanel className="mb-4 border-amber-800/60">
          <p className="text-sm text-amber-100">
            Microciclo já rodado nesta rodada (
            <strong>{mundo?.ultimoTreino?.microciclo}</strong>). Avance dias ou espere o próximo
            confronto.
          </p>
        </CmPanel>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {MICROCICLOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPlano(m.id)}
            className={`rounded-lg border p-3 text-left transition ${
              plano === m.id
                ? 'border-emerald-600 bg-emerald-950/50'
                : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500'
            }`}
          >
            <span className="text-lg text-emerald-400">{m.emoji}</span>
            <p className="mt-1 font-medium text-zinc-100">{m.titulo}</p>
            <p className="text-xs text-zinc-500">{m.resumo}</p>
          </button>
        ))}
      </div>

      <CmPanel className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-emerald-400">Destaques (até 3)</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Ganham impulso extra no microciclo escolhido — ideal para jovens e reservas.
        </p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {elenco.map((j) => {
            const sel = destaques.includes(j.id);
            const lesao = j.lesao && j.lesao.diasRestantes > 0;
            return (
              <button
                key={j.id}
                type="button"
                disabled={lesao}
                onClick={() => toggleDestaque(j.id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm ${
                  lesao
                    ? 'cursor-not-allowed text-zinc-600'
                    : sel
                      ? 'bg-emerald-900/60 text-emerald-100'
                      : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span>
                  {j.nome}{' '}
                  <span className="text-xs text-zinc-500">
                    {j.posicao} · {j.overall} OVR · energia {Math.round(j.energia)}
                  </span>
                </span>
                {sel && <span className="text-xs text-emerald-400">★</span>}
              </button>
            );
          })}
        </div>
      </CmPanel>

      <CmBtn onClick={executar} disabled={jaTreinou}>
        {jaTreinou ? 'Treino feito' : 'Rodar microciclo'}
      </CmBtn>
    </CmCareerShell>
  );
}