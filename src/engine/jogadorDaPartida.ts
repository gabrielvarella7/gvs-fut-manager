import type { Lancamento, MatchSimResult } from './matchEngine';
import { criarRng } from './matchEngine';

export type InfoJogadorPartida = {
  id: number;
  nome: string;
  timeId: string;
};

export type EntradaJogadorDaPartida = {
  id: number;
  nome: string;
  timeId: string;
  timeNome: string;
  nota: number;
  votosPct: number;
};

export type JogadorDaPartidaDados = {
  destaqueNota: EntradaJogadorDaPartida;
  destaqueFans: EntradaJogadorDaPartida;
  topNotas: EntradaJogadorDaPartida[];
  topFans: EntradaJogadorDaPartida[];
  totalVotos: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function arredondarNota(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Notas 0–10 estilo Sofascore a partir dos lances + energia final.
 * Votos dos fãs = % simulada a partir das notas (estável via simSeed).
 */
export function calcularJogadorDaPartida(
  result: MatchSimResult,
  jogadores: ReadonlyMap<number, InfoJogadorPartida> | Readonly<Record<number, InfoJogadorPartida>>,
  mandanteNome: string,
  visitanteNome: string,
): JogadorDaPartidaDados | null {
  const lookup = (id: number): InfoJogadorPartida | undefined => {
    if (jogadores instanceof Map) return jogadores.get(id);
    return jogadores[id];
  };

  const nomeTime = (timeId: string) =>
    timeId === result.mandanteId ? mandanteNome : visitanteNome;

  type Acc = {
    id: number;
    nome: string;
    timeId: string;
    gols: number;
    chances: number;
    defesas: number;
    cartoes: number;
    lesoes: number;
    entrou: boolean;
    saiu: boolean;
    minutoEntrou: number;
    minutoSaiu: number;
    energia: number;
  };

  const porId = new Map<number, Acc>();

  const garantir = (id: number, timeIdHint?: string): Acc | null => {
    const existente = porId.get(id);
    if (existente) {
      if (timeIdHint && !existente.timeId) existente.timeId = timeIdHint;
      return existente;
    }
    const info = lookup(id);
    const timeId = timeIdHint || info?.timeId || '';
    if (!info && !timeId) return null;
    const acc: Acc = {
      id,
      nome: info?.nome ?? `Jogador #${id}`,
      timeId: timeId || info?.timeId || '',
      gols: 0,
      chances: 0,
      defesas: 0,
      cartoes: 0,
      lesoes: 0,
      entrou: false,
      saiu: false,
      minutoEntrou: 0,
      minutoSaiu: 90,
      energia: 70,
    };
    porId.set(id, acc);
    return acc;
  };

  for (const e of result.energiaFinal) {
    const a = garantir(e.id);
    if (a) a.energia = e.energia;
  }

  const aplicarLance = (l: Lancamento) => {
    if (l.tipo === 'gol' && l.jogadorId != null) {
      const a = garantir(l.jogadorId, l.timeId);
      if (a) a.gols += 1;
    } else if (l.tipo === 'chance' && l.jogadorId != null) {
      const a = garantir(l.jogadorId, l.timeId);
      if (a) a.chances += 1;
    } else if (l.tipo === 'defesa' && l.jogadorId != null) {
      const a = garantir(l.jogadorId, l.timeId);
      if (a) a.defesas += 1;
    } else if (l.tipo === 'cartao_amarelo' && l.jogadorId != null) {
      const a = garantir(l.jogadorId, l.timeId);
      if (a) a.cartoes += 1;
    } else if (l.tipo === 'lesao' && l.jogadorId != null) {
      const a = garantir(l.jogadorId, l.timeId);
      if (a) a.lesoes += 1;
    } else if (l.tipo === 'substituicao') {
      if (l.jogadorId != null) {
        const sai = garantir(l.jogadorId, l.timeId);
        if (sai) {
          sai.saiu = true;
          sai.minutoSaiu = l.minuto;
        }
      }
      if (l.jogadorIdEntrada != null) {
        const entra = garantir(l.jogadorIdEntrada, l.timeId);
        if (entra) {
          entra.entrou = true;
          entra.minutoEntrou = l.minuto;
        }
      }
    }
  };

  for (const l of result.lancamentos) aplicarLance(l);

  if (porId.size === 0) return null;

  const venceuMandante = result.golsMandante > result.golsVisitante;
  const venceuVisitante = result.golsVisitante > result.golsMandante;

  const rnd = criarRng((result.simSeed ?? 1) ^ 0x4a0d1e);

  const comNota = [...porId.values()]
    .filter((a) => a.timeId)
    .map((a) => {
      let nota = 6.15 + rnd() * 0.35;
      if (a.gols === 1) nota += 1.05;
      else if (a.gols === 2) nota += 1.85;
      else if (a.gols >= 3) nota += 2.45;
      nota += a.chances * 0.12;
      nota += a.defesas * 0.28;
      nota -= a.cartoes * 0.4;
      nota -= a.lesoes * 0.3;
      if (a.saiu && a.minutoSaiu <= 55 && a.gols === 0) nota -= 0.15;
      if (a.entrou && a.minutoEntrou >= 70 && a.gols === 0 && a.chances === 0) nota -= 0.05;
      if (a.entrou && a.gols > 0) nota += 0.2;
      const timeVenceu =
        (a.timeId === result.mandanteId && venceuMandante) ||
        (a.timeId === result.visitanteId && venceuVisitante);
      if (timeVenceu) nota += 0.12;
      if (a.energia >= 78) nota += 0.08;
      if (a.energia < 55) nota -= 0.1;
      nota = arredondarNota(clamp(nota, 4.8, 9.9));
      return {
        id: a.id,
        nome: a.nome,
        timeId: a.timeId,
        timeNome: nomeTime(a.timeId),
        nota,
        votosPct: 0,
      } satisfies EntradaJogadorDaPartida;
    });

  if (comNota.length === 0) return null;

  // Votos concentrados nos melhores (estilo Sofascore): softmax forte nos top 8.
  const ordenadosPorNota = [...comNota].sort((a, b) => b.nota - a.nota);
  const candidatosFans = ordenadosPorNota.slice(0, Math.min(8, ordenadosPorNota.length));
  const pesosFans = candidatosFans.map((j) => {
    const ruido = 0.9 + rnd() * 0.25;
    return Math.exp((j.nota - 6.0) * 1.85) * ruido;
  });
  const somaPesosFans = pesosFans.reduce((s, p) => s + p, 0) || 1;
  const pctPorId = new Map<number, number>();
  let restante = 100;
  candidatosFans.forEach((j, i) => {
    const bruto = (pesosFans[i]! / somaPesosFans) * 100;
    const pct =
      i === candidatosFans.length - 1 ? restante : Math.max(1, Math.round(bruto));
    if (i < candidatosFans.length - 1) restante -= pct;
    pctPorId.set(j.id, clamp(pct, 1, 99));
  });
  // Corrige arredondamento no último candidato.
  if (candidatosFans.length > 0) {
    const soma = [...pctPorId.values()].reduce((s, n) => s + n, 0);
    const ultimoId = candidatosFans[candidatosFans.length - 1]!.id;
    pctPorId.set(ultimoId, clamp((pctPorId.get(ultimoId) ?? 1) + (100 - soma), 1, 99));
  }

  const comVotos = comNota.map((j) => ({
    ...j,
    votosPct: pctPorId.get(j.id) ?? 0,
  }));

  const porNota = [...comVotos].sort((a, b) => b.nota - a.nota || b.votosPct - a.votosPct);
  const porFans = [...comVotos]
    .filter((j) => j.votosPct > 0)
    .sort((a, b) => b.votosPct - a.votosPct || b.nota - a.nota);

  const topN = 4;
  const totalVotos = 1800 + Math.floor(rnd() * 6200);

  return {
    destaqueNota: porNota[0]!,
    destaqueFans: porFans[0]!,
    topNotas: porNota.slice(0, topN),
    topFans: porFans.slice(0, topN),
    totalVotos,
  };
}

export function formatarVotos(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace('.', ',')}k votos`;
  }
  return `${n} votos`;
}

export function corNotaCaixa(nota: number): string {
  if (nota >= 9) return 'bg-sky-500 text-white';
  if (nota >= 8) return 'bg-sky-600/90 text-sky-50';
  if (nota >= 7) return 'bg-emerald-700 text-emerald-50';
  if (nota >= 6) return 'bg-zinc-600 text-zinc-100';
  return 'bg-amber-800/90 text-amber-100';
}
