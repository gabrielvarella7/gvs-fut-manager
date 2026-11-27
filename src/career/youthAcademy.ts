import { embaralharNomesVarzea } from '../data/jogadoresVarzea';
import { criarRng } from '../engine/matchEngine';
import type {
  AtributosJogador,
  FormacaoBaseJogador,
  Jogador,
  Posicao,
  Time,
} from '../types/schema';
import type {
  CategoriaBase,
  EstadoMundoClube,
  FocoCategoriaBase,
  FocoCategoriaBaseLegado,
  JovemSub20,
  SugestaoPromocaoBase,
  TierCategoriaBase,
} from '../types/mundoClube';
import {
  gerarAtributosNovos,
  overallDeAtributos,
} from './atributosJogador';
import {
  gerarGeneticaBase,
  POSICOES_LIQUIDEZ,
  POSICOES_TODAS,
  tetoPotencialJogador,
  fatorAbsorcaoJogador,
} from './genetica';
import { gerarContratoLeiPele, calcularValorMercado } from './mercadoTransferencias';
import { nivelDiretorBase } from './staffEfeitos';
import type { NoticiaCarreira } from './types';
import type { EstadoComercial } from '../types/commercial';

/** Teto do plantel profissional (titulares + reservas + não relacionados). */
export const TETO_PLANTEL_PROFISSIONAL = 30;

export const MSG_PLANTEL_CHEIO =
  'Plantel cheio, para subir um atleta precisa vender ou dispensar alguém.';

/** 1º contrato profissional: 36 meses, R$15–35k/mês, 100% direitos. */
export const PRIMEIRO_CONTRATO_MESES = 36;
export const SALARIO_BASE_MIN = 15_000;
export const SALARIO_BASE_MAX = 35_000;

const TIER_RANGES: Record<
  TierCategoriaBase,
  { ovrMin: number; ovrMax: number; tetoMin: number; tetoMax: number }
> = {
  FRACO: { ovrMin: 54, ovrMax: 60, tetoMin: 61, tetoMax: 66 },
  MEDIO: { ovrMin: 61, ovrMax: 65, tetoMin: 68, tetoMax: 74 },
  BOM: { ovrMin: 65, ovrMax: 70, tetoMin: 76, tetoMax: 83 },
  CRAQUE: { ovrMin: 70, ovrMax: 75, tetoMin: 85, tetoMax: 94 },
};

export function normalizarFocoBase(
  foco: FocoCategoriaBase | FocoCategoriaBaseLegado | string | undefined | null,
): FocoCategoriaBase {
  if (foco === 'VENDER' || foco === 'VENDER_PROFISSIONALIZAR') return 'VENDER_PROFISSIONALIZAR';
  if (foco === 'TITULARES_CLUBE') return 'TITULARES_CLUBE';
  if (foco === 'PROFISSIONALIZAR' || foco === 'EQUILIBRADO') return 'EQUILIBRADO';
  return 'EQUILIBRADO';
}

export function rotuloFocoBase(foco: FocoCategoriaBase | FocoCategoriaBaseLegado | string): string {
  const n = normalizarFocoBase(foco);
  if (n === 'VENDER_PROFISSIONALIZAR') return 'Foco: vender / profissionalizar';
  if (n === 'TITULARES_CLUBE') return 'Foco: titulares do clube';
  return 'Foco: equilibrado';
}

export function rotuloTierBase(tier: TierCategoriaBase): string {
  if (tier === 'FRACO') return 'Fraco';
  if (tier === 'MEDIO') return 'Médio';
  if (tier === 'BOM') return 'Bom';
  return 'Craque';
}

/** CT Base Nv5 quando qualidade ≥ 16 (escala 1–20). */
export function ctBaseNivel5(qualidade: number): boolean {
  return qualidade >= 16;
}

export function pesosTierBase(qualidade: number, diretorNivel: number): Record<TierCategoriaBase, number> {
  const elite = ctBaseNivel5(qualidade) && diretorNivel >= 18;
  if (elite) {
    return { FRACO: 18, MEDIO: 33, BOM: 34, CRAQUE: 15 };
  }
  // Clube médio (spec)
  return { FRACO: 42, MEDIO: 35, BOM: 18, CRAQUE: 5 };
}

function sortearTier(pesos: Record<TierCategoriaBase, number>, rnd: () => number): TierCategoriaBase {
  const total = pesos.FRACO + pesos.MEDIO + pesos.BOM + pesos.CRAQUE;
  let r = rnd() * total;
  for (const t of ['FRACO', 'MEDIO', 'BOM', 'CRAQUE'] as TierCategoriaBase[]) {
    r -= pesos[t];
    if (r <= 0) return t;
  }
  return 'MEDIO';
}

function randInt(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

function proximoIdJogador(jogadores: Jogador[], sub20: JovemSub20[]): number {
  const maxPro = jogadores.reduce((m, j) => Math.max(m, j.id), 0);
  const maxSub = sub20.reduce((m, j) => Math.max(m, j.id), 0);
  return Math.max(maxPro, maxSub) + 1;
}

function idadeMediaPosicao(elenco: Jogador[], pos: Posicao): number {
  const g = elenco.filter((j) => j.posicao === pos);
  if (g.length === 0) return 99;
  return g.reduce((s, j) => s + j.idade, 0) / g.length;
}

function contagemPosicao(elenco: Jogador[], pos: Posicao): number {
  return elenco.filter((j) => j.posicao === pos).length;
}

/** Escolhe posição conforme foco do diretor + carências do plantel. */
export function escolherPosicaoBase(
  foco: FocoCategoriaBase,
  elencoPro: Jogador[],
  rnd: () => number,
): Posicao {
  const f = normalizarFocoBase(foco);
  if (f === 'VENDER_PROFISSIONALIZAR') {
    return POSICOES_LIQUIDEZ[Math.floor(rnd() * POSICOES_LIQUIDEZ.length)]!;
  }
  if (f === 'TITULARES_CLUBE') {
    const scores = POSICOES_TODAS.map((pos) => {
      const n = contagemPosicao(elencoPro, pos);
      const idade = idadeMediaPosicao(elencoPro, pos);
      // Carente (poucos) ou envelhecido → score alto
      return { pos, score: (6 - Math.min(6, n)) * 2 + (idade >= 30 ? 3 : idade >= 28 ? 1.5 : 0) + rnd() };
    });
    scores.sort((a, b) => b.score - a.score);
    return scores[0]!.pos;
  }
  // EQUILIBRADO: setores iguais — favorece posição com menor contagem
  const scores = POSICOES_TODAS.map((pos) => ({
    pos,
    score: -contagemPosicao(elencoPro, pos) + rnd() * 0.4,
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]!.pos;
}

function bonusAttrsElite(qualidade: number, diretor: number, rnd: () => number): number {
  if (ctBaseNivel5(qualidade) && diretor >= 18) return randInt(rnd, 3, 5);
  if (qualidade >= 14 && diretor >= 16) return randInt(rnd, 1, 3);
  return 0;
}

function aplicarBonusAtributos(attrs: AtributosJogador, bonus: number, rnd: () => number): AtributosJogador {
  if (bonus <= 0) return attrs;
  const clone: AtributosJogador = {
    tecnicos: { ...attrs.tecnicos },
    mentais: { ...attrs.mentais },
    fisicos: { ...attrs.fisicos },
  };
  const grupos = ['tecnicos', 'mentais', 'fisicos'] as const;
  for (let i = 0; i < bonus; i++) {
    const g = grupos[i % grupos.length]!;
    const reg = clone[g] as unknown as Record<string, number>;
    const keys = Object.keys(reg);
    const k = keys[Math.floor(rnd() * keys.length)]!;
    reg[k] = Math.min(20, (reg[k] ?? 10) + 1);
  }
  return clone;
}

export function gerarJovemSub20(params: {
  id: number;
  nome: string;
  posicao: Posicao;
  idade: number;
  foco: FocoCategoriaBase;
  qualidade: number;
  diretor: number;
  rodada: number;
  seed: number;
  rnd: () => number;
}): JovemSub20 {
  const { id, nome, posicao, idade, foco, qualidade, diretor, rodada, rnd } = params;
  const pesos = pesosTierBase(qualidade, diretor);
  const tier = sortearTier(pesos, rnd);
  const range = TIER_RANGES[tier];

  // ~20% precoce estagnado (OVR alto, teto baixo); diamante bruto (OVR baixo, teto alto)
  const rollEspecial = rnd();
  const precoceEstagnado = rollEspecial < 0.2 && (tier === 'BOM' || tier === 'MEDIO' || tier === 'CRAQUE');
  const diamanteBruto =
    !precoceEstagnado && rollEspecial >= 0.2 && rollEspecial < 0.35 && (tier === 'FRACO' || tier === 'MEDIO');

  let ovrAlvo = randInt(rnd, range.ovrMin, range.ovrMax);
  let tetoAlvo = randInt(rnd, range.tetoMin, range.tetoMax);

  if (precoceEstagnado) {
    ovrAlvo = Math.min(75, ovrAlvo + randInt(rnd, 3, 6));
    tetoAlvo = Math.min(tetoAlvo, ovrAlvo + randInt(rnd, 1, 3));
  }
  if (diamanteBruto) {
    ovrAlvo = Math.max(52, ovrAlvo - randInt(rnd, 2, 5));
    tetoAlvo = Math.max(tetoAlvo, ovrAlvo + randInt(rnd, 14, 22));
    tetoAlvo = Math.min(94, tetoAlvo);
  }

  const bonus = bonusAttrsElite(qualidade, diretor, rnd);
  // forcaBase ~ escala usada em gerarAtributosNovos (overall≈forca)
  let atributos = gerarAtributosNovos(posicao, ovrAlvo, id, idade, rnd);
  atributos = aplicarBonusAtributos(atributos, bonus, rnd);
  let overall = overallDeAtributos(posicao, atributos);
  // Ajuste fino se overall ficou longe do alvo
  if (Math.abs(overall - ovrAlvo) > 4) {
    atributos = gerarAtributosNovos(posicao, ovrAlvo + (ovrAlvo - overall) * 0.5, id + 17, idade, rnd);
    atributos = aplicarBonusAtributos(atributos, bonus, rnd);
    overall = overallDeAtributos(posicao, atributos);
  }

  const potencialOvr = Math.max(overall + 1, tetoAlvo);
  const genetica = gerarGeneticaBase({
    overall,
    potencialOvr,
    idade,
    precoceEstagnado,
    diamanteBruto,
    bonusAttrs: bonus,
    seed: params.seed,
    rnd,
  });

  return {
    id,
    nome,
    idade,
    posicao,
    atributos,
    overall,
    potencialOvr: genetica.potencial_maximo,
    tier,
    precoceEstagnado,
    diamanteBruto,
    genetica,
    entradaRodada: rodada,
    focoGeracao: normalizarFocoBase(foco),
  };
}

export function criarContratoPrimeiroProfissional(
  overall: number,
  idade: number,
  posicao: Posicao,
  seed: number,
  rnd: () => number,
): { valor_mercado: number; contrato: Jogador['contrato']; salario_mensal: number } {
  const valor_mercado = calcularValorMercado(overall, idade, posicao);
  const salarioTotal = randInt(rnd, SALARIO_BASE_MIN, SALARIO_BASE_MAX);
  // Ajuste leve por overall
  const adj =
    overall >= 70 ? 1.15
    : overall >= 65 ? 1.05
    : overall <= 58 ? 0.9
    : 1;
  const total = Math.round((salarioTotal * adj) / 500) * 500;
  const clt = Math.round(total * 0.7);
  const imagem = total - clt;
  const contrato = gerarContratoLeiPele({
    salarioCltMensal: clt,
    direitoImagemMensal: imagem,
    duracaoMeses: PRIMEIRO_CONTRATO_MESES,
    percentualDireitosClube: 100,
    valorMercadoEstimado: valor_mercado,
    mesesNoClube: 0,
  });
  contrato.meses_restantes = PRIMEIRO_CONTRATO_MESES;
  // Multa mais baixa em jovens → risco de assédio (spec)
  contrato.multa_nacional = Math.max(800_000, Math.round(valor_mercado * 0.55));
  contrato.multa_internacional = Math.max(contrato.multa_nacional * 2, Math.round(valor_mercado * 2.2));
  void seed;
  return {
    valor_mercado,
    contrato,
    salario_mensal: clt + imagem,
  };
}

export function jovemParaJogadorProfissional(
  jovem: JovemSub20,
  timeId: string,
  rodada: number,
  rnd: () => number,
): Jogador {
  const { valor_mercado, contrato, salario_mensal } = criarContratoPrimeiroProfissional(
    jovem.overall,
    jovem.idade,
    jovem.posicao,
    jovem.id,
    rnd,
  );
  const formacaoBase: FormacaoBaseJogador = {
    foco: jovem.focoGeracao,
    promovidoRodada: rodada,
    potencialOvr: jovem.potencialOvr,
    tier: jovem.tier,
    precoceEstagnado: jovem.precoceEstagnado,
    diamanteBruto: jovem.diamanteBruto,
    minutosProfissional: 0,
    rodadasBancoSeguidas: 0,
    bonsJogosSeguidos: 0,
    pressaoEmpresario: false,
    criaDaCasa: true,
  };
  const abertoMercado = jovem.focoGeracao === 'VENDER_PROFISSIONALIZAR' || jovem.tier === 'CRAQUE';
  return {
    id: jovem.id,
    time_id: timeId,
    nome: jovem.nome,
    idade: jovem.idade,
    posicao: jovem.posicao,
    atributos: jovem.atributos,
    overall: jovem.overall,
    energia: 100,
    status_escalacao: 'NAO_RELACIONADO',
    valor_mercado:
      abertoMercado ? Math.round(valor_mercado * 1.18) : Math.round(valor_mercado * 0.95),
    salario_mensal,
    nacionalidade: 'Brasil',
    contrato,
    genetica: jovem.genetica,
    formacaoBase,
    suscetibilidade: {
      indice: abertoMercado ? 58 : 28,
      camada: abertoMercado ? 'ABERTO_A_PROPOSTAS' : 'RELUTANTE',
      motivo_principal: 'Primeiro contrato profissional — cria da base.',
    },
  };
}

/** OVR mínimo para promoção por mérito: meio ≥64 · ponta/ATA ≥68. */
export function elegivelPromocaoMerito(j: JovemSub20): boolean {
  if (j.posicao === 'ATA' || j.posicao === 'LAT' || j.posicao === 'MEI') {
    return j.overall >= 68;
  }
  return j.overall >= 64;
}

export function plantelProfissionalCount(jogadores: Jogador[], clubeId: string): number {
  return jogadores.filter((j) => j.time_id === clubeId).length;
}

export function disponiveisCount(jogadores: Jogador[], clubeId: string): number {
  return jogadores.filter(
    (j) =>
      j.time_id === clubeId &&
      (!j.lesao || j.lesao.diasRestantes <= 0) &&
      j.status_escalacao !== 'NAO_RELACIONADO',
  ).length;
}

export interface ResultadoCicloBase {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  noticias: NoticiaCarreira[];
  comercialPatch?: Partial<EstadoComercial>;
}

function noticiaBase(
  id: string,
  titulo: string,
  texto: string,
): NoticiaCarreira {
  return { id, data: new Date().toISOString(), titulo, texto };
}

/** Safra anual: 4–7 jovens 16–19 no Sub-20 (virada / pós-Copinha). */
export function gerarSafraAnual(params: {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  time: Time;
  rodada: number;
  temporadaAno: number;
  seed: number;
}): ResultadoCicloBase {
  const rnd = criarRng(params.seed ^ 0x5a5a);
  let mundo = params.mundo;
  const base = mundo.base;
  const noticias: NoticiaCarreira[] = [];
  if ((base.safraTemporadaAno ?? 0) >= params.temporadaAno) {
    return { jogadores: params.jogadores, mundo, noticias };
  }

  const diretor = nivelDiretorBase(mundo);
  const elencoPro = params.jogadores.filter((j) => j.time_id === params.time.id);
  let sub20 = [...(base.elencoSub20 ?? [])];
  const qtd = randInt(rnd, 4, 7);
  const nomes = embaralharNomesVarzea(params.seed);
  const novos: JovemSub20[] = [];

  for (let i = 0; i < qtd; i++) {
    const id = proximoIdJogador(params.jogadores, [...sub20, ...novos]);
    const pos = escolherPosicaoBase(base.foco, elencoPro, rnd);
    const idade = randInt(rnd, 16, 19);
    const jovem = gerarJovemSub20({
      id,
      nome: nomes[(id + i) % nomes.length] ?? `Promessa ${id}`,
      posicao: pos,
      idade,
      foco: base.foco,
      qualidade: base.qualidade,
      diretor,
      rodada: params.rodada,
      seed: params.seed + i * 31,
      rnd,
    });
    novos.push(jovem);
  }
  sub20 = [...sub20, ...novos];

  const resumo = novos
    .map((j) => `${j.nome} (${j.posicao}, ${rotuloTierBase(j.tier)}, OVR ${j.overall})`)
    .join('; ');
  noticias.push(
    noticiaBase(
      `safra_${params.temporadaAno}_${params.rodada}`,
      'Safra da base · Sub-20',
      `O diretor da base apresentou ${novos.length} nomes da safra ${params.temporadaAno}: ${resumo}.`,
    ),
  );

  mundo = {
    ...mundo,
    base: {
      ...base,
      elencoSub20: sub20,
      safraTemporadaAno: params.temporadaAno,
      ultimaPromocaoRodada: base.ultimaPromocaoRodada,
    },
  };
  return { jogadores: params.jogadores, mundo, noticias };
}

/** Gotejamento trimestral (a cada 12–13 rodadas): 1–2 indicações em Notícias. */
export function gerarGotejamentoTrimestral(params: {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  time: Time;
  rodada: number;
  seed: number;
}): ResultadoCicloBase {
  const rnd = criarRng(params.seed ^ 0xb10b);
  let mundo = params.mundo;
  const base = mundo.base;
  const noticias: NoticiaCarreira[] = [];
  const ultima = base.ultimaGotejamentoRodada ?? 0;
  const intervalo = 12 + Math.floor(rnd() * 2); // 12 ou 13
  if (params.rodada > 0 && params.rodada - ultima < intervalo && ultima > 0) {
    return { jogadores: params.jogadores, mundo, noticias };
  }
  if (params.rodada === 0) {
    return { jogadores: params.jogadores, mundo, noticias };
  }

  const diretor = nivelDiretorBase(mundo);
  const elencoPro = params.jogadores.filter((j) => j.time_id === params.time.id);
  let sub20 = [...(base.elencoSub20 ?? [])];
  const qtd = rnd() < 0.55 ? 1 : 2;
  const nomes = embaralharNomesVarzea(params.seed ^ params.rodada);
  const novos: JovemSub20[] = [];

  for (let i = 0; i < qtd; i++) {
    const id = proximoIdJogador(params.jogadores, [...sub20, ...novos]);
    const pos = escolherPosicaoBase(base.foco, elencoPro, rnd);
    const idade = randInt(rnd, 16, 19);
    const jovem = gerarJovemSub20({
      id,
      nome: nomes[(id + i * 3) % nomes.length] ?? `Indicação ${id}`,
      posicao: pos,
      idade,
      foco: base.foco,
      qualidade: base.qualidade,
      diretor,
      rodada: params.rodada,
      seed: params.seed + i * 47,
      rnd,
    });
    novos.push(jovem);
  }
  sub20 = [...sub20, ...novos];

  for (const j of novos) {
    noticias.push(
      noticiaBase(
        `gotejo_${params.rodada}_${j.id}`,
        'Indicação da base',
        `Diretor da base indica ${j.nome} (${j.idade} anos, ${j.posicao}) — tier ${rotuloTierBase(j.tier)}, OVR ${j.overall}, teto ~${j.potencialOvr}.${
          j.diamanteBruto ? ' Avaliado como diamante bruto.' : ''
        }${j.precoceEstagnado ? ' Atenção: perfil de precoce com teto limitado.' : ''}`,
      ),
    );
  }

  mundo = {
    ...mundo,
    base: {
      ...base,
      elencoSub20: sub20,
      ultimaGotejamentoRodada: params.rodada,
    },
  };
  return { jogadores: params.jogadores, mundo, noticias };
}

export function promoverJovemPorId(params: {
  jovemId: number;
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  time: Time;
  rodada: number;
  seed: number;
  forcar?: boolean;
}): ResultadoCicloBase & { promovido: Jogador | null } {
  const rnd = criarRng(params.seed ^ params.jovemId);
  const base = params.mundo.base;
  const sub20 = [...(base.elencoSub20 ?? [])];
  const idx = sub20.findIndex((j) => j.id === params.jovemId);
  if (idx < 0) {
    return { jogadores: params.jogadores, mundo: params.mundo, noticias: [], promovido: null };
  }
  const plantel = plantelProfissionalCount(params.jogadores, params.time.id);
  if (plantel >= TETO_PLANTEL_PROFISSIONAL && !params.forcar) {
    return {
      jogadores: params.jogadores,
      mundo: params.mundo,
      noticias: [
        noticiaBase(`plantel_cheio_${params.rodada}`, 'Plantel cheio', MSG_PLANTEL_CHEIO),
      ],
      promovido: null,
    };
  }

  const jovem = sub20[idx]!;
  sub20.splice(idx, 1);
  const pro = jovemParaJogadorProfissional(jovem, params.time.id, params.rodada, rnd);
  const noticias = [
    noticiaBase(
      `promo_${jovem.id}_${params.rodada}`,
      'Promoção ao profissional',
      `${jovem.nome} assina o 1º contrato (${PRIMEIRO_CONTRATO_MESES} meses, R$ ${pro.salario_mensal?.toLocaleString('pt-BR')}/mês, 100% dos direitos). OVR ${jovem.overall} · ${rotuloTierBase(jovem.tier)}.`,
    ),
  ];
  const mundo: EstadoMundoClube = {
    ...params.mundo,
    base: {
      ...base,
      elencoSub20: sub20,
      ultimaPromocaoRodada: params.rodada,
      promocoesTemporada: base.promocoesTemporada + 1,
      sugestoesPromocao: (base.sugestoesPromocao ?? []).filter((s) => s.jovemId !== jovem.id),
    },
  };
  return {
    jogadores: [...params.jogadores, pro],
    mundo,
    noticias,
    promovido: pro,
  };
}

/** Promoções planejadas por mérito + sugestões de crise (<16 disponíveis). */
export function processarPromocoesESugestoes(params: {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  time: Time;
  rodada: number;
  seed: number;
}): ResultadoCicloBase {
  const rnd = criarRng(params.seed ^ 0x990);
  let jogadores = params.jogadores;
  let mundo = params.mundo;
  const noticias: NoticiaCarreira[] = [];
  const sub20 = mundo.base.elencoSub20 ?? [];
  const disponiveis = disponiveisCount(jogadores, params.time.id);
  const elencoPro = jogadores.filter((j) => j.time_id === params.time.id);

  // Crise: <16 disponíveis → diretor sugere 2 da posição carente
  if (disponiveis < 16 && sub20.length > 0) {
    const posCarente = escolherPosicaoBase('TITULARES_CLUBE', elencoPro, rnd);
    const candidatos = [...sub20]
      .filter((j) => j.posicao === posCarente)
      .sort((a, b) => b.overall - a.overall);
    const pool = candidatos.length >= 2 ? candidatos : [...sub20].sort((a, b) => b.overall - a.overall);
    const sugestoes: SugestaoPromocaoBase[] = pool.slice(0, 2).map((j) => ({
      jovemId: j.id,
      posicao: j.posicao,
      motivo: 'CRISE' as const,
      mensagem: `Plantel curto (${disponiveis} disponíveis). Diretor da base sugere ${j.nome} (${j.posicao}, OVR ${j.overall}).`,
      rodada: params.rodada,
    }));
    mundo = {
      ...mundo,
      base: { ...mundo.base, sugestoesPromocao: sugestoes },
    };
    for (const s of sugestoes) {
      noticias.push(noticiaBase(`crise_base_${params.rodada}_${s.jovemId}`, 'Alerta · plantel curto', s.mensagem));
    }
  }

  // Mérito: promove automaticamente se houver vaga e elegível (até 1 por rodada)
  const merito = [...sub20].filter(elegivelPromocaoMerito).sort((a, b) => b.overall - a.overall);
  if (
    merito.length > 0 &&
    plantelProfissionalCount(jogadores, params.time.id) < TETO_PLANTEL_PROFISSIONAL &&
    rnd() < 0.35 + nivelDiretorBase(mundo) / 80
  ) {
    const alvo = merito[0]!;
    const r = promoverJovemPorId({
      jovemId: alvo.id,
      jogadores,
      mundo,
      time: params.time,
      rodada: params.rodada,
      seed: params.seed ^ alvo.id,
    });
    jogadores = r.jogadores;
    mundo = r.mundo;
    noticias.push(...r.noticias);
  }

  return { jogadores, mundo, noticias };
}

/**
 * Identidade da base: 2–3 crias relacionados + minutos → humor_torcida ↑, churn sócio ↓.
 */
export function aplicarIdentidadeBase(
  jogadores: Jogador[],
  clubeId: string,
  mundo: EstadoMundoClube,
  comercial: EstadoComercial | null | undefined,
): {
  mundo: EstadoMundoClube;
  comercial: EstadoComercial | null;
  noticia: NoticiaCarreira | null;
} {
  const crias = jogadores.filter(
    (j) =>
      j.time_id === clubeId &&
      j.formacaoBase?.criaDaCasa &&
      j.status_escalacao !== 'NAO_RELACIONADO' &&
      (j.formacaoBase.minutosProfissional ?? 0) >= 45,
  );
  const ativa = crias.length >= 2;
  let nextMundo: EstadoMundoClube = {
    ...mundo,
    base: {
      ...mundo.base,
      identidadeBaseAtiva: ativa,
      criasRelacionadosRecente: crias.length,
    },
    climaTorcedor: ativa
      ? {
          ...mundo.climaTorcedor,
          indice: Math.min(100, mundo.climaTorcedor.indice + (crias.length >= 3 ? 4 : 2)),
        }
      : mundo.climaTorcedor,
  };

  let nextComercial: EstadoComercial | null = comercial ?? null;
  let noticia: NoticiaCarreira | null = null;

  if (ativa && nextComercial) {
    const humor = Math.min(100, nextComercial.indicadores.humor_torcida + (crias.length >= 3 ? 5 : 3));
    const churn = Math.max(0.4, nextComercial.sociosTorcedor.churnMesAnterior * 0.82);
    nextComercial = {
      ...nextComercial,
      indicadores: { ...nextComercial.indicadores, humor_torcida: humor },
      sociosTorcedor: {
        ...nextComercial.sociosTorcedor,
        churnMesAnterior: churn,
      },
    };
    if (!mundo.base.identidadeBaseAtiva) {
      noticia = noticiaBase(
        `identidade_base_${crias.map((c) => c.id).join('_')}`,
        'Identidade da base',
        `A torcida vibra com ${crias.length} crias no elenco relacionado. Humor sobe e o cancelamento de sócios tende a cair.`,
      );
    }
  }

  return { mundo: nextMundo, comercial: nextComercial, noticia };
}

/** Multiplicador de XP / evolução por faixa etária da curva jovem. */
export function multiplicadorXpCurvaJovem(idade: number): number {
  if (idade <= 18) return 2.35;
  if (idade <= 21) return 1.45;
  if (idade <= 24) return 1.0;
  return 0.85;
}

/**
 * Spec: pressão mental frágil (atributo ≤10/20) → −4–6% em crise/decisivos fora.
 */
export function multiplicadorPressaoMental(
  j: Jogador,
  opts: { criseOuDecisivo: boolean; jogandoFora: boolean },
): number {
  if (!opts.criseOuDecisivo && !opts.jogandoFora) return 1;
  if (j.idade > 22) return 1;
  const p = j.atributos.mentais.pressao; // 1–20
  if (p > 10) return 1;
  const severidade = (10 - p) / 10;
  const perda = 0.04 + severidade * 0.02;
  if (opts.criseOuDecisivo && opts.jogandoFora) return 1 - perda;
  return 1 - perda * 0.7;
}

/** Inconstância 16–18 anos em campo (±). */
export function multiplicadorInconstanciaJovem(j: Jogador, rnd: () => number): number {
  if (j.idade < 16 || j.idade > 18) return 1;
  if (!j.formacaoBase && j.idade > 18) return 1;
  // ±8%
  return 0.92 + rnd() * 0.16;
}

/**
 * 17 anos jogando 90' em EXTREMO (LAT/ATA/MEI ofensivo): sobrecarga + queda últimos 20'.
 * Retorna mult de fadiga extra e mult de rendimento após o minuto 70.
 */
export function efeitoSobrecargaExtremo17(
  j: Jogador,
  posicaoEscalada: Posicao,
  minuto: number,
): { fadigaExtra: number; rendimentoFinal: number } {
  const extremo = posicaoEscalada === 'LAT' || posicaoEscalada === 'ATA' || posicaoEscalada === 'MEI';
  if (j.idade !== 17 || !extremo) return { fadigaExtra: 0, rendimentoFinal: 1 };
  const fadigaExtra = 0.12; // +12% drain
  const rendimentoFinal = minuto >= 70 ? 0.82 : 1;
  return { fadigaExtra, rendimentoFinal };
}

/** Atualiza contadores pós-rodada: banco, bons jogos, assédio empresário, estagnação. */
export function tickFormacaoBasePosRodada(
  jogadores: Jogador[],
  clubeId: string,
  idsParticipantes: number[] | undefined,
  seed: number,
): { jogadores: Jogador[]; noticias: NoticiaCarreira[] } {
  const rnd = criarRng(seed ^ 0xace0);
  const noticias: NoticiaCarreira[] = [];
  const participou = new Set(idsParticipantes ?? []);

  const next = jogadores.map((j) => {
    if (j.time_id !== clubeId || !j.formacaoBase) return j;
    const fb = { ...j.formacaoBase };
    let sus = j.suscetibilidade;
    let valor = j.valor_mercado;

    if (j.status_escalacao === 'NAO_RELACIONADO') {
      fb.rodadasBancoSeguidas = (fb.rodadasBancoSeguidas ?? 0) + 1;
    } else {
      fb.rodadasBancoSeguidas = 0;
      // minutos aproximados: titular 90, reserva 25
      const add = j.status_escalacao === 'TITULAR' ? 90 : 25;
      fb.minutosProfissional = (fb.minutosProfissional ?? 0) + add;
    }

    if (participou.has(j.id) && j.overall >= 64) {
      // "bom jogo" heurístico: participou e OVR decente / energia ok
      if ((j.energia ?? 70) >= 55) {
        fb.bonsJogosSeguidos = (fb.bonsJogosSeguidos ?? 0) + 1;
      } else {
        fb.bonsJogosSeguidos = 0;
      }
    } else if (!participou.has(j.id)) {
      fb.bonsJogosSeguidos = Math.max(0, (fb.bonsJogosSeguidos ?? 0) - 1);
    }

    // Assédio empresários após 4–5 bons jogos + multa baixa
    const multaBaixa = (j.contrato?.multa_nacional ?? 9_999_999) < 2_500_000;
    if (
      !fb.pressaoEmpresario &&
      (fb.bonsJogosSeguidos ?? 0) >= 4 &&
      multaBaixa &&
      j.idade <= 21 &&
      rnd() < 0.55
    ) {
      fb.pressaoEmpresario = true;
      sus = {
        indice: 88,
        camada: (fb.bonsJogosSeguidos ?? 0) >= 5 ? 'FORCANDO_SAIDA' : 'INSATISFEITO',
        motivo_principal: 'Empresário pressiona renovação / saída após bons jogos e multa baixa.',
      };
      noticias.push(
        noticiaBase(
          `empresario_${j.id}`,
          'Assédio de empresário',
          `${j.nome}: após uma sequência positiva, o empresário pressiona. Sem renovação, o atleta pode ficar INSATISFEITO ou forçando saída.`,
        ),
      );
    }

    // 15 rodadas NAO_RELACIONADO: XP ≤0.75×, valor ↓
    if ((fb.rodadasBancoSeguidas ?? 0) >= 15) {
      valor = Math.round((valor ?? calcularValorMercado(j.overall, j.idade, j.posicao)) * 0.97);
    }

    return { ...j, formacaoBase: fb, suscetibilidade: sus, valor_mercado: valor };
  });

  return { jogadores: next, noticias };
}

/** Evolução de crias da base com curva jovem + genética + estagnação no banco. */
export function chanceEvoluirCriaBase(j: Jogador, fatorStaff: number, rnd: () => number): boolean {
  if (!j.formacaoBase) return false;
  if (j.idade > 24) return false;
  const teto = tetoPotencialJogador(j);
  if (j.overall >= teto) return rnd() < 0.06;

  let chance = 0.14 + fatorStaff * 0.2;
  chance *= multiplicadorXpCurvaJovem(j.idade) / 1.6;
  chance *= fatorAbsorcaoJogador(j);

  // Minutagem 19–21 → ~80% do teto
  if (j.idade >= 19 && j.idade <= 21) {
    const mins = j.formacaoBase.minutosProfissional ?? 0;
    if (mins >= 400 && j.overall < teto * 0.8) chance *= 1.35;
  }

  if ((j.formacaoBase.rodadasBancoSeguidas ?? 0) >= 15) {
    chance *= 0.75;
  }
  if (j.formacaoBase.precoceEstagnado && j.overall >= teto - 2) {
    chance *= 0.35;
  }
  if (j.formacaoBase.diamanteBruto) {
    chance *= 1.2;
  }
  return rnd() < Math.min(0.72, chance);
}

export function chancePromocaoBaseLegacyCompat(mundo: EstadoMundoClube): number {
  const inv = mundo.base.investimentoNivel;
  const diretor = nivelDiretorBase(mundo);
  const base =
    inv === 0 ? 0.04
    : inv === 1 ? 0.09
    : inv === 2 ? 0.16
    : 0.24;
  return Math.min(0.52, base + diretor / 115 + mundo.base.qualidade / 250);
}

export function normalizarCategoriaBase(base: CategoriaBase): CategoriaBase {
  return {
    ...base,
    foco: normalizarFocoBase(base.foco),
    elencoSub20: base.elencoSub20 ?? [],
    sugestoesPromocao: base.sugestoesPromocao ?? [],
    ultimaGotejamentoRodada: base.ultimaGotejamentoRodada ?? 0,
    safraTemporadaAno: base.safraTemporadaAno ?? 0,
    identidadeBaseAtiva: base.identidadeBaseAtiva ?? false,
    criasRelacionadosRecente: base.criasRelacionadosRecente ?? 0,
  };
}

/**
 * Ciclo completo da base ao fim da rodada (safra / gotejo / promoções / identidade / pressão).
 */
export function tickYouthAcademyPosRodada(params: {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  time: Time;
  rodada: number;
  temporadaAno: number;
  seed: number;
  idsParticipantes?: number[];
  comercial?: EstadoComercial | null;
  viradaTemporada?: boolean;
}): ResultadoCicloBase & { comercial: EstadoComercial | null } {
  let jogadores = params.jogadores;
  let mundo = {
    ...params.mundo,
    base: normalizarCategoriaBase(params.mundo.base),
  };
  const noticias: NoticiaCarreira[] = [];
  let comercial = params.comercial ?? null;

  if (params.viradaTemporada || params.rodada === 1) {
    const safra = gerarSafraAnual({
      jogadores,
      mundo,
      time: params.time,
      rodada: params.rodada,
      temporadaAno: params.temporadaAno,
      seed: params.seed ^ 0x5af,
    });
    mundo = safra.mundo;
    noticias.push(...safra.noticias);
  }

  const gotejo = gerarGotejamentoTrimestral({
    jogadores,
    mundo,
    time: params.time,
    rodada: params.rodada,
    seed: params.seed ^ 0x607,
  });
  mundo = gotejo.mundo;
  noticias.push(...gotejo.noticias);

  const promos = processarPromocoesESugestoes({
    jogadores,
    mundo,
    time: params.time,
    rodada: params.rodada,
    seed: params.seed ^ 0x9901,
  });
  jogadores = promos.jogadores;
  mundo = promos.mundo;
  noticias.push(...promos.noticias);

  const formTick = tickFormacaoBasePosRodada(
    jogadores,
    params.time.id,
    params.idsParticipantes,
    params.seed,
  );
  jogadores = formTick.jogadores;
  noticias.push(...formTick.noticias);

  const idBase = aplicarIdentidadeBase(jogadores, params.time.id, mundo, comercial);
  mundo = idBase.mundo;
  comercial = idBase.comercial;
  if (idBase.noticia) noticias.push(idBase.noticia);

  return { jogadores, mundo, noticias, comercial };
}
