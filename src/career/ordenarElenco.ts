import type { Jogador, Posicao, StatusEscalacao } from '../types/schema';
import { valorMercado } from './playerUtils';

const ORDEM_POS: Record<Posicao, number> = {
  GOL: 0,
  LAT: 1,
  ZAG: 2,
  VOL: 3,
  MEI: 4,
  ATA: 5,
};

const ORDEM_STATUS: Record<StatusEscalacao, number> = {
  TITULAR: 0,
  RESERVA: 1,
  NAO_RELACIONADO: 2,
};

/** GOL → LAT → ZAG → VOL → MEI → ATA; NAO por último no grupo; OVR; titularidade; valor. */
export function ordenarElenco(jogadores: Jogador[]): Jogador[] {
  return [...jogadores].sort((a, b) => {
    const pos = ORDEM_POS[a.posicao] - ORDEM_POS[b.posicao];
    if (pos !== 0) return pos;

    const naoA = a.status_escalacao === 'NAO_RELACIONADO';
    const naoB = b.status_escalacao === 'NAO_RELACIONADO';
    if (naoA !== naoB) return naoA ? 1 : -1;

    const ovr = b.overall - a.overall;
    if (ovr !== 0) return ovr;

    const st = ORDEM_STATUS[a.status_escalacao] - ORDEM_STATUS[b.status_escalacao];
    if (st !== 0) return st;

    return valorMercado(b) - valorMercado(a);
  });
}