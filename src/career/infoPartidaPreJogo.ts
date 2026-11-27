import type { CampeonatoConfig, Time } from '../types/schema';
import type { PartidaCampeonato } from './brasileirao';

/** Árbitros CBF fictícios — seleção determinística por partida. */
const ARBITROS = [
  { nome: 'Wilton Pereira Sampaio', uf: 'GO', mediaAmarelos: 4.82, mediaVermelhos: 0.31 },
  { nome: 'Raphael Claus', uf: 'SP', mediaAmarelos: 5.12, mediaVermelhos: 0.28 },
  { nome: 'Anderson Daronco', uf: 'RS', mediaAmarelos: 4.55, mediaVermelhos: 0.22 },
  { nome: 'Bruno Arleu de Araújo', uf: 'RJ', mediaAmarelos: 5.38, mediaVermelhos: 0.35 },
  { nome: 'Flávio Rodrigues de Souza', uf: 'SP', mediaAmarelos: 4.91, mediaVermelhos: 0.27 },
  { nome: 'Luiz Flávio de Oliveira', uf: 'SP', mediaAmarelos: 5.05, mediaVermelhos: 0.29 },
  { nome: 'Bráulio da Silva Machado', uf: 'SC', mediaAmarelos: 4.68, mediaVermelhos: 0.24 },
  { nome: 'Rodrigo José Pereira de Lima', uf: 'PB', mediaAmarelos: 5.21, mediaVermelhos: 0.33 },
  { nome: 'Sávio Pereira Sampaio', uf: 'DF', mediaAmarelos: 4.74, mediaVermelhos: 0.26 },
  { nome: 'Paulo Cesar Zanovelli', uf: 'MG', mediaAmarelos: 5.01, mediaVermelhos: 0.3 },
  { nome: 'Magna Alves dos Santos', uf: 'PB', mediaAmarelos: 4.45, mediaVermelhos: 0.19 },
  { nome: 'Deborah Cecília Cruz Correia', uf: 'PE', mediaAmarelos: 4.62, mediaVermelhos: 0.21 },
] as const;

const HORARIOS = ['16:00', '18:00', '18:30', '19:00', '20:00', '21:00', '21:30'] as const;

const UF_NOME: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export interface InfoArbitroPreJogo {
  nome: string;
  uf: string;
  mediaAmarelos: number;
  mediaVermelhos: number;
}

export interface InfoLocalPreJogo {
  estadio: string;
  cidade: string;
  estado: string;
  /** Ex.: "Rio de Janeiro, RJ" */
  localizacao: string;
  capacidade?: number;
}

export interface InfoPartidaPreJogo {
  dataISO: string;
  /** dd/mm/yyyy */
  dataFormatada: string;
  horario: string;
  campeonatoNome: string;
  rodada: number;
  /** Ex.: "Futebol, Campeonato Brasileiro Série A 2026, Rodada 1" */
  campeonatoLinha: string;
  arbitro: InfoArbitroPreJogo;
  local: InfoLocalPreJogo;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function formatarDataCurta(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function localizacaoTime(time: Time): { cidade: string; estado: string; localizacao: string } {
  const estado = time.estado || '—';
  const cidade = time.cidade?.trim() || UF_NOME[estado] || estado;
  const localizacao =
    time.cidade?.trim()
      ? `${time.cidade.trim()}, ${estado}`
      : UF_NOME[estado]
        ? `${UF_NOME[estado]}, ${estado}`
        : estado;
  return { cidade, estado, localizacao };
}

/**
 * Monta cartões de informação do confronto (data/hora, campeonato, árbitro, local).
 * Árbitro e horário são determinísticos a partir do id da partida.
 */
export function montarInfoPartidaPreJogo(opts: {
  partida: PartidaCampeonato;
  campeonato: CampeonatoConfig;
  mandante: Time;
  /** Campo neutro / clássico — usa texto especial no estádio. */
  campoNeutro?: boolean;
}): InfoPartidaPreJogo {
  const { partida, campeonato, mandante } = opts;
  const seed = hashStr(`${partida.id}|${partida.mandanteId}|${partida.visitanteId}|${partida.dataISO}`);
  const arb = ARBITROS[seed % ARBITROS.length]!;
  const horario = HORARIOS[(seed >>> 8) % HORARIOS.length]!;
  const loc = localizacaoTime(mandante);
  const neutro = opts.campoNeutro ?? partida.campoNeutro ?? false;

  return {
    dataISO: partida.dataISO,
    dataFormatada: formatarDataCurta(partida.dataISO),
    horario,
    campeonatoNome: campeonato.nome,
    rodada: partida.rodada,
    campeonatoLinha: `Futebol, ${campeonato.nome}, Rodada ${partida.rodada}`,
    arbitro: {
      nome: arb.nome,
      uf: arb.uf,
      mediaAmarelos: arb.mediaAmarelos,
      mediaVermelhos: arb.mediaVermelhos,
    },
    local: {
      estadio: neutro ? 'Campo neutro' : mandante.estadio,
      cidade: loc.cidade,
      estado: loc.estado,
      localizacao: neutro ? 'Local a definir' : loc.localizacao,
      capacidade: neutro ? undefined : mandante.capacidade_estadio ?? mandante.capacidade,
    },
  };
}
