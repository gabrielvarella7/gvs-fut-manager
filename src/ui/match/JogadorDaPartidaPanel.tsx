import type { ReactNode } from 'react';
import {
  corNotaCaixa,
  formatarVotos,
  type JogadorDaPartidaDados,
} from '../../engine/jogadorDaPartida';

type Props = {
  dados: JogadorDaPartidaDados;
};

function CaixaNota({ nota, destaque }: { nota: number; destaque?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[2.4rem] items-center justify-center rounded font-semibold tabular-nums ${
        destaque ? 'px-2 py-1 text-lg' : 'px-1.5 py-0.5 text-sm'
      } ${corNotaCaixa(nota)}`}
    >
      {nota.toFixed(1)}
    </span>
  );
}

function LinhaLista({ nome, valor }: { nome: string; valor: ReactNode }) {
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm text-zinc-200">
      <span className="shrink-0">{valor}</span>
      <span className="min-w-0 truncate font-medium">{nome}</span>
    </li>
  );
}

export function JogadorDaPartidaPanel({ dados }: Props) {
  const { destaqueNota, destaqueFans, topNotas, topFans, totalVotos } = dados;
  const listasNota = topNotas.slice(1);
  const listasFans = topFans.slice(1);

  return (
    <section
      className="jogador-partida rounded-lg border border-[var(--mm-border)] bg-zinc-900/85 p-3 sm:p-4"
      aria-label="Jogador da partida"
    >
      <h3 className="mb-3 text-center text-sm font-semibold tracking-wide text-zinc-100">
        Jogador da partida
      </h3>

      <div className="relative grid grid-cols-2 gap-2 sm:gap-3">
        <div
          className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[var(--mm-celeste)] to-transparent opacity-50"
          aria-hidden
        />

        <div className="pr-2 text-center sm:pr-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--mm-celeste)]">
            Nota
          </p>
          <p className="truncate text-sm font-semibold text-zinc-50">{destaqueNota.nome}</p>
          <p className="mb-2 truncate text-[11px] text-zinc-500">{destaqueNota.timeNome}</p>
          <CaixaNota nota={destaqueNota.nota} destaque />
        </div>

        <div className="pl-2 text-center sm:pl-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--mm-celeste)]">
            Escolha dos fãs
          </p>
          <p className="truncate text-sm font-semibold text-zinc-50">{destaqueFans.nome}</p>
          <p className="mb-2 truncate text-[11px] text-zinc-500">{destaqueFans.timeNome}</p>
          <span className="inline-flex items-center rounded-full border border-zinc-500/60 bg-zinc-800 px-2.5 py-1 text-sm font-semibold tabular-nums text-zinc-50">
            {destaqueFans.votosPct}%
          </span>
          <p className="mt-1 text-[10px] text-zinc-500">{formatarVotos(totalVotos)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
        <ul className="min-w-0 space-y-0.5">
          {listasNota.map((j) => (
            <LinhaLista key={`n-${j.id}`} nome={j.nome} valor={<CaixaNota nota={j.nota} />} />
          ))}
        </ul>
        <ul className="min-w-0 space-y-0.5">
          {listasFans.map((j) => (
            <LinhaLista
              key={`f-${j.id}`}
              nome={j.nome}
              valor={
                <span className="inline-block min-w-[2.4rem] text-right text-sm font-semibold tabular-nums text-zinc-300">
                  {j.votosPct}%
                </span>
              }
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
