import type { Jogador } from '../types/schema';

export type CategoriaRankingJogador =
  | 'nota_media_sofascore'
  | 'gols'
  | 'xg_marcados'
  | 'assistencias'
  | 'xa_assistido'
  | 'participacoes_em_gols'
  | 'distancia_percorrida_por_90'
  | 'sprints_por_90'
  | 'velocidade_maxima_kmh'
  | 'gols_de_penalti'
  | 'gols_de_falta'
  | 'frequencia_gols_minutos'
  | 'finalizacoes_por_jogo'
  | 'finalizacoes_no_gol_por_jogo'
  | 'grandes_chances_perdidas'
  | 'grandes_chances_criadas'
  | 'passes_certos_por_jogo'
  | 'passes_decisivos_por_jogo'
  | 'bolas_longas_certas_por_jogo'
  | 'dribles_certos_por_jogo'
  | 'penaltis_sofridos'
  | 'desarmes_por_jogo'
  | 'interceptacoes_por_jogo'
  | 'cortes_por_jogo'
  | 'perda_posse_por_jogo'
  | 'cartoes_amarelos'
  | 'cartoes_vermelhos'
  | 'defesas_totais_por_jogo'
  | 'gols_evitados'
  | 'mais_gols_sofridos_por_jogo';

export interface EstatisticasTemporadaJogador {
  jogador_id: number;
  time_id: string;
  jogos_disputados: number;
  minutos_jogados: number;
  soma_notas_sofascore: number;
  gols: number;
  xg_marcados: number;
  assistencias: number;
  xa_assistido: number;
  distancia_total_km: number;
  sprints_totais: number;
  velocidade_maxima_kmh: number;
  gols_de_penalti: number;
  gols_de_falta: number;
  finalizacoes: number;
  finalizacoes_no_gol: number;
  grandes_chances_perdidas: number;
  grandes_chances_criadas: number;
  passes_certos: number;
  passes_decisivos: number;
  bolas_longas_certas: number;
  dribles_certos: number;
  penaltis_sofridos: number;
  desarmes: number;
  interceptacoes: number;
  cortes: number;
  perda_posse_bola: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  defesas_totais: number;
  xgot_sofrido: number;
  gols_sofridos_goleiro: number;
}

export function criarEstatisticaJogadorVazia(
  jogadorId: number,
  timeId: string
): EstatisticasTemporadaJogador {
  return {
    jogador_id: jogadorId,
    time_id: timeId,
    jogos_disputados: 0,
    minutos_jogados: 0,
    soma_notas_sofascore: 0,
    gols: 0,
    xg_marcados: 0,
    assistencias: 0,
    xa_assistido: 0,
    distancia_total_km: 0,
    sprints_totais: 0,
    velocidade_maxima_kmh: 0,
    gols_de_penalti: 0,
    gols_de_falta: 0,
    finalizacoes: 0,
    finalizacoes_no_gol: 0,
    grandes_chances_perdidas: 0,
    grandes_chances_criadas: 0,
    passes_certos: 0,
    passes_decisivos: 0,
    bolas_longas_certas: 0,
    dribles_certos: 0,
    penaltis_sofridos: 0,
    desarmes: 0,
    interceptacoes: 0,
    cortes: 0,
    perda_posse_bola: 0,
    cartoes_amarelos: 0,
    cartoes_vermelhos: 0,
    defesas_totais: 0,
    xgot_sofrido: 0,
    gols_sofridos_goleiro: 0,
  };
}

export interface DefinicaoRankingJogador {
  chave: CategoriaRankingJogador;
  label: string;
  ordem: 'DESC' | 'ASC';
  casasDecimais: number;
  sufixo?: string;
  apenasGoleiros?: boolean;
  tierValorizacao: 'PRINCIPAL_100' | 'SECUNDARIO_50' | 'NENHUM';
}

export const DEFINICOES_RANKING_JOGADORES: DefinicaoRankingJogador[] = [
  { chave: 'nota_media_sofascore', label: 'Nota média do Sofascore', ordem: 'DESC', casasDecimais: 2, tierValorizacao: 'PRINCIPAL_100' },
  { chave: 'gols', label: 'Gols', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'PRINCIPAL_100' },
  { chave: 'xg_marcados', label: 'Gols esperados (xG) - marcados', ordem: 'DESC', casasDecimais: 2, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'assistencias', label: 'Assistências', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'PRINCIPAL_100' },
  { chave: 'xa_assistido', label: 'Assistências esperadas (xA) — assistido', ordem: 'DESC', casasDecimais: 2, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'participacoes_em_gols', label: 'Participações em gols', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'distancia_percorrida_por_90', label: 'Distância percorrida (por 90)', ordem: 'DESC', casasDecimais: 1, sufixo: ' km', tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'sprints_por_90', label: 'Número de sprints (por 90)', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'velocidade_maxima_kmh', label: 'Velocidade máxima', ordem: 'DESC', casasDecimais: 1, sufixo: ' km/h', tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'gols_de_penalti', label: 'Gols de pênalti', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'gols_de_falta', label: 'Gols de falta', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'frequencia_gols_minutos', label: 'Frequência de gols (em minutos)', ordem: 'ASC', casasDecimais: 0, sufixo: ' min', tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'finalizacoes_por_jogo', label: 'Finalizações por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'finalizacoes_no_gol_por_jogo', label: 'Finalizações no gol por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'grandes_chances_perdidas', label: 'Grandes chances perdidas', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'NENHUM' },
  { chave: 'grandes_chances_criadas', label: 'Grandes chances criadas', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'passes_certos_por_jogo', label: 'Passes certos por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'passes_decisivos_por_jogo', label: 'Passes decisivos por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'bolas_longas_certas_por_jogo', label: 'Bolas longas (certos) por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'dribles_certos_por_jogo', label: 'Dribles certos por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'penaltis_sofridos', label: 'Pênaltis sofridos', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'desarmes_por_jogo', label: 'Desarmes por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'interceptacoes_por_jogo', label: 'Interceptações por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'cortes_por_jogo', label: 'Cortes por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'perda_posse_por_jogo', label: 'Perda da posse de bola por jogo', ordem: 'DESC', casasDecimais: 1, tierValorizacao: 'NENHUM' },
  { chave: 'cartoes_amarelos', label: 'Cartões amarelos', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'NENHUM' },
  { chave: 'cartoes_vermelhos', label: 'Cartões vermelhos', ordem: 'DESC', casasDecimais: 0, tierValorizacao: 'NENHUM' },
  { chave: 'defesas_totais_por_jogo', label: 'Defesas totais por jogo', ordem: 'DESC', casasDecimais: 1, apenasGoleiros: true, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'gols_evitados', label: 'Gols evitados', ordem: 'DESC', casasDecimais: 2, apenasGoleiros: true, tierValorizacao: 'SECUNDARIO_50' },
  { chave: 'mais_gols_sofridos_por_jogo', label: 'Mais gols sofridos por jogo', ordem: 'DESC', casasDecimais: 2, apenasGoleiros: true, tierValorizacao: 'NENHUM' },
];

export function extrairValorRankingJogador(
  st: EstatisticasTemporadaJogador,
  categoria: CategoriaRankingJogador
): number | null {
  const j = Math.max(1, st.jogos_disputados);
  const noventa = Math.max(0.2, st.minutos_jogados / 90);

  switch (categoria) {
    case 'nota_media_sofascore': return st.soma_notas_sofascore / j;
    case 'gols': return st.gols;
    case 'xg_marcados': return st.xg_marcados;
    case 'assistencias': return st.assistencias;
    case 'xa_assistido': return st.xa_assistido;
    case 'participacoes_em_gols': return st.gols + st.assistencias;
    case 'distancia_percorrida_por_90': return st.distancia_total_km / noventa;
    case 'sprints_por_90': return st.sprints_totais / noventa;
    case 'velocidade_maxima_kmh': return st.velocidade_maxima_kmh;
    case 'gols_de_penalti': return st.gols_de_penalti;
    case 'gols_de_falta': return st.gols_de_falta;
    case 'frequencia_gols_minutos':
      if (st.gols < 2 || st.minutos_jogados < 90) return null;
      return Math.round(st.minutos_jogados / st.gols);
    case 'finalizacoes_por_jogo': return st.finalizacoes / j;
    case 'finalizacoes_no_gol_por_jogo': return st.finalizacoes_no_gol / j;
    case 'grandes_chances_perdidas': return st.grandes_chances_perdidas;
    case 'grandes_chances_criadas': return st.grandes_chances_criadas;
    case 'passes_certos_por_jogo': return st.passes_certos / j;
    case 'passes_decisivos_por_jogo': return st.passes_decisivos / j;
    case 'bolas_longas_certas_por_jogo': return st.bolas_longas_certas / j;
    case 'dribles_certos_por_jogo': return st.dribles_certos / j;
    case 'penaltis_sofridos': return st.penaltis_sofridos;
    case 'desarmes_por_jogo': return st.desarmes / j;
    case 'interceptacoes_por_jogo': return st.interceptacoes / j;
    case 'cortes_por_jogo': return st.cortes / j;
    case 'perda_posse_por_jogo': return st.perda_posse_bola / j;
    case 'cartoes_amarelos': return st.cartoes_amarelos;
    case 'cartoes_vermelhos': return st.cartoes_vermelhos;
    case 'defesas_totais_por_jogo': return st.defesas_totais / j;
    case 'gols_evitados': return st.xgot_sofrido - st.gols_sofridos_goleiro;
    case 'mais_gols_sofridos_por_jogo': return st.gols_sofridos_goleiro / j;
  }
}

export function calcularValorMercadoComBonusRankings(params: {
  jogadores: Jogador[];
  estatisticasJogadores: EstatisticasTemporadaJogador[];
  rodadaAtual: number;
}): Map<number, number> {
  const { jogadores, estatisticasJogadores, rodadaAtual } = params;
  const mapaJogadores = new Map<number, Jogador>();
  jogadores.forEach((j) => mapaJogadores.set(j.id, j));

  const bonusPorJogador = new Map<number, number>();
  const minimoJogos = Math.max(1, Math.floor(rodadaAtual * 0.35));

  for (const def of DEFINICOES_RANKING_JOGADORES) {
    if (def.tierValorizacao === 'NENHUM') continue;

    const candidatos = estatisticasJogadores
      .filter((st) => {
        if (st.jogos_disputados < minimoJogos) return false;
        const jog = mapaJogadores.get(st.jogador_id);
        if (!jog) return false;
        if (def.apenasGoleiros && jog.posicao !== 'GOL') return false;
        return true;
      })
      .map((st) => ({
        jogadorId: st.jogador_id,
        valor: extrairValorRankingJogador(st, def.chave),
      }))
      .filter((item): item is { jogadorId: number; valor: number } => item.valor !== null);

    candidatos.sort((a, b) =>
      def.ordem === 'DESC' ? b.valor - a.valor : a.valor - b.valor
    );

    const top3 = candidatos.slice(0, 3);
    const multiplicadorTier = def.tierValorizacao === 'PRINCIPAL_100' ? 1.0 : 0.5;
    const percentuaisPosicao = [0.24, 0.18, 0.12];

    top3.forEach((item, idx) => {
      const incremento = percentuaisPosicao[idx] * multiplicadorTier;
      const atual = bonusPorJogador.get(item.jogadorId) ?? 0;
      bonusPorJogador.set(item.jogadorId, Math.min(0.45, atual + incremento));
    });
  }

  const resultadoValores = new Map<number, number>();
  for (const jog of jogadores) {
    const valorBase = (jog as any).valor_mercado_base ?? jog.valor_mercado;
    const bonusPct = bonusPorJogador.get(jog.id) ?? 0;
    const valorFinal = Math.round((valorBase * (1 + bonusPct)) / 50_000) * 50_000;
    resultadoValores.set(jog.id, valorFinal);
  }

  return resultadoValores;
}
