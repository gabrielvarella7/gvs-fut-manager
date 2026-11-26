import type { MicrocicloTreino } from '../types/mundoClube';
import type { Jogador, Posicao } from '../types/schema';
import { clampAttr20, overallDeAtributos } from './atributosJogador';
import { calcularValorMercado } from './mercadoTransferencias';

export const MICROCICLOS: {
  id: MicrocicloTreino;
  titulo: string;
  emoji: string;
  resumo: string;
}[] = [
  {
    id: 'tatico',
    titulo: 'Quadra final',
    emoji: '▶',
    resumo: 'Criação e bola parada — foco técnico. -6 energia.',
  },
  {
    id: 'fisico',
    titulo: 'Sprint & força',
    emoji: '◆',
    resumo: 'Resistência e explosão. -10 energia.',
  },
  {
    id: 'mental',
    titulo: 'Sala de vídeo',
    emoji: '◎',
    resumo: 'Leitura e liderança. -4 energia.',
  },
  {
    id: 'regeneracao',
    titulo: 'Dia off',
    emoji: '◇',
    resumo: 'Recuperação coletiva. +16 energia.',
  },
];

function chavesTecnicas(pos: Posicao): (keyof Jogador['atributos']['tecnicos'])[] {
  if (pos === 'GOL') return ['dominio', 'passe'];
  if (pos === 'ZAG' || pos === 'LAT') return ['cabeceio', 'passe'];
  if (pos === 'VOL') return ['passe', 'lancamentos'];
  if (pos === 'ATA') return ['chute', 'drible'];
  return ['passe', 'dominio'];
}

function chavesFisicas(pos: Posicao): (keyof Jogador['atributos']['fisicos'])[] {
  if (pos === 'GOL') return ['forca', 'velocidade'];
  if (pos === 'ATA') return ['velocidade', 'forca'];
  return ['velocidade', 'forca'];
}

function chavesMentais(): (keyof Jogador['atributos']['mentais'])[] {
  return ['leitura_jogo', 'lideranca'];
}

function disponivel(j: Jogador): boolean {
  return !j.lesao || j.lesao.diasRestantes <= 0;
}

function recalcular(j: Jogador): Jogador {
  const overall = overallDeAtributos(j.posicao, j.atributos);
  return {
    ...j,
    overall,
    valor_mercado: calcularValorMercado(overall, j.idade, j.posicao),
  };
}

function bumpGrupo<T extends Record<string, number>>(grupo: T, keys: (keyof T)[], extra = 0): T {
  const next = { ...grupo };
  for (const k of keys) {
    const add = 1 + (extra > 0 ? 1 : 0);
    next[k] = clampAttr20((next[k] ?? 10) + add);
    if (extra > 0) extra -= 1;
  }
  return next;
}

export interface ResultadoTreino {
  jogadores: Jogador[];
  relatorio: string;
  evoluiram: number;
}

export function aplicarMicrocicloTreino(params: {
  jogadores: Jogador[];
  clubeId: string;
  microciclo: MicrocicloTreino;
  destaques: number[];
  nivelPreparador: number;
  janelaIdadeEvoluir?: boolean;
}): ResultadoTreino {
  const dest = new Set(params.destaques.slice(0, 3));
  const bonusPrep = Math.max(0, (params.nivelPreparador - 10) * 0.15);
  let evoluiram = 0;
  const nomes: string[] = [];

  const next = params.jogadores.map((j) => {
    if (j.time_id !== params.clubeId) return j;
    if (!disponivel(j)) return j;

    const destaque = dest.has(j.id);
    const atributos = {
      ...j.atributos,
      tecnicos: { ...j.atributos.tecnicos },
      fisicos: { ...j.atributos.fisicos },
      mentais: { ...j.atributos.mentais },
    };
    let energia = j.energia ?? 70;

    if (params.microciclo === 'regeneracao') {
      energia = Math.min(100, energia + Math.round(16 + bonusPrep * 4));
      return { ...j, energia };
    }

    const velhoOvr = j.overall;

    if (params.microciclo === 'tatico') {
      atributos.tecnicos = bumpGrupo(
        atributos.tecnicos,
        chavesTecnicas(j.posicao),
        destaque && j.idade <= 28 ? 1 : 0,
      );
      energia = Math.max(12, energia - 6);
    } else if (params.microciclo === 'fisico') {
      atributos.fisicos = bumpGrupo(
        atributos.fisicos,
        chavesFisicas(j.posicao),
        destaque ? 1 : 0,
      );
      energia = Math.max(10, energia - Math.round(10 - bonusPrep));
    } else if (params.microciclo === 'mental') {
      atributos.mentais = bumpGrupo(atributos.mentais, chavesMentais(), destaque ? 1 : 0);
      energia = Math.max(18, energia - 4);
    }

    const atualizado = recalcular({ ...j, atributos, energia });
    if (atualizado.overall > velhoOvr) {
      evoluiram += 1;
      if (destaque) nomes.push(`${j.nome} (${velhoOvr}→${atualizado.overall})`);
    }
    return atualizado;
  });

  const bloco = MICROCICLOS.find((m) => m.id === params.microciclo)!;
  const extra =
    nomes.length > 0 ? ` Destaques: ${nomes.join(', ')}.` : evoluiram > 0 ? ` ${evoluiram} evoluíram de OVR.` : '';

  return {
    jogadores: next,
    evoluiram,
    relatorio: `${bloco.titulo} aplicado.${extra}`,
  };
}