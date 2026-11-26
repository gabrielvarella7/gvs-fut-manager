import { metricasMotorDeAtributos } from './atributosJogador';
import type { Jogador, Posicao } from '../types/schema';
import { formatarDinheiro, salarioMensal, valorMercado } from './playerUtils';

const POS_LABEL: Record<Posicao, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  VOL: 'Volante',
  MEI: 'Meia',
  ATA: 'Atacante',
};

const STATUS_LABEL = {
  TITULAR: 'Titular',
  RESERVA: 'Reserva',
  NAO_RELACIONADO: 'Fora da lista',
};

export function rotuloPosicao(pos: Posicao): string {
  return POS_LABEL[pos];
}

export function rotuloStatus(s: Jogador['status_escalacao']): string {
  return STATUS_LABEL[s];
}

function destaqueAtributo(nome: string, valor: number, limiar: number): string | null {
  if (valor >= limiar) return nome;
  return null;
}

/** Traços e notas de scouting derivados dos atributos (estável por id). */
export function particularidadesJogador(j: Jogador): { rotulo: string; detalhe: string }[] {
  const { tecnicos: t, mentais: m, fisicos: f } = j.atributos;
  const itens: { rotulo: string; detalhe: string }[] = [];

  const tracos = [
    destaqueAtributo('Finalizador', t.chute, 16),
    destaqueAtributo('Velocista', f.velocidade, 16),
    destaqueAtributo('Armador', t.passe, 17),
    destaqueAtributo('Cobertura', m.cobertura, 16),
    destaqueAtributo('Criador', m.criatividade, 17),
    destaqueAtributo('Bola parada', t.bola_parada, 17),
    destaqueAtributo('Líder', m.lideranca, 17),
    destaqueAtributo('Clutch', m.pressao, 17),
  ].filter(Boolean) as string[];

  if (tracos.length > 0) {
    itens.push({ rotulo: 'Pontos fortes', detalhe: tracos.join(' · ') });
  } else if (j.overall >= 78) {
    itens.push({ rotulo: 'Pontos fortes', detalhe: 'Jogador consistente em todas as fases.' });
  } else {
    itens.push({ rotulo: 'Pontos fortes', detalhe: 'Ainda busca regularidade no elenco.' });
  }

  const fracos: string[] = [];
  if (t.chute < 9 && j.posicao === 'ATA') fracos.push('Finalização');
  if (f.velocidade < 10 && (j.posicao === 'ATA' || j.posicao === 'LAT')) fracos.push('Explosão');
  if (m.cobertura < 9 && (j.posicao === 'ZAG' || j.posicao === 'GOL')) fracos.push('Posicionamento defensivo');
  if (m.criatividade < 10 && j.posicao === 'MEI') fracos.push('Criação de jogadas');
  if (f.fora_por_lesao < 9) fracos.push('Histórico de lesões');
  if (m.agressividade >= 17) fracos.push('Cartões — disciplina');
  itens.push({
    rotulo: 'A desenvolver',
    detalhe: fracos.length ? fracos.join(' · ') : 'Sem fraqueza evidente no relatório.',
  });

  const perna = j.id % 2 === 0 ? 'Canhoto' : 'Destro';
  itens.push({ rotulo: 'Perna boa', detalhe: perna });

  let forma: string;
  if (j.energia >= 92) forma = 'Forma física excelente.';
  else if (j.energia >= 75) forma = 'Pronto para 90 minutos.';
  else if (j.energia >= 55) forma = 'Precisa de rodízio — fadiga acumulada.';
  else forma = 'Baixa energia; risco físico elevado.';
  itens.push({ rotulo: 'Condição', detalhe: `${forma} Energia ${Math.round(j.energia)}%.` });

  if (j.idade <= 21) {
    itens.push({ rotulo: 'Projeção', detalhe: 'Promessa com margem de evolução.' });
  } else if (j.idade >= 33) {
    itens.push({ rotulo: 'Experiência', detalhe: 'Veterano; liderança natural no vestiário.' });
  }

  if (j.status_escalacao === 'TITULAR') {
    itens.push({ rotulo: 'Papel no clube', detalhe: 'Peça fixa na escalação titular.' });
  } else if (j.status_escalacao === 'RESERVA') {
    itens.push({ rotulo: 'Papel no clube', detalhe: 'Entra com frequência; disputa vaga com os titulares.' });
  } else {
    itens.push({ rotulo: 'Papel no clube', detalhe: 'Treina à parte; aguarda convocação.' });
  }

  return itens;
}

export function resumoFinanceiro(j: Jogador) {
  return {
    valor: formatarDinheiro(valorMercado(j)),
    salario: formatarDinheiro(salarioMensal(j)),
    nacionalidade: j.nacionalidade ?? 'Brasil',
  };
}

/** Pentágono estilo SofaScore — derivado dos atributos 1–20. */
export interface VisaoGeralAtributos {
  ATT: number;
  CRE: number;
  DEF: number;
  TAC: number;
  TEC: number;
}

function clampAttr(n: number): number {
  return Math.max(1, Math.min(99, Math.round(n)));
}

export function visaoGeralAtributos(j: Jogador): VisaoGeralAtributos {
  const motor = metricasMotorDeAtributos(j.atributos);
  const { tecnicos: t, mentais: m } = j.atributos;
  const o = j.overall;

  let att = motor.chute * 0.45 + motor.velocidade * 0.34 + t.drible * 5 * 0.12 + o * 0.09;
  let cre = motor.criatividade * 0.72 + motor.passe * 0.18 + t.bola_parada * 5 * 0.1;
  let def = motor.defesa * 0.88 + m.cobertura * 5 * 0.12;
  let tac = m.leitura_jogo * 5 * 0.38 + m.cobertura * 5 * 0.28 + o * 0.22;
  let tec =
    t.dominio * 5 * 0.28 +
    t.passe * 5 * 0.28 +
    t.chute * 5 * 0.2 +
    t.drible * 5 * 0.14 +
    o * 0.1;

  switch (j.posicao) {
    case 'GOL':
      att *= 0.42;
      def *= 1.18;
      cre *= 0.72;
      tac *= 1.12;
      tec *= 0.85;
      break;
    case 'ZAG':
      att *= 0.5;
      def *= 1.2;
      cre *= 0.78;
      tac *= 1.08;
      break;
    case 'LAT':
      att *= 0.72;
      def *= 1.05;
      cre *= 0.88;
      tac *= 0.98;
      tec *= 0.92;
      break;
    case 'VOL':
      att *= 0.62;
      def *= 1.1;
      cre *= 0.9;
      tac *= 1.05;
      break;
    case 'MEI':
      att *= 0.78;
      cre *= 1.12;
      tac *= 0.95;
      tec *= 1.08;
      break;
    case 'ATA':
      att *= 1.14;
      cre *= 1.02;
      def *= 0.72;
      tac *= 0.88;
      tec *= 1.02;
      break;
  }

  return {
    ATT: clampAttr(att),
    CRE: clampAttr(cre),
    DEF: clampAttr(def),
    TAC: clampAttr(tac),
    TEC: clampAttr(tec),
  };
}

/** Referência (contorno) — média típica da posição no elenco ou no overall. */
export function visaoGeralReferencia(j: Jogador): VisaoGeralAtributos {
  const base = visaoGeralAtributos(j);
  const scale = 0.92;
  return {
    ATT: clampAttr(base.ATT * scale),
    CRE: clampAttr(base.CRE * scale),
    DEF: clampAttr(base.DEF * scale),
    TAC: clampAttr(base.TAC * scale),
    TEC: clampAttr(base.TEC * scale),
  };
}

export function corNotaAtributo(valor: number): string {
  if (valor >= 75) return '#4ade80';
  if (valor >= 65) return '#fbbf24';
  if (valor >= 55) return '#fb923c';
  return '#f87171';
}

export const LEGENDA_VISAO_GERAL: { sigla: keyof VisaoGeralAtributos; nome: string }[] = [
  { sigla: 'ATT', nome: 'Ataque' },
  { sigla: 'CRE', nome: 'Criatividade' },
  { sigla: 'DEF', nome: 'Defendendo' },
  { sigla: 'TAC', nome: 'Tático' },
  { sigla: 'TEC', nome: 'Técnico' },
];