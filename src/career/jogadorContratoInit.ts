import { garantirAtributosJogador } from './atributosJogador';
import type { Jogador } from '../types/schema';
import {
  calcularSuscetibilidadeJogador,
  calcularValorMercado,
  inicializarContratoPadrao,
  adaptarTimeMercado,
  type TimeMercado,
} from './mercadoTransferencias';
import type { Time } from '../types/schema';

export function enriquecerJogadorComContrato(j: Jogador): Jogador {
  if (j.contrato && j.suscetibilidade && j.valor_mercado) return j;
  const { valor_mercado, contrato } = inicializarContratoPadrao(
    j.overall,
    j.idade,
    j.posicao,
    j.id,
  );
  const salario = contrato.salario_clt_mensal + contrato.direito_imagem_mensal;
  return {
    ...j,
    valor_mercado: j.valor_mercado ?? valor_mercado,
    salario_mensal: salario,
    contrato,
    suscetibilidade: j.suscetibilidade ?? {
      indice: 45,
      camada: 'ABERTO_A_PROPOSTAS',
      motivo_principal: 'Avalia oportunidades de carreira.',
    },
  };
}

export function enriquecerElenco(jogadores: Jogador[]): Jogador[] {
  return jogadores.map((j) => enriquecerJogadorComContrato(garantirAtributosJogador(j)));
}

export function atualizarSuscetibilidadeElenco(
  jogadores: Jogador[],
  times: Time[],
  posicaoPorTime: (timeId: string) => number,
  financasUsuario: { salarios_atrasados: boolean } | null,
  clubeUsuarioId: string | null,
): Jogador[] {
  const timeMap = new Map(times.map((t) => [t.id, adaptarTimeMercado(t)]));
  return jogadores.map((j) => {
    if (!j.contrato) return enriquecerJogadorComContrato(j);
    const clube = j.time_id ? timeMap.get(j.time_id) ?? null : null;
    const pos = j.time_id ? posicaoPorTime(j.time_id) : 10;
    const atrasos =
      j.time_id === clubeUsuarioId ? (financasUsuario?.salarios_atrasados ?? false) : false;
    const sus = calcularSuscetibilidadeJogador(j, clube as TimeMercado | null, pos, atrasos);
    return { ...j, suscetibilidade: sus };
  });
}