import type { EstadoTemporada, PartidaCampeonato } from './brasileirao';
import { formatarDataBr } from './brasileirao';
import type { JogoTorneio, TimeFicticio } from './types';
import type { MatchSimResult } from '../engine/matchEngine';
import type { Time } from '../types/schema';

export const INTERVALOS_GOL = [0, 15, 30, 45, 60, 75, 90] as const;

export type FaixaGol = 0 | 1 | 2 | 3 | 4 | 5;

export type ResultadoLetra = 'V' | 'E' | 'D';

export interface TimeH2HBadge {
  id: string;
  nome: string;
  sigla: string;
  corPrimaria: string;
  corSecundaria: string;
}

export interface ConfrontoH2H {
  id: string;
  rodada: number;
  dataISO: string;
  dataLabel: string;
  competicao: string;
  mandante: TimeH2HBadge;
  visitante: TimeH2HBadge;
  golsMandante: number;
  golsVisitante: number;
  emCasaUsuario?: boolean;
}

export interface PartidaRecenteH2H {
  id: string;
  rodada: number;
  dataISO: string;
  dataLabel: string;
  competicao: string;
  adversario: TimeH2HBadge;
  emCasa: boolean;
  golsPro: number;
  golsContra: number;
  resultado: ResultadoLetra;
}

export interface SequenciaH2H {
  timeId: string;
  label: string;
  valor: string;
  positivo: boolean;
}

export interface DistribuicaoGolsH2H {
  timeId: string;
  marcados: number[];
  sofridos: number[];
  partidasAmostra: number;
}

export interface TreinadoresH2H {
  mandanteNome: string;
  visitanteNome: string;
  vitoriasMandante: number;
  vitoriasVisitante: number;
  empates: number;
  ultimaPartida: string | null;
}

export interface DadosH2H {
  competicao: string;
  mandante: TimeH2HBadge;
  visitante: TimeH2HBadge;
  treinadores: TreinadoresH2H;
  confrontos: ConfrontoH2H[];
  recentesMandante: PartidaRecenteH2H[];
  recentesVisitante: PartidaRecenteH2H[];
  sequencias: SequenciaH2H[];
  golsMandante: DistribuicaoGolsH2H;
  golsVisitante: DistribuicaoGolsH2H;
}

function siglaDeNome(nome: string): string {
  const limpo = nome.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, ' ').trim();
  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '???';
  if (partes.length === 1) return partes[0]!.slice(0, 3).toUpperCase();
  return partes
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join('')
    .slice(0, 3);
}

function badgeDeTime(t: Time): TimeH2HBadge {
  return {
    id: t.id,
    nome: t.nome,
    sigla: siglaDeNome(t.nome),
    corPrimaria: t.cor_primaria,
    corSecundaria: t.cor_secundaria,
  };
}

function badgeFicticio(t: TimeFicticio): TimeH2HBadge {
  return {
    id: t.id,
    nome: t.nome,
    sigla: siglaDeNome(t.nome),
    corPrimaria: '#1e3a5f',
    corSecundaria: '#74acdf',
  };
}

const NOMES_CPU = [
  'R. Almeida',
  'C. Ferreira',
  'L. Mendes',
  'A. Rocha',
  'P. Nogueira',
  'M. Campos',
  'D. Barbosa',
  'F. Teixeira',
  'G. Vieira',
  'S. Cardoso',
  'H. Pinto',
  'J. Ramos',
];

export function nomeTecnicoCpu(timeId: string): string {
  let h = 0;
  for (const c of timeId) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return NOMES_CPU[h % NOMES_CPU.length]!;
}

function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const p of parts) {
    for (const c of String(p)) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function faixaDeMinuto(minuto: number): FaixaGol {
  if (minuto < 15) return 0;
  if (minuto < 30) return 1;
  if (minuto < 45) return 2;
  if (minuto < 60) return 3;
  if (minuto < 75) return 4;
  return 5;
}

/** Distribui N gols em faixas de 15' de forma determinística (histórico sem minutos). */
function minutosPseudo(partidaId: string | number, gols: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < gols; i++) {
    const h = hashSeed(partidaId, i, 'gol');
    out.push(1 + (h % 90));
  }
  return out;
}

function minutosDeResultado(
  result: MatchSimResult | undefined,
  timeId: string,
): { marcados: number[]; sofridos: number[] } {
  if (!result) return { marcados: [], sofridos: [] };
  const marcados: number[] = [];
  const sofridos: number[] = [];
  for (const l of result.lancamentos) {
    if (l.tipo !== 'gol') continue;
    if (l.timeId === timeId) marcados.push(l.minuto);
    else sofridos.push(l.minuto);
  }
  return { marcados, sofridos };
}

function resultadoDePlacar(gp: number, gc: number): ResultadoLetra {
  if (gp > gc) return 'V';
  if (gp < gc) return 'D';
  return 'E';
}

function contagemBuckets(minutos: number[]): number[] {
  const buckets = [0, 0, 0, 0, 0, 0];
  for (const m of minutos) buckets[faixaDeMinuto(m)]! += 1;
  return buckets;
}

function sequenciaSemDerrota(recentes: PartidaRecenteH2H[]): number {
  let n = 0;
  for (const j of recentes) {
    if (j.resultado === 'D') break;
    n += 1;
  }
  return n;
}

function sequenciaSofreuGol(recentes: PartidaRecenteH2H[]): number {
  let n = 0;
  for (const j of recentes) {
    if (j.golsContra <= 0) break;
    n += 1;
  }
  return n;
}

function razao(
  recentes: PartidaRecenteH2H[],
  pred: (j: PartidaRecenteH2H) => boolean,
  max = 5,
): { hit: number; total: number } {
  const amostra = recentes.slice(0, max);
  const hit = amostra.filter(pred).length;
  return { hit, total: amostra.length };
}

function montarSequencias(
  mandante: TimeH2HBadge,
  visitante: TimeH2HBadge,
  recentesM: PartidaRecenteH2H[],
  recentesV: PartidaRecenteH2H[],
): SequenciaH2H[] {
  const out: SequenciaH2H[] = [];
  const pushTime = (badge: TimeH2HBadge, recentes: PartidaRecenteH2H[]) => {
    const unbeaten = sequenciaSemDerrota(recentes);
    out.push({
      timeId: badge.id,
      label: 'Sem derrotas',
      valor: String(unbeaten),
      positivo: unbeaten === 0,
    });
    const sofreu = sequenciaSofreuGol(recentes);
    out.push({
      timeId: badge.id,
      label: 'Sofreu gol',
      valor: String(sofreu),
      positivo: sofreu === 0,
    });
    const over = razao(recentes, (j) => j.golsPro + j.golsContra > 2.5);
    out.push({
      timeId: badge.id,
      label: 'Mais de 2,5 gols',
      valor: over.total ? `${over.hit}/${over.total}` : '—',
      positivo: over.total > 0 && over.hit / over.total >= 0.6,
    });
    const btts = razao(recentes, (j) => j.golsPro > 0 && j.golsContra > 0);
    out.push({
      timeId: badge.id,
      label: 'Ambas equipes marcam',
      valor: btts.total ? `${btts.hit}/${btts.total}` : '—',
      positivo: btts.total > 0 && btts.hit === btts.total,
    });
    const marcou = razao(recentes, (j) => j.golsPro > 0);
    out.push({
      timeId: badge.id,
      label: 'Marcou gol',
      valor: marcou.total ? `${marcou.hit}/${marcou.total}` : '—',
      positivo: marcou.total > 0 && marcou.hit === marcou.total,
    });
  };
  pushTime(mandante, recentesM);
  pushTime(visitante, recentesV);
  return out;
}

function distribuicaoDePartidas(
  timeId: string,
  partidas: {
    id: string | number;
    mandanteId: string;
    visitanteId: string;
    golsMandante: number;
    golsVisitante: number;
    result?: MatchSimResult;
  }[],
  /** Se não houver histórico, usa minutos reais da transmissão atual. */
  atual?: MatchSimResult | null,
): DistribuicaoGolsH2H {
  const marcados: number[] = [];
  const sofridos: number[] = [];
  for (const p of partidas) {
    const fromResult = p.result
      ? minutosDeResultado(p.result, timeId)
      : null;
    if (fromResult && (fromResult.marcados.length || fromResult.sofridos.length)) {
      marcados.push(...fromResult.marcados);
      sofridos.push(...fromResult.sofridos);
      continue;
    }
    const casa = p.mandanteId === timeId;
    const gp = casa ? p.golsMandante : p.golsVisitante;
    const gc = casa ? p.golsVisitante : p.golsMandante;
    marcados.push(...minutosPseudo(`${p.id}-pro`, gp));
    sofridos.push(...minutosPseudo(`${p.id}-contra`, gc));
  }
  if (partidas.length === 0 && atual) {
    const live = minutosDeResultado(atual, timeId);
    marcados.push(...live.marcados);
    sofridos.push(...live.sofridos);
  }
  return {
    timeId,
    marcados: contagemBuckets(marcados),
    sofridos: contagemBuckets(sofridos),
    partidasAmostra: partidas.length || (atual ? 1 : 0),
  };
}

function recentesDeEstado(
  estado: EstadoTemporada,
  timeId: string,
  byId: Map<string, TimeH2HBadge>,
  competicao: string,
  max = 22,
): PartidaRecenteH2H[] {
  return estado.partidas
    .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, max)
    .map((p) => {
      const casa = p.mandanteId === timeId;
      const advId = casa ? p.visitanteId : p.mandanteId;
      const gm = p.golsMandante ?? 0;
      const gv = p.golsVisitante ?? 0;
      const gp = casa ? gm : gv;
      const gc = casa ? gv : gm;
      return {
        id: `br-${p.id}`,
        rodada: p.rodada,
        dataISO: p.dataISO,
        dataLabel: formatarDataBr(p.dataISO),
        competicao,
        adversario: byId.get(advId) ?? {
          id: advId,
          nome: advId,
          sigla: siglaDeNome(advId),
          corPrimaria: '#334155',
          corSecundaria: '#64748b',
        },
        emCasa: casa,
        golsPro: gp,
        golsContra: gc,
        resultado: resultadoDePlacar(gp, gc),
      };
    });
}

function confrontosEstado(
  estado: EstadoTemporada,
  a: string,
  b: string,
  byId: Map<string, TimeH2HBadge>,
  competicao: string,
): ConfrontoH2H[] {
  return estado.partidas
    .filter(
      (p) =>
        p.finalizado &&
        ((p.mandanteId === a && p.visitanteId === b) ||
          (p.mandanteId === b && p.visitanteId === a)),
    )
    .sort((x, y) => y.rodada - x.rodada)
    .map((p) => ({
      id: `br-${p.id}`,
      rodada: p.rodada,
      dataISO: p.dataISO,
      dataLabel: formatarDataBr(p.dataISO),
      competicao,
      mandante: byId.get(p.mandanteId)!,
      visitante: byId.get(p.visitanteId)!,
      golsMandante: p.golsMandante ?? 0,
      golsVisitante: p.golsVisitante ?? 0,
    }))
    .filter((c) => c.mandante && c.visitante);
}

function placarTreinadores(
  confrontos: ConfrontoH2H[],
  mandanteId: string,
  visitanteId: string,
): Pick<TreinadoresH2H, 'vitoriasMandante' | 'vitoriasVisitante' | 'empates' | 'ultimaPartida'> {
  let vitoriasMandante = 0;
  let vitoriasVisitante = 0;
  let empates = 0;
  for (const c of confrontos) {
    if (c.golsMandante === c.golsVisitante) {
      empates += 1;
      continue;
    }
    const venceuMandanteCampo = c.golsMandante > c.golsVisitante;
    const vencedorId = venceuMandanteCampo ? c.mandante.id : c.visitante.id;
    if (vencedorId === mandanteId) vitoriasMandante += 1;
    else if (vencedorId === visitanteId) vitoriasVisitante += 1;
  }
  const ultima = confrontos[0];
  return {
    vitoriasMandante,
    vitoriasVisitante,
    empates,
    ultimaPartida: ultima
      ? `${ultima.golsMandante} - ${ultima.golsVisitante}`
      : null,
  };
}

export function montarH2HLiga(opts: {
  estado: EstadoTemporada;
  times: Time[];
  mandanteId: string;
  visitanteId: string;
  competicao: string;
  nomeTecnicoUsuario: string | null;
  usuarioTimeId: string | null;
  partidaAtual?: MatchSimResult | null;
}): DadosH2H | null {
  const mandanteT = opts.times.find((t) => t.id === opts.mandanteId);
  const visitanteT = opts.times.find((t) => t.id === opts.visitanteId);
  if (!mandanteT || !visitanteT) return null;

  const mandante = badgeDeTime(mandanteT);
  const visitante = badgeDeTime(visitanteT);
  const byId = new Map(opts.times.map((t) => [t.id, badgeDeTime(t)]));

  const confrontos = confrontosEstado(
    opts.estado,
    opts.mandanteId,
    opts.visitanteId,
    byId,
    opts.competicao,
  );
  const recentesMandante = recentesDeEstado(
    opts.estado,
    opts.mandanteId,
    byId,
    opts.competicao,
  );
  const recentesVisitante = recentesDeEstado(
    opts.estado,
    opts.visitanteId,
    byId,
    opts.competicao,
  );

  const nomeUser = opts.nomeTecnicoUsuario?.trim() || 'Você';
  const tecM =
    opts.usuarioTimeId === opts.mandanteId
      ? nomeUser
      : nomeTecnicoCpu(opts.mandanteId);
  const tecV =
    opts.usuarioTimeId === opts.visitanteId
      ? nomeUser
      : nomeTecnicoCpu(opts.visitanteId);

  const placar = placarTreinadores(confrontos, opts.mandanteId, opts.visitanteId);

  const partidasM = opts.estado.partidas
    .filter(
      (p) =>
        p.finalizado &&
        (p.mandanteId === opts.mandanteId || p.visitanteId === opts.mandanteId),
    )
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      golsMandante: p.golsMandante ?? 0,
      golsVisitante: p.golsVisitante ?? 0,
    }));
  const partidasV = opts.estado.partidas
    .filter(
      (p) =>
        p.finalizado &&
        (p.mandanteId === opts.visitanteId || p.visitanteId === opts.visitanteId),
    )
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      golsMandante: p.golsMandante ?? 0,
      golsVisitante: p.golsVisitante ?? 0,
    }));

  return {
    competicao: opts.competicao,
    mandante,
    visitante,
    treinadores: {
      mandanteNome: tecM,
      visitanteNome: tecV,
      ...placar,
    },
    confrontos,
    recentesMandante,
    recentesVisitante,
    sequencias: montarSequencias(mandante, visitante, recentesMandante, recentesVisitante),
    golsMandante: distribuicaoDePartidas(opts.mandanteId, partidasM, opts.partidaAtual),
    golsVisitante: distribuicaoDePartidas(opts.visitanteId, partidasV, opts.partidaAtual),
  };
}

export function montarH2HTorneio(opts: {
  jogos: JogoTorneio[];
  times: TimeFicticio[];
  mandanteId: string;
  visitanteId: string;
  nomeTecnicoUsuario: string | null;
  usuarioTimeId: string | null;
  partidaAtual?: MatchSimResult | null;
}): DadosH2H | null {
  const mandanteT = opts.times.find((t) => t.id === opts.mandanteId);
  const visitanteT = opts.times.find((t) => t.id === opts.visitanteId);
  if (!mandanteT || !visitanteT) return null;

  const mandante = badgeFicticio(mandanteT);
  const visitante = badgeFicticio(visitanteT);
  const byId = new Map(opts.times.map((t) => [t.id, badgeFicticio(t)]));
  const competicao = 'Torneio amador';

  const confrontos: ConfrontoH2H[] = opts.jogos
    .filter(
      (p) =>
        p.finalizado &&
        ((p.mandanteId === opts.mandanteId && p.visitanteId === opts.visitanteId) ||
          (p.mandanteId === opts.visitanteId && p.visitanteId === opts.mandanteId)),
    )
    .sort((a, b) => b.rodada - a.rodada)
    .map((p) => ({
      id: `tor-${p.id}`,
      rodada: p.rodada,
      dataISO: '',
      dataLabel: `Rodada ${p.rodada}`,
      competicao,
      mandante: byId.get(p.mandanteId)!,
      visitante: byId.get(p.visitanteId)!,
      golsMandante: p.golsMandante ?? 0,
      golsVisitante: p.golsVisitante ?? 0,
    }));

  const recentesDe = (timeId: string): PartidaRecenteH2H[] =>
    opts.jogos
      .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
      .sort((a, b) => b.rodada - a.rodada)
      .map((p) => {
        const casa = p.mandanteId === timeId;
        const advId = casa ? p.visitanteId : p.mandanteId;
        const gm = p.golsMandante ?? 0;
        const gv = p.golsVisitante ?? 0;
        const gp = casa ? gm : gv;
        const gc = casa ? gv : gm;
        return {
          id: `tor-${p.id}`,
          rodada: p.rodada,
          dataISO: '',
          dataLabel: `Rodada ${p.rodada}`,
          competicao,
          adversario: byId.get(advId)!,
          emCasa: casa,
          golsPro: gp,
          golsContra: gc,
          resultado: resultadoDePlacar(gp, gc),
        };
      });

  const recentesMandante = recentesDe(opts.mandanteId);
  const recentesVisitante = recentesDe(opts.visitanteId);
  const nomeUser = opts.nomeTecnicoUsuario?.trim() || 'Você';
  const tecM =
    opts.usuarioTimeId === opts.mandanteId
      ? nomeUser
      : nomeTecnicoCpu(opts.mandanteId);
  const tecV =
    opts.usuarioTimeId === opts.visitanteId
      ? nomeUser
      : nomeTecnicoCpu(opts.visitanteId);
  const placar = placarTreinadores(confrontos, opts.mandanteId, opts.visitanteId);

  const mapPartidas = (timeId: string) =>
    opts.jogos
      .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
      .map((p) => ({
        id: p.id,
        mandanteId: p.mandanteId,
        visitanteId: p.visitanteId,
        golsMandante: p.golsMandante ?? 0,
        golsVisitante: p.golsVisitante ?? 0,
        result: p.relatorio,
      }));

  return {
    competicao,
    mandante,
    visitante,
    treinadores: {
      mandanteNome: tecM,
      visitanteNome: tecV,
      ...placar,
    },
    confrontos,
    recentesMandante,
    recentesVisitante,
    sequencias: montarSequencias(mandante, visitante, recentesMandante, recentesVisitante),
    golsMandante: distribuicaoDePartidas(
      opts.mandanteId,
      mapPartidas(opts.mandanteId),
      opts.partidaAtual,
    ),
    golsVisitante: distribuicaoDePartidas(
      opts.visitanteId,
      mapPartidas(opts.visitanteId),
      opts.partidaAtual,
    ),
  };
}

/** Exposto para testes / tipagem — partidas da temporada (liga). */
export function partidasFinalizadasTime(
  estado: EstadoTemporada,
  timeId: string,
): PartidaCampeonato[] {
  return estado.partidas.filter(
    (p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId),
  );
}
