import { embaralharNomesVarzea } from '../data/jogadoresVarzea';
import { criarRng } from '../engine/matchEngine';
import type {
  AtletaSub23,
  OfertaDispensa,
  ResultadoDispensa,
} from '../types/aspirantesS23';
import {
  MSG_PLANTEL_CHEIO_SUBIR,
  TAMANHO_ELENCO_SUB23,
  TETO_PLANTEL_PRO_SUB23,
} from '../types/aspirantesS23';
import type { Jogador, Posicao, Time } from '../types/schema';
import type { FinancasClube } from '../types/schema';
import type { FocoCategoriaBase, TierCategoriaBase } from '../types/mundoClube';
import {
  gerarAtributosNovos,
  overallDeAtributos,
} from './atributosJogador';
import { gerarGeneticaBase, POSICOES_TODAS } from './genetica';
import {
  criarContratoPrimeiroProfissional,
  plantelProfissionalCount,
  rotuloTierBase,
} from './youthAcademy';
import { nivelDiretorBase } from './staffEfeitos';
import type { EstadoMundoClube } from '../types/mundoClube';
import type { NoticiaCarreira } from './types';
import type { EstadoAspirantesS23 } from '../types/aspirantesS23';

/** Faixa etária Sub-23 (aspirantes). */
const IDADE_MIN = 19;
const IDADE_MAX = 23;

/**
 * Na geração/aparecimento: ~5% no nível da média dos top 11 do profissional;
 * ~95% no teto da média do restante do plantel (excluindo esses top 11).
 * Depois disso a evolução segue a dinâmica normal — não rebalancear.
 */
export const CHANCE_OVR_NIVEL_TITULARES = 0.05;

/** Fallback se o clube ainda não tem plantel profissional. */
const FALLBACK_MEDIA_TOP11 = 72;
const FALLBACK_MEDIA_RESTO = 64;

/** Tetos de potencial por tier (OVR atual é calibrado vs plantel, não por estes ranges). */
const TIER_TETO: Record<TierCategoriaBase, { tetoMin: number; tetoMax: number }> = {
  FRACO: { tetoMin: 63, tetoMax: 68 },
  MEDIO: { tetoMin: 70, tetoMax: 76 },
  BOM: { tetoMin: 78, tetoMax: 85 },
  CRAQUE: { tetoMin: 86, tetoMax: 94 },
};

function randInt(rnd: () => number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

/** Médias OVR: top 11 (titulares-quality) vs resto do plantel profissional. */
export function referenciasOvrPlantelPro(
  elencoPro: ReadonlyArray<{ overall: number }>,
): { mediaTop11: number; mediaResto: number } {
  if (elencoPro.length === 0) {
    return { mediaTop11: FALLBACK_MEDIA_TOP11, mediaResto: FALLBACK_MEDIA_RESTO };
  }
  const sorted = [...elencoPro].map((j) => j.overall).sort((a, b) => b - a);
  const nTop = Math.min(11, sorted.length);
  const top = sorted.slice(0, nTop);
  const resto = sorted.slice(nTop);
  const mediaTop11 = top.reduce((s, v) => s + v, 0) / top.length;
  const mediaResto =
    resto.length > 0 ?
      resto.reduce((s, v) => s + v, 0) / resto.length
    : Math.max(48, mediaTop11 - 7);
  return { mediaTop11, mediaResto };
}

/**
 * Sorteia OVR-alvo na aparição: 5% ≈ média top 11; 95% ≤ média do resto.
 * Tier / precoce / diamante só colorém a faixa — nunca estouram o teto do grupo.
 */
export function sortearOvrAlvoVsPlantel(params: {
  mediaTop11: number;
  mediaResto: number;
  tier: TierCategoriaBase;
  precoceEstagnado: boolean;
  diamanteBruto: boolean;
  rnd: () => number;
}): { ovrAlvo: number; nivelTitulares: boolean; capOvr: number } {
  const { mediaTop11, mediaResto, tier, precoceEstagnado, diamanteBruto, rnd } = params;
  const nivelTitulares = rnd() < CHANCE_OVR_NIVEL_TITULARES;

  if (nivelTitulares) {
    const centro = Math.round(mediaTop11);
    let ovrAlvo = randInt(rnd, centro - 1, centro + 1);
    if (precoceEstagnado) {
      ovrAlvo = Math.min(centro + 2, ovrAlvo + randInt(rnd, 0, 2));
    }
    if (diamanteBruto) {
      ovrAlvo = Math.max(centro - 3, ovrAlvo - randInt(rnd, 1, 3));
    }
    const capOvr = Math.ceil(mediaTop11 + 2);
    return { ovrAlvo, nivelTitulares: true, capOvr };
  }

  const teto = Math.floor(mediaResto);
  const span =
    tier === 'CRAQUE' ? 3
    : tier === 'BOM' ? 6
    : tier === 'MEDIO' ? 9
    : 12;
  const piso = Math.max(48, teto - span);
  let ovrAlvo = randInt(rnd, piso, teto);
  if (diamanteBruto) {
    ovrAlvo = Math.max(piso, ovrAlvo - randInt(rnd, 2, 4));
  }
  if (precoceEstagnado) {
    // Precoce sobe um pouco, mas permanece ≤ média do resto.
    ovrAlvo = Math.min(teto, ovrAlvo + randInt(rnd, 1, 3));
  }
  return { ovrAlvo, nivelTitulares: false, capOvr: teto };
}

function pesosTier(qualidade: number, diretor: number): Record<TierCategoriaBase, number> {
  if (qualidade >= 16 && diretor >= 18) {
    return { FRACO: 18, MEDIO: 33, BOM: 34, CRAQUE: 15 };
  }
  return { FRACO: 42, MEDIO: 35, BOM: 18, CRAQUE: 5 };
}

function sortearTier(
  pesos: Record<TierCategoriaBase, number>,
  rnd: () => number,
): TierCategoriaBase {
  const total = pesos.FRACO + pesos.MEDIO + pesos.BOM + pesos.CRAQUE;
  let r = rnd() * total;
  for (const t of ['FRACO', 'MEDIO', 'BOM', 'CRAQUE'] as TierCategoriaBase[]) {
    r -= pesos[t];
    if (r <= 0) return t;
  }
  return 'MEDIO';
}

/** Distribuição tipada de 22: 2 GOL, 4 ZAG, 4 LAT, 3 VOL, 5 MEI, 4 ATA. */
const SLOT_POSICOES: Posicao[] = [
  'GOL',
  'GOL',
  'ZAG',
  'ZAG',
  'ZAG',
  'ZAG',
  'LAT',
  'LAT',
  'LAT',
  'LAT',
  'VOL',
  'VOL',
  'VOL',
  'MEI',
  'MEI',
  'MEI',
  'MEI',
  'MEI',
  'ATA',
  'ATA',
  'ATA',
  'ATA',
];

export function proximoIdGlobal(
  jogadores: Jogador[],
  aspirantes: EstadoAspirantesS23 | null | undefined,
): number {
  let max = jogadores.reduce((m, j) => Math.max(m, j.id), 0);
  if (aspirantes) {
    for (const elenco of Object.values(aspirantes.elencos)) {
      for (const a of elenco) max = Math.max(max, a.id);
    }
  }
  return max + 1;
}

function aplicarBonusAtributosSub23(
  atributos: ReturnType<typeof gerarAtributosNovos>,
  bonus: number,
  rnd: () => number,
): ReturnType<typeof gerarAtributosNovos> {
  if (bonus <= 0) return atributos;
  const clone = {
    tecnicos: { ...atributos.tecnicos },
    mentais: { ...atributos.mentais },
    fisicos: { ...atributos.fisicos },
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

export function gerarAtletaSub23(params: {
  id: number;
  timeId: string;
  nome: string;
  posicao: Posicao;
  qualidade: number;
  diretor: number;
  rodada: number;
  seed: number;
  rnd: () => number;
  /** Plantel profissional do clube — ancora OVR na aparição (5%/95%). */
  elencoPro?: ReadonlyArray<{ overall: number }>;
  mediaTop11?: number;
  mediaResto?: number;
}): AtletaSub23 {
  const { id, timeId, nome, posicao, qualidade, diretor, rodada, rnd } = params;
  const tier = sortearTier(pesosTier(qualidade, diretor), rnd);
  const tetoRange = TIER_TETO[tier];
  const idade = randInt(rnd, IDADE_MIN, IDADE_MAX);

  const roll = rnd();
  const precoceEstagnado = roll < 0.18 && (tier === 'BOM' || tier === 'MEDIO' || tier === 'CRAQUE');
  const diamanteBruto =
    !precoceEstagnado && roll >= 0.18 && roll < 0.32 && (tier === 'FRACO' || tier === 'MEDIO');

  const refs =
    params.mediaTop11 != null && params.mediaResto != null ?
      { mediaTop11: params.mediaTop11, mediaResto: params.mediaResto }
    : referenciasOvrPlantelPro(params.elencoPro ?? []);

  const { ovrAlvo, capOvr } = sortearOvrAlvoVsPlantel({
    mediaTop11: refs.mediaTop11,
    mediaResto: refs.mediaResto,
    tier,
    precoceEstagnado,
    diamanteBruto,
    rnd,
  });

  let tetoAlvo = randInt(rnd, tetoRange.tetoMin, tetoRange.tetoMax);
  if (precoceEstagnado) {
    tetoAlvo = Math.min(tetoAlvo, ovrAlvo + randInt(rnd, 1, 3));
  }
  if (diamanteBruto) {
    tetoAlvo = Math.min(94, Math.max(tetoAlvo, ovrAlvo + randInt(rnd, 14, 20)));
  }

  const bonus = qualidade >= 16 && diretor >= 18 ? randInt(rnd, 3, 5) : 0;
  let atributos = gerarAtributosNovos(posicao, ovrAlvo, id, idade, rnd);
  atributos = aplicarBonusAtributosSub23(atributos, bonus, rnd);
  let overall = overallDeAtributos(posicao, atributos);

  // Ajuste fino: overall final respeita o teto do grupo (titulares vs resto).
  let alvo = ovrAlvo;
  for (let tentativa = 0; tentativa < 6 && (overall > capOvr || Math.abs(overall - ovrAlvo) > 4); tentativa++) {
    if (overall > capOvr) {
      alvo = Math.max(48, Math.min(alvo, capOvr) - 2 - tentativa);
    } else {
      alvo = ovrAlvo + (ovrAlvo - overall) * 0.5;
    }
    // Após estouro, não reaplica bonus elite (evita empurrar de novo acima do cap).
    atributos = gerarAtributosNovos(posicao, alvo, id + 17 * (tentativa + 1), idade, rnd);
    if (tentativa === 0 && overall <= capOvr) {
      atributos = aplicarBonusAtributosSub23(atributos, bonus, rnd);
    }
    overall = overallDeAtributos(posicao, atributos);
  }
  if (overall > capOvr) {
    overall = capOvr;
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
    time_id: timeId,
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
  };
}

export function gerarElencoSub23Clube(params: {
  time: Time;
  qualidade: number;
  diretor: number;
  seed: number;
  idInicio: number;
  rodada?: number;
  /** Plantel profissional do clube (ancora 5%/95% na geração). */
  elencoPro?: ReadonlyArray<{ overall: number }>;
}): { elenco: AtletaSub23[]; proximoId: number } {
  const rnd = criarRng(params.seed);
  const nomes = embaralharNomesVarzea(params.seed);
  const refs = referenciasOvrPlantelPro(params.elencoPro ?? []);
  const elenco: AtletaSub23[] = [];
  let id = params.idInicio;
  for (let i = 0; i < TAMANHO_ELENCO_SUB23; i++) {
    const pos = SLOT_POSICOES[i] ?? POSICOES_TODAS[i % POSICOES_TODAS.length]!;
    const atleta = gerarAtletaSub23({
      id,
      timeId: params.time.id,
      nome: nomes[(id + i) % nomes.length] ?? `Aspirante ${id}`,
      posicao: pos,
      qualidade: params.qualidade,
      diretor: params.diretor,
      rodada: params.rodada ?? 0,
      seed: params.seed + i * 17,
      rnd,
      mediaTop11: refs.mediaTop11,
      mediaResto: refs.mediaResto,
    });
    elenco.push(atleta);
    id += 1;
  }
  return { elenco, proximoId: id };
}

export function forcaElencoSub23(elenco: AtletaSub23[]): number {
  if (elenco.length === 0) return 50;
  const top11 = [...elenco].sort((a, b) => b.overall - a.overall).slice(0, 11);
  return top11.reduce((s, a) => s + a.overall, 0) / top11.length;
}

export function atletaSub23ParaProfissional(
  atleta: AtletaSub23,
  rodada: number,
  rnd: () => number,
  foco: FocoCategoriaBase = 'EQUILIBRADO',
): Jogador {
  const { valor_mercado, contrato, salario_mensal } = criarContratoPrimeiroProfissional(
    atleta.overall,
    atleta.idade,
    atleta.posicao,
    atleta.id,
    rnd,
  );
  return {
    id: atleta.id,
    time_id: atleta.time_id,
    nome: atleta.nome,
    idade: atleta.idade,
    posicao: atleta.posicao,
    atributos: atleta.atributos,
    overall: atleta.overall,
    energia: 100,
    status_escalacao: 'NAO_RELACIONADO',
    valor_mercado: Math.round(valor_mercado * 0.98),
    salario_mensal,
    nacionalidade: 'Brasil',
    contrato,
    genetica: atleta.genetica,
    formacaoBase: {
      foco,
      promovidoRodada: rodada,
      potencialOvr: atleta.potencialOvr,
      tier: atleta.tier,
      precoceEstagnado: atleta.precoceEstagnado,
      diamanteBruto: atleta.diamanteBruto,
      minutosProfissional: 0,
      rodadasBancoSeguidas: 0,
      bonsJogosSeguidos: 0,
      pressaoEmpresario: false,
      criaDaCasa: true,
    },
    suscetibilidade: {
      indice: 35,
      camada: 'RELUTANTE',
      motivo_principal: 'Promovido do Sub-23 — Brasileirão Sub23.',
    },
  };
}

export function promoverSub23ParaPro(params: {
  atletaId: number;
  clubeId: string;
  jogadores: Jogador[];
  aspirantes: EstadoAspirantesS23;
  mundo: EstadoMundoClube | null;
  rodada: number;
  seed: number;
}): {
  ok: boolean;
  motivo?: string;
  jogadores: Jogador[];
  aspirantes: EstadoAspirantesS23;
  noticias: NoticiaCarreira[];
  promovido?: Jogador;
} {
  const elenco = [...(params.aspirantes.elencos[params.clubeId] ?? [])];
  const idx = elenco.findIndex((a) => a.id === params.atletaId);
  if (idx < 0) {
    return {
      ok: false,
      motivo: 'Atleta não encontrado no Sub-23.',
      jogadores: params.jogadores,
      aspirantes: params.aspirantes,
      noticias: [],
    };
  }

  const plantel = plantelProfissionalCount(params.jogadores, params.clubeId);
  if (plantel >= TETO_PLANTEL_PRO_SUB23) {
    return {
      ok: false,
      motivo: MSG_PLANTEL_CHEIO_SUBIR,
      jogadores: params.jogadores,
      aspirantes: params.aspirantes,
      noticias: [],
    };
  }

  const rnd = criarRng(params.seed ^ params.atletaId);
  const atleta = elenco[idx]!;
  elenco.splice(idx, 1);

  const foco = params.mundo?.base.foco ?? 'EQUILIBRADO';
  const promovido = atletaSub23ParaProfissional(atleta, params.rodada, rnd, foco);

  // Reposição: novo atleta na mesma posição para manter 22.
  const diretor = nivelDiretorBase(params.mundo);
  const qualidade = params.mundo?.base.qualidade ?? 12;
  const novoId = proximoIdGlobal([...params.jogadores, promovido], {
    ...params.aspirantes,
    elencos: { ...params.aspirantes.elencos, [params.clubeId]: elenco },
  });
  const nomes = embaralharNomesVarzea(params.seed ^ novoId);
  const elencoPro = params.jogadores.filter((j) => j.time_id === params.clubeId);
  const reposicao = gerarAtletaSub23({
    id: novoId,
    timeId: params.clubeId,
    nome: nomes[novoId % nomes.length] ?? `Aspirante ${novoId}`,
    posicao: atleta.posicao,
    qualidade,
    diretor,
    rodada: params.rodada,
    seed: params.seed + novoId,
    rnd,
    elencoPro,
  });
  elenco.push(reposicao);

  const noticias: NoticiaCarreira[] = [
    {
      id: `sub23_promo_${atleta.id}_${params.rodada}`,
      data: new Date().toISOString(),
      titulo: 'Subida ao profissional',
      texto: `${atleta.nome} (${atleta.posicao}, OVR ${atleta.overall}, ${rotuloTierBase(atleta.tier)}) sobe do Sub-23. 1º contrato assinado. ${reposicao.nome} entra no lugar no Brasileirão Sub23.`,
    },
  ];

  return {
    ok: true,
    jogadores: [...params.jogadores, promovido],
    aspirantes: {
      ...params.aspirantes,
      elencos: { ...params.aspirantes.elencos, [params.clubeId]: elenco },
    },
    noticias,
    promovido,
  };
}

/** Calcula oferta de dispensa (acordo = 50% dos salários restantes). */
export function montarOfertaDispensa(j: Jogador): OfertaDispensa | null {
  if (!j.contrato) return null;
  const meses = Math.max(1, j.contrato.meses_restantes);
  const salario =
    j.contrato.salario_clt_mensal +
    j.contrato.direito_imagem_mensal;
  const valorIntegral = meses * salario;
  const valorAcordo = Math.round(valorIntegral * 0.5);
  return {
    jogadorId: j.id,
    mesesRestantes: meses,
    salarioMensal: salario,
    valorAcordo,
    valorIntegral,
    mensagem: `Acordo: R$ ${valorAcordo.toLocaleString('pt-BR')} (50% até o fim do contrato). Se recusar, a rescisão custa R$ ${valorIntegral.toLocaleString('pt-BR')}.`,
  };
}

/**
 * Tenta dispensa: jogador pode aceitar acordo (50%) ou recusar → clube paga 100%.
 * Chance de recusa sobe com OVR alto, idade baixa e multa residual.
 */
export function tentarDispensaProfissional(params: {
  jogadorId: number;
  jogadores: Jogador[];
  clubeId: string;
  financas: FinancasClube;
  rodada: number;
  mes: number;
  seed: number;
  /** Se true, força pagamento integral (após recusa). */
  forcarIntegral?: boolean;
}): {
  resultado: ResultadoDispensa;
  jogadores: Jogador[];
  financas: FinancasClube;
  noticias: NoticiaCarreira[];
} {
  const j = params.jogadores.find((x) => x.id === params.jogadorId && x.time_id === params.clubeId);
  if (!j) {
    return {
      resultado: { ok: false, motivo: 'Jogador não está no plantel.' },
      jogadores: params.jogadores,
      financas: params.financas,
      noticias: [],
    };
  }
  const oferta = montarOfertaDispensa(j);
  if (!oferta) {
    return {
      resultado: { ok: false, motivo: 'Jogador sem contrato válido.' },
      jogadores: params.jogadores,
      financas: params.financas,
      noticias: [],
    };
  }

  const rnd = criarRng(params.seed ^ j.id);
  let modo: 'ACORDO' | 'INTEGRAL' = 'ACORDO';
  if (!params.forcarIntegral) {
    // Chance de recusar o acordo (30–70%).
    const chanceRecusa =
      0.28 +
      Math.min(0.35, (j.overall - 60) / 80) +
      (j.idade <= 24 ? 0.12 : 0) +
      ((j.suscetibilidade?.camada === 'INTRANSFERIVEL' ||
        j.suscetibilidade?.camada === 'RELUTANTE') ?
        0.1
      : 0);
    if (rnd() < chanceRecusa) {
      return {
        resultado: {
          ok: false,
          motivo: `${j.nome} recusou o acordo de 50%. Para encerrar o contrato, pague o valor integral dos salários restantes.`,
          oferta,
        },
        jogadores: params.jogadores,
        financas: params.financas,
        noticias: [
          {
            id: `dispensa_recusa_${j.id}_${params.rodada}`,
            data: new Date().toISOString(),
            titulo: 'Dispensa recusada',
            texto: `${j.nome} não aceitou o acordo amigável. Rescisão integral: R$ ${oferta.valorIntegral.toLocaleString('pt-BR')}.`,
          },
        ],
      };
    }
  } else {
    modo = 'INTEGRAL';
  }

  const custo = modo === 'ACORDO' ? oferta.valorAcordo : oferta.valorIntegral;
  if (params.financas.saldo_caixa < custo) {
    return {
      resultado: {
        ok: false,
        motivo: `Caixa insuficiente (precisa R$ ${custo.toLocaleString('pt-BR')}).`,
        oferta,
      },
      jogadores: params.jogadores,
      financas: params.financas,
      noticias: [],
    };
  }

  const jogadores = params.jogadores.filter((x) => x.id !== j.id);
  const lancamento: FinancasClube['lancamentos'][number] = {
    time_id: params.clubeId,
    rodada: params.rodada,
    mes: params.mes,
    tipo: 'DESPESA',
    categoria: 'RESCISAO_CONTRATUAL',
    descricao:
      modo === 'ACORDO' ?
        `Dispensa acordo 50% — ${j.nome}`
      : `Dispensa rescisão integral — ${j.nome}`,
    valor: custo,
  };
  const financas: FinancasClube = {
    ...params.financas,
    saldo_caixa: params.financas.saldo_caixa - custo,
    lancamentos: [lancamento, ...params.financas.lancamentos].slice(0, 120),
  };

  const mensagem =
    modo === 'ACORDO' ?
      `${j.nome} aceitou o acordo e deixou o clube. Custo: R$ ${custo.toLocaleString('pt-BR')}.`
    : `${j.nome} foi dispensado com pagamento integral. Custo: R$ ${custo.toLocaleString('pt-BR')}.`;

  return {
    resultado: { ok: true, modo, custo, mensagem },
    jogadores,
    financas,
    noticias: [
      {
        id: `dispensa_ok_${j.id}_${params.rodada}`,
        data: new Date().toISOString(),
        titulo: 'Dispensa concluída',
        texto: mensagem,
      },
    ],
  };
}

/** Alinha constante do youth academy com o teto Sub-23 (30). */
export { TETO_PLANTEL_PRO_SUB23 as TETO_PLANTEL_PROFISSIONAL_EFETIVO };
