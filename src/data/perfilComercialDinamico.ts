import type { DimensoesClubeDinamicas, TendenciaMercadoClube } from '../types/commercial';
import type { Time } from '../types/schema';
import { fatorComercialClube, resolverPerfilComercial } from './perfilComercialClubes';

export type { DimensoesClubeDinamicas, TendenciaMercadoClube };

function clampDim(n: number, base: number, minRatio = 0.52, maxRatio = 1.18): number {
  const lo = Math.max(15, base * minRatio);
  const hi = Math.min(99, base * maxRatio);
  return Math.max(lo, Math.min(hi, Math.round(n * 10) / 10));
}

export function criarDimensoesIniciais(time: Time, rodada = 0): DimensoesClubeDinamicas {
  const p = resolverPerfilComercial(time);
  const dims: DimensoesClubeDinamicas = {
    prestigio_marca: p.prestigio_marca,
    indice_torcida: p.indice_torcida,
    desempenho_recente: p.desempenho_recente,
    prestigio_base: p.prestigio_marca,
    indice_torcida_base: p.indice_torcida,
    desempenho_base: p.desempenho_recente,
    modelo_gestao: p.modelo_gestao,
    tendencia: 'ESTAVEL',
    rodada_ultima_atualizacao: rodada,
    fator_ultimo: fatorComercialClube(aplicarDimensoesNoTime(time, p.prestigio_marca, p.indice_torcida, p.desempenho_recente)),
  };
  return dims;
}

export function aplicarDimensoesNoTime(
  time: Time,
  dims: Pick<DimensoesClubeDinamicas, 'prestigio_marca' | 'indice_torcida' | 'desempenho_recente'>,
): Time;
export function aplicarDimensoesNoTime(
  time: Time,
  prestigio: number,
  torcida: number,
  desempenho: number,
): Time;
export function aplicarDimensoesNoTime(
  time: Time,
  a: DimensoesClubeDinamicas | number,
  b?: number,
  c?: number,
): Time {
  const prestigio =
    typeof a === 'number' ? a : Math.round(a.prestigio_marca);
  const torcida = typeof a === 'number' ? (b ?? 50) : Math.round(a.indice_torcida);
  const desempenho = typeof a === 'number' ? (c ?? 60) : Math.round(a.desempenho_recente);
  return {
    ...time,
    prestigio,
    indice_torcida: torcida,
    desempenho_recente: desempenho,
  };
}

function calcularTendencia(fatorAtual: number, fatorBase: number): TendenciaMercadoClube {
  const ratio = fatorAtual / Math.max(0.01, fatorBase);
  if (ratio >= 1.06) return 'CRESCENDO';
  if (ratio <= 0.94) return 'ENCOLHENDO';
  return 'ESTAVEL';
}

export interface AtualizacaoDimensoesParams {
  posicaoTabela: number;
  rodada: number;
  vitoria: boolean;
  empate: boolean;
  derrota: boolean;
  isClassico: boolean;
  time: Time;
}

export function atualizarDimensoesPosRodada(
  dims: DimensoesClubeDinamicas,
  params: AtualizacaoDimensoesParams,
): { dimensoes: DimensoesClubeDinamicas; mudouSignificativo: boolean } {
  let { prestigio_marca, indice_torcida, desempenho_recente } = dims;

  if (params.vitoria) {
    desempenho_recente += 0.38;
    indice_torcida += 0.22;
    prestigio_marca += 0.14;
    if (params.isClassico) {
      desempenho_recente += 0.25;
      prestigio_marca += 0.2;
      indice_torcida += 0.35;
    }
  } else if (params.derrota) {
    desempenho_recente -= 0.42;
    indice_torcida -= 0.28;
    prestigio_marca -= 0.16;
    if (params.isClassico) {
      desempenho_recente -= 0.3;
      indice_torcida -= 0.4;
    }
  } else if (params.empate) {
    desempenho_recente += 0.05;
    indice_torcida -= 0.04;
  }

  if (params.posicaoTabela <= 4) {
    desempenho_recente += 0.12;
    prestigio_marca += 0.08;
  } else if (params.posicaoTabela <= 6) {
    desempenho_recente += 0.06;
  } else if (params.posicaoTabela >= 17) {
    desempenho_recente -= 0.32;
    indice_torcida -= 0.22;
    prestigio_marca -= 0.18;
  } else if (params.posicaoTabela >= 14) {
    desempenho_recente -= 0.12;
    indice_torcida -= 0.08;
  }

  prestigio_marca = clampDim(prestigio_marca, dims.prestigio_base);
  indice_torcida = clampDim(indice_torcida, dims.indice_torcida_base, 0.45, 1.12);
  desempenho_recente = clampDim(desempenho_recente, dims.desempenho_base, 0.48, 1.15);

  const timeDinamico = aplicarDimensoesNoTime(params.time, {
    prestigio_marca,
    indice_torcida,
    desempenho_recente,
  } as DimensoesClubeDinamicas);
  const fatorBase = fatorComercialClube(
    aplicarDimensoesNoTime(params.time, dims.prestigio_base, dims.indice_torcida_base, dims.desempenho_base),
  );
  const fatorAtual = fatorComercialClube(timeDinamico);
  const tendencia = calcularTendencia(fatorAtual, fatorBase);
  const mudouSignificativo = Math.abs(fatorAtual - dims.fator_ultimo) >= 0.035;

  let nota: string | undefined;
  if (tendencia === 'ENCOLHENDO' && mudouSignificativo) {
    nota = 'Mercado reavaliou o clube para baixo — novas propostas de TV e patrocínio tendem a ser menores.';
  } else if (tendencia === 'CRESCENDO' && mudouSignificativo) {
    nota = 'Trajetória positiva — emissoras e patrocinadores podem oferecer pacotes melhores.';
  } else if (params.posicaoTabela >= 17) {
    nota = 'Zona de rebaixamento pesa no apetite comercial e na base de sócios.';
  }

  return {
    dimensoes: {
      ...dims,
      prestigio_marca,
      indice_torcida,
      desempenho_recente,
      tendencia,
      rodada_ultima_atualizacao: params.rodada,
      nota_mercado: nota ?? dims.nota_mercado,
      fator_ultimo: fatorAtual,
    },
    mudouSignificativo,
  };
}

export function rotuloTendencia(t: TendenciaMercadoClube): string {
  switch (t) {
    case 'CRESCENDO':
      return 'Clube crescendo no mercado';
    case 'ENCOLHENDO':
      return 'Clube encolhendo — ofertas piores';
    default:
      return 'Tamanho estável';
  }
}