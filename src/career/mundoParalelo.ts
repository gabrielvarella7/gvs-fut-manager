import { embaralharNomesVarzea } from '../data/jogadoresVarzea';
import type { EstadoTemporada } from './brasileirao';
import { posicaoDoTime } from './brasileirao';
import {
  gerarAtributosNovos,
  overallDeAtributos,
} from './atributosJogador';
import { criarRng } from '../engine/matchEngine';
import { gerarNoticiaAssistenteMercado } from './assistenteTecnico';
import {
  criarAtributosOlheiro,
  gerarNoticiaOlheiroMercado,
  mediaNivelOlheiro,
  normalizarAtributosOlheiro,
  obterOlheiro,
} from './olheiroScout';
import { nivelDiretorBase } from './staffEfeitos';
import {
  calcularValorMercado,
  inicializarContratoPadrao,
} from './mercadoTransferencias';
import type { Jogador, Posicao, Time } from '../types/schema';
import type { EstadoLesao, GravidadeLesao } from '../types/schema';
import {
  aplicarAltaMedica,
  criarLesaoComReabilitacao,
  multChanceLesaoFisiologista,
  staffEstaAtualizado,
} from './staffEfeitos';
import type {
  CategoriaBase,
  CargoStaff,
  ClimaTorcedor,
  EstadoMundoClube,
  NivelInvestimentoBase,
  FocoCategoriaBase,
  ProfissionalStaff,
  RumorOfertaMercado,
} from '../types/mundoClube';
import type { NoticiaCarreira } from './types';

const POS_BASE: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

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
      foco: 'PROFISSIONALIZAR',
      qualidade: Math.max(8, Math.min(16, Math.round(prestigio / 8))),
      ultimaPromocaoRodada: 0,
      promocoesTemporada: 0,
    },
    pedidosRenovacao: [],
    rumoresOfertas: [],
    climaTorcedor: { indice: 58, sequenciaRuim: 0, sequenciaBoa: 0 },
    rodadaUltimoTick: 0,
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
    base: {
      ...criarEstadoMundoClube(time).base,
      ...estado.base,
      foco: estado.base?.foco ?? 'PROFISSIONALIZAR',
    },
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

function sortearLesao(
  j: Jogador,
  rnd: () => number,
  motivo: string,
  mundo?: EstadoMundoClube | null,
): EstadoLesao | null {
  const resistencia = j.atributos.fisicos.fora_por_lesao;
  const baseChance = motivo === 'jogo' ? 0.09 : 0.018;
  const nivelFisio = mundo?.staff.find((s) => s.cargo === 'FISIOLOGISTA')?.nivel ?? 10;
  const chance =
    baseChance * multChanceLesaoFisiologista(nivelFisio) * (1.1 - resistencia / 24);
  if (rnd() > chance) return null;
  const grav: GravidadeLesao =
    rnd() < 0.55 ? 'LEVE' : rnd() < 0.85 ? 'MODERADA' : 'GRAVE';
  const diasBase =
    grav === 'LEVE' ? 4 + Math.floor(rnd() * 8) : grav === 'MODERADA' ? 12 + Math.floor(rnd() * 14) : 28 + Math.floor(rnd() * 25);
  const tipos = ['muscular', 'entorse', 'contusão', 'panturrilha'];
  const nivelFisioTerapia = mundo?.staff.find((s) => s.cargo === 'FISIOTERAPEUTA')?.nivel ?? 10;
  return criarLesaoComReabilitacao(
    diasBase,
    grav,
    `${tipos[Math.floor(rnd() * tipos.length)]} (${grav.toLowerCase()})`,
    j,
    nivelFisioTerapia,
  );
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
): { jogadores: Jogador[]; noticias: NoticiaCarreira[] } {
  const rnd = criarRng(seed);
  const set = new Set(idsParticipantes);
  const noticias: NoticiaCarreira[] = [];
  const next = jogadores.map((j) => {
    if (!set.has(j.id) || !jogadorDisponivel(j)) return j;
    const lesao = sortearLesao(j, rnd, 'jogo', mundo);
    if (!lesao) return j;
    noticias.push({
      id: `lesao_${j.id}_${seed}`,
      data: new Date().toISOString(),
      titulo: `Lesão: ${j.nome}`,
      texto: `${j.nome} teve ${lesao.descricao} e ficará cerca de ${lesao.diasRestantes} dias afastado.`,
    });
    return { ...j, lesao, energia: Math.min(j.energia, 42) };
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
  const atributos = {
    ...j.atributos,
    tecnicos: { ...j.atributos.tecnicos },
    fisicos: { ...j.atributos.fisicos },
  };
  if (j.idade >= 34) {
    atributos.fisicos.velocidade = Math.max(1, atributos.fisicos.velocidade - 1);
    atributos.tecnicos.drible = Math.max(1, atributos.tecnicos.drible - 1);
  } else if (j.idade >= 31) {
    atributos.fisicos.velocidade = Math.max(1, atributos.fisicos.velocidade - 1);
  }
  const overall = overallDeAtributos(j.posicao, atributos);
  return { ...j, atributos, overall, valor_mercado: calcularValorMercado(overall, j.idade, j.posicao) };
}

function evoluiDaBase(j: Jogador, fatorStaff: number, foco: FocoCategoriaBase): boolean {
  if (j.formacaoBase?.foco !== foco) return false;
  if (foco === 'VENDER') {
    if (j.idade > 21) return false;
    return Math.random() < 0.22 + fatorStaff * 0.42;
  }
  if (j.idade > 24) return false;
  const pot = j.formacaoBase.potencialOvr ?? j.overall + 8;
  if (j.overall >= pot) return Math.random() < 0.08;
  return Math.random() < 0.12 + fatorStaff * 0.18;
}

export function desenvolverElencoPosRodada(
  jogadores: Jogador[],
  mundo: EstadoMundoClube,
  clubeId: string,
): Jogador[] {
  const diretor = nivelDiretorBase(mundo);
  const fatorStaff = (mundo.base.qualidade + diretor) / 40;
  return jogadores.map((j) => {
    if (j.time_id !== clubeId) return j;
    if (j.formacaoBase?.foco === 'VENDER' && evoluiDaBase(j, fatorStaff, 'VENDER')) {
      const foco: (keyof Jogador['atributos']['tecnicos'])[] =
        j.posicao === 'ATA' ? ['chute', 'drible'] : ['passe', 'dominio'];
      return evoluirJogadorUmPonto(j, foco);
    }
    if (j.formacaoBase?.foco === 'PROFISSIONALIZAR' && evoluiDaBase(j, fatorStaff, 'PROFISSIONALIZAR')) {
      const foco: (keyof Jogador['atributos']['tecnicos'])[] =
        j.posicao === 'GOL' ? ['dominio', 'cabeceio']
        : j.posicao === 'ZAG' || j.posicao === 'LAT' ? ['cabeceio', 'passe']
        : j.posicao === 'VOL' ? ['passe', 'lancamentos']
        : j.posicao === 'ATA' ? ['chute', 'drible']
        : ['passe', 'dominio'];
      let next = evoluirJogadorUmPonto(j, foco);
      if (Math.random() < 0.35) next = evoluirJogadorUmPonto(next, foco.slice(0, 2));
      return next;
    }
    if (j.idade > 32) return declinioVeterano(j);
    if (j.idade > 28) {
      if (Math.random() > 0.15 * fatorStaff) return j;
      return declinioVeterano(j);
    }
    if (j.idade > 23) {
      if (Math.random() > 0.22 * fatorStaff) return j;
      return j;
    }
    if (Math.random() > 0.35 + fatorStaff * 0.25) return j;
    const foco: (keyof Jogador['atributos']['tecnicos'])[] =
      j.posicao === 'GOL' ? ['dominio', 'cabeceio']
      : j.posicao === 'ZAG' || j.posicao === 'LAT' ? ['cabeceio', 'passe']
      : j.posicao === 'VOL' ? ['passe', 'lancamentos']
      : j.posicao === 'ATA' ? ['chute', 'drible']
      : ['passe', 'dominio'];
    return evoluirJogadorUmPonto(j, foco.slice(0, 2));
  });
}

export function chancePromocaoBase(mundo: EstadoMundoClube): number {
  const inv = mundo.base.investimentoNivel;
  const diretor = nivelDiretorBase(mundo);
  const olheiro = mediaNivelOlheiro(obterOlheiro(mundo)?.atributosOlheiro ?? {
    tecnicos: 10,
    fisicos: 10,
    mentais: 10,
    potencial: 10,
  });
  const base =
    inv === 0 ? 0.04
    : inv === 1 ? 0.09
    : inv === 2 ? 0.16
    : 0.24;
  return Math.min(
    0.52,
    base + diretor / 115 + olheiro / 320 + mundo.base.qualidade / 250,
  );
}

/** Bônus de força inicial / teto conforme nível do diretor (1–20). */
function parametrosQualidadeBase(diretor: number): { piso: number; bonusTeto: number } {
  const n = Math.max(1, Math.min(20, diretor));
  return {
    piso: 44 + n * 0.55,
    bonusTeto: n * 0.55,
  };
}

function proximoIdJogador(jogadores: Jogador[]): number {
  return jogadores.reduce((m, j) => Math.max(m, j.id), 0) + 1;
}

export function tentarPromoverDaBase(
  jogadores: Jogador[],
  mundo: EstadoMundoClube,
  time: Time,
  rodada: number,
  seed: number,
): { jogadores: Jogador[]; mundo: EstadoMundoClube; noticia: NoticiaCarreira | null } {
  const rnd = criarRng(seed);
  if (rnd() > chancePromocaoBase(mundo)) {
    return { jogadores, mundo, noticia: null };
  }
  const nomes = embaralharNomesVarzea(seed);
  const pos = POS_BASE[Math.floor(rnd() * POS_BASE.length)]!;
  const id = proximoIdJogador(jogadores);
  const foco = mundo.base.foco ?? 'PROFISSIONALIZAR';
  const q = mundo.base.qualidade;
  const inv = mundo.base.investimentoNivel;
  const diretor = nivelDiretorBase(mundo);
  const { piso, bonusTeto } = parametrosQualidadeBase(diretor);

  let idade: number;
  let forcaBase: number;
  let potencialOvr: number | undefined;
  if (foco === 'VENDER') {
    idade = 16 + Math.floor(rnd() * 2);
    const teto = 56 + q * 0.42 + inv * 2.2 + bonusTeto;
    const chao = Math.max(48, piso);
    forcaBase = chao + rnd() * Math.max(4, teto - chao);
    potencialOvr = undefined;
  } else {
    idade = 18 + Math.floor(rnd() * 3);
    const teto = 50 + q * 0.38 + inv * 1.8 + bonusTeto * 1.15;
    const chao = Math.max(40, piso - 4);
    forcaBase = chao + rnd() * Math.max(4, teto - chao);
    potencialOvr = undefined;
  }

  const atributos = gerarAtributosNovos(pos, forcaBase, id, idade, rnd);
  const overall = overallDeAtributos(pos, atributos);
  const olh = obterOlheiro(mundo);
  const attrsOlh = olh?.atributosOlheiro;
  if (foco === 'PROFISSIONALIZAR') {
    const bonusPot = attrsOlh?.potencial ?? 10;
    potencialOvr = Math.min(
      94,
      overall + Math.round(8 + q * 0.55 + inv * 1.8 + diretor * 0.35 + bonusPot * 0.35),
    );
  }

  let promocoesExtra = 0;
  let nomeExtra: string | null = null;
  if (diretor >= 16 && rnd() < (diretor - 14) * 0.04 && overall >= (foco === 'VENDER' ? 68 : 62)) {
    const pos2 = POS_BASE[Math.floor(rnd() * POS_BASE.length)]!;
    const id2 = id + 1;
    const teto2 = forcaBase + 2 + diretor * 0.2;
    const attrs2 = gerarAtributosNovos(pos2, teto2, id2, idade, rnd);
    const ovr2 = overallDeAtributos(pos2, attrs2);
    const { valor_mercado: v2, contrato: c2 } = inicializarContratoPadrao(ovr2, idade, pos2, id2);
    const nome2 = nomes[id2 % nomes.length] ?? `Promessa ${id2}`;
    nomeExtra = nome2;
    promocoesExtra = 1;
    const extra: Jogador = {
      id: id2,
      time_id: time.id,
      nome: nome2,
      idade,
      posicao: pos2,
      atributos: attrs2,
      overall: ovr2,
      energia: 100,
      status_escalacao: foco === 'VENDER' && ovr2 >= 70 ? 'RESERVA' : 'NAO_RELACIONADO',
      valor_mercado: foco === 'VENDER' ? Math.round(v2 * 1.22) : Math.round(v2 * 0.92),
      salario_mensal: c2.salario_clt_mensal + c2.direito_imagem_mensal,
      nacionalidade: 'Brasil',
      contrato: c2,
      formacaoBase: {
        foco,
        promovidoRodada: rodada,
        ...(foco === 'PROFISSIONALIZAR' ?
          { potencialOvr: Math.min(94, ovr2 + Math.round(6 + diretor * 0.4)) }
        : {}),
      },
      suscetibilidade: {
        indice: foco === 'VENDER' ? 55 : 30,
        camada: foco === 'VENDER' ? 'ABERTO_A_PROPOSTAS' : 'RELUTANTE',
        motivo_principal: 'Lote promissor indicado pelo diretor da base.',
      },
    };
    jogadores = [...jogadores, extra];
  }
  const { valor_mercado: valorBase, contrato } = inicializarContratoPadrao(overall, idade, pos, id);
  const valor_mercado =
    foco === 'VENDER' ?
      Math.round(valorBase * (1.28 + (21 - idade) / 30))
    : Math.round(valorBase * 0.92);
  const status_escalacao =
    foco === 'VENDER' && overall >= 70 ? ('RESERVA' as const) : ('NAO_RELACIONADO' as const);
  const novo: Jogador = {
    id,
    time_id: time.id,
    nome: nomes[id % nomes.length] ?? `Promessa ${id}`,
    idade,
    posicao: pos,
    atributos,
    overall,
    energia: 100,
    status_escalacao,
    valor_mercado,
    salario_mensal: contrato.salario_clt_mensal + contrato.direito_imagem_mensal,
    nacionalidade: 'Brasil',
    contrato,
    formacaoBase: {
      foco,
      promovidoRodada: rodada,
      ...(potencialOvr != null ? { potencialOvr } : {}),
    },
    suscetibilidade: {
      indice: foco === 'VENDER' ? 58 : 32,
      camada: foco === 'VENDER' ? 'ABERTO_A_PROPOSTAS' : 'RELUTANTE',
      motivo_principal:
        foco === 'VENDER' ?
          'Formado para render cedo e atrair propostas.'
        : 'Projeto de longo prazo no clube.',
    },
  };
  const noticia: NoticiaCarreira = {
    id: `base_${id}_${rodada}`,
    data: new Date().toISOString(),
    titulo: foco === 'VENDER' ? 'Base · ativo para o mercado' : 'Base · profissionalizado',
    texto:
      (foco === 'VENDER' ?
        `${novo.nome} (${idade} anos, ${pos}) sobe pronto para negociação. Overall ${overall}.`
      : `${novo.nome} (${idade} anos, ${pos}) entra no grupo. OVR ${overall}, potencial ~${potencialOvr}.`) +
      (nomeExtra ? ` Diretor da base também promoveu ${nomeExtra}.` : ''),
  };
  const base: CategoriaBase = {
    ...mundo.base,
    ultimaPromocaoRodada: rodada,
    promocoesTemporada: mundo.base.promocoesTemporada + 1 + promocoesExtra,
  };
  return {
    jogadores: [...jogadores, novo],
    mundo: { ...mundo, base },
    noticia,
  };
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

export function simularMercadoCpuRodada(
  jogadores: Jogador[],
  times: Time[],
  clubeUsuarioId: string,
  rodada: number,
  seed: number,
): { jogadores: Jogador[]; noticias: NoticiaCarreira[]; rumorUsuario: RumorOfertaMercado | null } {
  const rnd = criarRng(seed);
  const noticias: NoticiaCarreira[] = [];
  let rumorUsuario: RumorOfertaMercado | null = null;

  const idsTimes = times.map((t) => t.id).filter((id) => id !== clubeUsuarioId);
  if (idsTimes.length >= 2 && rnd() < 0.45) {
    const vendedor = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    let comprador = idsTimes[Math.floor(rnd() * idsTimes.length)]!;
    if (comprador === vendedor) comprador = idsTimes[(idsTimes.indexOf(vendedor) + 1) % idsTimes.length]!;
    const pool = jogadores.filter((j) => j.time_id === vendedor && j.idade <= 29 && j.overall >= 70);
    const alvo = pool[Math.floor(rnd() * Math.max(pool.length, 1))];
    if (alvo && pool.length > 0) {
      const nomeComp = times.find((t) => t.id === comprador)?.nome ?? comprador;
      const valor = alvo.valor_mercado ?? alvo.overall * 800_000;
      noticias.push({
        id: `merc_cpu_${rodada}_${alvo.id}`,
        data: new Date().toISOString(),
        titulo: 'Movimentação no Brasileirão',
        texto: `${nomeComp} negocia a contratação de ${alvo.nome} (${alvo.overall} OVR) por valores na casa de ${Math.round(valor / 1_000_000)}M.`,
      });
      if (rnd() < 0.35) {
        const next = jogadores.map((j) =>
          j.id === alvo.id ? { ...j, time_id: comprador, status_escalacao: 'RESERVA' as const } : j,
        );
        return { jogadores: next, noticias, rumorUsuario };
      }
    }
  }

  const elencoUser = jogadores.filter((j) => j.time_id === clubeUsuarioId && j.overall >= 74);
  const alvoUser = elencoUser[Math.floor(rnd() * Math.max(elencoUser.length, 1))];
  if (alvoUser && elencoUser.length > 0 && rnd() < 0.28) {
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
}

export function tickMundoPorDia(params: TickDiaMundoParams): {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  noticias: NoticiaCarreira[];
} {
  const rnd = criarRng(rndSeed(params.dataISO, params.clubeId));
  let mundo = params.mundo;
  let jogadores = recuperarLesoesUmDia(params.jogadores, mundo);
  const noticias: NoticiaCarreira[] = [];

  const elenco = jogadores.filter((j) => j.time_id === params.clubeId && jogadorDisponivel(j));
  for (const j of elenco) {
    if (j.status_escalacao === 'NAO_RELACIONADO') continue;
    const lesao = sortearLesao(j, rnd, 'treino', mundo);
    if (!lesao) continue;
    jogadores = jogadores.map((x) => (x.id === j.id ? { ...x, lesao } : x));
    noticias.push({
      id: `lesao_treino_${j.id}_${params.dataISO}`,
      data: `${params.dataISO}T10:00:00.000Z`,
      titulo: `Baixa no treino — ${j.nome}`,
      texto: `${j.nome}: ${lesao.descricao}. Previsão de ${lesao.diasRestantes} dias.`,
    });
    if (noticias.length >= 2) break;
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

  return { jogadores, mundo, noticias };
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
}

export function tickMundoPosRodada(params: TickRodadaMundoParams): {
  jogadores: Jogador[];
  mundo: EstadoMundoClube;
  noticias: NoticiaCarreira[];
} {
  const pos = posicaoDoTime(params.brasileirao.tabela, params.clubeId);
  let mundo = params.mundo;
  let jogadores = decrementarContratosRodada(params.jogadores);
  const noticias: NoticiaCarreira[] = [];

  const clima = atualizarClimaTorcedor(
    mundo.climaTorcedor,
    params.vitoriaUser,
    params.empateUser,
    pos,
  );
  mundo = { ...mundo, climaTorcedor: clima, rodadaUltimoTick: params.rodada };
  noticias.push(...noticiasClimaTorcedor(clima, params.time.nome ?? params.time.nome_completo));

  mundo = gerarPedidosRenovacao(jogadores, mundo, params.rodada, params.clubeId);

  jogadores = desenvolverElencoPosRodada(jogadores, mundo, params.clubeId);

  const promo = tentarPromoverDaBase(jogadores, mundo, params.time, params.rodada, params.seed ^ 0xabc);
  jogadores = promo.jogadores;
  mundo = promo.mundo;
  if (promo.noticia) noticias.push(promo.noticia);

  const mercado = simularMercadoCpuRodada(
    jogadores,
    params.times,
    params.clubeId,
    params.rodada,
    params.seed,
  );
  jogadores = mercado.jogadores;
  noticias.push(...mercado.noticias);
  if (mercado.rumorUsuario) {
    mundo = {
      ...mundo,
      rumoresOfertas: [mercado.rumorUsuario, ...mundo.rumoresOfertas].slice(0, 8),
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
    const lesoes = aplicarLesoesPosPartida(
      jogadores,
      params.idsParticipantes,
      params.seed ^ 0x55,
      mundo,
    );
    jogadores = lesoes.jogadores;
    noticias.push(...lesoes.noticias);
  }

  if (params.rodada > 0 && params.rodada % 38 === 0) {
    jogadores = jogadores.map((j) => ({ ...j, idade: j.idade + 1 }));
    noticias.push({
      id: `idade_${params.rodada}`,
      data: new Date().toISOString(),
      titulo: 'Virada de temporada',
      texto: 'Idades do elenco atualizadas; veteranos podem perder rendimento físico.',
    });
  }

  return { jogadores, mundo, noticias };
}

export function investimentoBaseMensal(nivel: NivelInvestimentoBase): number {
  return nivel === 0 ? 0 : nivel === 1 ? 120_000 : nivel === 2 ? 280_000 : 520_000;
}

export function aplicarFocoBase(mundo: EstadoMundoClube, foco: FocoCategoriaBase): EstadoMundoClube {
  return { ...mundo, base: { ...mundo.base, foco } };
}

export function rotuloFocoBase(foco: FocoCategoriaBase): string {
  return foco === 'VENDER' ? 'Foco: vender' : 'Foco: profissionalizar';
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