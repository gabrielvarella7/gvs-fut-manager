import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import { escalacaoDeIds } from '../../career/lineup';
import { esquemaOuPadrao } from '../../data/esquemasTaticos';
import type { MatchSimInput } from '../../engine/matchEngine';
import { indiceProximaPartida } from '../../career/brasileirao';
import { detectarClassico, montarContextoPartidaSync } from '../../engine/matchContext';
import {
  hashTaticaPartida,
  mesclarPartidaAposMinuto,
  type CheckpointTransmissao,
} from '../../engine/matchResume';
import type { PlaybackProgress } from '../MatchPlayback';
import { sincronizarCarreiraDexie } from '../../db/careerPersistence';
import { previsaoPreJogo } from '../../engine/matchStats';
import { simularPartidaNoWorker } from '../../engine';
import type { Jogador } from '../../types/schema';
import { useGameStore } from '../../store/useGameStore';
import { MatchCenter } from '../match/MatchCenter';
import { gerarRelatorioPreJogo } from '../../career/relatorioPreJogo';
import { multFadigaPreparadorFisico, nivelStaff } from '../../career/staffEfeitos';
import { formacaoIdDeEsquema, taticaCpuAutomatica } from '../../engine/tacticsEngine';
import { improvisacaoMultTreino } from '../../engine/trainingEngine';
import { tryGetDatabaseTaticas } from '../../db/tacticsDatabase';
import { PreMatchReport } from '../match/PreMatchReport';
import { MatchPreGame } from '../match/MatchPreGame';
import type { VelocidadePlayback } from '../MatchPlayback';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

function elencoTime(jogadores: Jogador[], timeId: string): Jogador[] {
  return jogadores.filter((j) => j.time_id === timeId);
}

export function MatchScreen() {
  const jogos = useGameStore((s) => s.jogos);
  const times = useGameStore((s) => s.timesFicticios);
  const timeUsuarioId = useGameStore((s) => s.timeUsuarioId);
  const jogoEmCursoId = useGameStore((s) => s.partidaJogoEmCurso);
  const esquemaUsuario = useGameStore((s) => s.esquemaAtual);
  const alinhamento11 = useGameStore((s) => s.alinhamento11);
  const gradeTatica11 = useGameStore((s) => s.gradeTatica11);
  const taticaPersonalizada = useGameStore((s) => s.usoTaticaPersonalizada);
  const dbTaticasStore = useGameStore((s) => s.dbTaticas);
  const dbTaticas = dbTaticasStore ?? tryGetDatabaseTaticas();
  const configTatica = useGameStore((s) => s.configTatica);
  const partidaModoAuxiliar = useGameStore((s) => s.partidaModoAuxiliar);
  const limparPartidaModoAuxiliar = useGameStore((s) => s.limparPartidaModoAuxiliar);
  const jogarComAuxiliarAction = useGameStore((s) => s.jogarComAuxiliar);
  const salvar = useGameStore((s) => s.salvarCarreira);
  const sair = useGameStore((s) => s.sairParaMenu);
  const campeonato = useGameStore((s) => s.campeonato);
  const registrar = useGameStore((s) => s.registrarResultadoPartida);
  const registrarLiga = useGameStore((s) => s.registrarResultadoBrasileirao);
  const encerrarTransmissao = useGameStore((s) => s.encerrarTransmissao);
  const irPara = useGameStore((s) => s.irPara);
  const abrirTatica = useGameStore((s) => s.abrirTaticaNaPartida);
  const salvarCheckpoint = useGameStore((s) => s.salvarCheckpointTransmissao);
  const atualizarTransmissao = useGameStore((s) => s.atualizarPartidaTransmissao);
  const checkpoint = useGameStore((s) => s.transmissaoCheckpoint);
  const pendingResume = useGameStore((s) => s.pendingResumePartida);
  const limparPendingResume = useGameStore((s) => s.limparPendingResume);
  const partidaAtual = useGameStore((s) => s.partidaAtual);
  const partidaJogoId = useGameStore((s) => s.partidaJogoId);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const mundoClube = useGameStore((s) => s.mundoClube);

  const [busy, setBusy] = useState(false);
  const [velocidade, setVelocidade] = useState<VelocidadePlayback>(1);
  const [pausado, setPausado] = useState(false);
  const [minuto, setMinuto] = useState(0);
  const progressRef = useRef<PlaybackProgress>({ idx: 0, golsM: 0, golsV: 0, minuto: 0 });
  const [resumePlayback, setResumePlayback] = useState<PlaybackProgress | null>(null);
  const [playbackKey, setPlaybackKey] = useState('0');
  const [skipToEndNonce, setSkipToEndNonce] = useState(0);
  const [erroSim, setErroSim] = useState<string | null>(null);
  const [aguardandoSegundoTempo, setAguardandoSegundoTempo] = useState(false);

  const faseTorneioAmador = !clubeRealId;
  const partidaLiga = useMemo(() => {
    if (faseTorneioAmador || !brasileirao || jogoEmCursoId == null) return null;
    return brasileirao.partidas.find((p) => p.id === jogoEmCursoId) ?? null;
  }, [faseTorneioAmador, brasileirao, jogoEmCursoId]);
  const modoLiga = !!clubeRealId && !!partidaLiga;
  const jogo = useMemo(() => {
    if (!faseTorneioAmador || jogoEmCursoId == null) return null;
    return jogos.find((j) => j.id === jogoEmCursoId) ?? null;
  }, [faseTorneioAmador, jogos, jogoEmCursoId]);

  const mandanteLiga = modoLiga
    ? timesReais.find((t) => t.id === partidaLiga!.mandanteId)
    : null;
  const visitanteLiga = modoLiga
    ? timesReais.find((t) => t.id === partidaLiga!.visitanteId)
    : null;

  const mandanteFic = getTimeFicticio(times, jogo?.mandanteId ?? '');
  const visitanteFic = getTimeFicticio(times, jogo?.visitanteId ?? '');

  const mandanteNome = modoLiga ? mandanteLiga?.nome : mandanteFic?.nome;
  const visitanteNome = modoLiga ? visitanteLiga?.nome : visitanteFic?.nome;
  const estadio = modoLiga ? mandanteLiga?.estadio : 'campo municipal';

  const taticaUsuario = useMemo(
    () => ({
      ...configTatica,
      formacao_id: formacaoIdDeEsquema(esquemaUsuario),
    }),
    [configTatica, esquemaUsuario],
  );

  const simInput: MatchSimInput | null = useMemo(() => {
    if (!dbTaticas) return null;
    if (modoLiga && partidaLiga && mandanteLiga && visitanteLiga && clubeRealId) {
      const elencoM = elencoTime(jogadoresReais, mandanteLiga.id);
      const elencoV = elencoTime(jogadoresReais, visitanteLiga.id);
      const esqM =
        mandanteLiga.id === clubeRealId
          ? esquemaUsuario
          : esquemaOuPadrao(mandanteLiga.esquema_tatico_padrao);
      const esqV =
        visitanteLiga.id === clubeRealId
          ? esquemaUsuario
          : esquemaOuPadrao(visitanteLiga.esquema_tatico_padrao);
      const gradePartida =
        taticaPersonalizada && gradeTatica11?.length === 11 ? gradeTatica11 : null;
      const elencoUser = mandanteLiga.id === clubeRealId ? elencoM : elencoV;
      const escalacaoUser =
        alinhamento11?.length === 11
          ? escalacaoDeIds(elencoUser, esquemaUsuario, alinhamento11, gradePartida)
          : undefined;
      const neutro =
        partidaLiga.campoNeutro ??
        detectarClassico(mandanteLiga.id, visitanteLiga.id, timesReais);
      const contexto = brasileirao
        ? montarContextoPartidaSync({
            mandanteId: mandanteLiga.id,
            visitanteId: visitanteLiga.id,
            times: timesReais,
            estado: brasileirao,
            isClassico: neutro,
          })
        : undefined;
      const fadigaUser =
        clubeRealId && mundoClube ?
          multFadigaPreparadorFisico(nivelStaff(mundoClube, 'PREPARADOR_FISICO'))
        : undefined;
      const improvisacaoPorJogador: Record<number, number> = {};
      if (mundoClube?.estadosTreino) {
        for (const est of mundoClube.estadosTreino) {
          improvisacaoPorJogador[est.jogador_id] = improvisacaoMultTreino(est);
        }
      }
      const bonusTreino = mundoClube?.bonusTreinoProximoJogo;
      const multExec = mundoClube?.multiplicadorExecucaoTaticaTreino;
      const treinoUser =
        bonusTreino && Object.keys(bonusTreino).length > 0
          ? { bonusTreino, multExecucaoTreino: multExec ?? 1 }
          : {};
      return {
        mandante: {
          timeId: mandanteLiga.id,
          nomeCurto: mandanteLiga.nome,
          esquema: esqM,
          elenco: elencoM,
          mandoDeCampo: !neutro,
          forcaInstitucional: mandanteLiga.prestigio ?? mandanteLiga.forca_geral,
          ...(mandanteLiga.id === clubeRealId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
          ...(mandanteLiga.id === clubeRealId && fadigaUser ? { fadigaPorMinutoMult: fadigaUser } : {}),
          tatica:
            mandanteLiga.id === clubeRealId
              ? taticaUsuario
              : taticaCpuAutomatica(esqM, mandanteLiga.id),
          ...(mandanteLiga.id === clubeRealId ? treinoUser : {}),
        },
        visitante: {
          timeId: visitanteLiga.id,
          nomeCurto: visitanteLiga.nome,
          esquema: esqV,
          elenco: elencoV,
          forcaInstitucional: visitanteLiga.prestigio ?? visitanteLiga.forca_geral,
          ...(visitanteLiga.id === clubeRealId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
          ...(visitanteLiga.id === clubeRealId && fadigaUser ? { fadigaPorMinutoMult: fadigaUser } : {}),
          tatica:
            visitanteLiga.id === clubeRealId
              ? taticaUsuario
              : taticaCpuAutomatica(esqV, visitanteLiga.id),
          ...(visitanteLiga.id === clubeRealId ? treinoUser : {}),
        },
        dbTaticas,
        config: {
          bonusMandoCampo: neutro ? 1 : (campeonato?.bonus_mando_campo ?? 1.05),
          ...(Object.keys(improvisacaoPorJogador).length > 0 ?
            { improvisacaoMultPorJogador: improvisacaoPorJogador }
          : {}),
        },
        estadio: neutro ? 'Campo neutro' : mandanteLiga.estadio,
        contexto,
        indicePartidaTemporada: brasileirao ? indiceProximaPartida(brasileirao) : undefined,
      };
    }
    if (jogo && mandanteFic && visitanteFic && timeUsuarioId) {
      const gradePartida =
        taticaPersonalizada && gradeTatica11?.length === 11 ? gradeTatica11 : null;
      const elencoUser =
        mandanteFic.id === timeUsuarioId ? mandanteFic.jogadores : visitanteFic.jogadores;
      const escalacaoUser =
        alinhamento11?.length === 11
          ? escalacaoDeIds(elencoUser, esquemaUsuario, alinhamento11, gradePartida)
          : undefined;
      const esqMf =
        mandanteFic.id === timeUsuarioId ? esquemaUsuario : (mandanteFic.esquema ?? '4-4-2');
      const esqVf =
        visitanteFic.id === timeUsuarioId ? esquemaUsuario : (visitanteFic.esquema ?? '4-4-2');
      return {
        mandante: {
          timeId: mandanteFic.id,
          nomeCurto: mandanteFic.nome,
          esquema: esqMf,
          elenco: mandanteFic.jogadores,
          mandoDeCampo: true,
          tatica:
            mandanteFic.id === timeUsuarioId
              ? taticaUsuario
              : taticaCpuAutomatica(esqMf, mandanteFic.id),
          ...(mandanteFic.id === timeUsuarioId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
        },
        visitante: {
          timeId: visitanteFic.id,
          nomeCurto: visitanteFic.nome,
          esquema: esqVf,
          elenco: visitanteFic.jogadores,
          tatica:
            visitanteFic.id === timeUsuarioId
              ? taticaUsuario
              : taticaCpuAutomatica(esqVf, visitanteFic.id),
          ...(visitanteFic.id === timeUsuarioId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
        },
        dbTaticas,
        config: { bonusMandoCampo: campeonato?.bonus_mando_campo ?? 1.05 },
        estadio: 'campo municipal',
      };
    }
    return null;
  }, [
    modoLiga,
    partidaLiga,
    mandanteLiga,
    visitanteLiga,
    clubeRealId,
    jogadoresReais,
    brasileirao,
    timesReais,
    esquemaUsuario,
    alinhamento11,
    gradeTatica11,
    mundoClube,
    taticaPersonalizada,
    campeonato,
    jogo,
    mandanteFic,
    visitanteFic,
    timeUsuarioId,
    dbTaticas,
    taticaUsuario,
  ]);

  const preJogo = useMemo(
    () => (simInput ? previsaoPreJogo(simInput) : null),
    [simInput],
  );

  const gradePartida =
    taticaPersonalizada && gradeTatica11?.length === 11 ? gradeTatica11 : null;

  const relatorioLiga = useMemo(() => {
    if (!modoLiga || !partidaLiga || !brasileirao || !clubeRealId || !campeonato || !dbTaticas)
      return null;
    return gerarRelatorioPreJogo({
      partida: partidaLiga,
      estado: brasileirao,
      times: timesReais,
      jogadores: jogadoresReais,
      campeonato,
      usuarioTimeId: clubeRealId,
      esquemaUsuario: esquemaUsuario,
      alinhamento11,
      gradeTatica11: gradePartida,
      dbTaticas: dbTaticas!,
      configTaticaUsuario: taticaUsuario,
    });
  }, [
    modoLiga,
    partidaLiga,
    brasileirao,
    clubeRealId,
    campeonato,
    timesReais,
    jogadoresReais,
    esquemaUsuario,
    alinhamento11,
    gradePartida,
    dbTaticas,
    taticaUsuario,
  ]);

  const idPartida = modoLiga ? partidaLiga?.id : jogo?.id;
  const emTransmissao = !!partidaAtual && partidaJogoId === idPartida;

  const encerrarAuxiliar = useCallback(() => {
    limparPartidaModoAuxiliar();
    encerrarTransmissao();
    irPara(modoLiga ? 'escritorio' : 'hub_torneio');
  }, [limparPartidaModoAuxiliar, encerrarTransmissao, irPara, modoLiga]);

  const iniciarPartida = useCallback(async () => {
    if (!simInput || idPartida == null) return;
    if (emTransmissao) return;
    if (jogo?.finalizado) {
      setErroSim('Esta rodada já foi finalizada. Volte ao torneio e abra a próxima.');
      return;
    }
    setBusy(true);
    setErroSim(null);
    try {
      if (modoLiga && brasileirao && clubeRealId) {
        await sincronizarCarreiraDexie({ brasileirao, clubeRealId });
      }
      const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
      const result = await simularPartidaNoWorker({ ...simInput, seed });
      salvarCheckpoint(null);
      setResumePlayback(null);
      setPlaybackKey(String(seed));
      setAguardandoSegundoTempo(false);
      if (modoLiga && partidaLiga) {
        registrarLiga(partidaLiga.id, result);
      } else if (jogo) {
        registrar(jogo.id, result);
      }
      setPausado(false);
      setMinuto(0);
      setSkipToEndNonce(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao simular a partida.';
      setErroSim(msg);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [
    simInput,
    idPartida,
    emTransmissao,
    modoLiga,
    partidaLiga,
    jogo,
    registrar,
    registrarLiga,
  ]);

  useEffect(() => {
    if (!partidaModoAuxiliar || !simInput || emTransmissao || busy) return;
    void (async () => {
      await iniciarPartida();
    })();
  }, [partidaModoAuxiliar, simInput, emTransmissao, busy, iniciarPartida]);

  useEffect(() => {
    if (checkpoint?.partidaJogoId === idPartida) return;
    setPausado(false);
    setMinuto(0);
    setResumePlayback(null);
    setAguardandoSegundoTempo(false);
  }, [partidaAtual, partidaJogoId, checkpoint?.partidaJogoId, idPartida]);

  const hashTaticaAtual = useMemo(
    () =>
      hashTaticaPartida({
        esquema: esquemaUsuario,
        alinhamento11,
        personalizado: taticaPersonalizada,
        gradeTatica11: gradeTatica11 ?? null,
        configTatica: taticaUsuario,
      }),
    [esquemaUsuario, alinhamento11, taticaPersonalizada, gradeTatica11, taticaUsuario],
  );

  useEffect(() => {
    if (!pendingResume || !emTransmissao || !partidaAtual || !simInput || idPartida == null) {
      return;
    }
    const cp = checkpoint;
    if (!cp || cp.partidaJogoId !== idPartida) {
      if (cp) {
        setResumePlayback({
          idx: cp.idxLancamento,
          golsM: cp.golsM,
          golsV: cp.golsV,
          minuto: cp.minuto,
        });
        setMinuto(cp.minuto);
        setPausado(true);
      }
      limparPendingResume();
      return;
    }

    const aplicar = async () => {
      let nextResult = partidaAtual;
      if (hashTaticaAtual !== cp.hashTatica) {
        const seed = partidaAtual.simSeed ?? (Date.now() >>> 0);
        const nova = await simularPartidaNoWorker({ ...simInput, seed });
        nextResult = mesclarPartidaAposMinuto(cp.minuto, partidaAtual, { ...nova, simSeed: seed });
        atualizarTransmissao(nextResult);
        setPlaybackKey(`${seed}-${hashTaticaAtual.slice(0, 8)}`);
      }
      setResumePlayback({
        idx: cp.idxLancamento,
        golsM: cp.golsM,
        golsV: cp.golsV,
        minuto: cp.minuto,
      });
      setMinuto(cp.minuto);
      setPausado(false);
      limparPendingResume();
    };
    void aplicar();
  }, [
    pendingResume,
    emTransmissao,
    partidaAtual,
    simInput,
    idPartida,
    checkpoint,
    hashTaticaAtual,
    atualizarTransmissao,
    limparPendingResume,
  ]);

  const abrirTaticaAoVivo = useCallback(() => {
    if (emTransmissao && idPartida != null) {
      const p = progressRef.current;
      const cp: CheckpointTransmissao = {
        partidaJogoId: idPartida,
        minuto: p.minuto,
        idxLancamento: p.idx,
        golsM: p.golsM,
        golsV: p.golsV,
        hashTatica: hashTaticaAtual,
      };
      salvarCheckpoint(cp);
      setPausado(true);
    }
    abrirTatica();
  }, [emTransmissao, idPartida, hashTaticaAtual, salvarCheckpoint, abrirTatica]);

  const voltarHub = () => {
    encerrarTransmissao();
    if (modoLiga) {
      irPara('escritorio');
      return;
    }
    irPara('hub_torneio');
  };

  const tituloRodada = modoLiga
    ? `Rodada ${partidaLiga!.rodada}`
    : jogo
      ? `Rodada ${jogo.rodada}`
      : 'Partida';

  if (!jogoEmCursoId || (!modoLiga && !jogo) || (modoLiga && !partidaLiga)) {
    return (
      <CmShell titulo="Sem partida">
        <CmPanel className="mb-4">
          <p className="text-sm text-zinc-300">
            {faseTorneioAmador
              ? 'Volte ao torneio e use “Jogar rodada” na rodada liberada.'
              : 'Avance o calendário até o dia do jogo e tente de novo pelo escritório.'}
          </p>
        </CmPanel>
        <CmBtn onClick={() => irPara(modoLiga ? 'escritorio' : 'hub_torneio')}>Voltar</CmBtn>
      </CmShell>
    );
  }

  return (
    <CmShell
      titulo={tituloRodada}
      subtitulo={`${mandanteNome ?? ''} x ${visitanteNome ?? ''}`}
      rodape={
        <div className="flex flex-wrap gap-2">
          <CmBtn variant="ghost" onClick={voltarHub} disabled={busy && !emTransmissao}>
            Voltar
          </CmBtn>
          <CmBtn variant="ghost" onClick={salvar}>
            Salvar
          </CmBtn>
          <CmBtn variant="danger" onClick={sair}>
            Sair
          </CmBtn>
        </div>
      }
    >
      {partidaModoAuxiliar && partidaAtual && emTransmissao && (
        <CmPanel className="mb-4 border-emerald-800/60">
          <p className="text-lg font-semibold text-emerald-200">
            Auxiliar: placar final {partidaAtual.golsMandante} x {partidaAtual.golsVisitante}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            O jogo foi simulado sem transmissão. Resultado já foi registrado na tabela.
          </p>
          <div className="mt-3">
            <CmBtn onClick={encerrarAuxiliar}>Voltar ao escritório</CmBtn>
          </div>
        </CmPanel>
      )}

      {!partidaModoAuxiliar && !emTransmissao && !simInput && (
        <CmPanel className="mb-4 border-amber-700/50">
          <p className="text-sm text-amber-100">Não foi possível montar a partida.</p>
          <p className="mt-1 text-xs text-zinc-400">
            {!dbTaticas
              ? 'Base de táticas não carregou — recarregue a página (Ctrl+F5) e tente de novo.'
              : 'Verifique elenco/tática. Se persistir, recarregue a página.'}
          </p>
          <div className="mt-3 flex gap-2">
            <CmBtn onClick={() => irPara(faseTorneioAmador ? 'hub_torneio' : 'escritorio')}>
              Voltar
            </CmBtn>
            <CmBtn variant="ghost" onClick={abrirTatica}>
              Táticas
            </CmBtn>
          </div>
        </CmPanel>
      )}

      {!partidaModoAuxiliar && !emTransmissao && preJogo && simInput && (
        <>
          {erroSim && (
            <CmPanel className="mb-4 border-red-800/60">
              <p className="text-sm text-red-200">{erroSim}</p>
            </CmPanel>
          )}
          {relatorioLiga ? (
            <PreMatchReport
              relatorio={relatorioLiga}
              acoes={
                <>
                  <CmBtn onClick={() => void iniciarPartida()} disabled={busy}>
                    {busy ? 'Preparando…' : 'Iniciar partida'}
                  </CmBtn>
                  {modoLiga && (
                    <CmBtn variant="ghost" onClick={jogarComAuxiliarAction}>
                      Mandar auxiliar
                    </CmBtn>
                  )}
                  <CmBtn variant="ghost" onClick={() => abrirTatica()}>
                    Táticas (pré-jogo)
                  </CmBtn>
                  <CmBtn variant="ghost" onClick={() => irPara('relatorio_pre_jogo')}>
                    Abrir relatório em tela cheia
                  </CmBtn>
                </>
              }
            />
          ) : (
            <>
              <MatchPreGame
                mandanteNome={mandanteNome ?? ''}
                visitanteNome={visitanteNome ?? ''}
                estadio={estadio}
                preJogo={{
                  probabilidades: preJogo.probabilidades,
                  forcaMandante: preJogo.forcaMandante,
                  forcaVisitante: preJogo.forcaVisitante,
                  mandoBonus: preJogo.mandoBonus,
                }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <CmBtn onClick={() => void iniciarPartida()} disabled={busy}>
                  {busy ? 'Preparando…' : 'Iniciar partida'}
                </CmBtn>
                <CmBtn variant="ghost" onClick={abrirTatica}>
                  Táticas (pré-jogo)
                </CmBtn>
              </div>
            </>
          )}
        </>
      )}

      {emTransmissao && partidaAtual && !partidaModoAuxiliar && (
        <>
          <MatchCenter
            result={partidaAtual}
            mandanteNome={mandanteNome ?? ''}
            visitanteNome={visitanteNome ?? ''}
            estadio={estadio}
            velocidade={velocidade}
            onVelocidade={setVelocidade}
            pausado={pausado}
            onPausado={setPausado}
            onMinuto={setMinuto}
            aoVivo={minuto < 90}
            onTaticas={abrirTaticaAoVivo}
            onPlaybackProgress={(p) => {
              progressRef.current = p;
            }}
            resumePlayback={resumePlayback}
            playbackKey={playbackKey}
            aguardandoSegundoTempo={aguardandoSegundoTempo}
            onIntervalo={() => {
              setPausado(true);
              setAguardandoSegundoTempo(true);
            }}
            onIniciarSegundoTempo={() => {
              setAguardandoSegundoTempo(false);
              setPausado(false);
            }}
            skipToEndNonce={skipToEndNonce}
            onIrProFimDoJogo={() => {
              setAguardandoSegundoTempo(false);
              setSkipToEndNonce((n) => n + 1);
            }}
          />
        </>
      )}
    </CmShell>
  );
}