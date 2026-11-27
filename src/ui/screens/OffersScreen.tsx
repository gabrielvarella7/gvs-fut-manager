import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

export function OffersScreen() {
  const propostas = useGameStore((s) => s.propostas);
  const desempenho = useGameStore((s) => s.desempenho);
  const perfil = useGameStore((s) => s.perfil);
  const propostaSelecionadaId = useGameStore((s) => s.propostaSelecionadaId);
  const assumir = useGameStore((s) => s.assumirClubeContratado);
  const irPara = useGameStore((s) => s.irPara);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    propostaSelecionadaId ?? propostas[0]?.timeId ?? null,
  );

  const assumirTime = () => {
    if (!selecionadoId) return;
    assumir(selecionadoId);
  };

  return (
    <CmCareerShell
      titulo="Propostas de clubes"
      subtitulo={`${perfil?.nome ?? 'Técnico'} — propostas de clubes profissionais`}
      mostrarNav={false}
      acoesExtras={
        <>
          <CmBtn variant="ghost" onClick={() => irPara('hub_torneio')}>
            Voltar ao torneio
          </CmBtn>
          <CmBtn onClick={assumirTime} disabled={!selecionadoId}>
            Assumir o time
          </CmBtn>
        </>
      }
    >
      <CmPanel className="mb-4">
        <p className="text-sm text-zinc-300">
          {desempenho.pontos > 0 || desempenho.vitorias + desempenho.empates + desempenho.derrotas > 0
            ? `Desempenho no torneio: ${desempenho.pontos} pts · Nota ${desempenho.nota.toFixed(1)}. `
            : 'Carreira iniciada sem torneio — propostas dos clubes mais modestos. '}
          Toque no clube desejado e confirme com{' '}
          <strong className="font-medium text-emerald-200">Assumir o time</strong>.
        </p>
      </CmPanel>
      <ul className="space-y-3">
        {propostas.map((p) => {
          const selecionado = selecionadoId === p.timeId;
          return (
            <li key={p.timeId}>
              <button
                type="button"
                onClick={() => setSelecionadoId(p.timeId)}
                className={`w-full rounded border p-4 text-left transition ${
                  selecionado
                    ? 'border-emerald-500 bg-emerald-950/60'
                    : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="text-lg font-semibold text-emerald-100">{p.timeNome}</span>
                  <span className="text-sm text-zinc-500">Força {p.forca}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{p.mensagem}</p>
              </button>
            </li>
          );
        })}
      </ul>
      {propostas.length === 0 && (
        <p className="text-zinc-500">Nenhuma proposta — jogue o torneio e encerre as 3 rodadas.</p>
      )}
    </CmCareerShell>
  );
}