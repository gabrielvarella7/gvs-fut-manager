import type { Jogador, Posicao } from '../types/schema';
import { calcularOverallDeAtributos20, normalizarParaEscala20 } from '../utils/attributeScale20';

export interface AtributosJogador20 {
  defesa: number;     // 1..20
  passe: number;      // 1..20
  chute: number;      // 1..20
  velocidade: number; // 1..20
}

export interface ProgressaoCM {
  xp_defesa: number;
  xp_passe: number;
  xp_chute: number;
  xp_velocidade: number;
  potencial_maximo: number; // 45..99
  profissionalismo: number; // 0.70..1.40
  propensao_lesao: number;  // 0.50..2.10
}

function obterFatorIdadeCM(idade: number): {
  multiplicadorSubida: number;
  taxaDeclinioFisicoSemanal: number;
} {
  if (idade <= 20) return { multiplicadorSubida: 2.20, taxaDeclinioFisicoSemanal: 0 };
  if (idade <= 24) return { multiplicadorSubida: 1.45, taxaDeclinioFisicoSemanal: 0 };
  if (idade <= 29) return { multiplicadorSubida: 0.55, taxaDeclinioFisicoSemanal: 0 };
  if (idade <= 32) return { multiplicadorSubida: 0.12, taxaDeclinioFisicoSemanal: -2.2 };
  if (idade <= 35) return { multiplicadorSubida: 0.03, taxaDeclinioFisicoSemanal: -5.8 };
  return { multiplicadorSubida: 0.0, taxaDeclinioFisicoSemanal: -9.5 };
}

/**
 * Evolução semanal estilo Championship Manager (CA/PA + XP -100..+100).
 * Escala estrita de 1 a 20 nos 4 atributos. Blinda overall contra quedas bruscas.
 */
export function processarSemanaEvolucaoCM(params: {
  jogador: Jogador;
  progressao: ProgressaoCM;
  minutosJogadosNaSemana: number;
  notaMediaNaSemana: number;
  intensidadeTreino: 'REGENERATIVO' | 'EQUILIBRADO' | 'ALTA_INTENSIDADE' | 'EXTREMO';
  focoTreino: 'DEFESA' | 'PASSE' | 'CHUTE' | 'VELOCIDADE' | 'EQUILIBRADO';
  nivelPreparadorFisico: number; // 1..20
  nivelAuxiliarTecnico: number;  // 1..20
  lesionadoAtualmente: boolean;
}): {
  jogadorAtualizado: Jogador;
  progressaoAtualizada: ProgressaoCM;
  subiuOverall: boolean;
} {
  const {
    jogador,
    progressao,
    minutosJogadosNaSemana,
    notaMediaNaSemana,
    intensidadeTreino,
    focoTreino,
    nivelPreparadorFisico,
    nivelAuxiliarTecnico,
    lesionadoAtualmente,
  } = params;

  const attr: AtributosJogador20 = {
    defesa: normalizarParaEscala20(jogador.atributos.defesa),
    passe: normalizarParaEscala20(jogador.atributos.passe),
    chute: normalizarParaEscala20(jogador.atributos.chute),
    velocidade: normalizarParaEscala20(jogador.atributos.velocidade),
  };
  const prog: ProgressaoCM = { ...progressao };
  const overallAntes = jogador.overall;

  const { multiplicadorSubida, taxaDeclinioFisicoSemanal } = obterFatorIdadeCM(jogador.idade);

  // 1. Declínio físico de veteranos (32+ anos)
  if (taxaDeclinioFisicoSemanal < 0) {
    const fatorLongevidade =
      jogador.posicao === 'GOL' ? 0.55 : jogador.posicao === 'ZAG' ? 0.78 : 1.0;
    const fatorStaff = 1 - (nivelPreparadorFisico / 20) * 0.30;
    const quedaVel =
      taxaDeclinioFisicoSemanal * fatorLongevidade * fatorStaff * prog.propensao_lesao;

    prog.xp_velocidade += quedaVel;
    if (jogador.idade >= 35) {
      prog.xp_defesa += quedaVel * 0.35;
    }
  }

  // 2. Evolução positiva até o teto Potential Ability (PA)
  const distanciaParaTeto = prog.potencial_maximo - jogador.overall;
  if (!lesionadoAtualmente && distanciaParaTeto > 0 && multiplicadorSubida > 0) {
    const fatorProximidadePA = Math.min(1.0, Math.max(0.12, distanciaParaTeto / 12));
    const fatorMinutagem =
      minutosJogadosNaSemana >= 75 ? 1.35 : minutosJogadosNaSemana >= 25 ? 1.05 : 0.65;
    const fatorNota =
      notaMediaNaSemana >= 7.5 ? 1.25 : notaMediaNaSemana >= 6.8 ? 1.05 : 0.85;
    const fatorIntensidade =
      intensidadeTreino === 'EXTREMO'
        ? 1.35
        : intensidadeTreino === 'ALTA_INTENSIDADE'
        ? 1.22
        : intensidadeTreino === 'EQUILIBRADO'
        ? 1.0
        : 0.65;

    const fatorComissao = 0.85 + ((nivelPreparadorFisico + nivelAuxiliarTecnico) / 40) * 0.35;

    const xpBaseSemana =
      7.5 *
      multiplicadorSubida *
      fatorProximidadePA *
      fatorMinutagem *
      fatorNota *
      fatorIntensidade *
      fatorComissao *
      prog.profissionalismo;

    prog.xp_defesa += xpBaseSemana * (focoTreino === 'DEFESA' ? 1.55 : 0.85);
    prog.xp_passe += xpBaseSemana * (focoTreino === 'PASSE' ? 1.55 : 0.85);
    prog.xp_chute += xpBaseSemana * (focoTreino === 'CHUTE' ? 1.55 : 0.85);
    prog.xp_velocidade += xpBaseSemana * (focoTreino === 'VELOCIDADE' ? 1.55 : 0.85);
  }

  // 3. Conversão de XP para +1 / -1 na escala 1..20 (teto estrito = 20)
  const chaves: Array<[keyof AtributosJogador20, keyof ProgressaoCM]> = [
    ['defesa', 'xp_defesa'],
    ['passe', 'xp_passe'],
    ['chute', 'xp_chute'],
    ['velocidade', 'xp_velocidade'],
  ];

  for (const [attrKey, xpKey] of chaves) {
    if (prog[xpKey] >= 100) {
      prog[xpKey] -= 100;
      if (attr[attrKey] < 20) attr[attrKey] += 1;
    } else if (prog[xpKey] <= -100) {
      prog[xpKey] += 100;
      if (attr[attrKey] > 5) attr[attrKey] -= 1;
    }
  }

  const novoOverall = Math.min(
    prog.potencial_maximo,
    calcularOverallDeAtributos20(jogador.posicao as Posicao, attr)
  );

  return {
    jogadorAtualizado: {
      ...jogador,
      atributos: attr,
      overall: novoOverall,
    },
    progressaoAtualizada: prog,
    subiuOverall: novoOverall > overallAntes,
  };
}
