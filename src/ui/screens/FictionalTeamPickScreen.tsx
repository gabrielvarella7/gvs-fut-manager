import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

export function FictionalTeamPickScreen() {
  const perfil = useGameStore((s) => s.perfil);
  const times = useGameStore((s) => s.timesFicticios);
  const sortear = useGameStore((s) => s.sortearTimesFicticios);
  const escolher = useGameStore((s) => s.escolherTimeFicticio);
  const pularTorneio = useGameStore((s) => s.pularTorneioReceberPropostas);
  const irPara = useGameStore((s) => s.irPara);

  useEffect(() => {
    if (times.length === 0) sortear();
  }, [times.length, sortear]);

  return (
    <CmShell
      titulo="Início de carreira"
      subtitulo={`${perfil?.nome ?? 'Técnico'} — escolha disputar o torneio amador ou receber propostas diretas`}
      rodape={
        <CmBtn variant="ghost" onClick={() => irPara('criar_tecnico')}>
          Voltar
        </CmBtn>
      }
    >
      <CmPanel className="mb-4 border-sky-800/50 bg-sky-950/20">
        <p className="text-sm font-medium text-sky-100">Opção A — sem torneio</p>
        <p className="mt-1 text-sm text-zinc-400">
          Pule o torneio pré-contrato e receba propostas apenas dos piores clubes do campeonato.
        </p>
        <div className="mt-3">
          <CmBtn onClick={pularTorneio}>Pular torneio e ver propostas</CmBtn>
        </div>
      </CmPanel>

      <p className="mb-3 text-sm text-zinc-400">
        <strong className="text-zinc-200">Opção B — torneio:</strong> escolha um time amador, dispute{' '}
        <strong>3 partidas</strong> e depois clubes reais enviam propostas conforme seu desempenho.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {times.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => escolher(t.id)}
              className="w-full rounded border border-zinc-700 bg-zinc-800/80 p-3 text-left hover:border-emerald-600"
            >
              <p className="font-semibold text-emerald-100">{t.nome}</p>
              <p className="mt-1 text-xs text-zinc-400">Força elenco: {t.forca}</p>
            </button>
          </li>
        ))}
      </ul>
      {times.length === 0 && <CmPanel>Sorteando times…</CmPanel>}
    </CmShell>
  );
}
