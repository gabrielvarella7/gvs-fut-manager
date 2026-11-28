export type CategoriaRankingTime =
  | 'nota_media_sofascore'
  | 'gols_marcados'
  | 'gols_sofridos'
  | 'grandes_chances'
  | 'grandes_chances_perdidas'
  | 'distancia_por_partida_km'
  | 'sprints_por_partida'
  | 'finalizacoes_na_trave'
  | 'cartoes_amarelos'
  | 'cartoes_vermelhos'
  | 'posse_de_bola_pct'
  | 'passes_certos'
  | 'bolas_longas_certas'
  | 'cruzamentos_certos'
  | 'finalizacoes'
  | 'finalizacoes_no_gol'
  | 'dribles_certos'
  | 'desarmes'
  | 'interceptacoes'
  | 'cortes'
  | 'escanteios'
  | 'faltas'
  | 'gols_de_penalti'
  | 'penaltis_concedidos'
  | 'jogos_sem_sofrer_gols'
  | 'xg'
  | 'xgot'
  | 'xa'
  | 'gols_evitados'
  | 'acoes_com_a_bola'
  | 'passes_decisivos'
  | 'contribuicoes_defensivas';

export interface EstatisticasAcumuladasClube {
  time_id: string;
  jogos_disputados: number;
  soma_notas_sofascore: number;
  gols_marcados: number;
  gols_sofridos: number;
  grandes_chances: number;
  grandes_chances_perdidas: number;
  distancia_total_km: number;
  sprints_totais: number;
  finalizacoes_na_trave: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  soma_posse_pct: number;
  passes_certos: number;
  bolas_longas_certas: number;
  cruzamentos_certos: number;
  finalizacoes: number;
  finalizacoes_no_gol: number;
  dribles_certos: number;
  desarmes: number;
  interceptacoes: number;
  cortes: number;
  escanteios: number;
  faltas: number;
  gols_de_penalti: number;
  penaltis_concedidos: number;
  jogos_sem_sofrer_gols: number;
  xg: number;
  xgot: number;
  xa: number;
  gols_evitados: number;
  acoes_com_a_bola: number;
  passes_decisivos: number;
  contribuicoes_defensivas: number;
}

export const DEFINICOES_RANKING_TIMES: Array<{
  chave: CategoriaRankingTime;
  label: string;
  tipoCalculo: 'MEDIA_POR_JOGO' | 'TOTAL_ACUMULADO';
  ordem: 'DESC' | 'ASC';
  casasDecimais: number;
  sufixo?: string;
}> = [
  { chave: 'nota_media_sofascore', label: 'Nota média do Sofascore', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 2 },
  { chave: 'gols_marcados', label: 'Gols marcados', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'gols_sofridos', label: 'Gols sofridos', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'grandes_chances', label: 'Grandes chances', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'grandes_chances_perdidas', label: 'Grandes chances perdidas', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'distancia_por_partida_km', label: 'Distância por partida (sem goleiro)', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1, sufixo: ' km' },
  { chave: 'sprints_por_partida', label: 'Número de sprints (por partida)', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'finalizacoes_na_trave', label: 'Finalizações na trave', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'cartoes_amarelos', label: 'Cartões amarelos', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'cartoes_vermelhos', label: 'Cartões vermelhos', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'posse_de_bola_pct', label: 'Posse de bola', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1, sufixo: '%' },
  { chave: 'passes_certos', label: 'Passes certos', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'bolas_longas_certas', label: 'Bolas longas certas', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'cruzamentos_certos', label: 'Cruzamentos certos', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'finalizacoes', label: 'Finalizações', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'finalizacoes_no_gol', label: 'Finalizações no gol', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'dribles_certos', label: 'Dribles certos', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'desarmes', label: 'Desarmes', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'interceptacoes', label: 'Interceptações', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'cortes', label: 'Cortes', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'escanteios', label: 'Escanteios', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'faltas', label: 'Faltas', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'gols_de_penalti', label: 'Gols de pênalti', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'penaltis_concedidos', label: 'Pênaltis concedidos', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'jogos_sem_sofrer_gols', label: 'Jogos sem sofrer gols', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 0 },
  { chave: 'xg', label: 'Gols esperados (xG)', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 2 },
  { chave: 'xgot', label: 'Gols esperados no alvo (xGOT)', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 2 },
  { chave: 'xa', label: 'Assistências Esperadas (xA)', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 2 },
  { chave: 'gols_evitados', label: 'Gols evitados', tipoCalculo: 'TOTAL_ACUMULADO', ordem: 'DESC', casasDecimais: 2 },
  { chave: 'acoes_com_a_bola', label: 'Ações com a bola', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'passes_decisivos', label: 'Passes decisivos', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
  { chave: 'contribuicoes_defensivas', label: 'Contribuições def.', tipoCalculo: 'MEDIA_POR_JOGO', ordem: 'DESC', casasDecimais: 1 },
];
