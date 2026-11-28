import type {
  EstadoPsicologicoJogador,
  ModificadoresPsicologicosPartida,
  TomColetiva5Niveis,
} from '../types/psicologico';

const PISO_MINIMO_TRAVA = 18;
const TETO_MAXIMO_TRAVA = 94;
const PONTO_NEUTRO = 50;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function aplicarDeltaComTrava(atual: number, deltaBruto: number): number {
  if (deltaBruto === 0) return atual;
  let fatorAmortecimento = 1.0;

  if (deltaBruto > 0) {
    if (atual >= 80) fatorAmortecimento = 0.35;
    else if (atual >= 68) fatorAmortecimento = 0.65;
    else if (atual <= 32) fatorAmortecimento = 1.35;
  } else {
    if (atual <= 26) fatorAmortecimento = 0.25;
    else if (atual <= 38) fatorAmortecimento = 0.55;
    else if (atual >= 82) fatorAmortecimento = 1.30;
  }

  return clamp(Math.round(atual + deltaBruto * fatorAmortecimento), PISO_MINIMO_TRAVA, TETO_MAXIMO_TRAVA);
}

export function aplicarParaquedasPsicologico(
  estado: EstadoPsicologicoJogador
): EstadoPsicologicoJogador {
  let { motivacao, confianca, rodadasEmBaixa } = estado;
  const emCrise = motivacao < 38 || confianca < 38;
  rodadasEmBaixa = emCrise ? rodadasEmBaixa + 1 : 0;

  if (motivacao < 36) {
    motivacao = clamp(motivacao + (rodadasEmBaixa >= 3 ? 6 : 3), PISO_MINIMO_TRAVA, TETO_MAXIMO_TRAVA);
  }
  if (confianca < 36) {
    confianca = clamp(confianca + (rodadasEmBaixa >= 3 ? 6 : 3), PISO_MINIMO_TRAVA, TETO_MAXIMO_TRAVA);
  }

  if (motivacao > 85) motivacao -= 2;
  if (confianca > 85) confianca -= 2;

  return { motivacao, confianca, rodadasEmBaixa };
}

/**
 * Motivação -> Modula FÍSICO (Velocidade/Resistência)
 * Confiança -> Modula TÉCNICO (Passe/Chute/Defesa)
 */
export function obterModificadoresPartida(
  estado?: Partial<EstadoPsicologicoJogador>
): ModificadoresPsicologicosPartida {
  const motivacao = clamp(estado?.motivacao ?? PONTO_NEUTRO, 0, 100);
  const confianca = clamp(estado?.confianca ?? PONTO_NEUTRO, 0, 100);

  const normMotivacao = (motivacao - PONTO_NEUTRO) / 50;
  const normConfianca = (confianca - PONTO_NEUTRO) / 50;

  return {
    multiplicadorFisico: Number((1 + normMotivacao * 0.09).toFixed(4)),
    multiplicadorTecnico: Number((1 + normConfianca * 0.09).toFixed(4)),
    multiplicadorDesgasteEnergia: Number((1 - normMotivacao * 0.07).toFixed(4)),
  };
}

export function aplicarTomColetiva5Niveis(
  estadoAtual: EstadoPsicologicoJogador,
  tom: TomColetiva5Niveis
): EstadoPsicologicoJogador {
  const deltas: Record<TomColetiva5Niveis, { mot: number; conf: number }> = {
    CRITICA_MEDIA: { mot: +8, conf: -7 },
    CRITICA_BAIXA: { mot: +4, conf: -3 },
    NEUTRA:        { mot: 0,  conf: +1 },
    ELOGIO_BAIXO:  { mot: -2, conf: +4 },
    ELOGIO_MEDIO:  { mot: -5, conf: +8 },
  };
  const d = deltas[tom];
  return {
    motivacao: aplicarDeltaComTrava(estadoAtual.motivacao, d.mot),
    confianca: aplicarDeltaComTrava(estadoAtual.confianca, d.conf),
    rodadasEmBaixa: estadoAtual.rodadasEmBaixa,
  };
}
