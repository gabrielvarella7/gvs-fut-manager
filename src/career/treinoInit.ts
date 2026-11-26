import type { Jogador } from '../types/schema';
import type {
  EstadoTreinoJogador,
  PlanoIndividualId,
  ProgramacaoTreinoClube,
} from '../types/training';

export function planoPadraoJogador(j: Jogador): PlanoIndividualId {
  if (j.idade >= 32) return 'MANUTENCAO_VETERANO';
  if (j.idade <= 21) return 'MATADOR_FINALIZACAO';
  if (j.posicao === 'ZAG' || j.posicao === 'VOL') return 'EVOLUCAO_DEFENSIVA';
  if (j.posicao === 'ATA') return 'MATADOR_FINALIZACAO';
  if (j.posicao === 'MEI') return 'MAESTRO_DISTRIBUICAO';
  return 'ACELERACAO_EXPLOSAO';
}

export function criarProgramacaoTreino(timeId: string, formacaoId: string): ProgramacaoTreinoClube {
  return {
    time_id: timeId,
    regime_id: 'EQUILIBRADO',
    sessao_principal_id: 'ENSAIO_TATICO_ESQUEMA',
    sessao_secundaria_id: 'SAIDA_BOLA_POSSE',
    familiaridade_formacoes: { [formacaoId]: 58 },
    entrosamento_elenco: 62,
  };
}

export function familiaridadeInicialNovoEsquema(): number {
  return 48 + Math.floor(Math.random() * 10);
}

export function garantirEstadosTreino(
  jogadores: Jogador[],
  clubeId: string,
  existentes: EstadoTreinoJogador[] | undefined,
): EstadoTreinoJogador[] {
  const mapa = new Map((existentes ?? []).map((e) => [e.jogador_id, e]));
  const lista: EstadoTreinoJogador[] = [];
  for (const j of jogadores) {
    if (j.time_id !== clubeId) continue;
    const prev = mapa.get(j.id);
    lista.push(
      prev ?? {
        jogador_id: j.id,
        plano_individual_id: planoPadraoJogador(j),
        xp_acumulado: { defesa: 0, passe: 0, chute: 0, velocidade: 0 },
        progresso_polivalencia: 0,
        lesao_ativa: null,
      },
    );
  }
  return lista;
}