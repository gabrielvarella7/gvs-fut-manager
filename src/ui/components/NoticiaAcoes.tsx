import { useMemo } from 'react';
import {
  resolverAcoesNoticia,
  rotuloAcaoNoticia,
} from '../../career/noticiasAcoes';
import type { AcaoNoticia, NoticiaCarreira } from '../../career/types';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn } from '../cm/CmShell';

/** CTAs do card de notícia (lesão / base / plantel curto). */
export function NoticiaAcoes({ noticia }: { noticia: NoticiaCarreira }) {
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
