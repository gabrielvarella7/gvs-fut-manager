import { useMemo } from 'react';
import { ClubNameLink } from './ClubNameLink';
import { PlayerNameLink } from './PlayerNameLink';
import {
  tokenizarNoticia,
  type EntidadeNome,
} from '../../career/noticiasMarkup';
import { useGameStore } from '../../store/useGameStore';

type Props = {
  texto: string;
  className?: string;
  as?: 'p' | 'span';
};

/**
 * Renderiza título/corpo de notícia com clubes e jogadores clicáveis
 * (mesmo padrão de ClubNameLink / PlayerNameLink do PR #47).
 * Marcadores ⟦c:…⟧ / ⟦j:…⟧ ou nomes conhecidos do elenco/times.
 */
export function NoticiaTexto({ texto, className, as = 'p' }: Props) {
  const times = useGameStore((s) => s.timesReais);
  const jogadores = useGameStore((s) => s.jogadoresReais);

  const entidades = useMemo((): EntidadeNome[] => {
    const out: EntidadeNome[] = [];
    for (const t of times) {
      if (t.nome_completo) out.push({ tipo: 'clube', id: t.id, nome: t.nome_completo });
      if (t.nome && t.nome !== t.nome_completo) {
        out.push({ tipo: 'clube', id: t.id, nome: t.nome });
      }
    }
    for (const j of jogadores) {
      if (j.nome) out.push({ tipo: 'jogador', id: j.id, nome: j.nome });
    }
    return out;
  }, [times, jogadores]);

  const tokens = useMemo(
    () => tokenizarNoticia(texto, entidades),
    [texto, entidades],
  );
  const Tag = as;
  return (
    <Tag className={className}>
      {tokens.map((t, i) => {
        if (t.tipo === 'texto') return <span key={i}>{t.valor}</span>;
        if (t.tipo === 'clube') {
          return (
            <ClubNameLink key={i} clubeId={t.id} stopPropagation>
              {t.nome}
            </ClubNameLink>
          );
        }
        return (
          <PlayerNameLink key={i} jogadorId={t.id} stopPropagation>
            {t.nome}
          </PlayerNameLink>
        );
      })}
    </Tag>
  );
}
