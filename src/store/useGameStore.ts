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
import {
  aplicarBalanceamentoNaTemporada,
  avancarDias,
  diasAteProximoJogo,
  ehDiaDeJogo,
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
  gerarTimesFicticios,
  montarCalendarioUsuario,
} from '../career/fictionalLeague';
import { deduplicarNoticias } from '../career/noticias';
import {
  aplicarFocoBase,
  aplicarInvestimentoBase,
  criarEstadoMundoClube,
  investimentoBaseMensal,
  normalizarEstadoMundoClube,
  noticiasClimaTorcedor,
  tickMundoPorDia,
  tickMundoPosRodada,
} from '../career/mundoParalelo';
import type { FocoCategoriaBase, NivelInvestimentoBase } from '../types/mundoClube';
import {
  carregarSlot,
  excluirSlot,
  gravarSlot,
  listarSaves,
  type SaveSlotMeta,
} from '../career/saveSlots';
import type { MatchSimResult } from '../engine/matchEngine';
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
  dbPronto: boolean;
  partidaJogoId: number | null;
  avisoSalvo: string | null;
  jogadorPerfilId: number | null;
  saveSlotId: string | null;
  setDatabase: (p: {
    campeonato: CampeonatoConfig;
    times: Time[];
    jogadores: Jogador[];
  }) => void;
  irPara: (tela: TelaJogo) => void;
  iniciarNovoJogo: () => void;
  salvarPerfil: (perfil: PerfilTecnico) => void;
  sortearTimesFicticios: () => void;
  escolherTimeFicticio: (id: string) => void;
  commitEscolhaTatica: (p: {
    esquema: EsquemaTatico;
    alinhamento11: number[];
    gradeTatica11: { col: number; row: number; gol?: boolean }[] | null;
    personalizado: boolean;
  }) => void;
  esquemaDoUsuario: () => EsquemaTatico;
  salvarEscolhaProposta: (timeId: string) => void;
  assumirClubeContratado: (timeId?: string) => boolean;
  sairParaMenu: () => void;
  abrirPerfilJogador: (id: number) => void;
  fecharPerfilJogador: () => void;
  registrarResultadoPartida: (jogoId: number, result: MatchSimResult) => void;
  encerrarTransmissao: () => void;
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
}

const estadoInicial = (): EstadoCarreira & {
  campeonato: CampeonatoConfig | null;
  jogadoresReais: Jogador[];
  dbPronto: boolean;
  partidaJogoId: number | null;
  avisoSalvo: string | null;
  jogadorPerfilId: number | null;
  saveSlotId: string | null;
} => ({
  campeonato: null,
  jogadoresReais: [],
  dbPronto: false,
  partidaJogoId: null,
  partidaJogoEmCurso: null,
  avisoSalvo: null,
  jogadorPerfilId: null,
  saveSlotId: null,
  perfil: null,
  timesFicticios: [],
  timeUsuarioId: null,
  esquemaAtual: '4-4-2',
  alinhamento11: null,
  usoTaticaPersonalizada: false,
  gradeTatica11: null,
  jogos: [],
  desempenho: desempenhoZerado(),
  propostas: [],
  torneioConcluido: false,
  timesReais: [],
  partidaAtual: null,
  clubeRealId: null,
  propostaSelecionadaId: null,
  noticias: [],
  tela: 'menu',
  brasileirao: null,
  partidaRetornoTatica: false,
  transmissaoCheckpoint: null,
  pendingResumePartida: false,
  financas: null,
  comercial: null,
  mundoClube: null,
  negociacoesTransferencia: [],
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...estadoInicial(),
  setDatabase: ({ campeonato, times, jogadores }) =>
    set({
      campeonato,
      timesReais: times,
      jogadoresReais: enriquecerElenco(jogadores),
      dbPronto: true,
    }),
  irPara: (tela) => {
    const profissional = !!get().clubeRealId;
    if (
      (tela === 'escritorio' ||
        tela === 'noticias' ||
        tela === 'transferencias' ||
        tela === 'financas' ||
        tela === 'staff' ||
        tela === 'base' ||
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
      const proxLiga =
        s.clubeRealId && s.brasileirao
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
      const proxLiga =
        s.clubeRealId && s.brasileirao
          ? proximaPartidaUsuario(s.brasileirao, s.clubeRealId)
          : null;
      if (proxLiga && s.clubeRealId && ehDiaDeJogo(s.brasileirao!, s.clubeRealId)) {
        set({
          tela,
          partidaAtual: null,
          partidaJogoId: null,
          partidaJogoEmCurso: proxLiga.id,
        });
        return;
      }
      const prox = s.jogos.find((j) => j.ehDoUsuario && !j.finalizado);
      if (!prox) {
        set({
          tela: s.clubeRealId ? 'escritorio' : 'hub_torneio',
          partidaJogoEmCurso: null,
        });
        return;
      }
      set({
        tela,
        partidaAtual: null,
        partidaJogoId: null,
        partidaJogoEmCurso: prox.id,
      });
      return;
    }
    set({
      tela,
      partidaJogoEmCurso: null,
      jogadorPerfilId: tela === 'perfil_jogador' ? get().jogadorPerfilId : null,
    });
  },
  iniciarNovoJogo: () =>
    set({
      ...estadoInicial(),
      campeonato: get().campeonato,
      jogadoresReais: get().jogadoresReais,
      timesReais: get().timesReais,
      dbPronto: true,
      tela: 'criar_tecnico',
    }),
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
      tela: 'hub_torneio',
    });
  },
  commitEscolhaTatica: ({ esquema, alinhamento11, gradeTatica11, personalizado }) =>
    set({
      esquemaAtual: esquema,
      alinhamento11,
      gradeTatica11: personalizado ? gradeTatica11 : null,
      usoTaticaPersonalizada: personalizado,
      avisoSalvo: 'Tática salva para os próximos jogos',
    }),
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
    const mundoClube = criarEstadoMundoClube(clube);
    let financas = inicializarFinancasClube(clube, elencoClube);
    financas = sincronizarFinancasComercial(financas, comercial, 10);
    set({
      propostaSelecionadaId: id,
      clubeRealId: id,
      esquemaAtual: esquema,
      brasileirao,
      partidaRetornoTatica: false,
      noticias: deduplicarNoticias([noticiaCalendario, ...(jaExiste ? s.noticias : noticias)]),
      financas,
      comercial,
      mundoClube,
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
  avancarUmDia: () => {
    const s = get();
    if (!s.brasileirao || !s.clubeRealId) return;
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    const { estado, noticias } = avancarDias(s.brasileirao, 1, clube?.nome ?? 'Clube');
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
      });
      jogadores = tick.jogadores;
      mundo = tick.mundo;
      extras = tick.noticias;
    }
    set({
      brasileirao: estado,
      jogadoresReais: jogadores,
      mundoClube: mundo,
      noticias: deduplicarNoticias([...noticias, ...extras, ...s.noticias]),
    });
    if (extras.length) void persistirJogadoresDexie(jogadores).catch(console.error);
  },
  avancarAteDiaDeJogo: () => {
    const s = get();
    if (!s.brasileirao || !s.clubeRealId) return;
    const clube = s.timesReais.find((t) => t.id === s.clubeRealId);
    const dias = diasAteProximoJogo(s.brasileirao, s.clubeRealId);
    let estado = s.brasileirao;
    let jogadores = s.jogadoresReais;
    let mundo = s.mundoClube;
    const blocos: NoticiaCarreira[] = [];
    for (let d = 0; d < dias; d++) {
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
        });
        jogadores = tick.jogadores;
        mundo = tick.mundo;
        blocos.push(...tick.noticias);
      }
    }
    set({
      brasileirao: estado,
      jogadoresReais: jogadores,
      mundoClube: mundo,
      noticias: deduplicarNoticias([...blocos, ...s.noticias]),
    });
    if (dias > 0) void persistirJogadoresDexie(jogadores).catch(console.error);
  },
  registrarResultadoBrasileirao: (partidaId, result) => {
    const s = get();
    if (!s.brasileirao || !s.campeonato || !s.clubeRealId) return;
    let jogadores = aplicarFadigaPosPartida(s.jogadoresReais, result.energiaFinal);
    let estado = registrarPlacarPartida(
      s.brasileirao,
      partidaId,
      result.golsMandante,
      result.golsVisitante,
      s.campeonato,
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
      });
      jogadores = tickRodada.jogadores;
      mundoClube = tickRodada.mundo;
      noticiasMundo.push(...tickRodada.noticias);
    }
    const noticiaRodada = {
      id: `rod_${partida?.rodada ?? 0}_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: `Rodada ${partida?.rodada ?? '—'} encerrada`,
      texto: `${clube?.nome ?? 'Seu time'} soma após a rodada. Posição na tabela: ${pos}º lugar.`,
    };
    set({
      brasileirao: estado,
      jogadoresReais: jogadores,
      financas,
      comercial,
      mundoClube,
      partidaAtual: result,
      partidaJogoId: partidaId,
      tela: 'partida',
      noticias: deduplicarNoticias([noticiaRodada, ...noticiasMundo, ...s.noticias]),
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
      partidaJogoEmCurso: null,
      partidaAtual: null,
      partidaJogoId: null,
      jogadorPerfilId: null,
    }),
  abrirPerfilJogador: (id) => set({ jogadorPerfilId: id, tela: 'perfil_jogador' }),
  fecharPerfilJogador: () => set({ jogadorPerfilId: null, tela: 'elenco' }),
  registrarResultadoPartida: (jogoId, result) => {
    const jogos = get().jogos.map((j) =>
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
    const desempenho = calcularDesempenho(jogos, get().timeUsuarioId!);
    set({
      jogos,
      desempenho,
      partidaAtual: result,
      partidaJogoId: jogoId,
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
  finalizarTorneioSePronto: () => {
    const { jogos, timesReais, desempenho } = get();
    const usuarioPronto = jogos.filter((j) => j.ehDoUsuario).every((j) => j.finalizado);
    if (!usuarioPronto) return;
    const propostas = gerarPropostas(desempenho, timesReais);
    set({ torneioConcluido: true, propostas, tela: 'propostas' });
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
      usoTaticaPersonalizada: s.usoTaticaPersonalizada,
      gradeTatica11: s.gradeTatica11,
      jogos: s.jogos,
      desempenho: s.desempenho,
      propostas: s.propostas,
      torneioConcluido: s.torneioConcluido,
      timesReais: s.timesReais,
      partidaAtual: null,
      partidaJogoEmCurso: null,
      clubeRealId: s.clubeRealId,
      propostaSelecionadaId: s.propostaSelecionadaId,
      noticias: s.noticias,
      brasileirao: s.brasileirao,
      partidaRetornoTatica: s.partidaRetornoTatica,
      financas: s.financas,
      comercial: s.comercial,
      mundoClube: s.mundoClube,
      negociacoesTransferencia: s.negociacoesTransferencia,
      elencoPersistido: s.jogadoresReais,
      transmissaoCheckpoint: s.transmissaoCheckpoint,
      pendingResumePartida: s.pendingResumePartida,
      tela:
        s.tela === 'partida'
          ? s.clubeRealId
            ? 'escritorio'
            : 'hub_torneio'
          : s.tela,
    };
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
    const clubeSave = timesReais.find((t) => t.id === data.clubeRealId);
    const jogadoresCarregados = enriquecerElenco(
      data.elencoPersistido && data.elencoPersistido.length > 0
        ? aplicarSnapshotJogadores(get().jogadoresReais, data.elencoPersistido)
        : get().jogadoresReais,
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
    }
    set({
      saveSlotId: id,
      perfil: data.perfil ?? null,
      timeUsuarioId: data.timeUsuarioId ?? null,
      esquemaAtual: data.esquemaAtual ?? data.perfil?.esquemaPreferido ?? '4-4-2',
      alinhamento11: data.alinhamento11 ?? null,
      usoTaticaPersonalizada: data.usoTaticaPersonalizada ?? false,
      gradeTatica11: data.gradeTatica11 ?? null,
      timesFicticios: data.timesFicticios ?? [],
      jogos: data.jogos ?? [],
      desempenho: data.desempenho ?? desempenhoZerado(),
      torneioConcluido: data.torneioConcluido ?? false,
      propostas: data.propostas ?? [],
      clubeRealId: data.clubeRealId ?? null,
      propostaSelecionadaId: data.propostaSelecionadaId ?? null,
      noticias: deduplicarNoticias(data.noticias ?? []),
      brasileirao,
      partidaRetornoTatica: data.partidaRetornoTatica ?? false,
      financas,
      comercial,
      mundoClube,
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

    const fecharComSucesso = (
      proxNeg: NegociacaoTransferencia,
      proxJogadores: Jogador[],
      financasPos: FinancasClube,
      titulo: string,
      texto: string,
    ) => {
      const alinhamento =
        proxNeg.tipo === 'venda' && s.alinhamento11
          ? s.alinhamento11.map((jid) => (jid === proxNeg.jogadorId ? 0 : jid))
          : s.alinhamento11;
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
        alinhamento11: alinhamento,
        noticias: deduplicarNoticias([noticia, ...s.noticias]),
        avisoSalvo: 'Transferência concluída',
      });
      void persistirJogadoresDexie(proxJogadores).catch(console.error);
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
        fecharComSucesso(
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
      const negFechamento: NegociacaoTransferencia = {
        ...negAtualizada,
        ofertaAtual: ofertaComprador,
      };
      const fechamento = concluirVenda(s.jogadoresReais, negFechamento, s.financas);
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
      const timeNome =
        s.timesReais.find((t) => t.id === compradorId)?.nome ?? 'outro clube';
      fecharComSucesso(
        { ...negFechamento, status: 'aceita', mensagem: resultado.mensagem },
        fechamento.jogadores,
        fechamento.financas,
        'Venda confirmada',
        `${jogador.nome} foi vendido ao ${timeNome}.`,
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
      const negFechamento: NegociacaoTransferencia = {
        ...neg,
        ofertaAtual: neg.contraOfertaClube,
      };
      const fechamento = concluirVenda(s.jogadoresReais, negFechamento, s.financas);
      if (fechamento.erro) return;
      const timeNome =
        s.timesReais.find((t) => t.id === neg.timeCompradorId)?.nome ?? 'outro clube';
      const alinhamento = s.alinhamento11
        ? s.alinhamento11.map((jid) => (jid === neg.jogadorId ? 0 : jid))
        : s.alinhamento11;
      set({
        jogadoresReais: fechamento.jogadores,
        financas: fechamento.financas,
        negociacoesTransferencia: s.negociacoesTransferencia.map((n) =>
          n.id === negId ? { ...n, status: 'concluida' as const } : n,
        ),
        alinhamento11: alinhamento,
        noticias: deduplicarNoticias([
          {
            id: `n_tr_${Date.now()}`,
            data: new Date().toISOString(),
            titulo: 'Venda confirmada',
            texto: `${jogador.nome} foi vendido ao ${timeNome}.`,
          },
          ...s.noticias,
        ]),
        avisoSalvo: 'Transferência concluída',
      });
      void persistirJogadoresDexie(fechamento.jogadores).catch(console.error);
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
        dbPronto: s.dbPronto,
        tela: 'configuracoes',
      });
    }
    return true;
  },
  limparAvisoSalvo: () => set({ avisoSalvo: null }),
  resetar: () =>
    set({
      ...estadoInicial(),
      campeonato: get().campeonato,
      jogadoresReais: get().jogadoresReais,
      timesReais: get().timesReais,
      dbPronto: true,
    }),
}));