import type { GravidadeLesao, Jogador } from '../types/schema';

/** Jovem < 23 · médio 23–33 · veterano ≥ 34 */
export type FaixaEtariaEnergia = 'jovem' | 'medio' | 'veterano';

export const ENERGIA_LIMITE_LESAO = 70;
/** Mínimo: 6 de linha + goleiro. */
export const MIN_JOGADORES_EM_CAMPO = 7;
export const MAX_SUBSTITUICOES_PARTIDA = 5;

export function faixaEtariaEnergia(idade: number): FaixaEtariaEnergia {
  if (idade < 23) return 'jovem';
  if (idade <= 33) return 'medio';
  return 'veterano';
}

function randEntre(rnd: () => number, min: number, max: number): number {
  return min + rnd() * (max - min);
}

/**
 * Recuperação diária (%), com margem por faixa etária:
 * jovem ~10 (8–12) · médio ~7 (5–9) · veterano ~4 (2–6).
 */
export function recuperacaoDiariaEnergia(idade: number, rnd: () => number): number {
  const faixa = faixaEtariaEnergia(idade);
  if (faixa === 'jovem') return Math.round(randEntre(rnd, 8, 12) * 10) / 10;
  if (faixa === 'medio') return Math.round(randEntre(rnd, 5, 9) * 10) / 10;
  return Math.round(randEntre(rnd, 2, 6) * 10) / 10;
}

export function recuperarEnergiaUmDia(jogadores: Jogador[], rnd: () => number): Jogador[] {
  return jogadores.map((j) => {
    if (j.lesao && j.lesao.diasRestantes > 0) {
      // Lesionado recupera menos (fisioterapia leve).
      const ganho = recuperacaoDiariaEnergia(j.idade, rnd) * 0.45;
      return {
        ...j,
        energia: Math.min(100, Math.round((j.energia + ganho) * 10) / 10),
      };
    }
    const ganho = recuperacaoDiariaEnergia(j.idade, rnd);
    return {
      ...j,
      energia: Math.min(100, Math.round((j.energia + ganho) * 10) / 10),
    };
  });
}

/**
 * Fadiga por minuto calibrada para ~90':
 * jovem → ~80% restante · médio → ~70% · veterano → ~60%, com ruído.
 */
export function fadigaPorMinutoPorIdade(idade: number, rnd: () => number): number {
  const faixa = faixaEtariaEnergia(idade);
  // Alvo de energia restante após 90' a partir de 100.
  let alvoMin: number;
  let alvoMax: number;
  if (faixa === 'jovem') {
    alvoMin = 76;
    alvoMax = 84;
  } else if (faixa === 'medio') {
    alvoMin = 66;
    alvoMax = 76;
  } else {
    alvoMin = 54;
    alvoMax = 66;
  }
  const restante = randEntre(rnd, alvoMin, alvoMax);
  const drainTotal = Math.max(8, 100 - restante);
  return drainTotal / 90;
}

/** Pequeno jitter no apito inicial (~±2 pp), sem sair de 1–100. */
export function energiaInicialPartida(energiaAtual: number, rnd: () => number): number {
  const base = Number.isFinite(energiaAtual) ? energiaAtual : 100;
  const jitter = randEntre(rnd, -2.2, 2.2);
  return Math.round(Math.min(100, Math.max(1, base + jitter)) * 10) / 10;
}

/**
 * Rendimento cai com a energia (performance ↔ energia).
 * 100% → 1 · 80% → 0,88 · 60% → 0,76 · piso 0,4.
 */
export function multiplicadorRendimentoPorEnergia(energia: number): number {
  const e = Math.max(0, Math.min(100, energia));
  return Math.max(0.4, 0.4 + 0.6 * (e / 100));
}

export function overallEfetivoPorEnergia(overall: number, energia: number): number {
  return Math.max(1, Math.round(overall * multiplicadorRendimentoPorEnergia(energia)));
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
 * Chance por minuto de lesão muscular quando energia < ~70.
 * Queda de energia e baixa resistência elevam o risco.
 */
export function chanceLesaoPorFadiga(
  energia: number,
  resistenciaLesao: number,
  rnd: () => number,
): boolean {
  if (energia >= ENERGIA_LIMITE_LESAO) return false;
  const deficit = (ENERGIA_LIMITE_LESAO - energia) / ENERGIA_LIMITE_LESAO;
  const res = Math.max(1, Math.min(20, resistenciaLesao));
  const fatorRes = 1.25 - res / 20;
  // ~0,15%/min perto de 70 · ~1,2%/min em 40 · ~2%/min em 25
  const p = (0.0012 + deficit * deficit * 0.028) * fatorRes;
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
      (!j.lesao || j.lesao.diasRestantes <= 0) &&
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
  // Pequena aleatoriedade entre os 3 melhores.
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

/** Interpolação suave usada em testes / UI de previsão. */
export function preverEnergiaFimJogo(idade: number, energiaInicio: number, rnd: () => number): number {
  const drain = fadigaPorMinutoPorIdade(idade, rnd) * 90;
  return Math.max(0, Math.round((energiaInicio - drain) * 10) / 10);
}

export function faixaRecuperacaoLabel(idade: number): string {
  const f = faixaEtariaEnergia(idade);
  if (f === 'jovem') return 'Recuperação rápida (~10%/dia)';
  if (f === 'medio') return 'Recuperação média (~7%/dia)';
  return 'Recuperação lenta (~4%/dia)';
}
