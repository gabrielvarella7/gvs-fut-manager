import type { Time } from '../types/schema';

export type ModeloGestaoClube = 'TRADICIONAL' | 'SAF' | 'SAF_MULTINACIONAL';

export interface PerfilComercialClube {
  /** Marca institucional / apelo nacional (1–99). */
  prestigio_marca: number;
  /** Tamanho da torcida e base consumidora (1–100). */
  indice_torcida: number;
  /** Média ponderada de desempenho nos últimos ~5 anos (1–100). */
  desempenho_recente: number;
  modelo_gestao: ModeloGestaoClube;
  /** Capacidade real do estádio (público máximo). */
  capacidade_estadio: number;
}

/** Dados editoriais — cruzam com `times.json` (override por campo opcional no Time). */
const PERFIS_SLUG: Record<string, PerfilComercialClube> = {
  flamengo: {
    prestigio_marca: 94,
    indice_torcida: 98,
    desempenho_recente: 88,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 78_838,
  },
  palmeiras: {
    prestigio_marca: 92,
    indice_torcida: 82,
    desempenho_recente: 90,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 55_000,
  },
  corinthians: {
    prestigio_marca: 88,
    indice_torcida: 96,
    desempenho_recente: 58,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 49_205,
  },
  sao_paulo: {
    prestigio_marca: 90,
    indice_torcida: 94,
    desempenho_recente: 72,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 66_795,
  },
  fluminense: {
    prestigio_marca: 86,
    indice_torcida: 75,
    desempenho_recente: 78,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 78_838,
  },
  gremio: {
    prestigio_marca: 87,
    indice_torcida: 88,
    desempenho_recente: 70,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 55_662,
  },
  internacional: {
    prestigio_marca: 85,
    indice_torcida: 85,
    desempenho_recente: 65,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 50_042,
  },
  atletico_mg: {
    prestigio_marca: 86,
    indice_torcida: 80,
    desempenho_recente: 82,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 47_155,
  },
  cruzeiro: {
    prestigio_marca: 84,
    indice_torcida: 78,
    desempenho_recente: 75,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 62_160,
  },
  botafogo: {
    prestigio_marca: 84,
    indice_torcida: 72,
    desempenho_recente: 80,
    modelo_gestao: 'SAF',
    capacidade_estadio: 44_611,
  },
  vasco: {
    prestigio_marca: 83,
    indice_torcida: 82,
    desempenho_recente: 62,
    modelo_gestao: 'SAF',
    capacidade_estadio: 24_584,
  },
  bahia: {
    prestigio_marca: 81,
    indice_torcida: 76,
    desempenho_recente: 68,
    modelo_gestao: 'SAF_MULTINACIONAL',
    capacidade_estadio: 50_025,
  },
  santos: {
    prestigio_marca: 82,
    indice_torcida: 70,
    desempenho_recente: 55,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 16_798,
  },
  athletico_pr: {
    prestigio_marca: 83,
    indice_torcida: 68,
    desempenho_recente: 76,
    modelo_gestao: 'SAF',
    capacidade_estadio: 42_372,
  },
  bragantino: {
    prestigio_marca: 78,
    indice_torcida: 35,
    desempenho_recente: 72,
    modelo_gestao: 'SAF_MULTINACIONAL',
    capacidade_estadio: 17_000,
  },
  vitoria: {
    prestigio_marca: 76,
    indice_torcida: 65,
    desempenho_recente: 52,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 35_981,
  },
  coritiba: {
    prestigio_marca: 75,
    indice_torcida: 58,
    desempenho_recente: 48,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 31_546,
  },
  chapecoense: {
    prestigio_marca: 70,
    indice_torcida: 42,
    desempenho_recente: 45,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 20_000,
  },
  remo: {
    prestigio_marca: 68,
    indice_torcida: 40,
    desempenho_recente: 50,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 45_007,
  },
  mirassol: {
    prestigio_marca: 72,
    indice_torcida: 28,
    desempenho_recente: 60,
    modelo_gestao: 'TRADICIONAL',
    capacidade_estadio: 14_534,
  },
};

const DEFAULT_PERFIL: PerfilComercialClube = {
  prestigio_marca: 72,
  indice_torcida: 50,
  desempenho_recente: 60,
  modelo_gestao: 'TRADICIONAL',
  capacidade_estadio: 35_000,
};

export function slugDoClube(time: Pick<Time, 'id' | 'slug'>): string {
  return (time.slug ?? time.id).toLowerCase();
}

export function resolverPerfilComercial(time: Time): PerfilComercialClube & { slug: string } {
  const slug = slugDoClube(time);
  const base = PERFIS_SLUG[slug] ?? { ...DEFAULT_PERFIL, prestigio_marca: time.forca_geral };
  return {
    ...base,
    slug,
    prestigio_marca: time.prestigio ?? base.prestigio_marca,
    indice_torcida: time.indice_torcida ?? base.indice_torcida,
    desempenho_recente: time.desempenho_recente ?? base.desempenho_recente,
    modelo_gestao: time.modelo_gestao ?? base.modelo_gestao,
    capacidade_estadio: time.capacidade_estadio ?? base.capacidade_estadio ?? time.capacidade,
  };
}

/** Prestígio efetivo usado em mercado, TV e patrocínio. */
export function prestigioComercial(time: Time): number {
  const p = resolverPerfilComercial(time);
  const bonusSaf =
    p.modelo_gestao === 'SAF_MULTINACIONAL' ? 3 : p.modelo_gestao === 'SAF' ? 1 : 0;
  const bonusDesempenho = (p.desempenho_recente - 60) * 0.06;
  return Math.max(48, Math.min(99, Math.round(p.prestigio_marca + bonusSaf + bonusDesempenho)));
}

export function capacidadeComercial(time: Time): number {
  return resolverPerfilComercial(time).capacidade_estadio;
}

export function fatorComercialClube(time: Time): number {
  const p = resolverPerfilComercial(time);
  const fPrestigio = Math.pow(prestigioComercial(time) / 75, 2.1);
  const fTorcida = 0.72 + (p.indice_torcida / 100) * 0.58;
  const fDesempenho = 0.85 + (p.desempenho_recente / 100) * 0.32;
  const fSaf =
    p.modelo_gestao === 'SAF_MULTINACIONAL'
      ? 1.1
      : p.modelo_gestao === 'SAF'
        ? 1.04
        : 1;
  return fPrestigio * fTorcida * fDesempenho * fSaf;
}

export function rotuloModeloGestao(modelo: ModeloGestaoClube): string {
  switch (modelo) {
    case 'SAF_MULTINACIONAL':
      return 'SAF · grupo multinacional (ex.: City)';
    case 'SAF':
      return 'SAF';
    default:
      return 'Associação tradicional';
  }
}