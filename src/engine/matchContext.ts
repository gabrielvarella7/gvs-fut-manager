import type { EstadoTemporada } from '../career/brasileirao';
import { ordenarTabela, posicaoDoTime } from '../career/brasileirao';
import { db } from '../db/database';
import type { JogoCalendario, LinhaTabela, Time } from '../types/schema';

export type ResultadoRecente = 'V' | 'E' | 'D';

export type ContextoNecessidade =
  | 'NORMAL'
  | 'DECISIVO_TITULO'
  | 'DESESPERO_REBAIXAMENTO'
  | 'CUMPRINDO_TABELA';

/** Pares por slug (public/database/times.json) — Gre-Nal, Fla-Flu, etc. */
const PARES_CLASSICOS = new Set<string>([
  'flamengo_fluminense',
  'flamengo_vasco',
  'flamengo_botafogo',
  'fluminense_vasco',
  'botafogo_fluminense',
  'botafogo_vasco',
  'corinthians_palmeiras',
  'corinthians_sao_paulo',
  'palmeiras_sao_paulo',
  'santos_corinthians',
  'santos_palmeiras',
  'santos_sao_paulo',
  'atletico_mg_cruzeiro',
  'gremio_internacional',
  'bahia_vitoria',
  'athletico_pr_coritiba',
]);

export interface ContextoDinamicoPartida {
  ultimosResultadosMandante: ResultadoRecente[];
  ultimosResultadosVisitante: ResultadoRecente[];
  necessidadeMandante: ContextoNecessidade;
  necessidadeVisitante: ContextoNecessidade;
  isClassico: boolean;
}

export function slugDoTime(timeId: string, times: Time[]): string {
  const t = times.find((x) => x.id === timeId);
  return (t?.slug ?? timeId).toLowerCase();
}

export function detectarClassico(mandanteId: string, visitanteId: string, times: Time[]): boolean {
  const a = slugDoTime(mandanteId, times);
  const b = slugDoTime(visitanteId, times);
  return PARES_CLASSICOS.has(`${a}_${b}`) || PARES_CLASSICOS.has(`${b}_${a}`);
}

/** Moral do elenco (-100…+100) → multiplicador 0,92…1,08 (pesos do anexo). */
export function calcularFatorMoral(historico: ResultadoRecente[] = []): {
  indiceMoral: number;
  multiplicador: number;
} {
  if (historico.length === 0) {
    return { indiceMoral: 0, multiplicador: 1.0 };
  }

  /** Só os 3 últimos jogos — efeito limitado, não acumula temporada inteira. */
  const ultimos = historico.slice(-3);

  let pontuacao = 0;
  for (const res of ultimos) {
    const valor = res === 'V' ? 12 : res === 'D' ? -12 : 0;
    pontuacao += valor;
  }

  const ultimosDois = ultimos.slice(-2);
  if (ultimosDois.length === 2 && ultimosDois.every((r) => r === 'D')) {
    pontuacao -= 4;
  } else if (ultimosDois.length === 2 && ultimosDois.every((r) => r === 'V')) {
    pontuacao += 4;
  }

  const indiceMoral = Math.max(-36, Math.min(36, Math.round(pontuacao)));
  /** No máximo ±3,5% de força — time fraco ainda pode vencer time forte. */
  const multiplicador = 1 + (indiceMoral / 36) * 0.035;

  return { indiceMoral, multiplicador };
}

function resultadoParaTime(
  mandanteId: string,
  visitanteId: string,
  timeId: string,
  gm: number,
  gv: number,
): ResultadoRecente {
  const casa = mandanteId === timeId;
  const gp = casa ? gm : gv;
  const gc = casa ? gv : gm;
  if (gp > gc) return 'V';
  if (gp < gc) return 'D';
  return 'E';
}

export function ultimosResultadosDoCalendario(
  jogos: JogoCalendario[],
  timeId: string,
  max = 5,
): ResultadoRecente[] {
  const lista = jogos
    .filter(
      (j) =>
        j.finalizado &&
        j.gols_mandante != null &&
        j.gols_visitante != null &&
        (j.mandante_id === timeId || j.visitante_id === timeId),
    )
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, max);
  return lista
    .map((j) =>
      resultadoParaTime(
        j.mandante_id,
        j.visitante_id,
        timeId,
        j.gols_mandante!,
        j.gols_visitante!,
      ),
    )
    .reverse();
}

export function ultimosResultadosDaTemporada(
  estado: EstadoTemporada,
  timeId: string,
  max = 5,
): ResultadoRecente[] {
  const jogos: JogoCalendario[] = estado.partidas
    .filter(
      (p) =>
        p.finalizado &&
        p.golsMandante != null &&
        p.golsVisitante != null &&
        (p.mandanteId === timeId || p.visitanteId === timeId),
    )
    .map((p) => ({
      id: p.id,
      rodada: p.rodada,
      mandante_id: p.mandanteId,
      visitante_id: p.visitanteId,
      gols_mandante: p.golsMandante ?? null,
      gols_visitante: p.golsVisitante ?? null,
      finalizado: true,
    }));
  return ultimosResultadosDoCalendario(jogos, timeId, max);
}

export async function ultimosResultadosIndexedDb(
  timeId: string,
  max = 5,
): Promise<ResultadoRecente[]> {
  const jogos = await db.calendario
    .filter(
      (j) =>
        j.finalizado &&
        (j.mandante_id === timeId || j.visitante_id === timeId),
    )
    .toArray();
  return ultimosResultadosDoCalendario(jogos, timeId, max);
}

export function calcularNecessidade(
  timeId: string,
  rodadaAtual: number,
  tabela: LinhaTabela[],
): ContextoNecessidade {
  if (rodadaAtual < 30) return 'NORMAL';

  const ord = ordenarTabela(tabela);
  const pos = posicaoDoTime(tabela, timeId);
  const minha = ord.find((l) => l.time_id === timeId);
  const lider = ord[0];
  const decimoSetimo = ord[16];

  const ptsM = minha?.pontos ?? 0;
  const ptsLider = lider?.pontos ?? 0;
  const pts17 = decimoSetimo?.pontos ?? 0;

  if (pos >= 1 && pos <= 4 && ptsLider - ptsM <= 6) {
    return 'DECISIVO_TITULO';
  }
  if (pos >= 15 && pos <= 20 && ptsM - pts17 <= 5) {
    return 'DESESPERO_REBAIXAMENTO';
  }
  if (rodadaAtual >= 34) return 'CUMPRINDO_TABELA';
  return 'NORMAL';
}

/** Modificadores de pressão por urgência (minuto ≥ 70, perdendo ou empatando). */
export function modificadoresUrgencia(
  necessidade: ContextoNecessidade,
  minuto: number,
  golsProprio: number,
  golsRival: number,
): { ataque: number; defesa: number } {
  if (necessidade === 'CUMPRINDO_TABELA') {
    return { ataque: 0.95, defesa: 0.95 };
  }
  if (necessidade === 'NORMAL') {
    return { ataque: 1, defesa: 1 };
  }
  if (minuto <= 70) {
    return { ataque: 0.97, defesa: 1.05 };
  }
  if (golsProprio <= golsRival) {
    return { ataque: 1.22, defesa: 0.76 };
  }
  return { ataque: 1, defesa: 1 };
}

export function montarContextoPartidaSync(opts: {
  mandanteId: string;
  visitanteId: string;
  times: Time[];
  estado: EstadoTemporada;
  isClassico?: boolean;
}): ContextoDinamicoPartida {
  const { estado, mandanteId, visitanteId, times } = opts;
  return {
    ultimosResultadosMandante: ultimosResultadosDaTemporada(estado, mandanteId),
    ultimosResultadosVisitante: ultimosResultadosDaTemporada(estado, visitanteId),
    necessidadeMandante: calcularNecessidade(mandanteId, estado.rodadaAtual, estado.tabela),
    necessidadeVisitante: calcularNecessidade(visitanteId, estado.rodadaAtual, estado.tabela),
    isClassico: opts.isClassico ?? detectarClassico(mandanteId, visitanteId, times),
  };
}

/** Lê calendário/tabela do IndexedDB (sincronizados com a carreira). */
export async function montarContextoPartidaDb(opts: {
  mandanteId: string;
  visitanteId: string;
  times: Time[];
  rodadaAtual: number;
  isClassico?: boolean;
}): Promise<ContextoDinamicoPartida> {
  const [tabela, ultM, ultV] = await Promise.all([
    db.tabela.toArray(),
    ultimosResultadosIndexedDb(opts.mandanteId),
    ultimosResultadosIndexedDb(opts.visitanteId),
  ]);
  return {
    ultimosResultadosMandante: ultM,
    ultimosResultadosVisitante: ultV,
    necessidadeMandante: calcularNecessidade(opts.mandanteId, opts.rodadaAtual, tabela),
    necessidadeVisitante: calcularNecessidade(opts.visitanteId, opts.rodadaAtual, tabela),
    isClassico:
      opts.isClassico ??
      detectarClassico(opts.mandanteId, opts.visitanteId, opts.times),
  };
}