/**
 * Motor epidemiológico de lesões — catálogo Gabriel (30 lesões, pesos = 100%).
 * Recuperação em dias (fisioterapeuta); risco de ocorrência (fisiologista).
 *
 * Calibração: Jul / TREINO / ESTIRAMENTO_POSTERIOR_G1 (12–21d) × fisio 11 (0,96)
 * → manchete-tipo “estiramento (moderada). Previsão de 19 dias.”
 * Elenco médio (staff ~10–12): 2–4 no DM no meio da temporada;
 * elite 18–20 + rotação de energia → temporadas mais limpas.
 */
import type { EstadoLesao, Jogador, Posicao, TipoLesao } from '../types/schema';
import { getGeneticaSegura } from '../career/genetica';
import type { RegimeIntensidadeId } from '../types/training';

export type GravidadeLesaoCatalogo = 'LEVE' | 'MODERADA' | 'SERIA' | 'GRAVE';
export type CategoriaLesao = 'MUSCULAR' | 'TRAUMATICA' | 'ARTICULAR' | 'TENDINEA' | 'OSSEA';
export type ContextoOcorrencia = 'JOGO' | 'TREINO';

export interface DefinicaoLesao {
  id: string;
  nome: string;
  categoria: CategoriaLesao;
  gravidade: GravidadeLesaoCatalogo;
  diasMin: number;
  diasMax: number;
  /** Soma do catálogo = 100.0 */
  pesoBase: number;
  sequelaSemMedico: number;
}

export interface DiagnosticoGerado {
  lesaoId: string;
  nome: string;
  gravidade: GravidadeLesaoCatalogo;
  categoria: CategoriaLesao;
  contexto: ContextoOcorrencia;
  /** Dias finais já com multiplicador do fisioterapeuta. */
  diasRecuperacao: number;
  /** Dias brutos sorteados na faixa [min, max] antes do fisio. */
  diasBrutos: number;
  sequelaPendente: number;
  /** Ex.: "Fabrício Bruno: estiramento (moderada). Previsão de 19 dias." */
  mancheteNoticia: string;
}

export const CATALOGO_30_LESOES: DefinicaoLesao[] = [
  { id: 'FADIGA_MUSCULAR', nome: 'fadiga muscular', categoria: 'MUSCULAR', gravidade: 'LEVE', diasMin: 3, diasMax: 6, pesoBase: 16.0, sequelaSemMedico: 0 },
  { id: 'CONTRATURA_POSTERIOR', nome: 'contratura na posterior da coxa', categoria: 'MUSCULAR', gravidade: 'LEVE', diasMin: 5, diasMax: 9, pesoBase: 11.5, sequelaSemMedico: 0 },
  { id: 'CONTUSAO_DIRETA', nome: 'trauma por pancada', categoria: 'TRAUMATICA', gravidade: 'LEVE', diasMin: 2, diasMax: 5, pesoBase: 10.0, sequelaSemMedico: 0 },
  { id: 'CONTRATURA_PANTURRILHA', nome: 'contratura na panturrilha', categoria: 'MUSCULAR', gravidade: 'LEVE', diasMin: 5, diasMax: 8, pesoBase: 7.5, sequelaSemMedico: 0 },
  { id: 'ENTORSE_TORNOZELO_LEVE', nome: 'entorse leve no tornozelo', categoria: 'ARTICULAR', gravidade: 'LEVE', diasMin: 6, diasMax: 12, pesoBase: 7.0, sequelaSemMedico: 0 },
  { id: 'ESTIRAMENTO_POSTERIOR_G1', nome: 'estiramento', categoria: 'MUSCULAR', gravidade: 'MODERADA', diasMin: 12, diasMax: 21, pesoBase: 6.8, sequelaSemMedico: 0 },
  { id: 'ESTIRAMENTO_ADUTOR_G1', nome: 'estiramento no adutor', categoria: 'MUSCULAR', gravidade: 'MODERADA', diasMin: 10, diasMax: 18, pesoBase: 5.5, sequelaSemMedico: 0 },
  { id: 'ESTIRAMENTO_QUADRICEPS_G1', nome: 'estiramento no quadríceps', categoria: 'MUSCULAR', gravidade: 'MODERADA', diasMin: 12, diasMax: 20, pesoBase: 4.6, sequelaSemMedico: 0 },
  { id: 'LOMBALGIA', nome: 'lombalgia aguda', categoria: 'ARTICULAR', gravidade: 'LEVE', diasMin: 4, diasMax: 10, pesoBase: 3.8, sequelaSemMedico: 0 },
  { id: 'TENDINITE_PATELAR', nome: 'tendinite patelar', categoria: 'TENDINEA', gravidade: 'LEVE', diasMin: 7, diasMax: 14, pesoBase: 3.2, sequelaSemMedico: 0 },
  { id: 'TENDINITE_AQUILES', nome: 'tendinite no tendão de Aquiles', categoria: 'TENDINEA', gravidade: 'MODERADA', diasMin: 10, diasMax: 21, pesoBase: 2.8, sequelaSemMedico: 0 },
  { id: 'ENTORSE_TORNOZELO_MOD', nome: 'entorse ligamentar no tornozelo', categoria: 'ARTICULAR', gravidade: 'MODERADA', diasMin: 18, diasMax: 30, pesoBase: 2.7, sequelaSemMedico: 1 },
  { id: 'ESTIRAMENTO_PANTURRILHA_G1', nome: 'estiramento na panturrilha', categoria: 'MUSCULAR', gravidade: 'MODERADA', diasMin: 12, diasMax: 22, pesoBase: 2.5, sequelaSemMedico: 0 },
  { id: 'EDEMA_OSSEO', nome: 'edema ósseo no joelho', categoria: 'OSSEA', gravidade: 'MODERADA', diasMin: 14, diasMax: 28, pesoBase: 2.1, sequelaSemMedico: 0 },
  { id: 'FASCITE_PLANTAR', nome: 'fascite plantar', categoria: 'TENDINEA', gravidade: 'MODERADA', diasMin: 14, diasMax: 25, pesoBase: 1.8, sequelaSemMedico: 0 },
  { id: 'CONCUSSAO_CEREBRAL', nome: 'protocolo de concussão', categoria: 'TRAUMATICA', gravidade: 'LEVE', diasMin: 6, diasMax: 10, pesoBase: 1.5, sequelaSemMedico: 0 },
  { id: 'LESAO_POSTERIOR_G2', nome: 'lesão grau 2 na posterior', categoria: 'MUSCULAR', gravidade: 'SERIA', diasMin: 28, diasMax: 45, pesoBase: 1.9, sequelaSemMedico: 1 },
  { id: 'LESAO_ADUTOR_G2', nome: 'lesão grau 2 no adutor', categoria: 'MUSCULAR', gravidade: 'SERIA', diasMin: 25, diasMax: 42, pesoBase: 1.4, sequelaSemMedico: 1 },
  { id: 'PUBALGIA', nome: 'pubalgia', categoria: 'TENDINEA', gravidade: 'SERIA', diasMin: 30, diasMax: 60, pesoBase: 1.2, sequelaSemMedico: 1 },
  { id: 'LESAO_RETO_FEMORAL_G2', nome: 'lesão grau 2 no reto femoral', categoria: 'MUSCULAR', gravidade: 'SERIA', diasMin: 30, diasMax: 48, pesoBase: 1.1, sequelaSemMedico: 1 },
  { id: 'ESTIRAMENTO_LCM', nome: 'estiramento no ligamento colateral do joelho', categoria: 'ARTICULAR', gravidade: 'SERIA', diasMin: 28, diasMax: 50, pesoBase: 1.0, sequelaSemMedico: 1 },
  { id: 'LUXACAO_OMBRO', nome: 'luxação no ombro', categoria: 'ARTICULAR', gravidade: 'MODERADA', diasMin: 18, diasMax: 35, pesoBase: 0.9, sequelaSemMedico: 0 },
  { id: 'FRATURA_FACE', nome: 'fratura nasal', categoria: 'OSSEA', gravidade: 'LEVE', diasMin: 7, diasMax: 14, pesoBase: 0.8, sequelaSemMedico: 0 },
  { id: 'LESAO_MENISCO', nome: 'lesão no menisco', categoria: 'ARTICULAR', gravidade: 'SERIA', diasMin: 40, diasMax: 75, pesoBase: 0.7, sequelaSemMedico: 2 },
  { id: 'FRATURA_ESTRESSE_METATARSO', nome: 'fratura por estresse no metatarso', categoria: 'OSSEA', gravidade: 'SERIA', diasMin: 45, diasMax: 80, pesoBase: 0.5, sequelaSemMedico: 1 },
  { id: 'RUPTURA_MUSCULAR_G3', nome: 'ruptura muscular grau 3', categoria: 'MUSCULAR', gravidade: 'GRAVE', diasMin: 75, diasMax: 120, pesoBase: 0.4, sequelaSemMedico: 2 },
  { id: 'FRATURA_TIBIA_FIBULA', nome: 'fratura na fíbula', categoria: 'OSSEA', gravidade: 'GRAVE', diasMin: 120, diasMax: 210, pesoBase: 0.3, sequelaSemMedico: 3 },
  { id: 'RUPTURA_AQUILES', nome: 'ruptura do tendão de Aquiles', categoria: 'TENDINEA', gravidade: 'GRAVE', diasMin: 150, diasMax: 240, pesoBase: 0.2, sequelaSemMedico: 3 },
  { id: 'RUPTURA_LCA', nome: 'ruptura de ligamento cruzado (LCA)', categoria: 'ARTICULAR', gravidade: 'GRAVE', diasMin: 180, diasMax: 270, pesoBase: 0.2, sequelaSemMedico: 4 },
  { id: 'TRIADE_JOELHO', nome: 'lesão ligamentar complexa no joelho', categoria: 'ARTICULAR', gravidade: 'GRAVE', diasMin: 240, diasMax: 330, pesoBase: 0.1, sequelaSemMedico: 5 },
];

const IDS_POSTERIOR_HAMSTRING = new Set([
  'CONTRATURA_POSTERIOR',
  'ESTIRAMENTO_POSTERIOR_G1',
  'LESAO_POSTERIOR_G2',
]);

const IDS_SOBRECARGA_G1_PRETEMP = new Set([
  'FADIGA_MUSCULAR',
  'CONTRATURA_POSTERIOR',
  'CONTRATURA_PANTURRILHA',
  'ESTIRAMENTO_POSTERIOR_G1',
  'ESTIRAMENTO_ADUTOR_G1',
  'ESTIRAMENTO_QUADRICEPS_G1',
  'ESTIRAMENTO_PANTURRILHA_G1',
  'TENDINITE_PATELAR',
  'TENDINITE_AQUILES',
  'FASCITE_PLANTAR',
]);

const IDS_GOL_ESPECIAIS = new Set(['LUXACAO_OMBRO', 'LOMBALGIA', 'CONTUSAO_DIRETA', 'FRATURA_FACE']);

export function somaPesosCatalogo(): number {
  return CATALOGO_30_LESOES.reduce((s, l) => s + l.pesoBase, 0);
}

/** Fisiologista 1–20 → piso ×0,30 (nível 13 ≈ 0,79). */
export function multChanceLesaoFisiologistaEngine(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.max(0.3, 1.0 - (n - 10) * 0.07);
}

/** Fisioterapeuta 1–20 → piso ×0,55 (nível 11 = 0,96). */
export function multDuracaoFisioterapeutaEngine(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return Math.max(0.55, 1.0 - (n - 10) * 0.04);
}

function categoriaParaTipoOrigem(cat: CategoriaLesao): TipoLesao {
  return cat === 'TRAUMATICA' || cat === 'OSSEA' || cat === 'ARTICULAR'
    ? 'TRAUMATICA'
    : 'SOBRECARGA';
}

function cloneAtributos(j: Jogador): Jogador['atributos'] {
  return {
    tecnicos: { ...j.atributos.tecnicos },
    mentais: { ...j.atributos.mentais },
    fisicos: { ...j.atributos.fisicos },
  };
}

/** Monta EstadoLesao com dias já finais (não reaplica fisio). */
export function montarEstadoLesaoDeDiagnostico(
  diag: DiagnosticoGerado,
  jogador: Jogador,
): EstadoLesao {
  return {
    diasRestantes: diag.diasRecuperacao,
    gravidade: diag.gravidade,
    descricao: diag.nome,
    atributosReferencia: cloneAtributos(jogador),
    overallReferencia: jogador.overall,
    tipo: categoriaParaTipoOrigem(diag.categoria),
    lesaoId: diag.lesaoId,
    sequelaPendente: diag.sequelaPendente,
    rodadasForaBase: Math.max(1, Math.round(diag.diasRecuperacao / 6)),
  };
}

/**
 * 1. Gatilho — o atleta se lesiona agora?
 * JOGO: ~3,2% titular/partida · TREINO: ~0,35%/dia (escalável via exposicaoDias).
 */
export function avaliarRiscoOcorrenciaLesao(params: {
  jogador: Pick<Jogador, 'energia' | 'idade' | 'posicao'> & {
    propensao_lesao?: number;
    genetica?: Jogador['genetica'];
  };
  contexto: ContextoOcorrencia;
  mesAtual: number;
  nivelFisiologista: number;
  intensidadeTreino?: RegimeIntensidadeId;
  isClassicoOuDecisao?: boolean;
  /** Dias/sessões no período (treino semanal ≈ 6). Default 1. */
  exposicaoDias?: number;
  rng?: () => number;
}): { ocorreu: boolean; probabilidadeCalculada: number } {
  const {
    jogador,
    contexto,
    mesAtual,
    nivelFisiologista,
    intensidadeTreino = 'EQUILIBRADO',
    isClassicoOuDecisao = false,
    exposicaoDias = 1,
    rng = Math.random,
  } = params;

  const taxaDia = contexto === 'JOGO' ? 0.032 : 0.0035;
  const exposicao = contexto === 'JOGO' ? 1 : Math.max(1, exposicaoDias);
  const taxaBase = Math.min(0.22, taxaDia * exposicao);

  const fatorFadiga =
    jogador.energia < 60
      ? 2.85
      : jogador.energia < 70
        ? 2.15
        : jogador.energia < 80
          ? 1.4
          : 0.85;

  // Jan/Fev pré-temporada; Jul/Ago maratona Copa + Brasileirão
  const fatorCalendario =
    mesAtual === 1 || mesAtual === 2
      ? 1.35
      : mesAtual === 7 || mesAtual === 8
        ? 1.25
        : 1.0;

  // GOL −65% overall; ATA/LAT ligeiramente mais expostos
  const fatorPosicao =
    jogador.posicao === 'GOL'
      ? 0.35
      : jogador.posicao === 'LAT' || jogador.posicao === 'ATA'
        ? 1.15
        : 1.0;

  const fatorIdade =
    jogador.idade >= 35 ? 1.4 : jogador.idade >= 32 ? 1.2 : jogador.idade <= 20 ? 0.9 : 1.0;

  const mapaTreino: Record<RegimeIntensidadeId, number> = {
    REGENERATIVO: 0.4,
    EQUILIBRADO: 1.0,
    ALTA_INTENSIDADE: 1.65,
    EXTREMO: 2.5,
  };
  const fatorTreino = contexto === 'TREINO' ? mapaTreino[intensidadeTreino] : 1.0;
  const fatorFisiologista = multChanceLesaoFisiologistaEngine(nivelFisiologista);
  const propensaoGenetica =
    jogador.propensao_lesao ??
    (jogador.genetica ? getGeneticaSegura(jogador as Jogador).propensao_lesao : 1.0);
  const fatorCompetitivo = contexto === 'JOGO' && isClassicoOuDecisao ? 1.25 : 1.0;

  const probabilidadeFinal = Math.min(
    0.45,
    taxaBase *
      fatorFadiga *
      fatorCalendario *
      fatorPosicao *
      fatorIdade *
      fatorTreino *
      fatorFisiologista *
      propensaoGenetica *
      fatorCompetitivo,
  );

  return {
    ocorreu: rng() < probabilidadeFinal,
    probabilidadeCalculada: probabilidadeFinal,
  };
}

function isMuscularOuTendinea(cat: CategoriaLesao): boolean {
  return cat === 'MUSCULAR' || cat === 'TENDINEA';
}

function isTraumaOuArticular(cat: CategoriaLesao): boolean {
  return cat === 'TRAUMATICA' || cat === 'ARTICULAR' || cat === 'OSSEA';
}

/**
 * 2. Seleção do diagnóstico + dias.
 * TREINO ≈ 82% muscular/tendínea · JOGO ≈ 55% muscular / 45% traumático-articular.
 * Spikes: pré-temporada +45% sobrecarga/tendão/G1; Mai–Ago congestão +60% muscular se energia &lt;75%.
 */
export function sortearDiagnosticoLesao(params: {
  jogador: Pick<Jogador, 'nome' | 'energia' | 'posicao'>;
  contexto: ContextoOcorrencia;
  nivelFisioterapeuta: number;
  mesAtual?: number;
  /** Quarta/domingo / calendário congestionado (Mai–Ago). */
  congestaoCalendario?: boolean;
  rng?: () => number;
  /** Força um id do catálogo (testes / calibração). */
  forcarLesaoId?: string;
}): DiagnosticoGerado {
  const {
    jogador,
    contexto,
    nivelFisioterapeuta,
    mesAtual = 6,
    congestaoCalendario,
    rng = Math.random,
    forcarLesaoId,
  } = params;

  const preTemporada = mesAtual === 1 || mesAtual === 2;
  const congestao =
    congestaoCalendario ?? (mesAtual >= 5 && mesAtual <= 8);

  const pesosDinamicos = CATALOGO_30_LESOES.map((lesao) => {
    let peso = lesao.pesoBase;

    // TREINO: traumas/ósseas caem ~85% → mix ~82% muscular/tendínea
    if (contexto === 'TREINO' && (lesao.categoria === 'TRAUMATICA' || lesao.categoria === 'OSSEA')) {
      peso *= 0.15;
    }
    if (contexto === 'TREINO' && isMuscularOuTendinea(lesao.categoria)) {
      peso *= 1.12;
    }

    // JOGO: choques/entorses +65% → ~45% traumático-articular
    if (contexto === 'JOGO' && (lesao.categoria === 'TRAUMATICA' || lesao.categoria === 'ARTICULAR')) {
      peso *= 1.65;
    }

    if (jogador.energia < 72 && isMuscularOuTendinea(lesao.categoria)) {
      peso *= 2.1;
    }

    // Pré-temporada Jan–Fev: +45% sobrecarga / tendão / G1
    if (preTemporada && (IDS_SOBRECARGA_G1_PRETEMP.has(lesao.id) || lesao.categoria === 'TENDINEA')) {
      peso *= 1.45;
    }

    // Mai–Ago (quarta/domingo): +60% muscular se energia < 75%
    if (congestao && jogador.energia < 75 && lesao.categoria === 'MUSCULAR') {
      peso *= 1.6;
    }

    // ATA/LAT +35% hamstring (posterior)
    if (
      (jogador.posicao === 'ATA' || jogador.posicao === 'LAT') &&
      IDS_POSTERIOR_HAMSTRING.has(lesao.id)
    ) {
      peso *= 1.35;
    }

    // ZAG/VOL +40% trauma
    if (
      (jogador.posicao === 'ZAG' || jogador.posicao === 'VOL') &&
      isTraumaOuArticular(lesao.categoria)
    ) {
      peso *= 1.4;
    }

    // GOL: ombro / lombar / impacto (mãos/face)
    if (jogador.posicao === 'GOL' && IDS_GOL_ESPECIAIS.has(lesao.id)) {
      peso *= 3.5;
    }

    return { lesao, peso: Math.max(0, peso) };
  });

  let escolhida = pesosDinamicos[0]!.lesao;
  if (forcarLesaoId) {
    const forced = CATALOGO_30_LESOES.find((l) => l.id === forcarLesaoId);
    if (forced) escolhida = forced;
  } else {
    const somaPesos = pesosDinamicos.reduce((acc, item) => acc + item.peso, 0);
    let roleta = rng() * somaPesos;
    for (const item of pesosDinamicos) {
      roleta -= item.peso;
      if (roleta <= 0) {
        escolhida = item.lesao;
        break;
      }
    }
  }

  const diasBrutos =
    escolhida.diasMin +
    Math.floor(rng() * (escolhida.diasMax - escolhida.diasMin + 1));
  const multFisio = multDuracaoFisioterapeutaEngine(nivelFisioterapeuta);
  const diasFinais = Math.max(2, Math.round(diasBrutos * multFisio));

  const gravidadeLabel = escolhida.gravidade.toLowerCase();
  const mancheteNoticia = `${jogador.nome}: ${escolhida.nome} (${gravidadeLabel}). Previsão de ${diasFinais} dias.`;

  return {
    lesaoId: escolhida.id,
    nome: escolhida.nome,
    gravidade: escolhida.gravidade,
    categoria: escolhida.categoria,
    contexto,
    diasRecuperacao: diasFinais,
    diasBrutos,
    sequelaPendente: escolhida.sequelaSemMedico,
    mancheteNoticia,
  };
}

/** Pipeline completo: risco → diagnóstico → EstadoLesao (ou null). */
export function tentarGerarLesao(params: {
  jogador: Jogador;
  contexto: ContextoOcorrencia;
  mesAtual: number;
  nivelFisiologista: number;
  nivelFisioterapeuta: number;
  intensidadeTreino?: RegimeIntensidadeId;
  isClassicoOuDecisao?: boolean;
  exposicaoDias?: number;
  congestaoCalendario?: boolean;
  rng?: () => number;
}): { lesao: EstadoLesao; diagnostico: DiagnosticoGerado } | null {
  const rng = params.rng ?? Math.random;
  const risco = avaliarRiscoOcorrenciaLesao({
    jogador: {
      ...params.jogador,
      propensao_lesao: getGeneticaSegura(params.jogador).propensao_lesao,
    },
    contexto: params.contexto,
    mesAtual: params.mesAtual,
    nivelFisiologista: params.nivelFisiologista,
    intensidadeTreino: params.intensidadeTreino,
    isClassicoOuDecisao: params.isClassicoOuDecisao,
    exposicaoDias: params.exposicaoDias,
    rng,
  });
  if (!risco.ocorreu) return null;

  const diagnostico = sortearDiagnosticoLesao({
    jogador: params.jogador,
    contexto: params.contexto,
    nivelFisioterapeuta: params.nivelFisioterapeuta,
    mesAtual: params.mesAtual,
    congestaoCalendario: params.congestaoCalendario,
    rng,
  });

  return {
    diagnostico,
    lesao: montarEstadoLesaoDeDiagnostico(diagnostico, params.jogador),
  };
}

/** Diagnóstico forçado (lesão em campo por fadiga já sorteada). */
export function diagnosticarLesaoConfirmada(params: {
  jogador: Pick<Jogador, 'nome' | 'energia' | 'posicao'> & Partial<Jogador>;
  contexto: ContextoOcorrencia;
  nivelFisioterapeuta: number;
  mesAtual?: number;
  rng?: () => number;
}): DiagnosticoGerado {
  return sortearDiagnosticoLesao({
    jogador: params.jogador,
    contexto: params.contexto,
    nivelFisioterapeuta: params.nivelFisioterapeuta,
    mesAtual: params.mesAtual,
    rng: params.rng,
  });
}

export function mesDeDataISO(dataISO: string): number {
  const m = Number.parseInt(dataISO.slice(5, 7), 10);
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : 6;
}

export function definirLesaoPorId(
  id: string,
  jogador: Pick<Jogador, 'nome' | 'energia' | 'posicao'>,
  nivelFisioterapeuta: number,
  contexto: ContextoOcorrencia = 'TREINO',
  rng: () => number = Math.random,
): DiagnosticoGerado {
  return sortearDiagnosticoLesao({
    jogador,
    contexto,
    nivelFisioterapeuta,
    forcarLesaoId: id,
    rng,
  });
}

/** Rodadas aprox. para UI de treino (1 rodada ≈ 6 dias). */
export function diasParaRodadasTreino(dias: number): number {
  return Math.max(1, Math.round(dias / 6));
}

export function posicaoEhExpostaHamstring(pos: Posicao): boolean {
  return pos === 'ATA' || pos === 'LAT';
}
