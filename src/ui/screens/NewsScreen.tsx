import { useEffect, useMemo } from 'react';
import { deduplicarNoticias } from '../../career/noticias';
import { textoSemMarcadores } from '../../career/noticiasMarkup';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';
import { NoticiaTexto } from '../components/NoticiaTexto';

function ehNoticiaSub23(n: { id: string; titulo: string; texto: string }): boolean {
  const plain = `${n.id} ${textoSemMarcadores(n.titulo)} ${textoSemMarcadores(n.texto)}`;
  return /sub23|aspirantes|s23|sub-23/i.test(plain);
}

export function NewsScreen() {
  const todas = deduplicarNoticias(useGameStore((s) => s.noticias));
  const modoSub23 = useGameStore((s) => s.modoSub23);
  const marcarLidas = useGameStore((s) => s.marcarNoticiasComoLidas);

  const noticias = useMemo(
    () => (modoSub23 ? todas.filter(ehNoticiaSub23) : todas),
    [modoSub23, todas],
  );

  useEffect(() => {
    marcarLidas();
  }, [marcarLidas, noticias.length]);

  return (
    <CmCareerShell
      titulo="Notícias"
      subtitulo={
        modoSub23
          ? 'Imprensa do Sub23 — resultados e promoções'
          : 'Imprensa e bastidores do clube'
      }
    >
      {noticias.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {modoSub23
            ? 'Nenhuma notícia do Sub23 ainda. Avance o calendário profissional para sincronizar rodadas.'
            : 'Nenhuma notícia ainda.'}
        </p>
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
                <NoticiaTexto
                  texto={n.titulo}
                  className="mt-1 text-base font-semibold text-emerald-100"
                />
                <NoticiaTexto texto={n.texto} className="mt-2 text-sm text-zinc-400" />
              </CmPanel>
            </li>
          ))}
        </ul>
      )}
    </CmCareerShell>
  );
}
