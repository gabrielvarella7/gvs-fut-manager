import type { MatchSimResult } from '../engine/matchEngine';
import type { CampeonatoConfig, LinhaTabela } from '../types/schema';
import type { ResultadoRecente } from '../engine/matchContext';
import {
  criarTabelaZerada,
  ordenarTabela,
  partidasDaRodada,
  type EstadoTemporada,
  type PartidaCampeonato,
} from './brasileirao';

export type FiltroClassificacao = 'todos' | 'casa' | 'fora';

export type FormaJogo = ResultadoRecente;

export interface LinhaClassificacaoAoVivo extends LinhaTabela {
  posicao: number;
  forma: FormaJogo[];
}

function linhaZerada(timeId: string): LinhaTabela {
  return {
    time_id: timeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gols_pro: 0,
    gols_contra: 0,
    saldo_gols: 0,
  };
}

function registrarNaLinha(
  linha: LinhaTabela,
  gp: number,
  gc: number,
  regras: CampeonatoConfig['regras_pontuacao'],
): void {
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
}

/** Aplica placar respeitando filtro Todos/Casa/Fora (estilo Sofascore). */
export function aplicarPlacarComFiltro(
  tabela: LinhaTabela[],
  mandanteId: string,
  visitanteId: string,
  gm: number,
  gv: number,
  regras: CampeonatoConfig['regras_pontuacao'],
  filtro: FiltroClassificacao,
): LinhaTabela[] {
  const next = tabela.map((l) => ({ ...l }));
  const m = next.find((l) => l.time_id === mandanteId);
  const v = next.find((l) => l.time_id === visitanteId);
  if (!m || !v) return next;

  if (filtro === 'todos' || filtro === 'casa') {
    registrarNaLinha(m, gm, gv, regras);
  }
  if (filtro === 'todos' || filtro === 'fora') {
    registrarNaLinha(v, gv, gm, regras);
  }
  return next;
}

export function minutosGolsDeResultado(result: MatchSimResult): {
  mandante: number[];
  visitante: number[];
} {
  const mandante: number[] = [];
  const visitante: number[] = [];
  for (const l of result.lancamentos) {
    if (l.tipo !== 'gol') continue;
    if (l.timeId === result.mandanteId) mandante.push(l.minuto);
    else visitante.push(l.minuto);
  }
  return { mandante, visitante };
}

export function placarAteMinuto(
  minutosMandante: number[] | undefined,
  minutosVisitante: number[] | undefined,
  minuto: number,
): { gm: number; gv: number } {
  const gm = (minutosMandante ?? []).filter((m) => m <= minuto).length;
  const gv = (minutosVisitante ?? []).filter((m) => m <= minuto).length;
  return { gm, gv };
}

export function placarResultadoAteMinuto(
  result: MatchSimResult,
  minuto: number,
): { gm: number; gv: number } {
  const { mandante, visitante } = minutosGolsDeResultado(result);
  return placarAteMinuto(mandante, visitante, minuto);
}

function resultadoDePlacar(gp: number, gc: number): FormaJogo {
  if (gp > gc) return 'V';
  if (gp < gc) return 'D';
  return 'E';
}

type JogoForma = {
  rodada: number;
  partidaId: number;
  mandanteId: string;
  visitanteId: string;
  gm: number;
  gv: number;
  aoVivo: boolean;
};

function formaDoTime(
  jogos: JogoForma[],
  timeId: string,
  filtro: FiltroClassificacao,
  max = 5,
): FormaJogo[] {
  const lista = jogos
    .filter((j) => {
      if (j.mandanteId !== timeId && j.visitanteId !== timeId) return false;
      if (filtro === 'casa' && j.mandanteId !== timeId) return false;
      if (filtro === 'fora' && j.visitanteId !== timeId) return false;
      return true;
    })
    .sort((a, b) => a.rodada - b.rodada || a.partidaId - b.partidaId)
    .slice(-max);

  return lista.map((j) => {
    const casa = j.mandanteId === timeId;
    const gp = casa ? j.gm : j.gv;
    const gc = casa ? j.gv : j.gm;
    return resultadoDePlacar(gp, gc);
  });
}

function placarPartidaNoMinuto(
  p: PartidaCampeonato,
  minuto: number,
  partidaAoVivoId: number,
  resultAoVivo: MatchSimResult | null,
): { gm: number; gv: number; aoVivo: boolean } | null {
  if (p.id === partidaAoVivoId && resultAoVivo) {
    const { gm, gv } = placarResultadoAteMinuto(resultAoVivo, minuto);
    return { gm, gv, aoVivo: true };
  }
  if (!p.finalizado || p.golsMandante == null || p.golsVisitante == null) {
    return null;
  }
  // Mesma rodada: revela gols conforme o relógio da transmissão.
  if (p.minutosGolsMandante || p.minutosGolsVisitante) {
    const { gm, gv } = placarAteMinuto(
      p.minutosGolsMandante,
      p.minutosGolsVisitante,
      minuto,
    );
    return { gm, gv, aoVivo: true };
  }
  // Sem timeline: placar final só após o fim do relógio.
  if (minuto < 90) {
    return { gm: 0, gv: 0, aoVivo: true };
  }
  return { gm: p.golsMandante, gv: p.golsVisitante, aoVivo: false };
}

/**
 * Monta a classificação “ao vivo” da rodada atual:
 * - jogos de rodadas anteriores entram com placar final;
 * - a partida em transmissão e as demais da mesma rodada avançam com o minuto.
 */
export function montarTabelaAoVivo(opts: {
  estado: EstadoTemporada;
  campeonato: CampeonatoConfig;
  partidaAoVivoId: number;
  resultAoVivo: MatchSimResult;
  minuto: number;
  filtro: FiltroClassificacao;
}): LinhaClassificacaoAoVivo[] {
  const { estado, campeonato, partidaAoVivoId, resultAoVivo, minuto, filtro } = opts;
  const partidaAoVivo = estado.partidas.find((p) => p.id === partidaAoVivoId);
  const rodada = partidaAoVivo?.rodada ?? estado.rodadaAtual;
  const timeIds = estado.tabela.map((l) => l.time_id);
  let tabela = criarTabelaZerada(timeIds);
  const jogosForma: JogoForma[] = [];
  const regras = campeonato.regras_pontuacao;

  for (const p of estado.partidas) {
    if (p.rodada === rodada) continue;
    if (!p.finalizado || p.golsMandante == null || p.golsVisitante == null) continue;
    tabela = aplicarPlacarComFiltro(
      tabela,
      p.mandanteId,
      p.visitanteId,
      p.golsMandante,
      p.golsVisitante,
      regras,
      filtro,
    );
    jogosForma.push({
      rodada: p.rodada,
      partidaId: p.id,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      gm: p.golsMandante,
      gv: p.golsVisitante,
      aoVivo: false,
    });
  }

  for (const p of partidasDaRodada(estado, rodada)) {
    const placar = placarPartidaNoMinuto(p, minuto, partidaAoVivoId, resultAoVivo);
    if (!placar) continue;
    // Partida da rodada só conta na tabela depois do apito (minuto > 0) ou se já houve gol.
    const iniciada = minuto > 0 || placar.gm > 0 || placar.gv > 0 || p.id === partidaAoVivoId;
    if (!iniciada && placar.aoVivo) continue;

    // Conta jogo ao vivo desde o início da transmissão do usuário; outras da rodada
    // entram quando o relógio > 0 (simultâneas).
    const contar =
      p.id === partidaAoVivoId || minuto > 0 || !placar.aoVivo;
    if (!contar) continue;

    tabela = aplicarPlacarComFiltro(
      tabela,
      p.mandanteId,
      p.visitanteId,
      placar.gm,
      placar.gv,
      regras,
      filtro,
    );
    jogosForma.push({
      rodada: p.rodada,
      partidaId: p.id,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      gm: placar.gm,
      gv: placar.gv,
      aoVivo: placar.aoVivo,
    });
  }

  // Garante linhas para times sem jogos no filtro
  for (const id of timeIds) {
    if (!tabela.some((l) => l.time_id === id)) {
      tabela.push(linhaZerada(id));
    }
  }

  return ordenarTabela(tabela, campeonato).map((l, i) => ({
    ...l,
    posicao: i + 1,
    forma: formaDoTime(jogosForma, l.time_id, filtro),
  }));
}
