import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type {
  DadosH2H,
  PartidaRecenteH2H,
  TimeH2HBadge,
} from '../../career/h2hMatch';
import { INTERVALOS_GOL } from '../../career/h2hMatch';

type Props = {
  dados: DadosH2H;
};

const PAGE_SIZE = 5;

function Crest({
  time,
  size = 'md',
}: {
  time: TimeH2HBadge;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-14 w-14 text-sm' : size === 'sm' ? 'h-7 w-7 text-[9px]' : 'h-9 w-9 text-[10px]';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-zinc-600 font-bold text-white shadow ${dim}`}
      style={{
        background: `linear-gradient(145deg, ${time.corPrimaria}, ${time.corSecundaria})`,
      }}
      title={time.nome}
    >
      {time.sigla}
    </div>
  );
}

function ResultPill({ r }: { r: PartidaRecenteH2H['resultado'] }) {
  const cls =
    r === 'V'
      ? 'bg-green-600 text-white'
      : r === 'D'
        ? 'bg-rose-700 text-white'
        : 'bg-zinc-600 text-zinc-100';
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${cls}`}
    >
      {r}
    </span>
  );
}

function HeatCell({ value, max, kind }: { value: number; max: number; kind: 'pro' | 'contra' }) {
  const intensity = max <= 0 ? 0 : Math.min(1, value / max);
  const bg =
    kind === 'pro'
      ? `rgba(16, 185, 129, ${0.12 + intensity * 0.75})`
      : `rgba(244, 63, 94, ${0.12 + intensity * 0.75})`;
  return (
    <div
      className="flex h-8 min-w-[2rem] flex-1 items-center justify-center rounded text-[11px] font-semibold tabular-nums text-zinc-100"
      style={{ background: bg }}
    >
      {value > 0 ? value : ''}
    </div>
  );
}

export function MatchH2HPanel({ dados }: Props) {
  const [soCasaConfrontos, setSoCasaConfrontos] = useState(false);
  const [soCompeticaoConfrontos, setSoCompeticaoConfrontos] = useState(true);
  const [abaRecentes, setAbaRecentes] = useState<'mandante' | 'visitante'>('mandante');
  const [soCasaRecentes, setSoCasaRecentes] = useState(false);
  const [soCompeticaoRecentes, setSoCompeticaoRecentes] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [golsModo, setGolsModo] = useState<'todos' | 'casa_fora'>('todos');

  const confrontosFiltrados = useMemo(() => {
    return dados.confrontos.filter((c) => {
      if (soCompeticaoConfrontos && c.competicao !== dados.competicao) return false;
      if (soCasaConfrontos && c.mandante.id !== dados.mandante.id) return false;
      return true;
    });
  }, [dados, soCasaConfrontos, soCompeticaoConfrontos]);

  const recentesBase =
    abaRecentes === 'mandante' ? dados.recentesMandante : dados.recentesVisitante;

  const recentesFiltrados = useMemo(() => {
    return recentesBase.filter((j) => {
      if (soCompeticaoRecentes && j.competicao !== dados.competicao) return false;
      if (soCasaRecentes && !j.emCasa) return false;
      return true;
    });
  }, [recentesBase, soCasaRecentes, soCompeticaoRecentes, dados.competicao]);

  const totalPaginas = Math.max(1, Math.ceil(recentesFiltrados.length / PAGE_SIZE) || 1);
  const paginaSafe = Math.min(pagina, totalPaginas - 1);
  const recentesPagina = recentesFiltrados.slice(
    paginaSafe * PAGE_SIZE,
    paginaSafe * PAGE_SIZE + PAGE_SIZE,
  );
  const rangeIni = recentesFiltrados.length === 0 ? 0 : paginaSafe * PAGE_SIZE + 1;
  const rangeFim = Math.min(recentesFiltrados.length, (paginaSafe + 1) * PAGE_SIZE);

  const maxGol = Math.max(
    1,
    ...dados.golsMandante.marcados,
    ...dados.golsMandante.sofridos,
    ...dados.golsVisitante.marcados,
    ...dados.golsVisitante.sofridos,
  );

  const { treinadores: t } = dados;

  return (
    <div className="space-y-4 text-zinc-200">
      {/* Treinadores */}
      <section className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-5">
        <h3 className="mb-4 text-center text-sm font-semibold text-zinc-100">
          Treinadores confrontos diretos
        </h3>
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <div className="flex w-28 flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-500/60 bg-zinc-800 text-lg font-bold text-sky-200">
              {t.mandanteNome
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <p className="text-xs font-medium text-zinc-200">{t.mandanteNome}</p>
          </div>
          <div className="min-w-[7rem] text-center">
            <p className="text-2xl font-bold tabular-nums text-zinc-50">
              {t.vitoriasMandante}{' '}
              <span className="text-zinc-500">vs</span> {t.vitoriasVisitante}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {t.empates > 0 ? `${t.empates} empate${t.empates > 1 ? 's' : ''} · ` : ''}
              {t.ultimaPartida
                ? `Última partida: ${t.ultimaPartida}`
                : 'Sem confrontos nesta temporada'}
            </p>
          </div>
          <div className="flex w-28 flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-500 bg-zinc-800 text-lg font-bold text-zinc-200">
              {t.visitanteNome
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <p className="text-xs font-medium text-zinc-200">{t.visitanteNome}</p>
          </div>
        </div>
      </section>

      {/* Confrontos + Partidas */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Confrontos diretos</h3>
            <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={soCasaConfrontos}
                  onChange={(e) => setSoCasaConfrontos(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                No {dados.mandante.nome}
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={soCompeticaoConfrontos}
                  onChange={(e) => setSoCompeticaoConfrontos(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                Nesta competição
              </label>
            </div>
          </div>
          {confrontosFiltrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Primeiro confronto entre os times nesta temporada.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {confrontosFiltrados.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-zinc-800 bg-zinc-950/50 px-2.5 py-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                    <span>{c.competicao}</span>
                    <span>
                      R{c.rodada} · {c.dataLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Crest time={c.mandante} size="sm" />
                      <span className="truncate text-zinc-200">{c.mandante.nome}</span>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-50">
                      {c.golsMandante} - {c.golsVisitante}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="truncate text-right text-zinc-200">{c.visitante.nome}</span>
                      <Crest time={c.visitante} size="sm" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Partidas</h3>
            <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-950/60 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setAbaRecentes('mandante');
                  setPagina(0);
                }}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
                  abaRecentes === 'mandante'
                    ? 'bg-sky-800/80 text-sky-50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Crest time={dados.mandante} size="sm" />
                {dados.mandante.sigla}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbaRecentes('visitante');
                  setPagina(0);
                }}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
                  abaRecentes === 'visitante'
                    ? 'bg-sky-800/80 text-sky-50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Crest time={dados.visitante} size="sm" />
                {dados.visitante.sigla}
              </button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-zinc-400">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={soCasaRecentes}
                onChange={(e) => {
                  setSoCasaRecentes(e.target.checked);
                  setPagina(0);
                }}
                className="rounded border-zinc-600"
              />
              Casa
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={soCompeticaoRecentes}
                onChange={(e) => {
                  setSoCompeticaoRecentes(e.target.checked);
                  setPagina(0);
                }}
                className="rounded border-zinc-600"
              />
              Nesta competição
            </label>
          </div>
          {recentesPagina.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Sem partidas recentes.</p>
          ) : (
            <ul className="space-y-2">
              {recentesPagina.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/50 px-2.5 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] text-zinc-500">
                      {j.competicao} · {j.dataLabel}
                    </p>
                    <p className="truncate text-zinc-200">
                      {j.emCasa ? 'vs' : '@'} {j.adversario.nome}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums font-semibold text-zinc-50">
                    {j.golsPro} - {j.golsContra}
                  </span>
                  <ResultPill r={j.resultado} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-zinc-400">
            <button
              type="button"
              disabled={paginaSafe <= 0}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {rangeIni}-{rangeFim} de {recentesFiltrados.length}
            </span>
            <button
              type="button"
              disabled={paginaSafe >= totalPaginas - 1}
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      {/* Sequências + Gols */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Sequências</h3>
          {dados.sequencias.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">Sem dados de sequência ainda.</p>
          ) : (
            <ul className="space-y-1.5 pr-1">
              {dados.sequencias.map((s, i) => {
                const time =
                  s.timeId === dados.mandante.id ? dados.mandante : dados.visitante;
                return (
                  <li
                    key={`${s.timeId}-${s.label}-${i}`}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-zinc-800/40"
                  >
                    <Crest time={time} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{s.label}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-zinc-100">
                      {s.valor}
                    </span>
                    {s.positivo ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Sim" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-rose-400" aria-label="Não" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Gols distribuídos</h3>
            <div className="inline-flex rounded border border-zinc-700 text-[11px]">
              <button
                type="button"
                onClick={() => setGolsModo('todos')}
                className={`px-2.5 py-1 ${
                  golsModo === 'todos' ? 'bg-sky-800/70 text-sky-50' : 'text-zinc-400'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setGolsModo('casa_fora')}
                className={`px-2.5 py-1 ${
                  golsModo === 'casa_fora' ? 'bg-sky-800/70 text-sky-50' : 'text-zinc-400'
                }`}
              >
                Casa / Fora
              </button>
            </div>
          </div>

          <div className="mb-1 flex gap-1 pl-[4.5rem] text-[10px] text-zinc-500">
            {INTERVALOS_GOL.slice(0, -1).map((m) => (
              <span key={m} className="flex-1 text-center">
                {String(m).padStart(2, '0')}&apos;
              </span>
            ))}
          </div>

          {(
            [
              {
                badge: dados.mandante,
                label: 'Marcados',
                values: dados.golsMandante.marcados,
                kind: 'pro' as const,
              },
              {
                badge: dados.mandante,
                label: 'Sofridos',
                values: dados.golsMandante.sofridos,
                kind: 'contra' as const,
              },
              {
                badge: dados.visitante,
                label: 'Marcados',
                values: dados.golsVisitante.marcados,
                kind: 'pro' as const,
              },
              {
                badge: dados.visitante,
                label: 'Sofridos',
                values: dados.golsVisitante.sofridos,
                kind: 'contra' as const,
              },
            ] as const
          ).map((row, idx) => (
            <div key={idx} className="mb-1.5 flex items-center gap-2">
              <div className="flex w-[4.5rem] shrink-0 items-center gap-1.5">
                <Crest time={row.badge} size="sm" />
                <span className="text-[10px] leading-tight text-zinc-400">{row.label}</span>
              </div>
              <div className="flex flex-1 gap-1">
                {row.values.map((v, i) => (
                  <HeatCell key={i} value={v} max={maxGol} kind={row.kind} />
                ))}
              </div>
            </div>
          ))}

          <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
            {golsModo === 'casa_fora'
              ? 'Visão Casa/Fora usa a mesma amostra da temporada (placares convertidos em faixas de 15′).'
              : null}
            Distribuição de gols de {dados.mandante.nome} ({dados.golsMandante.partidasAmostra}{' '}
            partidas) e {dados.visitante.nome} ({dados.golsVisitante.partidasAmostra} partidas) —{' '}
            {dados.competicao}.
          </p>
        </section>
      </div>
    </div>
  );
}
