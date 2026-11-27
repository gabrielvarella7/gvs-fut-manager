import { layoutCampinho, type LinhaCampinho } from '../data/campinhoLayout';
import { metricasMotorDeAtributos } from '../career/atributosJogador';
import type { EsquemaTatico, Jogador, Posicao } from '../types/schema';
import {
  montarEscalacao,
  type JogadorEmCampo,
  type Lancamento,
  type MatchSimResult,
} from './matchEngine';

/** Profundidade vertical (GOL atrás → ATA à frente) para o campinho de notas. */
const Y_LINHA_NOTAS: Record<LinhaCampinho, number> = {
  GOL: 92,
  DEF: 74,
  VOL: 58,
  MC: 46,
  MO: 32,
  ATA: 14,
};

/**
 * Coordenadas verticais (ataque ↑) com espalhamento uniforme por linha —
 * evita empilhar 5–6 jogadores na mesma coluna (ex.: 6-3-1).
 */
function coordsNotasVerticais(esquema: EsquemaTatico): { x: number; y: number }[] {
  const slots = layoutCampinho(esquema);
  const porLinha = new Map<LinhaCampinho, number[]>();
  slots.forEach((s, i) => {
    const lista = porLinha.get(s.linha) ?? [];
    lista.push(i);
    porLinha.set(s.linha, lista);
  });

  const coords: { x: number; y: number }[] = slots.map(() => ({ x: 50, y: 50 }));
  for (const [linha, indices] of porLinha) {
    const n = indices.length;
    const y = Y_LINHA_NOTAS[linha];
    if (n === 1) {
      coords[indices[0]!] = { x: 50, y };
      continue;
    }
    const margem = n >= 6 ? 6 : n >= 5 ? 8 : 10;
    const span = 100 - 2 * margem;
    indices.forEach((slotIdx, k) => {
      const x = margem + (span * k) / (n - 1);
      coords[slotIdx] = { x, y };
    });
  }
  return coords;
}

export type CorNotaFaixa = 'ruim' | 'media' | 'boa' | 'excelente';

export interface JogadorNotaLive {
  jogadorId: number;
  nome: string;
  nomeCurto: string;
  numero: number;
  posicao: Posicao;
  /** 0–100 pitch coords (horizontal field). */
  x: number;
  y: number;
  nota: number;
  faixa: CorNotaFaixa;
  capitao: boolean;
  entrouComoSub: boolean;
  gols: number;
  assistencias: number;
  motm: boolean;
  /** Ainda em campo neste minuto. */
  emCampo: boolean;
}

export interface TimeNotasLive {
  timeId: string;
  nome: string;
  esquema: EsquemaTatico;
  corPrimaria: string;
  corSecundaria: string;
  media: number;
  jogadores: JogadorNotaLive[];
}

export interface NotasPitchLive {
  mandante: TimeNotasLive;
  visitante: TimeNotasLive;
}

export type TimeNotasInput = {
  timeId: string;
  nome: string;
  esquema: EsquemaTatico;
  corPrimaria: string;
  corSecundaria: string;
  elenco: Jogador[];
  escalacao?: JogadorEmCampo[];
};

/** Cor CSS da faixa Sofascore-like. */
export function corNotaRating(nota: number): string {
  if (nota >= 8) return '#22d3ee'; // cyan excelente
  if (nota >= 7) return '#22c55e'; // verde
  if (nota >= 6.5) return '#eab308'; // amarelo
  if (nota >= 5.5) return '#f97316'; // laranja
  return '#ef4444'; // vermelho
}

export function faixaNota(nota: number): CorNotaFaixa {
  if (nota >= 8) return 'excelente';
  if (nota >= 7) return 'boa';
  if (nota >= 6.5) return 'media';
  return 'ruim';
}

export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace('.', ',');
}

export function nomeCurtoJogador(nome: string): string {
  // "Paulinho (ex-Flamengo)" / "Jane (Novas Estrelas)" → sem apelido entre parênteses
  const limpo = nome
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const parts = limpo.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) {
    const u = parts[0]!;
    return u.length > 12 ? `${u.slice(0, 11)}…` : u;
  }
  const inicial = parts[0]!.charAt(0).toUpperCase();
  const sobrenome = parts[parts.length - 1]!;
  const curto = `${inicial}. ${sobrenome}`;
  return curto.length > 11 ? `${curto.slice(0, 10)}…` : curto;
}

/** Número de camisa estável e legível (1–99), evitando colisões no elenco. */
export function numeroCamisaJogador(
  jogador: Jogador,
  usados: Set<number>,
): number {
  const preferidos: Partial<Record<Posicao, number[]>> = {
    GOL: [1, 12, 22, 31],
    ZAG: [3, 4, 2, 5, 13, 14],
    LAT: [2, 6, 16, 17],
    VOL: [5, 8, 15, 18],
    MEI: [8, 10, 7, 20, 21],
    ATA: [9, 11, 19, 7, 23],
  };
  for (const n of preferidos[jogador.posicao] ?? []) {
    if (!usados.has(n)) {
      usados.add(n);
      return n;
    }
  }
  let n = ((Math.abs(jogador.id) * 17) % 98) + 1;
  for (let i = 0; i < 99; i++) {
    const cand = ((n - 1 + i) % 99) + 1;
    if (!usados.has(cand)) {
      usados.add(cand);
      return cand;
    }
  }
  usados.add(n);
  return n;
}

function hash01(a: number, b: number): number {
  let x = (a ^ (b * 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function clampNota(n: number): number {
  return Math.max(3, Math.min(10, Math.round(n * 10) / 10));
}

type Acumulado = {
  gols: number;
  assistencias: number;
  chances: number;
  defesasGk: number;
  amarelos: number;
  expulso: boolean;
  entrouEm: number | null;
  saiuEm: number | null;
  posicao: Posicao;
  overall: number;
  lideranca: number;
  nome: string;
  jogador: Jogador;
};

function garantir(map: Map<number, Acumulado>, j: Jogador, pos: Posicao): Acumulado {
  let a = map.get(j.id);
  if (!a) {
    a = {
      gols: 0,
      assistencias: 0,
      chances: 0,
      defesasGk: 0,
      amarelos: 0,
      expulso: false,
      entrouEm: null,
      saiuEm: null,
      posicao: pos,
      overall: j.overall,
      lideranca: metricasMotorDeAtributos(j.atributos).lideranca,
      nome: j.nome,
      jogador: j,
    };
    map.set(j.id, a);
  }
  return a;
}

function encontrarAssistente(
  texto: string,
  autorId: number,
  elencoTime: Jogador[],
): number | null {
  const candidatos = elencoTime
    .filter((j) => j.id !== autorId && j.nome.length >= 3)
    .sort((a, b) => b.nome.length - a.nome.length);
  for (const j of candidatos) {
    if (texto.includes(j.nome)) return j.id;
  }
  return null;
}

function goleiroDoTime(
  slots: JogadorEmCampo[],
  fora: Set<number>,
): Jogador | null {
  const g = slots.find(
    (s) => s.posicaoEscalada === 'GOL' && !fora.has(s.jogador.id),
  );
  return g?.jogador ?? null;
}

/**
 * Reconstrói escalação viva e notas até `minuto` a partir dos lançamentos.
 */
export function calcularNotasPitchLive(opts: {
  result: MatchSimResult;
  minuto: number;
  mandante: TimeNotasInput;
  visitante: TimeNotasInput;
}): NotasPitchLive {
  const minuto = Math.max(0, Math.min(90, Math.floor(opts.minuto)));
  const seed = opts.result.simSeed ?? 1;

  const escM0 =
    opts.mandante.escalacao?.length === 11
      ? opts.mandante.escalacao.map((e) => ({ ...e }))
      : montarEscalacao(opts.mandante.elenco, opts.mandante.esquema);
  const escV0 =
    opts.visitante.escalacao?.length === 11
      ? opts.visitante.escalacao.map((e) => ({ ...e }))
      : montarEscalacao(opts.visitante.elenco, opts.visitante.esquema);

  const porIdM = new Map(opts.mandante.elenco.map((j) => [j.id, j]));
  const porIdV = new Map(opts.visitante.elenco.map((j) => [j.id, j]));

  const acc = new Map<number, Acumulado>();
  const slotsM = escM0.map((e) => ({ ...e }));
  const slotsV = escV0.map((e) => ({ ...e }));
  const foraM = new Set<number>();
  const foraV = new Set<number>();

  for (const e of slotsM) {
    const a = garantir(acc, e.jogador, e.posicaoEscalada);
    a.entrouEm = 0;
  }
  for (const e of slotsV) {
    const a = garantir(acc, e.jogador, e.posicaoEscalada);
    a.entrouEm = 0;
  }

  const capitaoM = [...slotsM].sort(
    (a, b) =>
      metricasMotorDeAtributos(b.jogador.atributos).lideranca -
      metricasMotorDeAtributos(a.jogador.atributos).lideranca,
  )[0]?.jogador.id;
  const capitaoV = [...slotsV].sort(
    (a, b) =>
      metricasMotorDeAtributos(b.jogador.atributos).lideranca -
      metricasMotorDeAtributos(a.jogador.atributos).lideranca,
  )[0]?.jogador.id;

  const lancamentos = opts.result.lancamentos.filter((l) => l.minuto <= minuto);

  const aplicarSub = (
    slots: JogadorEmCampo[],
    fora: Set<number>,
    porId: Map<number, Jogador>,
    l: Lancamento,
  ) => {
    if (l.jogadorId == null || l.jogadorIdEntrada == null) return;
    const idx = slots.findIndex((s) => s.jogador.id === l.jogadorId);
    const reserva = porId.get(l.jogadorIdEntrada);
    if (idx < 0 || !reserva) return;
    const pos = slots[idx]!.posicaoEscalada;
    const sai = garantir(acc, slots[idx]!.jogador, pos);
    sai.saiuEm = l.minuto;
    fora.delete(l.jogadorId);
    slots[idx] = { jogador: reserva, posicaoEscalada: pos };
    const entra = garantir(acc, reserva, pos);
    entra.entrouEm = l.minuto;
    entra.posicao = pos;
  };

  for (const l of lancamentos) {
    const casa = l.timeId === opts.mandante.timeId;
    const elencoTime = casa ? opts.mandante.elenco : opts.visitante.elenco;

    if (l.tipo === 'substituicao') {
      if (casa) aplicarSub(slotsM, foraM, porIdM, l);
      else aplicarSub(slotsV, foraV, porIdV, l);
      continue;
    }

    if (l.tipo === 'gol' && l.jogadorId != null) {
      const j =
        (casa ? porIdM : porIdV).get(l.jogadorId) ??
        acc.get(l.jogadorId)?.jogador;
      if (j) {
        const a = garantir(acc, j, acc.get(j.id)?.posicao ?? j.posicao);
        a.gols += 1;
        const assistId = encontrarAssistente(l.texto, j.id, elencoTime);
        if (assistId != null) {
          const ja =
            (casa ? porIdM : porIdV).get(assistId) ??
            acc.get(assistId)?.jogador;
          if (ja) {
            garantir(acc, ja, acc.get(ja.id)?.posicao ?? ja.posicao).assistencias +=
              1;
          }
        }
      }
      continue;
    }

    if (l.tipo === 'chance' && l.jogadorId != null) {
      const j =
        (casa ? porIdM : porIdV).get(l.jogadorId) ??
        acc.get(l.jogadorId)?.jogador;
      if (j) garantir(acc, j, acc.get(j.id)?.posicao ?? j.posicao).chances += 1;
      continue;
    }

    if (l.tipo === 'defesa') {
      // timeId = defesa; jogadorId = atacante
      const slotsDef = casa ? slotsM : slotsV;
      const foraDef = casa ? foraM : foraV;
      const gk = goleiroDoTime(slotsDef, foraDef);
      if (gk) garantir(acc, gk, 'GOL').defesasGk += 1;
      if (l.jogadorId != null) {
        const porAtaque = casa ? porIdV : porIdM;
        const atac = porAtaque.get(l.jogadorId) ?? acc.get(l.jogadorId)?.jogador;
        if (atac) {
          garantir(acc, atac, acc.get(atac.id)?.posicao ?? atac.posicao).chances +=
            1;
        }
      }
      continue;
    }

    if (l.tipo === 'cartao_amarelo' && l.jogadorId != null) {
      const j =
        (casa ? porIdM : porIdV).get(l.jogadorId) ??
        acc.get(l.jogadorId)?.jogador;
      if (j) {
        const a = garantir(acc, j, acc.get(j.id)?.posicao ?? j.posicao);
        a.amarelos += 1;
        if (/expuls/i.test(l.texto)) {
          a.expulso = true;
          a.saiuEm = a.saiuEm ?? l.minuto;
          if (casa) foraM.add(j.id);
          else foraV.add(j.id);
        }
      }
      continue;
    }

    if (l.tipo === 'lesao' && l.jogadorId != null) {
      // saída efetiva vem na substituição; se não houver, marca saída
      continue;
    }
  }

  const mediaOvr = (slots: JogadorEmCampo[]) =>
    slots.reduce((s, e) => s + e.jogador.overall, 0) / Math.max(1, slots.length);

  const mediaOvrM = mediaOvr(escM0);
  const mediaOvrV = mediaOvr(escV0);

  const notaDe = (id: number, mediaTime: number): number => {
    const a = acc.get(id);
    if (!a || a.entrouEm == null) return 6;
    const fim = a.saiuEm != null ? Math.min(a.saiuEm, minuto) : minuto;
    const minutos = Math.max(0, fim - a.entrouEm);
    if (minuto === 0 && minutos === 0) {
      return clampNota(6 + (a.overall - mediaTime) * 0.015);
    }

    const noise = (hash01(seed, id) - 0.5) * 0.45;
    const forma = (a.overall - mediaTime) * 0.025;
    let nota = 6.05 + forma + noise;

    // Ritmo de jogo — sobe levemente com minutos
    nota += Math.min(0.55, minutos * 0.006);

    if (a.gols > 0) nota += 0.85 + (a.gols - 1) * 0.55;
    if (a.assistencias > 0) nota += 0.5 + (a.assistencias - 1) * 0.35;
    if (a.defesasGk > 0) nota += Math.min(1.4, a.defesasGk * 0.32);
    if (a.chances > 0) nota += Math.min(0.45, a.chances * 0.08);
    nota -= a.amarelos * 0.35;
    if (a.expulso) nota -= 1.15;

    // Poucos minutos sem ação → nota mais cautelosa
    if (minutos < 10 && a.gols === 0 && a.assistencias === 0 && a.defesasGk === 0) {
      nota = 6 + forma * 0.5 + noise * 0.4;
    }

    return clampNota(nota);
  };

  const montarTime = (
    input: TimeNotasInput,
    slotsAgora: JogadorEmCampo[],
    fora: Set<number>,
    escInicial: JogadorEmCampo[],
    mediaTime: number,
    capitaoId: number | undefined,
    lado: 'home' | 'away',
  ): TimeNotasLive => {
    const coordsVert = coordsNotasVerticais(input.esquema);
    const usados = new Set<number>();
    // Prefere números dos titulares iniciais primeiro
    const numeros = new Map<number, number>();
    for (const e of escInicial) {
      numeros.set(e.jogador.id, numeroCamisaJogador(e.jogador, usados));
    }
    for (const e of slotsAgora) {
      if (!numeros.has(e.jogador.id)) {
        numeros.set(e.jogador.id, numeroCamisaJogador(e.jogador, usados));
      }
    }

    const jogadores: JogadorNotaLive[] = [];
    slotsAgora.forEach((slot, i) => {
      if (fora.has(slot.jogador.id)) return;
      const j = slot.jogador;
      const a = acc.get(j.id);
      const nota = notaDe(j.id, mediaTime);
      const c = coordsVert[i] ?? { x: 50, y: 50 };
      // Vertical (ataque ↑) → horizontal (casa ataca → / visitante ←)
      const { x, y } = lado === 'home' ? vertParaHome(c.x, c.y) : vertParaAway(c.x, c.y);
      jogadores.push({
        jogadorId: j.id,
        nome: j.nome,
        nomeCurto: nomeCurtoJogador(j.nome),
        numero: numeros.get(j.id) ?? ((j.id % 98) + 1),
        posicao: slot.posicaoEscalada,
        x,
        y,
        nota,
        faixa: faixaNota(nota),
        capitao: j.id === capitaoId,
        entrouComoSub: (a?.entrouEm ?? 0) > 0,
        gols: a?.gols ?? 0,
        assistencias: a?.assistencias ?? 0,
        motm: false,
        emCampo: true,
      });
    });

    const media =
      jogadores.length === 0
        ? 6
        : clampNota(
            jogadores.reduce((s, j) => s + j.nota, 0) / jogadores.length,
          );

    return {
      timeId: input.timeId,
      nome: input.nome,
      esquema: input.esquema,
      corPrimaria: input.corPrimaria,
      corSecundaria: input.corSecundaria,
      media,
      jogadores,
    };
  };

  const mandante = montarTime(
    opts.mandante,
    slotsM,
    foraM,
    escM0,
    mediaOvrM,
    capitaoM,
    'home',
  );
  const visitante = montarTime(
    opts.visitante,
    slotsV,
    foraV,
    escV0,
    mediaOvrV,
    capitaoV,
    'away',
  );

  const todos = [...mandante.jogadores, ...visitante.jogadores];
  if (todos.length > 0 && minuto >= 1) {
    let melhor = todos[0]!;
    for (const j of todos) {
      if (
        j.nota > melhor.nota ||
        (j.nota === melhor.nota && j.gols > melhor.gols)
      ) {
        melhor = j;
      }
    }
    // Só destaca MotM se a nota for claramente boa ou jogo avançou
    if (melhor.nota >= 7.2 || minuto >= 70) {
      melhor.motm = true;
    }
  }

  return { mandante, visitante };
}

/** Campinho vertical (GOL em y alto) → metade esquerda, ataque à direita. */
function vertParaHome(vx: number, vy: number): { x: number; y: number } {
  const x = 4 + ((100 - vy) / 100) * 42;
  const y = 8 + (vx / 100) * 84;
  return { x, y };
}

/** Metade direita, ataque à esquerda (espelho). */
function vertParaAway(vx: number, vy: number): { x: number; y: number } {
  const x = 96 - ((100 - vy) / 100) * 42;
  const y = 92 - (vx / 100) * 84;
  return { x, y };
}
