import type { Jogador, Posicao, StatusEscalacao } from '../types/schema';
import { mediaAtributosGrupo } from './atributosJogador';
import { salarioMensal, valorMercado } from './playerUtils';

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

export type ElencoSortColuna =
  | 'nome'
  | 'pos'
  | 'idade'
  | 'ovr'
  | 'energia'
  | 'tec'
  | 'men'
  | 'fis'
  | 'valor'
  | 'salario'
  | 'status';

export type ElencoSortDirecao = 'asc' | 'desc';

/** Direção inicial ao clicar numa coluna pela primeira vez. */
export function direcaoInicialColuna(coluna: ElencoSortColuna): ElencoSortDirecao {
  switch (coluna) {
    case 'nome':
    case 'pos':
    case 'idade':
    case 'status':
      return 'asc';
    default:
      return 'desc';
  }
}

/** Chave numérica alinhada ao rótulo exibido na coluna Status. */
function chaveStatusExibido(j: Jogador): number {
  if (j.lesao && j.lesao.diasRestantes > 0 && j.energia < 60) return 4; // FORA
  if (j.lesao && j.lesao.diasRestantes > 0) return 3; // LES
  return ORDEM_STATUS[j.status_escalacao];
}

function compararColuna(a: Jogador, b: Jogador, coluna: ElencoSortColuna): number {
  switch (coluna) {
    case 'nome':
      return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' });
    case 'pos':
      return ORDEM_POS[a.posicao] - ORDEM_POS[b.posicao];
    case 'idade':
      return a.idade - b.idade;
    case 'ovr':
      return a.overall - b.overall;
    case 'energia':
      return a.energia - b.energia;
    case 'tec':
      return (
        mediaAtributosGrupo(a.atributos, 'tecnicos') -
        mediaAtributosGrupo(b.atributos, 'tecnicos')
      );
    case 'men':
      return (
        mediaAtributosGrupo(a.atributos, 'mentais') -
        mediaAtributosGrupo(b.atributos, 'mentais')
      );
    case 'fis':
      return (
        mediaAtributosGrupo(a.atributos, 'fisicos') -
        mediaAtributosGrupo(b.atributos, 'fisicos')
      );
    case 'valor':
      return valorMercado(a) - valorMercado(b);
    case 'salario':
      return salarioMensal(a) - salarioMensal(b);
    case 'status':
      return chaveStatusExibido(a) - chaveStatusExibido(b);
  }
}

/** Ordena o elenco por uma coluna da tabela (asc/desc). Empate: nome. */
export function ordenarElencoPorColuna(
  jogadores: Jogador[],
  coluna: ElencoSortColuna,
  direcao: ElencoSortDirecao,
): Jogador[] {
  const sinal = direcao === 'asc' ? 1 : -1;
  return [...jogadores].sort((a, b) => {
    const cmp = compararColuna(a, b, coluna);
    if (cmp !== 0) return cmp * sinal;
    return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' });
  });
}

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
