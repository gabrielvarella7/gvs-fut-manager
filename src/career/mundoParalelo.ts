import type { EstadoTemporada } from './brasileirao';
import { posicaoDoTime } from './brasileirao';
import { overallDeAtributos } from './atributosJogador';
import { criarRng } from '../engine/matchEngine';
import { gerarNoticiaAssistenteMercado } from './assistenteTecnico';
import { enriquecerRumorEntrada } from './sondagemMercado';
import {
  criarAtributosOlheiro,
  gerarNoticiaOlheiroMercado,
  mediaNivelOlheiro,
  normalizarAtributosOlheiro,
  obterOlheiro,
} from './olheiroScout';
import {
  ajusteCargaTemporada,
  curvaIdadeSazonal,
  propensaoLesaoDe,
  temCicatrizFisica,
} from './curvaCarreira';
import { recuperarEnergiaUmDia } from './energia';
import {
  gerarAlertaFisiologistaElenco,
  garantirGeneticaJogador,
} from './genetica';
import { nivelDiretorBase } from './staffEfeitos';
import { calcularValorMercado } from './mercadoTransferencias';
import {
  chanceEvoluirCriaBase,
  chancePromocaoBaseLegacyCompat,
  normalizarCategoriaBase,
  normalizarFocoBase,
  rotuloFocoBase as rotuloFocoBaseYouth,
  tickYouthAcademyPosRodada,
} from './youthAcademy';
import type { Jogador, Time } from '../types/schema';
import type { EstadoLesao, GravidadeLesao } from '../types/schema';
import {
  aplicarAltaMedica,
  criarLesaoComReabilitacao,
  nivelStaff,
  staffEstaAtualizado,
} from './staffEfeitos';
import {
  mesDeDataISO,
  tentarGerarLesao,
} from '../engine/injuryEngine';
import type { RegimeIntensidadeId } from '../types/training';
import type {
  CargoStaff,
  ClimaTorcedor,
  EstadoMundoClube,
  NivelInvestimentoBase,
  FocoCategoriaBase,
  ProfissionalStaff,
  RumorOfertaMercado,
} from '../types/mundoClube';
import type { NoticiaCarreira } from './types';
import { acoesLesaoCampo } from './noticiasAcoes';
import { marcarClube, marcarJogador } from './noticiasMarkup';
import type { EstadoComercial } from '../types/commercial';
import {
  classificarJanelaCalendario,
  classificarTipoNegocio,
  rotuloTipoNegocio,
  sortearDesfechoNegociacao,
  sortearDiasCiclo,
  sortearQuantidadeNoticiasDia,
  tituloNoticiaPorDesfecho,
  type DesfechoNegociacaoMercado,
  type TipoNegocioMercado,
} from './transferMarket';

const ROTULO_STAFF: Record<CargoStaff, string> = {
  MEDICO: 'Médico',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  PREPARADOR_FISICO: 'Preparador físico',
  FISIOLOGISTA: 'Fisiologista',
  OLHEIRO: 'Olheiro',
  DIRETOR_BASE: 'Diretor da base',
  ASSISTENTE_TECNICO: 'Assistente técnico',
};

export function rotuloCargoStaff(cargo: CargoStaff): string {
  return ROTULO_STAFF[cargo];
}

function nivelStaffBase(prestigio: number, offset: number): number {
  return Math.max(6, Math.min(18, Math.round(prestigio / 7) + offset));
}

function criarStaffInicial(prestigio: number): ProfissionalStaff[] {
  const nomes = [
    'Dr. Almeida',
    'Ana Fisio',
    'Carlos Prep.',
    'Lia Fisio.',
    'Jorge Olheiro',
    'Renata Matoso',
    'Téo Auxiliar',
  ];
  const cargos: CargoStaff[] = [
    'MEDICO',
    'FISIOTERAPEUTA',
    'PREPARADOR_FISICO',
    'FISIOLOGISTA',
    'OLHEIRO',
    'DIRETOR_BASE',
    'ASSISTENTE_TECNICO',
  ];
  return cargos.map((cargo, i) => {
    const id = `st_${cargo.toLowerCase()}`;
    const nome = nomes[i]!;
    if (cargo === 'OLHEIRO') {
      const atributosOlheiro = criarAtributosOlheiro(prestigio, i + prestigio);
      return {
        id,
        cargo,
        nome,
        nivel: mediaNivelOlheiro(atributosOlheiro),
        atributosOlheiro,
      };
    }
    return {
      id,
      cargo,
      nome,
      nivel: nivelStaffBase(prestigio, i - 2),
    };
  });
}

export function criarEstadoMundoClube(time: Time): EstadoMundoClube {
  const prestigio = time.prestigio ?? time.forca_geral;
  return {
    time_id: time.id,
    staff: criarStaffInicial(prestigio),
    base: {
      investimentoNivel: 1,
      foco: 'EQUILIBRADO',
      qualidade: Math.max(8, Math.min(16, Math.round(prestigio / 8))),
      ultimaPromocaoRodada: 0,
      promocoesTemporada: 0,
      elencoSub20: [],
      safraTemporadaAno: 0,
      ultimaGotejamentoRodada: 0,
      sugestoesPromocao: [],
      identidadeBaseAtiva: false,
      criasRelacionadosRecente: 0,
    },
    pedidosRenovacao: [],
    rumoresOfertas: [],
    climaTorcedor: { indice: 58, sequenciaRuim: 0, sequenciaBoa: 0 },
    rodadaUltimoTick: 0,
    ultimoTreino: null,
  };
}

export function normalizarEstadoMundoClube(
  estado: EstadoMundoClube | null | undefined,
  time: Time,
): EstadoMundoClube {
  if (!estado) return criarEstadoMundoClube(time);
  const prestigio = time.prestigio ?? time.forca_geral;
  let staff =
    estado.staff?.length && staffEstaAtualizado(estado.staff) ?
      estado.staff.map((s) => {
        const cargo = (s.cargo as string) === 'OLHEIRO_BASE' ? ('OLHEIRO' as const) : s.cargo;
        return normalizarAtributosOlheiro({ ...s, cargo }, prestigio);
      })
    : criarStaffInicial(prestigio);
  if (!staff.some((s) => s.cargo === 'DIRETOR_BASE')) {
    const ref = staff.find((s) => s.cargo === 'OLHEIRO');
    staff = [
      ...staff,
      {
        id: 'st_diretor_base',
        cargo: 'DIRETOR_BASE',
        nome: ref?.nome ?? 'Diretor da base',
        nivel: ref?.nivel ?? nivelStaffBase(prestigio, 1),
      },
    ];
  }
  return {
    ...criarEstadoMundoClube(time),
    ...estado,
    staff,
    base: normalizarCategoriaBase({
      ...criarEstadoMundoClube(time).base,
      ...estado.base,
      foco: normalizarFocoBase(estado.base?.foco),
    }),
    pedidosRenovacao: estado.pedidosRenovacao ?? [],
    rumoresOfertas: estado.rumoresOfertas ?? [],
    climaTorcedor: estado.climaTorcedor ?? { indice: 55, sequenciaRuim: 0, sequenciaBoa: 0 },
  };
}

export function jogadorDisponivel(j: Jogador): boolean {
  return !j.lesao || j.lesao.diasRestantes <= 0;
}

function rndSeed(...parts: (number | string)[]): number {
  let s = 2166136261;
  for (const p of parts) {
    const str = String(p);
    for (let i = 0; i < str.length; i++) {
      s ^= str.charCodeAt(i);
      s = Math.imul(s, 16777619);
    }
  }
  return s >>> 0;
}

export function recuperarLesoesUmDia(
  jogadores: Jogador[],
  mundo?: EstadoMundoClube | null,
): Jogador[] {
  const nivelMedico = mundo?.staff.find((s) => s.cargo === 'MEDICO')?.nivel ?? 10;
  return jogadores.map((j) => {
    if (!j.lesao || j.lesao.diasRestantes <= 0) {
      if (j.lesao) return aplicarAltaMedica(j, nivelMedico);
      return j;
    }
    const dias = j.lesao.diasRestantes - 1;
    if (dias <= 0) {
      return aplicarAltaMedica({ ...j, lesao: { ...j.lesao, diasRestantes: 0 } }, nivelMedico);
    }
    return { ...j, lesao: { ...j.lesao, diasRestantes: dias } };
  });
}

export function aplicarLesoesPosPartida(
  jogadores: Jogador[],
  idsParticipantes: number[],
  seed: number,
  mundo?: EstadoMundoClube | null,
  /** Já lesionados em campo — não sortear de novo. */
  idsJaLesionados?: ReadonlySet<number>,
  opts?: { mesAtual?: number; isClassico?: boolean },
): { jogadores: Jogador[]; noticias: NoticiaCarreira[] } {
  const rnd = criarRng(seed);
  const set = new Set(idsParticipantes);
  const noticias: NoticiaCarreira[] = [];
  const next = jogadores.map((j) => {
    if (!set.has(j.id) || !jogadorDisponivel(j)) return j;
    if (idsJaLesionados?.has(j.id)) return j;
    const gerado = tentarGerarLesao({
      jogador: j,
      contexto: 'JOGO',
      mesAtual: opts?.mesAtual ?? 6,
      nivelFisiologista: nivelStaff(mundo, 'FISIOLOGISTA'),
      nivelFisioterapeuta: nivelStaff(mundo, 'FISIOTERAPEUTA'),
      isClassicoOuDecisao: opts?.isClassico,
      rng: rnd,
    });
    if (!gerado) return j;
    const { lesao, diagnostico } = gerado;
    const nomeLink = marcarJogador(j.id, j.nome);
    noticias.push({
      id: `lesao_${j.id}_${seed}`,
      data: new Date().toISOString(),
      titulo: `Lesão: ${nomeLink}`,
      texto: `${nomeLink}: ${diagnostico.nome} (${diagnostico.gravidade.toLowerCase()}). Previsão de ${diagnostico.diasRecuperacao} dias.`,
      acoes: acoesLesaoCampo(j.id),
    });
    return { ...j, lesao, energia: Math.min(j.energia, 42) };
  });
  return { jogadores: next, noticias };
}

/** Aplica lesões ocorridas durante a simulação (fadiga / catálogo). */
export function aplicarLesoesEmCampo(
  jogadores: Jogador[],
  lesoes: {
    jogadorId: number;
    descricao: string;
    gravidade: GravidadeLesao;
    diasBase: number;
    lesaoId?: string;
    sequelaPendente?: number;
    /** Se true, diasBase já inclui fisio — não reaplicar. */
    diasFinais?: boolean;
  }[],
  mundo?: EstadoMundoClube | null,
): { jogadores: Jogador[]; noticias: NoticiaCarreira[] } {
  if (!lesoes.length) return { jogadores, noticias: [] };
  const porId = new Map(lesoes.map((l) => [l.jogadorId, l]));
  const noticias: NoticiaCarreira[] = [];
  const nivelFisio = nivelStaff(mundo, 'FISIOTERAPEUTA');
  const next = jogadores.map((j) => {
    const info = porId.get(j.id);
    if (!info) return j;
    const lesao = info.diasFinais
      ? ({
          diasRestantes: Math.max(2, info.diasBase),
          gravidade: info.gravidade,
          descricao: info.descricao,
          atributosReferencia: {
            tecnicos: { ...j.atributos.tecnicos },
            mentais: { ...j.atributos.mentais },
            fisicos: { ...j.atributos.fisicos },
          },
          overallReferencia: j.overall,
          tipo: 'SOBRECARGA' as const,
          lesaoId: info.lesaoId,
          sequelaPendente: info.sequelaPendente,
          rodadasForaBase: Math.max(1, Math.round(info.diasBase / 6)),
        } satisfies EstadoLesao)
      : criarLesaoComReabilitacao(
          info.diasBase,
          info.gravidade,
          info.descricao,
          j,
          nivelFisio,
          {
            lesaoId: info.lesaoId,
            ...(info.sequelaPendente != null ? { sequelaPendente: info.sequelaPendente } : {}),
          },
        );
    const nomeLink = marcarJogador(j.id, j.nome);
    noticias.push({
      id: `lesao_campo_${j.id}_${Date.now()}`,
      data: new Date().toISOString(),
      titulo: `Lesão em campo: ${nomeLink}`,
      texto: `${nomeLink} saiu com ${info.descricao} (${info.gravidade.toLowerCase()}). Previsão de ${lesao.diasRestantes} dias fora.`,
      acoes: acoesLesaoCampo(j.id),
    });
    return { ...j, lesao, energia: Math.min(j.energia, 38) };
  });
  return { jogadores: next, noticias };
}

function evoluirJogadorUmPonto(j: Jogador, attrs: (keyof Jogador['atributos']['tecnicos'])[]): Jogador {
  const atributos = { ...j.atributos, tecnicos: { ...j.atributos.tecnicos } };
  for (const k of attrs) {
    const v = atributos.tecnicos[k];
    if (v < 20) atributos.tecnicos[k] = Math.min(20, v + 1);
  }
  const overall = overallDeAtributos(j.posicao, atributos);
  return { ...j, atributos, overall, valor_mercado: calcularValorMercado(overall, j.idade, j.posicao) };
}

function declinioVeterano(j: Jogador): Jogador {
  // Veteranos perdem só Velocidade (não Passe/Chute/drible técnico).
  const atributos = {
    ...j.atributos,
    fisicos: { ...j.atributos.fisicos },
    mentais: { ...j.atributos.mentais },
  };
  const perda = j.idade >= 40 ? 2 : j.idade >= 36 ? 1 : 1;
  atributos.fisicos.velocidade = Math.max(1, atributos.fisicos.velocidade - perda);
  if (j.idade >= 30 && j.idade <= 32) {
    atributos.mentais.leitura_jogo = Math.min(20, atributos.mentais.leitura_jogo + 1);
  }
  const overall = overallDeAtributos(j.posicao, atributos);
  return { ...j, atributos, overall, valor_mercado: calcularValorMercado(overall, j.idade, j.posicao) };
}

function evoluiDaBase(j: Jogador, fatorStaff: number): boolean {
  if (!j.formacaoBase) return false;
  return chanceEvoluirCriaBase(j, fatorStaff, Math.random);
}

/** Progressão de overall só na virada de temporada (não por rodada). */
export function tetoDeltaOverallPorIdade(idade: number): number {
  if (idade < 23 || idade > 33) return 8;
  return 4;
}

function focoAttrsPosicao(j: Jogador): (keyof Jogador['atributos']['tecnicos'])[] {
  if (j.posicao === 'GOL') return ['dominio', 'cabeceio'];
  if (j.posicao === 'ZAG' || j.posicao === 'LAT') return ['cabeceio', 'passe'];
  if (j.posicao === 'VOL') return ['passe', 'lancamentos'];
  if (j.posicao === 'ATA') return ['chute', 'drible'];
  return ['passe', 'dominio'];
}

function aplicarDeltaOverall(j: Jogador, delta: number): Jogador {
  if (delta === 0) return j;
  const foco = focoAttrsPosicao(j);
  let next = j;
  const passos = Math.abs(delta);
  for (let i = 0; i < passos; i++) {
    if (delta > 0) next = evoluirJogadorUmPonto(next, foco);
    else next = declinioVeterano(next);
  }
  return next;
}

/**
 * Overall lento: 1× por temporada.
 * Idade 23–33: máx ±4; muito jovem/velho: até ±8.
 * Combina curva etária + desempenho em campo (participações / forma do time).
 */
export function desenvolverElencoFimTemporada(
  jogadores: Jogador[],
  mundo: EstadoMundoClube,
  clubeId: string,
  opts: {
    posicaoTabela: number;
    vitoriaUser: boolean;
    empateUser: boolean;
    participacoes?: Record<number, number>;
  },
): Jogador[] {
  const diretor = nivelDiretorBase(mundo);
  const fatorStaff = (mundo.base.qualidade + diretor) / 40;
  const formaTime =
    opts.vitoriaUser ? 1 : opts.empateUser ? 0.35 : opts.posicaoTabela <= 10 ? -0.2 : -0.55;
  const pressaoTabela = opts.posicaoTabela <= 4 ? 0.4 : opts.posicaoTabela >= 17 ? -0.35 : 0;

  return jogadores.map((j) => {
    if (j.time_id !== clubeId) return j;

    // Crias da base: curva jovem + genética/teto na virada de temporada.
    if (j.formacaoBase && evoluiDaBase(j, fatorStaff)) {
      const boost =
        j.idade <= 18 ? 3
        : j.idade <= 21 ? 2
        : 1;
      return aplicarDeltaOverall(
        j,
        Math.min(tetoDeltaOverallPorIdade(j.idade), boost + Math.round(fatorStaff)),
      );
    }

    const teto = tetoDeltaOverallPorIdade(j.idade);
    const jogos = opts.participacoes?.[j.id] ?? 0;
    const carga = ajusteCargaTemporada(jogos);
    // 35–40 jogos: estável (carga neutra); 55+: −2 OVR estrutural.
    if (carga === -2) {
      return aplicarDeltaOverall(j, Math.max(-teto, -2));
    }

    const desempenhoCampo =
      carga === 0
        ? 0
        : Math.min(1.2, jogos / 28) * (0.55 + formaTime * 0.45 + pressaoTabela * 0.25);

    let curvaIdade = curvaIdadeSazonal(j.idade, j.posicao) + fatorStaff * (j.idade <= 23 ? 1.2 : 0.3);
    if (temCicatrizFisica(j)) curvaIdade -= 0.6;
    if (propensaoLesaoDe(j) <= 0.75) curvaIdade += 0.25;
    if (propensaoLesaoDe(j) >= 1.6) curvaIdade -= 0.5;

    const bruto =
      curvaIdade +
      desempenhoCampo * (j.status_escalacao === 'TITULAR' ? 2.4 : 1.1) +
      carga;
    const delta = Math.max(-teto, Math.min(teto, Math.round(bruto)));
    return aplicarDeltaOverall(j, delta);
  });
}

/** @deprecated Preferir desenvolverElencoFimTemporada — mantido para compat. */
export function desenvolverElencoPosRodada(
  jogadores: Jogador[],
  _mundo: EstadoMundoClube,
  _clubeId: string,
): Jogador[] {
  return jogadores;
}

/** Chance aproximada (UI) — safras/gotejo reais estão em youthAcademy. */
export function chancePromocaoBase(mundo: EstadoMundoClube): number {
  const olheiro = mediaNivelOlheiro(
    obterOlheiro(mundo)?.atributosOlheiro ?? {
      tecnicos: 10,
      fisicos: 10,
      mentais: 10,
      potencial: 10,
    },
  );
  return Math.min(0.55, chancePromocaoBaseLegacyCompat(mundo) + olheiro / 400);
}

function atualizarClimaTorcedor(
  clima: ClimaTorcedor,
  vitoria: boolean,
  empate: boolean,
  posicao: number,
): ClimaTorcedor {
  let indice = clima.indice;
  let sequenciaRuim = clima.sequenciaRuim;
  let sequenciaBoa = clima.sequenciaBoa;
  if (vitoria) {
    indice = Math.min(100, indice + 5);
    sequenciaBoa += 1;
    sequenciaRuim = 0;
  } else if (empate) {
    indice = Math.max(0, indice - 1);
    sequenciaRuim += 1;
    sequenciaBoa = 0;
  } else {
    indice = Math.max(0, indice - 7);
    sequenciaRuim += 1;
    sequenciaBoa = 0;
  }
  if (posicao >= 17) indice = Math.max(0, indice - 4);
  else if (posicao <= 4) indice = Math.min(100, indice + 2);
  return { indice, sequenciaRuim, sequenciaBoa };
}

export function noticiasClimaTorcedor(
  clima: ClimaTorcedor,
  clubeNome: string,
  chegadaJogador?: string,
): NoticiaCarreira[] {
  const out: NoticiaCarreira[] = [];
  const now = new Date().toISOString();
  if (chegadaJogador) {
    out.push({
      id: `torcida_festa_${Date.now()}`,
      data: now,
      titulo: 'Torcida faz festa no aeroporto',
      texto: `Milhares de torcedores do ${clubeNome} receberam ${chegadaJogador} com cantos e faixas na chegada ao clube.`,
    });
  }
  if (clima.sequenciaRuim >= 3 && clima.indice < 42) {
    out.push({
      id: `torcida_cobra_${clima.sequenciaRuim}`,
      data: now,
      titulo: 'Torcida cobra resultados',
      texto: `Organizada do ${clubeNome} publicou nota pedindo postura e reforços após sequência ruim (humor ${Math.round(clima.indice)}%).`,
    });
  }
  if (clima.indice >= 78 && clima.sequenciaBoa >= 2) {
    out.push({
      id: `torcida_festa_ct_${clima.sequenciaBoa}`,
      data: now,
      titulo: 'Clima quente no CT',
      texto: `Torcida lota o treino aberto e elogia o elenco após boa fase.`,
    });
  }
  return out;
}

export function gerarPedidosRenovacao(
  jogadores: Jogador[],
  mundo: EstadoMundoClube,
  rodada: number,
  clubeId: string,
): EstadoMundoClube {
  const ativos = new Set(mundo.pedidosRenovacao.map((p) => p.jogadorId));
  const novos = [...mundo.pedidosRenovacao];
  for (const j of jogadores) {
    if (j.time_id !== clubeId || !j.contrato) continue;
    if (j.contrato.meses_restantes > 10) continue;
    if (j.contrato.meses_restantes > 4 && j.status_escalacao !== 'TITULAR') continue;
    if (ativos.has(j.id)) continue;
    if (Math.random() > 0.55) continue;
    const salarioAtual = j.contrato.salario_clt_mensal + j.contrato.direito_imagem_mensal;
    novos.push({
      id: `ren_${j.id}_${rodada}`,
      jogadorId: j.id,
      salarioPretendido: Math.round(salarioAtual * (1.12 + Math.random() * 0.18)),
      duracaoMeses: j.idade >= 30 ? 24 : 36,
      rodadaCriada: rodada,
      mensagem:
        j.status_escalacao === 'TITULAR' ?
          'Titular pede reconhecimento financeiro antes do fim do contrato.'
        : 'Representante sinaliza vontade de renovar com aumento moderado.',
    });
  }
  return { ...mundo, pedidosRenovacao: novos.slice(-12) };
}

export function decrementarContratosRodada(jogadores: Jogador[]): Jogador[] {
  return jogadores.map((j) => {
    if (!j.contrato || j.contrato.meses_restantes <= 0) return j;
    const meses = j.contrato.meses_restantes - 1;
    return {
      ...j,
      contrato: {
        ...j.contrato,
        meses_restantes: meses,
        meses_no_clube: j.contrato.meses_no_clube + 1,
      },
    };
  });
}

function sortearTipoNegocioCpu(rnd: () => number, livre: boolean): TipoNegocioMercado {
  if (livre) return 'livre';
  const r = rnd();
  if (r < 0.08) return 'multa_rescisoria';
  if (r < 0.28) return 'emprestimo';
  if (r < 0.42) return 'compra_internacional';
  return 'compra_nacional';
}

function textoDesfechoMercado(params: {
  desfecho: DesfechoNegociacaoMercado;
  nomeComp: string;
  nomeVend: string;
  compradorId?: string | null;
  vendedorId?: string | null;
  jogador: Jogador;
  valorM: number;
  tipo: TipoNegocioMercado;
  diasCiclo: number;
}): string {
  const { desfecho, jogador, valorM, tipo, diasCiclo } = params;
  const tipoTxt = rotuloTipoNegocio(tipo).toLowerCase();
  const j = marcarJogador(jogador.id, jogador.nome);
  const comp =
    params.compradorId ? marcarClube(params.compradorId, params.nomeComp) : params.nomeComp;
  const vend =
    params.vendedorId ? marcarClube(params.vendedorId, params.nomeVend) : params.nomeVend;
  switch (desfecho) {
    case 'assinada':
      return `${comp} fechou ${tipoTxt} de ${j} (${jogador.overall} OVR) junto ao ${vend} por ~R$ ${valorM}M após ${diasCiclo} dia(s).`;
    case 'recusada_clube':
      return `${vend} recusou proposta do ${comp} por ${j} (~R$ ${valorM}M) — peça-chave ou valor baixo.`;
    case 'contraproposta':
      return `${vend} e ${comp} trocam contrapropostas por ${j} (${tipoTxt}); divergência de parcelas/% do passe.`;
    case 'recusada_jogador':
      return `${j} recusou ir ao ${comp} (salário, contrato ou rivalidade) após ${diasCiclo} dia(s) de conversa.`;
    case 'melada':
      return `Negociação ${tipoTxt} de ${j} (${vend} → ${comp}) melou por exames, fair play ou prazo de janela.`;
  }
}

/**
 * Notícias diárias de mercado calibradas pela janela do calendário
 * (Jan–Fev pico, pós-estaduais, meio de ano, entressafra).
 */
export function gerarNoticiasMercadoDia(params: {
  jogadores: Jogador[];
  times: Time[];
  clubeUsuarioId: string;
  dataISO: string;
  seed: number;
}): { noticias: NoticiaCarreira[]; rumorUsuario: RumorOfertaMercado | null } {
  const rnd = criarRng(params.seed);
  const qtd = sortearQuantidadeNoticiasDia(params.dataISO, rnd);
  const noticias: NoticiaCarreira[] = [];
  let rumorUsuario: RumorOfertaMercado | null = null;
  if (qtd <= 0) return { noticias, rumorUsuario };

  const janela = classificarJanelaCalendario(params.dataISO);
  const idsTimes = params.times.map((t) => t.id).filter((id) => id !== params.clubeUsuarioId);
  if (idsTimes.length < 2) return { noticias, rumorUsuario };

  const poolGeral = params.jogadores.filter(
    (j) => j.time_id && j.time_id !== params.clubeUsuarioId && j.overall >= 68 && j.idade <= 34,
  );
  const livres = params.jogadores.filter((j) => !j.time_id && j.overall >= 70);

  for (let i = 0; i < qtd; i++) {
    const livre = livres.length > 0 && rnd() < 0.12;
    const alvo =
      livre ? livres[Math.floor(rnd() * livres.length)]!
      : poolGeral[Math.floor(rnd() * Math.max(poolGeral.length, 1))];
    if (!alvo) continue;

    const vendedorId = alvo.time_id ?? idsTimes[0]!;
    let comprador = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    if (comprador === vendedorId) {
      comprador = idsTimes[(idsTimes.indexOf(vendedorId) + 1 + i) % idsTimes.length]!;
    }
    const nomeComp = params.times.find((t) => t.id === comprador)?.nome ?? comprador;
    const nomeVend =
      !alvo.time_id ? 'agente livre'
      : (params.times.find((t) => t.id === vendedorId)?.nome ?? vendedorId);
    const tipo = sortearTipoNegocioCpu(rnd, !alvo.time_id);
    const desfecho = sortearDesfechoNegociacao(rnd);
    const diasCiclo = sortearDiasCiclo(tipo, rnd);
    const valor = alvo.valor_mercado ?? alvo.overall * 800_000;
    const valorM = Math.max(1, Math.round(valor / 1_000_000));

    noticias.push({
      id: `merc_dia_${params.dataISO}_${alvo.id}_${i}`,
      data: `${params.dataISO}T12:00:00.000Z`,
      titulo: `${tituloNoticiaPorDesfecho(desfecho)} · ${janela.rotulo}`,
      texto: textoDesfechoMercado({
        desfecho,
        nomeComp,
        nomeVend,
        compradorId: comprador,
        vendedorId: alvo.time_id ? vendedorId : null,
        jogador: alvo,
        valorM,
        tipo,
        diasCiclo,
      }),
    });
  }

  // Sondagem no elenco do usuário — mais frequente em janela aberta.
  const elencoUser = params.jogadores.filter(
    (j) => j.time_id === params.clubeUsuarioId && j.overall >= 74,
  );
  const pRumor = janela.janelaAberta ? 0.22 : 0.08;
  const alvoUser = elencoUser[Math.floor(rnd() * Math.max(elencoUser.length, 1))];
  if (alvoUser && elencoUser.length > 0 && rnd() < pRumor) {
    const comprador = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    const nomeComp = params.times.find((t) => t.id === comprador)?.nome_completo ?? comprador;
    rumorUsuario = {
      id: `rumor_dia_${params.dataISO}_${alvoUser.id}`,
      jogadorId: alvoUser.id,
      timeCompradorId: comprador,
      timeCompradorNome: nomeComp,
      valorIndicativo: Math.round((alvoUser.valor_mercado ?? 5_000_000) * (0.92 + rnd() * 0.2)),
      rodada: 0,
      texto: `${nomeComp} prepara proposta por ${alvoUser.nome} (${janela.rotulo}).`,
    };
    noticias.push({
      id: rumorUsuario.id,
      data: `${params.dataISO}T12:30:00.000Z`,
      titulo: 'Sondagem no seu elenco',
      texto: rumorUsuario.texto,
    });
  }

  return { noticias, rumorUsuario };
}

export function simularMercadoCpuRodada(
  jogadores: Jogador[],
  times: Time[],
  clubeUsuarioId: string,
  rodada: number,
  seed: number,
  dataISO?: string,
): { jogadores: Jogador[]; noticias: NoticiaCarreira[]; rumorUsuario: RumorOfertaMercado | null } {
  const rnd = criarRng(seed);
  const noticias: NoticiaCarreira[] = [];
  let rumorUsuario: RumorOfertaMercado | null = null;
  const janela = dataISO ? classificarJanelaCalendario(dataISO) : null;
  const pMovimento = janela ? (janela.janelaAberta ? 0.55 : 0.22) : 0.45;

  const idsTimes = times.map((t) => t.id).filter((id) => id !== clubeUsuarioId);
  if (idsTimes.length >= 2 && rnd() < pMovimento) {
    const vendedor = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    let comprador = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    if (comprador === vendedor) comprador = idsTimes[(idsTimes.indexOf(vendedor) + 1) % idsTimes.length]!;
    const pool = jogadores.filter((j) => j.time_id === vendedor && j.idade <= 29 && j.overall >= 70);
    const alvo = pool[Math.floor(rnd() * Math.max(pool.length, 1))];
    if (alvo && pool.length > 0) {
      const nomeComp = times.find((t) => t.id === comprador)?.nome ?? comprador;
      const nomeVend = times.find((t) => t.id === vendedor)?.nome ?? vendedor;
      const valor = alvo.valor_mercado ?? alvo.overall * 800_000;
      const valorM = Math.max(1, Math.round(valor / 1_000_000));
      const internacional = rnd() < 0.18;
      const tipo = classificarTipoNegocio({
        jogador: alvo,
        oferta: {
          valorTransferencia: valor,
          percentualDireitos: 100,
          salarioCltMensal: 50_000,
          direitoImagemMensal: 20_000,
          luvas: 100_000,
          duracaoMeses: 36,
          isEmprestimo: rnd() < 0.2,
          isInternacional: internacional,
        },
      });
      const desfecho = sortearDesfechoNegociacao(rnd);
      const diasCiclo = sortearDiasCiclo(tipo, rnd);
      noticias.push({
        id: `merc_cpu_${rodada}_${alvo.id}`,
        data: new Date().toISOString(),
        titulo: tituloNoticiaPorDesfecho(desfecho),
        texto: textoDesfechoMercado({
          desfecho,
          nomeComp,
          nomeVend,
          compradorId: comprador,
          vendedorId: vendedor,
          jogador: alvo,
          valorM,
          tipo,
          diasCiclo,
        }),
      });
      if (desfecho === 'assinada') {
        const next = jogadores.map((j) =>
          j.id === alvo.id ? { ...j, time_id: comprador, status_escalacao: 'RESERVA' as const } : j,
        );
        return { jogadores: next, noticias, rumorUsuario };
      }
    }
  }

  const elencoUser = jogadores.filter((j) => j.time_id === clubeUsuarioId && j.overall >= 74);
  const alvoUser = elencoUser[Math.floor(rnd() * Math.max(elencoUser.length, 1))];
  const pRumor = janela ? (janela.janelaAberta ? 0.32 : 0.12) : 0.28;
  if (alvoUser && elencoUser.length > 0 && rnd() < pRumor) {
    const comprador = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    const nomeComp = times.find((t) => t.id === comprador)?.nome_completo ?? comprador;
    rumorUsuario = {
      id: `rumor_${rodada}_${alvoUser.id}`,
      jogadorId: alvoUser.id,
      timeCompradorId: comprador,
      timeCompradorNome: nomeComp,
      valorIndicativo: Math.round((alvoUser.valor_mercado ?? 5_000_000) * (0.92 + rnd() * 0.2)),
      rodada,
      texto: `${nomeComp} prepara proposta por ${alvoUser.nome}.`,
    };
    noticias.push({
      id: rumorUsuario.id,
      data: new Date().toISOString(),
      titulo: 'Sondagem no seu elenco',
      texto: rumorUsuario.texto,
    });
  }

  return { jogadores, noticias, rumorUsuario };
}

export interface TickDiaMundoParams {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  clubeId: string;
  dataISO: string;
  comercialHumor?: number;
  times?: Time[];
}

export function tickMundoPorDia(params: TickDiaMundoParams): {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  noticias: NoticiaCarreira[];
  rumorUsuario?: RumorOfertaMercado | null;
} {
  const rnd = criarRng(rndSeed(params.dataISO, params.clubeId));
  let mundo = params.mundo;
  let jogadores = recuperarLesoesUmDia(params.jogadores, mundo).map(garantirGeneticaJogador);
  const nivelPrep = nivelStaff(mundo, 'PREPARADOR_FISICO');
  const nivelFisiologista = nivelStaff(mundo, 'FISIOLOGISTA');
  const regimeId = mundo.programacaoTreino?.regime_id;
  const sessaoId = mundo.programacaoTreino?.sessao_principal_id;
  const bonusTreino =
    sessaoId === 'REGENERACAO_ATIVA' ? 15
    : regimeId === 'REGENERATIVO' ? 14
    : sessaoId === 'PREVENCAO_LESOES' ? 8
    : 0;
  const treinoComBolaDia1 =
    regimeId != null &&
    regimeId !== 'REGENERATIVO' &&
    sessaoId !== 'REGENERACAO_ATIVA';
  jogadores = recuperarEnergiaUmDia(jogadores, rnd, {
    dataISO: params.dataISO,
    nivelPreparador: nivelPrep,
    bonusTreino,
    treinoComBolaDia1,
  });
  const noticias: NoticiaCarreira[] = [];

  const alertaFisio = gerarAlertaFisiologistaElenco({
    jogadores,
    clubeId: params.clubeId,
    nivelFisiologista,
    dataISO: params.dataISO,
    seed: rndSeed(params.dataISO, 'fisio', params.clubeId),
  });
  if (alertaFisio) noticias.push(alertaFisio);

  const mesAtual = mesDeDataISO(params.dataISO);
  const intensidadeTreino = (regimeId ?? 'EQUILIBRADO') as RegimeIntensidadeId;
  const elenco = jogadores.filter((j) => j.time_id === params.clubeId && jogadorDisponivel(j));
  for (const j of elenco) {
    if (j.status_escalacao === 'NAO_RELACIONADO') continue;
    const gerado = tentarGerarLesao({
      jogador: j,
      contexto: 'TREINO',
      mesAtual,
      nivelFisiologista: nivelFisiologista,
      nivelFisioterapeuta: nivelStaff(mundo, 'FISIOTERAPEUTA'),
      intensidadeTreino,
      exposicaoDias: 1,
      rng: rnd,
    });
    if (!gerado) continue;
    jogadores = jogadores.map((x) => (x.id === j.id ? { ...x, lesao: gerado.lesao } : x));
    const nomeLink = marcarJogador(j.id, j.nome);
    const diag = gerado.diagnostico;
    noticias.push({
      id: `lesao_treino_${j.id}_${params.dataISO}`,
      data: `${params.dataISO}T10:00:00.000Z`,
      titulo: `Baixa no treino — ${nomeLink}`,
      texto: `${nomeLink}: ${diag.nome} (${diag.gravidade.toLowerCase()}). Previsão de ${diag.diasRecuperacao} dias.`,
      acoes: acoesLesaoCampo(j.id),
    });
    if (noticias.filter((n) => n.id.startsWith('lesao_treino_')).length >= 3) break;
  }
  if (params.comercialHumor != null) {
    const alvo = Math.round(params.comercialHumor);
    mundo = {
      ...mundo,
      climaTorcedor: {
        ...mundo.climaTorcedor,
        indice: Math.round(mundo.climaTorcedor.indice * 0.82 + alvo * 0.18),
      },
    };
  }

  let rumorUsuario: RumorOfertaMercado | null = null;
  if (params.times && params.times.length >= 2) {
    const mercadoDia = gerarNoticiasMercadoDia({
      jogadores,
      times: params.times,
      clubeUsuarioId: params.clubeId,
      dataISO: params.dataISO,
      seed: rndSeed(params.dataISO, 'merc', params.clubeId),
    });
    noticias.push(...mercadoDia.noticias);
    rumorUsuario = mercadoDia.rumorUsuario;
    if (rumorUsuario) {
      const jAlvo = jogadores.find((j) => j.id === rumorUsuario!.jogadorId);
      const rumor =
        jAlvo != null
          ? enriquecerRumorEntrada(rumorUsuario, jAlvo, params.dataISO)
          : rumorUsuario;
      mundo = {
        ...mundo,
        rumoresOfertas: [rumor, ...mundo.rumoresOfertas].slice(0, 8),
      };
      rumorUsuario = rumor;
    }
  }

  return { jogadores, mundo, noticias, rumorUsuario };
}

export interface TickRodadaMundoParams {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  times: Time[];
  brasileirao: EstadoTemporada;
  clubeId: string;
  rodada: number;
  vitoriaUser: boolean;
  empateUser: boolean;
  time: Time;
  seed: number;
  idsParticipantes?: number[];
  /** Lesionados durante a partida (fadiga) — evita sorteio duplicado. */
  idsLesionadosEmCampo?: number[];
  comercial?: EstadoComercial | null;
}

export function tickMundoPosRodada(params: TickRodadaMundoParams): {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  noticias: NoticiaCarreira[];
  comercial?: EstadoComercial | null;
} {
  const pos = posicaoDoTime(params.brasileirao.tabela, params.clubeId);
  let mundo = params.mundo;
  let jogadores = decrementarContratosRodada(params.jogadores);
  const noticias: NoticiaCarreira[] = [];
  let comercial = params.comercial ?? null;

  const clima = atualizarClimaTorcedor(
    mundo.climaTorcedor,
    params.vitoriaUser,
    params.empateUser,
    pos,
  );
  mundo = { ...mundo, climaTorcedor: clima, rodadaUltimoTick: params.rodada };
  noticias.push(...noticiasClimaTorcedor(clima, params.time.nome ?? params.time.nome_completo));

  mundo = gerarPedidosRenovacao(jogadores, mundo, params.rodada, params.clubeId);

  // Overall não sobe/desce por rodada — só no fim da temporada (abaixo).
  const participacoes = { ...(mundo.participacoesTemporada ?? {}) };
  if (params.idsParticipantes?.length) {
    for (const id of params.idsParticipantes) {
      participacoes[id] = (participacoes[id] ?? 0) + 1;
    }
    mundo = { ...mundo, participacoesTemporada: participacoes };
  }

  const viradaTemporada = params.rodada > 0 && params.rodada % 38 === 0;
  const anoBase = params.brasileirao.temporadaAno ?? 2026;
  const youth = tickYouthAcademyPosRodada({
    jogadores,
    mundo,
    time: params.time,
    rodada: params.rodada,
    // Na virada, a safra conta para a temporada seguinte.
    temporadaAno: viradaTemporada ? anoBase + 1 : anoBase,
    seed: params.seed ^ 0xabc,
    idsParticipantes: params.idsParticipantes,
    comercial,
    viradaTemporada: viradaTemporada || params.rodada === 1,
  });
  jogadores = youth.jogadores;
  mundo = youth.mundo;
  comercial = youth.comercial;
  noticias.push(...youth.noticias);

  const mercado = simularMercadoCpuRodada(
    jogadores,
    params.times,
    params.clubeId,
    params.rodada,
    params.seed,
    params.brasileirao.dataAtualISO,
  );
  jogadores = mercado.jogadores;
  noticias.push(...mercado.noticias);
  if (mercado.rumorUsuario) {
    const rumorBase = mercado.rumorUsuario;
    const jAlvo = jogadores.find((j) => j.id === rumorBase.jogadorId);
    const rumor =
      jAlvo != null
        ? enriquecerRumorEntrada(rumorBase, jAlvo, params.brasileirao.dataAtualISO)
        : rumorBase;
    mundo = {
      ...mundo,
      rumoresOfertas: [rumor, ...mundo.rumoresOfertas].slice(0, 8),
    };
  }

  const nivelAst = mundo.staff.find((s) => s.cargo === 'ASSISTENTE_TECNICO')?.nivel ?? 10;
  const elencoUser = jogadores.filter((j) => j.time_id === params.clubeId);
  const mediaOvr =
    elencoUser.length > 0 ?
      elencoUser.reduce((s, j) => s + j.overall, 0) / elencoUser.length
    : 70;
  const dicaAst = gerarNoticiaAssistenteMercado({
    jogadores,
    clubeId: params.clubeId,
    times: params.times,
    nivelAssistente: nivelAst,
    rodada: params.rodada,
    seed: params.seed ^ 0x515,
    mediaOvrElenco: mediaOvr,
  });
  if (dicaAst) noticias.push(dicaAst);

  const olheiro = obterOlheiro(mundo);
  const notOlh = gerarNoticiaOlheiroMercado({
    jogadores,
    clubeId: params.clubeId,
    times: params.times,
    olheiro,
    prestigioClube: params.time.prestigio ?? params.time.forca_geral,
    rodada: params.rodada,
    seed: params.seed ^ 0x0b10,
  });
  if (notOlh) noticias.push(notOlh);

  if (params.idsParticipantes?.length) {
    const jaLesionados = new Set(params.idsLesionadosEmCampo ?? []);
    const lesoes = aplicarLesoesPosPartida(
      jogadores,
      params.idsParticipantes,
      params.seed ^ 0x55,
      mundo,
      jaLesionados,
      { mesAtual: mesDeDataISO(params.brasileirao.dataAtualISO) },
    );
    jogadores = lesoes.jogadores;
    noticias.push(...lesoes.noticias);
  }

  if (viradaTemporada) {
    jogadores = desenvolverElencoFimTemporada(jogadores, mundo, params.clubeId, {
      posicaoTabela: pos,
      vitoriaUser: params.vitoriaUser,
      empateUser: params.empateUser,
      participacoes: mundo.participacoesTemporada,
    });
    jogadores = jogadores.map((j) => ({ ...j, idade: j.idade + 1 }));
    // Sub-20 também envelhece
    const sub20 = (mundo.base.elencoSub20 ?? []).map((j) => ({ ...j, idade: j.idade + 1 }));
    mundo = {
      ...mundo,
      participacoesTemporada: {},
      base: {
        ...mundo.base,
        elencoSub20: sub20,
        promocoesTemporada: 0,
      },
    };
    noticias.push({
      id: `idade_${params.rodada}`,
      data: new Date().toISOString(),
      titulo: 'Virada de temporada',
      texto:
        'Overall do elenco reavaliado (progressão lenta por temporada: até ±4 entre 23–33 anos, até ±8 nos extremos). Idades atualizadas. Nova safra da base disponível.',
    });
  }

  return { jogadores, mundo, noticias, comercial };
}

export function investimentoBaseMensal(nivel: NivelInvestimentoBase): number {
  return nivel === 0 ? 0 : nivel === 1 ? 120_000 : nivel === 2 ? 280_000 : 520_000;
}

export function aplicarFocoBase(mundo: EstadoMundoClube, foco: FocoCategoriaBase): EstadoMundoClube {
  return { ...mundo, base: { ...mundo.base, foco: normalizarFocoBase(foco) } };
}

export function rotuloFocoBase(
  foco: FocoCategoriaBase | string,
): string {
  return rotuloFocoBaseYouth(foco);
}

export function aplicarInvestimentoBase(
  mundo: EstadoMundoClube,
  nivel: NivelInvestimentoBase,
): EstadoMundoClube {
  const qualidade = Math.min(
    20,
    Math.max(
      mundo.base.qualidade,
      8 + nivel * 3 + nivelDiretorBase(mundo) / 3,
    ),
  );
  return {
    ...mundo,
    base: { ...mundo.base, investimentoNivel: nivel, qualidade: Math.round(qualidade) },
  };
}