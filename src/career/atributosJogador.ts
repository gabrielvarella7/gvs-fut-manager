import type { Posicao } from '../types/schema';
import type {
  AtributosFisicos,
  AtributosJogador,
  AtributosMentais,
  AtributosTecnicos,
  Jogador,
} from '../types/schema';

export const ESCALA_ATTR_MAX = 20;

const LEGACY = ['defesa', 'passe', 'chute', 'velocidade'] as const;
type LegacyAtributos = Record<(typeof LEGACY)[number], number>;

export function clampAttr20(n: number): number {
  return Math.max(1, Math.min(ESCALA_ATTR_MAX, Math.round(n)));
}

export function mediaAtributosGrupo(
  a: AtributosJogador,
  grupo: 'tecnicos' | 'mentais' | 'fisicos',
): number {
  const vals = Object.values(a[grupo]);
  const media = vals.reduce((s, v) => s + v, 0) / Math.max(vals.length, 1);
  return Math.round(media * 10) / 10;
}

export function legadoParaEscala20(n: number): number {
  return clampAttr20(n / 5);
}

function jitterEstavel(seed: number, base: number): number {
  const v = (((seed * 1103515245 + 12345) >>> 0) % 7) - 3;
  return clampAttr20(base + v);
}

/** Nota 0–100 usada pelo motor (derivada dos grupos 1–20). */
export interface MetricasMotorAtributos {
  defesa: number;
  passe: number;
  chute: number;
  velocidade: number;
  criatividade: number;
  agressividade: number;
  pressao: number;
  lideranca: number;
}

export function escalaMotor(n20: number): number {
  return Math.max(5, Math.min(100, n20 * 5));
}

export function metricasMotorDeAtributos(a: AtributosJogador): MetricasMotorAtributos {
  const { tecnicos: t, mentais: m, fisicos: f } = a;
  return {
    defesa: escalaMotor(
      m.cobertura * 0.45 + t.cabeceio * 0.2 + f.forca * 0.25 + t.passe * 0.1,
    ),
    passe: escalaMotor(t.passe * 0.55 + t.dominio * 0.25 + t.lancamentos * 0.2),
    chute: escalaMotor(t.chute * 0.65 + t.cabeceio * 0.15 + t.dominio * 0.1 + f.forca * 0.1),
    velocidade: escalaMotor(f.velocidade * 0.75 + t.drible * 0.15 + f.forca * 0.1),
    criatividade: escalaMotor(m.criatividade * 0.6 + t.drible * 0.25 + t.passe * 0.15),
    agressividade: escalaMotor(m.agressividade),
    pressao: escalaMotor(m.pressao),
    lideranca: escalaMotor(m.lideranca),
  };
}

const PESO_GERAL_POS: Record<Posicao, Partial<Record<keyof AtributosTecnicos | keyof AtributosMentais | keyof AtributosFisicos, number>>> = {
  GOL: {
    dominio: 1.4,
    passe: 1.1,
    chute: 0.4,
    cobertura: 1.3,
    fora_por_lesao: 1.2,
    leitura_jogo: 1.1,
  },
  ZAG: {
    cabeceio: 1.3,
    cobertura: 1.4,
    forca: 1.2,
    agressividade: 1.05,
  },
  LAT: {
    velocidade: 1.2,
    drible: 1.05,
    cobertura: 1.1,
  },
  VOL: {
    cobertura: 1.2,
    lancamentos: 1.15,
    forca: 1.1,
    agressividade: 1.1,
  },
  MEI: {
    passe: 1.25,
    criatividade: 1.25,
    dominio: 1.15,
    drible: 1.05,
  },
  ATA: {
    chute: 1.3,
    velocidade: 1.15,
    drible: 1.1,
    cabeceio: 1.05,
  },
};

function flattenAtributos(a: AtributosJogador): Record<string, number> {
  return { ...a.tecnicos, ...a.mentais, ...a.fisicos };
}

export function overallDeAtributos(posicao: Posicao, atributos: AtributosJogador): number {
  const flat = flattenAtributos(atributos);
  const pesos = PESO_GERAL_POS[posicao] ?? {};
  let soma = 0;
  let pesoTotal = 0;
  for (const [k, v] of Object.entries(flat)) {
    const p = pesos[k as keyof typeof pesos] ?? 1;
    soma += v * p;
    pesoTotal += p;
  }
  const media20 = soma / pesoTotal;
  return Math.max(40, Math.min(96, Math.round(media20 * 4.75)));
}

function escalarAttrsPorFator(atributos: AtributosJogador, fator: number): AtributosJogador {
  const scale = (n: number) => clampAttr20(n * fator);
  return {
    tecnicos: {
      dominio: scale(atributos.tecnicos.dominio),
      passe: scale(atributos.tecnicos.passe),
      chute: scale(atributos.tecnicos.chute),
      cabeceio: scale(atributos.tecnicos.cabeceio),
      drible: scale(atributos.tecnicos.drible),
      lancamentos: scale(atributos.tecnicos.lancamentos),
      bola_parada: scale(atributos.tecnicos.bola_parada),
    },
    mentais: {
      leitura_jogo: scale(atributos.mentais.leitura_jogo),
      cobertura: scale(atributos.mentais.cobertura),
      criatividade: scale(atributos.mentais.criatividade),
      agressividade: scale(atributos.mentais.agressividade),
      lideranca: scale(atributos.mentais.lideranca),
      pressao: scale(atributos.mentais.pressao),
    },
    fisicos: {
      fora_por_lesao: scale(atributos.fisicos.fora_por_lesao),
      velocidade: scale(atributos.fisicos.velocidade),
      forca: scale(atributos.fisicos.forca),
    },
  };
}

/**
 * Escala atributos (1–20) para o overall alvo. Necessário porque
 * `gerarAtributosNovos` comprime forca baixa (~piso OVR 58–62).
 */
export function calibrarAtributosParaOverall(
  posicao: Posicao,
  atributos: AtributosJogador,
  ovrAlvo: number,
): AtributosJogador {
  const alvo = Math.max(40, Math.min(96, Math.round(ovrAlvo)));
  const atual = overallDeAtributos(posicao, atributos);
  if (atual === alvo) return atributos;

  let lo = 0.28;
  let hi = 1.5;
  let melhor: AtributosJogador = atributos;
  let melhorGap = Math.abs(atual - alvo);

  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const candidato = escalarAttrsPorFator(atributos, mid);
    const o = overallDeAtributos(posicao, candidato);
    const gap = Math.abs(o - alvo);
    // Prefere ≤ alvo em empate (evita estourar teto da base)
    if (gap < melhorGap || (gap === melhorGap && o <= alvo && overallDeAtributos(posicao, melhor) > alvo)) {
      melhor = candidato;
      melhorGap = gap;
    }
    if (o > alvo) hi = mid;
    else lo = mid;
    if (o === alvo) return candidato;
  }

  // Micro-ajuste: −1 em attrs se ainda acima do alvo
  if (overallDeAtributos(posicao, melhor) > alvo) {
    const clone: AtributosJogador = {
      tecnicos: { ...melhor.tecnicos },
      mentais: { ...melhor.mentais },
      fisicos: { ...melhor.fisicos },
    };
    const bumpDown = (obj: Record<string, number>) => {
      for (const k of Object.keys(obj)) {
        if ((obj[k] ?? 1) > 1) {
          obj[k] = (obj[k] ?? 1) - 1;
          return true;
        }
      }
      return false;
    };
    for (let n = 0; n < 12 && overallDeAtributos(posicao, clone) > alvo; n++) {
      if (
        !bumpDown(clone.tecnicos as unknown as Record<string, number>) &&
        !bumpDown(clone.mentais as unknown as Record<string, number>) &&
        !bumpDown(clone.fisicos as unknown as Record<string, number>)
      ) {
        break;
      }
    }
    if (overallDeAtributos(posicao, clone) <= alvo || Math.abs(overallDeAtributos(posicao, clone) - alvo) <= melhorGap) {
      melhor = clone;
    }
  }
  return melhor;
}

export function isAtributosLegado(a: unknown): a is LegacyAtributos {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return LEGACY.every((k) => typeof o[k] === 'number') && !('tecnicos' in o);
}

export function converterAtributosLegado(
  posicao: Posicao,
  legado: LegacyAtributos,
  id: number,
  idade: number,
): AtributosJogador {
  const d = legadoParaEscala20(legado.defesa);
  const p = legadoParaEscala20(legado.passe);
  const c = legadoParaEscala20(legado.chute);
  const v = legadoParaEscala20(legado.velocidade);
  const base = (d + p + c + v) / 4;

  const tecnicos: AtributosTecnicos = {
    dominio: jitterEstavel(id + 1, posicao === 'GOL' || posicao === 'MEI' ? p + 1 : p),
    passe: p,
    chute: c,
    cabeceio: jitterEstavel(
      id + 2,
      posicao === 'ZAG' || posicao === 'ATA' ? Math.max(d, c) : Math.round((d + c) / 2 - 1),
    ),
    drible: jitterEstavel(
      id + 3,
      posicao === 'ATA' || posicao === 'LAT' || posicao === 'MEI' ? v : Math.round(v - 2),
    ),
    lancamentos: jitterEstavel(
      id + 4,
      posicao === 'GOL' || posicao === 'VOL' || posicao === 'ZAG' ? p + 1 : p - 1,
    ),
    bola_parada: jitterEstavel(
      id + 5,
      posicao === 'ATA' || posicao === 'MEI' ? c + 1 : Math.round((c + p) / 2),
    ),
  };

  const mentais: AtributosMentais = {
    leitura_jogo: jitterEstavel(id + 6, Math.round(d * 0.45 + p * 0.45 + (idade > 28 ? 2 : 0))),
    cobertura: jitterEstavel(id + 7, posicao === 'GOL' || posicao === 'ZAG' || posicao === 'VOL' ? d + 1 : d),
    criatividade: jitterEstavel(id + 8, posicao === 'MEI' || posicao === 'ATA' ? p : Math.round(p - 1)),
    agressividade: jitterEstavel(
      id + 9,
      posicao === 'VOL' || posicao === 'ZAG' ? base + 1 : Math.round(base - 1),
    ),
    lideranca: jitterEstavel(id + 10, Math.round(base + (idade >= 30 ? 2 : idade >= 26 ? 1 : -1))),
    pressao: jitterEstavel(id + 11, Math.round(base + (c >= 14 ? 1 : 0))),
  };

  const lesaoBase =
    idade >= 32 ? base - 2 : idade >= 29 ? base - 1 : idade <= 21 ? base : base + 1;

  const fisicos: AtributosFisicos = {
    fora_por_lesao: jitterEstavel(id + 12, lesaoBase),
    velocidade: v,
    forca: jitterEstavel(
      id + 13,
      posicao === 'ZAG' || posicao === 'VOL' || posicao === 'GOL' ? d : Math.round((d + v) / 2),
    ),
  };

  return { tecnicos, mentais, fisicos };
}

export function gerarAtributosNovos(
  posicao: Posicao,
  forcaBase: number,
  id: number,
  idade: number,
  rnd: () => number,
): AtributosJogador {
  const jitter = () => Math.round((rnd() - 0.5) * 14);
  const clamp99 = (n: number) => Math.max(40, Math.min(96, Math.round(n)));
  const bias = {
    GOL: { defesa: 22, passe: 4, chute: -8, velocidade: -2 },
    ZAG: { defesa: 18, passe: 2, chute: -6, velocidade: 0 },
    LAT: { defesa: 10, passe: 4, chute: -2, velocidade: 10 },
    VOL: { defesa: 8, passe: 6, chute: 0, velocidade: 4 },
    MEI: { defesa: -2, passe: 12, chute: 4, velocidade: 4 },
    ATA: { defesa: -12, passe: 4, chute: 14, velocidade: 8 },
  }[posicao];
  const base = 50 + forcaBase * 0.38;
  return converterAtributosLegado(
    posicao,
    {
      defesa: clamp99(base + bias.defesa + jitter()),
      passe: clamp99(base + bias.passe + jitter()),
      chute: clamp99(base + bias.chute + jitter()),
      velocidade: clamp99(base + bias.velocidade + jitter()),
    },
    id,
    idade,
  );
}

export function garantirAtributosJogador(j: Jogador): Jogador {
  const bruto = j.atributos as unknown;
  if (!isAtributosLegado(bruto)) {
    return j;
  }
  const atributos = converterAtributosLegado(j.posicao, bruto, j.id, j.idade);
  const overall = j.overall || overallDeAtributos(j.posicao, atributos);
  return { ...j, atributos, overall };
}

export const GRUPOS_ATRIBUTO: {
  titulo: string;
  campos: { key: string; label: string; hint?: string }[];
}[] = [
  {
    titulo: 'Técnicos',
    campos: [
      { key: 'dominio', label: 'Domínio' },
      { key: 'passe', label: 'Passe' },
      { key: 'chute', label: 'Chute' },
      { key: 'cabeceio', label: 'Cabeceio' },
      { key: 'drible', label: 'Drible' },
      { key: 'lancamentos', label: 'Lançamentos' },
      { key: 'bola_parada', label: 'Bola parada' },
    ],
  },
  {
    titulo: 'Mentais',
    campos: [
      { key: 'leitura_jogo', label: 'Leitura de jogo', hint: 'Adapta-se a mudanças táticas' },
      { key: 'cobertura', label: 'Cobertura', hint: 'Menos espaços; mais roubadas' },
      { key: 'criatividade', label: 'Criatividade' },
      { key: 'agressividade', label: 'Agressividade', hint: 'Mais cartões e expulsões' },
      { key: 'lideranca', label: 'Liderança' },
      { key: 'pressao', label: 'Pressão', hint: 'Desempenho em jogos decisivos' },
    ],
  },
  {
    titulo: 'Físicos',
    campos: [
      {
        key: 'fora_por_lesao',
        label: 'Resistência a lesão',
        hint: '20 = quase nunca fica fora por lesão',
      },
      { key: 'velocidade', label: 'Velocidade' },
      { key: 'forca', label: 'Força' },
    ],
  },
];