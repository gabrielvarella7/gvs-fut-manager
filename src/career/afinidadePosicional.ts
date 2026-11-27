import { metricasMotorDeAtributos } from './atributosJogador';
import type { Jogador, Posicao } from '../types/schema';

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

/**
 * Matriz base natural→escalada (antes de modificadores de atributo/treino/idade).
 * VOL→ZAG só é “alta” com defesa≥74 (resolvido em resolverNivelAfinidade).
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
    ZAG: 'media', // vira alta se defesa≥74
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

export function resolverNivelAfinidade(
  natural: Posicao,
  escalada: Posicao,
  defesaMotor: number,
): NivelAfinidade {
  if (natural === escalada) return 'natural';
  let nivel = MATRIZ_BASE[natural][escalada] ?? 'critico';
  // VOL→ZAG com defesa≥74 sobe para afinidade alta (−5%).
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
  /** +8–15% desgaste energético fora da natural. */
  multDesgasteEnergia: number;
  /** +22% faltas se defesa&lt;70 improvisando ZAG/LAT/VOL. */
  multFaltas: number;
}

function clampPena(n: number): number {
  return Math.max(0, Math.min(75, n));
}

/**
 * Calcula pena posicional com modificadores de atributo / secundárias / treino / idade.
 */
export function calcularAfinidadePosicional(
  jogador: Jogador,
  posicaoEscalada: Posicao,
  opts: OpcoesAfinidade = {},
): ResultadoAfinidade {
  const natural = jogador.posicao;
  const motor = metricasMotorDeAtributos(jogador.atributos);
  const defesa = motor.defesa;
  const passe = motor.passe;
  const vel = motor.velocidade;

  const nivel = resolverNivelAfinidade(natural, posicaoEscalada, defesa);
  const penaBase = PENA_BASE_NIVEL[nivel];
  let pena = penaBase;

  const ehImproviso = nivel !== 'natural';
  const improvisandoAtras = ehImproviso && DEFENSIVAS.has(posicaoEscalada);
  const improvisandoAFrente = ehImproviso && OFENSIVAS.has(posicaoEscalada);

  // defesa≥72 improvisando atrás → −3pp
  if (improvisandoAtras && defesa >= 72) pena -= 3;
  // defesa&lt;55 → +6pp
  if (ehImproviso && defesa < 55) pena += 6;
  // passe+vel ≥78 pra frente → −3pp (média das duas métricas)
  if (improvisandoAFrente && (passe + vel) / 2 >= 78) pena -= 3;
  // Veterano 30+ com passe≥80 → −2pp
  if (ehImproviso && jogador.idade >= 30 && passe >= 80) pena -= 2;

  // ADAPTACAO_POLIVALENCIA 100% → −3–5pp (usa 4; 5 se progresso mental alto)
  const poliv = opts.progressoPolivalencia ?? 0;
  if (ehImproviso && poliv >= 100) {
    const leitura20 = jogador.atributos.mentais.leitura_jogo;
    pena -= leitura20 >= 15 ? 5 : 3;
  } else if (ehImproviso && poliv >= 60) {
    pena -= 1 + Math.floor((poliv - 60) / 20);
  }

  // Jovens 16–21 sem treino de polivalência: −2% extra
  if (
    ehImproviso &&
    jogador.idade >= 16 &&
    jogador.idade <= 21 &&
    (opts.jovemSemTreinoPolivalencia || poliv < 20)
  ) {
    pena += 2;
  }

  // posicoes_secundarias: pena máxima 2%
  const secundarias = opts.posicoesSecundarias ?? jogador.posicoes_secundarias ?? [];
  if (ehImproviso && secundarias.includes(posicaoEscalada)) {
    pena = Math.min(pena, 2);
  }

  pena = clampPena(pena);
  const multiplicador = 1 - pena / 100;
  const excecaoGrave = nivel === 'critico' || nivel === 'gol_emergencia';

  let multDesgasteEnergia = 1;
  if (ehImproviso) {
    // +8–15% conforme gravidade
    if (nivel === 'alta') multDesgasteEnergia = 1.08;
    else if (nivel === 'media') multDesgasteEnergia = 1.11;
    else if (nivel === 'critico') multDesgasteEnergia = 1.15;
    else multDesgasteEnergia = 1.15; // GOL emergência
  }

  let multFaltas = 1;
  if (
    ehImproviso &&
    DEFENSIVAS.has(posicaoEscalada) &&
    defesa < 70
  ) {
    multFaltas = 1.22;
  }

  return {
    nivel,
    penaBasePct: penaBase,
    penaFinalPct: pena,
    multiplicador,
    excecaoGrave,
    ehImproviso,
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
