import type { MatchSimInput, MatchSimResult } from '../engine/matchEngine';
import { getDatabaseTaticas } from '../db/tacticsDatabase';
import { taticaCpuAutomatica } from '../engine/tacticsEngine';
import { simularPartida } from '../engine/matchEngine';
import { esquemaOuPadrao } from '../data/esquemasTaticos';
import { detectarClassico, montarContextoPartidaSync } from '../engine/matchContext';
import type { CampeonatoConfig, Jogador, LinhaTabela, Time } from '../types/schema';
import type { NoticiaCarreira } from './types';

export interface PartidaCampeonato {
  id: number;
  rodada: number;
  mandanteId: string;
  visitanteId: string;
  dataISO: string;
  finalizado: boolean;
  golsMandante?: number;
  golsVisitante?: number;
  ehDoUsuario: boolean;
  /** Clássico / campo neutro — não conta na sequência mandante/visitante */
  campoNeutro?: boolean;
}

export interface EstadoTemporada {
  temporadaAno: number;
  dataAtualISO: string;
  rodadaAtual: number;
  partidas: PartidaCampeonato[];
  tabela: LinhaTabela[];
}

const DATA_INICIO = '2026-04-12';
const DIAS_ENTRE_RODADAS = 5;

export function formatarDataBr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

export function adicionarDias(iso: string, dias: number): string {
  const dt = new Date(`${iso}T12:00:00`);
  dt.setDate(dt.getDate() + dias);
  return dt.toISOString().slice(0, 10);
}

function compararISO(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Pontos corridos 20 times — ida e volta, 38 rodadas. */
export function gerarConfrontosTurno(timeIds: string[]): { mandanteId: string; visitanteId: string }[][] {
  const n = timeIds.length;
  if (n % 2 !== 0) throw new Error('Brasileirão exige número par de clubes.');
  const rotativo = [...timeIds];
  const turno: { mandanteId: string; visitanteId: string }[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const rodada: { mandanteId: string; visitanteId: string }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const mandanteId = rotativo[i]!;
      const visitanteId = rotativo[n - 1 - i]!;
      rodada.push({ mandanteId, visitanteId });
    }
    turno.push(rodada);
    const fixo = rotativo[0]!;
    const cauda = rotativo.slice(1);
    const ultimo = cauda.pop()!;
    cauda.unshift(ultimo);
    rotativo.length = 0;
    rotativo.push(fixo, ...cauda);
  }

  const volta = turno.map((rodada) =>
    rodada.map((p) => ({ mandanteId: p.visitanteId, visitanteId: p.mandanteId })),
  );
  return [...turno, ...volta];
}

/** No máximo 2 mandos ou 2 visitas seguidas (clássico = neutro, fora da conta). */
export const MAX_MANDOS_SEGUIDOS = 2;

type Streak = { casa: number; fora: number };

function partidaNeutra(p: PartidaCampeonato, times: Time[]): boolean {
  return p.campoNeutro ?? detectarClassico(p.mandanteId, p.visitanteId, times);
}

function streakTime(streaks: Map<string, Streak>, timeId: string, comoMandante: boolean): number {
  const s = streaks.get(timeId) ?? { casa: 0, fora: 0 };
  return comoMandante ? s.casa : s.fora;
}

function aplicarJogoStreak(
  streaks: Map<string, Streak>,
  timeId: string,
  comoMandante: boolean,
  neutro: boolean,
) {
  if (neutro) return;
  const s = streaks.get(timeId) ?? { casa: 0, fora: 0 };
  if (comoMandante) {
    streaks.set(timeId, { casa: s.casa + 1, fora: 0 });
  } else {
    streaks.set(timeId, { casa: 0, fora: s.fora + 1 });
  }
}

function inverterMandanteVisitante(p: PartidaCampeonato) {
  const m = p.mandanteId;
  p.mandanteId = p.visitanteId;
  p.visitanteId = m;
}

function partidasDoTimeOrdenadas(partidas: PartidaCampeonato[], timeId: string): PartidaCampeonato[] {
  return partidas
    .filter((p) => p.mandanteId === timeId || p.visitanteId === timeId)
    .sort((a, b) => a.rodada - b.rodada || a.id - b.id);
}

function maxSequenciaMandos(
  partidas: PartidaCampeonato[],
  timeId: string,
  times: Time[],
): { casa: number; fora: number } {
  let maxCasa = 0;
  let maxFora = 0;
  let runCasa = 0;
  let runFora = 0;
  for (const p of partidasDoTimeOrdenadas(partidas, timeId)) {
    if (partidaNeutra(p, times)) continue;
    const emCasa = p.mandanteId === timeId;
    if (emCasa) {
      runCasa += 1;
      runFora = 0;
      maxCasa = Math.max(maxCasa, runCasa);
    } else {
      runFora += 1;
      runCasa = 0;
      maxFora = Math.max(maxFora, runFora);
    }
  }
  return { casa: maxCasa, fora: maxFora };
}

function idsNoCalendario(partidas: PartidaCampeonato[]): Set<string> {
  const ids = new Set<string>();
  for (const p of partidas) {
    ids.add(p.mandanteId);
    ids.add(p.visitanteId);
  }
  return ids;
}

export function calendarioRespeitaMaxMando(
  partidas: PartidaCampeonato[],
  times: Time[],
  max = MAX_MANDOS_SEGUIDOS,
): boolean {
  for (const timeId of idsNoCalendario(partidas)) {
    const { casa, fora } = maxSequenciaMandos(partidas, timeId, times);
    if (casa > max || fora > max) return false;
  }
  return true;
}

function pontuacaoViolacao(partidas: PartidaCampeonato[], times: Time[]): number {
  let total = 0;
  for (const timeId of idsNoCalendario(partidas)) {
    const { casa, fora } = maxSequenciaMandos(partidas, timeId, times);
    total += Math.max(0, casa - MAX_MANDOS_SEGUIDOS) + Math.max(0, fora - MAX_MANDOS_SEGUIDOS);
  }
  return total;
}

function podeSomarStreak(streaks: Map<string, Streak>, timeId: string, comoMandante: boolean): boolean {
  return streakTime(streaks, timeId, comoMandante) < MAX_MANDOS_SEGUIDOS;
}

function escolherOrientacao(
  p: PartidaCampeonato,
  streaks: Map<string, Streak>,
): 'manter' | 'inverter' {
  const okManter =
    podeSomarStreak(streaks, p.mandanteId, true) && podeSomarStreak(streaks, p.visitanteId, false);
  const okInverter =
    podeSomarStreak(streaks, p.visitanteId, true) && podeSomarStreak(streaks, p.mandanteId, false);
  if (okManter && !okInverter) return 'manter';
  if (!okManter && okInverter) return 'inverter';
  if (okManter && okInverter) return 'manter';
  const penManter =
    (podeSomarStreak(streaks, p.mandanteId, true) ? 0 : 2) +
    (podeSomarStreak(streaks, p.visitanteId, false) ? 0 : 2);
  const penInverter =
    (podeSomarStreak(streaks, p.visitanteId, true) ? 0 : 2) +
    (podeSomarStreak(streaks, p.mandanteId, false) ? 0 : 2);
  return penInverter < penManter ? 'inverter' : 'manter';
}

function refinarComFlips(partidas: PartidaCampeonato[], times: Time[]): void {
  if (calendarioRespeitaMaxMando(partidas, times)) return;

  const pendentes = partidas
    .filter((p) => !p.finalizado && !partidaNeutra(p, times))
    .sort((a, b) => b.rodada - a.rodada || b.id - a.id);

  let pontos = pontuacaoViolacao(partidas, times);
  for (let iter = 0; iter < 120 && pontos > 0; iter++) {
    let melhorou = false;
    for (const p of pendentes) {
      inverterMandanteVisitante(p);
      const novaPontuacao = pontuacaoViolacao(partidas, times);
      if (novaPontuacao < pontos || calendarioRespeitaMaxMando(partidas, times)) {
        pontos = novaPontuacao;
        melhorou = true;
        if (calendarioRespeitaMaxMando(partidas, times)) return;
        break;
      }
      inverterMandanteVisitante(p);
    }
    if (!melhorou) break;
  }
}

/** Evita mais de 2 jogos seguidos em casa ou fora (clássicos = neutro). */
export function balancearMandoConsecutivo(
  partidas: PartidaCampeonato[],
  times: Time[],
): PartidaCampeonato[] {
  const next = partidas.map((p) => ({ ...p }));
  const ordem = [...next].sort((a, b) => a.rodada - b.rodada || a.id - b.id);
  const streaks = new Map<string, Streak>();

  for (const p of ordem) {
    const neutro = partidaNeutra(p, times);
    if (neutro) {
      p.campoNeutro = true;
    }

    if (p.finalizado) {
      if (!neutro) {
        aplicarJogoStreak(streaks, p.mandanteId, true, false);
        aplicarJogoStreak(streaks, p.visitanteId, false, false);
      }
      continue;
    }

    if (neutro) continue;

    p.campoNeutro = false;
    if (escolherOrientacao(p, streaks) === 'inverter') {
      inverterMandanteVisitante(p);
    }
    aplicarJogoStreak(streaks, p.mandanteId, true, false);
    aplicarJogoStreak(streaks, p.visitanteId, false, false);
  }

  refinarComFlips(next, times);
  return next;
}

export function aplicarBalanceamentoNaTemporada(
  estado: EstadoTemporada,
  times: Time[],
): EstadoTemporada {
  return {
    ...estado,
    partidas: balancearMandoConsecutivo(estado.partidas, times),
  };
}

export function criarTabelaZerada(timeIds: string[]): LinhaTabela[] {
  return timeIds.map((time_id) => ({
    time_id,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gols_pro: 0,
    gols_contra: 0,
    saldo_gols: 0,
  }));
}

export function iniciarTemporadaBrasileirao(
  timeIds: string[],
  timeUsuarioId: string,
  ano = 2026,
  times?: Time[],
): EstadoTemporada {
  const ids = [...timeIds].sort((a, b) => a.localeCompare(b));
  const rodadas = gerarConfrontosTurno(ids);
  const partidas: PartidaCampeonato[] = [];
  let id = 1;
  const timesRef: Time[] =
    times ?? ids.map((tid) => ({ id: tid, slug: tid.toLowerCase() }) as Time);

  rodadas.forEach((confrontos, idx) => {
    const rodada = idx + 1;
    const dataISO = adicionarDias(DATA_INICIO, (rodada - 1) * DIAS_ENTRE_RODADAS);
    for (const c of confrontos) {
      const ehDoUsuario = c.mandanteId === timeUsuarioId || c.visitanteId === timeUsuarioId;
      const neutro = detectarClassico(c.mandanteId, c.visitanteId, timesRef);
      partidas.push({
        id: id++,
        rodada,
        mandanteId: c.mandanteId,
        visitanteId: c.visitanteId,
        dataISO,
        finalizado: false,
        ehDoUsuario,
        campoNeutro: neutro,
      });
    }
  });

  const dataAtualISO = adicionarDias(DATA_INICIO, -3);

  return {
    temporadaAno: ano,
    dataAtualISO,
    rodadaAtual: 1,
    partidas: balancearMandoConsecutivo(partidas, timesRef),
    tabela: criarTabelaZerada(ids),
  };
}

export function proximaPartidaUsuario(
  estado: EstadoTemporada,
  _timeUsuarioId: string,
): PartidaCampeonato | null {
  const abertas = estado.partidas
    .filter((p) => p.ehDoUsuario && !p.finalizado)
    .sort((a, b) => a.rodada - b.rodada || a.dataISO.localeCompare(b.dataISO));
  return abertas[0] ?? null;
}

export function partidasDaRodada(estado: EstadoTemporada, rodada: number): PartidaCampeonato[] {
  return estado.partidas.filter((p) => p.rodada === rodada);
}

export function contarPartidasFinalizadas(estado: EstadoTemporada): number {
  return estado.partidas.filter((p) => p.finalizado).length;
}

/** Índice 1-based da próxima partida a simular na temporada. */
export function indiceProximaPartida(estado: EstadoTemporada): number {
  return contarPartidasFinalizadas(estado) + 1;
}

export function ehDiaDeJogo(estado: EstadoTemporada, timeUsuarioId: string): boolean {
  const prox = proximaPartidaUsuario(estado, timeUsuarioId);
  if (!prox) return false;
  return compararISO(estado.dataAtualISO, prox.dataISO) >= 0;
}

export function ordenarTabela(
  tabela: LinhaTabela[],
  _campeonato?: CampeonatoConfig | null,
): LinhaTabela[] {
  return [...tabela].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
    return b.gols_pro - a.gols_pro;
  });
}

export function posicaoDoTime(tabela: LinhaTabela[], timeId: string): number {
  const ord = ordenarTabela(tabela);
  const i = ord.findIndex((l) => l.time_id === timeId);
  return i < 0 ? ord.length : i + 1;
}

function aplicarResultadoTabela(
  tabela: LinhaTabela[],
  mandanteId: string,
  visitanteId: string,
  gm: number,
  gv: number,
  regras: CampeonatoConfig['regras_pontuacao'],
): LinhaTabela[] {
  const next = tabela.map((l) => ({ ...l }));
  const m = next.find((l) => l.time_id === mandanteId);
  const v = next.find((l) => l.time_id === visitanteId);
  if (!m || !v) return next;

  const registrar = (linha: LinhaTabela, gp: number, gc: number) => {
    linha.jogos += 1;
    linha.gols_pro += gp;
    linha.gols_contra += gc;
    linha.saldo_gols = linha.gols_pro - linha.gols_contra;
    if (gp > gc) {
      linha.vitorias += 1;
      linha.pontos += regras.vitoria;
    } else if (gp < gc) {
      linha.derrotas += 1;
      linha.pontos += regras.derrota;
    } else {
      linha.empates += 1;
      linha.pontos += regras.empate;
    }
  };

  registrar(m, gm, gv);
  registrar(v, gv, gm);
  return next;
}

export function registrarPlacarPartida(
  estado: EstadoTemporada,
  partidaId: number,
  golsMandante: number,
  golsVisitante: number,
  campeonato: CampeonatoConfig,
): EstadoTemporada {
  const partidas = estado.partidas.map((p) =>
    p.id === partidaId
      ? { ...p, finalizado: true, golsMandante, golsVisitante }
      : p,
  );
  const p = partidas.find((x) => x.id === partidaId);
  if (!p) return { ...estado, partidas };

  const tabela = aplicarResultadoTabela(
    estado.tabela,
    p.mandanteId,
    p.visitanteId,
    golsMandante,
    golsVisitante,
    campeonato.regras_pontuacao,
  );

  const rodadaCompleta = partidasDaRodada({ ...estado, partidas }, p.rodada).every(
    (j) => j.finalizado,
  );
  const rodadaAtual = rodadaCompleta
    ? Math.min(38, Math.max(estado.rodadaAtual, p.rodada + 1))
    : Math.max(estado.rodadaAtual, p.rodada);

  return { ...estado, partidas, tabela, rodadaAtual };
}

function elencoDoTime(jogadores: Jogador[], timeId: string): Jogador[] {
  return jogadores.filter((j) => j.time_id === timeId);
}

export function montarInputPartidaCpu(
  mandanteId: string,
  visitanteId: string,
  times: Time[],
  jogadores: Jogador[],
  bonusMando: number,
  seed: number,
  estado?: EstadoTemporada,
): { input: MatchSimInput; seed: number } {
  const mandanteTime = times.find((t) => t.id === mandanteId)!;
  const visitanteTime = times.find((t) => t.id === visitanteId)!;
  const s = (seed ^ mandanteId.charCodeAt(0) ^ visitanteId.charCodeAt(1)) >>> 0;
  const contexto =
    estado != null
      ? montarContextoPartidaSync({
          mandanteId,
          visitanteId,
          times,
          estado,
        })
      : undefined;
  const esqM = esquemaOuPadrao(mandanteTime.esquema_tatico_padrao);
  const esqV = esquemaOuPadrao(visitanteTime.esquema_tatico_padrao);
  const input: MatchSimInput = {
    mandante: {
      timeId: mandanteId,
      nomeCurto: mandanteTime.nome,
      esquema: esqM,
      elenco: elencoDoTime(jogadores, mandanteId),
      mandoDeCampo: true,
      forcaInstitucional: mandanteTime.prestigio ?? mandanteTime.forca_geral,
      tatica: taticaCpuAutomatica(esqM, mandanteId),
    },
    visitante: {
      timeId: visitanteId,
      nomeCurto: visitanteTime.nome,
      esquema: esqV,
      elenco: elencoDoTime(jogadores, visitanteId),
      forcaInstitucional: visitanteTime.prestigio ?? visitanteTime.forca_geral,
      tatica: taticaCpuAutomatica(esqV, visitanteId),
    },
    dbTaticas: getDatabaseTaticas(),
    config: { bonusMandoCampo: bonusMando },
    estadio: mandanteTime.estadio,
    seed: s,
    ...(contexto ? { contexto } : {}),
  };
  return { input, seed: s };
}

export function simularPartidaCpu(input: MatchSimInput): MatchSimResult {
  return simularPartida(input);
}

/** Fecha demais jogos da rodada após o confronto do usuário. */
export function simularRestanteRodada(
  estado: EstadoTemporada,
  rodada: number,
  times: Time[],
  jogadores: Jogador[],
  campeonato: CampeonatoConfig,
  excetoPartidaId: number,
  seedBase: number,
): EstadoTemporada {
  let next = { ...estado };
  let seed = seedBase;
  const pendentes = partidasDaRodada(next, rodada).filter(
    (p) => !p.finalizado && p.id !== excetoPartidaId,
  );

  let indice = indiceProximaPartida(next);
  for (const p of pendentes) {
    const { input, seed: s } = montarInputPartidaCpu(
      p.mandanteId,
      p.visitanteId,
      times,
      jogadores,
      campeonato.bonus_mando_campo ?? 1.05,
      seed,
      next,
    );
    seed = (s * 1103515245 + 12345) >>> 0;
    const r = simularPartidaCpu({ ...input, seed: s, indicePartidaTemporada: indice });
    next = registrarPlacarPartida(next, p.id, r.golsMandante, r.golsVisitante, campeonato);
    indice += 1;
  }
  return next;
}

const TITULOS_FATO = [
  'Treino intenso',
  'Coletiva do técnico',
  'Mercado em silêncio',
  'Preparação física',
  'Torcida no CT',
];

const TEXTOS_FATO = [
  'O elenco treinou tático e finalizações nesta manhã.',
  'O técnico pediu foco total na próxima rodada do Brasileirão.',
  'Sem novidades no mercado — grupo fechado para o duelo.',
  'Departamento médico não registra baixas no dia.',
  'Torcedores acompanham o treino aberto antes do clássico do fim de semana.',
];

export function gerarFatoDoDia(iso: string, clubeNome: string): NoticiaCarreira {
  const i = iso.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const ti = i % TITULOS_FATO.length;
  return {
    id: `dia_${iso}_${i}`,
    data: `${iso}T18:00:00.000Z`,
    titulo: `${TITULOS_FATO[ti]} — ${clubeNome}`,
    texto: TEXTOS_FATO[ti]!,
  };
}

export function avancarDias(
  estado: EstadoTemporada,
  dias: number,
  clubeNome: string,
): { estado: EstadoTemporada; noticias: NoticiaCarreira[] } {
  const noticias: NoticiaCarreira[] = [];
  let dataAtualISO = estado.dataAtualISO;
  for (let d = 0; d < dias; d++) {
    dataAtualISO = adicionarDias(dataAtualISO, 1);
    if (Math.random() < 0.35) {
      noticias.push(gerarFatoDoDia(dataAtualISO, clubeNome));
    }
  }
  return {
    estado: { ...estado, dataAtualISO },
    noticias,
  };
}

export function diasAteProximoJogo(estado: EstadoTemporada, timeUsuarioId: string): number {
  const prox = proximaPartidaUsuario(estado, timeUsuarioId);
  if (!prox) return 0;
  const a = new Date(`${estado.dataAtualISO}T12:00:00`);
  const b = new Date(`${prox.dataISO}T12:00:00`);
  const diff = Math.ceil((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export function avancarAteDiaDeJogo(
  estado: EstadoTemporada,
  timeUsuarioId: string,
  clubeNome: string,
): { estado: EstadoTemporada; noticias: NoticiaCarreira[] } {
  const prox = proximaPartidaUsuario(estado, timeUsuarioId);
  if (!prox) return { estado, noticias: [] };
  const dias = diasAteProximoJogo(estado, timeUsuarioId);
  if (dias <= 0) return { estado, noticias: [] };
  return avancarDias(estado, dias, clubeNome);
}