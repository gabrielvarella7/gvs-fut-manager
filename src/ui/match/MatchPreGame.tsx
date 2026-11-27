import { CalendarClock, Landmark, MapPin, Trophy, Whistle } from 'lucide-react';
import type { PreJogoInfo } from '../../engine/matchStats';
import type { ProbabilidadesResultado } from '../../engine/matchEngine';
import type { InfoPartidaPreJogo } from '../../career/infoPartidaPreJogo';
import type {
  MediaStatsPartida,
  PacotePreJogoEquipes,
  StatsEquipePreJogo,
} from '../../career/preJogoEquipeStats';
import { StatBar } from './StatBar';

type Props = {
  mandanteNome: string;
  visitanteNome: string;
  estadio?: string;
  preJogo: PreJogoInfo;
  /** Stats de temporada (ambos os times). Ausente = torneio amador / sem dados. */
  equipes?: PacotePreJogoEquipes | null;
  /** Data/hora, campeonato, árbitro e local. */
  infoPartida?: InfoPartidaPreJogo | null;
};

function pollFromProb(p: ProbabilidadesResultado) {
  let vm = Math.round(p.vitoriaMandante * 100);
  let e = Math.round(p.empate * 100);
  let vv = Math.round(p.vitoriaVisitante * 100);
  const soma = vm + e + vv;
  if (soma !== 100) {
    const vals = [
      { k: 'vm' as const, v: vm },
      { k: 'e' as const, v: e },
      { k: 'vv' as const, v: vv },
    ].sort((a, b) => b.v - a.v);
    vals[0].v += 100 - soma;
    for (const x of vals) {
      if (x.k === 'vm') vm = x.v;
      else if (x.k === 'e') e = x.v;
      else vv = x.v;
    }
  }
  return { vm, e, vv };
}

function FormaPills({ forma }: { forma: string }) {
  if (!forma) {
    return <span className="text-xs text-zinc-500">Sem jogos ainda</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {forma.split('').map((letra, i) => {
        const cls =
          letra === 'V'
            ? 'border-green-700 bg-green-950/60 text-green-300'
            : letra === 'D'
              ? 'border-rose-800 bg-rose-950/50 text-rose-300'
              : 'border-zinc-600 bg-zinc-800 text-zinc-300';
        return (
          <span
            key={`${letra}-${i}`}
            className={`rounded px-2 py-0.5 text-xs font-medium border ${cls}`}
          >
            {letra}
          </span>
        );
      })}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function BlocoEquipe({ equipe, lado }: { equipe: StatsEquipePreJogo; lado: 'casa' | 'fora' }) {
  const tom =
    lado === 'casa'
      ? 'border-emerald-900/50 bg-emerald-950/15'
      : 'border-sky-900/50 bg-sky-950/15';
  const u5 = equipe.ultimos5;

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${tom}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">{equipe.nome}</h3>
        <span className="text-xs text-zinc-400">
          {equipe.jogos > 0 ? (
            <>
              <strong className="text-zinc-200">{equipe.posicao}º</strong>
              {' · '}
              PPJ {equipe.ppj.toFixed(2)}
            </>
          ) : (
            'Pré-temporada'
          )}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">Totais</p>
        <MetricRow label="Vitórias" value={String(equipe.vitorias)} />
        <MetricRow label="Jogos" value={String(equipe.jogos)} />
        <MetricRow label="Gols marcados" value={String(equipe.golsMarcados)} />
        <MetricRow label="Gols sofridos" value={String(equipe.golsSofridos)} />
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Últimos 5 — forma</p>
        <FormaPills forma={equipe.forma} />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">Nos últimos 5</p>
        {u5.jogos === 0 ? (
          <p className="text-xs text-zinc-500">Aguardando primeiros jogos.</p>
        ) : (
          <>
            <MetricRow label="Gols marcados" value={String(u5.golsMarcados)} />
            <MetricRow
              label="Gols marcados/jogo"
              value={u5.golsMarcadosPorJogo.toFixed(2)}
            />
            <MetricRow label="Gols sofridos" value={String(u5.golsSofridos)} />
            <MetricRow
              label="Gols sofridos/jogo"
              value={u5.golsSofridosPorJogo.toFixed(2)}
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Destaque no campeonato
          </p>
          {equipe.destaqueCampeonato ? (
            <p className="text-xs text-zinc-200">
              <strong>{equipe.destaqueCampeonato.nome}</strong>
              <span className="text-zinc-500">
                {' '}
                · {equipe.destaqueCampeonato.posicao} · {equipe.destaqueCampeonato.detalhe}
              </span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">—</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Destaque nos últimos 5
          </p>
          {equipe.destaqueUltimos5 ? (
            <p className="text-xs text-zinc-200">
              <strong>{equipe.destaqueUltimos5.nome}</strong>
              <span className="text-zinc-500">
                {' '}
                · {equipe.destaqueUltimos5.posicao} · {equipe.destaqueUltimos5.detalhe}
              </span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">—</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Desfalques</p>
        {equipe.desfalques.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhum desfalque.</p>
        ) : (
          <ul className="space-y-1">
            {equipe.desfalques.map((d) => (
              <li key={d.jogadorId} className="flex justify-between gap-2 text-xs">
                <span className="text-zinc-300">{d.nome}</span>
                <span
                  className={
                    d.motivo === 'lesao' ? 'text-rose-300' : 'text-amber-300'
                  }
                >
                  {d.motivo === 'lesao' ? 'Lesão' : 'Cartão'} · {d.detalhe}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function fmtMedia(v: number, casas: number): string {
  return casas === 0 ? String(Math.round(v)) : v.toFixed(casas);
}

function BarrasMedias({
  titulo,
  mandante,
  visitante,
  nomeM,
  nomeV,
  vazio,
}: {
  titulo: string;
  mandante: MediaStatsPartida | null;
  visitante: MediaStatsPartida | null;
  nomeM: string;
  nomeV: string;
  vazio: string;
}) {
  if (!mandante && !visitante) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">{titulo}</h3>
        <p className="text-xs text-zinc-500">{vazio}</p>
      </div>
    );
  }
  const m = mandante;
  const v = visitante;
  const row = (
    label: string,
    key: keyof Omit<MediaStatsPartida, 'jogosComStats'>,
    casas: number,
    sufixo = '',
    max?: number,
  ) => {
    const mv = m ? m[key] : 0;
    const vv = v ? v[key] : 0;
    return (
      <StatBar
        key={key}
        label={label}
        mandante={m ? fmtMedia(mv, casas) : '—'}
        visitante={v ? fmtMedia(vv, casas) : '—'}
        mandanteNome={nomeM}
        visitanteNome={nomeV}
        max={max ?? Math.max(mv, vv, 1)}
        sufixo={sufixo}
      />
    );
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      <h3 className="mb-1 text-sm font-semibold text-zinc-200">{titulo}</h3>
      <p className="mb-3 text-[10px] text-zinc-500">
        Médias por jogo
        {m || v
          ? ` · amostra ${Math.max(m?.jogosComStats ?? 0, v?.jogosComStats ?? 0)} jogo(s) com stats`
          : ''}
      </p>
      {row('Posse de bola', 'possePercent', 0, '%', 100)}
      {row('Gols esperados (xG)', 'xg', 2)}
      {row('Finalizações', 'finalizacoes', 1)}
      {row('Defesas do goleiro', 'defesasGoleiro', 1)}
      {row('Escanteios', 'escanteios', 1)}
      {row('Faltas', 'faltas', 1)}
      {row('Passes', 'passes', 0)}
      {row('Desarmes', 'desarmes', 1)}
    </div>
  );
}

function CartoesInfoPartida({ info }: { info: InfoPartidaPreJogo }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 divide-y divide-zinc-800">
        <div className="flex gap-3 px-4 py-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Data e hora</p>
            <p className="text-sm text-zinc-100">
              {info.dataFormatada} <span className="text-zinc-500">•</span> {info.horario}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-4 py-3">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Campeonato</p>
            <p className="text-sm text-zinc-100">{info.campeonatoLinha}</p>
          </div>
        </div>
        <div className="flex gap-3 px-4 py-3">
          <Whistle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Árbitro</p>
            <p className="text-sm text-zinc-100">
              {info.arbitro.nome}
              <span className="ml-1 text-xs text-zinc-500">({info.arbitro.uf})</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>Média de cartões</span>
              <span className="inline-flex items-center gap-1 text-rose-300" title="Vermelhos/jogo">
                <span className="inline-block h-3 w-2 rounded-[1px] bg-rose-500" aria-hidden />
                {info.arbitro.mediaVermelhos.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-300" title="Amarelos/jogo">
                <span className="inline-block h-3 w-2 rounded-[1px] bg-amber-400" aria-hidden />
                {info.arbitro.mediaAmarelos.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
        <p className="mb-3 text-center text-sm font-semibold text-zinc-200">Local</p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Nome</p>
              <p className="text-sm text-zinc-100">{info.local.estadio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Localização</p>
              <p className="text-sm text-zinc-100">{info.local.localizacao}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchPreGame({
  mandanteNome,
  visitanteNome,
  estadio,
  preJogo,
  equipes,
  infoPartida,
}: Props) {
  const voto = pollFromProb(preJogo.probabilidades);
  const m = equipes?.mandante;
  const v = equipes?.visitante;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Antes do jogo</p>
        <h2 className="mt-1 text-lg font-medium text-zinc-100">
          {mandanteNome} <span className="text-zinc-500">x</span> {visitanteNome}
        </h2>
        {estadio && !infoPartida && <p className="text-sm text-zinc-400">{estadio}</p>}
      </div>

      {infoPartida && <CartoesInfoPartida info={infoPartida} />}

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Quem vencerá?</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1 text-sm">
            {mandanteNome} {voto.vm}%
          </span>
          <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-sm">
            Empate {voto.e}%
          </span>
          <span className="rounded-full border border-sky-800 bg-sky-950/50 px-3 py-1 text-sm">
            {visitanteNome} {voto.vv}%
          </span>
        </div>
      </div>

      {preJogo.mandoBonus > 1 && (
        <p className="text-xs text-zinc-500">
          Mandante com bônus de mando de campo (+
          {((preJogo.mandoBonus - 1) * 100).toFixed(0)}%).
        </p>
      )}

      {m && v && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <BlocoEquipe equipe={m} lado="casa" />
            <BlocoEquipe equipe={v} lado="fora" />
          </div>

          <BarrasMedias
            titulo="Média no campeonato"
            mandante={m.mediaCampeonato}
            visitante={v.mediaCampeonato}
            nomeM={mandanteNome}
            nomeV={visitanteNome}
            vazio="Sem estatísticas de partida na temporada ainda — jogue rodadas para acumular médias."
          />
          <BarrasMedias
            titulo="Média nos últimos 5 jogos"
            mandante={m.mediaUltimos5}
            visitante={v.mediaUltimos5}
            nomeM={mandanteNome}
            nomeV={visitanteNome}
            vazio="Sem amostra nos últimos 5 com stats detalhadas."
          />
        </>
      )}
    </div>
  );
}
