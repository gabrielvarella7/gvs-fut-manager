import type { AtributosJogador, EstadoLesao, GravidadeLesao, Jogador } from '../types/schema';
import { overallDeAtributos } from './atributosJogador';
import { calcularValorMercado } from './mercadoTransferencias';
import type { CargoStaff, EstadoMundoClube } from '../types/mundoClube';

const CARGOS_MEDICOS: CargoStaff[] = [
  'MEDICO',
  'FISIOTERAPEUTA',
  'PREPARADOR_FISICO',
  'FISIOLOGISTA',
  'OLHEIRO',
  'DIRETOR_BASE',
  'ASSISTENTE_TECNICO',
];

export function nivelDiretorBase(mundo: EstadoMundoClube | null | undefined): number {
  if (!mundo) return 10;
  const diretor = mundo.staff.find((s) => s.cargo === 'DIRETOR_BASE')?.nivel;
  if (diretor != null) return diretor;
  const o = mundo.staff.find((s) => s.cargo === 'OLHEIRO' || (s.cargo as string) === 'OLHEIRO_BASE');
  return o?.nivel ?? 10;
}

export function nivelStaff(mundo: EstadoMundoClube | null | undefined, cargo: CargoStaff): number {
  if (!mundo) return 10;
  return mundo.staff.find((s) => s.cargo === cargo)?.nivel ?? 10;
}

export {
  multFadigaPreparadorFisico,
  multChanceLesaoFisiologista,
  multDuracaoFisioterapeuta,
  preservacaoAtributosMedico,
  fatorCustoEnergiaPreparador,
} from './departamentoMedico';

import {
  multDuracaoFisioterapeuta as multDuracaoFisio,
  preservacaoAtributosMedico,
} from './departamentoMedico';

function cloneAtributos(a: AtributosJogador): AtributosJogador {
  return {
    tecnicos: { ...a.tecnicos },
    mentais: { ...a.mentais },
    fisicos: { ...a.fisicos },
  };
}

export function criarLesaoComReabilitacao(
  diasBase: number,
  gravidade: GravidadeLesao,
  descricao: string,
  jogador: Jogador,
  nivelFisioterapeuta: number,
  extras?: Partial<Pick<EstadoLesao, 'tipo' | 'rodadasForaBase' | 'lesaoId' | 'sequelaPendente'>>,
): EstadoLesao {
  const dias = Math.max(1, Math.round(diasBase * multDuracaoFisio(nivelFisioterapeuta)));
  return {
    diasRestantes: dias,
    gravidade,
    descricao,
    atributosReferencia: cloneAtributos(jogador.atributos),
    overallReferencia: jogador.overall,
    ...extras,
  };
}

export function aplicarAltaMedica(j: Jogador, nivelMedico: number): Jogador {
  const lesao = j.lesao;
  if (!lesao?.atributosReferencia) {
    const { lesao: _, ...rest } = j;
    return { ...rest, energia: Math.min(100, (j.energia ?? 75) + 10) };
  }

  // Médico elite preserva 100%; DM precário → sequela física (esp. velocidade).
  const preservacao = preservacaoAtributosMedico(nivelMedico);
  const gravidade = lesao.gravidade;
  const maxPerdaCatalogo =
    lesao.sequelaPendente != null
      ? lesao.sequelaPendente
      : gravidade === 'GRAVE'
        ? 5
        : gravidade === 'SERIA'
          ? 4
          : gravidade === 'MODERADA'
            ? 3
            : 2;
  const perda = Math.round((1 - preservacao) * maxPerdaCatalogo);

  let atributos = cloneAtributos(lesao.atributosReferencia);
  const overallRef = lesao.overallReferencia ?? overallDeAtributos(j.posicao, atributos);

  if (perda > 0) {
    atributos.fisicos.velocidade = Math.max(1, atributos.fisicos.velocidade - perda);
    if (perda > 2) {
      atributos.fisicos.forca = Math.max(1, atributos.fisicos.forca - 1);
    }
  }

  const overall =
    perda === 0 ? overallRef : Math.max(40, overallDeAtributos(j.posicao, atributos));
  const { lesao: _, ...rest } = j;

  return {
    ...rest,
    atributos,
    overall,
    valor_mercado: calcularValorMercado(overall, j.idade, j.posicao, j),
    energia: Math.min(100, Math.max(55, (j.energia ?? 60) + 12)),
  };
}

export function staffEstaAtualizado(staff: { cargo: CargoStaff | string }[]): boolean {
  return CARGOS_MEDICOS.every((c) =>
    staff.some(
      (s) => s.cargo === c || (c === 'OLHEIRO' && s.cargo === 'OLHEIRO_BASE'),
    ),
  );
}