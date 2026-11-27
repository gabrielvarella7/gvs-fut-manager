import type { NoticiaCarreira } from './types';
import { textoSemMarcadores } from './noticiasMarkup';

export function deduplicarNoticias(lista: NoticiaCarreira[]): NoticiaCarreira[] {
  const vistos = new Set<string>();
  const out: NoticiaCarreira[] = [];
  for (const n of lista) {
    const chave = `${textoSemMarcadores(n.titulo)}\0${textoSemMarcadores(n.texto)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(n);
  }
  return out;
}