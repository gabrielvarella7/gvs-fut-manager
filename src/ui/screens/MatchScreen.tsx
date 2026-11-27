import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import { escalacaoDeIds, validarRelacionadosPartida } from '../../career/lineup';
import { esquemaOuPadrao } from '../../data/esquemasTaticos';
import type { MatchSimInput } from '../../engine/matchEngine';
import {
  acrescentarSegmentoTatico,
  criarHistoricoTaticoInicial,
  type TimeNotasInput,
} from '../../engine/matchNotas';
import { montarEscalacao } from '../../engine/matchEngine';
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
import { montarInfoPartidaPreJogo } from '../../career/infoPartidaPreJogo';
import { montarPacotePreJogoEquipes } from '../../career/preJogoEquipeStats';
import { montarH2HLiga, montarH2HTorneio } from '../../career/h2hMatch';
import { multFadigaPreparadorFisico, nivelStaff } from '../../career/staffEfeitos';
import { formacaoIdDeEsquema, taticaCpuAutomatica } from '../../engine/tacticsEngine';
import { tryGetDatabaseTaticas } from '../../db/tacticsDatabase';
import { PreMatchReport } from '../match/PreMatchReport';
import { MatchPreGame } from '../match/MatchPreGame';
import type { VelocidadePlayback } from '../MatchPlayback';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

function elencoTime(jogadores: Jogador[], timeId: string): Jogador[] {
  return jogadores.filter((j) => j.time_id === timeId);
}

const CORES_FIC_FALLBACK: Record<string, { primaria: string; secundaria: string }> = {
  FIC_01: { primaria: '#1d4ed8', secundaria: '#f8fafc' },
  FIC_02: { primaria: '#b91c1c', secundaria: '#111827' },
  FIC_03: { primaria: '#15803d', secundaria: '#fef08a' },
  FIC_04: { primaria: '#6d28d9', secundaria: '#e2e8f0' },
  FIC_05: { primaria: '#0f766e', secundaria: '#f97316' },
  FIC_06: { primaria: '#1e3a8a', secundaria: '#dc2626' },
  FIC_07: { primaria: '#334155', secundaria: '#38bdf8' },
  FIC_08: { primaria: '#9a3412', secundaria: '#fef3c7' },
};

function coresTimeFicticio(timeId: string): { primaria: string; secundaria: string } {
  return CORES_FIC_FALLBACK[timeId] ?? { primaria: '#0a2748', secundaria: '#74acdf' };
}

/** Resultado explícito do clube do usuário a partir do placar (mandante × visitante). */
function rotuloResultadoUsuario(
  golsMandante: number,
  golsVisitante: number,
  usuarioEMandante: boolean | null,
): 'Vitória' | 'Empate' | 'Derrota' | null {
  if (usuarioEMandante == null) return null;
  const gp = usuarioEMandante ? golsMandante : golsVisitante;
  const gc = usuarioEMandante ? golsVisitante : golsMandante;
  if (gp > gc) return 'Vitória';
  if (gp < gc) return 'Derrota';
  return 'Empate';
}

/** Só titulares + reservas relacionados entram no plantel da partida. */
function elencoRelacionado(
  elenco: Jogador[],
  titulares: number[] | null | undefined,
  banco: number[] | null | undefined,
): Jogador[] {
  if (!titulares?.length || !banco?.length) return elenco;
  const ids = new Set([...titulares, ...banco].filter((id) => id > 0));
  return elenco.filter((j) => ids.has(j.id));
}

export function MatchScreen() {
  const jogos = useGameStore((s) => s.jogos);
  const times = useGameStore((s) => s.timesFicticios);
  const timeUsuarioId = useGameStore((s) => s.timeUsuarioId);
  const jogoEmCursoId = useGameStore((s) => s.partidaJogoEmCurso);
  const esquemaUsuario = useGameStore((s) => s.esquemaAtual);
  const alinhamento11 = useGameStore((s) => s.alinhamento11);
  const banco11 = useGameStore((s) => s.banco11);
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
  const perfil = useGameStore((s) => s.perfil);

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
      const elencoUserRaw = mandanteLiga.id === clubeRealId ? elencoM : elencoV;
      const elencoUser = elencoRelacionado(elencoUserRaw, alinhamento11, banco11);
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
      const nivelPrepUser =
        clubeRealId && mundoClube ? nivelStaff(mundoClube, 'PREPARADOR_FISICO') : undefined;
      const fadigaUser =
        nivelPrepUser != null ? multFadigaPreparadorFisico(nivelPrepUser) : undefined;
      const polivalenciaPorJogador: Record<number, number> = {};
      if (mundoClube?.estadosTreino) {
        for (const est of mundoClube.estadosTreino) {
          polivalenciaPorJogador[est.jogador_id] = est.progresso_polivalencia ?? 0;
        }
      }
      const bonusTreino = mundoClube?.bonusTreinoProximoJogo;
      const multExec = mundoClube?.multiplicadorExecucaoTaticaTreino;
      const treinoUser =
        bonusTreino && Object.keys(bonusTreino).length > 0
          ? { bonusTreino, multExecucaoTreino: multExec ?? 1 }
          : {};
      const participacoesUser = mundoClube?.participacoesTemporada;
      return {
        mandante: {
          timeId: mandanteLiga.id,
          nomeCurto: mandanteLiga.nome,
          esquema: esqM,
          elenco: mandanteLiga.id === clubeRealId ? elencoUser : elencoM,
          mandoDeCampo: !neutro,
          forcaInstitucional: mandanteLiga.prestigio ?? mandanteLiga.forca_geral,
          ...(mandanteLiga.id === clubeRealId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
          ...(mandanteLiga.id === clubeRealId && fadigaUser ? { fadigaPorMinutoMult: fadigaUser } : {}),
          ...(mandanteLiga.id === clubeRealId && nivelPrepUser != null
            ? { nivelPreparador: nivelPrepUser }
            : {}),
          tatica:
            mandanteLiga.id === clubeRealId
              ? taticaUsuario
              : taticaCpuAutomatica(esqM, mandanteLiga.id),
          ...(mandanteLiga.id === clubeRealId ? treinoUser : {}),
          ...(mandanteLiga.id === clubeRealId && participacoesUser
            ? { participacoesTemporada: participacoesUser }
            : {}),
        },
        visitante: {
          timeId: visitanteLiga.id,
          nomeCurto: visitanteLiga.nome,
          esquema: esqV,
          elenco: visitanteLiga.id === clubeRealId ? elencoUser : elencoV,
          forcaInstitucional: visitanteLiga.prestigio ?? visitanteLiga.forca_geral,
          ...(visitanteLiga.id === clubeRealId && escalacaoUser ? { escalacao: escalacaoUser } : {}),
          ...(visitanteLiga.id === clubeRealId && fadigaUser ? { fadigaPorMinutoMult: fadigaUser } : {}),
          ...(visitanteLiga.id === clubeRealId && nivelPrepUser != null
            ? { nivelPreparador: nivelPrepUser }
            : {}),
          tatica:
            visitanteLiga.id === clubeRealId
              ? taticaUsuario
              : taticaCpuAutomatica(esqV, visitanteLiga.id),
          ...(visitanteLiga.id === clubeRealId ? treinoUser : {}),
          ...(visitanteLiga.id === clubeRealId && participacoesUser
            ? { participacoesTemporada: participacoesUser }
            : {}),
        },
        dbTaticas,
        config: {
          bonusMandoCampo: neutro ? 1 : (campeonato?.bonus_mando_campo ?? 1.05),
          ...(Object.keys(polivalenciaPorJogador).length > 0 ?
            { polivalenciaPorJogador }
          : {}),
        },
        estadio: neutro ? 'Campo neutro' : mandanteLiga.estadio,
        contexto,
        indicePartidaTemporada: brasileirao ? indiceProximaPartida(brasileirao) : undefined,
        dataPartidaISO: partidaLiga.dataISO ?? brasileirao?.dataAtualISO,
      };
    }
    if (jogo && mandanteFic && visitanteFic && timeUsuarioId) {
      const gradePartida =
        taticaPersonalizada && gradeTatica11?.length === 11 ? gradeTatica11 : null;
      const elencoUserRaw =
        mandanteFic.id === timeUsuarioId ? mandanteFic.jogadores : visitanteFic.jogadores;
      const elencoUser = elencoRelacionado(elencoUserRaw, alinhamento11, banco11);
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
          elenco:
            mandanteFic.id === timeUsuarioId ? elencoUser : mandanteFic.jogadores,
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
          elenco:
            visitanteFic.id === timeUsuarioId ? elencoUser : visitanteFic.jogadores,
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
    banco11,
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

  const notasTimes = useMemo((): {
    mandante: TimeNotasInput;
    visitante: TimeNotasInput;
  } | null => {
    if (!simInput) return null;
    if (modoLiga && mandanteLiga && visitanteLiga) {
      return {
        mandante: {
          timeId: simInput.mandante.timeId,
          nome: mandanteLiga.nome,
          esquema: simInput.mandante.esquema,
          corPrimaria: mandanteLiga.cor_primaria,
          corSecundaria: mandanteLiga.cor_secundaria,
          elenco: simInput.mandante.elenco,
          escalacao: simInput.mandante.escalacao,
        },
        visitante: {
          timeId: simInput.visitante.timeId,
          nome: visitanteLiga.nome,
          esquema: simInput.visitante.esquema,
          corPrimaria: visitanteLiga.cor_primaria,
          corSecundaria: visitanteLiga.cor_secundaria,
          elenco: simInput.visitante.elenco,
          escalacao: simInput.visitante.escalacao,
        },
      };
    }
    if (mandanteFic && visitanteFic) {
      const cM = coresTimeFicticio(mandanteFic.id);
      const cV = coresTimeFicticio(visitanteFic.id);
      return {
        mandante: {
          timeId: simInput.mandante.timeId,
          nome: mandanteFic.nome,
          esquema: simInput.mandante.esquema,
          corPrimaria: cM.primaria,
          corSecundaria: cM.secundaria,
          elenco: simInput.mandante.elenco,
          escalacao: simInput.mandante.escalacao,
        },
        visitante: {
          timeId: simInput.visitante.timeId,
          nome: visitanteFic.nome,
          esquema: simInput.visitante.esquema,
          corPrimaria: cV.primaria,
          corSecundaria: cV.secundaria,
          elenco: simInput.visitante.elenco,
          escalacao: simInput.visitante.escalacao,
        },
      };
    }
    return null;
  }, [simInput, modoLiga, mandanteLiga, visitanteLiga, mandanteFic, visitanteFic]);

  const formacoesTimes = useMemo(() => {
    if (!simInput) return null;
    const timeUsuario = clubeRealId ?? timeUsuarioId;
    const nomeTreinador = perfil?.nome?.trim() || null;
    const corM = modoLiga
      ? {
          corPrimaria: mandanteLiga?.cor_primaria,
          corSecundaria: mandanteLiga?.cor_secundaria,
        }
      : {};
    const corV = modoLiga
      ? {
          corPrimaria: visitanteLiga?.cor_primaria,
          corSecundaria: visitanteLiga?.cor_secundaria,
        }
      : {};
    return {
      mandante: {
        timeId: simInput.mandante.timeId,
        nome: mandanteNome ?? simInput.mandante.nomeCurto,
        esquema: simInput.mandante.esquema,
        elenco: simInput.mandante.elenco,
        escalacao: simInput.mandante.escalacao,
        treinadorNome:
          timeUsuario && simInput.mandante.timeId === timeUsuario ? nomeTreinador : null,
        ...corM,
      },
      visitante: {
        timeId: simInput.visitante.timeId,
        nome: visitanteNome ?? simInput.visitante.nomeCurto,
        esquema: simInput.visitante.esquema,
        elenco: simInput.visitante.elenco,
        escalacao: simInput.visitante.escalacao,
        treinadorNome:
          timeUsuario && simInput.visitante.timeId === timeUsuario ? nomeTreinador : null,
        ...corV,
      },
    };
  }, [
    simInput,
    clubeRealId,
    timeUsuarioId,
    perfil?.nome,
    modoLiga,
    mandanteLiga,
    visitanteLiga,
    mandanteNome,
    visitanteNome,
  ]);

  const preJogo = useMemo(
    () => (simInput ? previsaoPreJogo(simInput) : null),
    [simInput],
  );

  const equipesPreJogo = useMemo(() => {
    if (!modoLiga || !brasileirao || !mandanteLiga || !visitanteLiga) return null;
    return montarPacotePreJogoEquipes({
      estado: brasileirao,
      mandante: mandanteLiga,
      visitante: visitanteLiga,
      jogadores: jogadoresReais,
    });
  }, [modoLiga, brasileirao, mandanteLiga, visitanteLiga, jogadoresReais]);

  const infoPartidaPreJogo = useMemo(() => {
    if (!modoLiga || !partidaLiga || !mandanteLiga || !campeonato) return null;
    const neutro =
      partidaLiga.campoNeutro ??
      detectarClassico(partidaLiga.mandanteId, partidaLiga.visitanteId, timesReais);
    return montarInfoPartidaPreJogo({
      partida: partidaLiga,
      campeonato,
      mandante: mandanteLiga,
      campoNeutro: neutro,
    });
  }, [modoLiga, partidaLiga, mandanteLiga, campeonato, timesReais]);

  /** Catálogo para o painel Jogador da partida (nomes sem fotos). */
  const jogadoresInfo = useMemo(() => {
    const mapa = new Map<number, { id: number; nome: string; timeId: string }>();
    const add = (j: { id: number; nome: string; time_id: string }) => {
      mapa.set(j.id, { id: j.id, nome: j.nome, timeId: j.time_id });
    };
    for (const j of jogadoresReais) add(j);
    for (const t of times) {
      for (const j of t.jogadores) add(j);
    }
    return mapa;
  }, [jogadoresReais, times]);

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
    banco11,
    gradePartida,
    dbTaticas,
    taticaUsuario,
  ]);

  const idPartida = modoLiga ? partidaLiga?.id : jogo?.id;
  const emTransmissao = !!partidaAtual && partidaJogoId === idPartida;

  const usuarioEMandante = useMemo(() => {
    if (modoLiga && partidaLiga && clubeRealId) {
      if (partidaLiga.mandanteId === clubeRealId) return true;
      if (partidaLiga.visitanteId === clubeRealId) return false;
      return null;
    }
    if (faseTorneioAmador && jogo && timeUsuarioId) {
      if (jogo.mandanteId === timeUsuarioId) return true;
      if (jogo.visitanteId === timeUsuarioId) return false;
      return null;
    }
    return null;
  }, [modoLiga, partidaLiga, clubeRealId, faseTorneioAmador, jogo, timeUsuarioId]);

  const resultadoAuxiliar = useMemo(() => {
    if (!partidaAtual) return null;
    return rotuloResultadoUsuario(
      partidaAtual.golsMandante,
      partidaAtual.golsVisitante,
      usuarioEMandante,
    );
  }, [partidaAtual, usuarioEMandante]);

  const dadosH2H = useMemo(() => {
    if (modoLiga && brasileirao && partidaLiga && campeonato) {
      return montarH2HLiga({
        estado: brasileirao,
        times: timesReais,
        mandanteId: partidaLiga.mandanteId,
        visitanteId: partidaLiga.visitanteId,
        competicao: campeonato.nome,
        nomeTecnicoUsuario: perfil?.nome ?? null,
        usuarioTimeId: clubeRealId,
        partidaAtual: emTransmissao ? partidaAtual : null,
      });
    }
    if (faseTorneioAmador && jogo) {
      return montarH2HTorneio({
        jogos,
        times,
        mandanteId: jogo.mandanteId,
        visitanteId: jogo.visitanteId,
        nomeTecnicoUsuario: perfil?.nome ?? null,
        usuarioTimeId: timeUsuarioId,
        partidaAtual: emTransmissao ? partidaAtual : null,
      });
    }
    return null;
  }, [
    modoLiga,
    brasileirao,
    partidaLiga,
    campeonato,
    timesReais,
    perfil?.nome,
    clubeRealId,
    emTransmissao,
    partidaAtual,
    faseTorneioAmador,
    jogo,
    jogos,
    times,
    timeUsuarioId,
  ]);

  const encerrarAuxiliar = useCallback(() => {
    limparPartidaModoAuxiliar();
    encerrarTransmissao();
    irPara(modoLiga ? 'escritorio' : 'hub_torneio');
  }, [limparPartidaModoAuxiliar, encerrarTransmissao, irPara, modoLiga]);

  const checkRelacionados = useMemo(
    () => validarRelacionadosPartida(alinhamento11, banco11),
    [alinhamento11, banco11],
  );

  const iniciarPartida = useCallback(async () => {
    if (!simInput || idPartida == null) return;
    if (emTransmissao) return;
    if (!checkRelacionados.ok) {
      setErroSim(
        checkRelacionados.motivo ??
          'Relacione 11 titulares e 11 reservas antes de iniciar a partida.',
      );
      return;
    }
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
      const bruto = await simularPartidaNoWorker({ ...simInput, seed });
      const result = {
        ...bruto,
        historicoTatico: criarHistoricoTaticoInicial(simInput),
      };
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
    checkRelacionados,
    modoLiga,
    partidaLiga,
    jogo,
    registrar,
    registrarLiga,
    brasileirao,
    clubeRealId,
    salvarCheckpoint,
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
        const userTimeId = modoLiga ? clubeRealId : timeUsuarioId;
        const ladoUser =
          userTimeId && simInput.mandante.timeId === userTimeId
            ? 'mandante'
            : userTimeId && simInput.visitante.timeId === userTimeId
              ? 'visitante'
              : null;
        if (ladoUser) {
          const timeInput = ladoUser === 'mandante' ? simInput.mandante : simInput.visitante;
          const escNova =
            timeInput.escalacao?.length === 11
              ? timeInput.escalacao
              : montarEscalacao(timeInput.elenco, timeInput.esquema);
          nextResult = {
            ...nextResult,
            historicoTatico: acrescentarSegmentoTatico(
              nextResult.historicoTatico ?? partidaAtual.historicoTatico,
              ladoUser,
              cp.minuto,
              timeInput.esquema,
              escNova,
            ),
          };
        }
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
    modoLiga,
    clubeRealId,
    timeUsuarioId,
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
          {emTransmissao && !partidaModoAuxiliar && minuto >= 90 && (
            <CmBtn variant="primary" onClick={voltarHub}>
              Finalizar jogo
            </CmBtn>
          )}
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
            Auxiliar:{' '}
            {resultadoAuxiliar ? (
              <>
                <span
                  className={
                    resultadoAuxiliar === 'Vitória'
                      ? 'text-green-300'
                      : resultadoAuxiliar === 'Derrota'
                        ? 'text-rose-300'
                        : 'text-zinc-200'
                  }
                >
                  {resultadoAuxiliar}
                </span>
                {' — '}
              </>
            ) : null}
            placar final {partidaAtual.golsMandante} x {partidaAtual.golsVisitante}
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

      {!partidaModoAuxiliar && !emTransmissao && !checkRelacionados.ok && (
        <CmPanel className="mb-4 border-rose-700/60 bg-rose-950/30">
          <p className="text-sm font-medium text-rose-100">
            {checkRelacionados.motivo ??
              'Relacione 11 titulares e 11 reservas antes de iniciar a partida.'}
          </p>
          <p className="mt-1 text-xs text-rose-200/80">
            Agora: {checkRelacionados.titulares}/11 titulares · {checkRelacionados.reservas}/11
            reservas.
          </p>
          <div className="mt-3">
            <CmBtn variant="ghost" onClick={() => abrirTatica()}>
              Ir para tática
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
                  <CmBtn
                    onClick={() => void iniciarPartida()}
                    disabled={busy || !checkRelacionados.ok}
                  >
                    {busy ? 'Preparando…' : 'Iniciar partida'}
                  </CmBtn>
                  {modoLiga && (
                    <CmBtn
                      variant="ghost"
                      onClick={jogarComAuxiliarAction}
                      disabled={!checkRelacionados.ok}
                    >
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
              <div className="mb-4 flex flex-wrap gap-2">
                <CmBtn
                  onClick={() => void iniciarPartida()}
                  disabled={busy || !checkRelacionados.ok}
                >
                  {busy ? 'Preparando…' : 'Iniciar partida'}
                </CmBtn>
                <CmBtn variant="ghost" onClick={abrirTatica}>
                  Táticas (pré-jogo)
                </CmBtn>
              </div>
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
                equipes={equipesPreJogo}
                infoPartida={infoPartidaPreJogo}
              />
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
            notasMandante={notasTimes?.mandante}
            notasVisitante={notasTimes?.visitante}
            jogadoresInfo={jogadoresInfo}
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
              setMinuto(90);
              setSkipToEndNonce((n) => n + 1);
            }}
            formacoesMandante={formacoesTimes?.mandante}
            formacoesVisitante={formacoesTimes?.visitante}
            arbitro={null}
            onFinalizarJogo={voltarHub}
            classificacao={
              modoLiga && brasileirao && campeonato && partidaLiga
                ? {
                    estado: brasileirao,
                    campeonato,
                    times: timesReais,
                    partidaAoVivoId: partidaLiga.id,
                    mandanteId: partidaLiga.mandanteId,
                    visitanteId: partidaLiga.visitanteId,
                  }
                : null
            }
            equipesPreJogo={equipesPreJogo}
            infoPartida={infoPartidaPreJogo}
            h2h={dadosH2H}
          />
        </>
      )}
    </CmShell>
  );
}