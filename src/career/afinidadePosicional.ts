import { escalaMotor, metricasMotorDeAtributos } from './atributosJogador';
import { PositionRecalculator } from './positionRecalculator';
import type { Jogador, Posicao } from '../types/schema';
import type { LinhaCampinho } from '../data/campinhoLayout';

/** Níveis da matriz (substitui o flat −20% de improvisação). */
export type NivelAfinidade =
  | 'natural'
  | 'alta'
  | 'media'
  | 'critico'
  | 'gol_emergencia';

export const PENA_BASE_NIVEL: Record<NivelAfinidade, number> = {
  natural: 0,
  alta: 5,
  media: 11,
  critico: 25,
  gol_emergencia: 65,
};

const DEFENSIVAS: ReadonlySet<Posicao> = new Set(['ZAG', 'LAT', 'VOL']);
const OFENSIVAS: ReadonlySet<Posicao> = new Set(['MEI', 'ATA']);

/** Limiares motor 0–100 (attrs 1–20 × 5). */
export const LIMIARES_PARIDADE = {
  /** VOL→ZAG: defesa muito forte. */
  volZagDefesa: 78,
  /** ZAG→VOL: velocidade alta. */
  zagVolVel: 74,
  /** LAT→ATA (LE/LD como AE/AD): ataque de ala. */
  latAtaAtaqueMedia: 72,
  /** ATA→LAT (CA como AE/AD): drible + velocidade. */
  ataLatDribleVel: 74,
  /** →AC (CA): finalização ou cabeceio. */
  paraAcChuteOuCabeca: 74,
  /** MC→ST: finalização ou passe. */
  meiAtaChuteOuPasse: 74,
  /** ME/MD→MC (LAT→MEI): passe. */
  latMeiPasse: 74,
  /** MC→MD/ME (MEI→LAT): velocidade. */
  meiLatVel: 74,
} as const;

/**
 * Matriz base natural→escalada (antes de paridade OVR / modificadores).
 * VOL→ZAG / ZAG→VOL / VOL↔MEI etc. podem virar paridade (0% OVR).
 */
const MATRIZ_BASE: Record<Posicao, Record<Posicao, NivelAfinidade>> = {
  GOL: {
    GOL: 'natural',
    ZAG: 'gol_emergencia',
    LAT: 'gol_emergencia',
    VOL: 'gol_emergencia',
    MEI: 'gol_emergencia',
    ATA: 'gol_emergencia',
  },
  ZAG: {
    GOL: 'gol_emergencia',
    ZAG: 'natural',
    LAT: 'media',
    VOL: 'media',
    MEI: 'critico',
    ATA: 'critico',
  },
  LAT: {
    GOL: 'gol_emergencia',
    ZAG: 'media',
    LAT: 'natural',
    VOL: 'media',
    MEI: 'alta',
    ATA: 'media',
  },
  VOL: {
    GOL: 'gol_emergencia',
    ZAG: 'media',
    LAT: 'media',
    VOL: 'natural',
    MEI: 'alta',
    ATA: 'critico',
  },
  MEI: {
    GOL: 'gol_emergencia',
    ZAG: 'critico',
    LAT: 'alta',
    VOL: 'alta',
    MEI: 'natural',
    ATA: 'alta',
  },
  ATA: {
    GOL: 'gol_emergencia',
    ZAG: 'critico',
    LAT: 'critico',
    VOL: 'critico',
    MEI: 'alta',
    ATA: 'natural',
  },
};

function media(...ns: number[]): number {
  return ns.reduce((s, n) => s + n, 0) / Math.max(1, ns.length);
}

export interface MetricasParidade {
  defesa: number;
  passe: number;
  chute: number;
  velocidade: number;
  drible: number;
  cabeceio: number;
}

export function metricasParidadeDe(jogador: Jogador): MetricasParidade {
  const motor = metricasMotorDeAtributos(jogador.atributos);
  return {
    defesa: motor.defesa,
    passe: motor.passe,
    chute: motor.chute,
    velocidade: motor.velocidade,
    drible: escalaMotor(jogador.atributos.tecnicos.drible),
    cabeceio: escalaMotor(jogador.atributos.tecnicos.cabeceio),
  };
}

/**
 * Paridade OVR (pena 0%): volante↔MC, profundidade PD/PE, portas condicionais
 * LAT/ATA/ZAG/VOL/MEI conforme atributos.
 *
 * Mapeamento tático → Posicao do schema:
 * VOL; MC=MEI; LE/LD/ME/MD≈LAT; CA/AC/ST/AE/AD≈ATA (alas também via LAT).
 */
export function temParidadeOvr(
  natural: Posicao,
  escalada: Posicao,
  m: MetricasParidade,
  opts: { linhaNatural?: LinhaCampinho; linhaEscalada?: LinhaCampinho; col?: number } = {},
): boolean {
  if (natural === escalada) {
    // PD/PE (ou qualquer papel) em profundidade diferente na mesma posição: OVR intacto.
    // Exceto: meia schema MEI em célula AE/AD (ATA) — ver regras 6/7 com col de asa.
    return true;
  }

  const colAsa =
    opts.col === 0 || opts.col === 1 || opts.col === 3 || opts.col === 4;

  // 1) Volantes ↔ MC (MEI): sempre o mesmo OVR.
  if (
    (natural === 'VOL' && escalada === 'MEI') ||
    (natural === 'MEI' && escalada === 'VOL')
  ) {
    return true;
  }

  // 2) Profundidade de ponta / lateral no campinho (PD/PE avançado↔recuado).
  //    Mesmo corredor: LAT em DEF/VOL ↔ ATA em MO/ATA (ou linhas vizinhas).
  if (opts.linhaNatural && opts.linhaEscalada) {
    const linhasAsa = new Set<LinhaCampinho>(['DEF', 'VOL', 'MC', 'MO', 'ATA']);
    if (
      linhasAsa.has(opts.linhaNatural) &&
      linhasAsa.has(opts.linhaEscalada) &&
      ((natural === 'LAT' && escalada === 'ATA') ||
        (natural === 'ATA' && escalada === 'LAT') ||
        (natural === 'LAT' && escalada === 'LAT') ||
        (natural === 'ATA' && escalada === 'ATA'))
    ) {
      return true;
    }
  }

  // 3) Laterais (LE/LD) → AE/AD (ATA) com bom ataque.
  if (
    natural === 'LAT' &&
    escalada === 'ATA' &&
    media(m.chute, m.drible, m.velocidade) >= LIMIARES_PARIDADE.latAtaAtaqueMedia
  ) {
    return true;
  }

  // 4) VOL→ZAG com defesa muito forte; ZAG→VOL com velocidade alta.
  if (natural === 'VOL' && escalada === 'ZAG' && m.defesa >= LIMIARES_PARIDADE.volZagDefesa) {
    return true;
  }
  if (natural === 'ZAG' && escalada === 'VOL' && m.velocidade >= LIMIARES_PARIDADE.zagVolVel) {
    return true;
  }

  // 5) CA (ATA) → ST (ATA natural) ou AE/AD (LAT) com drible + velocidade.
  if (
    natural === 'ATA' &&
    escalada === 'LAT' &&
    media(m.drible, m.velocidade) >= LIMIARES_PARIDADE.ataLatDribleVel
  ) {
    return true;
  }

  // 6) ST / AE / AD → AC (ATA centro): finalização ou cabeceio.
  //    NÃO cobre AE/AD/PE/PD (cols de asa) — meia lento não ganha ala de graça.
  if (
    escalada === 'ATA' &&
    (natural === 'LAT' || natural === 'MEI') &&
    !colAsa &&
    (m.chute >= LIMIARES_PARIDADE.paraAcChuteOuCabeca ||
      m.cabeceio >= LIMIARES_PARIDADE.paraAcChuteOuCabeca)
  ) {
    return true;
  }

  // 7) MC (MEI) → ST/CA (ATA centro) com boa finalização ou passe.
  //    Asas AE/AD/PE/PD exigem velocidade (PositionRecalculator), sem paridade livre.
  if (
    natural === 'MEI' &&
    escalada === 'ATA' &&
    !colAsa &&
    (m.chute >= LIMIARES_PARIDADE.meiAtaChuteOuPasse ||
      m.passe >= LIMIARES_PARIDADE.meiAtaChuteOuPasse)
  ) {
    return true;
  }

  // 8) ME/MD (LAT) → MC (MEI) com bom passe.
  if (
    natural === 'LAT' &&
    escalada === 'MEI' &&
    m.passe >= LIMIARES_PARIDADE.latMeiPasse
  ) {
    return true;
  }

  // 9) MC (MEI) → MD/ME (LAT) com boa velocidade.
  if (
    natural === 'MEI' &&
    escalada === 'LAT' &&
    m.velocidade >= LIMIARES_PARIDADE.meiLatVel
  ) {
    return true;
  }

  return false;
}

export function resolverNivelAfinidade(
  natural: Posicao,
  escalada: Posicao,
  defesaMotor: number,
  paridade = false,
): NivelAfinidade {
  if (natural === escalada || paridade) return 'natural';
  let nivel = MATRIZ_BASE[natural][escalada] ?? 'critico';
  // VOL→ZAG com defesa≥74 sobe para afinidade alta (−5%) se não houver paridade plena.
  if (natural === 'VOL' && escalada === 'ZAG' && defesaMotor >= 74) {
    nivel = 'alta';
  }
  return nivel;
}

export interface OpcoesAfinidade {
  /** Posições declaradas como secundárias (pena máx. 2%). */
  posicoesSecundarias?: Posicao[];
  /** 0–100 progresso ADAPTACAO_POLIVALENCIA. */
  progressoPolivalencia?: number;
  /** Jovem 16–21 sem plano/treino de polivalência. */
  jovemSemTreinoPolivalencia?: boolean;
  /** Linha no campinho (PD/PE profundidade). */
  linhaNatural?: LinhaCampinho;
  linhaEscalada?: LinhaCampinho;
  /** Coluna 0–4 do campinho (lado LE/LD / AE/AD). */
  col?: number;
}

export interface ResultadoAfinidade {
  nivel: NivelAfinidade;
  penaBasePct: number;
  penaFinalPct: number;
  /** 1 − pena/100 */
  multiplicador: number;
  /** crítico / GOL emergência — sem piso competitivo 0,88. */
  excecaoGrave: boolean;
  ehImproviso: boolean;
  /** Paridade OVR (0% pena por regra de Gabriel). */
  paridadeOvr: boolean;
  /** +8–15% desgaste energético fora da natural. */
  multDesgasteEnergia: number;
  /** +22% faltas se defesa&lt;70 improvisando ZAG/LAT/VOL. */
  multFaltas: number;
}

function clampPena(n: number): number {
  return Math.max(0, Math.min(75, n));
}

/**
 * Calcula afinidade via PositionRecalculator (Native / Adapted / Improvised)
 * + portas de paridade OVR legadas + side-effects (energia/faltas).
 */
export function calcularAfinidadePosicional(
  jogador: Jogador,
  posicaoEscalada: Posicao,
  opts: OpcoesAfinidade = {},
): ResultadoAfinidade {
  const natural = jogador.posicao;
  const motor = metricasMotorDeAtributos(jogador.atributos);
  const m = metricasParidadeDe(jogador);
  const defesa = motor.defesa;

  const matriz = PositionRecalculator.multiplicadorNaPosicaoSchema(jogador, posicaoEscalada, {
    col: opts.col,
    linha: opts.linhaEscalada,
  });

  const paridadeLegacy = temParidadeOvr(natural, posicaoEscalada, m, {
    linhaNatural: opts.linhaNatural,
    linhaEscalada: opts.linhaEscalada,
    col: opts.col,
  });

  // Native / paridade legada → 100% OVR.
  // Mesma schema (ex. ATA→ATA) NÃO zera pena fina quando há col/linha de slot
  // (ponta leve em CA, meia lento em AE, etc.).
  const mesmaSchemaSemSlotFino =
    natural === posicaoEscalada && opts.col == null && opts.linhaEscalada == null;
  const paridadeOvr = matriz.nativa || paridadeLegacy || mesmaSchemaSemSlotFino;

  let multiplicador = matriz.mult;
  if (paridadeOvr) {
    multiplicador = 1;
  } else if (matriz.adaptada) {
    // Adapted já vem −3..−6% do recalculator; polivalência pode suavizar 1pp.
    const poliv = opts.progressoPolivalencia ?? 0;
    if (poliv >= 100) multiplicador = Math.min(1, multiplicador + 0.01);
  } else {
    // Improviso: suaviza com polivalência / secundárias / idade (legado).
    let pena = Math.round((1 - multiplicador) * 100);
    const poliv = opts.progressoPolivalencia ?? 0;
    if (poliv >= 100) {
      const leitura20 = jogador.atributos.mentais.leitura_jogo;
      pena -= leitura20 >= 15 ? 5 : 3;
    } else if (poliv >= 60) {
      pena -= 1 + Math.floor((poliv - 60) / 20);
    }
    if (
      jogador.idade >= 16 &&
      jogador.idade <= 21 &&
      (opts.jovemSemTreinoPolivalencia || poliv < 20)
    ) {
      pena += 2;
    }
    if (jogador.idade >= 30 && motor.passe >= 80) pena -= 2;
    const secundarias = opts.posicoesSecundarias ?? jogador.posicoes_secundarias ?? [];
    if (secundarias.includes(posicaoEscalada)) {
      pena = Math.min(pena, 2);
    }
    pena = clampPena(pena);
    multiplicador = 1 - pena / 100;
  }

  multiplicador = Math.max(0.25, Math.min(1, multiplicador));
  const penaFinalPct = Math.round((1 - multiplicador) * 100);

  let nivel: NivelAfinidade;
  if (paridadeOvr || natural === posicaoEscalada) nivel = 'natural';
  else if (matriz.adaptada || penaFinalPct <= 6) nivel = 'alta';
  else if (penaFinalPct <= 15) nivel = 'media';
  else if (natural === 'GOL' || posicaoEscalada === 'GOL') nivel = 'gol_emergencia';
  else nivel = 'critico';

  // Se a matriz legada for mais generosa (paridade), mantém natural.
  if (paridadeLegacy) nivel = 'natural';

  const penaBase = PENA_BASE_NIVEL[resolverNivelAfinidade(natural, posicaoEscalada, defesa, paridadeOvr)];
  const ehImproviso = !paridadeOvr && !matriz.adaptada && nivel !== 'natural';
  const excecaoGrave = !paridadeOvr && (nivel === 'critico' || nivel === 'gol_emergencia');

  let multDesgasteEnergia = 1;
  if (ehImproviso || (matriz.adaptada && !paridadeOvr)) {
    if (nivel === 'alta' || matriz.adaptada) multDesgasteEnergia = 1.08;
    else if (nivel === 'media') multDesgasteEnergia = 1.11;
    else multDesgasteEnergia = 1.15;
  }

  let multFaltas = 1;
  if (ehImproviso && DEFENSIVAS.has(posicaoEscalada) && defesa < 70) {
    multFaltas = 1.22;
  }

  return {
    nivel,
    penaBasePct: penaBase,
    penaFinalPct,
    multiplicador,
    excecaoGrave,
    ehImproviso,
    paridadeOvr,
    multDesgasteEnergia,
    multFaltas,
  };
}

/** Compat: multiplicador simples (1 = natural). */
export function multiplicadorAfinidade(
  jogador: Jogador,
  posicaoEscalada: Posicao,
  opts?: OpcoesAfinidade,
): number {
  return calcularAfinidadePosicional(jogador, posicaoEscalada, opts).multiplicador;
}

/** Estrela (OVR≥78) com 5+ jogos seguidos improvisado → insatisfação. */
export function deveGerarInsatisfacaoImproviso(params: {
  overall: number;
  jogosImprovisoSeguidos: number;
}): boolean {
  return params.overall >= 78 && params.jogosImprovisoSeguidos >= 5;
}

/** Jovens 16–21 aprendem polivalência +35% mais rápido. */
export function multiplicadorAprendizadoPolivalencia(idade: number): number {
  if (idade >= 16 && idade <= 21) return 1.35;
  return 1;
}
