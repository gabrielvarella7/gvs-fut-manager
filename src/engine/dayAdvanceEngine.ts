import { db } from '../db/database';
import type { Jogador } from '../types/schema';
import { garantirNomeRealJogador } from '../utils/playerNameGenerator';
import { verificarEIniciarNovaTemporada } from './seasonCalendarEngine';
import { simularJogosParalelosDaData } from './roundParallelEngine';
import type { EstatisticasTemporadaJogador } from './playerRankingsAndValuation';

export interface ResultadoAvancoDia {
  novaDataISO: string;
  acaoObrigatoria: 'NENHUMA' | 'IR_PARA_JOGO' | 'COLETIVA_PENDENTE';
  jogoDoDiaId?: number;
  virouTemporada?: boolean;
  mensagemResumo: string;
}

export function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

function calcularRecuperacaoDiaria(jogador: Jogador & { genetica?: { propensao_lesao?: number } }): number {
  let base = 7;
  if (jogador.idade <= 23) base = 8.5;
  else if (jogador.idade >= 34) base = 4.8;
  else if (jogador.idade >= 30) base = 6.0;

  const propensao = jogador.genetica?.propensao_lesao ?? 1.0;
  if (propensao <= 0.75) base *= 1.2;
  else if (propensao >= 1.5) base *= 0.85;

  return Math.round(base);
}

/**
 * Linha do tempo unificada em 2º plano:
 * 1. Verifica bloqueio obrigatório (coletiva ou jogo do usuário hoje);
 * 2. Simula em paralelo todos os jogos da CPU da data atual;
 * 3. Avança +1 dia, recupera energia, sanitiza nomes reais e verifica virada de temporada (2027+).
 */
export async function executarIrParaProximoDia(params: {
  dataAtualISO: string;
  timeUsuarioId: string;
  rodadaAtual?: number;
  coletivaPendente?: boolean;
  dataProximoJogoUsuarioISO?: string | null;
  jogoDoDiaId?: number;
  estatisticasJogadoresAtuais?: Map<number, EstatisticasTemporadaJogador>;
}): Promise<ResultadoAvancoDia> {
  const {
    dataAtualISO,
    timeUsuarioId,
    rodadaAtual = 1,
    coletivaPendente = false,
    dataProximoJogoUsuarioISO = null,
    jogoDoDiaId,
    estatisticasJogadoresAtuais = new Map(),
  } = params;

  if (coletivaPendente) {
    return {
      novaDataISO: dataAtualISO,
      acaoObrigatoria: 'COLETIVA_PENDENTE',
      mensagemResumo: 'Responda à coletiva de imprensa pós-jogo antes de avançar o dia.',
    };
  }

  if (dataProximoJogoUsuarioISO && dataProximoJogoUsuarioISO === dataAtualISO) {
    return {
      novaDataISO: dataAtualISO,
      acaoObrigatoria: 'IR_PARA_JOGO',
      jogoDoDiaId,
      mensagemResumo: 'Dia de partida! Seguindo para a preparação pré-jogo.',
    };
  }

  // Executa jogos da CPU agendados para a data que está encerrando
  await simularJogosParalelosDaData({
    dataAtualISO,
    timeUsuarioId,
    rodadaAtual,
    estatisticasJogadoresAtuais,
  });

  const novaDataISO = somarDiasISO(dataAtualISO, 1);

  await db.transaction('rw', [db.jogadores, db.meta], async () => {
    const todosJogadores = await db.jogadores.toArray();
    const nomesEmUso = new Set(todosJogadores.map((j) => j.nome));
    const atualizados: Jogador[] = [];

    for (const j of todosJogadores) {
      const higienizado = garantirNomeRealJogador(j, nomesEmUso);
      const novaEnergia = j.energia < 100 ? Math.min(100, j.energia + calcularRecuperacaoDiaria(j)) : 100;
      if (higienizado.nome !== j.nome || novaEnergia !== j.energia) {
        atualizados.push({ ...higienizado, energia: novaEnergia });
      }
    }

    if (atualizados.length > 0) {
      await db.jogadores.bulkPut(atualizados);
    }

    const metaAtual = await db.meta.get('ativo');
    if (metaAtual) {
      await db.meta.put({ ...metaAtual, data_save: novaDataISO });
    }
  });

  // Verifica automaticamente virada de ano/temporada (2027, 2028...)
  const virouTemporada = await verificarEIniciarNovaTemporada(novaDataISO);

  if (dataProximoJogoUsuarioISO && dataProximoJogoUsuarioISO === novaDataISO) {
    return {
      novaDataISO,
      acaoObrigatoria: 'IR_PARA_JOGO',
      jogoDoDiaId,
      virouTemporada,
      mensagemResumo: `Avançou para ${novaDataISO} — Hoje tem jogo do seu clube!`,
    };
  }

  return {
    novaDataISO,
    acaoObrigatoria: 'NENHUMA',
    virouTemporada,
    mensagemResumo: virouTemporada
      ? `Nova temporada gerada para ${novaDataISO.slice(0, 4)}!`
      : `Calendário avançado para ${novaDataISO}.`,
  };
}
