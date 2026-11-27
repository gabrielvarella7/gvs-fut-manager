import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../data/esquemasTaticos';
import {
  categoriaGol,
  escolherLegenda,
  escolherLegendaEntre,
  nomeGoleiro,
  pickAssistente,
  placarAte,
  type VarsNarracao,
} from './narracao';
import { metricasMotorDeAtributos } from '../career/atributosJogador';
import {
  bloqueadoPorLesaoComEnergiaBaixa,
  ENERGIA_MINIMA_COM_LESAO,
  jogadorPodeJogar,
  mensagemBloqueioLesaoEnergia,
} from '../career/aptidaoEscalacao';
import {
  chanceLesaoPorFadiga,
  escolherReservaParaSub,
  energiaInicialPartida,
  fadigaPorMinutoCompleta,
  multiplicadorDrainGeneticaNoMinuto,
  MAX_SUBSTITUICOES_PARTIDA,
  recuperacaoDiariaEnergia,
  sortearGravidadeLesaoFadiga,
  diasBaseLesaoFadiga,
  descricaoLesaoFadiga,
  timeEmWO,
  vetoresTaticosDeConfig,
} from '../career/energia';
import { getGeneticaSegura } from '../career/genetica';
import type { EsquemaTatico, GravidadeLesao, Jogador, Posicao } from '../types/schema';
import { type ContextoDinamicoPartida, modificadoresUrgencia } from './matchContext';
import {
  construirEstatisticasPartida,
  type EstatisticasPartida,
  type PreJogoInfo,
} from './matchStats';
import { gerarGraficoMomentum } from './matchMomentum';
import { prepararPartidaComFaixa } from './matchProbabilidades';
import {
  indicePartidaDeveSerAlucinado,
  lambdasGolsDeDiff,
  placarJogoAlucinado,
  sortearDiffComVariancia,
} from './matchResultadoCore';
import { afinidadeEmCampo, rendimentoJogadorEmCampo } from './matchRendimentoCampo';
import { efeitoSobrecargaExtremo17 } from '../career/youthAcademy';
import {
  aplicarConfrontoTaticoNosLambdas,
  calcularConfrontoTatico,
  type ConfrontoTatico,
} from './matchTaticaConfronto';
import { multiplicadorDesempenhoPosicao } from './posicaoCompatibilidade';
import type { OpcoesAfinidade } from '../career/afinidadePosicional';
import { PositionRecalculator } from '../career/positionRecalculator';
import type { DatabaseTaticas } from '../types/tactics';
import type { ConfiguracaoTaticaClube } from '../types/tactics';
import {
  configuracaoPadrao,
  resolverImpactoTaticoConfronto,
  taticaCpuAutomatica,
  type ResultadoAvaliacaoTatica,
} from './tacticsEngine';
import { aplicarBonusTreinoModificadores } from './trainingEngine';

export const MOTOR_DEFAULTS = {
  improvisacaoMult: 0.8,
  /** Abaixo disto o rendimento já vinha caindo; agora o mult é contínuo via energia. */
  energiaLimiteFadiga: 70,
  /** Fallback se idade não calibrar — ~médio. */
  fadigaPorMinuto: 0.33,
  recuperacaoTitular: 25,
  recuperacaoReserva: 40,
} as const;

import type { CelulaGrade } from '../data/gradeCampinho';

export interface JogadorEmCampo {
  jogador: Jogador;
  posicaoEscalada: Posicao;
  celulaCampo?: CelulaGrade;
}

export interface ForcaSetores {
  defesa: number;
  meio: number;
  ataque: number;
}

export interface MatchTeamInput {
  timeId: string;
  nomeCurto: string;
  esquema: EsquemaTatico;
  elenco: Jogador[];
  escalacao?: JogadorEmCampo[];
  mandoDeCampo?: boolean;
  /** Prestígio/força do clube — ancora faixas de zebra (1–99). */
  forcaInstitucional?: number;
  /** Multiplicador de fadiga por minuto (preparador físico). */
  fadigaPorMinutoMult?: number;
  /** Nível do preparador (1–20) — reduz drain nos 90'. */
  nivelPreparador?: number;
  /** Estilo + instruções (formação derivada do esquema se omitida). */
  tatica?: ConfiguracaoTaticaClube;
  bonusTreino?: Record<string, number>;
  multExecucaoTreino?: number;
}

export interface MatchSimConfig {
  bonusMandoCampo: number;
  /** @deprecated Flat −20%; prefer polivalenciaPorJogador + matriz de afinidade. */
  improvisacaoMult?: number;
  improvisacaoMultPorJogador?: Record<number, number>;
  /** Progresso ADAPTACAO_POLIVALENCIA (0–100) por jogador. */
  polivalenciaPorJogador?: Record<number, number>;
  energiaLimiteFadiga?: number;
  fadigaPorMinuto?: number;
}

export type TipoLancamento =
  | 'inicio'
  | 'chance'
  | 'defesa'
  | 'gol'
  | 'cartao_amarelo'
  | 'lesao'
  | 'substituicao'
  | 'wo'
  | 'intervalo'
  | 'fim';

export interface Lancamento {
  minuto: number;
  tipo: TipoLancamento;
  timeId?: string;
  jogadorId?: number;
  /** Reserva que entrou (substituição). */
  jogadorIdEntrada?: number;
  /** Nome do jogador principal (autor do gol, cartão, lesão, saída). */
  jogadorNome?: string;
  /** Assistência em gols (quando houver). */
  assistenteNome?: string;
  /** Nome de quem entrou na substituição. */
  jogadorNomeEntrada?: string;
  /** Cartão mostrado; vermelho inclui segundo amarelo / expulsão direta. */
  cartao?: 'amarelo' | 'vermelho';
  texto: string;
}

export interface LesaoEmCampo {
  jogadorId: number;
  timeId: string;
  minuto: number;
  descricao: string;
  gravidade: GravidadeLesao;
  diasBase: number;
}

export interface MatchSimInput {
  mandante: MatchTeamInput;
  visitante: MatchTeamInput;
  config: MatchSimConfig;
  dbTaticas: DatabaseTaticas;
  seed?: number;
  /** Nome do estádio para legendas ({ESTADIO}) */
  estadio?: string;
  /** Moral, necessidade na tabela e clássico (motor dinâmico). */
  contexto?: ContextoDinamicoPartida;
  /** 1ª partida finalizada da temporada = 1 — a cada 30 pode sair zebra alucinada. */
  indicePartidaTemporada?: number;
}

export interface ProbabilidadesResultado {
  vitoriaMandante: number;
  empate: number;
  vitoriaVisitante: number;
}

export interface MatchSimResult {
  mandanteId: string;
  visitanteId: string;
  golsMandante: number;
  golsVisitante: number;
  lancamentos: Lancamento[];
  energiaFinal: { id: number; energia: number }[];
  forcaInicial: { mandante: ForcaSetores; visitante: ForcaSetores };
  impactoTatico?: { mandante: ResultadoAvaliacaoTatica; visitante: ResultadoAvaliacaoTatica };
  probabilidades?: ProbabilidadesResultado;
  duracaoMs?: number;
  estatisticas: EstatisticasPartida;
  preJogo: PreJogoInfo;
  simSeed?: number;
  /** Lesões por fadiga durante a partida (aplicar no elenco após o jogo). */
  lesoesEmCampo?: LesaoEmCampo[];
  /** Clube que sofreu W.O. (perde 3–0). */
  woTimeId?: string;
  /** Jogadores que terminaram fora da posição natural (insatisfação / contagem). */
  idsImprovisados?: number[];
}

export function criarRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OpcoesForcaSetores {
  multiplicadorMando?: number;
  fatorMotivacao?: number;
  fatorMoralTime?: number;
  multiplicadorDia?: number;
  jogadoresExpulsos?: ReadonlySet<number>;
  criseOuDecisivo?: boolean;
  jogandoFora?: boolean;
  minuto?: number;
  rnd?: () => number;
}

/** Preferência: saudáveis primeiro; lesionados com energia ≥60% só como emergência. */
function jogadorPreferencialEscalacao(j: Jogador): boolean {
  return jogadorPodeJogar(j) && (!j.lesao || j.lesao.diasRestantes <= 0);
}

export function montarEscalacao(elenco: Jogador[], esquema: EsquemaTatico): JogadorEmCampo[] {
  const elencoAf = PositionRecalculator.processarElenco(elenco);
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const aptos = [...elencoAf]
    .filter(jogadorPreferencialEscalacao)
    .sort((a, b) => b.overall - a.overall);
  /**
   * Emergência: lesionados leves com energia ≥60% podem completar o XI.
   * Nunca: lesão (contusão+) com energia &lt;60% — regra dura de escalação.
   */
  const emergencia = [...elencoAf]
    .filter((j) => jogadorPodeJogar(j) && !jogadorPreferencialEscalacao(j))
    .sort((a, b) => b.overall - a.overall);
  const ordenado = [...aptos, ...emergencia];
  const usados = new Set<number>();
  const escalacao: JogadorEmCampo[] = [];

  for (const slot of slots) {
    const titularMesmaPos = ordenado.find((j) => !usados.has(j.id) && j.posicao === slot);
    const improvisado =
      titularMesmaPos ??
      ordenado.find((j) => !usados.has(j.id) && j.status_escalacao === 'TITULAR');
    let fallback = improvisado ?? ordenado.find((j) => !usados.has(j.id));
    if (!fallback && elencoAf.length > 0) {
      // Último recurso entre quem PODE jogar (nunca bloqueado por lesão+energia).
      fallback = [...elencoAf]
        .filter(jogadorPodeJogar)
        .sort((a, b) => b.overall - a.overall)[0];
    }
    if (!fallback && elencoAf.length > 0) {
      // Elenco inviável: reutiliza o mais forte (evita crash), mas a UI/partida devem avisar.
      fallback = [...elencoAf].sort((a, b) => b.overall - a.overall)[0]!;
    }
    if (!fallback) {
      throw new Error(`Elenco insuficiente para preencher posição ${slot}.`);
    }
    usados.add(fallback.id);
    escalacao.push({ jogador: fallback, posicaoEscalada: slot });
  }

  return escalacao;
}

function setorDaPosicao(pos: Posicao): keyof ForcaSetores {
  if (pos === 'GOL' || pos === 'ZAG' || pos === 'LAT') return 'defesa';
  if (pos === 'VOL' || pos === 'MEI') return 'meio';
  return 'ataque';
}

export function calcularForcaSetores(
  escalacao: JogadorEmCampo[],
  energiaPorId: Map<number, number>,
  cfg: Pick<MatchSimConfig, 'improvisacaoMult' | 'improvisacaoMultPorJogador' | 'polivalenciaPorJogador' | 'energiaLimiteFadiga'> & {
    energiaLimiteFadiga: number;
  },
  opcoes: OpcoesForcaSetores = {},
): ForcaSetores {
  const soma = { defesa: 0, meio: 0, ataque: 0 };
  const contagem = { defesa: 0, meio: 0, ataque: 0 };
  const multMando = opcoes.multiplicadorMando ?? 1;
  const multDia = opcoes.multiplicadorDia ?? 1;
  const expulsos = opcoes.jogadoresExpulsos;

  for (const { jogador, posicaoEscalada, celulaCampo } of escalacao) {
    if (expulsos?.has(jogador.id)) continue;
    const setor = setorDaPosicao(posicaoEscalada);
    const energia = energiaPorId.get(jogador.id) ?? jogador.energia;
    const poliv = cfg.polivalenciaPorJogador?.[jogador.id];
    const opcoesAf: OpcoesAfinidade = {
      progressoPolivalencia: poliv,
      posicoesSecundarias: jogador.posicoes_secundarias,
    };
    const rend = rendimentoJogadorEmCampo({
      jogador,
      posicaoEscalada,
      celula: celulaCampo,
      energia,
      energiaLimiteFadiga: cfg.energiaLimiteFadiga,
      opcoesAfinidade: opcoesAf,
      fatorMotivacao: opcoes.fatorMotivacao,
      fatorMoralTime: opcoes.fatorMoralTime,
      criseOuDecisivo: opcoes.criseOuDecisivo,
      jogandoFora: opcoes.jogandoFora,
      minuto: opcoes.minuto,
      rnd: opcoes.rnd,
    });
    soma[setor] += rend;
    contagem[setor] += 1;
  }

  const fatorTime = multMando * multDia;

  return {
    defesa: (soma.defesa / Math.max(contagem.defesa, 1)) * fatorTime,
    meio: (soma.meio / Math.max(contagem.meio, 1)) * fatorTime,
    ataque: (soma.ataque / Math.max(contagem.ataque, 1)) * fatorTime,
  };
}

export function forcaGlobal(f: ForcaSetores): number {
  return f.defesa * 0.28 + f.meio * 0.34 + f.ataque * 0.38;
}

function amostraPoisson(lambda: number, rnd: () => number): number {
  const lim = Math.exp(-lambda);
  let p = 1;
  let k = 0;
  do {
    k += 1;
    p *= rnd();
  } while (p > lim);
  return Math.min(6, k - 1);
}

export { probabilidadesComFaixa, probabilidadesResultado } from './matchProbabilidades';

function minutosUnicos(qtd: number, rnd: () => number): number[] {
  if (qtd === 0) return [];
  const mins = new Set<number>();
  let guard = 0;
  while (mins.size < qtd && guard < 400) {
    guard += 1;
    mins.add(1 + Math.floor(rnd() * 90));
  }
  return [...mins].sort((a, b) => a - b);
}

function mediaAgressividadeEscalacao(escalacao: JogadorEmCampo[]): number {
  if (escalacao.length === 0) return 10;
  const soma = escalacao.reduce(
    (s, e) => s + metricasMotorDeAtributos(e.jogador.atributos).agressividade,
    0,
  );
  return soma / escalacao.length;
}

function probabilidadeCartaoAmarelo(
  mandante: JogadorEmCampo[],
  visitante: JogadorEmCampo[],
): number {
  const media =
    (mediaAgressividadeEscalacao(mandante) + mediaAgressividadeEscalacao(visitante)) / 2;
  return 0.012 + (media / 100) * 0.016;
}

function escalacaoAtiva(
  escalacao: JogadorEmCampo[],
  fora?: ReadonlySet<number>,
): JogadorEmCampo[] {
  if (!fora || fora.size === 0) return escalacao;
  return escalacao.filter((e) => !fora.has(e.jogador.id));
}

function escolherJogadorCartao(
  escalacao: JogadorEmCampo[],
  rnd: () => number,
  fora?: ReadonlySet<number>,
  multFaltasPorId?: ReadonlyMap<number, number>,
): Jogador {
  const ativos = escalacaoAtiva(escalacao, fora);
  const base = ativos.length > 0 ? ativos : escalacao;
  const pesos = base.map(({ jogador }) => {
    const agr = metricasMotorDeAtributos(jogador.atributos).agressividade;
    const faltas = multFaltasPorId?.get(jogador.id) ?? 1;
    return { jogador, w: (0.35 + agr) * faltas };
  });
  const total = pesos.reduce((s, p) => s + p.w, 0);
  let t = rnd() * total;
  for (const p of pesos) {
    t -= p.w;
    if (t <= 0) return p.jogador;
  }
  return pesos[pesos.length - 1]!.jogador;
}

function escolherArtilheiro(
  escalacao: JogadorEmCampo[],
  rnd: () => number,
  fora?: ReadonlySet<number>,
): Jogador {
  const ativos = escalacaoAtiva(escalacao, fora);
  const base = ativos.length > 0 ? ativos : escalacao;
  const pesos = base.map(({ jogador, posicaoEscalada }) => {
    const motor = metricasMotorDeAtributos(jogador.atributos);
    let w = motor.chute * 0.5 + motor.criatividade * 0.12 + motor.passe * 0.13 + jogador.overall * 0.25;
    w *= multiplicadorDesempenhoPosicao(jogador.posicao, posicaoEscalada);
    if (posicaoEscalada === 'ATA') w *= 1.65;
    else if (posicaoEscalada === 'MEI') w *= 1.15;
    else if (posicaoEscalada === 'VOL' || posicaoEscalada === 'LAT') w *= 0.35;
    else if (posicaoEscalada === 'ZAG') w *= 0.12;
    else w *= 0.05;
    return { jogador, w: Math.max(0.01, w) };
  });
  const total = pesos.reduce((s, p) => s + p.w, 0);
  let t = rnd() * total;
  for (const p of pesos) {
    t -= p.w;
    if (t <= 0) return p.jogador;
  }
  return pesos[pesos.length - 1]!.jogador;
}

function intensidadeAtaque(
  forca: ForcaSetores,
  defesaRival: ForcaSetores,
  multTatica = 1,
): number {
  const meio = forca.meio / Math.max(defesaRival.meio, 50);
  const frente = forca.ataque / Math.max(defesaRival.defesa, 50);
  return (meio * 0.4 + frente * 0.6) * 0.12 * multTatica;
}

function varsBase(
  input: MatchSimInput,
  minutosGolM: number[],
  minutosGolV: number[],
  minuto: number,
): Pick<VarsNarracao, 'MANDANTE' | 'VISITANTE' | 'ESTADIO' | 'MINUTO' | 'PLACAR'> {
  return {
    MANDANTE: input.mandante.nomeCurto,
    VISITANTE: input.visitante.nomeCurto,
    ESTADIO: input.estadio ?? 'estádio',
    MINUTO: String(minuto),
    PLACAR: placarAte(minuto, minutosGolM, minutosGolV),
  };
}

function varsAtaque(
  base: ReturnType<typeof varsBase>,
  ataqueNome: string,
  defesaNome: string,
  jogador: string,
  assistente: string,
  goleiro: string,
): VarsNarracao {
  return {
    ...base,
    TIME_ATAQUE: ataqueNome,
    TIME_DEFESA: defesaNome,
    JOGADOR: jogador,
    ASSISTENTE: assistente,
    GOLEIRO: goleiro,
  };
}

export function simularPartida(input: MatchSimInput): MatchSimResult {
  const ctx = input.contexto;
  const isClassico = ctx?.isClassico ?? false;
  const fadigaBase = input.config.fadigaPorMinuto ?? MOTOR_DEFAULTS.fadigaPorMinuto;
  const cfg = {
    improvisacaoMult: input.config.improvisacaoMult ?? MOTOR_DEFAULTS.improvisacaoMult,
    improvisacaoMultPorJogador: input.config.improvisacaoMultPorJogador,
    polivalenciaPorJogador: input.config.polivalenciaPorJogador,
    energiaLimiteFadiga:
      input.config.energiaLimiteFadiga ?? MOTOR_DEFAULTS.energiaLimiteFadiga,
    fadigaPorMinuto: fadigaBase * (isClassico ? 1.28 : 1),
    bonusMando: input.config.bonusMandoCampo,
  };

  const opcoesAfinidadeDe = (jogador: Jogador): OpcoesAfinidade => ({
    progressoPolivalencia: cfg.polivalenciaPorJogador?.[jogador.id],
    posicoesSecundarias: jogador.posicoes_secundarias,
  });

  const sanitizarEscalacaoInicial = (
    esc: JogadorEmCampo[],
    elenco: Jogador[],
    esquema: EsquemaTatico,
  ): JogadorEmCampo[] => {
    if (esc.every((s) => jogadorPodeJogar(s.jogador))) return esc;
    // Reconstrói XI sem quem está lesionado com energia < 60%.
    return montarEscalacao(elenco, esquema);
  };

  let mandanteEsc = sanitizarEscalacaoInicial(
    input.mandante.escalacao ??
      montarEscalacao(input.mandante.elenco, input.mandante.esquema),
    input.mandante.elenco,
    input.mandante.esquema,
  );
  let visitanteEsc = sanitizarEscalacaoInicial(
    input.visitante.escalacao ??
      montarEscalacao(input.visitante.elenco, input.visitante.esquema),
    input.visitante.elenco,
    input.visitante.esquema,
  );

  const rnd = criarRng(input.seed ?? Date.now());
  const energia = new Map<number, number>();
  for (const j of [...mandanteEsc, ...visitanteEsc]) {
    energia.set(j.jogador.id, energiaInicialPartida(j.jogador.energia, rnd));
  }

  const lancamentos: Lancamento[] = [];
  const lesoesEmCampo: LesaoEmCampo[] = [];
  let woTimeId: string | undefined;

  const mandoMult = input.mandante.mandoDeCampo !== false ? cfg.bonusMando : 1;
  const forcaInicial = {
    mandante: calcularForcaSetores(mandanteEsc, energia, cfg, {
      multiplicadorMando: mandoMult,
    }),
    visitante: calcularForcaSetores(visitanteEsc, energia, cfg),
  };

  const instM =
    input.mandante.forcaInstitucional ?? Math.max(forcaGlobal(forcaInicial.mandante), 58);
  const instV =
    input.visitante.forcaInstitucional ?? Math.max(forcaGlobal(forcaInicial.visitante), 58);

  const expulsosMandante = new Set<number>();
  const expulsosVisitante = new Set<number>();
  const amarelos = new Map<number, number>();

  const faixaPrep = prepararPartidaComFaixa(
    {
      timeId: input.mandante.timeId,
      forcaInstitucional: instM,
      escalacao: mandanteEsc,
      elenco: input.mandante.elenco,
      setores: forcaInicial.mandante,
      contexto: ctx,
      ladoMandante: true,
    },
    {
      timeId: input.visitante.timeId,
      forcaInstitucional: instV,
      escalacao: visitanteEsc,
      elenco: input.visitante.elenco,
      setores: forcaInicial.visitante,
      contexto: ctx,
      ladoMandante: false,
    },
    rnd,
    0,
    0,
    mandoMult,
  );

  const probabilidades = faixaPrep.probabilidades;
  const globalM = faixaPrep.forcaMandante;
  const globalV = faixaPrep.forcaVisitante;

  const criseM =
    isClassico ||
    ctx?.necessidadeMandante === 'DESESPERO_REBAIXAMENTO' ||
    ctx?.necessidadeMandante === 'DECISIVO_TITULO';
  const criseV =
    isClassico ||
    ctx?.necessidadeVisitante === 'DESESPERO_REBAIXAMENTO' ||
    ctx?.necessidadeVisitante === 'DECISIVO_TITULO';
  const opcoesM = (minuto = 45): OpcoesForcaSetores => ({
    multiplicadorMando: mandoMult,
    fatorMotivacao: faixaPrep.motivacaoMandante,
    multiplicadorDia: faixaPrep.variacaoDiaMandante,
    jogadoresExpulsos: expulsosMandante,
    criseOuDecisivo: criseM,
    jogandoFora: false,
    minuto,
    rnd,
  });
  const opcoesV = (minuto = 45): OpcoesForcaSetores => ({
    fatorMotivacao: faixaPrep.motivacaoVisitante,
    multiplicadorDia: faixaPrep.variacaoDiaVisitante,
    jogadoresExpulsos: expulsosVisitante,
    criseOuDecisivo: criseV,
    jogandoFora: true,
    minuto,
    rnd,
  });

  const confrontoTatico: ConfrontoTatico = calcularConfrontoTatico(
    input.mandante.esquema,
    input.visitante.esquema,
    mandanteEsc,
    visitanteEsc,
    rnd,
  );

  const taticaM =
    input.mandante.tatica ?? configuracaoPadrao(input.mandante.esquema);
  const taticaV =
    input.visitante.tatica ??
    taticaCpuAutomatica(input.visitante.esquema, input.visitante.timeId);

  const impactoM = resolverImpactoTaticoConfronto({
    dbTaticas: input.dbTaticas,
    taticaPropria: taticaM,
    taticaAdversaria: taticaV,
    titularesProprios: mandanteEsc.map((e) => e.jogador),
    posicoesEscaladas: mandanteEsc.map((e) => e.posicaoEscalada),
    esquemaProprio: input.mandante.esquema,
    esquemaAdversario: input.visitante.esquema,
  });
  const impactoV = resolverImpactoTaticoConfronto({
    dbTaticas: input.dbTaticas,
    taticaPropria: taticaV,
    taticaAdversaria: taticaM,
    titularesProprios: visitanteEsc.map((e) => e.jogador),
    posicoesEscaladas: visitanteEsc.map((e) => e.posicaoEscalada),
    esquemaProprio: input.visitante.esquema,
    esquemaAdversario: input.mandante.esquema,
  });
  let modsM = impactoM.modificadoresFinais;
  let modsV = impactoV.modificadoresFinais;
  if (input.mandante.bonusTreino && Object.keys(input.mandante.bonusTreino).length > 0) {
    modsM = aplicarBonusTreinoModificadores(
      modsM,
      input.mandante.bonusTreino,
      input.mandante.multExecucaoTreino ?? 1,
    );
  }
  if (input.visitante.bonusTreino && Object.keys(input.visitante.bonusTreino).length > 0) {
    modsV = aplicarBonusTreinoModificadores(
      modsV,
      input.visitante.bonusTreino,
      input.visitante.multExecucaoTreino ?? 1,
    );
  }

  const diffJogo = sortearDiffComVariancia(faixaPrep.cruzamento.diff, rnd);
  let golsMandante: number;
  let golsVisitante: number;

  if (indicePartidaDeveSerAlucinado(input.indicePartidaTemporada)) {
    ({ golsMandante, golsVisitante } = placarJogoAlucinado(
      faixaPrep.cruzamento.diff,
      rnd,
    ));
  } else {
    let { lambdaM, lambdaV } = lambdasGolsDeDiff(diffJogo);
    lambdaM *= 0.94 + rnd() * 0.12;
    lambdaV *= 0.94 + rnd() * 0.12;
    ({ lambdaM, lambdaV } = aplicarConfrontoTaticoNosLambdas(lambdaM, lambdaV, confrontoTatico));
    const multGolM =
      (modsM.criacao_jogadas * modsM.eficiencia_finalizacao) /
      Math.max(0.75, modsV.solidez_defensiva);
    const multGolV =
      (modsV.criacao_jogadas * modsV.eficiencia_finalizacao) /
      Math.max(0.75, modsM.solidez_defensiva);
    lambdaM *= Math.max(0.72, Math.min(1.55, multGolM * 0.55 + 0.45));
    lambdaV *= Math.max(0.72, Math.min(1.55, multGolV * 0.55 + 0.45));
    if (isClassico) {
      const media = (lambdaM + lambdaV) / 2;
      lambdaM = lambdaM * 0.85 + media * 0.15;
      lambdaV = lambdaV * 0.85 + media * 0.15;
    }
    golsMandante = amostraPoisson(lambdaM, rnd);
    golsVisitante = amostraPoisson(lambdaV, rnd);
  }

  let minutosGolM = minutosUnicos(golsMandante, rnd);
  let minutosGolV = minutosUnicos(golsVisitante, rnd);

  const eventosGol: Lancamento[] = [];
  for (const minuto of minutosGolM) {
    const autor = escolherArtilheiro(mandanteEsc, rnd);
    const parceiro = rnd() < 0.55 ? escolherArtilheiro(mandanteEsc, rnd) : null;
    const temAssist = parceiro != null && parceiro.id !== autor.id;
    const assistNome = temAssist
      ? parceiro.nome
      : pickAssistente(mandanteEsc, autor.id, rnd);
    const goleiro = nomeGoleiro(visitanteEsc);
    const cat = categoriaGol(rnd, temAssist);
    const vars = varsAtaque(
      varsBase(input, minutosGolM, minutosGolV, minuto),
      input.mandante.nomeCurto,
      input.visitante.nomeCurto,
      autor.nome,
      assistNome,
      goleiro,
    );
    eventosGol.push({
      minuto,
      tipo: 'gol',
      timeId: input.mandante.timeId,
      jogadorId: autor.id,
      jogadorNome: autor.nome,
      ...(temAssist ? { assistenteNome: parceiro.nome } : {}),
      texto: escolherLegenda(cat, rnd, vars),
    });
  }
  for (const minuto of minutosGolV) {
    const autor = escolherArtilheiro(visitanteEsc, rnd);
    const parceiro = rnd() < 0.55 ? escolherArtilheiro(visitanteEsc, rnd) : null;
    const temAssist = parceiro != null && parceiro.id !== autor.id;
    const assistNome = temAssist
      ? parceiro.nome
      : pickAssistente(visitanteEsc, autor.id, rnd);
    const goleiro = nomeGoleiro(mandanteEsc);
    const cat = categoriaGol(rnd, temAssist);
    const vars = varsAtaque(
      varsBase(input, minutosGolM, minutosGolV, minuto),
      input.visitante.nomeCurto,
      input.mandante.nomeCurto,
      autor.nome,
      assistNome,
      goleiro,
    );
    eventosGol.push({
      minuto,
      tipo: 'gol',
      timeId: input.visitante.timeId,
      jogadorId: autor.id,
      jogadorNome: autor.nome,
      ...(temAssist ? { assistenteNome: parceiro.nome } : {}),
      texto: escolherLegenda(cat, rnd, vars),
    });
  }

  const minutosOcupados = new Set([...minutosGolM, ...minutosGolV]);
  const corpo: Lancamento[] = [...eventosGol];

  const ordemTipo = (t: TipoLancamento) =>
    ['chance', 'defesa', 'cartao_amarelo', 'lesao', 'substituicao', 'gol', 'wo', 'intervalo'].indexOf(
      t,
    );

  let posseM = 0;
  let posseV = 0;

  const fadigaPorJogador = new Map<number, number>();
  const multFaltasPorJogador = new Map<number, number>();
  const idsImprovisados = new Set<number>();
  const tudoOuNada =
    ctx?.necessidadeMandante === 'DECISIVO_TITULO' ||
    ctx?.necessidadeVisitante === 'DECISIVO_TITULO';
  const vetoresM = vetoresTaticosDeConfig(input.mandante.tatica);
  const vetoresV = vetoresTaticosDeConfig(input.visitante.tatica);
  const registrarFadiga = (
    jogador: Jogador,
    posicaoEscalada: Posicao,
    multEquipe: number,
    desgasteTatico: number,
    vetores: ReturnType<typeof vetoresTaticosDeConfig>,
    nivelPrep: number,
  ) => {
    const af = afinidadeEmCampo(jogador, posicaoEscalada, opcoesAfinidadeDe(jogador));
    if (af.ehImproviso) idsImprovisados.add(jogador.id);
    multFaltasPorJogador.set(jogador.id, af.multFaltas);
    const prop = getGeneticaSegura(jogador).propensao_lesao;
    const sobrecarga17 = efeitoSobrecargaExtremo17(jogador, posicaoEscalada, 90);
    const paso = fadigaPorMinutoCompleta({
      idade: jogador.idade,
      posicao: posicaoEscalada,
      propensaoLesao: prop,
      rnd,
      multEquipe,
      desgasteTatico,
      ...vetores,
      isClassico,
      tudoOuNada,
      nivelPreparador: nivelPrep,
    });
    fadigaPorJogador.set(
      jogador.id,
      paso * (1 + sobrecarga17.fadigaExtra) * af.multDesgasteEnergia,
    );
  };
  for (const slot of mandanteEsc) {
    registrarFadiga(
      slot.jogador,
      slot.posicaoEscalada,
      input.mandante.fadigaPorMinutoMult ?? 1,
      modsM.desgaste_fisico,
      vetoresM,
      input.mandante.nivelPreparador ?? 10,
    );
  }
  for (const slot of visitanteEsc) {
    registrarFadiga(
      slot.jogador,
      slot.posicaoEscalada,
      input.visitante.fadigaPorMinutoMult ?? 1,
      modsV.desgaste_fisico,
      vetoresV,
      input.visitante.nivelPreparador ?? 10,
    );
  }

  const idsUsadosBancoM = new Set<number>();
  const idsUsadosBancoV = new Set<number>();
  let subsRestantesM = MAX_SUBSTITUICOES_PARTIDA;
  let subsRestantesV = MAX_SUBSTITUICOES_PARTIDA;
  // Quem saiu (cartão vermelho / lesão sem reposição) — não joga mais.
  const foraMandante = expulsosMandante;
  const foraVisitante = expulsosVisitante;

  const ratioPosseM = modsM.posse_bola / Math.max(0.7, modsV.posse_bola);
  const ratioPosseV = modsV.posse_bola / Math.max(0.7, modsM.posse_bola);

  const probChanceMandante = (
    modsAtaq: typeof modsM,
    modsDef: typeof modsV,
    rndFn: () => number,
  ) => {
    const multFin =
      (modsAtaq.criacao_jogadas * modsAtaq.eficiencia_finalizacao) /
      Math.max(0.8, modsDef.solidez_defensiva);
    let probDefesa = Math.min(0.78, Math.max(0.14, 0.38 / multFin));
    const transicao = rndFn() < 0.18;
    const xgTransicao = transicao
      ? modsAtaq.perigo_contra_ataque * modsDef.vulnerabilidade_contra_ataque
      : 1;
    probDefesa /= Math.max(1, xgTransicao * 0.82);
    return { defendido: rndFn() < probDefesa, transicao, xgTransicao };
  };

  const processarLesaoFadiga = (
    minuto: number,
    casa: boolean,
  ): boolean /* wo */ => {
    const esc = casa ? mandanteEsc : visitanteEsc;
    const fora = casa ? foraMandante : foraVisitante;
    const timeId = casa ? input.mandante.timeId : input.visitante.timeId;
    const nomeTime = casa ? input.mandante.nomeCurto : input.visitante.nomeCurto;
    const elenco = casa ? input.mandante.elenco : input.visitante.elenco;
    const idsUsados = casa ? idsUsadosBancoM : idsUsadosBancoV;
    let subsRestantes = casa ? subsRestantesM : subsRestantesV;

    for (const slot of esc) {
      const j = slot.jogador;
      if (fora.has(j.id)) continue;
      const eAgora = energia.get(j.id) ?? j.energia;
      if (
        !chanceLesaoPorFadiga(eAgora, j.atributos.fisicos.fora_por_lesao, rnd, {
          propensaoLesao: getGeneticaSegura(j).propensao_lesao,
        })
      ) {
        continue;
      }

      const gravidade = sortearGravidadeLesaoFadiga(eAgora, rnd);
      const diasBase = diasBaseLesaoFadiga(gravidade, rnd);
      const descricao = descricaoLesaoFadiga(gravidade, rnd);
      lesoesEmCampo.push({
        jogadorId: j.id,
        timeId,
        minuto,
        descricao,
        gravidade,
        diasBase,
      });

      const idsEmCampo = new Set(
        esc.filter((x) => !fora.has(x.jogador.id)).map((x) => x.jogador.id),
      );
      const reserva =
        subsRestantes > 0
          ? escolherReservaParaSub(
              elenco,
              idsEmCampo,
              idsUsados,
              slot.posicaoEscalada,
              rnd,
            )
          : null;

      if (reserva) {
        const idx = esc.findIndex((x) => x.jogador.id === j.id);
        if (idx >= 0) {
          esc[idx] = {
            jogador: reserva,
            posicaoEscalada: slot.posicaoEscalada,
            celulaCampo: slot.celulaCampo,
          };
        }
        idsUsados.add(reserva.id);
        idsUsados.add(j.id);
        energia.set(
          reserva.id,
          energiaInicialPartida(reserva.energia, rnd),
        );
        registrarFadiga(
          reserva,
          slot.posicaoEscalada,
          (casa
            ? input.mandante.fadigaPorMinutoMult
            : input.visitante.fadigaPorMinutoMult) ?? 1,
          casa ? modsM.desgaste_fisico : modsV.desgaste_fisico,
          casa ? vetoresM : vetoresV,
          (casa ? input.mandante.nivelPreparador : input.visitante.nivelPreparador) ?? 10,
        );
        fadigaPorJogador.delete(j.id);
        subsRestantes -= 1;
        if (casa) {
          subsRestantesM = subsRestantes;
          mandanteEsc = [...esc];
        } else {
          subsRestantesV = subsRestantes;
          visitanteEsc = [...esc];
        }
        corpo.push({
          minuto,
          tipo: 'lesao',
          timeId,
          jogadorId: j.id,
          jogadorNome: j.nome,
          texto: `${j.nome} sente ${descricao} (${Math.round(eAgora)}% de energia) e precisa sair.`,
        });
        corpo.push({
          minuto,
          tipo: 'substituicao',
          timeId,
          jogadorId: j.id,
          jogadorIdEntrada: reserva.id,
          jogadorNome: j.nome,
          jogadorNomeEntrada: reserva.nome,
          texto: `Substituição forçada em ${nomeTime}: sai ${j.nome}, entra ${reserva.nome}.`,
        });
      } else {
        fora.add(j.id);
        fadigaPorJogador.delete(j.id);
        if (casa) mandanteEsc = [...esc];
        else visitanteEsc = [...esc];
        corpo.push({
          minuto,
          tipo: 'lesao',
          timeId,
          jogadorId: j.id,
          jogadorNome: j.nome,
          texto: `${j.nome} se lesiona (${descricao}) sem substituições restantes — ${nomeTime} fica com um a menos.`,
        });
      }

      minutosOcupados.add(minuto);

      if (timeEmWO(casa ? mandanteEsc : visitanteEsc, fora)) {
        woTimeId = timeId;
        corpo.push({
          minuto,
          tipo: 'wo',
          timeId,
          texto: `W.O.: ${nomeTime} não tem jogadores suficientes em campo (mínimo 6 de linha + goleiro). Partida encerrada em 3 a 0.`,
        });
        return true;
      }
      // Uma lesão por minuto no máximo.
      return false;
    }
    return false;
  };

  const processarBloqueioLesaoEnergia = (
    minuto: number,
    casa: boolean,
  ): boolean /* wo */ => {
    const esc = casa ? mandanteEsc : visitanteEsc;
    const fora = casa ? foraMandante : foraVisitante;
    const timeId = casa ? input.mandante.timeId : input.visitante.timeId;
    const nomeTime = casa ? input.mandante.nomeCurto : input.visitante.nomeCurto;
    const elenco = casa ? input.mandante.elenco : input.visitante.elenco;
    const idsUsados = casa ? idsUsadosBancoM : idsUsadosBancoV;
    let subsRestantes = casa ? subsRestantesM : subsRestantesV;

    for (const slot of esc) {
      const j = slot.jogador;
      if (fora.has(j.id)) continue;
      const eAgora = energia.get(j.id) ?? j.energia;
      const snapshot = { ...j, energia: eAgora };
      if (!bloqueadoPorLesaoComEnergiaBaixa(snapshot)) continue;

      const motivo =
        mensagemBloqueioLesaoEnergia(snapshot) ??
        `${j.nome} está lesionado com energia abaixo de ${ENERGIA_MINIMA_COM_LESAO}% e precisa sair.`;

      const idsEmCampo = new Set(
        esc.filter((x) => !fora.has(x.jogador.id)).map((x) => x.jogador.id),
      );
      const reserva =
        subsRestantes > 0
          ? escolherReservaParaSub(
              elenco,
              idsEmCampo,
              idsUsados,
              slot.posicaoEscalada,
              rnd,
            )
          : null;

      if (reserva) {
        const idx = esc.findIndex((x) => x.jogador.id === j.id);
        if (idx >= 0) {
          esc[idx] = {
            jogador: reserva,
            posicaoEscalada: slot.posicaoEscalada,
            celulaCampo: slot.celulaCampo,
          };
        }
        idsUsados.add(reserva.id);
        idsUsados.add(j.id);
        energia.set(reserva.id, energiaInicialPartida(reserva.energia, rnd));
        registrarFadiga(
          reserva,
          slot.posicaoEscalada,
          (casa
            ? input.mandante.fadigaPorMinutoMult
            : input.visitante.fadigaPorMinutoMult) ?? 1,
          casa ? modsM.desgaste_fisico : modsV.desgaste_fisico,
          casa ? vetoresM : vetoresV,
          (casa ? input.mandante.nivelPreparador : input.visitante.nivelPreparador) ?? 10,
        );
        fadigaPorJogador.delete(j.id);
        subsRestantes -= 1;
        if (casa) {
          subsRestantesM = subsRestantes;
          mandanteEsc = [...esc];
        } else {
          subsRestantesV = subsRestantes;
          visitanteEsc = [...esc];
        }
        corpo.push({
          minuto,
          tipo: 'lesao',
          timeId,
          jogadorId: j.id,
          texto: motivo,
        });
        corpo.push({
          minuto,
          tipo: 'substituicao',
          timeId,
          jogadorId: j.id,
          jogadorIdEntrada: reserva.id,
          texto: `Substituição médica em ${nomeTime}: sai ${j.nome} (lesão + energia ${Math.round(eAgora)}%), entra ${reserva.nome}.`,
        });
      } else {
        fora.add(j.id);
        fadigaPorJogador.delete(j.id);
        if (casa) mandanteEsc = [...esc];
        else visitanteEsc = [...esc];
        corpo.push({
          minuto,
          tipo: 'lesao',
          timeId,
          jogadorId: j.id,
          texto: `${motivo} Sem substituições — ${nomeTime} fica com um a menos.`,
        });
      }

      minutosOcupados.add(minuto);
      if (timeEmWO(casa ? mandanteEsc : visitanteEsc, fora)) {
        woTimeId = timeId;
        corpo.push({
          minuto,
          tipo: 'wo',
          timeId,
          texto: `W.O.: ${nomeTime} não tem jogadores suficientes em campo (mínimo 6 de linha + goleiro). Partida encerrada em 3 a 0.`,
        });
        return true;
      }
      return false;
    }
    return false;
  };

  let minutoFinal = 90;
  for (let minuto = 1; minuto <= 90; minuto++) {
    const aHomemMenosM = foraMandante.size > 0;
    const aHomemMenosV = foraVisitante.size > 0;
    // Só quem está em campo gasta energia.
    for (const slot of mandanteEsc) {
      if (foraMandante.has(slot.jogador.id)) continue;
      const id = slot.jogador.id;
      const e = energia.get(id) ?? slot.jogador.energia;
      const basePaso = fadigaPorJogador.get(id) ?? cfg.fadigaPorMinuto;
      const prop = getGeneticaSegura(slot.jogador).propensao_lesao;
      const multMin = multiplicadorDrainGeneticaNoMinuto(prop, minuto);
      const multHomem = aHomemMenosM ? 1.18 : 1;
      energia.set(id, Math.max(0, e - basePaso * multMin * multHomem));
    }
    for (const slot of visitanteEsc) {
      if (foraVisitante.has(slot.jogador.id)) continue;
      const id = slot.jogador.id;
      const e = energia.get(id) ?? slot.jogador.energia;
      const basePaso = fadigaPorJogador.get(id) ?? cfg.fadigaPorMinuto;
      const prop = getGeneticaSegura(slot.jogador).propensao_lesao;
      const multMin = multiplicadorDrainGeneticaNoMinuto(prop, minuto);
      const multHomem = aHomemMenosV ? 1.18 : 1;
      energia.set(id, Math.max(0, e - basePaso * multMin * multHomem));
    }

    if (processarLesaoFadiga(minuto, true) || processarLesaoFadiga(minuto, false)) {
      minutoFinal = minuto;
      break;
    }

    // Lesionado (contusão+) com energia caindo abaixo de 60% → saída forçada.
    if (
      processarBloqueioLesaoEnergia(minuto, true) ||
      processarBloqueioLesaoEnergia(minuto, false)
    ) {
      minutoFinal = minuto;
      break;
    }

    const fadigaRatio = minuto > 45 ? 0.92 : 1;
    const forcaM = calcularForcaSetores(mandanteEsc, energia, cfg, opcoesM());
    const forcaV = calcularForcaSetores(visitanteEsc, energia, cfg, opcoesV());
    const urgM = modificadoresUrgencia(
      ctx?.necessidadeMandante ?? 'NORMAL',
      minuto,
      golsMandante,
      golsVisitante,
    );
    const urgV = modificadoresUrgencia(
      ctx?.necessidadeVisitante ?? 'NORMAL',
      minuto,
      golsVisitante,
      golsMandante,
    );
    const pressaoM =
      intensidadeAtaque(forcaM, forcaV, confrontoTatico.multPressaoAtaque) *
      fadigaRatio *
      urgM.ataque *
      (isClassico ? 0.92 : 1) *
      Math.max(0.55, Math.min(1.65, ratioPosseM));
    const pressaoV =
      intensidadeAtaque(forcaV, forcaM, confrontoTatico.multPressaoAtaque) *
      fadigaRatio *
      urgV.ataque *
      (isClassico ? 0.92 : 1) *
      Math.max(0.55, Math.min(1.65, ratioPosseV));
    posseM += pressaoM + 0.02;
    posseV += pressaoV + 0.02;

    if (minutosOcupados.has(minuto)) continue;

    if (rnd() < pressaoM) {
      const autor = escolherArtilheiro(mandanteEsc, rnd, foraMandante);
      const assistNome = pickAssistente(
        escalacaoAtiva(mandanteEsc, foraMandante),
        autor.id,
        rnd,
      );
      const { defendido } = probChanceMandante(modsM, modsV, rnd);
      const goleiro = nomeGoleiro(escalacaoAtiva(visitanteEsc, foraVisitante));
      const vars = varsAtaque(
        varsBase(input, minutosGolM, minutosGolV, minuto),
        input.mandante.nomeCurto,
        input.visitante.nomeCurto,
        autor.nome,
        assistNome,
        goleiro,
      );
      const cat = defendido
        ? 'defesa'
        : rnd() < 0.12
          ? 'trave'
          : rnd() < 0.45
            ? 'posse'
            : 'perigo';
      corpo.push({
        minuto,
        tipo: defendido ? 'defesa' : 'chance',
        timeId: defendido ? input.visitante.timeId : input.mandante.timeId,
        jogadorId: autor.id,
        texto: escolherLegenda(cat, rnd, vars),
      });
      minutosOcupados.add(minuto);
    } else if (rnd() < pressaoV) {
      const autor = escolherArtilheiro(visitanteEsc, rnd, foraVisitante);
      const assistNome = pickAssistente(
        escalacaoAtiva(visitanteEsc, foraVisitante),
        autor.id,
        rnd,
      );
      const { defendido } = probChanceMandante(modsV, modsM, rnd);
      const goleiro = nomeGoleiro(escalacaoAtiva(mandanteEsc, foraMandante));
      const vars = varsAtaque(
        varsBase(input, minutosGolM, minutosGolV, minuto),
        input.visitante.nomeCurto,
        input.mandante.nomeCurto,
        autor.nome,
        assistNome,
        goleiro,
      );
      const cat = defendido
        ? 'defesa'
        : rnd() < 0.12
          ? 'trave'
          : rnd() < 0.45
            ? 'posse'
            : 'perigo';
      corpo.push({
        minuto,
        tipo: defendido ? 'defesa' : 'chance',
        timeId: defendido ? input.mandante.timeId : input.visitante.timeId,
        jogadorId: autor.id,
        texto: escolherLegenda(cat, rnd, vars),
      });
      minutosOcupados.add(minuto);
    } else if (
      minuto >= 12 &&
      rnd() <
        probabilidadeCartaoAmarelo(
          escalacaoAtiva(mandanteEsc, foraMandante),
          escalacaoAtiva(visitanteEsc, foraVisitante),
        ) *
          ((modsM.incidencia_faltas + modsV.incidencia_faltas) / 2)
    ) {
      const casa = rnd() < pressaoM / (pressaoM + pressaoV + 0.001);
      const esc = casa ? mandanteEsc : visitanteEsc;
      const fora = casa ? foraMandante : foraVisitante;
      const timeId = casa ? input.mandante.timeId : input.visitante.timeId;
      const ataque = casa ? input.mandante.nomeCurto : input.visitante.nomeCurto;
      const defesa = casa ? input.visitante.nomeCurto : input.mandante.nomeCurto;
      const j = escolherJogadorCartao(esc, rnd, fora, multFaltasPorJogador);
      const agr = metricasMotorDeAtributos(j.atributos).agressividade;
      const multFaltaJog = multFaltasPorJogador.get(j.id) ?? 1;
      const segunda = (amarelos.get(j.id) ?? 0) >= 1;
      // Improviso defensivo com defesa baixa (+22% faltas) eleva cartão/expulsão.
      const expulsaoDireta =
        !segunda && rnd() < (0.04 + (agr / 100) * 0.06) * Math.min(1.35, multFaltaJog);
      const expulso = segunda || expulsaoDireta;
      if (expulso) {
        fora.add(j.id);
        fadigaPorJogador.delete(j.id);
      }
      amarelos.set(j.id, (amarelos.get(j.id) ?? 0) + 1);

      const vars = varsAtaque(
        varsBase(input, minutosGolM, minutosGolV, minuto),
        ataque,
        defesa,
        j.nome,
        pickAssistente(escalacaoAtiva(esc, fora), j.id, rnd),
        nomeGoleiro(
          escalacaoAtiva(
            casa ? visitanteEsc : mandanteEsc,
            casa ? foraVisitante : foraMandante,
          ),
        ),
      );
      corpo.push({
        minuto,
        tipo: 'cartao_amarelo',
        timeId,
        jogadorId: j.id,
        jogadorNome: j.nome,
        cartao: expulso ? 'vermelho' : 'amarelo',
        texto: expulso
          ? `${escolherLegenda('cartao', rnd, vars)} Expulsão — time volta a jogar com um a menos.`
          : escolherLegenda('cartao', rnd, vars),
      });
      minutosOcupados.add(minuto);

      if (expulso && timeEmWO(esc, fora)) {
        woTimeId = timeId;
        corpo.push({
          minuto,
          tipo: 'wo',
          timeId,
          texto: `W.O.: ${ataque} fica abaixo do mínimo de atletas em campo. Partida encerrada em 3 a 0.`,
        });
        minutoFinal = minuto;
        break;
      }
    }
  }

  if (woTimeId) {
    minutosGolM = minutosGolM.filter((m) => m <= minutoFinal);
    minutosGolV = minutosGolV.filter((m) => m <= minutoFinal);
    // Remove gols narrados após o W.O.; placar oficial vira 3–0.
    for (let i = corpo.length - 1; i >= 0; i--) {
      const l = corpo[i]!;
      if (l.minuto > minutoFinal || (l.tipo === 'gol' && l.minuto > minutoFinal)) {
        corpo.splice(i, 1);
      }
    }
    if (woTimeId === input.mandante.timeId) {
      golsMandante = 0;
      golsVisitante = 3;
    } else {
      golsMandante = 3;
      golsVisitante = 0;
    }
  }

  corpo.sort((a, b) => {
    if (a.minuto !== b.minuto) return a.minuto - b.minuto;
    return ordemTipo(a.tipo) - ordemTipo(b.tipo);
  });

  const golsMInt = minutosGolM.filter((m) => m <= 45).length;
  const golsVInt = minutosGolV.filter((m) => m <= 45).length;
  const primeiroTempo = corpo.filter((l) => l.minuto <= 45);
  const segundoTempo = corpo.filter((l) => l.minuto > 45 && l.minuto <= minutoFinal);

  const vars0 = {
    ...varsBase(input, minutosGolM, minutosGolV, 0),
    TIME_ATAQUE: input.mandante.nomeCurto,
    JOGADOR: '',
    ASSISTENTE: pickAssistente(mandanteEsc, mandanteEsc[0]?.jogador.id ?? 0, rnd),
    GOLEIRO: nomeGoleiro(visitanteEsc),
  } as VarsNarracao;
  lancamentos.push({
    minuto: 0,
    tipo: 'inicio',
    texto: escolherLegendaEntre('abertura', rnd, vars0, 0, 3),
  });
  lancamentos.push(...primeiroTempo);
  if (!woTimeId || minutoFinal >= 45) {
    const varsInt = {
      ...varsBase(input, minutosGolM, minutosGolV, 45),
      TIME_ATAQUE: input.mandante.nomeCurto,
      JOGADOR: '',
      ASSISTENTE: '',
      GOLEIRO: '',
      PLACAR: `${golsMInt} x ${golsVInt}`,
    } as VarsNarracao;
    lancamentos.push({
      minuto: 45,
      tipo: 'intervalo',
      texto: escolherLegendaEntre('intervalo', rnd, varsInt, 0, 1),
    });
  }
  if (!woTimeId || minutoFinal > 45) {
    const vars2T = {
      ...varsBase(input, minutosGolM, minutosGolV, 46),
      TIME_ATAQUE: rnd() < 0.5 ? input.mandante.nomeCurto : input.visitante.nomeCurto,
      JOGADOR: '',
      ASSISTENTE: '',
      GOLEIRO: '',
    } as VarsNarracao;
    lancamentos.push({
      minuto: 46,
      tipo: 'inicio',
      texto: escolherLegendaEntre('abertura', rnd, vars2T, 4, 5),
    });
    lancamentos.push(...segundoTempo);
  }
  const placarFinal = `${golsMandante} x ${golsVisitante}`;
  const varsFim = {
    ...varsBase(input, minutosGolM, minutosGolV, minutoFinal),
    PLACAR: placarFinal,
    JOGADOR: '',
    ASSISTENTE: '',
    GOLEIRO: '',
  } as VarsNarracao;
  const linhaFim = woTimeId
    ? `Árbitro encerra: W.O. ${placarFinal}.`
    : golsMandante === golsVisitante
      ? escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 1, 1)
      : rnd() < 0.5
        ? escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 0, 0)
        : escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 2, 2);
  lancamentos.push({
    minuto: minutoFinal,
    tipo: 'fim',
    texto: linhaFim,
  });

  const energiaFinal = [...energia.entries()].map(([id, e]) => ({
    id,
    energia: Math.round(e * 10) / 10,
  }));

  const momento = gerarGraficoMomentum({
    minutoFinal,
    lancamentos,
    mandanteId: input.mandante.timeId,
    visitanteId: input.visitante.timeId,
    taticaMandante: taticaM,
    taticaVisitante: taticaV,
    skillMandante: globalM,
    skillVisitante: globalV,
    seed: input.seed,
  });

  const estatisticas = construirEstatisticasPartida(
    lancamentos,
    golsMandante,
    golsVisitante,
    input.mandante.timeId,
    input.visitante.timeId,
    posseM,
    posseV,
    momento,
    rnd,
  );

  const preJogo: PreJogoInfo = {
    probabilidades,
    forcaMandante: Math.round(globalM * 10) / 10,
    forcaVisitante: Math.round(globalV * 10) / 10,
    mandoBonus: mandoMult,
    confrontoTatico,
    cruzamento: faixaPrep.cruzamento,
  };

  return {
    mandanteId: input.mandante.timeId,
    visitanteId: input.visitante.timeId,
    golsMandante,
    golsVisitante,
    lancamentos,
    energiaFinal,
    forcaInicial,
    probabilidades,
    estatisticas,
    preJogo,
    simSeed: input.seed,
    impactoTatico: { mandante: impactoM, visitante: impactoV },
    ...(lesoesEmCampo.length > 0 ? { lesoesEmCampo } : {}),
    ...(woTimeId ? { woTimeId } : {}),
    ...(idsImprovisados.size > 0 ? { idsImprovisados: [...idsImprovisados] } : {}),
  };
}

/** Recuperação etária aproximada (~3 dias entre rodadas). Preferir recuperarEnergiaUmDia no calendário. */
export function recuperarEnergiaEntreRodadas(jogadores: Jogador[]): Jogador[] {
  const rnd = criarRng(Date.now() ^ 0x7e57);
  return jogadores.map((j) => {
    const ganhoDia = recuperacaoDiariaEnergia(j.idade, rnd);
    const ganho = ganhoDia * 3;
    return {
      ...j,
      energia: Math.min(100, Math.round((j.energia + ganho) * 10) / 10),
    };
  });
}