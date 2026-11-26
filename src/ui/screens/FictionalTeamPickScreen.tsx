import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

export function FictionalTeamPickScreen() {
  const perfil = useGameStore((s) => s.perfil);
  const times = useGameStore((s) => s.timesFicticios);
  const sortear = useGameStore((s) => s.sortearTimesFicticios);
  const escolher = useGameStore((s) => s.escolherTimeFicticio);
  const irPara = useGameStore((s) => s.irPara);

  useEffect(() => {
    if (times.length === 0) sortear();
  }, [times.length, sortear]);

  return (
    <CmShell
      titulo="Torneio pré-contrato"
      subtitulo={`${perfil?.nome ?? 'Técnico'} — escolha uma das propostas amadoras para mostrar seu trabalho e chamar a atenção de clubes profissionais`}
      rodape={
        <CmBtn variant="ghost" onClick={() => irPara('criar_tecnico')}>
          Voltar
        </CmBtn>
      }
    >
      <p className="mb-3 text-sm text-zinc-400">
        Você disputará <strong>3 partidas</strong> neste torneio. Depois, clubes reais enviam propostas
        conforme seu desempenho.
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