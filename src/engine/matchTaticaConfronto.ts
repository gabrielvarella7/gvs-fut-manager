import { metricasMotorDeAtributos } from '../career/atributosJogador';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../data/esquemasTaticos';
import type { JogadorEmCampo } from './matchEngine';
import { zonaDaCelula } from './matchRendimentoCampo';
import type { EsquemaTatico, Posicao } from '../types/schema';

export interface PerfilEsquema {
  atacantes: number;
  meias: number;
  volantes: number;
  linhaDefesa: number;
  indiceOfensivo: number;
  indiceDefensivo: number;
}

export interface ConfrontoTatico {
  multVolumeGols: number;
  multPressaoAtaque: number;
  faixaGolsTotalMin: number;
  faixaGolsTotalMax: number;
  golsTotalSorteado: number;
  descricao: string;
}

function contarPosicoes(slots: Posicao[]) {
  let atacantes = 0;
  let meias = 0;
  let volantes = 0;
  let linhaDefesa = 0;
  for (const p of slots) {
    if (p === 'ATA') atacantes++;
    else if (p === 'MEI') meias++;
    else if (p === 'VOL') volantes++;
    else linhaDefesa++;
  }
  return { atacantes, meias, volantes, linhaDefesa };
}

export function perfilEsquema(esquema: EsquemaTatico): PerfilEsquema {
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const { atacantes, meias, volantes, linhaDefesa } = contarPosicoes(slots);
  const indiceOfensivo = Math.min(0.98, 0.3 + atacantes * 0.115 + meias * 0.036);
  const indiceDefensivo = Math.min(0.98, 0.26 + linhaDefesa * 0.052 + volantes * 0.038);
  return { atacantes, meias, volantes, linhaDefesa, indiceOfensivo, indiceDefensivo };
}

function ehLinhaOfensiva(e: JogadorEmCampo): boolean {
  if (e.celulaCampo) {
    const z = zonaDaCelula(e.celulaCampo);
    return z === 'ATA' || z === 'MO';
  }
  return e.posicaoEscalada === 'ATA' || e.posicaoEscalada === 'MEI';
}

/** Média 0–100 — chute, criação e velocidade na linha de frente escalada. */
export function qualidadeOfensivaAtributos(escalacao: JogadorEmCampo[]): number {
  const frente = escalacao.filter(ehLinhaOfensiva);
  const lista = frente.length >= 3 ? frente : escalacao.filter((e) => e.posicaoEscalada !== 'GOL');
  if (lista.length === 0) return 55;

  let soma = 0;
  for (const { jogador } of lista) {
    const m = metricasMotorDeAtributos(jogador.atributos);
    soma += m.chute * 0.4 + m.criatividade * 0.35 + m.velocidade * 0.25;
  }
  return soma / lista.length;
}

export function calcularConfrontoTatico(
  esquemaMandante: EsquemaTatico,
  esquemaVisitante: EsquemaTatico,
  escMandante: JogadorEmCampo[],
  escVisitante: JogadorEmCampo[],
  rnd: () => number,
): ConfrontoTatico {
  const pM = perfilEsquema(esquemaMandante);
  const pV = perfilEsquema(esquemaVisitante);

  const somaOfensiva = pM.indiceOfensivo + pV.indiceOfensivo;
  const somaDefensiva = pM.indiceDefensivo + pV.indiceDefensivo;

  let multVolume = 1;
  if (somaOfensiva >= 1.52) {
    multVolume = 1 + (somaOfensiva - 1.32) * 0.92;
  } else if (somaOfensiva <= 1.02) {
    multVolume = 0.78 + somaOfensiva * 0.14;
  }

  if (somaDefensiva < 1.28) {
    multVolume *= 1.06 + (1.28 - somaDefensiva) * 0.32;
  } else if (somaDefensiva > 1.62) {
    multVolume *= 0.9 - Math.min(0.12, (somaDefensiva - 1.62) * 0.2);
  }

  const qM = qualidadeOfensivaAtributos(escMandante);
  const qV = qualidadeOfensivaAtributos(escVisitante);
  const mediaAttr = (qM + qV) / 2;
  multVolume *= 0.86 + (mediaAttr / 75) * 0.28;

  multVolume = Math.max(0.58, Math.min(2.25, multVolume));

  const mediaSerieA = 2.42;
  const centroGols = mediaSerieA * multVolume;
  const amplitude = 0.12 + Math.min(0.22, multVolume * 0.08);
  const faixaGolsTotalMin = Math.max(0.4, centroGols * (1 - amplitude));
  const faixaGolsTotalMax = Math.min(7.5, centroGols * (1 + amplitude));
  const golsTotalSorteado =
    faixaGolsTotalMin + rnd() * (faixaGolsTotalMax - faixaGolsTotalMin);

  let descricao = 'Confronto equilibrado entre sistemas de jogo.';
  if (pM.atacantes >= 4 && pV.atacantes >= 3) {
    descricao = 'Dois esquemas ofensivos — tendência a jogo aberto e muitos gols.';
  } else if (pM.atacantes >= 4 || pV.atacantes >= 4) {
    descricao = 'Um lado muito vertical — espaços aparecem para os dois times.';
  } else if (pM.indiceDefensivo > 0.78 && pV.indiceDefensivo > 0.78) {
    descricao = 'Linhas baixas e retrancas — poucas chances claras.';
  }

  const multPressaoAtaque = Math.max(0.82, Math.min(1.42, 0.9 + (somaOfensiva - 1) * 0.38));

  return {
    multVolumeGols: multVolume,
    multPressaoAtaque,
    faixaGolsTotalMin,
    faixaGolsTotalMax,
    golsTotalSorteado,
    descricao,
  };
}

/** Cruza λ dos atributos com a faixa tática e sorteia o ponto final dentro do intervalo. */
export function aplicarConfrontoTaticoNosLambdas(
  lambdaM: number,
  lambdaV: number,
  confronto: ConfrontoTatico,
): { lambdaM: number; lambdaV: number } {
  let m = lambdaM * confronto.multVolumeGols;
  let v = lambdaV * confronto.multVolumeGols;
  const soma = m + v;

  if (soma > 0.05) {
    const propM = m / soma;
    const alvo = confronto.golsTotalSorteado;
    const mesclado = soma * 0.55 + alvo * 0.45;
    m = propM * mesclado;
    v = (1 - propM) * mesclado;
  }

  return {
    lambdaM: Math.min(4.9, Math.max(0.06, m)),
    lambdaV: Math.min(4.9, Math.max(0.06, v)),
  };
}