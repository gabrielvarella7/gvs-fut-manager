import { escalacaoDeIds, idsEscalacaoPadrao } from './lineup';
import { posicaoDoTime, type EstadoTemporada, type PartidaCampeonato } from './brasileirao';
import { esquemaOuPadrao } from '../data/esquemasTaticos';
import type { MatchSimInput } from '../engine/matchEngine';
import type { ConfiguracaoTaticaClube, DatabaseTaticas } from '../types/tactics';
import { formacaoIdDeEsquema, taticaCpuAutomatica } from '../engine/tacticsEngine';
import { montarEscalacao } from '../engine/matchEngine';
import {
  calcularFatorMoral,
  montarContextoPartidaSync,
  type ContextoDinamicoPartida,
} from '../engine/matchContext';
import { previsaoPreJogo, type PreJogoInfo } from '../engine/matchStats';
import type { CampeonatoConfig, EsquemaTatico, Jogador, LinhaTabela, Time } from '../types/schema';
import type { ForcaSetores } from '../engine/matchEngine';

export interface JogadorPrevisto {
  id: number;
  nome: string;
  posicao: string;
  overall: number;
}

export interface ConfrontoDireto {
  rodada: number;
  dataISO: string;
  mandanteId: string;
  visitanteId: string;
  golsMandante: number;
  golsVisitante: number;
}

export interface ClimaPartida {
  tempC: number;
  descricao: string;
  ventoKmh: number;
  nuvensPercent: number;
  umidadePercent: number;
}

export interface UltimoJogoResumo {
  rodada: number;
  dataISO: string;
  adversarioNome: string;
  emCasa: boolean;
  golsPro: number;
  golsContra: number;
}

export interface RelatorioPreJogo {
  partida: PartidaCampeonato;
  competicao: string;
  mandante: Time;
  visitante: Time;
  estadio: string;
  usuarioTimeId: string | null;
  emCasa: boolean;
  preJogo: PreJogoInfo & { forcaSetores: { mandante: ForcaSetores; visitante: ForcaSetores } };
  posicaoMandante: number;
  posicaoVisitante: number;
  linhaMandante: LinhaTabela;
  linhaVisitante: LinhaTabela;
  formaMandante: string;
  formaVisitante: string;
  ultimosMandante: UltimoJogoResumo[];
  ultimosVisitante: UltimoJogoResumo[];
  confrontos: ConfrontoDireto[];
  clima: ClimaPartida;
  esquemaMandante: EsquemaTatico;
  esquemaVisitante: EsquemaTatico;
  escalacaoMandante: JogadorPrevisto[];
  escalacaoVisitante: JogadorPrevisto[];
  mediaOvrMandante: number;
  mediaOvrVisitante: number;
  contexto: ContextoDinamicoPartida;
  moralMandante: number;
  moralVisitante: number;
}

function linhaVazia(timeId: string): LinhaTabela {
  return {
    time_id: timeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gols_pro: 0,
    gols_contra: 0,
    saldo_gols: 0,
  };
}

function ultimosJogos(
  estado: EstadoTemporada,
  timeId: string,
  times: Time[],
  max = 5,
): UltimoJogoResumo[] {
  const jogos = estado.partidas
    .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, max);
  return jogos.map((p) => {
    const casa = p.mandanteId === timeId;
    const advId = casa ? p.visitanteId : p.mandanteId;
    const adv = times.find((t) => t.id === advId);
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    return {
      rodada: p.rodada,
      dataISO: p.dataISO,
      adversarioNome: adv?.nome ?? advId,
      emCasa: casa,
      golsPro: casa ? gm : gv,
      golsContra: casa ? gv : gm,
    };
  });
}

function elenco(timeId: string, jogadores: Jogador[]): Jogador[] {
  return jogadores.filter((j) => j.time_id === timeId);
}

function ultimaForma(estado: EstadoTemporada, timeId: string, max = 5): string {
  const jogos = estado.partidas
    .filter((p) => p.finalizado && (p.mandanteId === timeId || p.visitanteId === timeId))
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, max);
  const letras: string[] = [];
  for (const p of jogos) {
    const casa = p.mandanteId === timeId;
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    const gp = casa ? gm : gv;
    const gc = casa ? gv : gm;
    if (gp > gc) letras.push('V');
    else if (gp < gc) letras.push('D');
    else letras.push('E');
  }
  return letras.length ? letras.join(' · ') : '—';
}

function confrontosEntre(
  estado: EstadoTemporada,
  a: string,
  b: string,
): ConfrontoDireto[] {
  return estado.partidas
    .filter(
      (p) =>
        p.finalizado &&
        ((p.mandanteId === a && p.visitanteId === b) ||
          (p.mandanteId === b && p.visitanteId === a)),
    )
    .sort((x, y) => y.rodada - x.rodada)
    .map((p) => ({
      rodada: p.rodada,
      dataISO: p.dataISO,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      golsMandante: p.golsMandante ?? 0,
      golsVisitante: p.golsVisitante ?? 0,
    }));
}

function climaParaData(dataISO: string, cidade?: string): ClimaPartida {
  let h = 0;
  for (const c of `${dataISO}${cidade ?? ''}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tempC = 18 + (h % 14);
  const umidade = 55 + (h % 35);
  const nuvens = 20 + (h % 75);
  const vento = 8 + (h % 22);
  const descricoes = [
    'Céu limpo',
    'Parcialmente nublado',
    'Nublado',
    'Garoa leve',
    'Ensolarado',
    'Noite amena',
  ];
  return {
    tempC,
    descricao: descricoes[h % descricoes.length]!,
    ventoKmh: vento,
    nuvensPercent: nuvens,
    umidadePercent: umidade,
  };
}

function previstosDoElenco(
  timeId: string,
  jogadores: Jogador[],
  esquema: EsquemaTatico,
  alinhamento?: number[] | null,
  grade?: { col: number; row: number; gol?: boolean }[] | null,
): JogadorPrevisto[] {
  const eq = elenco(timeId, jogadores);
  const ids =
    alinhamento?.length === 11 && timeId
      ? alinhamento
      : idsEscalacaoPadrao(eq, esquema);
  const esc =
    alinhamento?.length === 11
      ? escalacaoDeIds(eq, esquema, ids, grade ?? null)
      : montarEscalacao(eq, esquema);
  return esc.map((e) => ({
    id: e.jogador.id,
    nome: e.jogador.nome,
    posicao: e.posicaoEscalada,
    overall: e.jogador.overall,
  }));
}

export function montarInputRelatorio(
  mandante: Time,
  visitante: Time,
  jogadores: Jogador[],
  esquemaMandante: EsquemaTatico,
  esquemaVisitante: EsquemaTatico,
  clubeUserId: string | null,
  alinhamento11: number[] | null,
  gradeTatica11: { col: number; row: number; gol?: boolean }[] | null,
  bonusMando: number,
  dbTaticas: DatabaseTaticas,
  configUsuario?: ConfiguracaoTaticaClube,
): MatchSimInput {
  const elM = elenco(mandante.id, jogadores);
  const elV = elenco(visitante.id, jogadores);
  const escM =
    clubeUserId === mandante.id && alinhamento11?.length === 11
      ? escalacaoDeIds(elM, esquemaMandante, alinhamento11, gradeTatica11)
      : undefined;
  const escV =
    clubeUserId === visitante.id && alinhamento11?.length === 11
      ? escalacaoDeIds(elV, esquemaVisitante, alinhamento11, gradeTatica11)
      : undefined;
  const taticaM =
    clubeUserId === mandante.id && configUsuario
      ? { ...configUsuario, formacao_id: formacaoIdDeEsquema(esquemaMandante) }
      : taticaCpuAutomatica(esquemaMandante, mandante.id);
  const taticaV =
    clubeUserId === visitante.id && configUsuario
      ? { ...configUsuario, formacao_id: formacaoIdDeEsquema(esquemaVisitante) }
      : taticaCpuAutomatica(esquemaVisitante, visitante.id);
  return {
    mandante: {
      timeId: mandante.id,
      nomeCurto: mandante.nome,
      esquema: esquemaMandante,
      elenco: elM,
      mandoDeCampo: true,
      tatica: taticaM,
      ...(escM ? { escalacao: escM } : {}),
    },
    visitante: {
      timeId: visitante.id,
      nomeCurto: visitante.nome,
      esquema: esquemaVisitante,
      elenco: elV,
      tatica: taticaV,
      ...(escV ? { escalacao: escV } : {}),
    },
    dbTaticas,
    config: { bonusMandoCampo: bonusMando },
    estadio: mandante.estadio,
  };
}

export function gerarRelatorioPreJogo(opts: {
  partida: PartidaCampeonato;
  estado: EstadoTemporada;
  times: Time[];
  jogadores: Jogador[];
  campeonato: CampeonatoConfig;
  usuarioTimeId: string | null;
  esquemaUsuario: EsquemaTatico;
  alinhamento11: number[] | null;
  gradeTatica11: { col: number; row: number; gol?: boolean }[] | null;
  dbTaticas: DatabaseTaticas;
  configTaticaUsuario?: ConfiguracaoTaticaClube;
}): RelatorioPreJogo | null {
  const mandante = opts.times.find((t) => t.id === opts.partida.mandanteId);
  const visitante = opts.times.find((t) => t.id === opts.partida.visitanteId);
  if (!mandante || !visitante) return null;

  const esqM =
    opts.usuarioTimeId === mandante.id
      ? opts.esquemaUsuario
      : esquemaOuPadrao(mandante.esquema_tatico_padrao);
  const esqV =
    opts.usuarioTimeId === visitante.id
      ? opts.esquemaUsuario
      : esquemaOuPadrao(visitante.esquema_tatico_padrao);

  const alinM = opts.usuarioTimeId === mandante.id ? opts.alinhamento11 : null;
  const alinV = opts.usuarioTimeId === visitante.id ? opts.alinhamento11 : null;
  const gradeM = opts.usuarioTimeId === mandante.id ? opts.gradeTatica11 : null;
  const gradeV = opts.usuarioTimeId === visitante.id ? opts.gradeTatica11 : null;

  const contexto = montarContextoPartidaSync({
    mandanteId: mandante.id,
    visitanteId: visitante.id,
    times: opts.times,
    estado: opts.estado,
  });
  const input = {
    ...montarInputRelatorio(
      mandante,
      visitante,
      opts.jogadores,
      esqM,
      esqV,
      opts.usuarioTimeId,
      opts.alinhamento11,
      opts.gradeTatica11,
      opts.campeonato.bonus_mando_campo ?? 1.05,
      opts.dbTaticas,
      opts.configTaticaUsuario,
    ),
    contexto,
  };
  const prev = previsaoPreJogo(input);

  const linhaM = opts.estado.tabela.find((l) => l.time_id === mandante.id) ?? linhaVazia(mandante.id);
  const linhaV =
    opts.estado.tabela.find((l) => l.time_id === visitante.id) ?? linhaVazia(visitante.id);

  const escM = previstosDoElenco(mandante.id, opts.jogadores, esqM, alinM, gradeM);
  const escV = previstosDoElenco(visitante.id, opts.jogadores, esqV, alinV, gradeV);
  const media = (lista: JogadorPrevisto[]) =>
    lista.length
      ? Math.round((lista.reduce((s, j) => s + j.overall, 0) / lista.length) * 10) / 10
      : 0;

  return {
    partida: opts.partida,
    competicao: opts.campeonato.nome,
    mandante,
    visitante,
    estadio: mandante.estadio,
    usuarioTimeId: opts.usuarioTimeId,
    emCasa: opts.usuarioTimeId === mandante.id,
    preJogo: prev,
    posicaoMandante: posicaoDoTime(opts.estado.tabela, mandante.id),
    posicaoVisitante: posicaoDoTime(opts.estado.tabela, visitante.id),
    linhaMandante: linhaM,
    linhaVisitante: linhaV,
    formaMandante: ultimaForma(opts.estado, mandante.id),
    formaVisitante: ultimaForma(opts.estado, visitante.id),
    ultimosMandante: ultimosJogos(opts.estado, mandante.id, opts.times),
    ultimosVisitante: ultimosJogos(opts.estado, visitante.id, opts.times),
    confrontos: confrontosEntre(opts.estado, mandante.id, visitante.id),
    clima: climaParaData(opts.partida.dataISO, mandante.cidade ?? mandante.estado),
    esquemaMandante: esqM,
    esquemaVisitante: esqV,
    escalacaoMandante: escM,
    escalacaoVisitante: escV,
    mediaOvrMandante: media(escM),
    mediaOvrVisitante: media(escV),
    contexto,
    moralMandante: calcularFatorMoral(contexto.ultimosResultadosMandante).indiceMoral,
    moralVisitante: calcularFatorMoral(contexto.ultimosResultadosVisitante).indiceMoral,
  };
}