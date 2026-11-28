export type TomColetiva5Niveis =
  | 'CRITICA_MEDIA'
  | 'CRITICA_BAIXA'
  | 'NEUTRA'
  | 'ELOGIO_BAIXO'
  | 'ELOGIO_MEDIO';

export interface EstadoPsicologicoJogador {
  /** Escala 0 a 100 (50 = neutro). Impacta atributos FÍSICOS na partida. */
  motivacao: number;
  /** Escala 0 a 100 (50 = neutro). Impacta atributos TÉCNICOS na partida. */
  confianca: number;
  /** Contador de jogos seguidos em crise para acionar o paraquedas */
  rodadasEmBaixa: number;
}

export interface ModificadoresPsicologicosPartida {
  multiplicadorFisico: number;
  multiplicadorTecnico: number;
  multiplicadorDesgasteEnergia: number;
}
