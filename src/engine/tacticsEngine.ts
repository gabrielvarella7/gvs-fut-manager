import { metricasMotorDeAtributos } from '../career/atributosJogador';
import { esquemaOuPadrao } from '../data/esquemasTaticos';
import type { EsquemaTatico, Jogador, Posicao } from '../types/schema';
import type {
  ConfiguracaoTaticaClube,
  DatabaseTaticas,
  DefinicaoEstiloJogo,
  DefinicaoFormacao,
  EstiloJogoId,
  InstrucoesColetivas,
  ModificadoresTaticos,
} from '../types/tactics';
import { INSTRUCOES_PADRAO } from '../types/tactics';

export interface ResultadoAvaliacaoTatica {
  modificadoresFinais: ModificadoresTaticos;
  /** Bônus ou penalidade (-0.18 a +0.18) pela adequação dos 11 titulares */
  adequacaoElencoFator: number;
  /** Bônus ou penalidade (-0.16 a +0.16) pelo encaixe contra a tática rival */
  vantagemConfrontoDireto: number;
  alertasTaticos: string[];
}

const MODIFICADORES_NEUTROS: ModificadoresTaticos = {
  posse_bola: 1,
  criacao_jogadas: 1,
  eficiencia_finalizacao: 1,
  solidez_defensiva: 1,
  perigo_contra_ataque: 1,
  vulnerabilidade_contra_ataque: 1,
  jogo_aereo_ofensivo: 1,
  jogo_aereo_defensivo: 1,
  desgaste_fisico: 1,
  incidencia_faltas: 1,
};

/** Esquema do campinho → id da formação no taticas.json */
export const ESQUEMA_PARA_FORMACAO_DB: Record<EsquemaTatico, string> = {
  '4-3-3': '4-3-3',
  '4-4-2': '4-4-2',
  '4-2-3-1': '4-2-3-1',
  '3-5-2': '3-5-2',
  '3-4-3': '3-4-3',
  '5-4-1': '5-4-1',
  '4-2-4': '4-2-4',
  '3-6-1': '3-6-1',
  '4-5-1': '4-1-4-1',
  '6-3-1': '5-4-1',
  '3-2-5': '4-2-4',
  '2-3-5': '4-2-4',
};

function aplicarParcial(alvo: ModificadoresTaticos, parcial?: Partial<ModificadoresTaticos>): void {
  if (!parcial) return;
  (Object.keys(parcial) as Array<keyof ModificadoresTaticos>).forEach((chave) => {
    const val = parcial[chave];
    if (typeof val === 'number') alvo[chave] *= val;
  });
}

export function formacaoIdDeEsquema(esquema: EsquemaTatico): string {
  return ESQUEMA_PARA_FORMACAO_DB[esquemaOuPadrao(esquema)] ?? '4-4-2';
}

export function configuracaoPadrao(
  esquema: EsquemaTatico,
  estilo: EstiloJogoId = 'VERTICAL_OBJETIVO',
): ConfiguracaoTaticaClube {
  return {
    formacao_id: formacaoIdDeEsquema(esquema),
    estilo_jogo_id: estilo,
    instrucoes: { ...INSTRUCOES_PADRAO },
  };
}

function hashTimeId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function taticaCpuAutomatica(
  esquema: EsquemaTatico,
  timeId: string,
): ConfiguracaoTaticaClube {
  const formacao = formacaoIdDeEsquema(esquema);
  const h = hashTimeId(timeId);
  const estilos: EstiloJogoId[] = [
    'VERTICAL_OBJETIVO',
    'TIKI_TAKA',
    'CONTRA_ATAQUE_DIRETO',
    'GEGENPRESSING',
    'JOGO_PELAS_PONTAS',
    'RETRANCADO_CATIMBA',
  ];
  const alturas: InstrucoesColetivas['altura_linha'][] = ['BAIXA', 'MEDIA', 'ALTA'];
  const marcacoes: InstrucoesColetivas['intensidade_marcacao'][] = [
    'CONTER',
    'EQUILIBRADA',
    'PRESSAO_ALTA',
  ];
  return {
    formacao_id: formacao,
    estilo_jogo_id: estilos[h % estilos.length]!,
    instrucoes: {
      ...INSTRUCOES_PADRAO,
      altura_linha: alturas[(h >> 3) % alturas.length]!,
      intensidade_marcacao: marcacoes[(h >> 5) % marcacoes.length]!,
    },
  };
}

function formacaoPorId(db: DatabaseTaticas, id: string): DefinicaoFormacao {
  return (
    db.formacoes.find((f) => f.id === id) ??
    db.formacoes.find((f) => f.id === '4-4-2') ??
    db.formacoes[0]!
  );
}

function estiloPorId(db: DatabaseTaticas, id: EstiloJogoId): DefinicaoEstiloJogo {
  return (
    db.estilos_jogo.find((e) => e.id === id) ??
    db.estilos_jogo.find((e) => e.id === 'VERTICAL_OBJETIVO') ??
    db.estilos_jogo[0]!
  );
}

function idsConfrontoFormacao(esquema: EsquemaTatico | undefined, formacaoId: string): string[] {
  const ids = new Set<string>([formacaoId]);
  if (esquema) ids.add(ESQUEMA_PARA_FORMACAO_DB[esquema] ?? esquema);
  ids.add(esquema ?? formacaoId);
  return [...ids];
}

function confrontoFormacaoVantagem(
  propria: DefinicaoFormacao,
  idsAdversario: string[],
): 'vantagem' | 'desvantagem' | null {
  if (propria.vantagem_contra.some((id) => idsAdversario.includes(id))) return 'vantagem';
  if (propria.desvantagem_contra.some((id) => idsAdversario.includes(id))) return 'desvantagem';
  return null;
}

/**
 * Avalia adequação dos 11 titulares (cotas da formação + exigências do estilo).
 */
export function calcularAdequacaoElenco(
  titulares: Jogador[],
  formacao: DefinicaoFormacao,
  estilo: DefinicaoEstiloJogo,
  posicoesEscaladas?: Posicao[],
): { fator: number; alertas: string[] } {
  if (titulares.length === 0) {
    return { fator: -0.2, alertas: ['Nenhum titular escalado para a tática.'] };
  }

  const alertas: string[] = [];
  let saldoAdequacao = 0;

  const cotas = { ...formacao.cotas_posicao };
  let improvisados = 0;
  for (let i = 0; i < titulares.length; i++) {
    const j = titulares[i]!;
    const pos = posicoesEscaladas?.[i] ?? j.posicao;
    if ((cotas[pos] ?? 0) > 0) cotas[pos] -= 1;
    else improvisados += 1;
  }

  if (improvisados > 0) {
    saldoAdequacao -= improvisados * 0.04;
    alertas.push(
      `${improvisados} jogador(es) improvisado(s) fora da função ideal no ${formacao.nome}.`,
    );
  }

  const mediaLinha = titulares.filter((j) => j.posicao !== 'GOL');
  const pool = mediaLinha.length > 0 ? mediaLinha : titulares;

  const metricas = pool.map((j) => metricasMotorDeAtributos(j.atributos));
  const avgPasse = metricas.reduce((s, m) => s + m.passe, 0) / metricas.length;
  const avgVelocidade = metricas.reduce((s, m) => s + m.velocidade, 0) / metricas.length;
  const avgDefesa = metricas.reduce((s, m) => s + m.defesa, 0) / metricas.length;
  const avgChute = metricas.reduce((s, m) => s + m.chute, 0) / metricas.length;
  const avgEnergia = pool.reduce((s, j) => s + j.energia, 0) / pool.length;

  const req = estilo.exigencia_minima;

  if (req.passe !== undefined) {
    const diff = (avgPasse - req.passe) / 100;
    saldoAdequacao += Math.max(-0.1, Math.min(0.08, diff));
    if (avgPasse < req.passe - 3) {
      alertas.push(
        `Elenco com passe médio (${avgPasse.toFixed(0)}) abaixo do ideal para ${estilo.nome}.`,
      );
    }
  }

  if (req.velocidade !== undefined) {
    const diff = (avgVelocidade - req.velocidade) / 100;
    saldoAdequacao += Math.max(-0.1, Math.min(0.08, diff));
    if (avgVelocidade < req.velocidade - 3) {
      alertas.push(
        `Elenco lento (${avgVelocidade.toFixed(0)}) para executar ${estilo.nome} com eficiência.`,
      );
    }
  }

  if (req.defesa !== undefined) {
    const diff = (avgDefesa - req.defesa) / 100;
    saldoAdequacao += Math.max(-0.08, Math.min(0.07, diff));
    if (avgDefesa < req.defesa - 4) {
      alertas.push(`Defesa abaixo do necessário para ${estilo.nome}.`);
    }
  }

  if (req.chute !== undefined) {
    const diff = (avgChute - req.chute) / 100;
    saldoAdequacao += Math.max(-0.08, Math.min(0.07, diff));
  }

  if (req.energia_inicial !== undefined && avgEnergia < req.energia_inicial) {
    saldoAdequacao -= 0.06;
    alertas.push('Fôlego inicial baixo compromete a intensidade da marcação.');
  }

  return {
    fator: Math.max(-0.18, Math.min(0.18, +saldoAdequacao.toFixed(3))),
    alertas,
  };
}

export function previewAlertasTatica(
  db: DatabaseTaticas,
  tatica: ConfiguracaoTaticaClube,
  titulares: Jogador[],
  slotsPosicao?: Posicao[],
  taticaAdversaria?: ConfiguracaoTaticaClube,
  esquemaAdversario?: EsquemaTatico,
): string[] {
  if (titulares.length < 1) return ['Escale pelo menos 11 jogadores para ver a adequação.'];
  const formacao = formacaoPorId(db, tatica.formacao_id);
  const estilo = estiloPorId(db, tatica.estilo_jogo_id);
  const adequacao = calcularAdequacaoElenco(titulares, formacao, estilo, slotsPosicao);
  const alertas = [...adequacao.alertas];
  if (taticaAdversaria) {
    const confronto = confrontoFormacaoVantagem(
      formacao,
      idsConfrontoFormacao(esquemaAdversario, taticaAdversaria.formacao_id),
    );
    if (confronto === 'vantagem') {
      alertas.push(
        `Vantagem: ${formacao.nome} encaixa bem contra ${taticaAdversaria.formacao_id}.`,
      );
    } else if (confronto === 'desvantagem') {
      alertas.push(
        `Cuidado: ${formacao.nome} sofre contra o esquema ${taticaAdversaria.formacao_id} do rival.`,
      );
    }
    const estAdv = estiloPorId(db, taticaAdversaria.estilo_jogo_id);
    if (estilo.eficaz_contra_estilos.includes(estAdv.id)) {
      alertas.push(`Estilo ${estilo.nome} costuma prosperar contra ${estAdv.nome}.`);
    } else if (estilo.sofre_contra_estilos.includes(estAdv.id)) {
      alertas.push(`Estilo ${estilo.nome} pode sofrer contra ${estAdv.nome} do adversário.`);
    }
  }
  return alertas;
}

/**
 * Multiplicadores finais (formaçāo + estilo + instruções + elenco + confronto).
 */
export function resolverImpactoTaticoConfronto(params: {
  dbTaticas: DatabaseTaticas;
  taticaPropria: ConfiguracaoTaticaClube;
  taticaAdversaria: ConfiguracaoTaticaClube;
  titularesProprios: Jogador[];
  posicoesEscaladas?: Posicao[];
  esquemaProprio?: EsquemaTatico;
  esquemaAdversario?: EsquemaTatico;
}): ResultadoAvaliacaoTatica {
  const {
    dbTaticas,
    taticaPropria,
    taticaAdversaria,
    titularesProprios,
    posicoesEscaladas,
    esquemaAdversario,
  } = params;

  const formacao = formacaoPorId(dbTaticas, taticaPropria.formacao_id);
  const estilo = estiloPorId(dbTaticas, taticaPropria.estilo_jogo_id);

  const mods: ModificadoresTaticos = { ...MODIFICADORES_NEUTROS };

  aplicarParcial(mods, formacao.modificadores_base);
  aplicarParcial(mods, estilo.modificadores);

  const { instrucoes } = taticaPropria;
  const inst = dbTaticas.instrucoes_coletivas;
  aplicarParcial(mods, inst.altura_linha[instrucoes.altura_linha]);
  aplicarParcial(mods, inst.intensidade_marcacao[instrucoes.intensidade_marcacao]);
  aplicarParcial(mods, inst.ritmo_jogo[instrucoes.ritmo_jogo]);
  aplicarParcial(mods, inst.largura_ataque[instrucoes.largura_ataque]);
  aplicarParcial(mods, inst.foco_passes[instrucoes.foco_passes]);

  const adequacao = calcularAdequacaoElenco(
    titularesProprios,
    formacao,
    estilo,
    posicoesEscaladas,
  );

  let vantagemConfronto = 0;
  const alertasTaticos = [...adequacao.alertas];

  const idsAdv = idsConfrontoFormacao(esquemaAdversario, taticaAdversaria.formacao_id);
  const confronto = confrontoFormacaoVantagem(formacao, idsAdv);
  if (confronto === 'vantagem') {
    vantagemConfronto += 0.09;
    alertasTaticos.push(
      `Vantagem tática: ${formacao.id} encaixa muito bem contra o ${taticaAdversaria.formacao_id} rival.`,
    );
  } else if (confronto === 'desvantagem') {
    vantagemConfronto -= 0.09;
    alertasTaticos.push(
      `Alerta tático: ${formacao.id} sofre inferioridade estrutural contra ${taticaAdversaria.formacao_id}.`,
    );
  }

  const estiloAdv = estiloPorId(dbTaticas, taticaAdversaria.estilo_jogo_id);
  if (estilo.eficaz_contra_estilos.includes(estiloAdv.id)) vantagemConfronto += 0.07;
  else if (estilo.sofre_contra_estilos.includes(estiloAdv.id)) vantagemConfronto -= 0.07;

  vantagemConfronto = Math.max(-0.16, Math.min(0.16, vantagemConfronto));

  const multiplicadorGlobal = 1 + adequacao.fator + vantagemConfronto;
  mods.criacao_jogadas = +(mods.criacao_jogadas * multiplicadorGlobal).toFixed(4);
  mods.eficiencia_finalizacao = +(mods.eficiencia_finalizacao * (1 + adequacao.fator * 0.6)).toFixed(
    4,
  );
  mods.solidez_defensiva = +(
    mods.solidez_defensiva *
    (1 + adequacao.fator * 0.7 + vantagemConfronto * 0.8)
  ).toFixed(4);
  mods.posse_bola = +(mods.posse_bola * (1 + vantagemConfronto * 0.6 + adequacao.fator * 0.4)).toFixed(
    4,
  );

  return {
    modificadoresFinais: mods,
    adequacaoElencoFator: adequacao.fator,
    vantagemConfrontoDireto: +vantagemConfronto.toFixed(3),
    alertasTaticos,
  };
}