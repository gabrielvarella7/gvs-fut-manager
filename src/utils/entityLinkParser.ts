function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove qualquer token quebrado/aninhado como `[[j:319|[[j:372|Guilherme]] Arana]]` ou `j:319`.
 */
export function sanitizarTokensTexto(texto: string): string {
  if (!texto) return '';
  let limpo = texto;

  const regexToken = /\[\[(?:j|c|t):[^|\]]+\|([^\[\]]+)\]\]/g;
  let anterior = '';
  while (limpo !== anterior) {
    anterior = limpo;
    limpo = limpo.replace(regexToken, '$1');
  }

  limpo = limpo
    .replace(/\[\[(?:j|c|t):\d+\|/g, '')
    .replace(/\]\]/g, '')
    .replace(/\b[jct]:\d+\b/g, '');

  return limpo.trim();
}

/**
 * Gera segmentos clicáveis em PASSO ÚNICO (ordenando do nome mais longo para o mais curto).
 */
export function extrairSegmentosClicaveis(
  textoBruto: string,
  jogadoresContexto: Array<{ id: number; nome: string; nome_conhecido?: string }>
): Array<{ texto: string; jogadorId?: number }> {
  const textoLimpo = sanitizarTokensTexto(textoBruto);
  if (!textoLimpo || jogadoresContexto.length === 0) {
    return [{ texto: textoLimpo }];
  }

  const mapaNomes = new Map<string, number>();
  for (const j of jogadoresContexto) {
    const nomePrincipal = (j.nome_conhecido || j.nome || '').trim();
    if (nomePrincipal.length >= 3) mapaNomes.set(nomePrincipal, j.id);
    if (j.nome && j.nome.trim().length >= 3 && !mapaNomes.has(j.nome.trim())) {
      mapaNomes.set(j.nome.trim(), j.id);
    }
  }

  const nomesOrdenados = Array.from(mapaNomes.keys()).sort((a, b) => b.length - a.length);
  if (nomesOrdenados.length === 0) return [{ texto: textoLimpo }];

  const padrao = new RegExp(
    `(?<![\\p{L}\\d])(${nomesOrdenados.map(escaparRegex).join('|')})(?![\\p{L}\\d])`,
    'gu'
  );

  const segmentos: Array<{ texto: string; jogadorId?: number }> = [];
  let ultimoIndice = 0;

  for (const match of textoLimpo.matchAll(padrao)) {
    const indice = match.index ?? 0;
    const nomeEncontrado = match[0];

    if (indice > ultimoIndice) {
      segmentos.push({ texto: textoLimpo.slice(ultimoIndice, indice) });
    }

    segmentos.push({
      texto: nomeEncontrado,
      jogadorId: mapaNomes.get(nomeEncontrado),
    });

    ultimoIndice = indice + nomeEncontrado.length;
  }

  if (ultimoIndice < textoLimpo.length) {
    segmentos.push({ texto: textoLimpo.slice(ultimoIndice) });
  }

  return segmentos;
}
