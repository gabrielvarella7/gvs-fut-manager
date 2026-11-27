import type { EstatisticasTime } from '../engine/matchStats';
import type { Jogador, LinhaTabela, Time } from '../types/schema';
import type { EstadoTemporada, PartidaCampeonato } from './brasileirao';
import { posicaoDoTime } from './brasileirao';
import {
  jogadoresSuspensos,
  reconstruirDisciplina,
  type DesempenhoJogadorPartida,
  type MapaDisciplina,
} from './disciplinaCartoes';

export interface DestaqueJogador {
  jogadorId: number;
  nome: string;
  posicao: string;
  detalhe: string;
}

export interface DesfalqueItem {
  jogadorId: number;
  nome: string;
  motivo: 'lesao' | 'cartao';
  detalhe: string;
}

export interface MediaStatsPartida {
  possePercent: number;
  xg: number;
  finalizacoes: number;
  defesasGoleiro: number;
  escanteios: number;
  faltas: number;
  passes: number;
  desarmes: number;
  jogosComStats: number;
}

export interface StatsEquipePreJogo {
  timeId: string;
  nome: string;
  posicao: number;
  ppj: number;
  pontos: number;
  jogos: number;
  vitorias: number;
  golsMarcados: number;
  golsSofridos: number;
  forma: string; // V/E/D pills
  ultimos5: {
    golsMarcados: number;
    golsMarcadosPorJogo: number;
    golsSofridos: number;
    golsSofridosPorJogo: number;
    jogos: number;
  };
  destaqueCampeonato: DestaqueJogador | null;
  destaqueUltimos5: DestaqueJogador | null;
  desfalques: DesfalqueItem[];
  mediaCampeonato: MediaStatsPartida | null;
  mediaUltimos5: MediaStatsPartida | null;
}

export interface PacotePreJogoEquipes {
  mandante: StatsEquipePreJogo;
  visitante: StatsEquipePreJogo;
  disciplina: MapaDisciplina;
}

function linhaVazia(timeId: string): LinhaTabela {
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

function statsVazias(): EstatisticasTime {
  return {
    possePercent: 0,
    xg: 0,
    finalizacoes: 0,
    finalizacoesNoGol: 0,
    defesasGoleiro: 0,
    escanteios: 0,
    faltas: 0,
    passes: 0,
    desarmes: 0,
    cartoesAmarelos: 0,
  };
}

function partidasDoTime(estado: EstadoTemporada, timeId: string): PartidaCampeonato[] {
  return estado.partidas
    .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
    .sort((a, b) => b.rodada - a.rodada || b.id - a.id);
}

function formaString(partidas: PartidaCampeonato[], timeId: string, max = 5): string {
  const letras: string[] = [];
  for (const p of partidas.slice(0, max)) {
    const casa = p.mandanteId === timeId;
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    const gp = casa ? gm : gv;
    const gc = casa ? gv : gm;
    if (gp > gc) letras.push('V');
    else if (gp < gc) letras.push('D');
    else letras.push('E');
  }
  return letras.join('');
}

function golsNosJogos(partidas: PartidaCampeonato[], timeId: string) {
  let marcados = 0;
  let sofridos = 0;
  for (const p of partidas) {
    const casa = p.mandanteId === timeId;
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    marcados += casa ? gm : gv;
    sofridos += casa ? gv : gm;
  }
  return { marcados, sofridos, jogos: partidas.length };
}

function mediaDeStats(
  partidas: PartidaCampeonato[],
  timeId: string,
): MediaStatsPartida | null {
  const comStats = partidas.filter((p) => p.estatisticas);
  if (comStats.length === 0) return null;

  const acc = statsVazias();
  for (const p of comStats) {
    const lado = p.mandanteId === timeId ? p.estatisticas!.mandante : p.estatisticas!.visitante;
    acc.possePercent += lado.possePercent;
    acc.xg += lado.xg;
    acc.finalizacoes += lado.finalizacoes;
    acc.defesasGoleiro += lado.defesasGoleiro;
    acc.escanteios += lado.escanteios;
    acc.faltas += lado.faltas;
    acc.passes += lado.passes;
    acc.desarmes += lado.desarmes;
  }
  const n = comStats.length;
  const avg = (v: number, casas = 1) => Math.round((v / n) * 10 ** casas) / 10 ** casas;
  return {
    possePercent: avg(acc.possePercent, 0),
    xg: avg(acc.xg, 2),
    finalizacoes: avg(acc.finalizacoes, 1),
    defesasGoleiro: avg(acc.defesasGoleiro, 1),
    escanteios: avg(acc.escanteios, 1),
    faltas: avg(acc.faltas, 1),
    passes: avg(acc.passes, 0),
    desarmes: avg(acc.desarmes, 1),
    jogosComStats: n,
  };
}

function somarGolsPorJogador(
  partidas: PartidaCampeonato[],
  timeId: string,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of partidas) {
    for (const d of p.desempenhoJogadores ?? []) {
      if (d.timeId !== timeId || d.gols <= 0) continue;
      map.set(d.jogadorId, (map.get(d.jogadorId) ?? 0) + d.gols);
    }
  }
  return map;
}

function escolherDestaque(
  golsPorJogador: Map<number, number>,
  elenco: Jogador[],
  rotuloGols: (gols: number) => string,
): DestaqueJogador | null {
  if (elenco.length === 0) return null;
  let melhorId: number | null = null;
  let melhorGols = -1;
  for (const [id, gols] of golsPorJogador) {
    if (gols > melhorGols) {
      melhorGols = gols;
      melhorId = id;
    }
  }
  if (melhorId != null && melhorGols > 0) {
    const j = elenco.find((x) => x.id === melhorId);
    if (j) {
      return {
        jogadorId: j.id,
        nome: j.nome,
        posicao: j.posicao,
        detalhe: rotuloGols(melhorGols),
      };
    }
  }
  // Sem gols registrados: destaque por overall (ainda útil no início).
  const top = [...elenco].sort((a, b) => b.overall - a.overall)[0];
  if (!top) return null;
  return {
    jogadorId: top.id,
    nome: top.nome,
    posicao: top.posicao,
    detalhe: `OVR ${top.overall}`,
  };
}

function montarDesfalques(
  elenco: Jogador[],
  disciplina: MapaDisciplina,
): DesfalqueItem[] {
  const itens: DesfalqueItem[] = [];
  for (const j of elenco) {
    if (j.lesao && j.lesao.diasRestantes > 0) {
      itens.push({
        jogadorId: j.id,
        nome: j.nome,
        motivo: 'lesao',
        detalhe: j.lesao.descricao
          ? `${j.lesao.descricao} · ${j.lesao.diasRestantes}d`
          : `${j.lesao.diasRestantes} dias`,
      });
    }
  }
  const suspensos = jogadoresSuspensos(
    disciplina,
    elenco[0]?.time_id ?? '',
    elenco.map((j) => j.id),
  );
  for (const id of suspensos) {
    if (itens.some((i) => i.jogadorId === id)) continue;
    const j = elenco.find((x) => x.id === id);
    if (!j) continue;
    const jogos = disciplina[id]?.jogosSuspenso ?? 1;
    const amarelos = disciplina[id]?.amarelos ?? 0;
    itens.push({
      jogadorId: id,
      nome: j.nome,
      motivo: 'cartao',
      detalhe:
        jogos > 0
          ? `Suspenso (${jogos} jogo${jogos > 1 ? 's' : ''})`
          : `Disciplina (${amarelos} amarelo${amarelos === 1 ? '' : 's'})`,
    });
  }
  return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function montarEquipe(
  time: Time,
  estado: EstadoTemporada,
  jogadores: Jogador[],
  disciplina: MapaDisciplina,
): StatsEquipePreJogo {
  const linha = estado.tabela.find((l) => l.time_id === time.id) ?? linhaVazia(time.id);
  const elenco = jogadores.filter((j) => j.time_id === time.id);
  const historico = partidasDoTime(estado, time.id);
  const ultimos5 = historico.slice(0, 5);
  const gols5 = golsNosJogos(ultimos5, time.id);
  const ppj = linha.jogos > 0 ? Math.round((linha.pontos / linha.jogos) * 100) / 100 : 0;

  return {
    timeId: time.id,
    nome: time.nome,
    posicao: posicaoDoTime(estado.tabela, time.id),
    ppj,
    pontos: linha.pontos,
    jogos: linha.jogos,
    vitorias: linha.vitorias,
    golsMarcados: linha.gols_pro,
    golsSofridos: linha.gols_contra,
    forma: formaString(historico, time.id, 5),
    ultimos5: {
      golsMarcados: gols5.marcados,
      golsMarcadosPorJogo:
        gols5.jogos > 0 ? Math.round((gols5.marcados / gols5.jogos) * 100) / 100 : 0,
      golsSofridos: gols5.sofridos,
      golsSofridosPorJogo:
        gols5.jogos > 0 ? Math.round((gols5.sofridos / gols5.jogos) * 100) / 100 : 0,
      jogos: gols5.jogos,
    },
    destaqueCampeonato: escolherDestaque(
      somarGolsPorJogador(historico, time.id),
      elenco,
      (g) => `${g} gol${g === 1 ? '' : 's'} no campeonato`,
    ),
    destaqueUltimos5: escolherDestaque(
      somarGolsPorJogador(ultimos5, time.id),
      elenco,
      (g) => `${g} gol${g === 1 ? '' : 's'} nos últimos 5`,
    ),
    desfalques: montarDesfalques(elenco, disciplina),
    mediaCampeonato: mediaDeStats(historico, time.id),
    mediaUltimos5: mediaDeStats(ultimos5, time.id),
  };
}

export function montarPacotePreJogoEquipes(opts: {
  estado: EstadoTemporada;
  mandante: Time;
  visitante: Time;
  jogadores: Jogador[];
}): PacotePreJogoEquipes {
  const elencoPorTime = new Map<string, number[]>();
  for (const j of opts.jogadores) {
    const arr = elencoPorTime.get(j.time_id) ?? [];
    arr.push(j.id);
    elencoPorTime.set(j.time_id, arr);
  }
  const disciplina = reconstruirDisciplina(opts.estado.partidas, elencoPorTime);
  return {
    mandante: montarEquipe(opts.mandante, opts.estado, opts.jogadores, disciplina),
    visitante: montarEquipe(opts.visitante, opts.estado, opts.jogadores, disciplina),
    disciplina,
  };
}

export type { DesempenhoJogadorPartida };
