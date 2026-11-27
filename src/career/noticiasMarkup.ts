/** Marcadores de entidade em notícias — parseados na UI para links clicáveis. */
export const MARCADOR_CLUBE = /⟦c:([^|⟧]+)\|([^⟧]+)⟧/g;
export const MARCADOR_JOGADOR = /⟦j:(\d+)\|([^⟧]+)⟧/g;
export const MARCADOR_QUALQUER = /⟦([cj]):([^|⟧]+)\|([^⟧]+)⟧/g;

export function marcarClube(id: string, nome: string): string {
  return `⟦c:${id}|${nome}⟧`;
}

export function marcarJogador(id: number, nome: string): string {
  return `⟦j:${id}|${nome}⟧`;
}

/** Remove marcadores, deixando só o nome exibido (dedup / filtros). */
export function textoSemMarcadores(s: string): string {
  return s.replace(MARCADOR_QUALQUER, '$3');
}

export type TokenNoticia =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'clube'; id: string; nome: string }
  | { tipo: 'jogador'; id: number; nome: string };

export type EntidadeNome =
  | { tipo: 'clube'; id: string; nome: string }
  | { tipo: 'jogador'; id: number; nome: string };

/**
 * Insere marcadores em trechos sem marcação, casando nomes conhecidos
 * (maior nome primeiro; evita substring de outro nome).
 */
export function linkificarNomesConhecidos(
  texto: string,
  entidades: EntidadeNome[],
): string {
  if (!texto || !entidades.length) return texto;
  const ordenadas = [...entidades]
    .filter((e) => e.nome.trim().length >= 3)
    .sort((a, b) => b.nome.length - a.nome.length);

  // Protege marcadores já existentes
  const slots: string[] = [];
  const SENTINEL_L = '«§M';
  const SENTINEL_R = '§»';
  const protegido = texto.replace(MARCADOR_QUALQUER, (m) => {
    const i = slots.length;
    slots.push(m);
    return `${SENTINEL_L}${i}${SENTINEL_R}`;
  });

  let out = protegido;
  for (const e of ordenadas) {
    const escaped = e.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\wÀ-ÿ])${escaped}(?![\\wÀ-ÿ])`, 'gi');
    out = out.replace(re, (match) => {
      if (e.tipo === 'clube') return marcarClube(e.id, match);
      return marcarJogador(e.id, match);
    });
  }

  return out.replace(/«§M(\d+)§»/g, (_, i) => slots[Number(i)] ?? '');
}

/** Quebra título/texto em tokens para renderização com links. */
export function tokenizarNoticia(
  s: string,
  entidades?: EntidadeNome[],
): TokenNoticia[] {
  const fonte = entidades?.length ? linkificarNomesConhecidos(s, entidades) : s;
  const out: TokenNoticia[] = [];
  const re = /⟦([cj]):([^|⟧]+)\|([^⟧]+)⟧/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte)) !== null) {
    if (m.index > last) {
      out.push({ tipo: 'texto', valor: fonte.slice(last, m.index) });
    }
    const kind = m[1]!;
    const id = m[2]!;
    const nome = m[3]!;
    if (kind === 'c') {
      out.push({ tipo: 'clube', id, nome });
    } else {
      const n = Number(id);
      if (Number.isFinite(n)) out.push({ tipo: 'jogador', id: n, nome });
      else out.push({ tipo: 'texto', valor: nome });
    }
    last = m.index + m[0].length;
  }
  if (last < fonte.length) out.push({ tipo: 'texto', valor: fonte.slice(last) });
  return out.length ? out : [{ tipo: 'texto', valor: fonte }];
}
