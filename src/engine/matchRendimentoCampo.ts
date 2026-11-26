import { metricasMotorDeAtributos } from '../career/atributosJogador';
import type { CelulaGrade } from '../data/gradeCampinho';
import { multiplicadorDesempenhoPosicao } from './posicaoCompatibilidade';

const IMPROV_PADRAO = 0.8;
import type { AtributosJogador, Jogador, Posicao } from '../types/schema';

export type ZonaCampo = 'GOL' | 'DEF' | 'VOL' | 'MC' | 'MO' | 'ATA';

function escala(n20: number): number {
  return Math.max(5, Math.min(100, n20 * 5));
}

export function zonaDaCelula(c: CelulaGrade): ZonaCampo {
  if (c.gol) return 'GOL';
  if (c.row === 4) return 'DEF';
  if (c.row === 3) return 'VOL';
  if (c.row === 2) return 'MC';
  if (c.row === 1) return 'MO';
  return 'ATA';
}

export function zonaFallbackPosicao(pos: Posicao): ZonaCampo {
  if (pos === 'GOL') return 'GOL';
  if (pos === 'ZAG' || pos === 'LAT') return 'DEF';
  if (pos === 'VOL') return 'VOL';
  if (pos === 'MEI') return 'MC';
  return 'ATA';
}

/** Cruza atributos 1–20 com a faixa onde o jogador está no campinho. */
export function rendimentoAtributosNaZona(atributos: AtributosJogador, zona: ZonaCampo): number {
  const { tecnicos: t, mentais: m, fisicos: f } = atributos;

  switch (zona) {
    case 'GOL':
      return (
        escala(t.dominio) * 0.32 +
        escala(m.cobertura) * 0.28 +
        escala(m.leitura_jogo) * 0.22 +
        escala(m.pressao) * 0.12 +
        escala(f.forca) * 0.06
      );
    case 'DEF':
      return (
        escala(m.cobertura) * 0.34 +
        escala(t.cabeceio) * 0.22 +
        escala(f.forca) * 0.2 +
        escala(m.lideranca) * 0.1 +
        escala(t.passe) * 0.14
      );
    case 'VOL':
      return (
        escala(m.cobertura) * 0.26 +
        escala(t.lancamentos) * 0.22 +
        escala(t.passe) * 0.22 +
        escala(f.forca) * 0.12 +
        escala(m.leitura_jogo) * 0.12 +
        escala(m.agressividade) * 0.06
      );
    case 'MC':
      return (
        escala(t.passe) * 0.28 +
        escala(t.dominio) * 0.24 +
        escala(m.leitura_jogo) * 0.2 +
        escala(m.criatividade) * 0.14 +
        escala(f.velocidade) * 0.08 +
        escala(m.cobertura) * 0.06
      );
    case 'MO':
      return (
        escala(m.criatividade) * 0.28 +
        escala(t.drible) * 0.24 +
        escala(t.passe) * 0.22 +
        escala(m.pressao) * 0.12 +
        escala(f.velocidade) * 0.1 +
        escala(t.chute) * 0.04
      );
    case 'ATA':
      return (
        escala(t.chute) * 0.3 +
        escala(f.velocidade) * 0.26 +
        escala(t.drible) * 0.16 +
        escala(m.pressao) * 0.12 +
        escala(t.cabeceio) * 0.1 +
        escala(m.criatividade) * 0.06
      );
    default:
      return forcaMediaMotor(atributos);
  }
}

function forcaMediaMotor(atributos: AtributosJogador): number {
  const m = metricasMotorDeAtributos(atributos);
  return (m.defesa + m.passe + m.chute + m.velocidade) / 4;
}

export interface ParametrosRendimentoJogador {
  jogador: Jogador;
  posicaoEscalada: Posicao;
  celula?: CelulaGrade | null;
  energia: number;
  energiaLimiteFadiga: number;
  improvisacaoMult: number;
  /** Motivação do time + contexto (≈ 0,82–1,1). */
  fatorMotivacao?: number;
  /** Clima depressivo pós-goleada / sequência ruim. */
  fatorMoralTime?: number;
}

export function rendimentoJogadorEmCampo(p: ParametrosRendimentoJogador): number {
  const zona = p.celula ? zonaDaCelula(p.celula) : zonaFallbackPosicao(p.posicaoEscalada);
  let base = rendimentoAtributosNaZona(p.jogador.atributos, zona);

  let mult = multiplicadorDesempenhoPosicao(p.jogador.posicao, p.posicaoEscalada);
  if (p.jogador.posicao !== p.posicaoEscalada) {
    mult *= p.improvisacaoMult / IMPROV_PADRAO;
  }

  const limite = p.energiaLimiteFadiga;
  const fadiga =
    p.energia >= limite ? 1 : Math.max(0.35, p.energia / limite);

  const motiv = p.fatorMotivacao ?? 1;
  const moral = p.fatorMoralTime ?? 1;

  return base * mult * fadiga * motiv * moral;
}