import { coordsCampinho, type PontoCampo } from '../../data/campinhoLayout';
import { esquemaOuPadrao } from '../../data/esquemasTaticos';
import {
  montarEscalacao,
  type JogadorEmCampo,
  type Lancamento,
  type MatchSimResult,
} from '../../engine/matchEngine';
import type { EsquemaTatico, Jogador } from '../../types/schema';

export type SubstituicaoFormacoes = {
  minuto: number;
  timeId: string;
  saiuId: number;
  saiuNome: string;
  entrouId: number;
  entrouNome: string;
};

export type NotaJogadorFormacoes = {
  jogadorId: number;
  nota: number;
  gols: number;
  amarelos: number;
  minutos: number;
};

/** Número de camisa estável sem campo dedicado no modelo. */
export function numeroCamisa(jogadorId: number): number {
  return (jogadorId % 90) + 1;
}

export function primeiroNomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 0) return '—';
  if (partes.length === 1) {
    const u = partes[0]!;
    return u.length > 12 ? `${u.slice(0, 11)}…` : u;
  }
  const sobrenome = partes[partes.length - 1]!;
  const inicial = partes[0]!.charAt(0).toUpperCase();
  const curto = `${inicial}. ${sobrenome}`;
  return curto.length > 14 ? `${curto.slice(0, 13)}…` : curto;
}

export function corNotaFormacoes(nota: number): string {
  if (nota >= 8.5) return '#74acdf';
  if (nota >= 7.0) return '#4ade80';
  if (nota >= 6.5) return '#fbbf24';
  if (nota >= 5.5) return '#fb923c';
  return '#f87171';
}

export function corFundoNota(nota: number): string {
  if (nota >= 8.5) return 'rgba(116, 172, 223, 0.92)';
  if (nota >= 7.0) return 'rgba(34, 197, 94, 0.92)';
  if (nota >= 6.5) return 'rgba(234, 179, 8, 0.95)';
  if (nota >= 5.5) return 'rgba(249, 115, 22, 0.92)';
  return 'rgba(248, 113, 113, 0.92)';
}

function clampNota(n: number): number {
  return Math.round(Math.min(10, Math.max(3, n)) * 10) / 10;
}

/**
 * Nota 0–10 só para a aba Formações (escopo local).
 * Notas tab pode substituir por util compartilhado depois — evitar colisão de módulo.
 */
export function estimarNotasFormacoes(
  result: MatchSimResult,
  elencoPorId: Map<number, Jogador>,
  minuto: number,
  escalacaoInicialIds: number[],
): Map<number, NotaJogadorFormacoes> {
  const gols = new Map<number, number>();
  const amarelos = new Map<number, number>();
  const saiuEm = new Map<number, number>();
  const entrouEm = new Map<number, number>();

  for (const l of result.lancamentos) {
    if (l.minuto > minuto) continue;
    if (l.tipo === 'gol' && l.jogadorId != null) {
      gols.set(l.jogadorId, (gols.get(l.jogadorId) ?? 0) + 1);
    }
    if (l.tipo === 'cartao_amarelo' && l.jogadorId != null) {
      amarelos.set(l.jogadorId, (amarelos.get(l.jogadorId) ?? 0) + 1);
    }
    if (l.tipo === 'substituicao') {
      if (l.jogadorId != null) saiuEm.set(l.jogadorId, l.minuto);
      if (l.jogadorIdEntrada != null) entrouEm.set(l.jogadorIdEntrada, l.minuto);
    }
    if (l.tipo === 'lesao' && l.jogadorId != null && !saiuEm.has(l.jogadorId)) {
      // lesão sem sub ainda conta como saída no minuto
      saiuEm.set(l.jogadorId, l.minuto);
    }
  }

  const ids = new Set<number>([
    ...escalacaoInicialIds,
    ...entrouEm.keys(),
    ...saiuEm.keys(),
  ]);

  const out = new Map<number, NotaJogadorFormacoes>();
  for (const id of ids) {
    const j = elencoPorId.get(id);
    if (!j) continue;
    const inicio = entrouEm.get(id) ?? 0;
    const fim = saiuEm.get(id) ?? minuto;
    const minutos = Math.max(0, Math.min(minuto, fim) - inicio);
    if (minutos <= 0 && !gols.has(id)) continue;

    const ovr = j.overall;
    let nota = 5.4 + ((ovr - 55) / 45) * 2.1;
    nota += (gols.get(id) ?? 0) * 0.85;
    nota -= (amarelos.get(id) ?? 0) * 0.35;
    if (saiuEm.has(id) && result.lesoesEmCampo?.some((x) => x.jogadorId === id && x.minuto <= minuto)) {
      nota -= 0.45;
    }
    if (minutos < 25 && !(gols.get(id) ?? 0)) {
      nota = nota * 0.92 + 6.0 * 0.08;
    }
    if (minutos >= 70) nota += 0.12;

    out.set(id, {
      jogadorId: id,
      nota: clampNota(nota),
      gols: gols.get(id) ?? 0,
      amarelos: amarelos.get(id) ?? 0,
      minutos,
    });
  }
  return out;
}

export function mediaNotas(notas: NotaJogadorFormacoes[]): number | null {
  if (notas.length === 0) return null;
  const soma = notas.reduce((s, n) => s + n.nota, 0);
  return Math.round((soma / notas.length) * 100) / 100;
}

export function escalacaoInicialTime(
  elenco: Jogador[],
  esquema: EsquemaTatico,
  escalacao?: JogadorEmCampo[],
): JogadorEmCampo[] {
  if (escalacao && escalacao.length === 11) return escalacao;
  return montarEscalacao(elenco, esquemaOuPadrao(esquema));
}

/** XI atual após substituições até o minuto. */
export function escalacaoAoMinuto(
  inicial: JogadorEmCampo[],
  elenco: Jogador[],
  lancamentos: Lancamento[],
  timeId: string,
  minuto: number,
): JogadorEmCampo[] {
  const porId = new Map(elenco.map((j) => [j.id, j]));
  const atual = inicial.map((e) => ({ ...e }));

  for (const l of lancamentos) {
    if (l.minuto > minuto) continue;
    if (l.tipo !== 'substituicao' || l.timeId !== timeId) continue;
    if (l.jogadorId == null || l.jogadorIdEntrada == null) continue;
    const idx = atual.findIndex((e) => e.jogador.id === l.jogadorId);
    const entra = porId.get(l.jogadorIdEntrada);
    if (idx < 0 || !entra) continue;
    atual[idx] = {
      jogador: entra,
      posicaoEscalada: atual[idx]!.posicaoEscalada,
      celulaCampo: atual[idx]!.celulaCampo,
    };
  }
  return atual;
}

export function listarSubstituicoes(
  result: MatchSimResult,
  elencoPorId: Map<number, Jogador>,
  minuto: number,
): SubstituicaoFormacoes[] {
  const out: SubstituicaoFormacoes[] = [];
  for (const l of result.lancamentos) {
    if (l.minuto > minuto || l.tipo !== 'substituicao') continue;
    if (l.timeId == null || l.jogadorId == null || l.jogadorIdEntrada == null) continue;
    const saiu = elencoPorId.get(l.jogadorId);
    const entrou = elencoPorId.get(l.jogadorIdEntrada);
    out.push({
      minuto: l.minuto,
      timeId: l.timeId,
      saiuId: l.jogadorId,
      saiuNome: saiu?.nome ?? `Jogador ${l.jogadorId}`,
      entrouId: l.jogadorIdEntrada,
      entrouNome: entrou?.nome ?? `Jogador ${l.jogadorIdEntrada}`,
    });
  }
  return out;
}

/** Banco: relacionados que não estão em campo agora e não saíram como titular/reserva já usado na lista de subs como “saiu”. */
export function listarBanco(
  elenco: Jogador[],
  emCampoIds: Set<number>,
  sairamIds: Set<number>,
): Jogador[] {
  return elenco
    .filter(
      (j) =>
        j.status_escalacao !== 'NAO_RELACIONADO' &&
        !emCampoIds.has(j.id) &&
        !sairamIds.has(j.id),
    )
    .sort((a, b) => b.overall - a.overall);
}

/**
 * Mapeia coords verticais do campinho (GOL em y alto) para metade esquerda:
 * GOL perto da linha de fundo esquerda, ataque em direção ao meio-campo.
 * y do campinho vertical vira x; x lateral vira y (com leve compressão nas laterais).
 */
export function coordsMandanteHorizontal(esquema: EsquemaTatico): PontoCampo[] {
  return coordsCampinho(esquemaOuPadrao(esquema)).map((p) => ({
    x: 7 + ((100 - p.y) / 100) * 36,
    y: 12 + (p.x / 100) * 76,
  }));
}

/** Visitante na metade direita, espelhado (GOL na direita). */
export function coordsVisitanteHorizontal(esquema: EsquemaTatico): PontoCampo[] {
  return coordsCampinho(esquemaOuPadrao(esquema)).map((p) => ({
    x: 93 - ((100 - p.y) / 100) * 36,
    y: 12 + ((100 - p.x) / 100) * 76,
  }));
}
