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

export function multFadigaPreparadorFisico(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return 1.2 - (n / 20) * 0.48;
}

export function multChanceLesaoFisiologista(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return 1.14 - (n / 20) * 0.54;
}

export function multDuracaoFisioterapeuta(nivel: number): number {
  const n = Math.max(1, Math.min(20, nivel));
  return 1.28 - (n / 20) * 0.58;
}

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
): EstadoLesao {
  const dias = Math.max(2, Math.round(diasBase * multDuracaoFisioterapeuta(nivelFisioterapeuta)));
  return {
    diasRestantes: dias,
    gravidade,
    descricao,
    atributosReferencia: cloneAtributos(jogador.atributos),
    overallReferencia: jogador.overall,
  };
}

export function aplicarAltaMedica(j: Jogador, nivelMedico: number): Jogador {
  const lesao = j.lesao;
  if (!lesao?.atributosReferencia) {
    const { lesao: _, ...rest } = j;
    return { ...rest, energia: Math.min(100, (j.energia ?? 75) + 10) };
  }

  const qualidade = Math.max(1, Math.min(20, nivelMedico)) / 20;
  const gravidade = lesao.gravidade;
  const maxPerda = gravidade === 'GRAVE' ? 5 : gravidade === 'MODERADA' ? 3 : 2;
  const perda = Math.round((1 - qualidade) * maxPerda);

  let atributos = cloneAtributos(lesao.atributosReferencia);
  const overallRef = lesao.overallReferencia ?? overallDeAtributos(j.posicao, atributos);

  if (perda > 0) {
    const grupos = ['tecnicos', 'mentais', 'fisicos'] as const;
    for (let i = 0; i < perda; i++) {
      const g = grupos[i % grupos.length]!;
      const registro = atributos[g] as Record<string, number>;
      const keys = Object.keys(registro);
      const k = keys[(i * 7 + j.id) % keys.length]!;
      registro[k] = Math.max(1, registro[k]! - 1);
    }
  }

  const overall =
    perda === 0 ? overallRef : Math.max(40, overallDeAtributos(j.posicao, atributos));
  const { lesao: _, ...rest } = j;

  return {
    ...rest,
    atributos,
    overall,
    valor_mercado: calcularValorMercado(overall, j.idade, j.posicao),
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