import type { Lancamento, MatchSimResult } from './matchEngine';
import type { ConfiguracaoTaticaClube } from '../types/tactics';

export interface CheckpointTransmissao {
  partidaJogoId: number;
  minuto: number;
  idxLancamento: number;
  golsM: number;
  golsV: number;
  hashTatica: string;
}

export function hashTaticaPartida(opts: {
  esquema: string;
  alinhamento11: number[] | null;
  personalizado: boolean;
  gradeTatica11: { col: number; row: number; gol?: boolean }[] | null;
  configTatica?: ConfiguracaoTaticaClube;
}): string {
  return JSON.stringify(opts);
}

function golsDosLancamentos(
  lancamentos: Lancamento[],
  mandanteId: string,
): { golsMandante: number; golsVisitante: number } {
  let golsMandante = 0;
  let golsVisitante = 0;
  for (const l of lancamentos) {
    if (l.tipo !== 'gol') continue;
    if (l.timeId === mandanteId) golsMandante++;
    else golsVisitante++;
  }
  return { golsMandante, golsVisitante };
}

/** Mantém tudo até o minuto da transmissão; o restante vem da nova simulação (tática). */
export function mesclarPartidaAposMinuto(
  minutoAtual: number,
  anterior: MatchSimResult,
  nova: MatchSimResult,
): MatchSimResult {
  const congelados = anterior.lancamentos.filter(
    (l) => l.minuto < minutoAtual || (l.minuto === 0 && l.tipo === 'inicio'),
  );
  const futuros = nova.lancamentos.filter((l) => l.minuto > minutoAtual);
  const temIntervalo = congelados.some((l) => l.tipo === 'intervalo');
  const lancamentos = [
    ...congelados,
    ...(minutoAtual >= 45 && !temIntervalo
      ? nova.lancamentos.filter((l) => l.tipo === 'intervalo' && l.minuto === 45)
      : []),
    ...futuros.filter((l) => l.tipo !== 'inicio' || l.minuto > 46),
  ].sort((a, b) => a.minuto - b.minuto || a.tipo.localeCompare(b.tipo));

  const temFim = lancamentos.some((l) => l.tipo === 'fim');
  if (!temFim) {
    const fim = nova.lancamentos.find((l) => l.tipo === 'fim');
    if (fim) lancamentos.push(fim);
  }

  const { golsMandante, golsVisitante } = golsDosLancamentos(lancamentos, anterior.mandanteId);

  return {
    ...nova,
    mandanteId: anterior.mandanteId,
    visitanteId: anterior.visitanteId,
    golsMandante,
    golsVisitante,
    lancamentos,
    /** Enquete “Quem vencerá?” congela no kickoff — tática ao vivo não altera as pills. */
    preJogo: {
      ...nova.preJogo,
      probabilidades: anterior.preJogo.probabilidades,
    },
    forcaInicial: nova.forcaInicial,
    probabilidades: anterior.probabilidades ?? anterior.preJogo.probabilidades,
    estatisticas: nova.estatisticas,
    simSeed: nova.simSeed ?? anterior.simSeed,
  };
}