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
import type { EsquemaTatico, Jogador, Posicao } from '../types/schema';
import { type ContextoDinamicoPartida, modificadoresUrgencia } from './matchContext';
import {
  construirEstatisticasPartida,
  type EstatisticasPartida,
  type MomentoAtaque,
  type PreJogoInfo,
} from './matchStats';
import { prepararPartidaComFaixa } from './matchProbabilidades';
import {
  indicePartidaDeveSerAlucinado,
  lambdasGolsDeDiff,
  placarJogoAlucinado,
  sortearDiffComVariancia,
} from './matchResultadoCore';
import { rendimentoJogadorEmCampo } from './matchRendimentoCampo';
import {
  aplicarConfrontoTaticoNosLambdas,
  calcularConfrontoTatico,
  type ConfrontoTatico,
} from './matchTaticaConfronto';
import { multiplicadorDesempenhoPosicao } from './posicaoCompatibilidade';
import type { DatabaseTaticas } from '../types/tactics';
import type { ConfiguracaoTaticaClube } from '../types/tactics';
import {
  configuracaoPadrao,
  resolverImpactoTaticoConfronto,
  taticaCpuAutomatica,
  type ResultadoAvaliacaoTatica,
} from './tacticsEngine';

export const MOTOR_DEFAULTS = {
  improvisacaoMult: 0.8,
  energiaLimiteFadiga: 60,
  fadigaPorMinuto: 0.5,
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
  /** Estilo + instruções (formação derivada do esquema se omitida). */
  tatica?: ConfiguracaoTaticaClube;
}

export interface MatchSimConfig {
  bonusMandoCampo: number;
  improvisacaoMult?: number;
  energiaLimiteFadiga?: number;
  fadigaPorMinuto?: number;
}

export type TipoLancamento =
  | 'inicio'
  | 'chance'
  | 'defesa'
  | 'gol'
  | 'cartao_amarelo'
  | 'intervalo'
  | 'fim';

export interface Lancamento {
  minuto: number;
  tipo: TipoLancamento;
  timeId?: string;
  jogadorId?: number;
  texto: string;
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
}

function jogadorAptoEscalacao(j: Jogador): boolean {
  return !j.lesao || j.lesao.diasRestantes <= 0;
}

export function montarEscalacao(elenco: Jogador[], esquema: EsquemaTatico): JogadorEmCampo[] {
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const ordenado = [...elenco].filter(jogadorAptoEscalacao).sort((a, b) => b.overall - a.overall);
  const usados = new Set<number>();
  const escalacao: JogadorEmCampo[] = [];

  for (const slot of slots) {
    const titularMesmaPos = ordenado.find((j) => !usados.has(j.id) && j.posicao === slot);
    const improvisado =
      titularMesmaPos ??
      ordenado.find((j) => !usados.has(j.id) && j.status_escalacao === 'TITULAR');
    const fallback = improvisado ?? ordenado.find((j) => !usados.has(j.id));
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
  cfg: Required<Pick<MatchSimConfig, 'improvisacaoMult' | 'energiaLimiteFadiga'>>,
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
    const rend = rendimentoJogadorEmCampo({
      jogador,
      posicaoEscalada,
      celula: celulaCampo,
      energia,
      energiaLimiteFadiga: cfg.energiaLimiteFadiga,
      improvisacaoMult: cfg.improvisacaoMult,
      fatorMotivacao: opcoes.fatorMotivacao,
      fatorMoralTime: opcoes.fatorMoralTime,
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

function escolherJogadorCartao(escalacao: JogadorEmCampo[], rnd: () => number): Jogador {
  const pesos = escalacao.map(({ jogador }) => {
    const agr = metricasMotorDeAtributos(jogador.atributos).agressividade;
    return { jogador, w: 0.35 + agr };
  });
  const total = pesos.reduce((s, p) => s + p.w, 0);
  let t = rnd() * total;
  for (const p of pesos) {
    t -= p.w;
    if (t <= 0) return p.jogador;
  }
  return pesos[pesos.length - 1].jogador;
}

function escolherArtilheiro(escalacao: JogadorEmCampo[], rnd: () => number): Jogador {
  const pesos = escalacao.map(({ jogador, posicaoEscalada }) => {
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
  return pesos[pesos.length - 1].jogador;
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
    energiaLimiteFadiga:
      input.config.energiaLimiteFadiga ?? MOTOR_DEFAULTS.energiaLimiteFadiga,
    fadigaPorMinuto: fadigaBase * (isClassico ? 1.28 : 1),
    bonusMando: input.config.bonusMandoCampo,
  };

  const mandanteEsc =
    input.mandante.escalacao ??
    montarEscalacao(input.mandante.elenco, input.mandante.esquema);
  const visitanteEsc =
    input.visitante.escalacao ??
    montarEscalacao(input.visitante.elenco, input.visitante.esquema);

  const energia = new Map<number, number>();
  for (const j of [...mandanteEsc, ...visitanteEsc]) {
    energia.set(j.jogador.id, j.jogador.energia);
  }

  const rnd = criarRng(input.seed ?? Date.now());
  const lancamentos: Lancamento[] = [];

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

  const opcoesM = (): OpcoesForcaSetores => ({
    multiplicadorMando: mandoMult,
    fatorMotivacao: faixaPrep.motivacaoMandante,
    multiplicadorDia: faixaPrep.variacaoDiaMandante,
    jogadoresExpulsos: expulsosMandante,
  });
  const opcoesV = (): OpcoesForcaSetores => ({
    fatorMotivacao: faixaPrep.motivacaoVisitante,
    multiplicadorDia: faixaPrep.variacaoDiaVisitante,
    jogadoresExpulsos: expulsosVisitante,
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
  const modsM = impactoM.modificadoresFinais;
  const modsV = impactoV.modificadoresFinais;

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

  const minutosGolM = minutosUnicos(golsMandante, rnd);
  const minutosGolV = minutosUnicos(golsVisitante, rnd);

  const eventosGol: Lancamento[] = [];
  for (const minuto of minutosGolM) {
    const autor = escolherArtilheiro(mandanteEsc, rnd);
    const parceiro = rnd() < 0.55 ? escolherArtilheiro(mandanteEsc, rnd) : null;
    const assistNome =
      parceiro && parceiro.id !== autor.id
        ? parceiro.nome
        : pickAssistente(mandanteEsc, autor.id, rnd);
    const goleiro = nomeGoleiro(visitanteEsc);
    const cat = categoriaGol(rnd, parceiro != null && parceiro.id !== autor.id);
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
      texto: escolherLegenda(cat, rnd, vars),
    });
  }
  for (const minuto of minutosGolV) {
    const autor = escolherArtilheiro(visitanteEsc, rnd);
    const parceiro = rnd() < 0.55 ? escolherArtilheiro(visitanteEsc, rnd) : null;
    const assistNome =
      parceiro && parceiro.id !== autor.id
        ? parceiro.nome
        : pickAssistente(visitanteEsc, autor.id, rnd);
    const goleiro = nomeGoleiro(mandanteEsc);
    const cat = categoriaGol(rnd, parceiro != null && parceiro.id !== autor.id);
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
      texto: escolherLegenda(cat, rnd, vars),
    });
  }

  const minutosOcupados = new Set([...minutosGolM, ...minutosGolV]);
  const corpo: Lancamento[] = [...eventosGol];

  const ordemTipo = (t: TipoLancamento) =>
    ['chance', 'defesa', 'cartao_amarelo', 'gol', 'intervalo'].indexOf(t);

  let posseM = 0;
  let posseV = 0;
  const momento: MomentoAtaque[] = [];

  const fadigaPorJogador = new Map<number, number>();
  for (const { jogador } of mandanteEsc) {
    fadigaPorJogador.set(
      jogador.id,
      cfg.fadigaPorMinuto *
        (input.mandante.fadigaPorMinutoMult ?? 1) *
        modsM.desgaste_fisico,
    );
  }
  for (const { jogador } of visitanteEsc) {
    fadigaPorJogador.set(
      jogador.id,
      cfg.fadigaPorMinuto *
        (input.visitante.fadigaPorMinutoMult ?? 1) *
        modsV.desgaste_fisico,
    );
  }

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

  for (let minuto = 1; minuto <= 90; minuto++) {
    for (const [id, e] of energia) {
      const paso = fadigaPorJogador.get(id) ?? cfg.fadigaPorMinuto;
      energia.set(id, Math.max(0, e - paso));
    }

    if (minutosOcupados.has(minuto)) continue;

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
    momento.push({
      minuto,
      valor: (pressaoM - pressaoV) * 48,
      golMandante: minutosGolM.includes(minuto),
      golVisitante: minutosGolV.includes(minuto),
    });

    if (rnd() < pressaoM) {
      const autor = escolherArtilheiro(mandanteEsc, rnd);
      const assistNome = pickAssistente(mandanteEsc, autor.id, rnd);
      const { defendido } = probChanceMandante(modsM, modsV, rnd);
      const goleiro = nomeGoleiro(visitanteEsc);
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
      const autor = escolherArtilheiro(visitanteEsc, rnd);
      const assistNome = pickAssistente(visitanteEsc, autor.id, rnd);
      const { defendido } = probChanceMandante(modsV, modsM, rnd);
      const goleiro = nomeGoleiro(mandanteEsc);
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
        probabilidadeCartaoAmarelo(mandanteEsc, visitanteEsc) *
          ((modsM.incidencia_faltas + modsV.incidencia_faltas) / 2)
    ) {
      const casa = rnd() < pressaoM / (pressaoM + pressaoV + 0.001);
      const esc = casa ? mandanteEsc : visitanteEsc;
      const timeId = casa ? input.mandante.timeId : input.visitante.timeId;
      const ataque = casa ? input.mandante.nomeCurto : input.visitante.nomeCurto;
      const defesa = casa ? input.visitante.nomeCurto : input.mandante.nomeCurto;
      const j = escolherJogadorCartao(esc, rnd);
      const agr = metricasMotorDeAtributos(j.atributos).agressividade;
      const segunda = (amarelos.get(j.id) ?? 0) >= 1;
      const expulsaoDireta = !segunda && rnd() < 0.04 + (agr / 100) * 0.06;
      const expulso = segunda || expulsaoDireta;
      if (expulso) {
        if (casa) expulsosMandante.add(j.id);
        else expulsosVisitante.add(j.id);
      }
      amarelos.set(j.id, (amarelos.get(j.id) ?? 0) + 1);

      const vars = varsAtaque(
        varsBase(input, minutosGolM, minutosGolV, minuto),
        ataque,
        defesa,
        j.nome,
        pickAssistente(esc, j.id, rnd),
        nomeGoleiro(casa ? visitanteEsc : mandanteEsc),
      );
      corpo.push({
        minuto,
        tipo: 'cartao_amarelo',
        timeId,
        jogadorId: j.id,
        texto: expulso
          ? `${escolherLegenda('cartao', rnd, vars)} Expulsão — time volta a jogar com um a menos.`
          : escolherLegenda('cartao', rnd, vars),
      });
      minutosOcupados.add(minuto);
    }
  }

  corpo.sort((a, b) => {
    if (a.minuto !== b.minuto) return a.minuto - b.minuto;
    return ordemTipo(a.tipo) - ordemTipo(b.tipo);
  });

  const golsMInt = minutosGolM.filter((m) => m <= 45).length;
  const golsVInt = minutosGolV.filter((m) => m <= 45).length;
  const primeiroTempo = corpo.filter((l) => l.minuto <= 45);
  const segundoTempo = corpo.filter((l) => l.minuto > 45);

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
  const placarFinal = `${golsMandante} x ${golsVisitante}`;
  const varsFim = {
    ...varsBase(input, minutosGolM, minutosGolV, 90),
    PLACAR: placarFinal,
    JOGADOR: '',
    ASSISTENTE: '',
    GOLEIRO: '',
  } as VarsNarracao;
  const linhaFim =
    golsMandante === golsVisitante
      ? escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 1, 1)
      : rnd() < 0.5
        ? escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 0, 0)
        : escolherLegendaEntre('fim', rnd, varsFim as VarsNarracao, 2, 2);
  lancamentos.push({
    minuto: 90,
    tipo: 'fim',
    texto: linhaFim,
  });

  const energiaFinal = [...energia.entries()].map(([id, e]) => ({
    id,
    energia: Math.round(e * 10) / 10,
  }));

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
  };
}

export function recuperarEnergiaEntreRodadas(jogadores: Jogador[]): Jogador[] {
  return jogadores.map((j) => {
    const ganho =
      j.status_escalacao === 'RESERVA'
        ? MOTOR_DEFAULTS.recuperacaoReserva
        : MOTOR_DEFAULTS.recuperacaoTitular;
    return {
      ...j,
      energia: Math.min(100, Math.round((j.energia + ganho) * 10) / 10),
    };
  });
}