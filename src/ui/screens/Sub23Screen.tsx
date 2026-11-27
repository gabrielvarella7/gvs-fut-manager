import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

/**
 * Entrada legada (`tela: 'sub23'` / atalhos antigos).
 * Redireciona para o modo Sub23 completo (mesmas abas do profissional, read-only).
 */
export function Sub23Screen() {
  const entrar = useGameStore((s) => s.entrarModoSub23);
  const clubeId = useGameStore((s) => s.clubeRealId);
  const aspirantes = useGameStore((s) => s.aspirantesS23);

  useEffect(() => {
    entrar();
  }, [entrar]);

  if (!clubeId || !aspirantes) {
    return (
      <CmCareerShell titulo="Sub23" subtitulo="Modo paralelo do clube">
        <CmPanel className="text-sm text-zinc-400">
          Assuma um clube profissional para abrir o modo Sub23.
        </CmPanel>
      </CmCareerShell>
    );
  }

  return (
    <CmCareerShell titulo="Sub23" subtitulo="Abrindo visão do clube…">
      <CmPanel className="text-sm text-zinc-400">Entrando no modo Sub23…</CmPanel>
    </CmCareerShell>
  );
}
