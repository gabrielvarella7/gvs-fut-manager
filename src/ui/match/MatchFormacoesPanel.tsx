import { useMemo } from 'react';
import type { EsquemaTatico, Jogador } from '../../types/schema';
import type { JogadorEmCampo, MatchSimResult } from '../../engine/matchEngine';
import { esquemaOuPadrao } from '../../data/esquemasTaticos';
import {
  corFundoNota,
  coordsMandanteHorizontal,
  coordsVisitanteHorizontal,
  escalacaoAoMinuto,
  escalacaoInicialTime,
  estimarNotasFormacoes,
  listarBanco,
  listarSubstituicoes,
  mediaNotas,
  numeroCamisa,
  primeiroNomeCurto,
  type NotaJogadorFormacoes,
  type SubstituicaoFormacoes,
} from './formacoesModel';

export type TimeFormacoesInfo = {
  timeId: string;
  nome: string;
  esquema: EsquemaTatico;
  elenco: Jogador[];
  escalacao?: JogadorEmCampo[];
  corPrimaria?: string;
  corSecundaria?: string;
  /** Nome do treinador quando existir no save/perfil; omitido se não houver. */
  treinadorNome?: string | null;
};

/** Árbitro opcional — seção só renderiza se houver dados. */
export type ArbitroFormacoes = {
  nome: string;
  nacionalidade?: string;
  mediaAmarelos?: number;
  mediaVermelhos?: number;
};

type Props = {
  result: MatchSimResult;
  minuto: number;
  mandante: TimeFormacoesInfo;
  visitante: TimeFormacoesInfo;
  arbitro?: ArbitroFormacoes | null;
};

function ChipNota({ nota }: { nota: number }) {
  const texto = nota.toFixed(1);
  const escuro = nota >= 8.5 || nota < 5.5;
  return (
    <span
      className={`inline-block min-w-[1.75rem] rounded px-1 py-px text-center text-[10px] font-bold tabular-nums ${
        escuro ? 'text-zinc-950' : 'text-zinc-950'
      }`}
      style={{ background: corFundoNota(nota) }}
    >
      {texto}
    </span>
  );
}

function AvatarNumero({
  numero,
  corBorda,
}: {
  numero: number;
  corBorda: string;
}) {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-zinc-950/95 text-[10px] font-bold tabular-nums text-zinc-100 shadow sm:h-8 sm:w-8 sm:text-[11px]"
      style={{ borderColor: corBorda }}
      aria-hidden
    >
      {numero}
    </span>
  );
}

function MarcacoesCampoHorizontal() {
  return (
    <>
      <div className="pointer-events-none absolute inset-[2.5%] rounded-sm border border-emerald-100/30" />
      <div className="pointer-events-none absolute bottom-[2.5%] top-[2.5%] left-1/2 w-px -translate-x-1/2 bg-emerald-100/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100/30" />
      <div className="pointer-events-none absolute left-[2.5%] top-1/2 h-[55%] w-[14%] -translate-y-1/2 rounded-r border border-l-0 border-emerald-100/28" />
      <div className="pointer-events-none absolute right-[2.5%] top-1/2 h-[55%] w-[14%] -translate-y-1/2 rounded-l border border-r-0 border-emerald-100/28" />
      <div className="pointer-events-none absolute left-[2.5%] top-1/2 h-[28%] w-[5%] -translate-y-1/2 rounded-r border border-l-0 border-emerald-100/22" />
      <div className="pointer-events-none absolute right-[2.5%] top-1/2 h-[28%] w-[5%] -translate-y-1/2 rounded-l border border-r-0 border-emerald-100/22" />
    </>
  );
}

function JogadorNoCampo({
  left,
  top,
  jogador,
  nota,
  corBorda,
}: {
  left: number;
  top: number;
  jogador: Jogador;
  nota: NotaJogadorFormacoes | undefined;
  corBorda: string;
}) {
  const num = numeroCamisa(jogador.id);
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <div className="relative">
        <AvatarNumero numero={num} corBorda={corBorda} />
        {(nota?.gols ?? 0) > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 rounded bg-zinc-950/95 px-0.5 text-[8px] font-bold leading-none text-emerald-200 ring-1 ring-emerald-500/50"
            title={`${nota!.gols} gol(s)`}
          >
            G{nota!.gols > 1 ? nota!.gols : ''}
          </span>
        )}
      </div>
      {nota && (
        <span className="mt-0.5">
          <ChipNota nota={nota.nota} />
        </span>
      )}
      <span className="mt-0.5 max-w-[4.8rem] truncate text-center text-[10px] font-medium leading-tight text-zinc-100 drop-shadow sm:text-[11px]">
        {primeiroNomeCurto(jogador.nome)}
      </span>
    </div>
  );
}

function CabecalhoTime({
  nome,
  esquema,
  media,
  corPrimaria,
  corSecundaria,
  alinhamento,
}: {
  nome: string;
  esquema: string;
  media: number | null;
  corPrimaria: string;
  corSecundaria: string;
  alinhamento: 'left' | 'right';
}) {
  return (
    <div
      className={`flex flex-1 flex-col gap-1 ${alinhamento === 'right' ? 'items-end text-right' : 'items-start text-left'}`}
    >
      <div className={`flex items-center gap-2 ${alinhamento === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm font-semibold text-zinc-100">{nome}</span>
        {media != null && <ChipNota nota={media} />}
      </div>
      <div className={`flex items-center gap-2 ${alinhamento === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs font-medium tabular-nums text-[var(--mm-celeste)]">{esquema}</span>
        <span
          className="inline-block h-4 w-3 rounded-sm border border-zinc-600"
          style={{
            background: `linear-gradient(180deg, ${corPrimaria} 0%, ${corPrimaria} 55%, ${corSecundaria} 55%)`,
          }}
          title="Camisa"
          aria-hidden
        />
      </div>
    </div>
  );
}

function SecaoTreinadores({
  mandante,
  visitante,
}: {
  mandante: TimeFormacoesInfo;
  visitante: TimeFormacoesInfo;
}) {
  const lados = [
    { time: mandante, lado: 'mandante' as const },
    { time: visitante, lado: 'visitante' as const },
  ];
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Treinadores</h3>
      <div className="grid grid-cols-2 gap-3">
        {lados.map(({ time }) => {
          const nome = time.treinadorNome?.trim();
          return (
            <div key={time.timeId} className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-[10px] font-bold text-zinc-300"
                aria-hidden
              >
                {(nome ?? time.nome).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">{nome || '—'}</p>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Treinador</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LinhaSub({
  sub,
  nota,
  corBorda,
}: {
  sub: SubstituicaoFormacoes;
  nota: NotaJogadorFormacoes | undefined;
  corBorda: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <AvatarNumero numero={numeroCamisa(sub.entrouId)} corBorda={corBorda} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-100">{primeiroNomeCurto(sub.entrouNome)}</p>
        <p className="text-[11px] text-emerald-300/90">
          ↑ {sub.minuto}&apos;
          <span className="text-zinc-500"> · Saiu: {primeiroNomeCurto(sub.saiuNome)}</span>
        </p>
      </div>
      {nota && <ChipNota nota={nota.nota} />}
    </div>
  );
}

function LinhaBanco({ jogador, corBorda }: { jogador: Jogador; corBorda: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <AvatarNumero numero={numeroCamisa(jogador.id)} corBorda={corBorda} />
      <p className="truncate text-sm text-zinc-300">
        <span className="mr-1 text-zinc-500">{numeroCamisa(jogador.id)}</span>
        {primeiroNomeCurto(jogador.nome)}
      </p>
    </div>
  );
}

export function MatchFormacoesPanel({
  result,
  minuto,
  mandante,
  visitante,
  arbitro = null,
}: Props) {
  const modelo = useMemo(() => {
    const escM0 = escalacaoInicialTime(mandante.elenco, mandante.esquema, mandante.escalacao);
    const escV0 = escalacaoInicialTime(visitante.elenco, visitante.esquema, visitante.escalacao);
    const escM = escalacaoAoMinuto(
      escM0,
      mandante.elenco,
      result.lancamentos,
      mandante.timeId,
      minuto,
    );
    const escV = escalacaoAoMinuto(
      escV0,
      visitante.elenco,
      result.lancamentos,
      visitante.timeId,
      minuto,
    );

    const elencoPorId = new Map<number, Jogador>();
    for (const j of [...mandante.elenco, ...visitante.elenco]) elencoPorId.set(j.id, j);

    const notas = estimarNotasFormacoes(
      result,
      elencoPorId,
      minuto,
      [...escM0, ...escV0].map((e) => e.jogador.id),
    );

    const subs = listarSubstituicoes(result, elencoPorId, minuto);
    const sairamM = new Set(
      subs.filter((s) => s.timeId === mandante.timeId).map((s) => s.saiuId),
    );
    const sairamV = new Set(
      subs.filter((s) => s.timeId === visitante.timeId).map((s) => s.saiuId),
    );
    const emCampoM = new Set(escM.map((e) => e.jogador.id));
    const emCampoV = new Set(escV.map((e) => e.jogador.id));

    const notasM = escM
      .map((e) => notas.get(e.jogador.id))
      .filter((n): n is NotaJogadorFormacoes => n != null);
    const notasV = escV
      .map((e) => notas.get(e.jogador.id))
      .filter((n): n is NotaJogadorFormacoes => n != null);

    return {
      escM,
      escV,
      notas,
      subs,
      bancoM: listarBanco(mandante.elenco, emCampoM, sairamM),
      bancoV: listarBanco(visitante.elenco, emCampoV, sairamV),
      mediaM: mediaNotas(notasM),
      mediaV: mediaNotas(notasV),
      coordsM: coordsMandanteHorizontal(mandante.esquema),
      coordsV: coordsVisitanteHorizontal(visitante.esquema),
      esquemaM: esquemaOuPadrao(mandante.esquema),
      esquemaV: esquemaOuPadrao(visitante.esquema),
    };
  }, [result, minuto, mandante, visitante]);

  const corM = mandante.corPrimaria ?? '#74acdf';
  const corM2 = mandante.corSecundaria ?? '#0a2748';
  const corV = visitante.corPrimaria ?? '#f87171';
  const corV2 = visitante.corSecundaria ?? '#450a0a';

  const subsM = modelo.subs.filter((s) => s.timeId === mandante.timeId);
  const subsV = modelo.subs.filter((s) => s.timeId === visitante.timeId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <CabecalhoTime
          nome={mandante.nome}
          esquema={modelo.esquemaM}
          media={modelo.mediaM}
          corPrimaria={corM}
          corSecundaria={corM2}
          alinhamento="left"
        />
        <CabecalhoTime
          nome={visitante.nome}
          esquema={modelo.esquemaV}
          media={modelo.mediaV}
          corPrimaria={corV}
          corSecundaria={corV2}
          alinhamento="right"
        />
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-emerald-900/70 bg-emerald-950/50 bg-[repeating-linear-gradient(0deg,rgba(6,78,59,0.5)_0px,rgba(6,78,59,0.5)_14px,rgba(4,47,46,0.4)_14px,rgba(4,47,46,0.4)_28px)] shadow-inner"
        style={{ aspectRatio: '16 / 10', minHeight: 220 }}
      >
        <MarcacoesCampoHorizontal />
        {modelo.escM.map((e, i) => {
          const c = modelo.coordsM[i];
          if (!c) return null;
          return (
            <JogadorNoCampo
              key={`m-${e.jogador.id}`}
              left={c.x}
              top={c.y}
              jogador={e.jogador}
              nota={modelo.notas.get(e.jogador.id)}
              corBorda={corM}
            />
          );
        })}
        {modelo.escV.map((e, i) => {
          const c = modelo.coordsV[i];
          if (!c) return null;
          return (
            <JogadorNoCampo
              key={`v-${e.jogador.id}`}
              left={c.x}
              top={c.y}
              jogador={e.jogador}
              nota={modelo.notas.get(e.jogador.id)}
              corBorda={corV}
            />
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-500">
        Visualização somente leitura — use <strong className="text-zinc-400">Táticas</strong> para
        editar a escalação.
      </p>

      {arbitro && (
        <section className="space-y-2 border-t border-zinc-800 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Árbitro</h3>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-zinc-100">
              {arbitro.nome}
              {arbitro.nacionalidade ? (
                <span className="ml-2 text-xs text-zinc-500">{arbitro.nacionalidade}</span>
              ) : null}
            </p>
            {(arbitro.mediaAmarelos != null || arbitro.mediaVermelhos != null) && (
              <p className="text-xs text-zinc-400">
                Média de cartões
                {arbitro.mediaVermelhos != null && (
                  <span className="ml-2 text-rose-300">{arbitro.mediaVermelhos.toFixed(2)}</span>
                )}
                {arbitro.mediaAmarelos != null && (
                  <span className="ml-2 text-amber-300">{arbitro.mediaAmarelos.toFixed(2)}</span>
                )}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="border-t border-zinc-800 pt-3">
        <SecaoTreinadores mandante={mandante} visitante={visitante} />
      </div>

      <section className="space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Substituições
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            {subsM.length === 0 ? (
              <p className="py-1 text-xs text-zinc-600">Nenhuma ainda</p>
            ) : (
              subsM.map((s) => (
                <LinhaSub
                  key={`${s.minuto}-${s.entrouId}`}
                  sub={s}
                  nota={modelo.notas.get(s.entrouId)}
                  corBorda={corM}
                />
              ))
            )}
            {modelo.bancoM.length > 0 && (
              <div className="mt-2 border-t border-zinc-800/80 pt-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Banco</p>
                {modelo.bancoM.map((j) => (
                  <LinhaBanco key={j.id} jogador={j} corBorda={corM} />
                ))}
              </div>
            )}
          </div>
          <div>
            {subsV.length === 0 ? (
              <p className="py-1 text-xs text-zinc-600">Nenhuma ainda</p>
            ) : (
              subsV.map((s) => (
                <LinhaSub
                  key={`${s.minuto}-${s.entrouId}`}
                  sub={s}
                  nota={modelo.notas.get(s.entrouId)}
                  corBorda={corV}
                />
              ))
            )}
            {modelo.bancoV.length > 0 && (
              <div className="mt-2 border-t border-zinc-800/80 pt-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Banco</p>
                {modelo.bancoV.map((j) => (
                  <LinhaBanco key={j.id} jogador={j} corBorda={corV} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
