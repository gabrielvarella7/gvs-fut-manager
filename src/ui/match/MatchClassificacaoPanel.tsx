import { useMemo, useState } from 'react';
import {
  classesZonaTabela,
  LEGENDA_ZONAS,
  zonaNaPosicao,
} from '../../career/classificacaoZonas';
import {
  montarTabelaAoVivo,
  type FiltroClassificacao,
  type FormaJogo,
} from '../../career/tabelaAoVivo';
import type { EstadoTemporada } from '../../career/brasileirao';
import type { MatchSimResult } from '../../engine/matchEngine';
import type { CampeonatoConfig, Time } from '../../types/schema';
import { ClubNameLink } from '../components/ClubNameLink';

type Props = {
  estado: EstadoTemporada;
  campeonato: CampeonatoConfig;
  times: Time[];
  partidaAoVivoId: number;
  resultAoVivo: MatchSimResult;
  minuto: number;
  mandanteId: string;
  visitanteId: string;
};

function FormaPills({ forma }: { forma: FormaJogo[] }) {
  const padded: (FormaJogo | null)[] = [...forma];
  while (padded.length < 5) padded.unshift(null);
  const visiveis = padded.slice(-5);

  return (
    <div className="flex items-center justify-center gap-0.5" aria-label="Últimos 5">
      {visiveis.map((r, i) => {
        if (!r) {
          return (
            <span
              key={`vazio-${i}`}
              className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-zinc-800 text-[9px] text-zinc-600"
            >
              ·
            </span>
          );
        }
        const cls =
          r === 'V'
            ? 'bg-emerald-600 text-white'
            : r === 'D'
              ? 'bg-rose-600 text-white'
              : 'bg-zinc-500 text-white';
        return (
          <span
            key={`${r}-${i}`}
            className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold ${cls}`}
          >
            {r}
          </span>
        );
      })}
    </div>
  );
}

const FILTROS: { id: FiltroClassificacao; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'casa', label: 'Casa' },
  { id: 'fora', label: 'Fora' },
];

export function MatchClassificacaoPanel({
  estado,
  campeonato,
  times,
  partidaAoVivoId,
  resultAoVivo,
  minuto,
  mandanteId,
  visitanteId,
}: Props) {
  const [filtro, setFiltro] = useState<FiltroClassificacao>('todos');

  const porNome = useMemo(() => new Map(times.map((t) => [t.id, t.nome])), [times]);

  const linhas = useMemo(
    () =>
      montarTabelaAoVivo({
        estado,
        campeonato,
        partidaAoVivoId,
        resultAoVivo,
        minuto,
        filtro,
      }),
    [estado, campeonato, partidaAoVivoId, resultAoVivo, minuto, filtro],
  );

  const temporadaLabel = `${campeonato.nome} ${String(estado.temporadaAno).slice(2)}/${String(
    estado.temporadaAno + 1,
  ).slice(2)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filtro === f.id
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-[10px] text-emerald-100">
          BR
        </span>
        <span>{temporadaLabel}</span>
        <span className="text-xs font-normal text-zinc-500">· ao vivo {minuto}&apos;</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-2 py-2 text-center">#</th>
              <th className="px-2 py-2">Clube</th>
              <th className="px-1 py-2 text-center">P</th>
              <th className="px-1 py-2 text-center">W</th>
              <th className="px-1 py-2 text-center">D</th>
              <th className="px-1 py-2 text-center">L</th>
              <th className="px-1 py-2 text-center">DIFF</th>
              <th className="px-1 py-2 text-center">GLS</th>
              <th className="px-2 py-2 text-center">Últimos 5</th>
              <th className="px-2 py-2 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const zona = zonaNaPosicao(l.posicao, campeonato);
              const classes = classesZonaTabela(zona);
              const ehMandante = l.time_id === mandanteId;
              const ehVisitante = l.time_id === visitanteId;
              const destaque = ehMandante
                ? 'bg-violet-950/55 ring-1 ring-inset ring-violet-600/40'
                : ehVisitante
                  ? 'bg-emerald-950/50 ring-1 ring-inset ring-emerald-600/40'
                  : classes.linha;
              const diff =
                l.saldo_gols > 0 ? `+${l.saldo_gols}` : String(l.saldo_gols);

              return (
                <tr
                  key={l.time_id}
                  className={`border-b border-zinc-900/80 ${destaque}`}
                >
                  <td className={`px-2 py-1.5 text-center ${classes.posicao}`}>{l.posicao}</td>
                  <td className="px-2 py-1.5 font-medium text-zinc-100">
                    <ClubNameLink clubeId={l.time_id}>
                      {porNome.get(l.time_id) ?? l.time_id}
                    </ClubNameLink>
                  </td>
                  <td className="px-1 py-1.5 text-center text-zinc-300">{l.jogos}</td>
                  <td className="px-1 py-1.5 text-center text-zinc-300">{l.vitorias}</td>
                  <td className="px-1 py-1.5 text-center text-zinc-300">{l.empates}</td>
                  <td className="px-1 py-1.5 text-center text-zinc-300">{l.derrotas}</td>
                  <td
                    className={`px-1 py-1.5 text-center font-medium ${
                      l.saldo_gols > 0
                        ? 'text-emerald-400'
                        : l.saldo_gols < 0
                          ? 'text-rose-400'
                          : 'text-zinc-400'
                    }`}
                  >
                    {diff}
                  </td>
                  <td className="px-1 py-1.5 text-center tabular-nums text-zinc-300">
                    {l.gols_pro}:{l.gols_contra}
                  </td>
                  <td className="px-2 py-1.5">
                    <FormaPills forma={l.forma} />
                  </td>
                  <td className="px-2 py-1.5 text-center text-sm font-bold text-zinc-50">
                    {l.pontos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
        <summary className="cursor-pointer select-none font-medium text-zinc-300">
          Regras e legenda
        </summary>
        <ul className="mt-2 flex flex-wrap gap-3">
          {LEGENDA_ZONAS.map((item) => (
            <li key={item.texto} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.cor}`} />
              {item.texto}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-zinc-500">
          Placar ao vivo desta rodada atualiza com os gols (esta partida e as demais da
          rodada). Ordem: pontos, vitórias, saldo, gols pró.
        </p>
        <p className="mt-1 text-zinc-600">
          Destaque:{' '}
          <span className="text-violet-300">mandante</span> ·{' '}
          <span className="text-emerald-300">visitante</span>
        </p>
      </details>
    </div>
  );
}
