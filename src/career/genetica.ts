import type { GeneticaAtleta, Jogador, TierPropensaoLesao } from '../types/schema';

/** Potencial Ability (teto oculto de OVR). */
export const POTENCIAL_MIN = 40;
export const POTENCIAL_MAX = 99;

/** Eficiência de XP de treino. */
export const ABSORCAO_MIN = 0.65;
export const ABSORCAO_MAX = 1.45;

/** Fragilidade muscular inata. */
export const PROPENSAO_MIN = 0.5;
export const PROPENSAO_MAX = 2.2;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hashSeed(...parts: (number | string)[]): number {
  let s = 2166136261;
  for (const p of parts) {
    const str = String(p);
    for (let i = 0; i < str.length; i++) {
      s ^= str.charCodeAt(i);
      s = Math.imul(s, 16777619);
    }
  }
  return s >>> 0;
}

/** RNG determinístico a partir de seed (para saves migrados). */
export function rngDeSeed(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function perfilScoutPadrao(g: GeneticaAtleta, idade: number, overall: number): string {
  const gap = g.potencial_maximo - overall;
  if (g.propensao_lesao >= 1.55) {
    return 'Alerta médico: fibras musculares propensas a estiramentos recorrentes.';
  }
  if (gap >= 11 && g.fator_absorcao >= 1.2) {
    return 'Potencial de elite: absorve treinos com velocidade impressionante.';
  }
  if (idade <= 22 && gap <= 3) {
    return 'Próximo do limite técnico; evolução futura tende a ser discreta.';
  }
  if (g.propensao_lesao <= 0.72) {
    return 'Constituição privilegiada: suporta alta carga sem desgastar.';
  }
  return 'Resposta física e evolução dentro da média da liga.';
}

/**
 * Gera genética na criação do jogador (blueprint Gemini + faixas do GDD).
 */
export function gerarGeneticaAtleta(params: {
  id: number;
  idade: number;
  overall: number;
  nome?: string;
  /** Teto já conhecido (ex.: base profissionalizar) — ancora o PA. */
  tetoHint?: number;
  rnd?: () => number;
}): GeneticaAtleta {
  const rnd = params.rnd ?? rngDeSeed(hashSeed(params.id, 'genetica', params.idade));
  const ovr = Math.max(40, Math.min(96, params.overall));

  let margem: number;
  if (params.idade <= 20) margem = 3 + rnd() * 15;
  else if (params.idade <= 23) margem = 2 + rnd() * 10;
  else if (params.idade <= 27) margem = rnd() * 5;
  else margem = rnd() * 2;

  const hint = params.tetoHint;
  let potencial =
    hint != null
      ? Math.round(hint + (rnd() - 0.5) * 3)
      : Math.round(ovr + margem);
  potencial = clamp(potencial, Math.max(POTENCIAL_MIN, ovr), Math.min(POTENCIAL_MAX, 96));

  const fator_absorcao =
    Math.round(clamp(0.65 + rnd() * 0.8, ABSORCAO_MIN, ABSORCAO_MAX) * 100) / 100;

  const roll = rnd();
  let propensao: number;
  if (roll < 0.12) propensao = 0.5 + roll * 1.8;
  else if (roll > 0.88) propensao = 1.45 + (roll - 0.88) * 5.5;
  else propensao = 0.75 + roll * 0.55;
  if (params.idade >= 33) propensao = Math.min(PROPENSAO_MAX, propensao * 1.08);
  const propensao_lesao =
    Math.round(clamp(propensao, PROPENSAO_MIN, PROPENSAO_MAX) * 100) / 100;

  const genetica: GeneticaAtleta = {
    potencial_maximo: potencial,
    fator_absorcao,
    propensao_lesao,
  };
  genetica.perfil_scout = perfilScoutPadrao(genetica, params.idade, ovr);
  return genetica;
}

function normalizarGenetica(g: GeneticaAtleta, idade: number, overall: number): GeneticaAtleta {
  const potencial_maximo = clamp(
    Math.round(g.potencial_maximo),
    Math.max(POTENCIAL_MIN, overall),
    POTENCIAL_MAX,
  );
  const fator_absorcao =
    Math.round(clamp(g.fator_absorcao, ABSORCAO_MIN, ABSORCAO_MAX) * 100) / 100;
  const propensao_lesao =
    Math.round(clamp(g.propensao_lesao, PROPENSAO_MIN, PROPENSAO_MAX) * 100) / 100;
  const out: GeneticaAtleta = { potencial_maximo, fator_absorcao, propensao_lesao };
  out.perfil_scout = g.perfil_scout ?? perfilScoutPadrao(out, idade, overall);
  return out;
}

/** Garante `jogador.genetica` (migra saves antigos / flat fields legados). */
export function garantirGeneticaJogador(j: Jogador): Jogador {
  const legado = j as Jogador & {
    potencial_maximo?: number;
    fator_absorcao?: number;
    propensao_lesao?: number;
  };

  if (j.genetica) {
    return { ...j, genetica: normalizarGenetica(j.genetica, j.idade, j.overall) };
  }

  if (
    legado.potencial_maximo != null &&
    legado.fator_absorcao != null &&
    legado.propensao_lesao != null
  ) {
    const genetica = normalizarGenetica(
      {
        potencial_maximo: legado.potencial_maximo,
        fator_absorcao: legado.fator_absorcao,
        propensao_lesao: legado.propensao_lesao,
      },
      j.idade,
      j.overall,
    );
    const { potencial_maximo: _p, fator_absorcao: _a, propensao_lesao: _r, ...rest } =
      legado;
    return { ...rest, genetica };
  }

  return {
    ...j,
    genetica: gerarGeneticaAtleta({
      id: j.id,
      idade: j.idade,
      overall: j.overall,
      nome: j.nome,
      tetoHint: j.formacaoBase?.potencialOvr,
    }),
  };
}

export function getGeneticaSegura(jogador: Jogador): GeneticaAtleta {
  return garantirGeneticaJogador(jogador).genetica!;
}

export function tierPropensao(propensao: number): TierPropensaoLesao {
  if (propensao <= 0.78) return 'INQUEBRAVEL';
  if (propensao >= 1.55) return 'DE_VIDRO';
  return 'NORMAL';
}

export function rotuloTierPropensao(tier: TierPropensaoLesao): string {
  if (tier === 'INQUEBRAVEL') return 'Inquebrável';
  if (tier === 'DE_VIDRO') return 'De vidro';
  return 'Normal';
}

/**
 * Perto do teto o XP desacelera até estagnação.
 * gap ≥ 8 → 1,0 · gap 4 → ~0,55 · gap 1 → ~0,18 · gap 0 → 0.
 */
export function multiplicadorXpPorTeto(overall: number, potencialMaximo: number): number {
  const gap = potencialMaximo - overall;
  if (gap <= 0) return 0;
  if (gap >= 8) return 1;
  if (gap >= 4) return 0.55 + ((gap - 4) / 4) * 0.45;
  if (gap >= 2) return 0.28 + ((gap - 2) / 2) * 0.27;
  return 0.08 + gap * 0.1;
}

/**
 * Variância mensal da absorção (±12% típico, clampado na faixa).
 */
export function absorcaoMensalEfetiva(
  fatorBase: number,
  idade: number,
  rnd: () => number,
): number {
  const amplitude = idade <= 20 ? 0.08 : idade >= 28 ? 0.16 : 0.12;
  const ruido = (rnd() - 0.5) * 2 * amplitude;
  return Math.round(clamp(fatorBase + ruido, ABSORCAO_MIN, ABSORCAO_MAX) * 100) / 100;
}

/**
 * Erro do olheiro ao estimar o teto.
 * Pot 18 → ±2 · Pot 8 → erro largo (~±12) · Pot 20 → ±1.
 */
export function erroEstimativaOlheiro(nivelPotencial: number): number {
  const n = clamp(nivelPotencial, 1, 20);
  return Math.max(1, Math.round(20 - n));
}

export function estimarPotencialOlheiro(
  potencialReal: number,
  nivelPotencial: number,
  rnd: () => number,
): number {
  const erroMax = erroEstimativaOlheiro(nivelPotencial);
  const delta = Math.round((rnd() * 2 - 1) * erroMax);
  return clamp(potencialReal + delta, POTENCIAL_MIN, POTENCIAL_MAX);
}

/** Multiplicador de valor de mercado por genética (dilema preço/risco). */
export function multiplicadorValorPorGenetica(j: Jogador): number {
  const g = getGeneticaSegura(j);
  const gap = Math.max(0, g.potencial_maximo - j.overall);
  let mult = 1;

  if (j.idade <= 22 && gap >= 6) {
    mult *= 1 + Math.min(0.45, gap * 0.035);
  } else if (j.idade <= 24 && gap >= 4) {
    mult *= 1 + Math.min(0.22, gap * 0.025);
  }

  const tier = tierPropensao(g.propensao_lesao);
  if (tier === 'DE_VIDRO') {
    const pesoOvr = Math.max(0, (j.overall - 70) / 25);
    mult *= 1 - (0.12 + pesoOvr * 0.18);
  } else if (tier === 'INQUEBRAVEL' && j.overall >= 72) {
    mult *= 1.06;
  }

  return Math.round(mult * 1000) / 1000;
}

export function descricaoRiscoMercado(j: Jogador): string | null {
  const g = getGeneticaSegura(j);
  const tier = tierPropensao(g.propensao_lesao);
  const gap = g.potencial_maximo - j.overall;

  if (tier === 'DE_VIDRO' && j.overall >= 74) {
    return 'Alto OVR com propensão a lesões — desconto de risco no mercado.';
  }
  if (j.idade <= 22 && gap >= 8) {
    return 'Teto alto oculto: valorização por projeção (investimento de longo prazo).';
  }
  if (tier === 'DE_VIDRO') {
    return 'Perfil frágil — fisiologista recomenda gestão de carga.';
  }
  return null;
}

/** Fisiologista destaca atletas de vidro no elenco (notícia). */
export function gerarAlertaFisiologistaElenco(params: {
  jogadores: Jogador[];
  clubeId: string;
  nivelFisiologista: number;
  dataISO: string;
  seed: number;
}): { id: string; data: string; titulo: string; texto: string } | null {
  if (params.nivelFisiologista < 8) return null;
  const rnd = rngDeSeed(params.seed ^ 0xf1510);
  if (rnd() > 0.22 + params.nivelFisiologista / 80) return null;

  const frageis = params.jogadores
    .filter((j) => j.time_id === params.clubeId)
    .map((j) => ({ j, g: getGeneticaSegura(j) }))
    .filter((x) => x.g.propensao_lesao >= 1.45)
    .sort((a, b) => b.g.propensao_lesao - a.g.propensao_lesao);

  if (frageis.length === 0) return null;
  const pick = frageis[0]!;
  const tier = rotuloTierPropensao(tierPropensao(pick.g.propensao_lesao));
  return {
    id: `fisio_alerta_${params.clubeId}_${pick.j.id}_${params.dataISO}`,
    data: `${params.dataISO}T09:00:00.000Z`,
    titulo: `Fisiologista · alerta de carga (${pick.j.nome})`,
    texto: `${pick.j.nome} apresenta perfil ${tier.toLowerCase()} (propensão ${pick.g.propensao_lesao.toFixed(2)}×). Recomenda-se redução de carga / prevenção muscular (sessão Prevenção Muscular ou regime Regenerativo) nas próximas semanas.`,
  };
}
