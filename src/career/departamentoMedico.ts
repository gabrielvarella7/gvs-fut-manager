/**
 * Departamento Médico + Fisiologia — fórmulas alinhadas ao blueprint Gemini
 * e ao GDD (energia &lt;80%/+35%, &lt;68%/+140%, idade 33+, staff 1–20).
 */
import type { GravidadeLesao, Jogador, TipoLesao } from '../types/schema';
import { getGeneticaSegura } from './genetica';

export interface StaffDepartamentoMedico {
  nivelFisiologista: number;
  nivelPreparador: number;
  nivelFisioterapeuta: number;
  nivelMedico: number;
}

export type TipoLesaoCatalogo =
  | 'SOBRECARGA_LEVE'
  | 'ESTIRAMENTO_GRAU_1'
  | 'LESAO_GRAU_2'
  | 'RUPTURA_LCA';

export interface LesaoSorteada {
  tipo: TipoLesaoCatalogo;
  nome: string;
  gravidade: GravidadeLesao;
  tipoOrigem: TipoLesao;
  rodadas_restantes: number;
  sequela_pendente: number;
  lesao_id: string;
}

/**
 * Zonas de risco por energia:
 * 85–100 → 0,75–0,85× · 70–84 → 1,35× · &lt;68 → 2,40× (+140%).
 */
export function multRiscoPorEnergia(energia: number): number {
  if (energia >= 85) return 0.8;
  if (energia >= 70) return 1.35;
  if (energia >= 68) return 1.85;
  return 2.4;
}

/** Idade 33+ → +35% estiramentos / sobrecarga. */
export function multRiscoPorIdade(idade: number): number {
  return idade >= 33 ? 1.35 : 1.0;
}

/**
 * Fisiologista 1–20: reduz multiplicador de lesão do elenco (piso ×0,30).
 * Blueprint: max(0.3, 1 - (nivel - 10) * 0.07)
 */
export function multChanceLesaoFisiologista(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.max(0.3, 1 - (n - 10) * 0.07);
}

/**
 * Fisioterapeuta: até −40% tempo fora (piso ×0,60).
 * Blueprint: max(0.6, 1 - (nivel - 10) * 0.04)
 */
export function multDuracaoFisioterapeuta(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.max(0.6, 1 - (n - 10) * 0.04);
}

/** Preparador: atenua custo energético positivo do regime. */
export function fatorCustoEnergiaPreparador(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return 1 - (n - 10) * 0.045;
}

/**
 * Médico elite (~20) preserva 100% dos atributos.
 * Blueprint: min(100, 65 + nivel * 2) / 100
 */
export function preservacaoAtributosMedico(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.min(100, 65 + n * 2) / 100;
}

export function multFadigaPreparadorFisico(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.max(0.55, 1.15 - (n / 20) * 0.55);
}

const MAPA_LESAO: Record<
  TipoLesaoCatalogo,
  { nome: string; gravidade: GravidadeLesao; lesao_id: string; rodadas: number; sequela: number }
> = {
  SOBRECARGA_LEVE: {
    nome: 'Sobrecarga / Fadiga Muscular',
    gravidade: 'LEVE',
    lesao_id: 'FADIGA_MUSCULAR',
    rodadas: 1,
    sequela: 0,
  },
  ESTIRAMENTO_GRAU_1: {
    nome: 'Estiramento na Posterior da Coxa',
    gravidade: 'MODERADA',
    lesao_id: 'ESTIRAMENTO_POSTERIOR',
    rodadas: 3,
    sequela: 0,
  },
  LESAO_GRAU_2: {
    nome: 'Lesão Grau 2 no Adutor',
    gravidade: 'MODERADA',
    lesao_id: 'LESAO_GRAU_2_ADUTOR',
    rodadas: 6,
    sequela: 2,
  },
  RUPTURA_LCA: {
    nome: 'Ruptura Ligamentar no Joelho (LCA)',
    gravidade: 'GRAVE',
    lesao_id: 'RUPTURA_LIGAMENTAR',
    rodadas: 16,
    sequela: 4,
  },
};

/**
 * Probabilidade semanal de sobrecarga (treino), blueprint Gemini:
 * 1,6% × fadiga × regime × idade × fisiologista × propensão genética.
 */
export function probabilidadeLesaoSobrecargaSemanal(params: {
  energia: number;
  idade: number;
  riscoRegime: number;
  riscoSessao?: number;
  nivelFisiologista: number;
  propensaoLesao: number;
  /** Regime EXTREMO: fadiga extra no cascade (spec 2,60× × 2,40×). */
  regimeExtremo?: boolean;
}): number {
  const multFadiga = multRiscoPorEnergia(params.energia);
  const multIdade = multRiscoPorIdade(params.idade);
  const multFisio = multChanceLesaoFisiologista(params.nivelFisiologista);
  const sessao = params.riscoSessao ?? 1;
  let p =
    0.016 *
    multFadiga *
    params.riscoRegime *
    sessao *
    multIdade *
    multFisio *
    params.propensaoLesao;
  if (params.regimeExtremo && params.energia < 75) {
    p *= 1.15;
  }
  return Math.min(0.55, p);
}

/** Gravidade ponderada: fadiga → leve; choques → 3 / 6 / 16 rodadas. */
export function sortearLesaoSobrecarga(
  nivelFisioterapeuta: number,
  energia: number,
  rng: () => number,
): LesaoSorteada {
  const fatorTempo = multDuracaoFisioterapeuta(nivelFisioterapeuta);
  const roll = rng();
  // Fadiga baixa favorece sobrecargas leves
  const biasLeve = energia < 68 ? 0.12 : energia < 80 ? 0.05 : 0;
  const r = Math.max(0, roll - biasLeve);

  let tipo: TipoLesaoCatalogo;
  if (r < 0.55) tipo = 'SOBRECARGA_LEVE';
  else if (r < 0.85) tipo = 'ESTIRAMENTO_GRAU_1';
  else if (r < 0.97) tipo = 'LESAO_GRAU_2';
  else tipo = 'RUPTURA_LCA';

  const def = MAPA_LESAO[tipo];
  const rodadas =
    tipo === 'SOBRECARGA_LEVE'
      ? 1
      : Math.max(
          tipo === 'ESTIRAMENTO_GRAU_1' ? 2 : tipo === 'LESAO_GRAU_2' ? 4 : 10,
          Math.round(def.rodadas * fatorTempo),
        );

  return {
    tipo,
    nome: def.nome,
    gravidade: def.gravidade,
    tipoOrigem: 'SOBRECARGA',
    rodadas_restantes: rodadas,
    sequela_pendente: def.sequela,
    lesao_id: def.lesao_id,
  };
}

/**
 * Lesão traumática em jogo: baixa frequência constante;
 * amplificada em clássicos / marcação sufocante.
 */
export function probabilidadeLesaoTraumatica(params: {
  isClassico?: boolean;
  marcacaoSufocante?: boolean;
  nivelFisiologista: number;
  resistenciaLesao: number;
}): number {
  let base = 0.018;
  if (params.isClassico) base *= 1.55;
  if (params.marcacaoSufocante) base *= 1.35;
  const res = Math.max(1, Math.min(20, params.resistenciaLesao));
  return (
    base *
    multChanceLesaoFisiologista(params.nivelFisiologista) *
    (1.15 - res / 22)
  );
}

export function propensaoDeJogador(j: Jogador): number {
  return getGeneticaSegura(j).propensao_lesao;
}
