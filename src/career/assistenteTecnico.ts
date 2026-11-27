import { montarEscalacao } from '../engine/matchEngine';
import { filtrarAptosParaJogar } from './aptidaoEscalacao';
import { valorMercado } from './playerUtils';
import { ordenarElenco } from './ordenarElenco';
import type { NoticiaCarreira } from './types';
import type { EsquemaTatico, Jogador, Posicao, Time } from '../types/schema';
import { criarRng } from '../engine/matchEngine';

/** 11 ids: maior OVR em cada slot (ignora lesão+energia &lt;60%). */
export function escalacaoAssistenteMelhorOverall(
  elenco: Jogador[],
  esquema: EsquemaTatico,
): number[] {
  const aptos = filtrarAptosParaJogar(elenco);
  try {
    return montarEscalacao(aptos, esquema).map((e) => e.jogador.id);
  } catch {
    return ordenarElenco(aptos)
      .slice(0, 11)
      .map((j) => j.id);
  }
}

function mediaOvrPorPosicao(elenco: Jogador[]): Partial<Record<Posicao, number>> {
  const acc: Partial<Record<Posicao, { s: number; n: number }>> = {};
  for (const j of elenco) {
    const p = j.posicao;
    const b = acc[p] ?? { s: 0, n: 0 };
    b.s += j.overall;
    b.n += 1;
    acc[p] = b;
  }
  const out: Partial<Record<Posicao, number>> = {};
  for (const [p, v] of Object.entries(acc)) {
    out[p as Posicao] = v!.n ? v!.s / v!.n : 0;
  }
  return out;
}

function piorTitular(elenco: Jogador[]): Jogador | null {
  const titulares = elenco.filter((j) => j.status_escalacao === 'TITULAR' && jogadorDisponivel(j));
  if (titulares.length === 0) return null;
  return titulares.reduce((a, b) => (a.overall <= b.overall ? a : b));
}

/**
 * Gera no máximo uma notícia do assistente (compra boa/ruim, venda sugerida).
 * Qualidade da dica escala com nível 1–20.
 */
export function gerarNoticiaAssistenteMercado(params: {
  jogadores: Jogador[];
  clubeId: string;
  times: Time[];
  nivelAssistente: number;
  rodada: number;
  seed: number;
  mediaOvrElenco: number;
}): NoticiaCarreira | null {
  const rnd = criarRng(params.seed ^ params.nivelAssistente);
  const precisao = Math.max(0.35, Math.min(0.96, 0.4 + params.nivelAssistente / 28));
  if (rnd() > 0.22 + params.nivelAssistente / 80) return null;

  const elenco = params.jogadores.filter((j) => j.time_id === params.clubeId);
  const mercado = params.jogadores.filter((j) => j.time_id !== params.clubeId && jogadorDisponivel(j));
  if (mercado.length < 8 || elenco.length < 14) return null;

  const medias = mediaOvrPorPosicao(elenco);
  const posicoes: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const posCarente = posicoes.reduce(
    (melhor, p) => ((medias[p] ?? 99) < (medias[melhor] ?? 99) ? p : melhor),
    'VOL' as Posicao,
  );

  const candidatos = mercado
    .filter((j) => j.posicao === posCarente)
    .sort((a, b) => b.overall - a.overall);

  const pior = piorTitular(elenco);
  const agora = new Date().toISOString();

  if (rnd() < 0.55 && candidatos.length > 0) {
    const pickIndex =
      precisao > 0.7 ? 0 : precisao > 0.5 ? Math.min(1, candidatos.length - 1) : Math.min(3, candidatos.length - 1);
    const alvo = candidatos[pickIndex]!;
    const timeNome = params.times.find((t) => t.id === alvo.time_id)?.nome ?? alvo.time_id;
    const bomNegocio = pickIndex === 0 && alvo.overall >= (medias[posCarente] ?? 65) + 2;

    if (!bomNegocio && precisao < 0.55) {
      return {
        id: `ast_ruim_${params.rodada}_${alvo.id}`,
        data: agora,
        titulo: 'Assistente técnico · alerta de mercado',
        texto: `O auxiliar sugere evitar ${alvo.nome} (${alvo.overall} OVR, ${timeNome}): custo-benefício fraco para ${posCarente}. (Confiança da análise: ${Math.round(precisao * 100)}%)`,
      };
    }

    return {
      id: `ast_compra_${params.rodada}_${alvo.id}`,
      data: agora,
      titulo: 'Assistente técnico · indicação de contratação',
      texto: `Para reforçar ${posCarente}, o auxiliar destaca ${alvo.nome} (${alvo.overall} OVR, ${timeNome}) — valor ~${Math.round(valorMercado(alvo) / 1_000_000)}M. Confiança: ${Math.round(precisao * 100)}%.`,
    };
  }

  if (pior && pior.overall < params.mediaOvrElenco - 4) {
    const vender = precisao > 0.55 || rnd() > 0.4;
    if (vender) {
      return {
        id: `ast_venda_${params.rodada}_${pior.id}`,
        data: agora,
        titulo: 'Assistente técnico · enxugar elenco',
        texto: `O auxiliar recomenda avaliar saída de ${pior.nome} (${pior.overall} OVR, ${pior.posicao}) — abaixo da média do grupo (${Math.round(params.mediaOvrElenco)}).`,
      };
    }
    return {
      id: `ast_manter_${params.rodada}_${pior.id}`,
      data: agora,
      titulo: 'Assistente técnico · manter no elenco',
      texto: `Apesar do OVR modesto, o auxiliar pede paciência com ${pior.nome} nesta fase da temporada.`,
    };
  }

  return null;
}