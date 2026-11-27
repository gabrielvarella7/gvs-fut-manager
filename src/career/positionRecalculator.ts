/**
 * Attribute-Driven Positional Matrix (Gabriel).
 * Port of `/cursor/stores/self/internal/affinity/PositionRecalculator.ts`
 * + thresholds from `positional-matrix-spec.md`.
 *
 * Attrs do motor: 1–20 → escala 0–100 via `escalaMotor`.
 * Schema Posicao (GOL/ZAG/LAT/VOL/MEI/ATA) ↔ posições finas (LD/LE/MC/CA…).
 */
import { escalaMotor, metricasMotorDeAtributos } from './atributosJogador';
import type { LinhaCampinho } from '../data/campinhoLayout';
import type { Jogador, Posicao } from '../types/schema';

/** Posições táticas finas (Mestre Mou / Gabriel). */
export type PositionFina =
  | 'GOL'
  | 'ZAG'
  | 'LD'
  | 'LE'
  | 'AD'
  | 'AE'
  | 'VOL'
  | 'MC'
  | 'MD'
  | 'ME'
  | 'MEI'
  | 'PD'
  | 'PE'
  | 'ST'
  | 'CA';

export interface AtributosMatriz {
  velocidade: number;
  aceleracao: number;
  passe: number;
  drible: number;
  finalizacao: number;
  defesa: number;
  cobertura: number;
  ataque: number;
  forca: number;
  resistencia: number;
  /** 1–5 (perna ruim / weak foot). */
  pernaRuim: number;
  /** Visão de jogo (leitura). */
  visao: number;
  /** Compostura sob pressão. */
  compostura: number;
}

export interface JogadorMatriz {
  id: string;
  nome: string;
  overall: number;
  posicaoPrincipal: PositionFina;
  posicoesNativas: PositionFina[];
  posicoesAdaptadas: { posicao: PositionFina; fatorOverall: number }[];
  atributos: AtributosMatriz;
}

/** Y 0–5 no campinho (GOL→ATA). */
const Y_LINHA: Record<LinhaCampinho, number> = {
  GOL: 0,
  DEF: 1,
  VOL: 2,
  MC: 3,
  MO: 4,
  ATA: 5,
};

/** Coordenadas X 0–2 / Y 0–5 das posições finas. */
const COORD_FINA: Record<PositionFina, { x: number; y: number }> = {
  GOL: { x: 1, y: 0 },
  ZAG: { x: 1, y: 1 },
  LD: { x: 2, y: 1 },
  LE: { x: 0, y: 1 },
  VOL: { x: 1, y: 2 },
  MC: { x: 1, y: 3 },
  MD: { x: 2, y: 3 },
  ME: { x: 0, y: 3 },
  MEI: { x: 1, y: 4 },
  ST: { x: 1, y: 4 },
  AD: { x: 2, y: 4 },
  AE: { x: 0, y: 4 },
  PD: { x: 2, y: 5 },
  PE: { x: 0, y: 5 },
  CA: { x: 1, y: 5 },
};

/** Schema → finas candidatas no slot (col 0=esquerda/LE, col 4=direita/LD). */
export function finasParaSlotSchema(
  pos: Posicao,
  col?: number,
  linha?: LinhaCampinho,
): PositionFina[] {
  switch (pos) {
    case 'GOL':
      return ['GOL'];
    case 'ZAG':
      return ['ZAG'];
    case 'LAT': {
      if (col === 0 || col === 1) return ['LE'];
      if (col === 3 || col === 4) return ['LD'];
      return ['LD', 'LE'];
    }
    case 'VOL':
      return ['VOL'];
    case 'MEI': {
      // Ponta na faixa MO ainda MEI (fallback): incluir PE/AE para não penalizar.
      if (col === 0) {
        if (linha === 'MO' || linha === 'ATA') return ['PE', 'AE', 'ME', 'MEI', 'MC'];
        return ['ME', 'MD', 'MC', 'MEI'];
      }
      if (col === 4) {
        if (linha === 'MO' || linha === 'ATA') return ['PD', 'AD', 'MD', 'MEI', 'MC'];
        return ['MD', 'ME', 'MC', 'MEI'];
      }
      if (linha === 'MO') return ['ST', 'CA', 'MEI', 'MC'];
      return ['MC', 'MEI', 'ST'];
    }
    case 'ATA': {
      // Asas: só papéis de ponta/ala — evita meia com chute “herdar” OVR via ST/CA.
      if (col === 0) return ['PE', 'AE'];
      if (col === 4) return ['PD', 'AD'];
      if (col === 1) return ['AE', 'PE'];
      if (col === 3) return ['AD', 'PD'];
      // Centro: CA na linha ATA; ST atrás do CA (MO) — separados p/ pena de ponta leve.
      if (linha === 'MO') return ['ST'];
      return ['CA'];
    }
  }
}

/** Principal fina a partir do schema (+ secundárias como sementes). */
export function sementesNativasDe(jogador: Jogador): {
  principal: PositionFina;
  nativas: PositionFina[];
} {
  const nativas = new Set<PositionFina>();
  let principal: PositionFina;

  switch (jogador.posicao) {
    case 'GOL':
      principal = 'GOL';
      nativas.add('GOL');
      break;
    case 'ZAG':
      principal = 'ZAG';
      nativas.add('ZAG');
      break;
    case 'LAT':
      principal = 'LD';
      nativas.add('LD');
      nativas.add('LE');
      break;
    case 'VOL':
      principal = 'VOL';
      nativas.add('VOL');
      break;
    case 'MEI':
      principal = 'MC';
      nativas.add('MC');
      nativas.add('MEI');
      break;
    case 'ATA':
      principal = 'CA';
      nativas.add('CA');
      break;
  }

  for (const sec of jogador.posicoes_secundarias ?? []) {
    for (const f of finasParaSlotSchema(sec)) nativas.add(f);
  }

  return { principal, nativas: [...nativas] };
}

/** Perna ruim estável 1–5 a partir do id (sem campo no schema). */
export function pernaRuimDe(id: number): number {
  const v = ((id * 1103515245 + 12345) >>> 0) % 5;
  return v + 1;
}

/** Mapeia atributos do jogo (1–20) → métricas 0–100 da matriz. */
export function atributosMatrizDe(jogador: Jogador): AtributosMatriz {
  const { tecnicos: t, mentais: m, fisicos: f } = jogador.atributos;
  const motor = metricasMotorDeAtributos(jogador.atributos);
  return {
    velocidade: motor.velocidade,
    // Sem aceleração dedicada: mistura velocidade + drible + força.
    aceleracao: escalaMotor(f.velocidade * 0.55 + t.drible * 0.25 + f.forca * 0.2),
    passe: motor.passe,
    drible: escalaMotor(t.drible),
    finalizacao: motor.chute,
    defesa: motor.defesa,
    cobertura: escalaMotor(m.cobertura),
    ataque: escalaMotor(t.chute * 0.4 + t.drible * 0.35 + m.criatividade * 0.25),
    forca: escalaMotor(f.forca),
    // Resistência: fora_por_lesao + físico (proxy de stamina).
    resistencia: escalaMotor(f.fora_por_lesao * 0.45 + f.forca * 0.35 + f.velocidade * 0.2),
    pernaRuim: pernaRuimDe(jogador.id),
    visao: escalaMotor(m.leitura_jogo),
    compostura: escalaMotor(m.pressao),
  };
}

function jogadorParaMatriz(jogador: Jogador): JogadorMatriz {
  const { principal, nativas } = sementesNativasDe(jogador);
  const cache = jogador.afinidade_matriz;
  return {
    id: String(jogador.id),
    nome: jogador.nome,
    overall: jogador.overall,
    posicaoPrincipal: principal,
    posicoesNativas: cache?.posicoesNativas ?? nativas,
    posicoesAdaptadas: cache?.posicoesAdaptadas ?? [],
    atributos: atributosMatrizDe(jogador),
  };
}

function schemaDeFina(f: PositionFina): Posicao {
  if (f === 'GOL') return 'GOL';
  if (f === 'ZAG') return 'ZAG';
  if (f === 'VOL') return 'VOL';
  if (f === 'LD' || f === 'LE') return 'LAT';
  if (f === 'MC' || f === 'MD' || f === 'ME' || f === 'MEI') return 'MEI';
  return 'ATA'; // AD AE PD PE ST CA
}

/** Mult de improvisação por distância (spec C). */
export function fatorImprovisoDistancia(
  de: PositionFina,
  para: PositionFina,
  attr: AtributosMatriz,
): number {
  if (de === 'GOL' || para === 'GOL') {
    return 0.25;
  }
  const a = COORD_FINA[de];
  const b = COORD_FINA[para];
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);

  // Mesma linha, lado oposto.
  if (dy === 0 && dx >= 2) {
    return attr.pernaRuim >= 4 ? 0.98 : 0.94; // −2% / −6%
  }
  if (dy === 0 && dx === 1) {
    return attr.pernaRuim >= 4 ? 0.98 : 0.94;
  }

  // 1 linha vertical — −10% amortizado por attrs-chave.
  if (dy === 1) {
    const chave = (attr.passe + attr.velocidade + attr.cobertura + attr.drible) / 4;
    const amort = Math.min(0.08, (chave / 100) * 0.1);
    let fator = 0.9 + amort;
    if (dx >= 2) fator -= 0.03;
    return Math.max(0.82, Math.min(0.96, fator));
  }

  // Extremo 2+ linhas: −25% a −45%.
  const pena = Math.min(45, 25 + (dy - 2) * 10 + (dx >= 2 ? 5 : 0));
  return 1 - pena / 100;
}

/**
 * Runtime evaluator — Native 100% / Adapted −3..−6% / Improvised distance grid.
 */
export class PositionRecalculator {
  public static processarElenco(jogadores: Jogador[]): Jogador[] {
    return jogadores.map((j) => this.recalcularPosicoesJogador(j));
  }

  public static recalcularPosicoesJogador(jogador: Jogador): Jogador {
    const base = jogadorParaMatriz(jogador);
    // Sempre recalcula a partir das sementes (attrs atuais), não do cache velho.
    const semente = sementesNativasDe(jogador);
    const calc = this.recalcularMatriz({
      ...base,
      posicaoPrincipal: semente.principal,
      posicoesNativas: semente.nativas,
      posicoesAdaptadas: [],
    });
    return {
      ...jogador,
      afinidade_matriz: {
        posicoesNativas: calc.posicoesNativas,
        posicoesAdaptadas: calc.posicoesAdaptadas,
      },
    };
  }

  public static recalcularMatriz(jogador: JogadorMatriz): JogadorMatriz {
    const nativas = new Set<PositionFina>([
      jogador.posicaoPrincipal,
      ...jogador.posicoesNativas,
    ]);
    const adaptadas = new Map<PositionFina, number>();
    const attr = jogador.atributos;
    const orig = jogador.posicaoPrincipal;

    const addAdaptada = (pos: PositionFina, fator: number) => {
      if (!nativas.has(pos)) {
        const atual = adaptadas.get(pos) ?? 0;
        if (fator > atual) adaptadas.set(pos, fator);
      }
    };

    const isDir =
      orig === 'LD' || nativas.has('LD') || orig === 'AD' || nativas.has('AD');
    const isEsq =
      orig === 'LE' || nativas.has('LE') || orig === 'AE' || nativas.has('AE');

    // ——— A Native ———
    // LD/LE → AD/AE (Ataque≥75 Resist≥75)
    if (orig === 'LD' || orig === 'LE' || nativas.has('LD') || nativas.has('LE')) {
      if (attr.ataque >= 75 && attr.resistencia >= 75) {
        if (isDir || orig === 'LD' || nativas.has('LD')) nativas.add('AD');
        if (isEsq || orig === 'LE' || nativas.has('LE')) nativas.add('AE');
      }
      // LD/LE → MC (Passe≥78 Visão≥74)
      if (attr.passe >= 78 && attr.visao >= 74) {
        nativas.add('MC');
      }
      // LD/LE → MD/ME (Passe≥75 Vel≥80)
      if (attr.passe >= 75 && attr.velocidade >= 80) {
        if (isDir || nativas.has('LD')) nativas.add('MD');
        if (isEsq || nativas.has('LE')) nativas.add('ME');
      }
      // LD/LE → PD/PE (Vel≥82 Drible≥78)
      if (attr.velocidade >= 82 && attr.drible >= 78) {
        if (isDir || nativas.has('LD')) nativas.add('PD');
        if (isEsq || nativas.has('LE')) nativas.add('PE');
      }
    }

    // ZAG → LD/LE (Vel≥78 Acel≥75)
    if (orig === 'ZAG' || nativas.has('ZAG')) {
      if (attr.velocidade >= 78 && attr.aceleracao >= 75) {
        nativas.add('LD');
        nativas.add('LE');
      }
      // ZAG → VOL (Cobertura≥78 Vel≥75 Passe≥70)
      if (attr.cobertura >= 78 && attr.velocidade >= 75 && attr.passe >= 70) {
        nativas.add('VOL');
      }
      // ZAG líbero (Passe≥76 Compostura≥75) — trata como MC nativo leve
      if (attr.passe >= 76 && attr.compostura >= 75) {
        addAdaptada('MC', 0.97);
        addAdaptada('VOL', 0.98);
      }
    }

    // VOL → LD/LE (Vel≥76 Passe≥70) — spec; acel ajuda
    if (orig === 'VOL' || nativas.has('VOL')) {
      if (attr.velocidade >= 76 && attr.passe >= 70) {
        nativas.add('LD');
        nativas.add('LE');
      }
      // VOL → ZAG (Def≥80 Força≥75)
      if (attr.defesa >= 80 && attr.forca >= 75) {
        nativas.add('ZAG');
      }
      // VOL → MC adapted (Passe≥75 Drible≥70 → −3%)
      if (attr.passe >= 75 && attr.drible >= 70) {
        addAdaptada('MC', 0.97);
        addAdaptada('MEI', 0.97);
      }
    }

    // ATA/ST/CA com perfil de ponta (vel alta) → asas nativas (wing freely)
    if (orig === 'CA' || orig === 'ST' || nativas.has('CA') || nativas.has('ST')) {
      if (attr.velocidade >= 80 && (attr.drible >= 68 || attr.ataque >= 70)) {
        nativas.add('AE');
        nativas.add('AD');
        nativas.add('PE');
        nativas.add('PD');
      }
    }

    // PD ↔ PE auto (lados opostos da mesma profundidade)
    if (orig === 'PD' || orig === 'PE' || nativas.has('PD') || nativas.has('PE')) {
      nativas.add('PD');
      nativas.add('PE');
    }

    // AE ↔ PE / AD ↔ PD — mesma ponta, altura avançada vs recuada (100% OVR)
    if (orig === 'AE' || orig === 'PE' || nativas.has('AE') || nativas.has('PE')) {
      nativas.add('AE');
      nativas.add('PE');
    }
    if (orig === 'AD' || orig === 'PD' || nativas.has('AD') || nativas.has('PD')) {
      nativas.add('AD');
      nativas.add('PD');
    }

    // MEI → PD/PE (Vel≥78 Drible≥78)
    if (orig === 'MEI' || orig === 'MC' || nativas.has('MEI') || nativas.has('MC')) {
      if (attr.velocidade >= 78 && attr.drible >= 78) {
        nativas.add('PD');
        nativas.add('PE');
        nativas.add('AD');
        nativas.add('AE');
      }
    }

    const ehPonta =
      orig === 'AE' ||
      orig === 'AD' ||
      orig === 'PE' ||
      orig === 'PD' ||
      nativas.has('AE') ||
      nativas.has('AD') ||
      nativas.has('PE') ||
      nativas.has('PD');
    // Ponta rápida e leve (ex.: Kevin vel17 / força13) — CA não é nativo grátis.
    const pontaLeveCa =
      ehPonta && attr.velocidade >= 78 && attr.forca < 70;

    // ST ↔ CA — segundo atacante / centro (ponta leve: ST ok, CA só adaptado)
    if (orig === 'ST' || orig === 'CA' || nativas.has('ST') || nativas.has('CA')) {
      if (pontaLeveCa) {
        nativas.add('ST');
        nativas.delete('CA');
      } else {
        nativas.add('ST');
        nativas.add('CA');
      }
    }

    // ——— B Adapted ———
    // ST/AE/AD/PE/PD → CA (força baixa + vel alta → pena leve ~−6%)
    if (
      nativas.has('ST') ||
      nativas.has('AE') ||
      nativas.has('AD') ||
      nativas.has('PE') ||
      nativas.has('PD') ||
      orig === 'AE' ||
      orig === 'AD' ||
      orig === 'PE' ||
      orig === 'PD'
    ) {
      if (!nativas.has('CA')) {
        if (attr.forca >= 75 || attr.finalizacao >= 78) {
          addAdaptada('CA', 0.97);
        } else if (attr.velocidade >= 78 && attr.forca < 70) {
          addAdaptada('CA', 0.94);
        } else {
          addAdaptada('CA', 0.95);
        }
      }
    }

    // Meias (MC/ME/MD/MEI/VOL) → AE/AD: chute sozinho NÃO libera ala.
    // Vel+drible ok → −4%; chute ok + vel baixa → −6% (ex.: Paulo vel12/drible10).
    {
      const ehMeia =
        orig === 'MC' ||
        orig === 'MEI' ||
        orig === 'ME' ||
        orig === 'MD' ||
        orig === 'VOL' ||
        nativas.has('MC') ||
        nativas.has('MEI') ||
        nativas.has('ME') ||
        nativas.has('MD') ||
        nativas.has('VOL');
      const jaAla =
        nativas.has('AE') ||
        nativas.has('AD') ||
        nativas.has('PE') ||
        nativas.has('PD');
      if (ehMeia && !jaAla) {
        if (attr.velocidade >= 74 && attr.drible >= 70) {
          addAdaptada('AE', 0.96);
          addAdaptada('AD', 0.96);
        } else if (attr.finalizacao >= 70 && attr.velocidade < 70) {
          addAdaptada('AE', 0.94);
          addAdaptada('AD', 0.94);
        } else if (attr.finalizacao >= 72 || attr.ataque >= 72) {
          addAdaptada('AE', 0.95);
          addAdaptada('AD', 0.95);
        }
      }
    }

    // MC → ST/MEI (Fin≥76 Ataque≥74 → −4%)
    if (orig === 'MC' || nativas.has('MC')) {
      if (attr.finalizacao >= 76 && attr.ataque >= 74) {
        addAdaptada('ST', 0.96);
        addAdaptada('MEI', 0.96);
      } else if (attr.finalizacao >= 75) {
        // fallback Gabriel
        addAdaptada('ST', 0.96);
        addAdaptada('MEI', 0.97);
      }
    }

    // ST/MEI → MC (Passe≥78 Resist≥72 → −4%)
    if (orig === 'ST' || nativas.has('ST') || orig === 'MEI' || nativas.has('MEI')) {
      if (attr.passe >= 78 && attr.resistencia >= 72) {
        addAdaptada('MC', 0.96);
      } else if (attr.passe >= 76) {
        addAdaptada('MC', 0.96);
        addAdaptada('MEI', 0.98);
      }
    }

    // CA → ST (Passe≥72 Drible≥72 → −4%)
    if (orig === 'CA' || nativas.has('CA')) {
      if (attr.passe >= 72 && attr.drible >= 72) {
        addAdaptada('ST', 0.96);
        addAdaptada('MEI', 0.96);
      }
      // CA com drible+vel pode virar ala adaptado
      if (attr.drible >= 74 && attr.velocidade >= 74) {
        addAdaptada('AD', 0.96);
        addAdaptada('AE', 0.96);
      }
    }

    // PD/PE → MD/ME (Resist≥76 Def≥60 → −4%)
    if (nativas.has('PD') || nativas.has('PE')) {
      if (attr.resistencia >= 76 && attr.defesa >= 60) {
        addAdaptada('MD', 0.96);
        addAdaptada('ME', 0.96);
      }
    }

    for (const posNativa of nativas) {
      adaptadas.delete(posNativa);
    }

    return {
      ...jogador,
      posicoesNativas: Array.from(nativas),
      posicoesAdaptadas: Array.from(adaptadas.entries()).map(([posicao, fatorOverall]) => ({
        posicao,
        fatorOverall,
      })),
    };
  }

  public static getOverallNaPosicao(
    jogador: JogadorMatriz,
    posicaoEscalado: PositionFina,
  ): number {
    const nativas = jogador.posicoesNativas;
    if (nativas.includes(posicaoEscalado)) {
      return jogador.overall;
    }
    const adaptada = jogador.posicoesAdaptadas.find((p) => p.posicao === posicaoEscalado);
    if (adaptada) {
      return Math.round(jogador.overall * adaptada.fatorOverall);
    }
    if (jogador.posicaoPrincipal === 'GOL' || posicaoEscalado === 'GOL') {
      return Math.max(15, Math.round(jogador.overall * 0.25));
    }

    // Distância a partir da principal (ou melhor nativa mais próxima).
    let melhor = fatorImprovisoDistancia(
      jogador.posicaoPrincipal,
      posicaoEscalado,
      jogador.atributos,
    );
    for (const n of nativas) {
      const f = fatorImprovisoDistancia(n, posicaoEscalado, jogador.atributos);
      if (f > melhor) melhor = f;
    }
    // Lado oposto LD↔LE / AD↔AE com perna boa (Gabriel).
    if (
      (posicaoEscalado === 'LD' || posicaoEscalado === 'LE') &&
      (nativas.includes('LD') || nativas.includes('LE'))
    ) {
      const lado = jogador.atributos.pernaRuim >= 4 ? 0.96 : 0.92;
      melhor = Math.max(melhor, lado);
    }
    return Math.round(jogador.overall * melhor);
  }

  /** API schema: overall no slot GOL/ZAG/LAT/VOL/MEI/ATA. */
  public static getOverallNaPosicaoSchema(
    jogador: Jogador,
    posicaoEscalada: Posicao,
    opts: { col?: number; linha?: LinhaCampinho } = {},
  ): number {
    const enriquecido = jogador.afinidade_matriz
      ? jogador
      : this.recalcularPosicoesJogador(jogador);
    const matriz = jogadorParaMatriz(enriquecido);
    // Garante nativas/adaptadas recalculadas
    const calc = this.recalcularMatriz({
      ...matriz,
      posicoesNativas: sementesNativasDe(jogador).nativas,
      posicoesAdaptadas: [],
    });

    const candidatas = finasParaSlotSchema(posicaoEscalada, opts.col, opts.linha);
    let melhor = 0;
    for (const c of candidatas) {
      const o = this.getOverallNaPosicao(calc, c);
      if (o > melhor) melhor = o;
    }
    // Fallback se lista vazia
    if (candidatas.length === 0) {
      return this.getOverallNaPosicao(calc, calc.posicaoPrincipal);
    }
    return melhor;
  }

  /** Multiplicador 0–1 para o motor (overall_campo / overall_base). */
  public static multiplicadorNaPosicaoSchema(
    jogador: Jogador,
    posicaoEscalada: Posicao,
    opts: { col?: number; linha?: LinhaCampinho } = {},
  ): { mult: number; overallCampo: number; nativa: boolean; adaptada: boolean } {
    const overallCampo = this.getOverallNaPosicaoSchema(jogador, posicaoEscalada, opts);
    const base = Math.max(1, jogador.overall);
    const mult = overallCampo / base;
    const calc = this.recalcularMatriz({
      ...jogadorParaMatriz(jogador),
      posicoesNativas: sementesNativasDe(jogador).nativas,
      posicoesAdaptadas: [],
    });
    const candidatas = finasParaSlotSchema(posicaoEscalada, opts.col, opts.linha);
    const nativa = candidatas.some((c) => calc.posicoesNativas.includes(c));
    const adaptada =
      !nativa &&
      candidatas.some((c) => calc.posicoesAdaptadas.some((a) => a.posicao === c));
    return { mult, overallCampo, nativa, adaptada };
  }

  /** Schema positions covered as native (for UI / secondary). */
  public static schemasNativos(jogador: Jogador): Posicao[] {
    const j = jogador.afinidade_matriz
      ? jogador
      : this.recalcularPosicoesJogador(jogador);
    const nativas = j.afinidade_matriz?.posicoesNativas ?? sementesNativasDe(jogador).nativas;
    const set = new Set<Posicao>();
    for (const f of nativas) set.add(schemaDeFina(f));
    return [...set];
  }
}
