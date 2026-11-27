import { layoutCampinho, type LinhaCampinho } from '../data/campinhoLayout';
import { metricasMotorDeAtributos } from '../career/atributosJogador';
import type { EsquemaTatico, Jogador, Posicao } from '../types/schema';
import {
  montarEscalacao,
  type HistoricoTaticoNotas,
  type JogadorEmCampo,
  type Lancamento,
  type MatchSimInput,
  type MatchSimResult,
  type SegmentoTaticoNotas,
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

function snapshotEscalacao(esc: JogadorEmCampo[]): SegmentoTaticoNotas['escalacao'] {
  return esc.map((e) => ({
    jogadorId: e.jogador.id,
    posicaoEscalada: e.posicaoEscalada,
  }));
}

function resolverEscalacao(
  elenco: Jogador[],
  esquema: EsquemaTatico,
  escalacao?: JogadorEmCampo[],
): JogadorEmCampo[] {
  return escalacao?.length === 11
    ? escalacao.map((e) => ({ ...e }))
    : montarEscalacao(elenco, esquema);
}

export function criarHistoricoTaticoInicial(input: MatchSimInput): HistoricoTaticoNotas {
  const escM = resolverEscalacao(
    input.mandante.elenco,
    input.mandante.esquema,
    input.mandante.escalacao,
  );
  const escV = resolverEscalacao(
    input.visitante.elenco,
    input.visitante.esquema,
    input.visitante.escalacao,
  );
  return {
    mandante: [
      {
        deMinuto: 0,
        esquema: input.mandante.esquema,
        escalacao: snapshotEscalacao(escM),
      },
    ],
    visitante: [
      {
        deMinuto: 0,
        esquema: input.visitante.esquema,
        escalacao: snapshotEscalacao(escV),
      },
    ],
  };
}

/**
 * Após mudança tática no minuto `minutoCheckpoint`, o novo setup vale a partir de minuto+1.
 */
export function acrescentarSegmentoTatico(
  historico: HistoricoTaticoNotas | undefined,
  lado: 'mandante' | 'visitante',
  minutoCheckpoint: number,
  esquema: EsquemaTatico,
  escalacao: JogadorEmCampo[],
): HistoricoTaticoNotas {
  const base: HistoricoTaticoNotas = historico ?? {
    mandante: [],
    visitante: [],
  };
  const deMinuto = Math.max(0, Math.floor(minutoCheckpoint) + 1);
  const seg: SegmentoTaticoNotas = {
    deMinuto,
    esquema,
    escalacao: snapshotEscalacao(escalacao),
  };
  const lista = [...(base[lado] ?? [])].sort((a, b) => a.deMinuto - b.deMinuto);
  const last = lista[lista.length - 1];
  if (
    last &&
    last.deMinuto === seg.deMinuto &&
    last.esquema === seg.esquema &&
    JSON.stringify(last.escalacao) === JSON.stringify(seg.escalacao)
  ) {
    return base;
  }
  // Substitui se já houver segmento no mesmo deMinuto
  const semMesmo = lista.filter((s) => s.deMinuto !== seg.deMinuto);
  semMesmo.push(seg);
  semMesmo.sort((a, b) => a.deMinuto - b.deMinuto);
  return { ...base, [lado]: semMesmo };
}

function segmentoAtivo(
  segs: SegmentoTaticoNotas[],
  minutoT: number,
): SegmentoTaticoNotas | null {
  let ativo: SegmentoTaticoNotas | null = null;
  for (const s of segs) {
    if (s.deMinuto <= minutoT) ativo = s;
  }
  return ativo;
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
  /** minutos por chave `${esquema}#${slotIndex}` */
  minPorSlot: Map<string, number>;
  /** minutos por Posicao (qualquer esquema) */
  minPorPos: Map<Posicao, number>;
  overall: number;
  lideranca: number;
  nome: string;
  jogador: Jogador;
};

function garantir(map: Map<number, Acumulado>, j: Jogador): Acumulado {
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
      minPorSlot: new Map(),
      minPorPos: new Map(),
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

function chaveSlot(esquema: EsquemaTatico, slotIndex: number): string {
  return `${esquema}#${slotIndex}`;
}

function slotsDeSegmento(
  seg: SegmentoTaticoNotas,
  porId: Map<number, Jogador>,
  elenco: Jogador[],
  esquemaFallback: EsquemaTatico,
): JogadorEmCampo[] {
  const lista: JogadorEmCampo[] = [];
  for (const s of seg.escalacao) {
    const j = porId.get(s.jogadorId);
    if (!j) continue;
    lista.push({ jogador: j, posicaoEscalada: s.posicaoEscalada });
  }
  if (lista.length === 11) return lista;
  return montarEscalacao(elenco, esquemaFallback);
}

/**
 * Reconstrói notas + posicionamento por maioria de minutos até `minuto`.
 */
export function calcularNotasPitchLive(opts: {
  result: MatchSimResult;
  minuto: number;
  mandante: TimeNotasInput;
  visitante: TimeNotasInput;
}): NotasPitchLive {
  const minuto = Math.max(0, Math.min(90, Math.floor(opts.minuto)));
  const seed = opts.result.simSeed ?? 1;

  const historico: HistoricoTaticoNotas = opts.result.historicoTatico ?? {
    mandante: [
      {
        deMinuto: 0,
        esquema: opts.mandante.esquema,
        escalacao: snapshotEscalacao(
          resolverEscalacao(
            opts.mandante.elenco,
            opts.mandante.esquema,
            opts.mandante.escalacao,
          ),
        ),
      },
    ],
    visitante: [
      {
        deMinuto: 0,
        esquema: opts.visitante.esquema,
        escalacao: snapshotEscalacao(
          resolverEscalacao(
            opts.visitante.elenco,
            opts.visitante.esquema,
            opts.visitante.escalacao,
          ),
        ),
      },
    ],
  };

  const porIdM = new Map(opts.mandante.elenco.map((j) => [j.id, j]));
  const porIdV = new Map(opts.visitante.elenco.map((j) => [j.id, j]));
  const acc = new Map<number, Acumulado>();

  const segsM = [...historico.mandante].sort((a, b) => a.deMinuto - b.deMinuto);
  const segsV = [...historico.visitante].sort((a, b) => a.deMinuto - b.deMinuto);

  const minEsquemaM = new Map<EsquemaTatico, number>();
  const minEsquemaV = new Map<EsquemaTatico, number>();

  let slotsM: JogadorEmCampo[] = [];
  let slotsV: JogadorEmCampo[] = [];
  let esquemaM = opts.mandante.esquema;
  let esquemaV = opts.visitante.esquema;
  const foraM = new Set<number>();
  const foraV = new Set<number>();

  const boot = (lado: 'M' | 'V', t: number) => {
    if (lado === 'M') {
      const seg = segmentoAtivo(segsM, t);
      if (!seg) return;
      esquemaM = seg.esquema;
      slotsM = slotsDeSegmento(seg, porIdM, opts.mandante.elenco, seg.esquema);
      for (const e of slotsM) {
        const a = garantir(acc, e.jogador);
        if (a.entrouEm == null) a.entrouEm = Math.max(0, t);
      }
    } else {
      const seg = segmentoAtivo(segsV, t);
      if (!seg) return;
      esquemaV = seg.esquema;
      slotsV = slotsDeSegmento(seg, porIdV, opts.visitante.elenco, seg.esquema);
      for (const e of slotsV) {
        const a = garantir(acc, e.jogador);
        if (a.entrouEm == null) a.entrouEm = Math.max(0, t);
      }
    }
  };

  boot('M', 0);
  boot('V', 0);

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
  const eventosPorMinuto = new Map<number, Lancamento[]>();
  for (const l of lancamentos) {
    const lista = eventosPorMinuto.get(l.minuto) ?? [];
    lista.push(l);
    eventosPorMinuto.set(l.minuto, lista);
  }

  const aplicarSub = (
    slots: JogadorEmCampo[],
    porId: Map<number, Jogador>,
    l: Lancamento,
  ) => {
    if (l.jogadorId == null || l.jogadorIdEntrada == null) return slots;
    const idx = slots.findIndex((s) => s.jogador.id === l.jogadorId);
    const reserva = porId.get(l.jogadorIdEntrada);
    if (idx < 0 || !reserva) return slots;
    const pos = slots[idx]!.posicaoEscalada;
    const sai = garantir(acc, slots[idx]!.jogador);
    sai.saiuEm = l.minuto;
    const next = [...slots];
    next[idx] = { jogador: reserva, posicaoEscalada: pos };
    const entra = garantir(acc, reserva);
    if (entra.entrouEm == null) entra.entrouEm = l.minuto;
    entra.saiuEm = null;
    return next;
  };

  const processarEventos = (t: number) => {
    for (const l of eventosPorMinuto.get(t) ?? []) {
      const casa = l.timeId === opts.mandante.timeId;
      const elencoTime = casa ? opts.mandante.elenco : opts.visitante.elenco;

      if (l.tipo === 'substituicao') {
        if (casa) slotsM = aplicarSub(slotsM, porIdM, l);
        else slotsV = aplicarSub(slotsV, porIdV, l);
        continue;
      }

      if (l.tipo === 'gol' && l.jogadorId != null) {
        const j =
          (casa ? porIdM : porIdV).get(l.jogadorId) ??
          acc.get(l.jogadorId)?.jogador;
        if (j) {
          garantir(acc, j).gols += 1;
          const assistId = encontrarAssistente(l.texto, j.id, elencoTime);
          if (assistId != null) {
            const ja =
              (casa ? porIdM : porIdV).get(assistId) ??
              acc.get(assistId)?.jogador;
            if (ja) garantir(acc, ja).assistencias += 1;
          }
        }
        continue;
      }

      if (l.tipo === 'chance' && l.jogadorId != null) {
        const j =
          (casa ? porIdM : porIdV).get(l.jogadorId) ??
          acc.get(l.jogadorId)?.jogador;
        if (j) garantir(acc, j).chances += 1;
        continue;
      }

      if (l.tipo === 'defesa') {
        const slotsDef = casa ? slotsM : slotsV;
        const foraDef = casa ? foraM : foraV;
        const gk = slotsDef.find(
          (s) => s.posicaoEscalada === 'GOL' && !foraDef.has(s.jogador.id),
        )?.jogador;
        if (gk) garantir(acc, gk).defesasGk += 1;
        if (l.jogadorId != null) {
          const porAtaque = casa ? porIdV : porIdM;
          const atac = porAtaque.get(l.jogadorId) ?? acc.get(l.jogadorId)?.jogador;
          if (atac) garantir(acc, atac).chances += 1;
        }
        continue;
      }

      if (l.tipo === 'cartao_amarelo' && l.jogadorId != null) {
        const j =
          (casa ? porIdM : porIdV).get(l.jogadorId) ??
          acc.get(l.jogadorId)?.jogador;
        if (j) {
          const a = garantir(acc, j);
          a.amarelos += 1;
          if (/expuls/i.test(l.texto)) {
            a.expulso = true;
            a.saiuEm = a.saiuEm ?? l.minuto;
            if (casa) foraM.add(j.id);
            else foraV.add(j.id);
          }
        }
      }
    }
  };

  const accrue = (t: number) => {
    // Troca de segmento no início do minuto t
    const segM = segmentoAtivo(segsM, t);
    const segV = segmentoAtivo(segsV, t);
    if (segM && (segM.esquema !== esquemaM || segM.deMinuto === t)) {
      // Só reseta XI no instante em que o segmento começa (tática nova)
      if (segM.deMinuto === t && t > 0) {
        esquemaM = segM.esquema;
        const idsAntes = new Set(
          slotsM.filter((s) => !foraM.has(s.jogador.id)).map((s) => s.jogador.id),
        );
        slotsM = slotsDeSegmento(segM, porIdM, opts.mandante.elenco, segM.esquema);
        for (const e of slotsM) {
          const a = garantir(acc, e.jogador);
          if (a.entrouEm == null) a.entrouEm = t;
          // Quem saiu do XI na troca tática
          foraM.delete(e.jogador.id);
        }
        for (const id of idsAntes) {
          if (!slotsM.some((s) => s.jogador.id === id)) {
            const j = porIdM.get(id);
            if (j) {
              const a = garantir(acc, j);
              a.saiuEm = a.saiuEm ?? t;
            }
          }
        }
      } else {
        esquemaM = segM.esquema;
      }
    }
    if (segV && (segV.esquema !== esquemaV || segV.deMinuto === t)) {
      if (segV.deMinuto === t && t > 0) {
        esquemaV = segV.esquema;
        const idsAntes = new Set(
          slotsV.filter((s) => !foraV.has(s.jogador.id)).map((s) => s.jogador.id),
        );
        slotsV = slotsDeSegmento(segV, porIdV, opts.visitante.elenco, segV.esquema);
        for (const e of slotsV) {
          const a = garantir(acc, e.jogador);
          if (a.entrouEm == null) a.entrouEm = t;
          foraV.delete(e.jogador.id);
        }
        for (const id of idsAntes) {
          if (!slotsV.some((s) => s.jogador.id === id)) {
            const j = porIdV.get(id);
            if (j) {
              const a = garantir(acc, j);
              a.saiuEm = a.saiuEm ?? t;
            }
          }
        }
      } else {
        esquemaV = segV.esquema;
      }
    }

    processarEventos(t);

    minEsquemaM.set(esquemaM, (minEsquemaM.get(esquemaM) ?? 0) + 1);
    minEsquemaV.set(esquemaV, (minEsquemaV.get(esquemaV) ?? 0) + 1);

    slotsM.forEach((e, i) => {
      if (foraM.has(e.jogador.id)) return;
      const a = garantir(acc, e.jogador);
      const k = chaveSlot(esquemaM, i);
      a.minPorSlot.set(k, (a.minPorSlot.get(k) ?? 0) + 1);
      a.minPorPos.set(
        e.posicaoEscalada,
        (a.minPorPos.get(e.posicaoEscalada) ?? 0) + 1,
      );
    });
    slotsV.forEach((e, i) => {
      if (foraV.has(e.jogador.id)) return;
      const a = garantir(acc, e.jogador);
      const k = chaveSlot(esquemaV, i);
      a.minPorSlot.set(k, (a.minPorSlot.get(k) ?? 0) + 1);
      a.minPorPos.set(
        e.posicaoEscalada,
        (a.minPorPos.get(e.posicaoEscalada) ?? 0) + 1,
      );
    });
  };

  if (minuto === 0) {
    processarEventos(0);
  } else {
    for (let t = 1; t <= minuto; t++) accrue(t);
  }

  const esquemaMaioria = (
    mapa: Map<EsquemaTatico, number>,
    fallback: EsquemaTatico,
  ): EsquemaTatico => {
    let best = fallback;
    let bestN = -1;
    for (const [e, n] of mapa) {
      if (n > bestN) {
        best = e;
        bestN = n;
      }
    }
    return best;
  };

  const escMajM = esquemaMaioria(minEsquemaM, opts.mandante.esquema);
  const escMajV = esquemaMaioria(minEsquemaV, opts.visitante.esquema);

  const mediaOvr = (slots: JogadorEmCampo[]) =>
    slots.reduce((s, e) => s + e.jogador.overall, 0) / Math.max(1, slots.length);

  const escInicialM = resolverEscalacao(
    opts.mandante.elenco,
    opts.mandante.esquema,
    opts.mandante.escalacao,
  );
  const escInicialV = resolverEscalacao(
    opts.visitante.elenco,
    opts.visitante.esquema,
    opts.visitante.escalacao,
  );
  const mediaOvrM = mediaOvr(escInicialM);
  const mediaOvrV = mediaOvr(escInicialV);

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
    nota += Math.min(0.55, minutos * 0.006);

    if (a.gols > 0) nota += 0.85 + (a.gols - 1) * 0.55;
    if (a.assistencias > 0) nota += 0.5 + (a.assistencias - 1) * 0.35;
    if (a.defesasGk > 0) nota += Math.min(1.4, a.defesasGk * 0.32);
    if (a.chances > 0) nota += Math.min(0.45, a.chances * 0.08);
    nota -= a.amarelos * 0.35;
    if (a.expulso) nota -= 1.15;

    if (minutos < 10 && a.gols === 0 && a.assistencias === 0 && a.defesasGk === 0) {
      nota = 6 + forma * 0.5 + noise * 0.4;
    }

    return clampNota(nota);
  };

  /**
   * Slot preferido do jogador na formação majoritária:
   * 1) slot com mais minutos nessa formação;
   * 2) senão, posição (Posicao) com mais minutos em qualquer esquema → 1º slot livre da mesma pos;
   * 3) senão, qualquer slot livre.
   */
  const escolherSlotsNaFormacao = (
    esquema: EsquemaTatico,
    emCampo: JogadorEmCampo[],
  ): { jogador: Jogador; slotIndex: number; posicao: Posicao }[] => {
    const layout = layoutCampinho(esquema);
    const ocupado = new Set<number>();
    const resultado: { jogador: Jogador; slotIndex: number; posicao: Posicao }[] =
      [];

    type Cand = {
      jogador: Jogador;
      preferidos: { slotIndex: number; minutos: number }[];
      posMaioria: Posicao;
    };

    const cands: Cand[] = emCampo.map((e) => {
      const a = acc.get(e.jogador.id);
      const preferidos: { slotIndex: number; minutos: number }[] = [];
      if (a) {
        for (const [k, mins] of a.minPorSlot) {
          const [esq, idxStr] = k.split('#');
          if (esq !== esquema) continue;
          const slotIndex = Number(idxStr);
          if (Number.isFinite(slotIndex)) preferidos.push({ slotIndex, minutos: mins });
        }
        preferidos.sort((x, y) => y.minutos - x.minutos);
      }
      let posMaioria: Posicao = e.posicaoEscalada;
      let bestPos = -1;
      if (a) {
        for (const [p, mins] of a.minPorPos) {
          if (mins > bestPos) {
            bestPos = mins;
            posMaioria = p;
          }
        }
      }
      return { jogador: e.jogador, preferidos, posMaioria };
    });

    // Prioriza quem tem claim mais forte (mais minutos no melhor slot)
    cands.sort((a, b) => (b.preferidos[0]?.minutos ?? 0) - (a.preferidos[0]?.minutos ?? 0));

    const pegarSlotLivre = (pos: Posicao): number | null => {
      for (let i = 0; i < layout.length; i++) {
        if (ocupado.has(i)) continue;
        if (layout[i]!.pos === pos) return i;
      }
      // Linha aproximada
      const linhaDe = (p: Posicao): LinhaCampinho => {
        if (p === 'GOL') return 'GOL';
        if (p === 'ZAG' || p === 'LAT') return 'DEF';
        if (p === 'VOL') return 'VOL';
        if (p === 'MEI') return 'MC';
        return 'ATA';
      };
      const alvo = linhaDe(pos);
      for (let i = 0; i < layout.length; i++) {
        if (ocupado.has(i)) continue;
        if (layout[i]!.linha === alvo) return i;
      }
      for (let i = 0; i < layout.length; i++) {
        if (!ocupado.has(i)) return i;
      }
      return null;
    };

    for (const c of cands) {
      let escolhido: number | null = null;
      for (const p of c.preferidos) {
        if (!ocupado.has(p.slotIndex) && p.slotIndex >= 0 && p.slotIndex < layout.length) {
          escolhido = p.slotIndex;
          break;
        }
      }
      if (escolhido == null) escolhido = pegarSlotLivre(c.posMaioria);
      if (escolhido == null) continue;
      ocupado.add(escolhido);
      resultado.push({
        jogador: c.jogador,
        slotIndex: escolhido,
        posicao: layout[escolhido]!.pos,
      });
    }
    return resultado;
  };

  const montarTime = (
    input: TimeNotasInput,
    slotsAgora: JogadorEmCampo[],
    fora: Set<number>,
    escInicial: JogadorEmCampo[],
    mediaTime: number,
    capitaoId: number | undefined,
    esquemaExibir: EsquemaTatico,
    lado: 'home' | 'away',
  ): TimeNotasLive => {
    const coordsVert = coordsNotasVerticais(esquemaExibir);
    const usados = new Set<number>();
    const numeros = new Map<number, number>();
    for (const e of escInicial) {
      numeros.set(e.jogador.id, numeroCamisaJogador(e.jogador, usados));
    }
    for (const e of slotsAgora) {
      if (!numeros.has(e.jogador.id)) {
        numeros.set(e.jogador.id, numeroCamisaJogador(e.jogador, usados));
      }
    }

    const emCampo = slotsAgora.filter((s) => !fora.has(s.jogador.id));
    const colocados = escolherSlotsNaFormacao(esquemaExibir, emCampo);

    const jogadores: JogadorNotaLive[] = colocados.map(({ jogador: j, slotIndex, posicao }) => {
      const a = acc.get(j.id);
      const nota = notaDe(j.id, mediaTime);
      const c = coordsVert[slotIndex] ?? { x: 50, y: 50 };
      const { x, y } = lado === 'home' ? vertParaHome(c.x, c.y) : vertParaAway(c.x, c.y);
      return {
        jogadorId: j.id,
        nome: j.nome,
        nomeCurto: nomeCurtoJogador(j.nome),
        numero: numeros.get(j.id) ?? ((j.id % 98) + 1),
        posicao,
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
      };
    });

    const media =
      jogadores.length === 0
        ? 6
        : clampNota(jogadores.reduce((s, j) => s + j.nota, 0) / jogadores.length);

    return {
      timeId: input.timeId,
      nome: input.nome,
      esquema: esquemaExibir,
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
    escInicialM,
    mediaOvrM,
    capitaoM,
    escMajM,
    'home',
  );
  const visitante = montarTime(
    opts.visitante,
    slotsV,
    foraV,
    escInicialV,
    mediaOvrV,
    capitaoV,
    escMajV,
    'away',
  );

  const todos = [...mandante.jogadores, ...visitante.jogadores];
  if (todos.length > 0 && minuto >= 1) {
    let melhor = todos[0]!;
    for (const j of todos) {
      if (j.nota > melhor.nota || (j.nota === melhor.nota && j.gols > melhor.gols)) {
        melhor = j;
      }
    }
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
