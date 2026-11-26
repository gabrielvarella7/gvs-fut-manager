import { useState } from 'react';
import type { RelatorioPreJogo } from '../../career/relatorioPreJogo';
import { formatarDataBr } from '../../career/brasileirao';
import { StatBar } from './StatBar';
import type { ProbabilidadesResultado } from '../../engine/matchEngine';

type Props = {
  relatorio: RelatorioPreJogo;
  acoes?: React.ReactNode;
};

type TabId = 'detalhes' | 'comparacao' | 'escalacoes' | 'confrontos';

const TABS: { id: TabId; label: string }[] = [
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'comparacao', label: 'Comparação' },
  { id: 'escalacoes', label: 'Escalações' },
  { id: 'confrontos', label: 'Confrontos' },
];

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

function FormaChips({ forma }: { forma: string }) {
  if (forma === '—') return <span className="text-sm text-zinc-500">Sem jogos no campeonato</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {forma.split(' · ').map((letra, i) => {
        const cls =
          letra === 'V'
            ? 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
            : letra === 'D'
              ? 'border-rose-800 bg-rose-950/50 text-rose-300'
              : 'border-zinc-600 bg-zinc-800 text-zinc-300';
        return (
          <span key={i} className={`rounded px-2 py-0.5 text-xs font-medium border ${cls}`}>
            {letra}
          </span>
        );
      })}
    </div>
  );
}

function LinhaClassificacao({
  posicao,
  nome,
  linha,
}: {
  posicao: number;
  nome: string;
  linha: RelatorioPreJogo['linhaMandante'];
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
      <span className="text-zinc-200">
        <strong className="text-emerald-400">{posicao}º</strong> {nome}
      </span>
      <span className="text-zinc-400">
        {linha.pontos} pts · {linha.jogos} J · {linha.vitorias}V {linha.empates}E {linha.derrotas}D · SG{' '}
        {linha.saldo_gols >= 0 ? `+${linha.saldo_gols}` : linha.saldo_gols}
      </span>
    </div>
  );
}

function ListaUltimos({
  titulo,
  jogos,
}: {
  titulo: string;
  jogos: RelatorioPreJogo['ultimosMandante'];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{titulo}</p>
      {jogos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum jogo finalizado ainda.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {jogos.map((j) => {
            const venceu = j.golsPro > j.golsContra;
            const empate = j.golsPro === j.golsContra;
            const cor = venceu ? 'text-emerald-400' : empate ? 'text-zinc-400' : 'text-rose-400';
            return (
              <li key={`${j.rodada}-${j.dataISO}`} className="flex justify-between gap-2 text-zinc-300">
                <span className="truncate">
                  R{j.rodada} · {j.emCasa ? '' : '@ '}
                  {j.adversarioNome}
                </span>
                <span className={`font-medium ${cor}`}>
                  {j.golsPro}–{j.golsContra}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BlocoEscalacao({
  time,
  esquema,
  jogadores,
  mediaOvr,
  destaque,
}: {
  time: RelatorioPreJogo['mandante'];
  esquema: string;
  jogadores: RelatorioPreJogo['escalacaoMandante'];
  mediaOvr: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${destaque ? 'border-emerald-800/60 bg-emerald-950/20' : 'border-zinc-700 bg-zinc-900/50'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-100">{time.nome_completo}</p>
          <p className="text-xs text-zinc-500">
            Esquema provável: <strong className="text-zinc-300">{esquema}</strong> · média OVR{' '}
            {mediaOvr}
          </p>
        </div>
        <div
          className="h-8 w-8 rounded-full border border-zinc-600"
          style={{
            background: `linear-gradient(135deg, ${time.cor_primaria} 50%, ${time.cor_secundaria} 50%)`,
          }}
          title={time.nome}
        />
      </div>
      <ol className="space-y-1 text-sm">
        {jogadores.map((j, idx) => (
          <li key={j.id} className="flex justify-between gap-2 text-zinc-300">
            <span>
              <span className="inline-block w-5 text-zinc-500">{idx + 1}.</span>
              {j.nome}
            </span>
            <span className="text-zinc-500">
              {j.posicao} · <strong className="text-zinc-200">{j.overall}</strong>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PreMatchReport({ relatorio: r, acoes }: Props) {
  const [tab, setTab] = useState<TabId>('detalhes');
  const voto = pollFromProb(r.preJogo.probabilidades);
  const fs = r.preJogo.forcaSetores;
  const nomeM = r.mandante.nome;
  const nomeV = r.visitante.nome;
  const destaqueM = r.usuarioTimeId === r.mandante.id;
  const destaqueV = r.usuarioTimeId === r.visitante.id;

  const vitoriasH2H = { m: 0, v: 0, e: 0 };
  for (const c of r.confrontos) {
    const gm = c.golsMandante;
    const gv = c.golsVisitante;
    if (gm === gv) {
      vitoriasH2H.e++;
    } else if (c.mandanteId === r.mandante.id) {
      if (gm > gv) vitoriasH2H.m++;
      else vitoriasH2H.v++;
    } else {
      if (gv > gm) vitoriasH2H.m++;
      else vitoriasH2H.v++;
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {r.competicao} · Rodada {r.partida.rodada}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {formatarDataBr(r.partida.dataISO)} · {r.estadio}
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <TeamBadge time={r.mandante} mandante />
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-100">
              {nomeM} <span className="text-zinc-600">×</span> {nomeV}
            </p>
            <p className="text-xs text-zinc-500">Relatório pré-jogo</p>
          </div>
          <TeamBadge time={r.visitante} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-emerald-900/50 text-emerald-200'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'detalhes' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">Quem vencerá?</h3>
            <p className="mb-2 text-xs text-zinc-500">
              Média OVR dos 22 · casa · momento — com faixa de variância até o apito.
            </p>
            {r.preJogo.cruzamento && (
              <p className="mb-2 font-mono text-xs text-zinc-400">
                OVR médio {r.preJogo.cruzamento.mediaOvrM.toFixed(1)} vs{' '}
                {r.preJogo.cruzamento.mediaOvrV.toFixed(1)} · momento{' '}
                {(r.preJogo.cruzamento.momentoM * 100 - 100).toFixed(1)}% /{' '}
                {(r.preJogo.cruzamento.momentoV * 100 - 100).toFixed(1)}% · índice{' '}
                {r.preJogo.forcaMandante.toFixed(1)} vs {r.preJogo.forcaVisitante.toFixed(1)} (Δ{' '}
                {r.preJogo.cruzamento.diff >= 0 ? '+' : ''}
                {r.preJogo.cruzamento.diff.toFixed(1)})
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <PollPill label={nomeM} pct={voto.vm} tone="mandante" />
              <PollPill label="Empate" pct={voto.e} tone="empate" />
              <PollPill label={nomeV} pct={voto.vv} tone="visitante" />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">Contexto do jogo</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {r.contexto.isClassico && (
                <span className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-amber-200">
                  Clássico
                </span>
              )}
              <span className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-300">
                {nomeM}: moral {r.moralMandante > 0 ? '+' : ''}
                {r.moralMandante} · {rotuloNecessidade(r.contexto.necessidadeMandante)}
              </span>
              <span className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-300">
                {nomeV}: moral {r.moralVisitante > 0 ? '+' : ''}
                {r.moralVisitante} · {rotuloNecessidade(r.contexto.necessidadeVisitante)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-200">Clima previsto</h3>
              <p className="text-2xl font-light text-zinc-100">{r.clima.tempC}°C</p>
              <p className="text-sm text-zinc-400">{r.clima.descricao}</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                <li>Umidade {r.clima.umidadePercent}%</li>
                <li>Nuvens {r.clima.nuvensPercent}%</li>
                <li>Vento {r.clima.ventoKmh} km/h</li>
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-200">Classificação</h3>
              <div className="space-y-2">
                <LinhaClassificacao posicao={r.posicaoMandante} nome={nomeM} linha={r.linhaMandante} />
                <LinhaClassificacao posicao={r.posicaoVisitante} nome={nomeV} linha={r.linhaVisitante} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <p className="mb-2 text-sm font-medium text-zinc-200">Forma — {nomeM}</p>
              <FormaChips forma={r.formaMandante} />
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <p className="mb-2 text-sm font-medium text-zinc-200">Forma — {nomeV}</p>
              <FormaChips forma={r.formaVisitante} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <ListaUltimos titulo={`Últimos jogos — ${nomeM}`} jogos={r.ultimosMandante} />
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <ListaUltimos titulo={`Últimos jogos — ${nomeV}`} jogos={r.ultimosVisitante} />
            </div>
          </div>
        </div>
      )}

      {tab === 'comparacao' && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Força do elenco (escalação provável)</h3>
          <StatBar
            label="Índice geral"
            mandante={r.preJogo.forcaMandante}
            visitante={r.preJogo.forcaVisitante}
            mandanteNome={nomeM}
            visitanteNome={nomeV}
          />
          <StatBar
            label="Defesa"
            mandante={Math.round(fs.mandante.defesa)}
            visitante={Math.round(fs.visitante.defesa)}
            mandanteNome={nomeM}
            visitanteNome={nomeV}
          />
          <StatBar
            label="Meio"
            mandante={Math.round(fs.mandante.meio)}
            visitante={Math.round(fs.visitante.meio)}
            mandanteNome={nomeM}
            visitanteNome={nomeV}
          />
          <StatBar
            label="Ataque"
            mandante={Math.round(fs.mandante.ataque)}
            visitante={Math.round(fs.visitante.ataque)}
            mandanteNome={nomeM}
            visitanteNome={nomeV}
          />
          <StatBar
            label="Média OVR"
            mandante={r.mediaOvrMandante}
            visitante={r.mediaOvrVisitante}
            mandanteNome={nomeM}
            visitanteNome={nomeV}
            max={100}
          />
          {r.preJogo.mandoBonus > 1 && (
            <p className="mt-2 text-xs text-zinc-500">
              Mandante com bônus de {((r.preJogo.mandoBonus - 1) * 100).toFixed(0)}% de mando de campo.
            </p>
          )}
          {r.preJogo.confrontoTatico && (
            <p className="mt-2 rounded border border-zinc-800 bg-zinc-950/50 p-2 text-xs text-zinc-400">
              <span className="font-medium text-amber-200/90">Confronto tático: </span>
              {r.preJogo.confrontoTatico.descricao} Faixa de gols na partida:{' '}
              {r.preJogo.confrontoTatico.faixaGolsTotalMin.toFixed(1)}–
              {r.preJogo.confrontoTatico.faixaGolsTotalMax.toFixed(1)} (vol. ×
              {r.preJogo.confrontoTatico.multVolumeGols.toFixed(2)}).
            </p>
          )}
        </div>
      )}

      {tab === 'escalacoes' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BlocoEscalacao
            time={r.mandante}
            esquema={r.esquemaMandante}
            jogadores={r.escalacaoMandante}
            mediaOvr={r.mediaOvrMandante}
            destaque={destaqueM}
          />
          <BlocoEscalacao
            time={r.visitante}
            esquema={r.esquemaVisitante}
            jogadores={r.escalacaoVisitante}
            mediaOvr={r.mediaOvrVisitante}
            destaque={destaqueV}
          />
        </div>
      )}

      {tab === 'confrontos' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 text-center text-sm text-zinc-300">
            No campeonato: <strong className="text-emerald-300">{nomeM}</strong> {vitoriasH2H.m}V ·{' '}
            {vitoriasH2H.e}E · <strong className="text-sky-300">{nomeV}</strong> {vitoriasH2H.v}V
          </div>
          {r.confrontos.length === 0 ? (
            <p className="text-sm text-zinc-500">Primeiro confronto entre os times nesta temporada.</p>
          ) : (
            <ul className="space-y-2">
              {r.confrontos.map((c) => {
                const mandanteNome =
                  c.mandanteId === r.mandante.id ? nomeM : nomeV;
                const visitanteNome =
                  c.visitanteId === r.mandante.id ? nomeM : nomeV;
                return (
                  <li
                    key={`${c.rodada}-${c.dataISO}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-500">
                      R{c.rodada} · {formatarDataBr(c.dataISO)}
                    </span>
                    <span className="text-zinc-200">
                      {mandanteNome} <strong>{c.golsMandante}</strong> × <strong>{c.golsVisitante}</strong>{' '}
                      {visitanteNome}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {acoes && <div className="flex flex-wrap gap-2 pt-2">{acoes}</div>}
    </div>
  );
}

function TeamBadge({ time, mandante }: { time: RelatorioPreJogo['mandante']; mandante?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-600 text-xs font-bold text-white shadow-lg"
        style={{
          background: `linear-gradient(145deg, ${time.cor_primaria}, ${time.cor_secundaria})`,
        }}
      >
        {time.nome.slice(0, 3).toUpperCase()}
      </div>
      {mandante && <span className="text-[10px] uppercase text-zinc-500">Mandante</span>}
    </div>
  );
}

function rotuloNecessidade(n: RelatorioPreJogo['contexto']['necessidadeMandante']): string {
  switch (n) {
    case 'DECISIVO_TITULO':
      return 'Decisivo (título)';
    case 'DESESPERO_REBAIXAMENTO':
      return 'Zona de rebaixamento';
    case 'CUMPRINDO_TABELA':
      return 'Cumprindo tabela';
    default:
      return 'Normal';
  }
}

function PollPill({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: 'mandante' | 'empate' | 'visitante';
}) {
  const cls =
    tone === 'mandante'
      ? 'border-emerald-800 bg-emerald-950/50'
      : tone === 'visitante'
        ? 'border-sky-800 bg-sky-950/50'
        : 'border-zinc-600 bg-zinc-800/80';
  return (
    <span className={`rounded-full border px-3 py-1 text-sm ${cls}`}>
      {label} {pct}%
    </span>
  );
}