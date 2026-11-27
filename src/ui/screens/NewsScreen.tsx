import { useEffect, useMemo } from 'react';
import { deduplicarNoticias } from '../../career/noticias';
import {
  resolverAcoesNoticia,
  rotuloAcaoNoticia,
} from '../../career/noticiasAcoes';
import { textoSemMarcadores } from '../../career/noticiasMarkup';
import type { AcaoNoticia, NoticiaCarreira } from '../../career/types';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';
import { NoticiaTexto } from '../components/NoticiaTexto';

function ehNoticiaSub23(n: { id: string; titulo: string; texto: string }): boolean {
  const plain = `${n.id} ${textoSemMarcadores(n.titulo)} ${textoSemMarcadores(n.texto)}`;
  return /sub23|aspirantes|s23|sub-23/i.test(plain);
}

function NoticiaAcoes({ noticia }: { noticia: NoticiaCarreira }) {
  const acoes = useMemo(() => resolverAcoesNoticia(noticia), [noticia]);
  const abrirPerfil = useGameStore((s) => s.abrirPerfilJogador);
  const irPara = useGameStore((s) => s.irPara);
  const promover = useGameStore((s) => s.promoverJovemDaBase);
  const dispensar = useGameStore((s) => s.dispensarNoticia);

  if (acoes.length === 0) return null;

  const executar = (a: AcaoNoticia) => {
    switch (a.tipo) {
      case 'ver_jogador':
        if (a.jogadorId != null) abrirPerfil(a.jogadorId);
        break;
      case 'departamento_medico':
        irPara('staff');
        break;
      case 'promover_base':
        if (a.jogadorId != null) {
          promover(a.jogadorId);
          dispensar(noticia.id);
        }
        break;
      case 'abrir_base':
        irPara('base');
        break;
      case 'dispensar':
        dispensar(noticia.id);
        break;
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {acoes.map((a, i) => (
        <CmBtn
          key={`${a.tipo}_${a.jogadorId ?? i}`}
          variant={
            a.tipo === 'dispensar'
              ? 'ghost'
              : a.tipo === 'promover_base' || a.tipo === 'departamento_medico'
                ? 'primary'
                : 'ghost'
          }
          onClick={() => executar(a)}
        >
          {rotuloAcaoNoticia(a)}
        </CmBtn>
      ))}
    </div>
  );
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
                <NoticiaAcoes noticia={n} />
              </CmPanel>
            </li>
          ))}
        </ul>
      )}
    </CmCareerShell>
  );
}
