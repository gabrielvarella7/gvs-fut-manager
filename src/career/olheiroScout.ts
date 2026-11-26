import { mediaAtributosGrupo } from './atributosJogador';
function jogadorDisponivel(j: Jogador): boolean {
  return !j.lesao || j.lesao.diasRestantes <= 0;
}
import { valorMercado } from './playerUtils';
import type { NoticiaCarreira } from './types';
import type { AtributosOlheiro, ProfissionalStaff } from '../types/mundoClube';
import type { Jogador, Time } from '../types/schema';
import { criarRng } from '../engine/matchEngine';
import { clampAttr20 } from './atributosJogador';

export type EixoOlheiro = 'tecnicos' | 'fisicos' | 'mentais' | 'potencial';

const ROTULO_EIXO: Record<EixoOlheiro, string> = {
  tecnicos: 'técnico',
  fisicos: 'físico',
  mentais: 'mental',
  potencial: 'potencial de evolução',
};

function jitterAttr(seed: number, base: number): number {
  const v = (((seed * 1103515245 + 12345) >>> 0) % 5) - 2;
  return clampAttr20(base + v);
}

export function criarAtributosOlheiro(prestigio: number, seed: number): AtributosOlheiro {
  const base = Math.max(6, Math.min(16, Math.round(prestigio / 7)));
  return {
    tecnicos: jitterAttr(seed, base + 1),
    fisicos: jitterAttr(seed + 1, base),
    mentais: jitterAttr(seed + 2, base - 1),
    potencial: jitterAttr(seed + 3, base + 2),
  };
}

export function normalizarAtributosOlheiro(
  staff: ProfissionalStaff,
  prestigio: number,
): ProfissionalStaff {
  if (staff.cargo !== 'OLHEIRO') return staff;
  if (staff.atributosOlheiro) {
    return {
      ...staff,
      nivel: mediaNivelOlheiro(staff.atributosOlheiro),
    };
  }
  const base = staff.nivel || Math.max(6, Math.min(16, Math.round(prestigio / 7)));
  const atributosOlheiro: AtributosOlheiro = {
    tecnicos: base,
    fisicos: base,
    mentais: base,
    potencial: base,
  };
  return { ...staff, atributosOlheiro, nivel: mediaNivelOlheiro(atributosOlheiro) };
}

export function mediaNivelOlheiro(a: AtributosOlheiro): number {
  return Math.round((a.tecnicos + a.fisicos + a.mentais + a.potencial) / 4);
}

export function obterOlheiro(mundo: { staff: ProfissionalStaff[] } | null | undefined): ProfissionalStaff | null {
  if (!mundo) return null;
  const legacy = mundo.staff.find((s) => s.cargo === 'OLHEIRO' || (s.cargo as string) === 'OLHEIRO_BASE');
  return legacy ?? null;
}

export function atributosOlheiroDe(staff: ProfissionalStaff | null, prestigio = 60): AtributosOlheiro {
  if (staff?.atributosOlheiro) return staff.atributosOlheiro;
  const n = staff?.nivel ?? Math.round(prestigio / 7);
  return { tecnicos: n, fisicos: n, mentais: n, potencial: n };
}

function scorePotencialJogador(j: Jogador, olheiroPot: number): number {
  const idadeFator = Math.max(0, 24 - j.idade) / 8;
  const fb = j.formacaoBase;
  const teto = fb?.potencialOvr ?? j.overall + Math.round(4 + idadeFator * 6);
  const gap = Math.max(0, teto - j.overall);
  const confianca = olheiroPot / 20;
  return gap * confianca + (j.idade <= 21 ? 2 : 0);
}

function escolherEixo(
  attrs: AtributosOlheiro,
  elenco: Jogador[],
  rnd: () => number,
): EixoOlheiro {
  const medias = {
    tecnicos:
      elenco.reduce((s, j) => s + mediaAtributosGrupo(j.atributos, 'tecnicos'), 0) /
      Math.max(1, elenco.length),
    fisicos:
      elenco.reduce((s, j) => s + mediaAtributosGrupo(j.atributos, 'fisicos'), 0) /
      Math.max(1, elenco.length),
    mentais:
      elenco.reduce((s, j) => s + mediaAtributosGrupo(j.atributos, 'mentais'), 0) /
      Math.max(1, elenco.length),
  };
  const focos: EixoOlheiro[] = ['tecnicos', 'fisicos', 'mentais', 'potencial'];
  const maiorAttr = focos.reduce(
    (best, e) => (attrs[e] > attrs[best] ? e : best),
    'potencial' as EixoOlheiro,
  );
  if (rnd() < 0.35) return maiorAttr;
  const maisFraco = (['tecnicos', 'fisicos', 'mentais'] as const).reduce((best, e) =>
    medias[e] < medias[best] ? e : best,
  );
  return rnd() < 0.6 ? maisFraco : focos[Math.floor(rnd() * focos.length)]!;
}

function pontuacaoJogadorMercado(j: Jogador, eixo: EixoOlheiro, attrs: AtributosOlheiro): number {
  if (eixo === 'potencial') {
    return scorePotencialJogador(j, attrs.potencial);
  }
  const media = mediaAtributosGrupo(j.atributos, eixo);
  const pesoOlheiro = attrs[eixo] / 20;
  return media * (0.65 + pesoOlheiro * 0.55);
}

export function gerarNoticiaOlheiroMercado(params: {
  jogadores: Jogador[];
  clubeId: string;
  times: Time[];
  olheiro: ProfissionalStaff | null;
  prestigioClube: number;
  rodada: number;
  seed: number;
}): NoticiaCarreira | null {
  const rnd = criarRng(params.seed ^ 0x01a2);
  const attrs = atributosOlheiroDe(params.olheiro, params.prestigioClube);
  const confiancaMedia = mediaNivelOlheiro(attrs) / 20;
  if (rnd() > 0.18 + confiancaMedia * 0.28) return null;

  const elenco = params.jogadores.filter((j) => j.time_id === params.clubeId);
  const mercado = params.jogadores.filter((j) => j.time_id !== params.clubeId && jogadorDisponivel(j));
  if (mercado.length < 6) return null;

  const eixo = escolherEixo(attrs, elenco, rnd);
  const pool =
    eixo === 'potencial' ?
      mercado.filter((j) => j.idade <= 23 && j.overall <= 78)
    : mercado;

  if (pool.length === 0) return null;

  const ranked = pool
    .map((j) => ({ j, score: pontuacaoJogadorMercado(j, eixo, attrs) }))
    .sort((a, b) => b.score - a.score);

  const errou = confiancaMedia < 0.45 && rnd() < 0.35;
  const pick = ranked[errou ? Math.min(ranked.length - 1, 2 + Math.floor(rnd() * 3)) : 0]!.j;
  const timeNome = params.times.find((t) => t.id === pick.time_id)?.nome_curto ?? pick.time_id;
  const agora = new Date().toISOString();

  if (eixo === 'potencial') {
    const teto = pick.formacaoBase?.potencialOvr ?? pick.overall + Math.round(5 + attrs.potencial / 4);
    return {
      id: `olh_pot_${params.rodada}_${pick.id}`,
      data: agora,
      titulo: `Olheiro · aposta com potencial`,
      texto: `${params.olheiro?.nome ?? 'Olheiro'} (potencial ${attrs.potencial}/20) indica ${pick.nome} (${pick.idade}a, ${pick.overall} OVR, ${timeNome}). Projeção até ~${teto} se evoluir. Valor ${Math.round(valorMercado(pick) / 1_000_000)}M.`,
    };
  }

  const media = Math.round(mediaAtributosGrupo(pick.atributos, eixo) * 10) / 10;
  return {
    id: `olh_${eixo}_${params.rodada}_${pick.id}`,
    data: agora,
    titulo: `Olheiro · destaque ${ROTULO_EIXO[eixo]}`,
    texto: `${params.olheiro?.nome ?? 'Olheiro'} (${attrs[eixo]}/20 em ${ROTULO_EIXO[eixo]}) destacou ${pick.nome} — média ${ROTULO_EIXO[eixo]} ${media}/20, ${pick.overall} OVR (${timeNome}). ${
      errou ? 'Relatório contestado pelo departamento.' : 'Boa leitura para reforço.'
    }`,
  };
}