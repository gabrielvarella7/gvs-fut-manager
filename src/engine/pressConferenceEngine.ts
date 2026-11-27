import type { Jogador } from '../types/schema';

export type TomRespostaColetiva = 'MOTIVADORA' | 'CRITICA' | 'NEUTRA';

export interface OpcaoRespostaColetiva {
  id: number;
  tom: TomRespostaColetiva;
  /** Texto que aparece no botão para o técnico clicar */
  rotuloBotao: string;
  /** Manchete/fala que vai para o feed de notícias (igual ao card da imagem) */
  textoImprensa: string;
  /** Impacto base esperado antes da rolagem de aleatoriedade */
  impactoBaseJogador: number;
  impactoBaseElenco: number;
}

export interface ColetivaPosJogo {
  id: string;
  data: string;
  clubeSigla: string;
  jogadorAlvo: {
    id: number;
    nome: string;
    notaPartida: number; // 4.0 a 10.0
  };
  contextoResultado: 'VITORIA' | 'EMPATE' | 'DERROTA';
  perguntaImprensa: string;
  /** Sempre traz 3 ou 4 opções, garantindo EXATAMENTE 1 opção NEUTRA */
  opcoes: OpcaoRespostaColetiva[];
}

export interface ResultadoColetiva {
  mancheteGerada: string;
  deltaMoralJogador: number; // -15 a +15
  deltaMoralElenco: number;  // -6 a +6
  reacaoJogadorTexto: string;
  efeitoInesperado: boolean;
}

/**
 * Gera a pergunta da imprensa focada no destaque (positivo ou negativo) do jogo
 * e monta as opções garantindo uma resposta NEUTRA.
 */
export function gerarColetivaPosJogo(params: {
  data: string;
  clubeSigla: string;
  clubeNome: string;
  adversarioNome: string;
  placar: string;
  resultado: 'VITORIA' | 'EMPATE' | 'DERROTA';
  elencoAtuou: Array<{ jogador: Jogador; nota: number; gols: number; assistencias: number }>;
  bancoRespostas: OpcaoRespostaColetiva[];
}): ColetivaPosJogo {
  const {
    data,
    clubeSigla,
    clubeNome,
    adversarioNome,
    placar,
    resultado,
    elencoAtuou,
    bancoRespostas,
  } = params;

  if (!elencoAtuou.length) {
    throw new Error('gerarColetivaPosJogo: elencoAtuou vazio');
  }

  // Escolhe o protagonista da coletiva:
  // Na vitória: maior nota/gols. Na derrota: menor nota ou estrela que passou em branco.
  const ordenado = [...elencoAtuou].sort((a, b) =>
    resultado === 'DERROTA' ? a.nota - b.nota : b.nota - a.nota,
  );
  const protagonista = ordenado[0]!;

  const perguntaImprensa = montarPerguntaJornalista({
    jogadorNome: protagonista.jogador.nome,
    nota: protagonista.nota,
    gols: protagonista.gols,
    resultado,
    adversarioNome,
    placar,
  });

  // Sorteia 2 respostas MOTIVADORAS, 1 CRÍTICA e 1 NEUTRA (ou 1 MOTIVADORA, 2 CRÍTICAS e 1 NEUTRA na derrota)
  const motivadoras = embaralhar(bancoRespostas.filter((r) => r.tom === 'MOTIVADORA'));
  const criticas = embaralhar(bancoRespostas.filter((r) => r.tom === 'CRITICA'));
  const neutras = embaralhar(bancoRespostas.filter((r) => r.tom === 'NEUTRA'));

  const pick = (lista: OpcaoRespostaColetiva[], i: number): OpcaoRespostaColetiva => {
    const item = lista[i] ?? lista[0];
    if (!item) throw new Error('gerarColetivaPosJogo: banco de respostas incompleto');
    return item;
  };

  const selecionadasBrutas: OpcaoRespostaColetiva[] =
    resultado === 'DERROTA'
      ? [pick(motivadoras, 0), pick(criticas, 0), pick(criticas, 1), pick(neutras, 0)]
      : [pick(motivadoras, 0), pick(motivadoras, 1), pick(criticas, 0), pick(neutras, 0)];

  // Garante exatamente 1 NEUTRA nas 4 opções finais
  const comUmaNeutra = garantirUmaNeutra(selecionadasBrutas, neutras);

  const opcoesFormatadas = embaralhar(comUmaNeutra).map((op) => ({
    ...op,
    rotuloBotao: preencherPlaceholders(
      op.rotuloBotao,
      protagonista.jogador.nome,
      clubeNome,
      adversarioNome,
      placar,
    ),
    textoImprensa: preencherPlaceholders(
      op.textoImprensa,
      protagonista.jogador.nome,
      clubeNome,
      adversarioNome,
      placar,
    ),
  }));

  return {
    id: `coletiva_${Date.now()}`,
    data,
    clubeSigla,
    jogadorAlvo: {
      id: protagonista.jogador.id,
      nome: protagonista.jogador.nome,
      notaPartida: protagonista.nota,
    },
    contextoResultado: resultado,
    perguntaImprensa,
    opcoes: opcoesFormatadas,
  };
}

function garantirUmaNeutra(
  selecionadas: OpcaoRespostaColetiva[],
  neutras: OpcaoRespostaColetiva[],
): OpcaoRespostaColetiva[] {
  const neutrasSel = selecionadas.filter((o) => o.tom === 'NEUTRA');
  if (neutrasSel.length === 1 && selecionadas.length === 4) return selecionadas;
  const neutra = neutras[0] ?? neutrasSel[0];
  if (!neutra) throw new Error('gerarColetivaPosJogo: sem opção NEUTRA no banco');
  const outras = selecionadas.filter((o) => o.tom !== 'NEUTRA').slice(0, 3);
  while (outras.length < 3 && selecionadas.length) {
    const extra = selecionadas.find((o) => o.tom !== 'NEUTRA' && !outras.includes(o));
    if (!extra) break;
    outras.push(extra);
  }
  return [...outras.slice(0, 3), neutra];
}

/**
 * ALGORITMO DE ALEATORIEDADE PARA RESPOSTAS NÃO-NEUTRAS
 * Cruza:
 * 1) Ruído gaussiano/uniforme controlado (-1.0 a +1.0)
 * 2) Coerência com o resultado e a nota do jogador (elogiar após vexame ou criticar herói gera backfire)
 * 3) Perfil do jogador (veteranos >= 30 anos absorvem cobranças melhor; jovens <= 22 oscilam mais)
 */
export function processarRespostaColetiva(
  coletiva: ColetivaPosJogo,
  opcaoEscolhida: OpcaoRespostaColetiva,
  jogador: Jogador
): ResultadoColetiva {
  // Caso 1: Resposta NEUTRA -> Zero aleatoriedade negativa, estabiliza o vestiário
  if (opcaoEscolhida.tom === 'NEUTRA') {
    const bonusSimbolico = coletiva.contextoResultado === 'VITORIA' ? 1 : 0;
    return {
      mancheteGerada: opcaoEscolhida.textoImprensa,
      deltaMoralJogador: bonusSimbolico,
      deltaMoralElenco: bonusSimbolico,
      reacaoJogadorTexto: `${jogador.nome} manteve a postura profissional após a declaração.`,
      efeitoInesperado: false,
    };
  }

  // Caso 2: Resposta NÃO-NEUTRA -> Aplica motor estocástico de vestiário
  const { notaPartida } = coletiva.jogadorAlvo;
  const { contextoResultado } = coletiva;

  // Fator aleatório puro entre -1.0 e +1.0 (distribuição triangular concentrada no centro, com pontas raras)
  const rng1 = Math.random();
  const rng2 = Math.random();
  const ruidoAleatorio = rng1 + rng2 - 1.0; // -1.0 a +1.0

  // Calcula coerência contextual (-0.6 a +0.6)
  let coerenciaContexto = 0;
  if (opcaoEscolhida.tom === 'MOTIVADORA') {
    if (contextoResultado === 'VITORIA' && notaPartida >= 7.0) coerenciaContexto = +0.45;
    else if (contextoResultado === 'DERROTA' && notaPartida < 6.0) coerenciaContexto = -0.50; // Elogio fora de hora
  } else if (opcaoEscolhida.tom === 'CRITICA') {
    if (contextoResultado === 'DERROTA' && notaPartida < 6.2) coerenciaContexto = +0.35; // Cobrança justa
    else if (contextoResultado === 'VITORIA' && notaPartida >= 7.5) coerenciaContexto = -0.65; // Crítica injusta após grande jogo
  }

  // Modificador de maturidade/idade
  const fatorMaturidade =
    jogador.idade >= 30 ? 0.15 : jogador.idade <= 22 ? -0.15 : 0;

  // Score final de recepção no vestiário (-1.6 a +1.6)
  const scoreRecepcao = ruidoAleatorio + coerenciaContexto + fatorMaturidade;

  let deltaJogador = 0;
  let deltaElenco = 0;
  let efeitoInesperado = false;
  let reacaoJogadorTexto = '';

  if (opcaoEscolhida.tom === 'MOTIVADORA') {
    if (scoreRecepcao >= 0.45) {
      // Sucesso alto: inflamou o jogador e contagiou o grupo
      deltaJogador = Math.round(6 + Math.random() * 6); // +6 a +12
      deltaElenco = Math.round(2 + Math.random() * 3);  // +2 a +5
      reacaoJogadorTexto = `${jogador.nome} ficou extremamente motivado com o respaldo público!`;
    } else if (scoreRecepcao >= -0.25) {
      // Sucesso padrão
      deltaJogador = Math.round(2 + Math.random() * 4); // +2 a +6
      deltaElenco = Math.round(1 + Math.random() * 2);  // +1 a +3
      reacaoJogadorTexto = `${jogador.nome} agradeceu a confiança do treinador.`;
    } else {
      // Backfire aleatório: elogio gerou acomodação ou ciúme no elenco
      efeitoInesperado = true;
      deltaJogador = -Math.round(3 + Math.random() * 5); // -3 a -8
      deltaElenco = -Math.round(1 + Math.random() * 3);  // -1 a -4
      reacaoJogadorTexto = `${jogador.nome} pareceu relaxar com os elogios e parte do elenco estranhou o discurso.`;
    }
  } else {
    // TOM === 'CRITICA'
    if (scoreRecepcao >= 0.55) {
      // Choque positivo: cobrança feriu o orgulho e despertou reação
      efeitoInesperado = true;
      deltaJogador = Math.round(4 + Math.random() * 6); // +4 a +10
      deltaElenco = Math.round(1 + Math.random() * 3);  // +1 a +4
      reacaoJogadorTexto = `${jogador.nome} absorveu a cobrança como combustível e prometeu resposta em campo!`;
    } else if (scoreRecepcao >= -0.20) {
      // Queda moderada esperada
      deltaJogador = -Math.round(3 + Math.random() * 4); // -3 a -7
      deltaElenco = -Math.round(0 + Math.random() * 2);  // 0 a -2
      reacaoJogadorTexto = `${jogador.nome} saiu cabisbaixo após ser exposto na entrevista.`;
    } else {
      // Crise de vestiário: jogador se revoltou e elenco rachou
      efeitoInesperado = true;
      deltaJogador = -Math.round(8 + Math.random() * 7); // -8 a -15
      deltaElenco = -Math.round(3 + Math.random() * 3);  // -3 a -6
      reacaoJogadorTexto = `${jogador.nome} não gostou nada das críticas públicas e o clima pesou no vestiário!`;
    }
  }

  return {
    mancheteGerada: opcaoEscolhida.textoImprensa,
    deltaMoralJogador: deltaJogador,
    deltaMoralElenco: deltaElenco,
    reacaoJogadorTexto,
    efeitoInesperado,
  };
}

function montarPerguntaJornalista(p: {
  jogadorNome: string;
  nota: number;
  gols: number;
  resultado: 'VITORIA' | 'EMPATE' | 'DERROTA';
  adversarioNome: string;
  placar: string;
}): string {
  if (p.resultado === 'VITORIA' && p.gols > 0) {
    return `Professor, ${p.jogadorNome} decidiu o jogo contra o ${p.adversarioNome} (${p.placar}). Como avalia o momento dele no elenco?`;
  }
  if (p.resultado === 'VITORIA') {
    return `Mesmo com a vitória por ${p.placar} sobre o ${p.adversarioNome}, muito se falou da atuação de ${p.jogadorNome}. O que você achou?`;
  }
  if (p.resultado === 'DERROTA' && p.nota < 6.0) {
    return `A torcida cobrou muito ${p.jogadorNome} após a derrota por ${p.placar} para o ${p.adversarioNome}. Ele segue prestigiado?`;
  }
  return `Após o ${p.placar} diante do ${p.adversarioNome}, como você analisa a entrega de ${p.jogadorNome} dentro da sua proposta tática?`;
}

function preencherPlaceholders(
  texto: string,
  jogador: string,
  clube: string,
  adversario: string,
  placar: string
): string {
  return texto
    .replace(/\{jogador\}/g, jogador)
    .replace(/\{clube\}/g, clube)
    .replace(/\{adversario\}/g, adversario)
    .replace(/\{placar\}/g, placar);
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}