import { useMemo } from 'react';
import { ehDiaDeJogo, proximaPartidaUsuario } from '../../career/brasileirao';
import { gerarRelatorioPreJogo } from '../../career/relatorioPreJogo';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn } from '../cm/CmShell';
import { PreMatchReport } from '../match/PreMatchReport';

export function PreMatchReportScreen() {
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const campeonato = useGameStore((s) => s.campeonato);
  const esquemaAtual = useGameStore((s) => s.esquemaAtual);
  const alinhamento11 = useGameStore((s) => s.alinhamento11);
  const gradeTatica11 = useGameStore((s) => s.gradeTatica11);
  const taticaPersonalizada = useGameStore((s) => s.usoTaticaPersonalizada);
  const dbTaticas = useGameStore((s) => s.dbTaticas);
  const configTatica = useGameStore((s) => s.configTatica);
  const gradePartida =
    taticaPersonalizada && gradeTatica11?.length === 11 ? gradeTatica11 : null;
  const irPara = useGameStore((s) => s.irPara);

  const prox =
    brasileirao && clubeRealId ? proximaPartidaUsuario(brasileirao, clubeRealId) : null;
  const diaJogo = brasileirao && clubeRealId && ehDiaDeJogo(brasileirao, clubeRealId);

  const relatorio = useMemo(() => {
    if (!prox || !brasileirao || !campeonato || !clubeRealId || !dbTaticas) return null;
    return gerarRelatorioPreJogo({
      partida: prox,
      estado: brasileirao,
      times: timesReais,
      jogadores: jogadoresReais,
      campeonato,
      usuarioTimeId: clubeRealId,
      esquemaUsuario: esquemaAtual,
      alinhamento11,
      gradeTatica11: gradePartida,
      dbTaticas,
      configTaticaUsuario: configTatica,
    });
  }, [
    prox,
    brasileirao,
    campeonato,
    clubeRealId,
    timesReais,
    jogadoresReais,
    esquemaAtual,
    alinhamento11,
    gradePartida,
    dbTaticas,
    configTatica,
  ]);

  const titulo = relatorio
    ? `${relatorio.mandante.nome} x ${relatorio.visitante.nome}`
    : 'Relatório pré-jogo';

  return (
    <CmCareerShell titulo="Relatório pré-jogo" subtitulo={titulo}>
      {!relatorio ? (
        <p className="text-zinc-400">Não há próximo jogo para analisar.</p>
      ) : (
        <PreMatchReport
          relatorio={relatorio}
          acoes={
            <>
              <CmBtn variant="ghost" onClick={() => irPara('escritorio')}>
                Voltar ao escritório
              </CmBtn>
              <CmBtn variant="ghost" onClick={() => irPara('tatica')}>
                Ajustar táticas
              </CmBtn>
              {diaJogo && (
                <CmBtn onClick={() => irPara('partida')}>Ir para a partida</CmBtn>
              )}
            </>
          }
        />
      )}
    </CmCareerShell>
  );
}