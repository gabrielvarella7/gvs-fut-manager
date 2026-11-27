import type { ConfiguracaoTaticaClube, EstiloJogoId, RitmoJogo } from '../types/tactics';
import type { GravidadeLesao, Jogador, Posicao } from '../types/schema';
import { jogadorPodeJogar } from './aptidaoEscalacao';
import { getGeneticaSegura } from './genetica';
import {
  multiplicadorFadigaPartida,
  overallEfetivoPorEnergiaBase,
} from './performancePartida';

/** Limiar legado / auto-sub (~70%). */
export const ENERGIA_LIMITE_LESAO = 70;
/** Zona crítica de sobrecarga (+140% risco). */
export const ENERGIA_ZONA_CRITICA = 68;
/** Zona de alerta (+35% risco). */
export const ENERGIA_ZONA_ALERTA = 80;
/** Mínimo: 6 de linha + goleiro. */
export const MIN_JOGADORES_EM_CAMPO = 7;
export const MAX_SUBSTITUICOES_PARTIDA = 5;

/** Jovem < 23 · médio 23–33 · veterano ≥ 34 (UI / labels). */
export type FaixaEtariaEnergia = 'jovem' | 'medio' | 'veterano';

export function faixaEtariaEnergia(idade: number): FaixaEtariaEnergia {
  if (idade < 23) return 'jovem';
  if (idade <= 33) return 'medio';
  return 'veterano';
}

function randEntre(rnd: () => number, min: number, max: number): number {
  return min + rnd() * (max - min);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function diasEntreISO(de: string, ate: string): number {
  const a = Date.parse(`${de.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${ate.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 3;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Recuperação etária (curva Gabriel):
 * 18–23: 1,15× · 24–29: 1,0× · 30–33: 0,85× · 34+: 0,68×
 */
export function fatorIdadeRecuperacao(idade: number): number {
  if (idade <= 23) return 1.15;
  if (idade <= 29) return 1.0;
  if (idade <= 33) return 0.85;
  return 0.68;
}

/**
 * Genética na recuperação do dia seguinte:
 * propensão ≤0,75 → +20%; ≥1,50 → −15%.
 */
export function fatorGeneticaRecuperacao(propensaoLesao: number): number {
  if (propensaoLesao <= 0.75) return 1.2;
  if (propensaoLesao >= 1.5) return 0.85;
  return 1.0;
}

/** Preparador 18+ até +25% na recuperação; escala linear a partir do nível 10. */
export function fatorStaffRecuperacao(nivelPreparador: number): number {
  const n = clamp(nivelPreparador, 1, 20);
  if (n <= 10) return 0.92 + (n / 10) * 0.08;
  // 10→1.0 · 18→1.25 · 20→1.28
  return 1 + ((n - 10) / 10) * 0.28;
}

/**
 * Recuperação diária escalada ao descanso (drain de partida ~10–16%):
 * D+1: 3,5–5,5 (ressaca) · D+2–3: 4,5–6,5 · D+4–5: 5–7 · D+6+: 4–6
 * Pico etário cobre um jogo normal em ~4–5 dias; calendário a cada 3 dias deixa residual.
 */
export function baseRecuperacaoPorDiaPosJogo(
  diasDesdePartida: number,
  rnd: () => number,
): number {
  const d = Math.max(0, Math.floor(diasDesdePartida));
  if (d <= 1) return randEntre(rnd, 3.5, 5.5);
  if (d <= 3) return randEntre(rnd, 4.5, 6.5);
  if (d <= 5) return randEntre(rnd, 5, 7);
  return randEntre(rnd, 4, 6);
}

export interface OpcoesRecuperacaoDiaria {
  dataISO?: string;
  nivelPreparador?: number;
  /** Bônus de treino regenerativo/crioterapia (+12–18). */
  bonusTreino?: number;
  /**
   * Treino com bola no D+1 quase anula a recuperação,
   * salvo Regeneração Ativa (bonusTreino alto).
   */
  treinoComBolaDia1?: boolean;
}

/**
 * Rec = Base_dia × Fator_Idade × Fator_Genética × Fator_Staff + Bônus_Treino
 */
export function recuperacaoDiariaCompleta(
  j: Jogador,
  rnd: () => number,
  opts: OpcoesRecuperacaoDiaria = {},
): number {
  const genetica = getGeneticaSegura(j);
  const dias =
    opts.dataISO && j.ultimaPartidaISO
      ? diasEntreISO(j.ultimaPartidaISO, opts.dataISO)
      : 3;
  let base = baseRecuperacaoPorDiaPosJogo(dias, rnd);
  const idadeF = fatorIdadeRecuperacao(j.idade);
  const genF = fatorGeneticaRecuperacao(genetica.propensao_lesao);
  const staffF = fatorStaffRecuperacao(opts.nivelPreparador ?? 10);
  let bonus = opts.bonusTreino ?? 0;

  // D+1 + treino com bola (não regenerativo) quase cancela.
  if (dias <= 1 && opts.treinoComBolaDia1 && bonus < 10) {
    base *= 0.15;
    bonus *= 0.25;
  }

  const ganho = base * idadeF * genF * staffF + bonus;
  return Math.round(Math.max(0, ganho) * 10) / 10;
}

/** @deprecated Preferir recuperacaoDiariaCompleta — mantido para UI simples. */
export function recuperacaoDiariaEnergia(idade: number, rnd: () => number): number {
  return Math.round(baseRecuperacaoPorDiaPosJogo(3, rnd) * fatorIdadeRecuperacao(idade) * 10) / 10;
}

export function recuperarEnergiaUmDia(
  jogadores: Jogador[],
  rnd: () => number,
  opts: OpcoesRecuperacaoDiaria = {},
): Jogador[] {
  return jogadores.map((j) => {
    const ganhoBruto = recuperacaoDiariaCompleta(j, rnd, opts);
    const ganho = j.lesao && j.lesao.diasRestantes > 0 ? ganhoBruto * 0.45 : ganhoBruto;
    return {
      ...j,
      energia: Math.min(100, Math.round((j.energia + ganho) * 10) / 10),
    };
  });
}

/** Capacidade de jogos de alto nível / temporada (~11 meses). */
export const PARTIDAS_BASELINE_PICO = 50; // idades 23–32
export const PARTIDAS_BASELINE_FORA = 40; // fora do pico etário

export function partidasBaselineTemporada(idade: number): number {
  return idade >= 23 && idade <= 32 ? PARTIDAS_BASELINE_PICO : PARTIDAS_BASELINE_FORA;
}

/**
 * Teto duro de perda em 90' — um jogo nunca esvazia o elenco.
 * GOL ~8 · pico 23–32 ~16 · jovem ~14 · fora do pico (33+) ~20
 */
export function tetoDrainPartidaPct(idade: number, posicao: Posicao): number {
  if (posicao === 'GOL') return 8;
  if (idade >= 23 && idade <= 32) return 16;
  if (idade < 23) return 14;
  return 20;
}

/**
 * Calendário denso (ex.: a cada 3 dias) eleva fadiga; ≥6 dias = ritmo normal de temporada.
 */
export function multiplicadorDensidadeCalendario(diasDescanso: number): number {
  const d = Math.max(0, Math.floor(diasDescanso));
  if (d <= 0) return 1.55;
  if (d === 1) return 1.42;
  if (d === 2) return 1.28;
  if (d === 3) return 1.16;
  if (d <= 5) return 1.06;
  return 1.0;
}

/**
 * Acima da capacidade etária (50 ou 40) → mais gasto + risco de queda de rendimento.
 */
export function multiplicadorCargaTemporada(jogosTemporada: number, idade: number): number {
  const base = partidasBaselineTemporada(idade);
  const ratio = Math.max(0, jogosTemporada) / base;
  if (ratio < 0.5) return 0.96;
  if (ratio < 0.85) return 1.0;
  if (ratio < 1.0) return 1.05;
  if (ratio < 1.15) return 1.14;
  return 1.26;
}

/** Dias desde a última partida (3 = default se sem histórico). */
export function diasDescansoAntesPartida(
  ultimaPartidaISO: string | undefined,
  dataPartidaISO: string | undefined,
): number {
  if (!ultimaPartidaISO || !dataPartidaISO) return 7;
  return diasEntreISO(ultimaPartidaISO, dataPartidaISO);
}

/** Multiplicador de gasto posicional (ATA = 1,0 → alvo ~11–13% em 90'). */
export function multiplicadorDrainPosicao(posicao: Posicao): number {
  if (posicao === 'GOL') return 0.45;
  if (posicao === 'ZAG') return 0.88;
  if (posicao === 'ATA') return 1.0;
  return 1.1; // LAT / VOL / MEI
}

export function multiplicadorDrainTatico(params: {
  estiloId?: EstiloJogoId | string;
  alturaLinha?: string;
  ritmo?: RitmoJogo | string;
  intensidade?: string;
}): number {
  const estilo = params.estiloId ?? '';
  const linha = params.alturaLinha ?? 'MEDIA';
  const ritmo = params.ritmo ?? 'NORMAL';
  const marcacao = params.intensidade ?? 'EQUILIBRADA';

  const gegen =
    estilo === 'GEGENPRESSING' ||
    (marcacao === 'SUFOCANTE' && (linha === 'ALTA' || linha === 'MUITO_ALTA'));
  const parkBus =
    estilo === 'RETRANCADO_CATIMBA' ||
    (linha === 'BAIXA' && ritmo === 'LENTO_CADENCIADO');

  if (gegen && (ritmo === 'ACELERADO' || linha === 'MUITO_ALTA' || linha === 'ALTA')) {
    return 1.18;
  }
  if (gegen) return 1.12;
  if (parkBus) return 0.9;
  if (ritmo === 'ACELERADO') return 1.08;
  if (ritmo === 'LENTO_CADENCIADO') return 0.95;
  return 1.0;
}

export function multiplicadorDrainEmocional(params: {
  isClassico?: boolean;
  tudoOuNada?: boolean;
}): number {
  if (params.isClassico || params.tudoOuNada) return 1.12;
  return 1.0;
}

/**
 * Genética no gasto em jogo (suave — o teto da partida impede esvaziar o XI):
 * ≤0,75 → menos drop no fim; ≥1,50 → queda após 65'.
 */
export function multiplicadorDrainGeneticaNoMinuto(
  propensaoLesao: number,
  minuto: number,
): number {
  if (propensaoLesao <= 0.75) {
    return minuto >= 70 ? 0.88 : 0.94;
  }
  if (propensaoLesao >= 1.5) {
    return minuto >= 65 ? 1.22 : 1.06;
  }
  return 1.0;
}

/** Idade fora do pico / ritmo acelerado: gasto levemente maior. */
export function multiplicadorDrainIdadeGasto(idade: number, ritmoAcelerado: boolean): number {
  if (idade >= 30 && idade <= 32 && ritmoAcelerado) return 1.06;
  if (idade >= 33) return 1.1;
  if (idade < 23) return 0.96;
  return 1.0;
}

/**
 * Fadiga por minuto — capacidade etária + densidade + carga + teto duro.
 * ATA pleno, descanso normal, sob capacidade ≈ 11–13% em 90'.
 */
export function fadigaPorMinutoCompleta(params: {
  idade: number;
  posicao: Posicao;
  propensaoLesao: number;
  rnd: () => number;
  multEquipe?: number;
  desgasteTatico?: number;
  estiloId?: string;
  alturaLinha?: string;
  ritmo?: string;
  intensidade?: string;
  isClassico?: boolean;
  tudoOuNada?: boolean;
  nivelPreparador?: number;
  /** Dias desde a última partida (≥6 = ritmo normal). */
  diasDescanso?: number;
  /** Jogos já disputados nesta temporada (antes deste). */
  jogosTemporada?: number;
}): number {
  // Base ATA: ~12% em 90' → ~0,133/min
  const baseAta = randEntre(params.rnd, 0.118, 0.148);
  let mult = multiplicadorDrainPosicao(params.posicao);
  mult *= multiplicadorDrainTatico({
    estiloId: params.estiloId,
    alturaLinha: params.alturaLinha,
    ritmo: params.ritmo,
    intensidade: params.intensidade,
  });
  mult *= multiplicadorDrainEmocional({
    isClassico: params.isClassico,
    tudoOuNada: params.tudoOuNada,
  });
  mult *= multiplicadorDrainIdadeGasto(
    params.idade,
    params.ritmo === 'ACELERADO',
  );
  mult *= multiplicadorDensidadeCalendario(params.diasDescanso ?? 7);
  mult *= multiplicadorCargaTemporada(params.jogosTemporada ?? 0, params.idade);

  const prep = clamp(params.nivelPreparador ?? 10, 1, 20);
  const multPrep = prep >= 18 ? 0.82 : prep >= 14 ? 0.9 : prep >= 10 ? 0.97 : 1.04;
  mult *= multPrep;

  // Evita empilhar multEquipe × desgaste tático até esvaziar o XI.
  const externo = clamp((params.multEquipe ?? 1) * (params.desgasteTatico ?? 1), 0.85, 1.18);
  mult *= externo;

  if (params.propensaoLesao <= 0.75) mult *= 0.92;
  else if (params.propensaoLesao >= 1.5) mult *= 1.08;

  const raw = baseAta * mult;
  const tetoMin = tetoDrainPartidaPct(params.idade, params.posicao) / 90;
  return Math.min(raw, tetoMin);
}

/**
 * Compat: fadiga só por idade (≈ perfil MEI médio).
 * Preferir fadigaPorMinutoCompleta no motor.
 */
export function fadigaPorMinutoPorIdade(idade: number, rnd: () => number): number {
  return fadigaPorMinutoCompleta({
    idade,
    posicao: 'MEI',
    propensaoLesao: 1.0,
    rnd,
  });
}

/** Pequeno jitter no apito inicial (~±2 pp), sem sair de 1–100. */
export function energiaInicialPartida(energiaAtual: number, rnd: () => number): number {
  const base = Number.isFinite(energiaAtual) ? energiaAtual : 100;
  const jitter = randEntre(rnd, -2.2, 2.2);
  return Math.round(Math.min(100, Math.max(1, base + jitter)) * 10) / 10;
}

/**
 * Rendimento ↔ energia (curto prazo, clampado — performance-career-curve-spec).
 * 80–100: sem pena · 65–79: −2%…−5% · <65: máx −9% (piso competitivo).
 * Não altera overall_base / atributos permanentes.
 */
export function multiplicadorRendimentoPorEnergia(energia: number): number {
  return multiplicadorFadigaPartida(energia);
}

export function overallEfetivoPorEnergia(overall: number, energia: number): number {
  return overallEfetivoPorEnergiaBase(overall, energia);
}

export function corClasseEnergia(energia: number): string {
  if (energia >= 75) return 'text-emerald-400';
  if (energia >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

export function rotuloEnergiaCurto(energia: number): string {
  return `${Math.round(energia)}%`;
}

/**
 * Zonas de risco por energia (GDD + Gabriel):
 * 85–100: 0,75–0,85× · 70–84: 1,35× · &lt;68: 2,40×
 */
export function multRiscoLesaoPorEnergia(energia: number): number {
  if (energia >= 85) return 0.8;
  if (energia >= ENERGIA_LIMITE_LESAO) return 1.35;
  if (energia >= ENERGIA_ZONA_CRITICA) return 1.85;
  return 2.4;
}

/**
 * Chance por minuto de lesão muscular por fadiga.
 * Pode empilhar com genética/treino até ~7× na zona crítica.
 */
export function chanceLesaoPorFadiga(
  energia: number,
  resistenciaLesao: number,
  rnd: () => number,
  opts?: { propensaoLesao?: number; multTreino?: number },
): boolean {
  const zona = multRiscoLesaoPorEnergia(energia);
  // Acima de 85% risco residual baixo (traumático fica noutro fluxo).
  if (energia >= 85 && zona <= 0.85) {
    // ainda permite micro-chance
  }
  const res = Math.max(1, Math.min(20, resistenciaLesao));
  const fatorRes = 1.25 - res / 20;
  const prop = opts?.propensaoLesao ?? 1;
  const treino = opts?.multTreino ?? 1;
  const deficit =
    energia >= ENERGIA_LIMITE_LESAO
      ? Math.max(0, (85 - energia) / 85)
      : (ENERGIA_LIMITE_LESAO - energia) / ENERGIA_LIMITE_LESAO;
  let p = (0.0009 + deficit * deficit * 0.022) * fatorRes * zona * prop * treino;
  p = Math.min(0.08, p); // teto por minuto (~ empilha a ~7× na semana via treino)
  return rnd() < p;
}

export function sortearGravidadeLesaoFadiga(energia: number, rnd: () => number): GravidadeLesao {
  if (energia < 40 && rnd() < 0.22) return 'GRAVE';
  if (energia < 55 && rnd() < 0.45) return 'MODERADA';
  return 'LEVE';
}

export function diasBaseLesaoFadiga(gravidade: GravidadeLesao, rnd: () => number): number {
  if (gravidade === 'GRAVE') return Math.round(randEntre(rnd, 18, 35));
  if (gravidade === 'MODERADA') return Math.round(randEntre(rnd, 8, 18));
  return Math.round(randEntre(rnd, 3, 9));
}

export function descricaoLesaoFadiga(gravidade: GravidadeLesao, rnd: () => number): string {
  const leves = [
    'contusão muscular',
    'estresse na panturrilha',
    'cãibra forte',
    'sobrecarga no ísquiotibial',
  ];
  const moderadas = [
    'lesão muscular na coxa',
    'estiramento no adutor',
    'edema no tornozelo',
    'distensão na virilha',
  ];
  const graves = [
    'ruptura muscular parcial',
    'lesão séria no joelho',
    'trauma muscular grave',
  ];
  const lista =
    gravidade === 'GRAVE' ? graves : gravidade === 'MODERADA' ? moderadas : leves;
  return lista[Math.floor(rnd() * lista.length)] ?? lista[0]!;
}

/** Reserva apta para entrar no lugar de um titular. */
export function escolherReservaParaSub(
  elenco: Jogador[],
  idsEmCampo: ReadonlySet<number>,
  idsJaUsados: ReadonlySet<number>,
  posicaoAlvo: Jogador['posicao'],
  rnd: () => number,
): Jogador | null {
  const candidatos = elenco.filter(
    (j) =>
      !idsEmCampo.has(j.id) &&
      !idsJaUsados.has(j.id) &&
      jogadorPodeJogar(j) &&
      j.energia >= 35,
  );
  if (candidatos.length === 0) return null;

  const mesmaPos = candidatos.filter((j) => j.posicao === posicaoAlvo);
  const pool = mesmaPos.length > 0 ? mesmaPos : candidatos;
  const ordenado = [...pool].sort((a, b) => {
    const score = (j: Jogador) =>
      j.overall * 0.7 + j.energia * 0.25 + (j.posicao === posicaoAlvo ? 8 : 0);
    return score(b) - score(a);
  });
  const top = ordenado.slice(0, Math.min(3, ordenado.length));
  return top[Math.floor(rnd() * top.length)] ?? top[0] ?? null;
}

export function contarEmCampo(
  escalacao: { jogador: Jogador; posicaoEscalada: Jogador['posicao'] }[],
  fora: ReadonlySet<number>,
): { total: number; goleiro: boolean; linha: number } {
  let total = 0;
  let goleiro = false;
  let linha = 0;
  for (const e of escalacao) {
    if (fora.has(e.jogador.id)) continue;
    total += 1;
    if (e.posicaoEscalada === 'GOL' || e.jogador.posicao === 'GOL') goleiro = true;
    else linha += 1;
  }
  return { total, goleiro, linha };
}

/** WO se não houver pelo menos 6 de linha + goleiro (7 no total com GK). */
export function timeEmWO(
  escalacao: { jogador: Jogador; posicaoEscalada: Jogador['posicao'] }[],
  fora: ReadonlySet<number>,
): boolean {
  const c = contarEmCampo(escalacao, fora);
  if (c.total < MIN_JOGADORES_EM_CAMPO) return true;
  if (!c.goleiro) return true;
  if (c.linha < 6) return true;
  return false;
}

export function energiaJitterNovaCarreira(rnd: () => number): number {
  return Math.round(randEntre(rnd, 96, 100) * 10) / 10;
}

export function preverEnergiaFimJogo(idade: number, energiaInicio: number, rnd: () => number): number {
  const drain = fadigaPorMinutoPorIdade(idade, rnd) * 90;
  const teto = tetoDrainPartidaPct(idade, 'MEI');
  const perda = Math.min(drain, teto);
  return Math.max(0, Math.round((energiaInicio - perda) * 10) / 10);
}

export function faixaRecuperacaoLabel(idade: number): string {
  const f = fatorIdadeRecuperacao(idade);
  const cap = partidasBaselineTemporada(idade);
  if (f >= 1.1) return `Recuperação rápida (18–23 · ~1,15× · até ~${cap} jogos/temp.)`;
  if (idade >= 23 && idade <= 32) return `Pico físico (23–32 · ~${cap} jogos/temp. · recuperação padrão)`;
  if (f >= 0.8) return `Recuperação reduzida (30–33 · ~0,85× · até ~${cap} jogos)`;
  return `Recuperação lenta (34+ · ~0,68× · até ~${cap} jogos · risco se sobrecarregar)`;
}

/** Extrai vetores táticos do config do clube para o drain. */
export function vetoresTaticosDeConfig(tatica?: ConfiguracaoTaticaClube | null): {
  estiloId?: string;
  alturaLinha?: string;
  ritmo?: string;
  intensidade?: string;
} {
  if (!tatica) return {};
  return {
    estiloId: tatica.estilo_jogo_id,
    alturaLinha: tatica.instrucoes?.altura_linha,
    ritmo: tatica.instrucoes?.ritmo_jogo,
    intensidade: tatica.instrucoes?.intensidade_marcacao,
  };
}

/** Bônus regenerativo/crioterapia (+12–18). */
export function bonusRecuperacaoSessao(sessaoId: string | undefined, regimeId: string | undefined): number {
  if (sessaoId === 'REGENERACAO_ATIVA') return 15;
  if (regimeId === 'REGENERATIVO') return 14;
  if (sessaoId === 'PREVENCAO_LESOES') return 8;
  return 0;
}
