import type { AcaoNoticia, NoticiaCarreira } from './types';
import { textoSemMarcadores } from './noticiasMarkup';

/** CTAs padrão para lesão em campo. */
export function acoesLesaoCampo(jogadorId: number): AcaoNoticia[] {
  return [
    { tipo: 'ver_jogador', jogadorId, rotulo: 'Ver jogador' },
    { tipo: 'departamento_medico', jogadorId, rotulo: 'Departamento médico' },
  ];
}

/** CTAs para indicação da base / alerta de plantel curto. */
export function acoesProspectoBase(jovemId: number): AcaoNoticia[] {
  return [
    { tipo: 'ver_jogador', jogadorId: jovemId, rotulo: 'Ver atleta' },
    { tipo: 'promover_base', jogadorId: jovemId, rotulo: 'Promover' },
    { tipo: 'abrir_base', rotulo: 'Abrir base' },
    { tipo: 'dispensar', rotulo: 'Dispensar' },
  ];
}

/**
 * Resolve CTAs de uma notícia: usa `acoes` gravadas ou deriva de id/título
 * (saves antigos sem o campo).
 */
function idJogadorDeMarcador(n: NoticiaCarreira): number | null {
  const m = /⟦j:(\d+)\|/.exec(n.titulo) ?? /⟦j:(\d+)\|/.exec(n.texto);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

export function resolverAcoesNoticia(n: NoticiaCarreira): AcaoNoticia[] {
  if (n.acoes?.length) return n.acoes;

  const lesaoCampo = /^lesao_campo_(\d+)_/.exec(n.id);
  if (lesaoCampo) {
    const id = Number(lesaoCampo[1]);
    if (Number.isFinite(id)) return acoesLesaoCampo(id);
  }

  const lesaoTreino = /^lesao_treino_(\d+)_/.exec(n.id);
  if (lesaoTreino) {
    const id = Number(lesaoTreino[1]);
    if (Number.isFinite(id)) return acoesLesaoCampo(id);
  }

  const lesaoDia = /^lesao_(\d+)_/.exec(n.id);
  if (lesaoDia) {
    const id = Number(lesaoDia[1]);
    if (Number.isFinite(id)) return acoesLesaoCampo(id);
  }

  const gotejo = /^gotejo_\d+_(\d+)$/.exec(n.id);
  if (gotejo) {
    const id = Number(gotejo[1]);
    if (Number.isFinite(id)) return acoesProspectoBase(id);
  }

  const crise = /^crise_base_\d+_(\d+)$/.exec(n.id);
  if (crise) {
    const id = Number(crise[1]);
    if (Number.isFinite(id)) return acoesProspectoBase(id);
  }

  const titulo = textoSemMarcadores(n.titulo);
  if (/^Lesão( em campo|:)|Baixa no treino/i.test(titulo)) {
    const id = idJogadorDeMarcador(n);
    if (id != null) return acoesLesaoCampo(id);
  }
  if (/Indicação da base|Alerta · plantel curto/i.test(titulo)) {
    const id = idJogadorDeMarcador(n);
    if (id != null) return acoesProspectoBase(id);
  }

  return [];
}

export function rotuloAcaoNoticia(a: AcaoNoticia): string {
  if (a.rotulo) return a.rotulo;
  switch (a.tipo) {
    case 'ver_jogador':
      return 'Ver jogador';
    case 'departamento_medico':
      return 'Departamento médico';
    case 'promover_base':
      return 'Promover';
    case 'abrir_base':
      return 'Abrir base';
    case 'dispensar':
      return 'Dispensar';
  }
}
