import type { Jogador } from '../types/schema';

export type StatusEscalacao = 'TITULAR' | 'RESERVA' | 'NAO_RELACIONADO';

export interface JogadorTatica extends Jogador {
  status_escalacao: StatusEscalacao;
  ordem_escalacao?: number;
}

const MAX_TITULARES = 11;
const MAX_RESERVAS = 7;

function estaIndisponivel(j: JogadorTatica): boolean {
  return Boolean((j as any).lesao_ativa || (j as any).suspenso);
}

function normalizarOrdemReservas(elenco: JogadorTatica[]): JogadorTatica[] {
  const reservas = elenco
    .filter((j) => j.status_escalacao === 'RESERVA')
    .sort((a, b) => (a.ordem_escalacao ?? 99) - (b.ordem_escalacao ?? 99));

  const mapaOrdem = new Map<number, number>();
  reservas.forEach((j, idx) => mapaOrdem.set(j.id, idx));

  return elenco.map((j) =>
    j.status_escalacao === 'RESERVA'
      ? { ...j, ordem_escalacao: mapaOrdem.get(j.id) ?? 0 }
      : j
  );
}

export function trocarJogadoresDragDrop(
  elenco: JogadorTatica[],
  origemId: number,
  destinoId: number
): JogadorTatica[] {
  if (origemId === destinoId) return elenco;

  const origem = elenco.find((j) => j.id === origemId);
  const destino = elenco.find((j) => j.id === destinoId);
  if (!origem || !destino) return elenco;

  if (estaIndisponivel(origem) && destino.status_escalacao !== 'NAO_RELACIONADO') return elenco;
  if (estaIndisponivel(destino) && origem.status_escalacao !== 'NAO_RELACIONADO') return elenco;

  const statusOrigem = origem.status_escalacao;
  const statusDestino = destino.status_escalacao;
  const ordemOrigem = origem.ordem_escalacao;
  const ordemDestino = destino.ordem_escalacao;

  const atualizado = elenco.map((j) => {
    if (j.id === origem.id) {
      return {
        ...j,
        status_escalacao: statusDestino,
        ordem_escalacao: statusDestino === 'NAO_RELACIONADO' ? undefined : ordemDestino,
      };
    }
    if (j.id === destino.id) {
      return {
        ...j,
        status_escalacao: statusOrigem,
        ordem_escalacao: statusOrigem === 'NAO_RELACIONADO' ? undefined : ordemOrigem,
      };
    }
    return j;
  });

  return normalizarOrdemReservas(atualizado);
}

export function moverJogadorParaZona(
  elenco: JogadorTatica[],
  jogadorId: number,
  zonaDestino: StatusEscalacao
): JogadorTatica[] {
  const atleta = elenco.find((j) => j.id === jogadorId);
  if (!atleta || atleta.status_escalacao === zonaDestino) return elenco;
  if (estaIndisponivel(atleta) && zonaDestino !== 'NAO_RELACIONADO') return elenco;

  const titularesAtuais = elenco.filter((j) => j.status_escalacao === 'TITULAR');
  const reservasAtuais = elenco.filter((j) => j.status_escalacao === 'RESERVA');

  if (zonaDestino === 'NAO_RELACIONADO') {
    const atualizado = elenco.map((j) =>
      j.id === jogadorId
        ? { ...j, status_escalacao: 'NAO_RELACIONADO' as const, ordem_escalacao: undefined }
        : j
    );
    return normalizarOrdemReservas(atualizado);
  }

  if (zonaDestino === 'RESERVA') {
    if (reservasAtuais.length >= MAX_RESERVAS) return elenco;
    const atualizado = elenco.map((j) =>
      j.id === jogadorId
        ? { ...j, status_escalacao: 'RESERVA' as const, ordem_escalacao: reservasAtuais.length }
        : j
    );
    return normalizarOrdemReservas(atualizado);
  }

  if (zonaDestino === 'TITULAR') {
    if (titularesAtuais.length >= MAX_TITULARES) return elenco;
    const slotsOcupados = new Set(titularesAtuais.map((j) => j.ordem_escalacao));
    let slotLivre = 0;
    while (slotsOcupados.has(slotLivre) && slotLivre < MAX_TITULARES) slotLivre++;

    return elenco.map((j) =>
      j.id === jogadorId
        ? { ...j, status_escalacao: 'TITULAR' as const, ordem_escalacao: slotLivre }
        : j
    );
  }

  return elenco;
}
