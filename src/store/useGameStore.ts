import { create } from 'zustand';
import type {
  CampeonatoConfig,
  EsquemaTatico,
  FinancasClube,
  Jogador,
  LancamentoContabil,
  Time,
} from '../types/schema';
import { esquemaSugerido } from '../data/esquemasTaticos';
import type {
  EstadoCarreira,
  NegociacaoTransferencia,
  NoticiaCarreira,
  OfertaTransferencia,
  PerfilTecnico,
  TelaJogo,
} from '../career/types';
import {
  inicializarFinancasClube,
  mesDaRodada,
  processarFechamentoMensal,
  registrarBilheteriaJogo,
  registrarBilheteriaMatchday,
} from '../career/financasMensais';
import type { PoliticaIngressos } from '../types/commercial';
import {
  aceitarPropostaPatrocinio,
  aceitarPropostaTv,
  atualizarComercialPosRodada,
  calcularReceitaMatchday,
  criarEstadoComercialInicial,
  migrarComercialLegado,
  normalizarEstadoComercial,
  montarMatchdayInput,
  processarContratosComercialMensal,
  sincronizarFinancasComercial,
} from '../engine/commercialEngine';
import { persistirComercialDexie } from '../db/commercialPersistence';
import { migrarFinancasLegado } from '../career/financasPersistencia';
import { enriquecerElenco } from '../career/jogadorContratoInit';
import {
  completarElencoEstrutura30,
  completarTimesFicticiosEstrutura30,
} from '../career/plantelEstrutura';
import {
  aplicarStatusEscalacaoElenco,
  validarRelacionadosPartida,
} from '../career/lineup';
import {
  aplicarSnapshotJogadores,
  avaliarOfertaCompra,
  avaliarRespostaVenda,
  concluirCompraMercado,
  concluirVenda,
  criarIdNegociacao,
  gerarOfertaCompraCpu,
  ofertaPadraoCompra,
  ofertaPadraoVenda,
  resumoContratacaoCompra,
} from '../career/transfers';
import { detectarClassico } from '../engine/matchContext';
import type {
  ColetivaPosJogo,
  OpcaoRespostaColetiva,
  ResultadoColetiva,
} from '../engine/pressConferenceEngine';
import { processarRespostaColetiva } from '../engine/pressConferenceEngine';
import { aplicarDeltasMoralColetiva } from '../engine/pressConferenceMoral';
import { corrigirDataNaoUltrapassarJogo, podeAvancarUmDia } from '../career/calendarioUsuario';
import {
  avancarNegociacaoPorDia,
  enriquecerRumorEntrada,
  negociacaoDeSondagem,
  rumorPendenteResposta,
  rotuloTendenciaSaida,
  tendenciaJogadorAceitarSaida,
} from '../career/sondagemMercado';
import {
  avancarPipelineVendaPorDia,
  estaEmPipelineVenda,
  forcaDoClube,
  iniciarFaseNegociacaoJogador,
  noticiaAssinouContrato,
  noticiaNegociacaoMelada,
} from '../career/pipelineVenda';
import {
  aplicarBalanceamentoNaTemporada,
  avancarDias,
  ehDiaDeJogo,
  extrasDeResultado,
  formatarDataBr,
  iniciarTemporadaBrasileirao,
  posicaoDoTime,
  proximaPartidaUsuario,
  registrarPlacarPartida,
  simularRestanteRodada,
  type EstadoTemporada,
} from '../career/brasileirao';
import {
  calcularDesempenho,
  gerarPropostas,
  gerarPropostasPioresTimes,
  gerarTimesFicticios,
  migrarIdsTorneioAmador,
  montarCalendarioUsuario,
  proximoJogoTorneioAmador,
} from '../career/fictionalLeague';
import { tryGetDatabaseTaticas } from '../db/tacticsDatabase';
import { deduplicarNoticias } from '../career/noticias';
import {
  gerarNoticiasEncerramentoRodada,
  montarContextoEncerramentoRodada,
} from '../career/noticiasEncerramentoRodada';
import {
  aplicarFocoBase,
  aplicarInvestimentoBase,
  criarEstadoMundoClube,
  investimentoBaseMensal,
  normalizarEstadoMundoClube,
  noticiasClimaTorcedor,
  aplicarLesoesEmCampo,
  tickMundoPorDia,
  tickMundoPosRodada,
} from '../career/mundoParalelo';
import { deveGerarInsatisfacaoImproviso } from '../career/afinidadePosicional';
import { gerarSafraAnual, promoverJovemPorId } from '../career/youthAcademy';
import {
  criarEstadoAspirantesS23,
  normalizarAspirantesS23,
  sincronizarAspirantesComBrasileirao,
} from '../career/aspirantesS23';
import {
  montarOfertaDispensa,
  promoverSub23ParaPro,
  tentarDispensaProfissional,
} from '../career/sub23';
import type { EstadoAspirantesS23, OfertaDispensa } from '../types/aspirantesS23';
import { recuperarEnergiaUmDia } from '../career/energia';
import { criarRng } from '../engine/matchEngine';
import type { FocoCategoriaBase, NivelInvestimentoBase } from '../types/mundoClube';
import { corpoTecnicoDeMundo } from '../career/treinoStaff';
import {
  criarProgramacaoTreino,
  garantirEstadosTreino,
} from '../career/treinoInit';
import { persistirTreinosDexie } from '../db/trainingPersistence';
import {
  processarSemanaTreinos,
  registrarMudancaEsquemaTreino,
} from '../engine/trainingEngine';
import {
  carregarSlot,
  excluirSlot,
  gravarSlot,
  listarSaves,
  type SaveSlotMeta,
} from '../career/saveSlots';
import type { MatchSimResult } from '../engine/matchEngine';
import type { ConfiguracaoTaticaClube, DatabaseTaticas } from '../types/tactics';
import type { DatabaseTreinos, PlanoIndividualId } from '../types/training';
import { configuracaoPadrao, formacaoIdDeEsquema } from '../engine/tacticsEngine';
import {
  aplicarFadigaPosPartida,
  persistirJogadoresDexie,
  recuperarReservasViradaRodada,
  rodadaEncerradaNoEstado,
  sincronizarCarreiraDexie,
} from '../db/careerPersistence';

const desempenhoZerado = () => ({
  pontos: 0,
  vitorias: 0,
  empates: 0,
  derrotas: 0,
  golsPro: 0,
  golsContra: 0,
  nota: 0,
});

interface GameStore extends EstadoCarreira {
  campeonato: CampeonatoConfig | null;
  jogadoresReais: Jogador[];
  dbTaticas: DatabaseTaticas | null;
  dbTreinos: DatabaseTreinos | null;
  dbPronto: boolean;
  partidaJogoId: number | null;
  avisoSalvo: string | null;
  jogadorPerfilId: number | null;
  /** Tela para voltar ao fechar o perfil (elenco, transferências, etc.). */
  perfilRetornoTela: TelaJogo;
  /** Clube cujo elenco está sendo visitado (tabela / calendário / mercado). */
  elencoVisitadoClubeId: string | null;
  /** Tela para voltar ao fechar o elenco visitado. */
  elencoVisitadoRetornoTela: TelaJogo;
  saveSlotId: string | null;
  setDatabase: (p: {
    campeonato: CampeonatoConfig;
    times: Time[];
    jogadores: Jogador[];
    taticas: DatabaseTaticas;
    treinos: DatabaseTreinos;
  }) => void;
  atualizarProgramacaoTreino: (patch: Partial<import('../types/training').ProgramacaoTreinoClube>) => void;
  definirPlanoIndividualTreino: (jogadorId: number, plano: PlanoIndividualId) => void;
  irPara: (tela: TelaJogo) => void;
  iniciarNovoJogo: () => void;
  salvarPerfil: (perfil: PerfilTecnico) => void;
  sortearTimesFicticios: () => void;
  escolherTimeFicticio: (id: string) => void;
  commitEscolhaTatica: (p: {
    esquema: EsquemaTatico;
    alinhamento11: number[];
    banco11: number[];
    gradeTatica11: { col: number; row: number; gol?: boolean }[] | null;
    personalizado: boolean;
    configTatica?: ConfiguracaoTaticaClube;
  }) => void;
  esquemaDoUsuario: () => EsquemaTatico;
  salvarEscolhaProposta: (timeId: string) => void;
  assumirClubeContratado: (timeId?: string) => boolean;
  sairParaMenu: () => void;
  abrirPerfilJogador: (id: number) => void;
  fecharPerfilJogador: () => void;
  abrirElencoClube: (clubeId: string) => void;
  fecharElencoClube: () => void;
  registrarResultadoPartida: (jogoId: number, result: MatchSimResult) => void;
  encerrarTransmissao: () => void;
  /**
   * Processa resposta da coletiva pós-jogo: moral clamp + notícia (manchete).
   * Retorna o ResultadoColetiva para a UI.
   */
  responderColetivaPosJogo: (
    coletiva: ColetivaPosJogo,
    opcao: OpcaoRespostaColetiva,
  ) => ResultadoColetiva | null;
  finalizarTorneioSePronto: () => void;
  salvarCarreira: () => boolean;
  listarSaves: () => SaveSlotMeta[];
  carregarCarreiraPorId: (id: string) => boolean;
  excluirCarreiraSalva: (id: string) => boolean;
  limparAvisoSalvo: () => void;
  resetar: () => void;
  brasileirao: EstadoTemporada | null;
  partidaRetornoTatica: boolean;
  transmissaoCheckpoint: import('../engine/matchResume').CheckpointTransmissao | null;
  pendingResumePartida: boolean;
  abrirTaticaNaPartida: () => void;
  voltarDaTaticaParaPartida: () => void;
  salvarCheckpointTransmissao: (
    cp: import('../engine/matchResume').CheckpointTransmissao | null,
  ) => void;
  atualizarPartidaTransmissao: (result: MatchSimResult) => void;
  limparPendingResume: () => void;
  garantirCalendarioUsuario: () => void;
  avancarUmDia: () => void;
  avancarAteDiaDeJogo: () => void;
  registrarResultadoBrasileirao: (
    partidaId: number,
    result: MatchSimResult,
  ) => void;
  iniciarNegociacaoCompra: (jogadorId: number) => string | null;
  iniciarNegociacaoVenda: (jogadorId: number, valorPedido: number) => string | null;
  atualizarOfertaNegociacao: (negId: string, oferta: Partial<OfertaTransferencia>) => void;
  enviarOfertaTransferencia: (negId: string) => void;
  aceitarContraproposta: (negId: string) => void;
  cancelarNegociacao: (negId: string) => void;
  definirPoliticaIngressos: (politica: PoliticaIngressos) => void;
  aceitarPropostaTvComercial: (propostaId: string) => void;
  recusarPropostaTvComercial: (propostaId: string) => void;
  aceitarPropostaPatrocinioComercial: (propostaId: string) => void;
  recusarPropostaPatrocinioComercial: (propostaId: string) => void;
  definirInvestimentoBase: (nivel: NivelInvestimentoBase) => void;
  definirFocoBase: (foco: FocoCategoriaBase) => void;
  /** Promove jovem do Sub-20 ao profissional (1º contrato). */
  promoverJovemDaBase: (jovemId: number) => void;
  /** Promove atleta do Sub-23 ao profissional (mantém Sub-23 em 22). */
  promoverSub23: (atletaId: number) => string | null;
  /** Oferta de dispensa (acordo 50%). */
  simularOfertaDispensa: (jogadorId: number) => OfertaDispensa | null;
  /** Tenta dispensa com acordo; se recusar, retorna oferta para pagar integral. */
  tentarDispensa: (jogadorId: number) => string | null;
  /** Confirma rescisão integral após recusa do acordo. */
  confirmarDispensaIntegral: (jogadorId: number) => string | null;
  aspirantesS23: EstadoAspirantesS23 | null;
  /**
   * UI mode: club screens show the Sub-23 parallel view (read-only except promote).
   * Not persisted in career saves — resets when leaving the career session.
   */
  modoSub23: boolean;
  /** Enters Sub-23 club view (Escritório S23) and sets modoSub23. */
  entrarModoSub23: () => void;
  /** Leaves Sub-23 view and returns to professional Escritório. */
  sairModoSub23: () => void;
  /** Aplica a semana de treinos; retorna mensagem de erro ou null se ok. */
  aplicarTreinoSemana: () => string | null;
  /** Restaura regime/sessões do treino padrão (Equilibrado). */
  restaurarTreinoPadrao: () => void;
  /** Aplica treino padrão automaticamente se a rodada ainda não treinou. */
  garantirTreinoPadraoRodada: () => void;
  marcarNoticiasComoLidas: () => void;
  /** Pula torneio amador e recebe propostas só dos piores clubes. */
  pularTorneioReceberPropostas: () => void;
  /**
   * Volta da tela de propostas: hub do torneio se já escolheu time amador;
   * senão (pulou o torneio) retorna à escolha de time do torneio.
   */
  voltarDePropostas: () => void;
  partidaModoAuxiliar: boolean;
  jogarComAuxiliar: () => void;
  limparPartidaModoAuxiliar: () => void;
  responderSondagemEntrada: (
    rumorId: string,
    acao: 'recusar' | 'negociar',
    valorPedido?: number,
  ) => void;
  apresentarOfertaAoJogador: (negId: string) => void;
}

const estadoInicial = (): EstadoCarreira & {
  campeonato: CampeonatoConfig | null;
  jogadoresReais: Jogador[];
  dbPronto: boolean;
  partidaJogoId: number | null;
  avisoSalvo: string | null;
  jogadorPerfilId: number | null;
  perfilRetornoTela: TelaJogo;
  elencoVisitadoClubeId: string | null;
  elencoVisitadoRetornoTela: TelaJogo;
  saveSlotId: string | null;
  dbTaticas: DatabaseTaticas | null;
  dbTreinos: DatabaseTreinos | null;
  partidaModoAuxiliar: boolean;
  modoSub23: boolean;
} => ({
  campeonato: null,
  jogadoresReais: [],
  dbPronto: false,
  partidaJogoId: null,
  partidaJogoEmCurso: null,
  avisoSalvo: null,
  jogadorPerfilId: null,
  perfilRetornoTela: 'elenco',
  elencoVisitadoClubeId: null,
  elencoVisitadoRetornoTela: 'classificacao',
  saveSlotId: null,
  dbTaticas: null,
  dbTreinos: null,
  modoSub23: false,
  perfil: null,
  timesFicticios: [],
  timeUsuarioId: null,
  esquemaAtual: '4-4-2',
  alinhamento11: null,
  banco11: null,
  usoTaticaPersonalizada: false,
  gradeTatica11: null,
  configTatica: configuracaoPadrao('4-4-2'),
  jogos: [],
  desempenho: desempenhoZerado(),
  propostas: [],
  torneioConcluido: false,
  timesReais: [],
  partidaAtual: null,
  clubeRealId: null,
  propostaSelecionadaId: null,
  noticias: [],
  noticiasVistasIds: [],
  tela: 'menu',
  brasileirao: null,
  partidaRetornoTatica: false,
  transmissaoCheckpoint: null,
  pendingResumePartida: false,
  financas: null,
  comercial: null,
  mundoClube: null,
  aspirantesS23: null,
  negociacoesTransferencia: [],
  partidaModoAuxiliar: false,
});

/** Avança clubes + pipeline venda (jogador → exames → assinatura). Fecha só ao assinar. */
function tickNegociacoesUmDia(params: {
  negociacoes: NegociacaoTransferencia[];
  jogadores: Jogador[];
  financas: FinancasClube | null;
  times: Time[];
  dataISO: string;
  alinhamento11: number[] | null;
  banco11: number[] | null;
}): {
  negociacoes: NegociacaoTransferencia[];
  jogadores: Jogador[];
  financas: FinancasClube | null;
  noticias: NoticiaCarreira[];
  alinhamento11: number[] | null;
  banco11: number[] | null;
} {
  let { negociacoes, jogadores, financas, alinhamento11, banco11 } = params;
  const noticias: NoticiaCarreira[] = [];

  for (const neg of [...negociacoes]) {
    if (neg.status === 'em_analise' || neg.status === 'contra_proposta') {
      const jog = jogadores.find((j) => j.id === neg.jogadorId);
      if (!jog) continue;
      const prox = avancarNegociacaoPorDia(neg, jog, neg.ofertaAtual.valorTransferencia);
      if (prox) negociacoes = negociacoes.map((n) => (n.id === neg.id ? prox : n));
      continue;
    }

    if (!estaEmPipelineVenda(neg) || !financas) continue;
    const jog = jogadores.find((j) => j.id === neg.jogadorId);
    if (!jog) continue;
    const nomeComprador =
      params.times.find((t) => t.id === neg.timeCompradorId)?.nome ?? 'clube comprador';
    const resultado = avancarPipelineVendaPorDia(neg, {
      jogador: jog,
      forcaClubeAtual: forcaDoClube(params.times, neg.timeVendedorId),
      forcaClubeComprador: forcaDoClube(params.times, neg.timeCompradorId),
      nomeComprador,
    });
    if (!resultado) continue;

    if (resultado.tipo === 'melada') {
      negociacoes = negociacoes.map((n) => (n.id === neg.id ? resultado.neg : n));
      noticias.push(noticiaNegociacaoMelada(jog.nome, params.dataISO));
      continue;
    }

    if (resultado.tipo === 'recusada' || resultado.tipo === 'continuar') {
      negociacoes = negociacoes.map((n) => (n.id === neg.id ? resultado.neg : n));
      continue;
    }

    const negFechamento: NegociacaoTransferencia = {
      ...resultado.neg,
      ofertaAtual: resultado.neg.contraOfertaClube ?? resultado.neg.ofertaAtual,
    };
    const fechamento = concluirVenda(jogadores, negFechamento, financas);
    if (fechamento.erro) {
      negociacoes = negociacoes.map((n) =>
        n.id === neg.id
          ? { ...resultado.neg, status: 'recusada' as const, mensagem: fechamento.erro! }
          : n,
      );
      continue;
    }
    jogadores = fechamento.jogadores;
    financas = fechamento.financas;
    negociacoes = negociacoes.map((n) =>
      n.id === neg.id ? { ...resultado.neg, status: 'concluida' as const } : n,
    );
    alinhamento11 = alinhamento11
      ? alinhamento11.map((jid) => (jid === neg.jogadorId ? 0 : jid))
      : alinhamento11;
    banco11 = banco11 ? banco11.filter((jid) => jid !== neg.jogadorId) : banco11;
    noticias.push(noticiaAssinouContrato(jog.nome, nomeComprador, params.dataISO));
  }

  return { negociacoes, jogadores, financas, noticias, alinhamento11, banco11 };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...estadoInicial(),
  setDatabase: ({ campeonato, times, jogadores, taticas, treinos }) =>
    set({
      campeonato,
      timesReais: times,
      // Garante 11+11+8 (=30) por clube quando o plantel ainda é curto.
      jogadoresReais: enriquecerElenco(completarElencoEstrutura30(jogadores, times)),
      dbTaticas: taticas,
      dbTreinos: treinos,
      dbPronto: true,
    }),
  entrarModoSub23: () => {
    const s = get();
    if (!s.clubeRealId || !s.aspirantesS23) {
      set({ avisoSalvo: 'Sub-23 indisponível. Assuma um clube profissional primeiro.' });
      return;
    }
    set({
      modoSub23: true,
      tela: 'escritorio',
      partidaJogoEmCurso: null,
      jogadorPerfilId: null,
      elencoVisitadoClubeId: null,
      partidaRetornoTatica: false,
    });
  },
  sairModoSub23: () => {
    set({
      modoSub23: false,
      tela: 'escritorio',
      partidaJogoEmCurso: null,
      jogadorPerfilId: null,
      elencoVisitadoClubeId: null,
      partidaRetornoTatica: false,
    });
    get().garantirCalendarioUsuario();
  },
  irPara: (tela) => {
    const s0 = get();
    // Aba legada / atalhos → entra no modo Sub-23 completo.
    if (tela === 'sub23') {
      get().entrarModoSub23();
      return;
    }
    // No Sub-23 o usuário só observa — sem jogar, tática editável ou pré-jogo.
    if (
      s0.modoSub23 &&
      (tela === 'partida' || tela === 'relatorio_pre_jogo' || tela === 'propostas')
    ) {
      set({
        tela: 'escritorio',
        avisoSalvo: 'No Sub-23 a disputa é 100% pela IA — só é possível visualizar.',
      });
      return;
    }
    // Sondagens obrigatórias só travam avanço de calendário (avancarUmDia /
    // avancarAteDiaDeJogo) — abas e demais ações do jogo continuam liberadas.
    if (tela === 'escritorio' && s0.clubeRealId && !s0.modoSub23) {
      get().garantirCalendarioUsuario();
    }
    if (tela === 'noticias') {
      get().marcarNoticiasComoLidas();
    }
    if (
      (tela === 'relatorio_pre_jogo' || tela === 'partida') &&
      s0.clubeRealId
    ) {
      get().garantirTreinoPadraoRodada();
    }
    const profissional = !!get().clubeRealId;
    if (
      (tela === 'escritorio' ||
        tela === 'noticias' ||
        tela === 'transferencias' ||
        tela === 'financas' ||
        tela === 'staff' ||
        tela === 'base' ||
        tela === 'treinos' ||
        tela === 'calendario' ||
        tela === 'classificacao' ||
        tela === 'relatorio_pre_jogo') &&
      !profissional
    ) {
      set({ tela: 'hub_torneio', partidaJogoEmCurso: null });
      return;
    }
    if (tela === 'relatorio_pre_jogo') {
      const s = get();
      if (!s.clubeRealId) {
        const proxT = proximoJogoTorneioAmador(s.jogos);
        set({ tela, partidaJogoEmCurso: proxT?.id ?? null });
        return;
      }
      const proxLiga =
        s.brasileirao
          ? proximaPartidaUsuario(s.brasileirao, s.clubeRealId)
          : null;
      set({
        tela,
        partidaJogoEmCurso: proxLiga?.id ?? null,
      });
      return;
    }
    if (tela === 'partida') {
      const s = get();
      const relacionados = validarRelacionadosPartida(s.alinhamento11, s.banco11);
      if (!relacionados.ok) {
        set({
          tela: 'tatica',
          partidaJogoEmCurso: null,
          avisoSalvo: relacionados.motivo,
        });
        return;
      }
      if (!s.clubeRealId) {
        const proxT = proximoJogoTorneioAmador(s.jogos);
        if (!proxT) {
          set({
            tela: 'hub_torneio',
            partidaJogoEmCurso: null,
            avisoSalvo:
              s.jogos.filter((j) => j.ehDoUsuario).every((j) => j.finalizado)
                ? 'Torneio já disputado — use “Encerrar torneio” para ver propostas.'
                : 'Nenhuma rodada pendente no torneio.',
          });
          return;
        }
        set({
          tela,
          partidaAtual: null,
          partidaJogoId: null,
          transmissaoCheckpoint: null,
          pendingResumePartida: false,
          partidaJogoEmCurso: proxT.id,
        });
        return;
      }
      const proxLiga = s.brasileirao
        ? proximaPartidaUsuario(s.brasileirao, s.clubeRealId)
        : null;
      if (proxLiga && ehDiaDeJogo(s.brasileirao!, s.clubeRealId)) {
        set({
          tela,
          partidaAtual: null,
          partidaJogoId: null,
          transmissaoCheckpoint: null,
          pendingResumePartida: false,
          partidaJogoEmCurso: proxLiga.id,
        });
        return;
      }
      set({
        tela: 'escritorio',
        partidaJogoEmCurso: null,
        avisoSalvo: proxLiga
          ? 'Só dá para jogar no dia da partida. Avance o calendário até a data do jogo.'
          : 'Não há partida do campeonato pendente.',
      });
      return;
    }
    set({
      tela,
      partidaJogoEmCurso: null,
      jogadorPerfilId: tela === 'perfil_jogador' ? get().jogadorPerfilId : null,
    });
  },
  iniciarNovoJogo: () => {
    const prev = get();
    set({
      ...estadoInicial(),
      campeonato: prev.campeonato,
      jogadoresReais: prev.jogadoresReais,
      timesReais: prev.timesReais,
      dbTaticas: prev.dbTaticas ?? tryGetDatabaseTaticas(),
      dbTreinos: prev.dbTreinos,
      dbPronto: prev.dbPronto,
      tela: 'criar_tecnico',
    });
  },
  salvarPerfil: (perfil) =>
    set({
      perfil,
      esquemaAtual: perfil.esquemaPreferido,
      tela: 'escolher_time_ficticio',
    }),
  sortearTimesFicticios: () => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    set({ timesFicticios: gerarTimesFicticios(seed) });
  },
  escolherTimeFicticio: (id) => {
    const state = get();
    const esquemaUser = esquemaSugerido({
      atual: state.esquemaAtual,
      preferido: state.perfil?.esquemaPreferido,
    });
    const timesFicticios = state.timesFicticios.map((t) =>
      t.id === id ? { ...t, esquema: esquemaUser } : t,
    );
    const ids = timesFicticios.map((t) => t.id);
    set({
      timesFicticios,
      timeUsuarioId: id,
      esquemaAtual: esquemaUser,
      jogos: montarCalendarioUsuario(id, ids, Date.now()),
      desempenho: desempenhoZerado(),
      torneioConcluido: false,
      propostas: [],
      partidaAtual: null,
      partidaJogoId: null,
      partidaJogoEmCurso: null,
      clubeRealId: null,
      propostaSelecionadaId: null,
      noticias: [],
      noticiasVistasIds: [],
      tela: 'hub_torneio',
    });
  },
  commitEscolhaTatica: ({
    esquema,
    alinhamento11,
    banco11,
    gradeTatica11,
    personalizado,
    configTatica,
  }) => {
    if (get().modoSub23) {
      set({ avisoSalvo: 'Táticas do Sub-23 são controladas pela IA — somente visualização.' });
      return;
    }
    set((s) => {
      const cfg =
        configTatica ??
        ({
          ...s.configTatica,
          formacao_id: formacaoIdDeEsquema(esquema),
        } as ConfiguracaoTaticaClube);
      const formNova = formacaoIdDeEsquema(esquema);
      const formAnt = s.configTatica?.formacao_id;
      let mundoClube = s.mundoClube;
      if (mundoClube?.programacaoTreino && s.clubeRealId) {
        mundoClube = {
          ...mundoClube,
          programacaoTreino: registrarMudancaEsquemaTreino(
            mundoClube.programacaoTreino,
            formAnt,
            formNova,
          ),
        };
      }
      const titSet = new Set(alinhamento11.filter((id) => id > 0));
      const bancoLimpo = banco11.filter((id) => id > 0 && !titSet.has(id)).slice(0, 11);
      let jogadoresReais = s.jogadoresReais;
      let timesFicticios = s.timesFicticios;
      if (s.clubeRealId) {
        jogadoresReais = aplicarStatusEscalacaoElenco(
          jogadoresReais,
          alinhamento11,
          bancoLimpo,
        );
        void persistirJogadoresDexie(jogadoresReais).catch(console.error);
      } else if (s.timeUsuarioId) {
        timesFicticios = timesFicticios.map((t) =>
          t.id !== s.timeUsuarioId
            ? t
            : {
                ...t,
                jogadores: aplicarStatusEscalacaoElenco(
                  t.jogadores,
                  alinhamento11,
                  bancoLimpo,
                ),
              },
        );
      }
      const check = validarRelacionadosPartida(alinhamento11, bancoLimpo);
      return {
        esquemaAtual: esquema,
        alinhamento11,
        banco11: bancoLimpo,
        gradeTatica11: personalizado ? gradeTatica11 : null,
        usoTaticaPersonalizada: personalizado,
        configTatica: cfg,
        mundoClube,
        jogadoresReais,
        timesFicticios,
        avisoSalvo: check.ok
          ? 'Tática salva — 11 titulares e 11 reservas relacionados.'
          : `Tática salva. ${check.motivo ?? 'Complete 11+11 para jogar.'}`,
      };
    });
  },
  esquemaDoUsuario: () => {
    const s = get();
    const clube =
      s.timesReais.find((t) => t.id === s.clubeRealId) ??
      s.timesReais.find((t) => t.id === s.perfil?.timeCoracaoId);
    return esquemaSugerido({
      atual: s.esquemaAtual,
      preferido: s.perfil?.esquemaPreferido,
      padraoClube: clube?.esquema_tatico_padrao,
    });
  },
  salvarEscolhaProposta: (timeId) => set({ propostaSelecionadaId: timeId }),
  assumirClubeContratado: (timeId) => {
    const s = get();
    const id = timeId ?? s.propostaSelecionadaId;
    if (!id) return false;
    const clube = s.timesReais.find((t) => t.id === id);
    if (!clube || !s.perfil) return false;
    const esquema = esquemaSugerido({
      atual: s.esquemaAtual,
      preferido: s.perfil.esquemaPreferido,
      padraoClube: clube.esquema_tatico_padrao,
    });
    if (s.clubeRealId === id) {
      set({ tela: 'escritorio' });
      return true;
    }
    const textoContratacao = `${s.perfil.nome} é o novo técnico do ${clube.nome_completo}. Torcida e diretoria esperam evolução no ${s.campeonato?.nome ?? 'campeonato'}.`;
    const jaExiste = s.noticias.some(
      (n) => n.titulo === 'Contratação confirmada' && n.texto === textoContratacao,
    );
    const noticia: NoticiaCarreira = {
      id: `n_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: 'Contratação confirmada',
      texto: textoContratacao,
    };
    const noticias = jaExiste ? s.noticias : [noticia, ...s.noticias];
    const idsTimes = s.timesReais.map((t) => t.id);
    const brasileirao = iniciarTemporadaBrasileirao(idsTimes, id, 2026, s.timesReais);
    const noticiaCalendario: typeof noticia = {
      id: `n_cal_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: 'Calendário do Brasileirão',
      texto: `A CBF divulgou 38 rodadas, ida e volta, contra os outros 19 clubes. A estreia está em ${formatarDataBr(brasileirao.partidas.find((p) => p.ehDoUsuario)?.dataISO ?? '2026-04-12')}.`,
    };
    const elencoClube = get().jogadoresReais.filter((j) => j.time_id === id);
    const comercial = criarEstadoComercialInicial(clube, elencoClube);
    const formacaoId = formacaoIdDeEsquema(esquema);
    let mundoClube = {
      ...criarEstadoMundoClube(clube),
      programacaoTreino: criarProgramacaoTreino(id, formacaoId),
      estadosTreino: garantirEstadosTreino(
        get().jogadoresReais,
        id,
        undefined,
      ),
    } as import('../types/mundoClube').EstadoMundoClube;
    const safraInicial = gerarSafraAnual({
      jogadores: get().jogadoresReais,
      mundo: mundoClube,
      time: clube,
      rodada: 0,
      temporadaAno: brasileirao.temporadaAno ?? 2026,
      seed: id.length * 9973 + (brasileirao.temporadaAno ?? 2026),
    });
    mundoClube = safraInicial.mundo;
    const aspirantesS23 = criarEstadoAspirantesS23({
      times: s.timesReais,
      jogadores: get().jogadoresReais,
      mundoUsuario: mundoClube,
      clubeUsuarioId: id,
      temporadaAno: brasileirao.temporadaAno ?? 2026,
      seed: id.length * 4243 + (brasileirao.temporadaAno ?? 2026) * 17,
    });
    const noticiaS23: typeof noticia = {
      id: `n_s23_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: 'Brasileirão Sub23',
      texto: `O Sub-23 do ${clube.nome} entrou no Brasileirão Sub23 com 22 atletas. A disputa é 100% controlada pela IA — use o modo Sub23 para acompanhar e promover atletas ao profissional.`,
    };
    let financas = inicializarFinancasClube(clube, elencoClube);
    financas = sincronizarFinancasComercial(financas, comercial, 10);
    set({
      propostaSelecionadaId: id,
      clubeRealId: id,
      esquemaAtual: esquema,
      brasileirao,
      partidaRetornoTatica: false,
      noticias: deduplicarNoticias([
        noticiaS23,
        ...safraInicial.noticias,
        noticiaCalendario,
        ...(jaExiste ? s.noticias : noticias),
      ]),
      financas,
      comercial,
      mundoClube,
      aspirantesS23,
      negociacoesTransferencia: [],
      tela: 'escritorio',
    });
    void sincronizarCarreiraDexie({ brasileirao, clubeRealId: id }).catch(console.error);
    void persistirComercialDexie(comercial).catch(console.error);
    return true;
  },
  abrirTaticaNaPartida: () =>
    set({ partidaRetornoTatica: true, tela: 'tatica', partidaJogoEmCurso: get().partidaJogoEmCurso }),
  voltarDaTaticaParaPartida: () =>
    set({ partidaRetornoTatica: false, tela: 'partida', pendingResumePartida: true }),
  salvarCheckpointTransmissao: (cp) => set({ transmissaoCheckpoint: cp }),
  atualizarPartidaTransmissao: (result) =>
    set({ partidaAtual: result }),
  limparPendingResume: () => set({ pendingResumePartida: false }),
  garantirCalendarioUsuario: () => {
    const s = get();
    if (!s.brasileirao || !s.clubeRealId) return;
    let brasileirao = corrigirDataNaoUltrapassarJogo(s.brasileirao, s.clubeRealId);
    let mundoClube = s.mundoClube;
  if (mundoClube) {
      let rumoresMutados = false;
      const rumoresOfertas = mundoClube.rumoresOfertas.map((r) => {
        if (!rumorPendenteResposta(r)) return r;
        if (r.tendenciaSair != null && r.status === 'pendente_resposta') return r;
        const jog = s.jogadoresReais.find((j) => j.id === r.jogadorId);
        if (!jog) return r;
        rumoresMutados = true;
        return enriquecerRumorEntrada(r, jog, brasileirao.dataAtualISO);
      });
      if (rumoresMutados) {
        mundoClube = { ...mundoClube, rumoresOfertas };
      }
    }
    const dataAjustada = brasileirao !== s.brasileirao;
    if (dataAjustada || mundoClube !== s.mundoClube) {
      set({
        brasileirao,
        ...(mundoClube !== s.mundoClube ? { mundoClube } : {}),
        ...(dataAjustada ?
          { avisoSalvo: 'Data ajustada ao dia da partida pendente.' }
        : {}),
      });
    }
  },
  avancarUmDia: () => {
    const s = get();
    if (s.modoSub23) {
      set({ avisoSalvo: 'No Sub-23 o calendário avança junto com o profissional (IA).' });
      return;
    }
    if (!s.brasileirao || !s.clubeRealId) return;
    const brasileiraoCorrigido = corrigirDataNaoUltrapassarJogo(s.brasileirao, s.clubeRealId);
    if (brasileiraoCorrigido !== s.brasileirao) {
      set({ brasileirao: brasileiraoCorrigido });
    }
    const base = get().brasileirao!;
    if ((s.mundoClube?.rumoresOfertas ?? []).some(rumorPendenteResposta)) {
      set({
        tela: 'transferencias',
        avisoSalvo: 'Responda às sondagens antes de avançar o calendário.',
      });
      return;
    }
    const calendario = podeAvancarUmDia(base, s.clubeRealId);
    if (!calendario.ok) {
      set({ avisoSalvo: calendario.motivo ?? 'Não é possível avançar o dia.' });
      return;
    }
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    const { estado, noticias } = avancarDias(base, 1, clube?.nome ?? 'Clube');
    let jogadores = s.jogadoresReais;
    let mundo = s.mundoClube;
    let extras: NoticiaCarreira[] = [];
    if (mundo) {
      const tick = tickMundoPorDia({
        jogadores,
        mundo,
        clubeId: s.clubeRealId,
        dataISO: estado.dataAtualISO,
        comercialHumor: s.comercial?.indicadores.humor_torcida,
        times: s.timesReais,
      });
      jogadores = tick.jogadores;
      mundo = tick.mundo;
      extras = tick.noticias;
    } else {
      jogadores = recuperarEnergiaUmDia(
        jogadores,
        criarRng((Date.parse(estado.dataAtualISO) ^ 0xeca1) >>> 0),
      );
    }
    const tick = tickNegociacoesUmDia({
      negociacoes: s.negociacoesTransferencia,
      jogadores,
      financas: s.financas,
      times: s.timesReais,
      dataISO: estado.dataAtualISO,
      alinhamento11: s.alinhamento11,
      banco11: s.banco11,
    });
    set({
      brasileirao: estado,
      jogadoresReais: tick.jogadores,
      mundoClube: mundo,
      financas: tick.financas,
      negociacoesTransferencia: tick.negociacoes,
      alinhamento11: tick.alinhamento11,
      banco11: tick.banco11,
      noticias: deduplicarNoticias([
        ...noticias,
        ...extras,
        ...tick.noticias,
        ...s.noticias,
      ]),
    });
    if (extras.length || tick.noticias.length) {
      void persistirJogadoresDexie(tick.jogadores).catch(console.error);
    }
  },
  jogarComAuxiliar: () => {
    const s = get();
    if (s.modoSub23) {
      set({ avisoSalvo: 'No Sub-23 as partidas são disputadas pela IA.' });
      return;
    }
    if (!s.brasileirao || !s.clubeRealId) return;
    const relacionados = validarRelacionadosPartida(s.alinhamento11, s.banco11);
    if (!relacionados.ok) {
      set({
        tela: 'tatica',
        avisoSalvo: relacionados.motivo,
      });
      return;
    }
    const prox = proximaPartidaUsuario(s.brasileirao, s.clubeRealId);
    if (!prox) return;
    if (!ehDiaDeJogo(s.brasileirao, s.clubeRealId)) {
      set({ avisoSalvo: 'O auxiliar só atua no dia da partida.' });
      return;
    }
    set({
      partidaModoAuxiliar: true,
      tela: 'partida',
      partidaJogoEmCurso: prox.id,
      partidaAtual: null,
      partidaJogoId: null,
      transmissaoCheckpoint: null,
      pendingResumePartida: false,
    });
  },
  limparPartidaModoAuxiliar: () => set({ partidaModoAuxiliar: false }),
  responderSondagemEntrada: (rumorId, acao, valorPedido) => {
    const s = get();
    if (!s.clubeRealId || !s.mundoClube) return;
    const rumor = s.mundoClube.rumoresOfertas.find((r) => r.id === rumorId);
    if (!rumor || !rumorPendenteResposta(rumor)) return;
    const jogador = s.jogadoresReais.find((j) => j.id === rumor.jogadorId);
    if (!jogador) return;
    const rumoresRestantes = s.mundoClube.rumoresOfertas.map((r) =>
      r.id === rumorId ? { ...r, status: 'encerrada' as const } : r,
    );
    if (acao === 'recusar') {
      set({
        mundoClube: { ...s.mundoClube, rumoresOfertas: rumoresRestantes },
        avisoSalvo: 'Sondagem recusada.',
        noticias: deduplicarNoticias([
          {
            id: `n_snd_${Date.now()}`,
            data: new Date().toISOString(),
            titulo: 'Proposta recusada',
            texto: `Você recusou o interesse do ${rumor.timeCompradorNome} em ${jogador.nome}.`,
          },
          ...s.noticias,
        ]),
      });
      return;
    }
    const valor = valorPedido ?? rumor.valorIndicativo;
    const neg = negociacaoDeSondagem(rumor, jogador, s.clubeRealId, valor);
    set({
      mundoClube: { ...s.mundoClube, rumoresOfertas: rumoresRestantes },
      negociacoesTransferencia: [neg, ...s.negociacoesTransferencia].slice(0, 12),
      tela: 'transferencias',
      avisoSalvo: `${rotuloTendenciaSaida(rumor.tendenciaSair ?? 50)} — negociação iniciada.`,
    });
  },
  apresentarOfertaAoJogador: (negId) => {
    const s = get();
    if (!s.financas) return;
    const neg = s.negociacoesTransferencia.find((n) => n.id === negId);
    if (!neg || neg.status !== 'aguardando_jogador') return;
    const jogador = s.jogadoresReais.find((j) => j.id === neg.jogadorId);
    if (!jogador) return;
    const oferta = neg.contraOfertaClube ?? neg.ofertaAtual;
    const iniciada = iniciarFaseNegociacaoJogador(
      {
        ...neg,
        ofertaAtual: oferta,
        contraOfertaClube: oferta,
        tendenciaAceitarSaida:
          neg.tendenciaAceitarSaida ??
          tendenciaJogadorAceitarSaida(jogador, oferta.valorTransferencia),
      },
      jogador.nome,
      Math.random,
      jogador,
    );
    set({
      negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
        n.id === negId ? iniciada : n,
      ),
      avisoSalvo: `Negociação com ${jogador.nome} iniciada — ${iniciada.diasRestantesFase} dia(s).`,
    });
  },
  avancarAteDiaDeJogo: () => {
    const s = get();
    if (s.modoSub23) {
      set({ avisoSalvo: 'No Sub-23 o calendário avança junto com o profissional (IA).' });
      return;
    }
    if (!s.brasileirao || !s.clubeRealId) return;
    if ((s.mundoClube?.rumoresOfertas ?? []).some(rumorPendenteResposta)) {
      set({
        tela: 'transferencias',
        avisoSalvo: 'Responda às sondagens antes de avançar o calendário.',
      });
      return;
    }
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    let estado = corrigirDataNaoUltrapassarJogo(s.brasileirao, s.clubeRealId);
    let jogadores = s.jogadoresReais;
    let mundo = s.mundoClube;
    let negociacoes = s.negociacoesTransferencia;
    let financas = s.financas;
    let alinhamento11 = s.alinhamento11;
    let banco11 = s.banco11;
    const blocos: NoticiaCarreira[] = [];
    for (let guard = 0; guard < 60; guard++) {
      const calendario = podeAvancarUmDia(estado, s.clubeRealId);
      if (!calendario.ok) break;
      const av = avancarDias(estado, 1, clube?.nome ?? 'Clube');
      estado = av.estado;
      blocos.push(...av.noticias);
      if (mundo) {
        const tick = tickMundoPorDia({
          jogadores,
          mundo,
          clubeId: s.clubeRealId,
          dataISO: estado.dataAtualISO,
          comercialHumor: s.comercial?.indicadores.humor_torcida,
          times: s.timesReais,
        });
        jogadores = tick.jogadores;
        mundo = tick.mundo;
        blocos.push(...tick.noticias);
      }
      const tickNeg = tickNegociacoesUmDia({
        negociacoes,
        jogadores,
        financas,
        times: s.timesReais,
        dataISO: estado.dataAtualISO,
        alinhamento11,
        banco11,
      });
      negociacoes = tickNeg.negociacoes;
      jogadores = tickNeg.jogadores;
      financas = tickNeg.financas;
      alinhamento11 = tickNeg.alinhamento11;
      banco11 = tickNeg.banco11;
      blocos.push(...tickNeg.noticias);
    }
    set({
      brasileirao: estado,
      jogadoresReais: jogadores,
      mundoClube: mundo,
      financas,
      negociacoesTransferencia: negociacoes,
      alinhamento11,
      banco11,
      noticias: deduplicarNoticias([...blocos, ...s.noticias]),
    });
    if (blocos.length > 0) void persistirJogadoresDexie(jogadores).catch(console.error);
  },
  registrarResultadoBrasileirao: (partidaId, result) => {
    const s = get();
    if (!s.brasileirao || !s.campeonato || !s.clubeRealId) return;
    let jogadores = aplicarFadigaPosPartida(
      s.jogadoresReais,
      result.energiaFinal,
      s.brasileirao.dataAtualISO,
    );
    // Contagem de improvisação (estrela 5+ jogos → insatisfação).
    {
      const improvisoSet = new Set(result.idsImprovisados ?? []);
      const participantes = new Set(result.energiaFinal.map((e) => e.id));
      jogadores = jogadores.map((j) => {
        if (!participantes.has(j.id)) return j;
        if (improvisoSet.has(j.id)) {
          return {
            ...j,
            jogosImprovisoSeguidos: (j.jogosImprovisoSeguidos ?? 0) + 1,
          };
        }
        return { ...j, jogosImprovisoSeguidos: 0 };
      });
    }

    const noticiasLesaoCampo: NoticiaCarreira[] = [];
    for (const j of jogadores) {
      if (
        j.time_id === s.clubeRealId &&
        deveGerarInsatisfacaoImproviso({
          overall: j.overall,
          jogosImprovisoSeguidos: j.jogosImprovisoSeguidos ?? 0,
        }) &&
        (j.jogosImprovisoSeguidos ?? 0) === 5
      ) {
        noticiasLesaoCampo.push({
          id: `improviso_${j.id}_${Date.now()}`,
          data: new Date().toISOString(),
          titulo: `${j.nome} demonstra insatisfação`,
          texto: `${j.nome} jogou fora de posição em 5 partidas seguidas e pediu conversa com a comissão. O entorno fala em desgaste moral.`,
        });
      }
    }
    if (result.lesoesEmCampo?.length) {
      const aplicadas = aplicarLesoesEmCampo(
        jogadores,
        result.lesoesEmCampo,
        s.mundoClube,
      );
      jogadores = aplicadas.jogadores;
      noticiasLesaoCampo.push(...aplicadas.noticias);
    }
    const minutosM: number[] = [];
    const minutosV: number[] = [];
    for (const l of result.lancamentos) {
      if (l.tipo !== 'gol') continue;
      if (l.timeId === result.mandanteId) minutosM.push(l.minuto);
      else minutosV.push(l.minuto);
    }
    let estado = registrarPlacarPartida(
      s.brasileirao,
      partidaId,
      result.golsMandante,
      result.golsVisitante,
      s.campeonato,
      {
        ...extrasDeResultado(result),
        minutosGols: { mandante: minutosM, visitante: minutosV },
      },
    );
    const partida = estado.partidas.find((p) => p.id === partidaId);
    const seed = (Date.now() ^ partidaId) >>> 0;
    if (partida) {
      estado = simularRestanteRodada(
        estado,
        partida.rodada,
        s.timesReais,
        jogadores,
        s.campeonato,
        partidaId,
        seed,
      );
      if (rodadaEncerradaNoEstado(estado, partida.rodada)) {
        jogadores = recuperarReservasViradaRodada(jogadores);
      }
    }
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    const pos = posicaoDoTime(estado.tabela, s.clubeRealId);
    let financas = s.financas;
    let comercial = s.comercial;
  const gmUser =
    partida && partida.mandanteId === s.clubeRealId
      ? result.golsMandante
      : result.golsVisitante;
  const gvUser =
    partida && partida.mandanteId === s.clubeRealId
      ? result.golsVisitante
      : result.golsMandante;
    const vitoriaUser = gmUser > gvUser;
    const empateUser = gmUser === gvUser;
    const derrotaUser = gmUser < gvUser;
    const isClassico =
      partida &&
      (partida.campoNeutro ??
        detectarClassico(partida.mandanteId, partida.visitanteId, s.timesReais));

    if (comercial && clube && partida && s.brasileirao) {
      const elenco = jogadores.filter((j) => j.time_id === s.clubeRealId);
      comercial = atualizarComercialPosRodada(comercial, {
        vitoria: vitoriaUser,
        empate: empateUser,
        derrota: derrotaUser,
        isClassico: !!isClassico,
        clubeId: s.clubeRealId,
        elenco,
        time: clube,
        brasileirao: estado,
        salariosAtrasados: financas?.salarios_atrasados ?? false,
        posicaoTabela: pos,
        rodada: estado.rodadaAtual,
      });
      if (financas) {
        financas = sincronizarFinancasComercial(financas, comercial, pos);
      }
    }

    if (financas && clube && partida && partida.mandanteId === s.clubeRealId) {
      const visitante = s.timesReais.find((t) => t.id === partida.visitanteId);
      if (visitante) {
        const ultimos = estado.partidas
          .filter((p) => p.ehDoUsuario && p.finalizado && p.id !== partidaId)
          .slice(-6);
        const pts = ultimos.reduce((acc, p) => {
          const casa = p.mandanteId === s.clubeRealId;
          const gm = p.golsMandante ?? 0;
          const gv = p.golsVisitante ?? 0;
          const gf = casa ? gm : gv;
          const gc = casa ? gv : gm;
          return acc + (gf > gc ? 1 : gf === gc ? 0.5 : 0);
        }, 0);
        const aproveitamento = ultimos.length ? pts / ultimos.length : 0.55;
        if (comercial) {
          const titularesEstrela = jogadores.filter(
            (j) =>
              j.time_id === s.clubeRealId &&
              j.status_escalacao === 'TITULAR' &&
              j.overall >= 82,
          ).length;
          const input = montarMatchdayInput({
            mandante: clube,
            visitante,
            politica: comercial.politicaIngressosPadrao,
            isClassico: !!isClassico,
            momentoTime: aproveitamento,
            titularesEstrela,
            indicadores: comercial.indicadores,
            seedHorario: seed,
          });
          const md = calcularReceitaMatchday(input);
          const desc = `Matchday ${clube.nome} x ${visitante.nome} · ${md.publico.toLocaleString('pt-BR')} torcedores (${comercial.politicaIngressosPadrao.toLowerCase()})`;
          const { financasAtualizadas } = registrarBilheteriaMatchday({
            financas,
            rodada: partida.rodada,
            mes: mesDaRodada(partida.rodada),
            descricao: desc,
            valorLiquido: md.receitaLiquida,
          });
          financas = financasAtualizadas;
        } else {
          const { financasAtualizadas } = registrarBilheteriaJogo({
            financas,
            mandante: clube,
            visitante,
            rodada: partida.rodada,
            mes: mesDaRodada(partida.rodada),
            isClassico: !!isClassico,
            aproveitamentoRecente: aproveitamento,
          });
          financas = financasAtualizadas;
        }
      }
    }
    if (financas && partida && partida.rodada % 4 === 0 && partida.rodada > financas.rodadaUltimoFechamento) {
      const elenco = jogadores.filter((j) => j.time_id === s.clubeRealId);
      const inicioRodada = partida.rodada - 3;
      const vitoriasNoMes = estado.partidas.filter(
        (p) =>
          p.ehDoUsuario &&
          p.finalizado &&
          p.rodada >= inicioRodada &&
          p.rodada <= partida.rodada &&
          (() => {
            const casa = p.mandanteId === s.clubeRealId;
            const gm = p.golsMandante ?? 0;
            const gv = p.golsVisitante ?? 0;
            const gf = casa ? gm : gv;
            const gc = casa ? gv : gm;
            return gf > gc;
          })(),
      ).length;
      const fecha = processarFechamentoMensal({
        financas,
        elencoAtual: elenco,
        rodada: partida.rodada,
        mes: mesDaRodada(partida.rodada),
        vitoriasNoMes,
      });
      financas = fecha.financasAtualizadas;
      if (comercial && clube) {
        const tick = processarContratosComercialMensal(comercial, {
          time: clube,
          indicadores: comercial.indicadores,
          seed: partida.rodada * 31 + pos,
          temporadaAno: estado.temporadaAno ?? s.brasileirao?.temporadaAno ?? 2026,
        });
        comercial = tick.estado;
        if (tick.luvasPatrocinio > 0) {
          const lanc: LancamentoContabil = {
            time_id: financas.time_id,
            rodada: partida.rodada,
            mes: mesDaRodada(partida.rodada),
            tipo: 'RECEITA',
            categoria: 'PATROCINIO',
            descricao: 'Luvas — início de contrato de patrocínio agendado',
            valor: tick.luvasPatrocinio,
          };
          financas = {
            ...financas,
            saldo_caixa: financas.saldo_caixa + tick.luvasPatrocinio,
            lancamentos: [lanc, ...financas.lancamentos].slice(0, 120),
          };
        }
        financas = sincronizarFinancasComercial(financas, comercial, pos);
      }
      if (s.mundoClube && financas) {
        const custoBase = investimentoBaseMensal(s.mundoClube.base.investimentoNivel);
        if (custoBase > 0) {
          const lanc: LancamentoContabil = {
            time_id: financas.time_id,
            rodada: partida.rodada,
            mes: mesDaRodada(partida.rodada),
            tipo: 'DESPESA',
            categoria: 'OPERACAO_ESTADIO_CT',
            descricao: 'Categorias de base e observação',
            valor: custoBase,
          };
          financas = {
            ...financas,
            saldo_caixa: financas.saldo_caixa - custoBase,
            lancamentos: [lanc, ...financas.lancamentos].slice(0, 120),
          };
        }
      }
    }
    let mundoClube = s.mundoClube;
    const noticiasMundo: NoticiaCarreira[] = [];
    if (mundoClube && clube && partida && s.brasileirao) {
      const tickRodada = tickMundoPosRodada({
        jogadores,
        mundo: mundoClube,
        times: s.timesReais,
        brasileirao: estado,
        clubeId: s.clubeRealId,
        rodada: partida.rodada,
        vitoriaUser,
        empateUser,
        time: clube,
        seed: seed ^ 0xdecaf,
        idsParticipantes: result.energiaFinal.map((e) => e.id),
        idsLesionadosEmCampo: result.lesoesEmCampo?.map((l) => l.jogadorId),
        comercial,
      });
      jogadores = tickRodada.jogadores;
      mundoClube = tickRodada.mundo;
      if (tickRodada.comercial) comercial = tickRodada.comercial;
      noticiasMundo.push(...tickRodada.noticias);
      if (partida.ehDoUsuario) {
        mundoClube = {
          ...mundoClube,
          bonusTreinoProximoJogo: undefined,
          multiplicadorExecucaoTaticaTreino: undefined,
          treinoBonusRodada: undefined,
        };
      }
    }
    let aspirantesS23 = s.aspirantesS23;
    if (aspirantesS23 && s.clubeRealId) {
      const nomes = new Map(s.timesReais.map((t) => [t.id, t.nome_completo]));
      const syncS23 = sincronizarAspirantesComBrasileirao(
        aspirantesS23,
        estado,
        seed ^ 0x52323,
        s.clubeRealId,
        nomes,
      );
      aspirantesS23 = syncS23.aspirantes;
      noticiasMundo.push(...syncS23.noticias);
    }
    const noticiasRodada: NoticiaCarreira[] = [];
    if (partida && rodadaEncerradaNoEstado(estado, partida.rodada) && clube) {
      const ctxEnc = montarContextoEncerramentoRodada({
        estado,
        rodada: partida.rodada,
        clubeId: s.clubeRealId,
        times: s.timesReais,
        jogadores,
      });
      noticiasRodada.push(
        ...gerarNoticiasEncerramentoRodada(ctxEnc, seed ^ partida.rodada ^ 0xeac1),
      );
    } else {
      noticiasRodada.push({
        id: `rod_${partida?.rodada ?? 0}_${Date.now()}`,
        data: new Date().toISOString(),
        titulo: `Rodada ${partida?.rodada ?? '—'} encerrada`,
        texto: `${clube?.nome ?? 'Seu time'} soma após a rodada. Posição na tabela: ${pos}º lugar.`,
      });
    }
    set({
      brasileirao: estado,
      jogadoresReais: jogadores,
      financas,
      comercial,
      mundoClube,
      aspirantesS23: aspirantesS23 ?? s.aspirantesS23,
      partidaAtual: result,
      partidaJogoId: partidaId,
      tela: 'partida',
      noticias: deduplicarNoticias([
        ...noticiasRodada,
        ...noticiasLesaoCampo,
        ...noticiasMundo,
        ...s.noticias,
      ]),
    });
    void (async () => {
      await sincronizarCarreiraDexie({ brasileirao: estado, clubeRealId: s.clubeRealId! });
      await persistirJogadoresDexie(jogadores);
      if (comercial) await persistirComercialDexie(comercial);
    })().catch(console.error);
  },
  sairParaMenu: () =>
    set({
      tela: 'menu',
      modoSub23: false,
      partidaJogoEmCurso: null,
      partidaAtual: null,
      partidaJogoId: null,
      jogadorPerfilId: null,
      elencoVisitadoClubeId: null,
    }),
  abrirPerfilJogador: (id) =>
    set((s) => ({
      jogadorPerfilId: id,
      perfilRetornoTela: s.tela === 'perfil_jogador' ? s.perfilRetornoTela : s.tela,
      tela: 'perfil_jogador',
    })),
  fecharPerfilJogador: () =>
    set((s) => ({
      jogadorPerfilId: null,
      tela: s.perfilRetornoTela || 'elenco',
      perfilRetornoTela: 'elenco',
    })),
  abrirElencoClube: (clubeId) =>
    set((s) => {
      if (!clubeId) return s;
      // Próprio clube → elenco normal (pro ou Sub23 conforme modo).
      if (clubeId === s.clubeRealId) {
        return {
          elencoVisitadoClubeId: null,
          tela: 'elenco',
        };
      }
      return {
        elencoVisitadoClubeId: clubeId,
        elencoVisitadoRetornoTela:
          s.tela === 'elenco_clube' || s.tela === 'perfil_jogador'
            ? s.elencoVisitadoRetornoTela
            : s.tela,
        tela: 'elenco_clube',
      };
    }),
  fecharElencoClube: () =>
    set((s) => ({
      elencoVisitadoClubeId: null,
      tela: s.elencoVisitadoRetornoTela || 'classificacao',
      elencoVisitadoRetornoTela: 'classificacao',
    })),
  registrarResultadoPartida: (jogoId, result) => {
    const s = get();
    const alvo = s.jogos.find((j) => j.id === jogoId);
    if (!alvo || alvo.finalizado) return;
    const jogos = s.jogos.map((j) =>
      j.id === jogoId
        ? {
            ...j,
            finalizado: true,
            golsMandante: result.golsMandante,
            golsVisitante: result.golsVisitante,
            relatorio: result,
          }
        : j,
    );
    const desempenho = calcularDesempenho(jogos, s.timeUsuarioId!);
    set({
      jogos,
      desempenho,
      partidaAtual: result,
      partidaJogoId: jogoId,
      partidaJogoEmCurso: jogoId,
      tela: 'partida',
    });
  },
  encerrarTransmissao: () =>
    set({
      partidaAtual: null,
      partidaJogoId: null,
      partidaJogoEmCurso: null,
      transmissaoCheckpoint: null,
      pendingResumePartida: false,
    }),
  responderColetivaPosJogo: (coletiva, opcao) => {
    const s = get();
    const clubeId = s.clubeRealId ?? s.timeUsuarioId;
    if (!clubeId) return null;
    const alvo =
      s.jogadoresReais.find((j) => j.id === coletiva.jogadorAlvo.id) ??
      s.timesFicticios.flatMap((t) => t.jogadores).find((j) => j.id === coletiva.jogadorAlvo.id);
    if (!alvo) return null;

    const resultado = processarRespostaColetiva(coletiva, opcao, alvo);
    const noticia: NoticiaCarreira = {
      id: `coletiva_${coletiva.id}_${opcao.id}_${Date.now()}`,
      data: coletiva.data || new Date().toISOString(),
      titulo: `Coletiva · ${coletiva.clubeSigla}`,
      texto: `${resultado.mancheteGerada} ${resultado.reacaoJogadorTexto}`,
    };

    if (s.clubeRealId) {
      const jogadores = aplicarDeltasMoralColetiva(
        s.jogadoresReais,
        s.clubeRealId,
        coletiva.jogadorAlvo.id,
        resultado,
      );
      set({
        jogadoresReais: jogadores,
        noticias: deduplicarNoticias([noticia, ...s.noticias]),
      });
      void persistirJogadoresDexie(jogadores).catch(console.error);
    } else {
      const timesFicticios = s.timesFicticios.map((t) => {
        if (t.id !== clubeId) return t;
        return {
          ...t,
          jogadores: aplicarDeltasMoralColetiva(
            t.jogadores,
            clubeId,
            coletiva.jogadorAlvo.id,
            resultado,
          ),
        };
      });
      set({
        timesFicticios,
        noticias: deduplicarNoticias([noticia, ...s.noticias]),
      });
    }
    return resultado;
  },
  finalizarTorneioSePronto: () => {
    const { jogos, timesReais, desempenho } = get();
    const usuarioPronto = jogos.filter((j) => j.ehDoUsuario).every((j) => j.finalizado);
    if (!usuarioPronto) return;
    const propostas = gerarPropostas(desempenho, timesReais);
    set({ torneioConcluido: true, propostas, tela: 'propostas' });
  },
  pularTorneioReceberPropostas: () => {
    const s = get();
    if (!s.perfil) return;
    const propostas = gerarPropostasPioresTimes(s.timesReais, 4);
    set({
      torneioConcluido: true,
      propostas,
      jogos: [],
      timeUsuarioId: null,
      timesFicticios: s.timesFicticios.length ? s.timesFicticios : gerarTimesFicticios(Date.now()),
      desempenho: desempenhoZerado(),
      noticias: deduplicarNoticias([
        {
          id: `n_pular_${Date.now()}`,
          data: new Date().toISOString(),
          titulo: 'Carreira sem torneio amador',
          texto:
            'Você pulou o torneio pré-contrato. Clubes mais fracos da Série A enviaram propostas de emprego.',
        },
        ...s.noticias,
      ]),
      tela: 'propostas',
    });
  },
  voltarDePropostas: () => {
    const s = get();
    // Sem time amador = veio de “Pular torneio”; volta à escolha do torneio.
    if (!s.timeUsuarioId) {
      set({
        tela: 'escolher_time_ficticio',
        torneioConcluido: false,
        propostas: [],
        propostaSelecionadaId: null,
        partidaJogoEmCurso: null,
      });
      return;
    }
    set({ tela: 'hub_torneio', partidaJogoEmCurso: null });
  },
  marcarNoticiasComoLidas: () => {
    const s = get();
    const ids = s.noticias.map((n) => n.id);
    if (ids.length === 0) return;
    const vistas = new Set(s.noticiasVistasIds);
    let mudou = false;
    for (const id of ids) {
      if (!vistas.has(id)) {
        vistas.add(id);
        mudou = true;
      }
    }
    if (mudou) set({ noticiasVistasIds: [...vistas] });
  },
  salvarCarreira: () => {
    const s = get();
    if (!s.perfil?.nome) return false;
    const estado: EstadoCarreira = {
      perfil: s.perfil,
      timesFicticios: s.timesFicticios,
      timeUsuarioId: s.timeUsuarioId,
      esquemaAtual: s.esquemaAtual,
      alinhamento11: s.alinhamento11,
      banco11: s.banco11,
      usoTaticaPersonalizada: s.usoTaticaPersonalizada,
      gradeTatica11: s.gradeTatica11,
      configTatica: s.configTatica,
      jogos: s.jogos,
      desempenho: s.desempenho,
      propostas: s.propostas,
      torneioConcluido: s.torneioConcluido,
      timesReais: s.timesReais,
      partidaAtual: null,
      partidaJogoEmCurso: null,
      clubeRealId: s.clubeRealId,
      propostaSelecionadaId: s.propostaSelecionadaId,
      noticias: s.noticias.slice(0, 80),
      noticiasVistasIds: s.noticiasVistasIds.slice(-200),
      brasileirao: s.brasileirao,
      partidaRetornoTatica: s.partidaRetornoTatica,
      financas: s.financas,
      comercial: s.comercial,
      mundoClube: s.mundoClube,
      aspirantesS23: s.aspirantesS23,
      negociacoesTransferencia: s.negociacoesTransferencia,
      // Só o elenco do clube + alterações recentes cabem melhor no localStorage (evita crash ~rodada 19).
      elencoPersistido: s.clubeRealId
        ? s.jogadoresReais.filter(
            (j) =>
              j.time_id === s.clubeRealId ||
              (s.mundoClube?.participacoesTemporada?.[j.id] ?? 0) > 0,
          )
        : s.jogadoresReais,
      transmissaoCheckpoint: s.transmissaoCheckpoint,
      pendingResumePartida: s.pendingResumePartida,
      tela:
        s.tela === 'partida'
          ? s.clubeRealId
            ? 'escritorio'
            : 'hub_torneio'
          : s.tela,
    };
    try {
      const meta = gravarSlot(estado, s.perfil.nome);
      set({
        saveSlotId: meta.id,
        avisoSalvo: 'Jogo salvo',
        partidaAtual: null,
        partidaJogoId: null,
        partidaJogoEmCurso: null,
        tela:
          s.tela === 'partida'
            ? s.clubeRealId
              ? 'escritorio'
              : 'hub_torneio'
            : s.tela,
      });
      return true;
    } catch (err) {
      console.error(err);
      set({
        avisoSalvo:
          'Falha ao salvar (armazenamento cheio?). Tente de novo após limpar saves antigos.',
      });
      return false;
    }
  },
  listarSaves: () => listarSaves(),
  carregarCarreiraPorId: (id) => {
    const data = carregarSlot(id);
    if (!data) return false;
    let brasileirao = data.brasileirao ?? null;
    const timesReais = get().timesReais;
    if (data.clubeRealId && !brasileirao && timesReais.length >= 20) {
      brasileirao = iniciarTemporadaBrasileirao(
        timesReais.map((t) => t.id),
        data.clubeRealId,
        2026,
        timesReais,
      );
    }
    if (brasileirao && timesReais.length > 0) {
      brasileirao = aplicarBalanceamentoNaTemporada(brasileirao, timesReais);
    }
    if (brasileirao && data.clubeRealId) {
      brasileirao = corrigirDataNaoUltrapassarJogo(brasileirao, data.clubeRealId);
    }
    const clubeSave = timesReais.find((t) => t.id === data.clubeRealId);
    const jogadoresCarregados = enriquecerElenco(
      completarElencoEstrutura30(
        data.elencoPersistido && data.elencoPersistido.length > 0
          ? aplicarSnapshotJogadores(get().jogadoresReais, data.elencoPersistido)
          : get().jogadoresReais,
        timesReais,
      ),
    );
    const elencoUser = jogadoresCarregados.filter((j) => j.time_id === data.clubeRealId);
    let financas = data.financas ?? null;
    if (data.clubeRealId && clubeSave) {
      financas = migrarFinancasLegado(financas, clubeSave, elencoUser);
    }
    let comercial = data.comercial ?? null;
    if (data.clubeRealId && clubeSave && !comercial) {
      comercial = migrarComercialLegado(clubeSave, elencoUser);
    }
    const posSave = brasileirao && data.clubeRealId
      ? posicaoDoTime(brasileirao.tabela, data.clubeRealId)
      : 10;
    const rodadaSave = brasileirao?.rodadaAtual ?? 1;
    if (comercial && clubeSave) {
      comercial = normalizarEstadoComercial(
        comercial,
        clubeSave,
        elencoUser,
        posSave,
        rodadaSave,
      );
    }
    if (financas && comercial) {
      financas = sincronizarFinancasComercial(financas, comercial, posSave);
    }
    let mundoClube = data.mundoClube ?? null;
    if (clubeSave) {
      mundoClube = normalizarEstadoMundoClube(mundoClube, clubeSave);
      if (data.clubeRealId && mundoClube && !mundoClube.programacaoTreino) {
        const formId = formacaoIdDeEsquema(data.esquemaAtual ?? '4-4-2');
        mundoClube = {
          ...mundoClube,
          programacaoTreino: criarProgramacaoTreino(data.clubeRealId, formId),
          estadosTreino: garantirEstadosTreino(
            jogadoresCarregados,
            data.clubeRealId,
            mundoClube.estadosTreino,
          ),
        };
      }
    }
    const aspirantesS23 =
      data.clubeRealId && timesReais.length > 0 ?
        normalizarAspirantesS23(
          data.aspirantesS23 ?? null,
          timesReais,
          jogadoresCarregados,
          mundoClube,
          data.clubeRealId,
          brasileirao?.temporadaAno ?? 2026,
        )
      : (data.aspirantesS23 ?? null);
    set({
      saveSlotId: id,
      perfil: data.perfil ?? null,
      timeUsuarioId: data.timeUsuarioId ?? null,
      esquemaAtual: data.esquemaAtual ?? data.perfil?.esquemaPreferido ?? '4-4-2',
      alinhamento11: data.alinhamento11 ?? null,
      banco11: data.banco11 ?? null,
      usoTaticaPersonalizada: data.usoTaticaPersonalizada ?? false,
      gradeTatica11: data.gradeTatica11 ?? null,
      configTatica: data.configTatica ?? configuracaoPadrao(data.esquemaAtual ?? '4-4-2'),
      timesFicticios: completarTimesFicticiosEstrutura30(data.timesFicticios ?? []),
      jogos: migrarIdsTorneioAmador(data.jogos ?? []),
      desempenho: data.desempenho ?? desempenhoZerado(),
      torneioConcluido: data.torneioConcluido ?? false,
      propostas: data.propostas ?? [],
      clubeRealId: data.clubeRealId ?? null,
      propostaSelecionadaId: data.propostaSelecionadaId ?? null,
      noticias: deduplicarNoticias(data.noticias ?? []),
      noticiasVistasIds: data.noticiasVistasIds ?? [],
      brasileirao,
      partidaRetornoTatica: data.partidaRetornoTatica ?? false,
      financas,
      comercial,
      mundoClube,
      aspirantesS23,
      negociacoesTransferencia: data.negociacoesTransferencia ?? [],
      partidaAtual: null,
      partidaJogoId: null,
      partidaJogoEmCurso: null,
      tela: data.clubeRealId
        ? 'escritorio'
        : data.tela === 'partida'
          ? 'hub_torneio'
          : (data.tela ?? 'hub_torneio'),
      dbPronto: get().dbPronto,
      campeonato: get().campeonato,
      timesReais: get().timesReais,
      jogadoresReais: jogadoresCarregados,
    });
  void persistirJogadoresDexie(jogadoresCarregados).catch(console.error);
    if (comercial) void persistirComercialDexie(comercial).catch(console.error);
    return true;
  },
  iniciarNegociacaoCompra: (jogadorId) => {
    const s = get();
    if (!s.clubeRealId || !s.financas) return null;
    const jogador = s.jogadoresReais.find((j) => j.id === jogadorId);
    if (!jogador || jogador.time_id === s.clubeRealId) return null;
    if (
      s.negociacoesTransferencia.some(
        (n) => n.jogadorId === jogadorId && n.status !== 'recusada' && n.status !== 'concluida',
      )
    ) {
      return null;
    }
    const neg: NegociacaoTransferencia = {
      id: criarIdNegociacao(),
      tipo: 'compra',
      jogadorId,
      timeVendedorId: jogador.time_id,
      timeCompradorId: s.clubeRealId,
      ofertaAtual: ofertaPadraoCompra(jogador),
      contraOfertaClube: null,
      contraOfertaJogador: null,
      status: 'rascunho',
      mensagem: 'Monte a oferta (valor + salário + duração) e envie ao clube.',
      rodadaNegociacao: 1,
      atualizadoEm: new Date().toISOString(),
    };
    set({
      negociacoesTransferencia: [neg, ...s.negociacoesTransferencia].slice(0, 12),
      tela: 'transferencias',
    });
    return neg.id;
  },
  iniciarNegociacaoVenda: (jogadorId, valorPedido) => {
    const s = get();
    if (!s.clubeRealId || !s.financas) return null;
    const jogador = s.jogadoresReais.find((j) => j.id === jogadorId);
    if (!jogador || jogador.time_id !== s.clubeRealId) return null;
    const oferta = ofertaPadraoVenda(jogador);
    oferta.valorTransferencia = Math.max(50_000, valorPedido);
    const neg: NegociacaoTransferencia = {
      id: criarIdNegociacao(),
      tipo: 'venda',
      jogadorId,
      timeVendedorId: s.clubeRealId,
      timeCompradorId: '',
      ofertaAtual: oferta,
      contraOfertaClube: null,
      contraOfertaJogador: null,
      status: 'rascunho',
      mensagem: 'Defina o valor mínimo e envie para o mercado.',
      atualizadoEm: new Date().toISOString(),
    };
    set({
      negociacoesTransferencia: [neg, ...s.negociacoesTransferencia].slice(0, 12),
      tela: 'transferencias',
    });
    return neg.id;
  },
  atualizarOfertaNegociacao: (negId, patch) => {
    set({
      negociacoesTransferencia: get().negociacoesTransferencia.map((n) =>
        n.id === negId && (n.status === 'rascunho' || n.status === 'contra_proposta')
          ? {
              ...n,
              ofertaAtual: {
                ...n.ofertaAtual,
                ...patch,
              },
              atualizadoEm: new Date().toISOString(),
            }
          : n,
      ),
    });
  },
  enviarOfertaTransferencia: (negId) => {
    const s = get();
    if (!s.financas || !s.clubeRealId) return;
    const neg = s.negociacoesTransferencia.find((n) => n.id === negId);
    if (!neg) return;
    const jogador = s.jogadoresReais.find((j) => j.id === neg.jogadorId);
    if (!jogador) return;

    const fecharCompraComSucesso = (
      proxNeg: NegociacaoTransferencia,
      proxJogadores: Jogador[],
      financasPos: FinancasClube,
      titulo: string,
      texto: string,
    ) => {
      const noticia: NoticiaCarreira = {
        id: `n_tr_${Date.now()}`,
        data: new Date().toISOString(),
        titulo,
        texto,
      };
      set({
        jogadoresReais: proxJogadores,
        financas: financasPos,
        negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
          n.id === negId ? { ...proxNeg, status: 'concluida' as const } : n,
        ),
        noticias: deduplicarNoticias([noticia, ...s.noticias]),
        avisoSalvo: 'Transferência concluída',
      });
      void persistirJogadoresDexie(proxJogadores).catch(console.error);
    };

    const iniciarPipelineVenda = (base: NegociacaoTransferencia, jog: Jogador) => {
      const iniciada = iniciarFaseNegociacaoJogador(
        {
          ...base,
          tendenciaAceitarSaida:
            base.tendenciaAceitarSaida ??
            tendenciaJogadorAceitarSaida(jog, base.ofertaAtual.valorTransferencia),
        },
        jog.nome,
        Math.random,
        jog,
      );
      set({
        negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
          n.id === negId ? iniciada : n,
        ),
        avisoSalvo: `Negociação com ${jog.nome}: ${iniciada.diasRestantesFase} dia(s) — depois exames e assinatura.`,
      });
    };

    if (neg.tipo === 'compra') {
      const rodada = neg.rodadaNegociacao ?? 1;
      const resultado = avaliarOfertaCompra(
        jogador,
        neg.ofertaAtual,
        s.financas,
        s.timesReais,
        s.brasileirao,
        s.clubeRealId,
        rodada,
      );
      if (resultado.status === 'aceita') {
        const fechamento = concluirCompraMercado(s.jogadoresReais, neg, s.financas);
        if (fechamento.erro) {
          set({
            negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
              n.id === negId
                ? { ...n, status: 'recusada', mensagem: fechamento.erro!, atualizadoEm: new Date().toISOString() }
                : n,
            ),
          });
          return;
        }
        const nomeVendedor = s.timesReais.find((t) => t.id === neg.timeVendedorId)?.nome;
        const clubeNome = s.timesReais.find((t) => t.id === s.clubeRealId)?.nome ?? 'Clube';
        const festa = noticiasClimaTorcedor(
          s.mundoClube?.climaTorcedor ?? { indice: 62, sequenciaRuim: 0, sequenciaBoa: 0 },
          clubeNome,
          jogador.nome,
        );
        set((st) => ({
          noticias: deduplicarNoticias([...festa, ...st.noticias]),
        }));
        fecharCompraComSucesso(
          { ...neg, status: 'aceita', mensagem: resultado.mensagem },
          fechamento.jogadores,
          fechamento.financas,
          neg.ofertaAtual.isPreContrato ? 'Pré-contrato assinado' : 'Contratação fechada',
          resumoContratacaoCompra(jogador, neg, nomeVendedor),
        );
        return;
      }
      set({
        negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
          n.id === negId
            ? {
                ...n,
                status: resultado.status,
                mensagem: resultado.mensagem,
                contraOfertaClube: resultado.contraOfertaClube,
                contraOfertaJogador: resultado.contraOfertaJogador,
                rodadaNegociacao:
                  resultado.status === 'contra_proposta' && resultado.contraOfertaJogador
                    ? rodada + 1
                    : n.rodadaNegociacao ?? 1,
                atualizadoEm: new Date().toISOString(),
              }
            : n,
        ),
      });
      return;
    }

    const valorMinimoPedido = neg.ofertaAtual.valorTransferencia;
    const refazerBusca = neg.status === 'contra_proposta' || !neg.timeCompradorId;
    let compradorId = refazerBusca ? '' : neg.timeCompradorId;
    let ofertaComprador = refazerBusca ? null : neg.contraOfertaClube;
    if (!compradorId || !ofertaComprador) {
      const interesse = gerarOfertaCompraCpu(
        jogador,
        s.timesReais,
        s.clubeRealId,
        valorMinimoPedido,
      );
      if (!interesse) {
        set({
          negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
            n.id === negId
              ? {
                  ...n,
                  status: 'recusada',
                  mensagem: 'Nenhum clube demonstrou interesse neste valor.',
                  atualizadoEm: new Date().toISOString(),
                }
              : n,
          ),
        });
        return;
      }
      compradorId = interesse.timeId;
      ofertaComprador = interesse.oferta;
    }
    const negAtualizada: NegociacaoTransferencia = {
      ...neg,
      timeCompradorId: compradorId,
      contraOfertaClube: ofertaComprador,
    };
    const resultado = avaliarRespostaVenda(jogador, valorMinimoPedido, ofertaComprador);
    if (resultado.status === 'aceita') {
      if (neg.origemSondagemId) {
        set({
          negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
            n.id === negId
              ? {
                  ...negAtualizada,
                  ofertaAtual: ofertaComprador,
                  contraOfertaClube: ofertaComprador,
                  status: 'aguardando_jogador' as const,
                  faseNegociacao: 'jogador' as const,
                  mensagem: `Acordo entre clubes. ${jogador.nome} precisa aceitar a proposta pessoal.`,
                  tendenciaAceitarSaida:
                    neg.tendenciaAceitarSaida ??
                    tendenciaJogadorAceitarSaida(jogador, ofertaComprador.valorTransferencia),
                }
              : n,
          ),
          avisoSalvo: 'Apresente a proposta ao jogador na aba Negociações.',
        });
        return;
      }
      iniciarPipelineVenda(
        {
          ...negAtualizada,
          ofertaAtual: ofertaComprador,
          contraOfertaClube: ofertaComprador,
          mensagem: resultado.mensagem,
        },
        jogador,
      );
      return;
    }
    set({
      negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
        n.id === negId
          ? {
              ...negAtualizada,
              status: resultado.status,
              mensagem: resultado.mensagem,
              contraOfertaClube: resultado.contraOfertaClube ?? ofertaComprador,
              contraOfertaJogador: resultado.contraOfertaJogador,
              atualizadoEm: new Date().toISOString(),
            }
          : n,
      ),
    });
  },
  aceitarContraproposta: (negId) => {
    const s = get();
    if (!s.financas) return;
    const neg = s.negociacoesTransferencia.find((n) => n.id === negId);
    if (!neg || neg.status !== 'contra_proposta') return;

    if (neg.tipo === 'venda' && neg.contraOfertaClube) {
      const jogador = s.jogadoresReais.find((j) => j.id === neg.jogadorId);
      if (!jogador) return;
      const iniciada = iniciarFaseNegociacaoJogador(
        {
          ...neg,
          ofertaAtual: neg.contraOfertaClube,
          contraOfertaClube: neg.contraOfertaClube,
          tendenciaAceitarSaida:
            neg.tendenciaAceitarSaida ??
            tendenciaJogadorAceitarSaida(jogador, neg.contraOfertaClube.valorTransferencia),
        },
        jogador.nome,
        Math.random,
        jogador,
      );
      set({
        negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
          n.id === negId ? iniciada : n,
        ),
        avisoSalvo: `Contra-proposta aceita — ${jogador.nome} avalia em ${iniciada.diasRestantesFase} dia(s).`,
      });
      return;
    }

    const oferta: OfertaTransferencia = {
      ...neg.ofertaAtual,
      valorTransferencia:
        neg.contraOfertaClube?.valorTransferencia ?? neg.ofertaAtual.valorTransferencia,
      percentualDireitos:
        neg.contraOfertaClube?.percentualDireitos ?? neg.ofertaAtual.percentualDireitos,
      salarioCltMensal:
        neg.contraOfertaJogador?.salarioCltMensal ?? neg.ofertaAtual.salarioCltMensal,
      direitoImagemMensal:
        neg.contraOfertaJogador?.direitoImagemMensal ?? neg.ofertaAtual.direitoImagemMensal,
      luvas: neg.contraOfertaJogador?.luvas ?? neg.ofertaAtual.luvas,
      duracaoMeses: neg.contraOfertaJogador?.duracaoMeses ?? neg.ofertaAtual.duracaoMeses,
    };
    set({
      negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
        n.id === negId
          ? {
              ...n,
              ofertaAtual: oferta,
              contraOfertaClube: null,
              contraOfertaJogador: null,
              status: 'rascunho',
              mensagem: 'Termos da contra-proposta aplicados. Envie novamente para fechar.',
              atualizadoEm: new Date().toISOString(),
            }
          : n,
      ),
    });
    get().enviarOfertaTransferencia(negId);
  },
  cancelarNegociacao: (negId) => {
    set({
      negociacoesTransferencia: get().negociacoesTransferencia.filter((n) => n.id !== negId),
    });
  },
  definirPoliticaIngressos: (politica) => {
    const s = get();
    if (s.modoSub23) {
      set({ avisoSalvo: 'Finanças do Sub-23 são somente leitura.' });
      return;
    }
    if (!s.comercial) return;
    const comercial = { ...s.comercial, politicaIngressosPadrao: politica };
    set({ comercial });
    void persistirComercialDexie(comercial).catch(console.error);
  },
  aceitarPropostaTvComercial: (propostaId) => {
    const s = get();
    if (!s.comercial || !s.financas) return;
    const ano = s.brasileirao?.temporadaAno ?? 2026;
    const res = aceitarPropostaTv(s.comercial, propostaId, ano);
    if (!res) return;
    const pos =
      s.brasileirao && s.clubeRealId ? posicaoDoTime(s.brasileirao.tabela, s.clubeRealId) : 10;
    const financas =
      res.modo === 'IMEDIATO' ?
        sincronizarFinancasComercial(s.financas, res.estado, pos)
      : s.financas;
    set({
      comercial: res.estado,
      financas,
      noticias: deduplicarNoticias([
        {
          id: `n_tv_${Date.now()}`,
          data: new Date().toISOString(),
          titulo: res.modo === 'AGENDADO' ? 'Renovação de TV acordada' : 'Contrato de TV fechado',
          texto:
            res.modo === 'AGENDADO' ?
              'O pacote escolhido entra em vigor assim que o contrato atual terminar.'
            : `Cota mensal atualizada (${res.cotaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/mês).`,
        },
        ...s.noticias,
      ]),
    });
    void persistirComercialDexie(res.estado).catch(console.error);
  },
  recusarPropostaTvComercial: (propostaId) => {
    const s = get();
    if (!s.comercial) return;
    const comercial = {
      ...s.comercial,
      propostasTvPendentes: s.comercial.propostasTvPendentes.filter((p) => p.id !== propostaId),
    };
    set({ comercial });
    void persistirComercialDexie(comercial).catch(console.error);
  },
  aceitarPropostaPatrocinioComercial: (propostaId) => {
    const s = get();
    if (!s.comercial || !s.financas) return;
    const res = aceitarPropostaPatrocinio(
      s.comercial,
      propostaId,
      s.comercial.indicadores.estabilidade_gestao,
    );
    if (!res) return;
    const rodada = s.brasileirao?.rodadaAtual ?? 1;
    const mes = mesDaRodada(rodada);
    let financas = s.financas;
    if (res.luvas > 0) {
      const lanc: LancamentoContabil = {
        time_id: financas.time_id,
        rodada,
        mes,
        tipo: 'RECEITA',
        categoria: 'PATROCINIO',
        descricao: 'Luvas de assinatura — patrocínio',
        valor: res.luvas,
      };
      financas = {
        ...financas,
        saldo_caixa: financas.saldo_caixa + res.luvas,
        lancamentos: [lanc, ...financas.lancamentos].slice(0, 120),
      };
    }
    const pos =
      s.brasileirao && s.clubeRealId ? posicaoDoTime(s.brasileirao.tabela, s.clubeRealId) : 10;
    financas =
      res.modo === 'IMEDIATO' ? sincronizarFinancasComercial(financas, res.estado, pos) : financas;
    set({
      comercial: res.estado,
      financas,
      noticias: deduplicarNoticias([
        {
          id: `n_pat_${Date.now()}`,
          data: new Date().toISOString(),
          titulo: res.modo === 'AGENDADO' ? 'Renovação de patrocínio acordada' : 'Patrocínio assinado',
          texto:
            res.modo === 'AGENDADO' ?
              'Contrato agendado: início automático ao encerrar o vigente neste slot.'
            : res.luvas > 0 ?
              'Luvas creditadas no caixa; repasse mensal somado ao fechamento contábil.'
            : 'Novo patrocínio ativo no fechamento mensal.',
        },
        ...s.noticias,
      ]),
    });
    void persistirComercialDexie(res.estado).catch(console.error);
  },
  definirInvestimentoBase: (nivel) => {
    const s = get();
    if (!s.mundoClube) return;
    set({ mundoClube: aplicarInvestimentoBase(s.mundoClube, nivel) });
  },
  definirFocoBase: (foco) => {
    const s = get();
    if (!s.mundoClube) return;
    set({ mundoClube: aplicarFocoBase(s.mundoClube, foco) });
  },
  promoverJovemDaBase: (jovemId) => {
    const s = get();
    if (!s.mundoClube || !s.clubeRealId) return;
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    if (!clube) return;
    const rodada = s.brasileirao?.rodadaAtual ?? 1;
    const r = promoverJovemPorId({
      jovemId,
      jogadores: s.jogadoresReais,
      mundo: s.mundoClube,
      time: clube,
      rodada,
      seed: Date.now() ^ jovemId,
    });
    set({
      jogadoresReais: r.jogadores,
      mundoClube: r.mundo,
      noticias: [...r.noticias, ...s.noticias].slice(0, 80),
    });
    void persistirJogadoresDexie(r.jogadores).catch(console.error);
  },
  promoverSub23: (atletaId) => {
    const s = get();
    if (!s.clubeRealId || !s.aspirantesS23) return 'Sub-23 indisponível.';
    const r = promoverSub23ParaPro({
      atletaId,
      clubeId: s.clubeRealId,
      jogadores: s.jogadoresReais,
      aspirantes: s.aspirantesS23,
      mundo: s.mundoClube,
      rodada: s.brasileirao?.rodadaAtual ?? 1,
      seed: Date.now() ^ atletaId,
    });
    if (!r.ok) return r.motivo ?? 'Não foi possível promover.';
    set({
      jogadoresReais: r.jogadores,
      aspirantesS23: r.aspirantes,
      noticias: [...r.noticias, ...s.noticias].slice(0, 80),
    });
    void persistirJogadoresDexie(r.jogadores).catch(console.error);
    return null;
  },
  simularOfertaDispensa: (jogadorId) => {
    const s = get();
    const j = s.jogadoresReais.find((x) => x.id === jogadorId && x.time_id === s.clubeRealId);
    if (!j) return null;
    return montarOfertaDispensa(j);
  },
  tentarDispensa: (jogadorId) => {
    const s = get();
    if (!s.clubeRealId || !s.financas) return 'Finanças indisponíveis.';
    const rodada = s.brasileirao?.rodadaAtual ?? 1;
    const r = tentarDispensaProfissional({
      jogadorId,
      jogadores: s.jogadoresReais,
      clubeId: s.clubeRealId,
      financas: s.financas,
      rodada,
      mes: mesDaRodada(rodada),
      seed: Date.now() ^ jogadorId,
    });
    if (!r.resultado.ok) {
      set({ noticias: [...r.noticias, ...s.noticias].slice(0, 80) });
      return r.resultado.motivo;
    }
    set({
      jogadoresReais: r.jogadores,
      financas: r.financas,
      noticias: [...r.noticias, ...s.noticias].slice(0, 80),
    });
    void persistirJogadoresDexie(r.jogadores).catch(console.error);
    return null;
  },
  confirmarDispensaIntegral: (jogadorId) => {
    const s = get();
    if (!s.clubeRealId || !s.financas) return 'Finanças indisponíveis.';
    const rodada = s.brasileirao?.rodadaAtual ?? 1;
    const r = tentarDispensaProfissional({
      jogadorId,
      jogadores: s.jogadoresReais,
      clubeId: s.clubeRealId,
      financas: s.financas,
      rodada,
      mes: mesDaRodada(rodada),
      seed: Date.now() ^ jogadorId ^ 0x99,
      forcarIntegral: true,
    });
    if (!r.resultado.ok) return r.resultado.motivo;
    set({
      jogadoresReais: r.jogadores,
      financas: r.financas,
      noticias: [...r.noticias, ...s.noticias].slice(0, 80),
    });
    void persistirJogadoresDexie(r.jogadores).catch(console.error);
    return null;
  },
  atualizarProgramacaoTreino: (patch) => {
    const s = get();
    if (!s.mundoClube || !s.clubeRealId || !s.mundoClube.programacaoTreino) return;
    const programacaoTreino = { ...s.mundoClube.programacaoTreino, ...patch };
    set({
      mundoClube: {
        ...s.mundoClube,
        programacaoTreino,
      },
    });
    void persistirTreinosDexie(
      s.clubeRealId,
      programacaoTreino,
      s.mundoClube.estadosTreino ?? [],
    ).catch(console.error);
  },
  definirPlanoIndividualTreino: (jogadorId, plano) => {
    const s = get();
    if (!s.mundoClube || !s.clubeRealId) return;
    const estados = garantirEstadosTreino(
      s.jogadoresReais,
      s.clubeRealId,
      s.mundoClube.estadosTreino,
    ).map((e) => (e.jogador_id === jogadorId ? { ...e, plano_individual_id: plano } : e));
    set({
      mundoClube: { ...s.mundoClube, estadosTreino: estados },
    });
    if (s.mundoClube.programacaoTreino) {
      void persistirTreinosDexie(
        s.clubeRealId,
        s.mundoClube.programacaoTreino,
        estados,
      ).catch(console.error);
    }
  },
  restaurarTreinoPadrao: () => {
    const s = get();
    if (!s.mundoClube || !s.clubeRealId) return;
    const formacaoId = formacaoIdDeEsquema(s.esquemaAtual);
    const programacaoTreino = criarProgramacaoTreino(s.clubeRealId, formacaoId);
    const estadosTreino = garantirEstadosTreino(
      s.jogadoresReais,
      s.clubeRealId,
      undefined,
    );
    set({
      mundoClube: { ...s.mundoClube, programacaoTreino, estadosTreino },
      avisoSalvo: 'Treino padrão restaurado (Equilibrado).',
    });
    void persistirTreinosDexie(s.clubeRealId, programacaoTreino, estadosTreino).catch(
      console.error,
    );
  },
  garantirTreinoPadraoRodada: () => {
    const s = get();
    if (!s.clubeRealId || !s.mundoClube || !s.brasileirao || !s.dbTreinos) return;
    const rodada = s.brasileirao.rodadaAtual;
    if (s.mundoClube.ultimoTreino?.rodadaAplicada === rodada) return;
    if (!s.mundoClube.programacaoTreino) {
      const formacaoId = formacaoIdDeEsquema(s.esquemaAtual);
      set({
        mundoClube: {
          ...s.mundoClube,
          programacaoTreino: criarProgramacaoTreino(s.clubeRealId, formacaoId),
        },
      });
    }
    get().aplicarTreinoSemana();
  },
  aplicarTreinoSemana: () => {
    const s = get();
    if (s.modoSub23) return 'Treinos do Sub-23 são geridos pela IA — somente visualização.';
    if (!s.clubeRealId || !s.mundoClube || !s.brasileirao || !s.dbTreinos) {
      return 'Disponível apenas na carreira profissional.';
    }
    const rodada = s.brasileirao.rodadaAtual;
    if (s.mundoClube.ultimoTreino?.rodadaAplicada === rodada) {
      return 'Você já treinou nesta rodada.';
    }
    const formacaoId = formacaoIdDeEsquema(s.esquemaAtual);
    let programacao =
      s.mundoClube.programacaoTreino ?? criarProgramacaoTreino(s.clubeRealId, formacaoId);
    const estados = garantirEstadosTreino(
      s.jogadoresReais,
      s.clubeRealId,
      s.mundoClube.estadosTreino,
    );
    const mesAtual = Number.parseInt(s.brasileirao.dataAtualISO.slice(5, 7), 10);
    const viradaMes =
      s.mundoClube.mesUltimoTreino != null && s.mundoClube.mesUltimoTreino !== mesAtual;
    const resultado = processarSemanaTreinos({
      dbTreinos: s.dbTreinos,
      jogadores: s.jogadoresReais,
      estadosTreino: estados,
      programacao,
      formacaoAtivaId: formacaoId,
      corpoTecnico: corpoTecnicoDeMundo(s.mundoClube),
      clubeId: s.clubeRealId,
      isViradaDeMes: viradaMes,
      mesAtual: Number.isFinite(mesAtual) ? mesAtual : 6,
    });
    const noticia: NoticiaCarreira = {
      id: `treino_r${rodada}_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: 'Semana de treinos',
      texto: resultado.resumo,
    };
    const evolTexto =
      resultado.evolucoes.length > 0
        ? ` Destaques: ${resultado.evolucoes
            .filter((e) => e.tipo === 'EVOLUCAO')
            .slice(0, 3)
            .map((e) => `${e.jogadorNome} +${e.atributoAlterado}`)
            .join(', ')}.`
        : '';
    if (evolTexto) noticia.texto += evolTexto;

    set({
      jogadoresReais: resultado.jogadoresAtualizados,
      mundoClube: {
        ...s.mundoClube,
        programacaoTreino: resultado.programacaoAtualizada,
        estadosTreino: resultado.estadosTreinoAtualizados,
        bonusTreinoProximoJogo: resultado.bonusProximoJogo,
        multiplicadorExecucaoTaticaTreino: resultado.multiplicadorExecucaoTatica,
        treinoBonusRodada: rodada,
        mesUltimoTreino: mesAtual,
        ultimoTreino: { rodadaAplicada: rodada, microciclo: 'tatico', destaques: [] },
      },
      noticias: deduplicarNoticias([noticia, ...s.noticias]),
    });
    void persistirJogadoresDexie(resultado.jogadoresAtualizados).catch(console.error);
    void persistirTreinosDexie(
      s.clubeRealId,
      resultado.programacaoAtualizada,
      resultado.estadosTreinoAtualizados,
    ).catch(console.error);
    return null;
  },
  recusarPropostaPatrocinioComercial: (propostaId) => {
    const s = get();
    if (!s.comercial) return;
    const comercial = {
      ...s.comercial,
      propostasPatrocinioPendentes: s.comercial.propostasPatrocinioPendentes.filter(
        (p) => p.id !== propostaId,
      ),
    };
    set({ comercial });
    void persistirComercialDexie(comercial).catch(console.error);
  },
  excluirCarreiraSalva: (id) => {
    if (!excluirSlot(id)) return false;
    const s = get();
    if (s.saveSlotId === id) {
      set({
        ...estadoInicial(),
        campeonato: s.campeonato,
        jogadoresReais: s.jogadoresReais,
        timesReais: s.timesReais,
        dbTaticas: s.dbTaticas ?? tryGetDatabaseTaticas(),
        dbTreinos: s.dbTreinos,
        dbPronto: s.dbPronto,
        tela: 'configuracoes',
      });
    }
    return true;
  },
  limparAvisoSalvo: () => set({ avisoSalvo: null }),
  resetar: () => {
    const prev = get();
    set({
      ...estadoInicial(),
      campeonato: prev.campeonato,
      jogadoresReais: prev.jogadoresReais,
      timesReais: prev.timesReais,
      dbTaticas: prev.dbTaticas ?? tryGetDatabaseTaticas(),
      dbTreinos: prev.dbTreinos,
      dbPronto: prev.dbPronto,
    });
  },
}));