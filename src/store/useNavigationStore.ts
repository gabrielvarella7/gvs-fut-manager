import { create } from 'zustand';

export type RotaTela =
  | 'DASHBOARD'
  | 'ELENCO_TATICA'
  | 'TREINOS'
  | 'MERCADO'
  | 'FINANCAS'
  | 'CORPO_TECNICO'
  | 'CLASSIFICACAO'
  | 'CALENDARIO'
  | 'FICHA_JOGADOR'
  | 'FICHA_CLUBE'
  | 'PRE_JOGO'
  | 'PARTIDA_AO_VIVO'
  | 'COLETIVA_POS_JOGO';

export interface EntradaHistorico {
  tela: RotaTela;
  parametroId?: string | number | null;
  titulo: string;
}

interface NavigationState {
  historicoPassado: EntradaHistorico[];
  atual: EntradaHistorico;
  historicoFuturo: EntradaHistorico[];

  navegarPara: (entrada: EntradaHistorico) => void;
  voltar: () => void;
  avancar: () => void;
  podeVoltar: () => boolean;
  podeAvancar: () => boolean;
  resetarHistorico: (inicial?: EntradaHistorico) => void;
}

const ENTRADA_INICIAL: EntradaHistorico = {
  tela: 'DASHBOARD',
  parametroId: null,
  titulo: 'Escritório / Visão Geral',
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  historicoPassado: [],
  atual: ENTRADA_INICIAL,
  historicoFuturo: [],

  navegarPara: (novaEntrada) => {
    const { atual, historicoPassado } = get();
    if (atual.tela === novaEntrada.tela && atual.parametroId === novaEntrada.parametroId) {
      return;
    }
    const novoPassado = [...historicoPassado, atual].slice(-40);
    set({
      historicoPassado: novoPassado,
      atual: novaEntrada,
      historicoFuturo: [],
    });
  },

  voltar: () => {
    const { historicoPassado, atual, historicoFuturo } = get();
    if (historicoPassado.length === 0) return;
    const anterior = historicoPassado[historicoPassado.length - 1];
    const novoPassado = historicoPassado.slice(0, -1);
    set({
      historicoPassado: novoPassado,
      atual: anterior,
      historicoFuturo: [atual, ...historicoFuturo],
    });
  },

  avancar: () => {
    const { historicoPassado, atual, historicoFuturo } = get();
    if (historicoFuturo.length === 0) return;
    const proxima = historicoFuturo[0];
    const novoFuturo = historicoFuturo.slice(1);
    set({
      historicoPassado: [...historicoPassado, atual],
      atual: proxima,
      historicoFuturo: novoFuturo,
    });
  },

  podeVoltar: () => get().historicoPassado.length > 0,
  podeAvancar: () => get().historicoFuturo.length > 0,

  resetarHistorico: (inicial = ENTRADA_INICIAL) =>
    set({
      historicoPassado: [],
      atual: inicial,
      historicoFuturo: [],
    }),
}));
