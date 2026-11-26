import type { EsquemaTatico, Posicao } from '../types/schema';
import { layoutCampinho } from './campinhoLayout';

/** Posições dos 11 titulares por esquema — alinhado ao campinho.pdf via `campinhoLayout`. */
export const SLOTS_POR_ESQUEMA: Record<EsquemaTatico, Posicao[]> = Object.fromEntries(
  (Object.keys({
    '2-3-5': 1,
    '4-2-4': 1,
    '4-4-2': 1,
    '4-3-3': 1,
    '4-2-3-1': 1,
    '4-5-1': 1,
    '3-6-1': 1,
    '3-2-5': 1,
    '5-4-1': 1,
    '6-3-1': 1,
    '3-5-2': 1,
    '3-4-3': 1,
  }) as EsquemaTatico[]).map((e) => [e, layoutCampinho(e).map((s) => s.pos)]),
) as Record<EsquemaTatico, Posicao[]>;

export const LISTA_ESQUEMAS: EsquemaTatico[] = [
  '4-4-2',
  '4-3-3',
  '4-2-3-1',
  '4-2-4',
  '4-5-1',
  '3-5-2',
  '3-4-3',
  '3-6-1',
  '3-2-5',
  '5-4-1',
  '6-3-1',
  '2-3-5',
];

export const RESUMO_ESQUEMAS: Record<EsquemaTatico, string> = {
  '2-3-5': '2 defensores, 3 meias, 5 atacantes (Pirâmide histórica)',
  '4-2-4': '4 defensores, 2 meias, 4 atacantes',
  '4-4-2': '4 defensores, 4 meias, 2 atacantes — compactação e contra-ataque',
  '4-3-3': '4 defensores, 3 meias, 3 atacantes — amplitude e pressão',
  '4-2-3-1': '4 defesas, 2 volantes, 3 meias, 1 atacante',
  '4-5-1': '4 defesas, 5 meias, 1 atacante — congestão no meio',
  '3-6-1': '3 zagueiros, 6 meias, 1 atacante — posse e domínio',
  '5-4-1': '5 defensores, 4 meias, 1 atacante — retranca ofensiva',
  '6-3-1': '6 defensores, 3 meias, 1 atacante — bloqueio máximo',
  '3-5-2': '3 zagueiros, 5 meias (alas), 2 atacantes',
  '3-4-3': '3 zagueiros, 4 meias, 3 atacantes — largura ofensiva',
  '3-2-5': '3 defensores, 2 volantes, 5 avançados — fase ofensiva',
};

export function esquemaValido(valor: string): valor is EsquemaTatico {
  return Object.hasOwn(SLOTS_POR_ESQUEMA, valor);
}

export function esquemaOuPadrao(valor?: string): EsquemaTatico {
  if (valor && esquemaValido(valor)) return valor;
  return '4-4-2';
}

/** Prioridade: esquema em uso → preferido do técnico → padrão do clube → 4-4-2 */
export function esquemaSugerido(opcoes: {
  atual?: EsquemaTatico;
  preferido?: EsquemaTatico;
  padraoClube?: string;
}): EsquemaTatico {
  if (opcoes.atual && esquemaValido(opcoes.atual)) return opcoes.atual;
  if (opcoes.preferido && esquemaValido(opcoes.preferido)) return opcoes.preferido;
  return esquemaOuPadrao(opcoes.padraoClube);
}