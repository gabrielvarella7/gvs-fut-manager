import type { Jogador } from '../types/schema';
import type { MatchSimResult } from './matchEngine';
import { calcularJogadorDaPartida } from './jogadorDaPartida';
import { BANCO_RESPOSTAS_COLETIVA } from './pressConferenceBank';
import {
  gerarColetivaPosJogo,
  type ColetivaPosJogo,
} from './pressConferenceEngine';

export type ContextoColetivaMatch = {
  result: MatchSimResult;
  clubeId: string;
  clubeNome: string;
  clubeSigla?: string;
  adversarioNome: string;
  elencoClube: Jogador[];
  dataISO?: string;
};

function siglaDeNome(nome: string): string {
  const limpo = nome.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').trim();
  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return (partes[0]!.slice(0, 1) + partes[1]!.slice(0, 2)).toUpperCase();
  }
  return limpo.slice(0, 3).toUpperCase() || 'CLB';
}

function resultadoUsuario(
  result: MatchSimResult,
  clubeId: string,
): 'VITORIA' | 'EMPATE' | 'DERROTA' {
  const casa = result.mandanteId === clubeId;
  const gf = casa ? result.golsMandante : result.golsVisitante;
  const gc = casa ? result.golsVisitante : result.golsMandante;
  if (gf > gc) return 'VITORIA';
  if (gf < gc) return 'DERROTA';
  return 'EMPATE';
}

function placarUsuario(result: MatchSimResult, clubeId: string): string {
  const casa = result.mandanteId === clubeId;
  const gf = casa ? result.golsMandante : result.golsVisitante;
  const gc = casa ? result.golsVisitante : result.golsMandante;
  return `${gf}x${gc}`;
}

/**
 * Monta coletiva pós-jogo a partir do resultado da partida do usuário.
 * Retorna null se não houver jogadores do clube com atuação.
 */
export function montarColetivaPosPartida(ctx: ContextoColetivaMatch): ColetivaPosJogo | null {
  const { result, clubeId, clubeNome, adversarioNome, elencoClube } = ctx;
  const participantes = elencoClube.filter(
    (j) => j.time_id === clubeId && result.energiaFinal.some((e) => e.id === j.id),
  );
  if (!participantes.length) return null;

  const mapa = new Map(
    participantes.map((j) => [j.id, { id: j.id, nome: j.nome, timeId: j.time_id }]),
  );
  for (const e of result.energiaFinal) {
    if (!mapa.has(e.id)) {
      mapa.set(e.id, { id: e.id, nome: `Jogador #${e.id}`, timeId: '' });
    }
  }

  const dados = calcularJogadorDaPartida(result, mapa, clubeNome, adversarioNome);
  const notaPorId = new Map<number, number>();
  if (dados) {
    for (const j of dados.topNotas) notaPorId.set(j.id, j.nota);
    notaPorId.set(dados.destaqueNota.id, dados.destaqueNota.nota);
  }

  const golsPorId = new Map<number, number>();
  const assistPorNome = new Map<string, number>();
  for (const l of result.lancamentos) {
    if (l.tipo !== 'gol') continue;
    if (l.jogadorId != null) {
      golsPorId.set(l.jogadorId, (golsPorId.get(l.jogadorId) ?? 0) + 1);
    }
    if (l.assistenteNome) {
      const key = l.assistenteNome.trim().toLowerCase();
      assistPorNome.set(key, (assistPorNome.get(key) ?? 0) + 1);
    }
  }

  const elencoAtuou = participantes.map((jogador) => ({
    jogador,
    nota: notaPorId.get(jogador.id) ?? 6.2,
    gols: golsPorId.get(jogador.id) ?? 0,
    assistencias: assistPorNome.get(jogador.nome.trim().toLowerCase()) ?? 0,
  }));

  return gerarColetivaPosJogo({
    data: ctx.dataISO ?? new Date().toISOString(),
    clubeSigla: ctx.clubeSigla ?? siglaDeNome(clubeNome),
    clubeNome,
    adversarioNome,
    placar: placarUsuario(result, clubeId),
    resultado: resultadoUsuario(result, clubeId),
    elencoAtuou,
    bancoRespostas: BANCO_RESPOSTAS_COLETIVA,
  });
}
