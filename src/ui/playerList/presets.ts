import { valorMercado } from '../../career/playerUtils';
import type { Jogador, Posicao } from '../../types/schema';
import type { AtletaSub23 } from '../../types/aspirantesS23';
import type { JovemSub20 } from '../../types/mundoClube';
import type { PlayerListAccessors, PlayerListSortOption } from './playerListQuery';

export const jogadorAccessors: PlayerListAccessors<Jogador> = {
  nome: (j) => j.nome,
  posicao: (j) => j.posicao,
  overall: (j) => j.overall,
  idade: (j) => j.idade,
  valor: (j) => valorMercado(j),
};

export const SORT_ELENCO: PlayerListSortOption[] = [
  { id: 'nome', label: 'Nome', field: 'nome', defaultDir: 'asc' },
  { id: 'pos', label: 'Pos', field: 'posicao', defaultDir: 'asc' },
  { id: 'idade', label: 'Id', field: 'idade', defaultDir: 'asc' },
  { id: 'ovr', label: 'OVR', field: 'overall', defaultDir: 'desc' },
  { id: 'energia', label: 'Energia', field: 'energia', defaultDir: 'desc' },
  { id: 'valor', label: 'Valor', field: 'valor', defaultDir: 'desc' },
  { id: 'salario', label: 'Salário', field: 'salario', defaultDir: 'desc' },
  { id: 'status', label: 'Status', field: 'status', defaultDir: 'asc' },
];

/** Accessors do elenco profissional com extras usados na tabela. */
export function jogadorElencoAccessors(
  extras: PlayerListAccessors<Jogador>['extra'],
): PlayerListAccessors<Jogador> {
  return { ...jogadorAccessors, extra: extras };
}

export const SORT_MERCADO: PlayerListSortOption[] = [
  { id: 'nome', label: 'Nome', field: 'nome', defaultDir: 'asc' },
  { id: 'pos', label: 'Posição', field: 'posicao', defaultDir: 'asc' },
  { id: 'ovr', label: 'OVR', field: 'overall', defaultDir: 'desc' },
  { id: 'valor', label: 'Valor', field: 'valor', defaultDir: 'desc' },
  { id: 'idade', label: 'Idade', field: 'idade', defaultDir: 'asc' },
];

export const SORT_VENDER: PlayerListSortOption[] = [
  { id: 'nome', label: 'Nome', field: 'nome', defaultDir: 'asc' },
  { id: 'pos', label: 'Posição', field: 'posicao', defaultDir: 'asc' },
  { id: 'ovr', label: 'OVR', field: 'overall', defaultDir: 'desc' },
  { id: 'valor', label: 'Valor de mercado', field: 'valor', defaultDir: 'desc' },
];

export const jovemAccessors: PlayerListAccessors<AtletaSub23 | JovemSub20> = {
  nome: (j) => j.nome,
  posicao: (j) => j.posicao as Posicao,
  overall: (j) => j.overall,
  idade: (j) => j.idade,
  extra: {
    potencial: (j) => j.potencialOvr,
  },
};

export const SORT_JOVEM: PlayerListSortOption[] = [
  { id: 'nome', label: 'Nome', field: 'nome', defaultDir: 'asc' },
  { id: 'pos', label: 'Posição', field: 'posicao', defaultDir: 'asc' },
  { id: 'idade', label: 'Idade', field: 'idade', defaultDir: 'asc' },
  { id: 'ovr', label: 'OVR', field: 'overall', defaultDir: 'desc' },
  { id: 'potencial', label: 'Potencial', field: 'potencial', defaultDir: 'desc' },
];
