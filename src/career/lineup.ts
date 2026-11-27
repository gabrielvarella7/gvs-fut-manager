import type { CelulaGrade } from '../data/gradeCampinho';
import { posicaoNaCelula } from '../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../data/esquemasTaticos';
import { montarEscalacao, type JogadorEmCampo } from '../engine/matchEngine';
import type { EsquemaTatico, Jogador, StatusEscalacao } from '../types/schema';

export const TITULARES_PARTIDA = 11;
export const RESERVAS_PARTIDA = 11;

export function idsEscalacaoPadrao(elenco: Jogador[], esquema: EsquemaTatico): number[] {
  try {
    return montarEscalacao(elenco, esquema).map((e) => e.jogador.id);
  } catch {
    return elenco.slice(0, 11).map((j) => j.id);
  }
}

/** Próximos 11 do elenco (fora dos titulares), priorizando aptos e melhor OVR. */
export function idsBancoPadrao(elenco: Jogador[], titularesIds: number[]): number[] {
  const setTit = new Set(titularesIds.filter((id) => id > 0));
  return [...elenco]
    .filter((j) => !setTit.has(j.id) && (!j.lesao || j.lesao.diasRestantes <= 0))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, RESERVAS_PARTIDA)
    .map((j) => j.id);
}

export interface ValidacaoRelacionados {
  ok: boolean;
  titulares: number;
  reservas: number;
  /** Mensagem em português para bloquear o início da partida. */
  motivo?: string;
}

function idsValidosUnicos(ids: number[] | null | undefined): number[] {
  if (!ids?.length) return [];
  const vistos = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!id || id <= 0 || vistos.has(id)) continue;
    vistos.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Exige 11 titulares + 11 reservas distintos antes de iniciar a partida.
 */
export function validarRelacionadosPartida(
  alinhamento11: number[] | null | undefined,
  banco11: number[] | null | undefined,
): ValidacaoRelacionados {
  const titulares = idsValidosUnicos(alinhamento11);
  const reservas = idsValidosUnicos(banco11).filter((id) => !titulares.includes(id));
  const nTit = titulares.length;
  const nRes = reservas.length;

  if (nTit === TITULARES_PARTIDA && nRes === RESERVAS_PARTIDA) {
    return { ok: true, titulares: nTit, reservas: nRes };
  }

  const faltamTit = Math.max(0, TITULARES_PARTIDA - nTit);
  const faltamRes = Math.max(0, RESERVAS_PARTIDA - nRes);
  const partes: string[] = [];
  if (faltamTit > 0) {
    partes.push(
      nTit === 0
        ? 'nenhum titular escalado'
        : `${nTit} titular(es) — faltam ${faltamTit}`,
    );
  }
  if (faltamRes > 0) {
    partes.push(
      nRes === 0
        ? 'nenhuma reserva relacionada'
        : `${nRes} reserva(s) — faltam ${faltamRes}`,
    );
  }
  if (nTit > TITULARES_PARTIDA) partes.push('mais de 11 titulares');
  if (nRes > RESERVAS_PARTIDA) partes.push('mais de 11 reservas');

  return {
    ok: false,
    titulares: nTit,
    reservas: nRes,
    motivo: `Relacione 11 titulares e 11 reservas antes de iniciar a partida (${partes.join('; ')}). Vá em Tática → Jogadores.`,
  };
}

/** Atualiza status_escalacao do elenco conforme titulares/banco. */
export function aplicarStatusEscalacaoElenco(
  elenco: Jogador[],
  alinhamento11: number[],
  banco11: number[],
): Jogador[] {
  const tit = new Set(idsValidosUnicos(alinhamento11));
  const ban = new Set(idsValidosUnicos(banco11).filter((id) => !tit.has(id)));
  return elenco.map((j) => {
    let status: StatusEscalacao = 'NAO_RELACIONADO';
    if (tit.has(j.id)) status = 'TITULAR';
    else if (ban.has(j.id)) status = 'RESERVA';
    if (j.status_escalacao === status) return j;
    return { ...j, status_escalacao: status };
  });
}

export function escalacaoDeIds(
  elenco: Jogador[],
  esquema: EsquemaTatico,
  ids: number[],
  grade?: CelulaGrade[] | null,
): JogadorEmCampo[] {
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const map = new Map(elenco.map((j) => [j.id, j]));
  const lista: JogadorEmCampo[] = [];
  for (let i = 0; i < Math.min(11, ids.length); i++) {
    const jogador = map.get(ids[i]);
    if (!jogador) continue;
    const posicaoEscalada =
      grade?.[i] != null ? posicaoNaCelula(grade[i]) : (slots[i] ?? jogador.posicao);
    lista.push({
      jogador,
      posicaoEscalada,
      ...(grade?.[i] != null ? { celulaCampo: grade[i] } : {}),
    });
  }
  return lista.length >= 11 ? lista : montarEscalacao(elenco, esquema);
}