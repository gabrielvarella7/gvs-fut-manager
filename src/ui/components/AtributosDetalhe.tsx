import { GRUPOS_ATRIBUTO, mediaAtributosGrupo } from '../../career/atributosJogador';
import { corNotaAtributo } from '../../career/perfilJogador';
import type { AtributosJogador } from '../../types/schema';

type Props = {
  atributos: AtributosJogador;
  compacto?: boolean;
};

function valorGrupo(atributos: AtributosJogador, grupo: 'tecnicos' | 'mentais' | 'fisicos', key: string): number {
  const bloco = atributos[grupo] as unknown as Record<string, number>;
  return bloco[key] ?? 1;
}

export function AtributosDetalhe({ atributos, compacto }: Props) {
  return (
    <div className={`grid gap-3 ${compacto ? 'sm:grid-cols-3' : 'lg:grid-cols-3'}`}>
      {GRUPOS_ATRIBUTO.map((g) => {
        const grupoKey =
          g.titulo === 'Técnicos' ? 'tecnicos' : g.titulo === 'Mentais' ? 'mentais' : 'fisicos';
        const media = mediaAtributosGrupo(atributos, grupoKey);
        return (
          <section
            key={g.titulo}
            className="rounded border border-zinc-800 bg-zinc-950/50 p-3"
          >
            <header className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{g.titulo}</h3>
              <span className="text-[10px] text-zinc-500">média {media}</span>
            </header>
            <ul className="space-y-1.5">
              {g.campos.map((c) => {
                const v = valorGrupo(atributos, grupoKey, c.key);
                const cor = corNotaAttr20(v);
                return (
                  <li key={c.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400" title={c.hint}>
                      {c.label}
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: cor }}>
                      {v}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Cores para escala 1–20 (equivalente ao radar 0–99). */
export function corNotaAttr20(valor: number): string {
  const em99 = valor * 5;
  return corNotaAtributo(em99);
}
