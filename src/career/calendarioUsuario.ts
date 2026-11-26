import type { EstadoTemporada, PartidaCampeonato } from './brasileirao';
import { adicionarDias, proximaPartidaUsuario } from './brasileirao';

export function compararDataISO(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Corrige saves em que a data passou do dia da partida sem resultado. */
export function corrigirDataNaoUltrapassarJogo(
  estado: EstadoTemporada,
  timeUsuarioId: string,
): EstadoTemporada {
  const prox = proximaPartidaUsuario(estado, timeUsuarioId);
  if (!prox) return estado;
  if (compararDataISO(estado.dataAtualISO, prox.dataISO) > 0) {
    return { ...estado, dataAtualISO: prox.dataISO };
  }
  return estado;
}

/** Não avança após o dia do jogo nem sem disputar a partida pendente. */
export function podeAvancarUmDia(
  estado: EstadoTemporada,
  timeUsuarioId: string,
): { ok: boolean; motivo?: string } {
  const prox = proximaPartidaUsuario(estado, timeUsuarioId);
  if (!prox) return { ok: true };
  if (compararDataISO(estado.dataAtualISO, prox.dataISO) >= 0) {
    return {
      ok: false,
      motivo: 'Hoje é dia de jogo — dispute a partida antes de avançar o calendário.',
    };
  }
  const amanha = adicionarDias(estado.dataAtualISO, 1);
  if (compararDataISO(amanha, prox.dataISO) > 0) {
    return {
      ok: false,
      motivo: 'O calendário não pode passar do dia da partida sem você jogar.',
    };
  }
  return { ok: true };
}

export interface ResultadoFormaUsuario {
  sigla: 'V' | 'E' | 'D';
  placar: string;
  adversarioNome: string;
  emCasa: boolean;
  dataISO: string;
}

export function ultimosJogosUsuario(
  estado: EstadoTemporada,
  timeUsuarioId: string,
  limite = 5,
): PartidaCampeonato[] {
  return estado.partidas
    .filter((p) => p.ehDoUsuario && p.finalizado)
    .sort((a, b) => b.dataISO.localeCompare(a.dataISO) || b.rodada - a.rodada)
    .slice(0, limite);
}

export function montarFormaUsuario(
  estado: EstadoTemporada,
  timeUsuarioId: string,
  nomeAdversario: (id: string) => string,
  limite = 5,
): ResultadoFormaUsuario[] {
  return ultimosJogosUsuario(estado, timeUsuarioId, limite).map((p) => {
    const emCasa = p.mandanteId === timeUsuarioId;
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    const gp = emCasa ? gm : gv;
    const gc = emCasa ? gv : gm;
    const adv = emCasa ? p.visitanteId : p.mandanteId;
    let sigla: 'V' | 'E' | 'D' = 'E';
    if (gp > gc) sigla = 'V';
    else if (gp < gc) sigla = 'D';
    return {
      sigla,
      placar: `${gp} x ${gc}`,
      adversarioNome: nomeAdversario(adv),
      emCasa,
      dataISO: p.dataISO,
    };
  });
}