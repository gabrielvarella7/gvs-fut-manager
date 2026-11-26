import { clampAttr20, overallDeAtributos } from '../career/atributosJogador';
import { calcularValorMercado } from '../career/mercadoTransferencias';
import { aplicarAltaMedica, criarLesaoComReabilitacao } from '../career/staffEfeitos';
import type { EstadoMundoClube } from '../types/mundoClube';
import type { GravidadeLesao, Jogador } from '../types/schema';
import type { ModificadoresTaticos } from '../types/tactics';
import type {
  AtributoTreinoXp,
  DatabaseTreinos,
  DefinicaoLesao,
  EstadoTreinoJogador,
  ProfissionalCorpoTecnico,
  ProgramacaoTreinoClube,
} from '../types/training';

export interface RelatorioEvolucaoAtleta {
  jogadorId: number;
  jogadorNome: string;
  atributoAlterado: AtributoTreinoXp;
  valorAnterior: number;
  valorNovo: number;
  tipo: 'EVOLUCAO' | 'REGRESSAO';
}

export interface RelatorioLesaoTreino {
  jogadorId: number;
  jogadorNome: string;
  lesaoNome: string;
  gravidade: string;
  rodadasFora: number;
}

export interface ResultadoSemanaTreino {
  jogadoresAtualizados: Jogador[];
  estadosTreinoAtualizados: EstadoTreinoJogador[];
  programacaoAtualizada: ProgramacaoTreinoClube;
  bonusProximoJogo: Record<string, number>;
  multiplicadorExecucaoTatica: number;
  evolucoes: RelatorioEvolucaoAtleta[];
  novasLesoes: RelatorioLesaoTreino[];
  altasMedicas: string[];
  resumo: string;
}

const CHAVES_ATTR: AtributoTreinoXp[] = ['defesa', 'passe', 'chute', 'velocidade'];

function gravidadeParaSchema(g: DefinicaoLesao['gravidade']): GravidadeLesao {
  if (g === 'GRAVE') return 'GRAVE';
  if (g === 'MODERADA' || g === 'SERIA') return 'MODERADA';
  return 'LEVE';
}

function aplicarPontoAtributo(j: Jogador, attr: AtributoTreinoXp): Jogador {
  const atributos = {
    tecnicos: { ...j.atributos.tecnicos },
    mentais: { ...j.atributos.mentais },
    fisicos: { ...j.atributos.fisicos },
  };
  switch (attr) {
    case 'defesa':
      atributos.mentais.cobertura = clampAttr20(atributos.mentais.cobertura + 1);
      if (j.posicao === 'ZAG' || j.posicao === 'GOL') {
        atributos.tecnicos.cabeceio = clampAttr20(atributos.tecnicos.cabeceio + 1);
      }
      break;
    case 'passe':
      atributos.tecnicos.passe = clampAttr20(atributos.tecnicos.passe + 1);
      atributos.tecnicos.dominio = clampAttr20(atributos.tecnicos.dominio + 1);
      break;
    case 'chute':
      atributos.tecnicos.chute = clampAttr20(atributos.tecnicos.chute + 1);
      break;
    case 'velocidade':
      atributos.fisicos.velocidade = clampAttr20(atributos.fisicos.velocidade + 1);
      break;
    default:
      break;
  }
  const overall = overallDeAtributos(j.posicao, atributos);
  return {
    ...j,
    atributos,
    overall,
    valor_mercado: calcularValorMercado(overall, j.idade, j.posicao),
  };
}

function notaAttrParaRelatorio(j: Jogador, attr: AtributoTreinoXp): number {
  const { tecnicos: t, mentais: m, fisicos: f } = j.atributos;
  if (attr === 'defesa') return m.cobertura;
  if (attr === 'passe') return t.passe;
  if (attr === 'chute') return t.chute;
  return f.velocidade;
}

function obterFaixaEtaria(dbTreinos: DatabaseTreinos, idade: number) {
  return (
    dbTreinos.curva_evolucao_etaria.find((f) => idade >= f.idade_min && idade <= f.idade_max) ?? {
      idade_min: 23,
      idade_max: 29,
      multiplicador_evolucao: 1.0,
      taxa_regressao_mensal: 0.0,
    }
  );
}

function sortearLesao(
  catalogo: DefinicaoLesao[],
  energiaAtual: number,
  rng: () => number,
): DefinicaoLesao {
  const roll = rng();
  if (energiaAtual < 65 && roll < 0.55) return catalogo[0]!;
  if (roll < 0.72) return catalogo[1]!;
  if (roll < 0.88) return catalogo[2]!;
  if (roll < 0.97) return catalogo[3]!;
  return catalogo[4]!;
}

/** Multiplicador de improvisação no motor (−20% padrão · −6% com polivalência concluída). */
/** Familiaridade 45% ≈ −12% execução; 100% + entrosamento alto ≈ +5%. */
export function calcularMultiplicadorExecucao(familiaridade: number, entrosamento: number): number {
  const fam = Math.max(45, Math.min(100, familiaridade));
  const base = 0.88 + ((fam - 45) / 55) * 0.17;
  const ent = (entrosamento / 100) * 0.05;
  return +(Math.min(1.05, Math.max(0.88, base + ent))).toFixed(3);
}

export function improvisacaoMultTreino(estado: EstadoTreinoJogador | undefined): number {
  if (estado && estado.progresso_polivalencia >= 100) return 0.94;
  return 0.8;
}

const MAPA_BONUS_MOD: Partial<Record<string, keyof ModificadoresTaticos>> = {
  posse_bola: 'posse_bola',
  criacao_jogadas: 'criacao_jogadas',
  eficiencia_finalizacao: 'eficiencia_finalizacao',
  solidez_defensiva: 'solidez_defensiva',
  perigo_contra_ataque: 'perigo_contra_ataque',
  vulnerabilidade_contra_ataque: 'vulnerabilidade_contra_ataque',
  jogo_aereo_ofensivo: 'jogo_aereo_ofensivo',
  jogo_aereo_defensivo: 'jogo_aereo_defensivo',
  gol_bola_parada: 'eficiencia_finalizacao',
  defesa_bola_parada: 'solidez_defensiva',
  arrancada_transicao: 'perigo_contra_ataque',
  resistencia_choques: 'solidez_defensiva',
  roubada_campo_ataque: 'criacao_jogadas',
};

export function aplicarBonusTreinoModificadores(
  mods: ModificadoresTaticos,
  bonus: Record<string, number>,
  multExecucao: number,
): ModificadoresTaticos {
  const next = { ...mods };
  for (const [chave, mult] of Object.entries(bonus)) {
    const alvo = MAPA_BONUS_MOD[chave];
    if (alvo && typeof mult === 'number') {
      next[alvo] = +(next[alvo] * mult).toFixed(4);
    }
    if (chave === 'prevencao_fadiga_segundo_tempo' && typeof mult === 'number') {
      next.desgaste_fisico = +(next.desgaste_fisico / mult).toFixed(4);
    }
    if (chave === 'frescor_fisico' && typeof mult === 'number') {
      next.desgaste_fisico = +(next.desgaste_fisico / mult).toFixed(4);
    }
    if (chave === 'gol_bola_parada' && typeof mult === 'number') {
      next.jogo_aereo_ofensivo = +(next.jogo_aereo_ofensivo * Math.sqrt(mult)).toFixed(4);
    }
    if (chave === 'defesa_bola_parada' && typeof mult === 'number') {
      next.jogo_aereo_defensivo = +(next.jogo_aereo_defensivo * Math.sqrt(mult)).toFixed(4);
    }
  }
  const exec = Math.max(0.86, Math.min(1.08, multExecucao));
  next.criacao_jogadas = +(next.criacao_jogadas * exec).toFixed(4);
  next.solidez_defensiva = +(next.solidez_defensiva * exec).toFixed(4);
  next.eficiencia_finalizacao = +(next.eficiencia_finalizacao * exec).toFixed(4);
  return next;
}

export function processarSemanaTreinos(params: {
  dbTreinos: DatabaseTreinos;
  jogadores: Jogador[];
  estadosTreino: EstadoTreinoJogador[];
  programacao: ProgramacaoTreinoClube;
  formacaoAtivaId: string;
  corpoTecnico: ProfissionalCorpoTecnico[];
  clubeId: string;
  overridesPlano?: Map<number, EstadoTreinoJogador['plano_individual_id']>;
  isViradaDeMes?: boolean;
  rng?: () => number;
}): ResultadoSemanaTreino {
  const {
    dbTreinos,
    jogadores,
    estadosTreino,
    programacao,
    formacaoAtivaId,
    corpoTecnico,
    clubeId,
    overridesPlano,
    isViradaDeMes = false,
  } = params;
  const rng = params.rng ?? Math.random;

  const regime =
    dbTreinos.regimes_intensidade.find((r) => r.id === programacao.regime_id) ??
    dbTreinos.regimes_intensidade[1]!;
  const sessaoPrincipal =
    dbTreinos.sessoes_coletivas.find((s) => s.id === programacao.sessao_principal_id) ??
    dbTreinos.sessoes_coletivas[0]!;
  const sessaoSecundaria =
    dbTreinos.sessoes_coletivas.find((s) => s.id === programacao.sessao_secundaria_id) ??
    dbTreinos.sessoes_coletivas[3]!;

  const preparador = corpoTecnico.find((s) => s.cargo === 'PREPARADOR_FISICO');
  const fisiologista = corpoTecnico.find((s) => s.cargo === 'FISIOLOGISTA');
  const fisioterapeuta = corpoTecnico.find((s) => s.cargo === 'FISIOTERAPEUTA');
  const medico = corpoTecnico.find((s) => s.cargo === 'MEDICO');

  const multFadigaPrep = preparador?.efeitos.multiplicador_fadiga_jogo ?? 1.0;
  const multLesaoFisio = fisiologista?.efeitos.multiplicador_chance_lesao ?? 1.0;
  const multTempoFora = fisioterapeuta?.efeitos.multiplicador_tempo_fora ?? 1.0;
  const preservacaoMedicaPct = medico?.efeitos.preservacao_atributos_pct ?? 85;
  const nivelFisio = fisioterapeuta?.nivel ?? 12;
  const nivelMed = medico?.nivel ?? 12;
  const bonusQualidadeComissao =
    1 + ((preparador?.nivel ?? 12) + (fisiologista?.nivel ?? 12) - 24) * 0.012;

  const mapaEstados = new Map<number, EstadoTreinoJogador>();
  for (const est of estadosTreino) {
    mapaEstados.set(est.jogador_id, {
      ...est,
      xp_acumulado: { ...est.xp_acumulado },
      lesao_ativa: est.lesao_ativa ? { ...est.lesao_ativa } : null,
    });
  }

  const jogadoresAtualizados: Jogador[] = [];
  const evolucoes: RelatorioEvolucaoAtleta[] = [];
  const novasLesoes: RelatorioLesaoTreino[] = [];
  const altasMedicas: string[] = [];

  for (const jogadorOriginal of jogadores) {
    if (jogadorOriginal.time_id !== clubeId) {
      jogadoresAtualizados.push(jogadorOriginal);
      continue;
    }

    let jogador: Jogador = {
      ...jogadorOriginal,
      atributos: {
        tecnicos: { ...jogadorOriginal.atributos.tecnicos },
        mentais: { ...jogadorOriginal.atributos.mentais },
        fisicos: { ...jogadorOriginal.atributos.fisicos },
      },
    };

    const estado: EstadoTreinoJogador = mapaEstados.get(jogador.id) ?? {
      jogador_id: jogador.id,
      plano_individual_id:
        overridesPlano?.get(jogador.id) ??
        (jogador.idade >= 32 ? 'MANUTENCAO_VETERANO' : 'MAESTRO_DISTRIBUICAO'),
      xp_acumulado: { defesa: 0, passe: 0, chute: 0, velocidade: 0 },
      progresso_polivalencia: 0,
      lesao_ativa: null,
    };
    if (overridesPlano?.has(jogador.id)) {
      estado.plano_individual_id = overridesPlano.get(jogador.id)!;
    }

    if (estado.lesao_ativa) {
      estado.lesao_ativa.rodadas_restantes -= 1;
      jogador.status_escalacao = 'NAO_RELACIONADO';
      jogador.energia = Math.min(100, jogador.energia + 12);
      jogador.lesao = criarLesaoComReabilitacao(
        estado.lesao_ativa.rodadas_restantes * 6,
        gravidadeParaSchema(estado.lesao_ativa.gravidade),
        estado.lesao_ativa.nome,
        jogador,
        nivelFisio,
      );

      if (estado.lesao_ativa.rodadas_restantes <= 0) {
        const perdaReal = Math.round(
          estado.lesao_ativa.perda_pendente_alta * (1 - preservacaoMedicaPct / 100),
        );
        if (perdaReal > 0 && estado.lesao_ativa.gravidade !== 'LEVE') {
          jogador.atributos.fisicos.velocidade = Math.max(
            1,
            jogador.atributos.fisicos.velocidade - perdaReal,
          );
          jogador = aplicarAltaMedica(jogador, nivelMed);
        } else {
          jogador = aplicarAltaMedica(jogador, nivelMed);
        }
        estado.lesao_ativa = null;
        altasMedicas.push(jogador.nome);
      }

      jogadoresAtualizados.push(jogador);
      mapaEstados.set(jogador.id, estado);
      continue;
    }

    if (jogador.lesao && jogador.lesao.diasRestantes > 0) {
      jogador.lesao = {
        ...jogador.lesao,
        diasRestantes: Math.max(0, jogador.lesao.diasRestantes - 6),
      };
      if (jogador.lesao.diasRestantes <= 0) {
        jogador = aplicarAltaMedica(jogador, nivelMed);
        altasMedicas.push(jogador.nome);
      }
      jogador.status_escalacao = 'NAO_RELACIONADO';
      jogadoresAtualizados.push(jogador);
      mapaEstados.set(jogador.id, estado);
      continue;
    }

    const faixa = obterFaixaEtaria(dbTreinos, jogador.idade);
    const plano =
      dbTreinos.planos_individuais.find((p) => p.id === estado.plano_individual_id) ??
      dbTreinos.planos_individuais[0]!;

    const multMinutagem =
      jogador.status_escalacao === 'TITULAR'
        ? 1.15
        : jogador.status_escalacao === 'RESERVA'
          ? 1.0
          : 0.85;

    for (const attr of CHAVES_ATTR) {
      const baseColetiva =
        sessaoPrincipal.ganho_xp_atributos[attr] * 0.65 +
        sessaoSecundaria.ganho_xp_atributos[attr] * 0.35;
      const baseIndividual = plano.peso_distribuicao[attr] * 1.1;

      const xpGanho =
        (baseColetiva + baseIndividual) *
        11.5 *
        regime.multiplicadores.ganho_xp_atributos *
        faixa.multiplicador_evolucao *
        multMinutagem *
        bonusQualidadeComissao;

      estado.xp_acumulado[attr] += xpGanho;

      if (estado.xp_acumulado[attr] >= 100) {
        const anterior = notaAttrParaRelatorio(jogador, attr);
        jogador = aplicarPontoAtributo(jogador, attr);
        estado.xp_acumulado[attr] -= 100;
        evolucoes.push({
          jogadorId: jogador.id,
          jogadorNome: jogador.nome,
          atributoAlterado: attr,
          valorAnterior: anterior,
          valorNovo: notaAttrParaRelatorio(jogador, attr),
          tipo: 'EVOLUCAO',
        });
      }
    }

    if (plano.id === 'ADAPTACAO_POLIVALENCIA' && estado.progresso_polivalencia < 100) {
      estado.progresso_polivalencia = Math.min(
        100,
        Math.round(
          estado.progresso_polivalencia +
            14 * regime.multiplicadores.ganho_familiaridade_tatica,
        ),
      );
    }

    if (isViradaDeMes && faixa.taxa_regressao_mensal > 0) {
      const fatorProtecao = plano.id === 'MANUTENCAO_VETERANO' ? 0.4 : 1.0;
      if (rng() < faixa.taxa_regressao_mensal * fatorProtecao) {
        const attrAlvo: AtributoTreinoXp =
          jogador.atributos.fisicos.velocidade > 10 ? 'velocidade' : 'defesa';
        const anterior = notaAttrParaRelatorio(jogador, attrAlvo);
        if (attrAlvo === 'velocidade') {
          jogador.atributos.fisicos.velocidade = clampAttr20(
            jogador.atributos.fisicos.velocidade - 1,
          );
        } else {
          jogador.atributos.mentais.cobertura = clampAttr20(
            jogador.atributos.mentais.cobertura - 1,
          );
        }
        jogador.overall = overallDeAtributos(jogador.posicao, jogador.atributos);
        evolucoes.push({
          jogadorId: jogador.id,
          jogadorNome: jogador.nome,
          atributoAlterado: attrAlvo,
          valorAnterior: anterior,
          valorNovo: notaAttrParaRelatorio(jogador, attrAlvo),
          tipo: 'REGRESSAO',
        });
      }
    }

    const recuperacaoBase = jogador.status_escalacao === 'TITULAR' ? 14 : 22;
    const custoSessoes =
      (sessaoPrincipal.custo_energia * 0.65 + sessaoSecundaria.custo_energia * 0.35) *
      multFadigaPrep;
    const deltaEnergia =
      recuperacaoBase +
      regime.multiplicadores.recuperacao_energia_bonus -
      regime.multiplicadores.custo_energia_treino -
      custoSessoes;

    jogador.energia = Math.max(25, Math.min(100, Math.round(jogador.energia + deltaEnergia)));

    const riscoFadiga = jogador.energia < 68 ? 2.4 : jogador.energia < 80 ? 1.35 : 0.75;
    const riscoIdade = jogador.idade >= 33 ? 1.35 : 1.0;
    const riscoPlano = plano.id === 'MANUTENCAO_VETERANO' ? 0.65 : 1.0;

    const probLesaoSemana =
      0.0045 *
      regime.multiplicadores.risco_lesao *
      sessaoPrincipal.multiplicador_risco_lesao *
      riscoFadiga *
      riscoIdade *
      riscoPlano *
      multLesaoFisio;

    if (rng() < probLesaoSemana) {
      const lesaoSorteada = sortearLesao(dbTreinos.catalogo_lesoes, jogador.energia, rng);
      const rodadasReais = Math.max(1, Math.round(lesaoSorteada.rodadas_fora_base * multTempoFora));

      estado.lesao_ativa = {
        lesao_id: lesaoSorteada.id,
        nome: lesaoSorteada.nome,
        gravidade: lesaoSorteada.gravidade,
        rodadas_restantes: rodadasReais,
        perda_pendente_alta: lesaoSorteada.perda_atributo_sem_medico,
      };
      jogador.status_escalacao = 'NAO_RELACIONADO';
      jogador.lesao = criarLesaoComReabilitacao(
        rodadasReais * 6,
        gravidadeParaSchema(lesaoSorteada.gravidade),
        lesaoSorteada.nome,
        jogador,
        nivelFisio,
      );

      novasLesoes.push({
        jogadorId: jogador.id,
        jogadorNome: jogador.nome,
        lesaoNome: lesaoSorteada.nome,
        gravidade: lesaoSorteada.gravidade,
        rodadasFora: rodadasReais,
      });
    }

    jogadoresAtualizados.push(jogador);
    mapaEstados.set(jogador.id, estado);
  }

  const familiaridadeAtual = programacao.familiaridade_formacoes[formacaoAtivaId] ?? 55;
  const ganhoFamiliaridade =
    (sessaoPrincipal.ganho_familiaridade_tatica * 0.65 +
      sessaoSecundaria.ganho_familiaridade_tatica * 0.35) *
    regime.multiplicadores.ganho_familiaridade_tatica;
  const novaFamiliaridade = Math.min(100, Math.round(familiaridadeAtual + ganhoFamiliaridade));

  const ganhoEntrosamento =
    sessaoPrincipal.ganho_entrosamento * 0.65 + sessaoSecundaria.ganho_entrosamento * 0.35;
  const novoEntrosamento = Math.min(
    100,
    Math.round(programacao.entrosamento_elenco + ganhoEntrosamento),
  );

  const bonusProximoJogo: Record<string, number> = {};
  for (const [chave, mult] of Object.entries(sessaoPrincipal.bonus_match_proximo_jogo)) {
    bonusProximoJogo[chave] = +(1 + (mult - 1) * 0.7).toFixed(3);
  }
  for (const [chave, mult] of Object.entries(sessaoSecundaria.bonus_match_proximo_jogo)) {
    const ganhoSec = (mult - 1) * 0.4;
    bonusProximoJogo[chave] = +((bonusProximoJogo[chave] ?? 1) + ganhoSec).toFixed(3);
  }

  const multiplicadorExecucaoTatica = calcularMultiplicadorExecucao(
    novaFamiliaridade,
    novoEntrosamento,
  );

  const partes: string[] = [
    `${regime.nome}: ${sessaoPrincipal.nome} + ${sessaoSecundaria.nome}.`,
    `Familiaridade ${formacaoAtivaId}: ${novaFamiliaridade}% · entrosamento ${novoEntrosamento}%.`,
  ];
  if (evolucoes.filter((e) => e.tipo === 'EVOLUCAO').length > 0) {
    partes.push(`${evolucoes.filter((e) => e.tipo === 'EVOLUCAO').length} evolução(ões) de atributo.`);
  }
  if (novasLesoes.length > 0) {
    partes.push(`Lesões: ${novasLesoes.map((l) => l.jogadorNome).join(', ')}.`);
  }

  return {
    jogadoresAtualizados,
    estadosTreinoAtualizados: Array.from(mapaEstados.values()).filter((e) => {
      const j = jogadoresAtualizados.find((x) => x.id === e.jogador_id);
      return j?.time_id === clubeId;
    }),
    programacaoAtualizada: {
      ...programacao,
      familiaridade_formacoes: {
        ...programacao.familiaridade_formacoes,
        [formacaoAtivaId]: novaFamiliaridade,
      },
      entrosamento_elenco: novoEntrosamento,
    },
    bonusProximoJogo,
    multiplicadorExecucaoTatica,
    evolucoes,
    novasLesoes,
    altasMedicas,
    resumo: partes.join(' '),
  };
}

/** Inicializa familiaridade baixa ao trocar de esquema (penalidade de mudança tática). */
export function registrarMudancaEsquemaTreino(
  programacao: ProgramacaoTreinoClube,
  formacaoAnterior: string | undefined,
  formacaoNova: string,
): ProgramacaoTreinoClube {
  if (formacaoAnterior === formacaoNova) return programacao;
  const fam = { ...programacao.familiaridade_formacoes };
  if (fam[formacaoNova] == null) {
    fam[formacaoNova] = 48 + Math.floor(Math.random() * 10);
  }
  return { ...programacao, familiaridade_formacoes: fam };
}