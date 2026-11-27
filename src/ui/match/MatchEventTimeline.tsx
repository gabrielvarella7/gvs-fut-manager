import { useEffect, useRef, type ReactNode } from 'react';
import type { Lancamento } from '../../engine/matchEngine';

type Props = {
  lancamentos: Lancamento[];
  mandanteId: string;
  /** Placar corrente após os lances visíveis (para FT). */
  placarAtual: { m: number; v: number };
};

type ItemTimeline =
  | {
      key: string;
      kind: 'gol';
      minuto: number;
      casa: boolean;
      autor: string;
      assistente?: string;
      placar: { m: number; v: number };
    }
  | {
      key: string;
      kind: 'sub';
      minuto: number;
      casa: boolean;
      entra: string;
      sai: string;
    }
  | {
      key: string;
      kind: 'cartao';
      minuto: number;
      casa: boolean;
      jogador: string;
      vermelho: boolean;
      motivo: string;
    }
  | { key: string; kind: 'ht'; placar: { m: number; v: number } }
  | { key: string; kind: 'ft'; placar: { m: number; v: number } }
  | { key: string; kind: 'acrescimo'; minutos: number };

function nomeCurto(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? nome;
  const primeiro = parts[0]!;
  const ultimo = parts[parts.length - 1]!;
  return `${primeiro.charAt(0)}. ${ultimo}`;
}

function motivoCartao(texto: string, vermelho: boolean): string {
  if (vermelho) {
    if (/segundo amarelo|2[ºo]\s*amarelo/i.test(texto)) return 'Segundo amarelo';
    return 'Expulsão';
  }
  if (/desacordo|palavras|reclam/i.test(texto)) return 'Desacordo por palavras';
  if (/entrada|carrinho|falta dura/i.test(texto)) return 'Entrada dura';
  if (/mão|mao/i.test(texto)) return 'Mão na bola';
  return 'Advertência';
}

function IconeBola({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1" />
      <path
        fill="#18181b"
        d="M12 7.2 9.6 8l.9 2.8h3l.9-2.8L12 7.2zm-4.2 4.2-3.2-.5 1.3 3.6 2.9-.9-1-2.2zm8.4 0-1 2.2 2.9.9 1.3-3.6-3.2.5zM8.2 14.5l-1.4 3A9 9 0 0 0 12 21.5V17l-3.8-2.5zm7.6 0L12 17v4.5a9 9 0 0 0 5.2-4l-1.4-3z"
      />
    </svg>
  );
}

function IconeSub({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M4 7h9l-2.2-2.2 1.1-1.1L16.2 8 11.9 12.3l-1.1-1.1L13 9H4V7z"
        className="fill-emerald-400"
      />
      <path
        d="M16 13H7l2.2 2.2-1.1 1.1L3.8 12 8.1 7.7l1.1 1.1L7 11h9v2z"
        className="fill-rose-400"
      />
    </svg>
  );
}

function construirItens(
  lancamentos: Lancamento[],
  mandanteId: string,
  placarAtual: { m: number; v: number },
): ItemTimeline[] {
  const itens: ItemTimeline[] = [];
  let golsM = 0;
  let golsV = 0;
  let eventos1T45 = 0;
  let eventos2T90 = 0;
  let mostrouAcrescimo1 = false;
  let mostrouAcrescimo2 = false;

  for (let i = 0; i < lancamentos.length; i++) {
    const l = lancamentos[i]!;
    const casa = l.timeId === mandanteId;

    if (l.minuto === 45 && l.tipo !== 'intervalo' && l.tipo !== 'inicio') {
      eventos1T45 += 1;
    }
    if (l.minuto >= 90 && l.tipo !== 'fim' && l.tipo !== 'inicio') {
      eventos2T90 += 1;
    }

    if (l.tipo === 'intervalo') {
      itens.push({
        key: `ht-${i}`,
        kind: 'ht',
        placar: { m: golsM, v: golsV },
      });
      // Depois do HT na ordem cronológica → fica acima do HT com newest-on-top (ref).
      if (!mostrouAcrescimo1) {
        const n = Math.min(6, Math.max(1, eventos1T45 + 1));
        itens.push({ key: `acrescimo-1-${i}`, kind: 'acrescimo', minutos: n });
        mostrouAcrescimo1 = true;
      }
      continue;
    }

    if (l.tipo === 'fim') {
      // Antes do FT na ordem cronológica → fica abaixo do FT com newest-on-top (ref).
      if (!mostrouAcrescimo2) {
        const n = Math.min(8, Math.max(1, eventos2T90 + 2));
        itens.push({ key: `acrescimo-2-${i}`, kind: 'acrescimo', minutos: n });
        mostrouAcrescimo2 = true;
      }
      itens.push({
        key: `ft-${i}`,
        kind: 'ft',
        placar: placarAtual,
      });
      continue;
    }

    if (l.tipo === 'gol' && l.timeId) {
      if (casa) golsM += 1;
      else golsV += 1;
      itens.push({
        key: `gol-${i}-${l.minuto}`,
        kind: 'gol',
        minuto: l.minuto,
        casa,
        autor: l.jogadorNome ?? 'Jogador',
        assistente: l.assistenteNome,
        placar: { m: golsM, v: golsV },
      });
      continue;
    }

    if (l.tipo === 'substituicao' && l.timeId) {
      itens.push({
        key: `sub-${i}-${l.minuto}`,
        kind: 'sub',
        minuto: l.minuto,
        casa,
        entra: l.jogadorNomeEntrada ?? 'Entra',
        sai: l.jogadorNome ?? 'Sai',
      });
      continue;
    }

    if (l.tipo === 'cartao_amarelo' && l.timeId) {
      const vermelho = l.cartao === 'vermelho' || /expuls/i.test(l.texto);
      itens.push({
        key: `card-${i}-${l.minuto}`,
        kind: 'cartao',
        minuto: l.minuto,
        casa,
        jogador: l.jogadorNome ?? 'Jogador',
        vermelho,
        motivo: motivoCartao(l.texto, vermelho),
      });
    }
  }

  return itens.reverse();
}

function MarcadorLinha({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5" role="presentation">
      <div className="h-px flex-1 bg-zinc-700/80" />
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-300">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-700/80" />
    </div>
  );
}

function EventoLinha({
  casa,
  minuto,
  icone,
  children,
}: {
  casa: boolean;
  minuto: number;
  icone: ReactNode;
  children: ReactNode;
}) {
  if (casa) {
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 py-1.5 text-xs">
        <div className="flex items-center justify-end gap-1.5 text-right">
          <span className="tabular-nums text-zinc-400">{minuto}&apos;</span>
          {icone}
          <div className="min-w-0">{children}</div>
        </div>
        <div className="flex h-full w-3 justify-center" aria-hidden>
          <div className="w-px bg-zinc-700/60" />
        </div>
        <div />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 py-1.5 text-xs">
      <div />
      <div className="flex h-full w-3 justify-center" aria-hidden>
        <div className="w-px bg-zinc-700/60" />
      </div>
      <div className="flex items-center justify-start gap-1.5 text-left">
        <div className="min-w-0">{children}</div>
        {icone}
        <span className="tabular-nums text-zinc-400">{minuto}&apos;</span>
      </div>
    </div>
  );
}

export function MatchEventTimeline({ lancamentos, mandanteId, placarAtual }: Props) {
  const itens = construirItens(lancamentos, mandanteId, placarAtual);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = 0;
  }, [itens.length]);

  if (itens.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-4 text-center text-xs text-zinc-500">
        Aguardando eventos da partida…
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-2 py-2 sm:px-3"
      aria-label="Linha do tempo dos eventos"
    >
      <ul ref={listaRef} className="max-h-64 overflow-y-auto pr-1">
        {itens.map((item) => {
          if (item.kind === 'ht') {
            return (
              <li key={item.key}>
                <MarcadorLinha label={`HT ${item.placar.m} - ${item.placar.v}`} />
              </li>
            );
          }
          if (item.kind === 'ft') {
            return (
              <li key={item.key}>
                <MarcadorLinha label={`FT ${item.placar.m} - ${item.placar.v}`} />
              </li>
            );
          }
          if (item.kind === 'acrescimo') {
            return (
              <li key={item.key} className="flex justify-center py-1.5">
                <span className="rounded-full bg-zinc-800 px-3 py-0.5 text-[11px] text-zinc-400">
                  Tempo adicional {item.minutos}
                </span>
              </li>
            );
          }
          if (item.kind === 'gol') {
            const nomes = (
              <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5">
                {item.assistente && (
                  <span className="text-zinc-500">{nomeCurto(item.assistente)}</span>
                )}
                <span className="font-medium text-zinc-100">{nomeCurto(item.autor)}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                  <span aria-hidden className="text-[8px]">
                    ▶
                  </span>
                  {item.placar.m} - {item.placar.v}
                </span>
              </span>
            );
            const nomesAway = (
              <span className="inline-flex flex-wrap items-baseline justify-start gap-x-1.5">
                {item.assistente && (
                  <span className="text-zinc-500">{nomeCurto(item.assistente)}</span>
                )}
                <span className="font-medium text-zinc-100">{nomeCurto(item.autor)}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                  <span aria-hidden className="text-[8px]">
                    ▶
                  </span>
                  {item.placar.m} - {item.placar.v}
                </span>
              </span>
            );
            return (
              <li key={item.key}>
                <EventoLinha
                  casa={item.casa}
                  minuto={item.minuto}
                  icone={<IconeBola className="h-4 w-4 shrink-0" />}
                >
                  {item.casa ? nomes : nomesAway}
                </EventoLinha>
              </li>
            );
          }
          if (item.kind === 'sub') {
            const blocoCasa = (
              <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5">
                <span className="font-medium text-zinc-100">{nomeCurto(item.entra)}</span>
                <span className="text-zinc-500">{nomeCurto(item.sai)}</span>
              </span>
            );
            const blocoFora = (
              <span className="inline-flex flex-wrap items-baseline justify-start gap-x-1.5">
                <span className="text-zinc-500">{nomeCurto(item.sai)}</span>
                <span className="font-medium text-zinc-100">{nomeCurto(item.entra)}</span>
              </span>
            );
            return (
              <li key={item.key}>
                <EventoLinha
                  casa={item.casa}
                  minuto={item.minuto}
                  icone={<IconeSub className="h-4 w-4 shrink-0" />}
                >
                  {item.casa ? blocoCasa : blocoFora}
                </EventoLinha>
              </li>
            );
          }
          // cartao
          const card = (
            <span
              className={`inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] ${
                item.vermelho ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              title={item.vermelho ? 'Cartão vermelho' : 'Cartão amarelo'}
            />
          );
          const blocoCasa = (
            <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5">
              <span className="max-w-[9rem] truncate text-zinc-500">{item.motivo}</span>
              <span className="font-medium text-zinc-100">{nomeCurto(item.jogador)}</span>
            </span>
          );
          const blocoFora = (
            <span className="inline-flex flex-wrap items-baseline justify-start gap-x-1.5">
              <span className="max-w-[9rem] truncate text-zinc-500">{item.motivo}</span>
              <span className="font-medium text-zinc-100">{nomeCurto(item.jogador)}</span>
            </span>
          );
          return (
            <li key={item.key}>
              <EventoLinha casa={item.casa} minuto={item.minuto} icone={card}>
                {item.casa ? blocoCasa : blocoFora}
              </EventoLinha>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
