import type { NoticiaCarreira } from './types';

export function deduplicarNoticias(lista: NoticiaCarreira[]): NoticiaCarreira[] {
  const vistos = new Set<string>();
  const out: NoticiaCarreira[] = [];
  for (const n of lista) {
    const chave = `${n.titulo}\0${n.texto}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(n);
  }
  return out;
}