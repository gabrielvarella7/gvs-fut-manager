import { useEffect, useState } from 'react';
import { formatarDataSalvo, type SaveSlotMeta } from '../../career/saveSlots';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

export function LoadGameScreen() {
  const listar = useGameStore((s) => s.listarSaves);
  const carregar = useGameStore((s) => s.carregarCarreiraPorId);
  const irPara = useGameStore((s) => s.irPara);
  const [saves, setSaves] = useState<SaveSlotMeta[]>([]);

  useEffect(() => {
    setSaves(listar());
  }, [listar]);

  return (
    <CmShell
      titulo="Carregar jogo"
      subtitulo="Selecione um salvamento"
      rodape={
        <CmBtn variant="ghost" onClick={() => irPara('menu')}>
          Voltar ao menu
        </CmBtn>
      }
    >
      {saves.length === 0 ? (
        <CmPanel>
          <p className="text-zinc-400">
            Nenhum jogo salvo. Use &quot;Salvar&quot; no escritório do torneio após iniciar uma carreira.
          </p>
        </CmPanel>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
          {saves.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  if (!carregar(s.id)) return;
                  const clube = useGameStore.getState().clubeRealId;
                  irPara(clube ? 'escritorio' : 'hub_torneio');
                }}
                className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left hover:bg-emerald-950/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-emerald-50">{s.nomeTecnico}</span>
                <span className="text-xs text-zinc-500">{formatarDataSalvo(s.salvoEm)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </CmShell>
  );
}