import { useEffect } from 'react';
import { deduplicarNoticias } from '../../career/noticias';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

export function NewsScreen() {
  const noticias = deduplicarNoticias(useGameStore((s) => s.noticias));
  const marcarLidas = useGameStore((s) => s.marcarNoticiasComoLidas);

  useEffect(() => {
    marcarLidas();
  }, [marcarLidas, noticias.length]);

  return (
    <CmCareerShell titulo="Notícias" subtitulo="Imprensa e bastidores do clube">
      {noticias.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma notícia ainda.</p>
      ) : (
        <ul className="space-y-3">
          {noticias.map((n) => (
            <li key={n.id}>
              <CmPanel>
                <p className="text-xs text-zinc-500">
                  {new Date(n.data).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-1 text-base font-semibold text-emerald-100">{n.titulo}</p>
                <p className="mt-2 text-sm text-zinc-400">{n.texto}</p>
              </CmPanel>
            </li>
          ))}
        </ul>
      )}
    </CmCareerShell>
  );
}
