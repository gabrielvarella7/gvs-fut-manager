/**
 * Smoke: banco de 100 notícias pós-rodada + marcadores clicáveis.
 * Run: npx --yes tsx scripts/smoke-noticias-encerramento.mjs
 */
import assert from 'node:assert/strict';
import {
  TEMPLATES_ENCERRAMENTO_RODADA,
  gerarNoticiasEncerramentoRodada,
  montarContextoEncerramentoRodada,
} from '../src/career/noticiasEncerramentoRodada.ts';
import {
  marcarClube,
  marcarJogador,
  textoSemMarcadores,
  tokenizarNoticia,
} from '../src/career/noticiasMarkup.ts';
import { ordenarTabela } from '../src/career/brasileirao.ts';

assert.equal(TEMPLATES_ENCERRAMENTO_RODADA.length, 100);
const blocos = new Set(TEMPLATES_ENCERRAMENTO_RODADA.map((t) => t.bloco));
assert.deepEqual([...blocos].sort(), ['analise', 'craque', 'curiosidade', 'tabela', 'zebra']);

const tokens = tokenizarNoticia(
  `O ${marcarClube('fluminense', 'Fluminense')} e ${marcarJogador(42, 'Cano')} brilharam.`,
);
assert.equal(tokens.filter((t) => t.tipo === 'clube').length, 1);
assert.equal(tokens.filter((t) => t.tipo === 'jogador').length, 1);
assert.equal(
  textoSemMarcadores(`Gol de ${marcarJogador(7, 'Pedro')} pelo ${marcarClube('flamengo', 'Flamengo')}`),
  'Gol de Pedro pelo Flamengo',
);

const times = [
  { id: 'a', nome: 'Alpha', nome_completo: 'Alpha FC', forca_geral: 80, prestigio: 85 },
  { id: 'b', nome: 'Beta', nome_completo: 'Beta FC', forca_geral: 78, prestigio: 80 },
  { id: 'c', nome: 'Gama', nome_completo: 'Gama FC', forca_geral: 55, prestigio: 50 },
  { id: 'd', nome: 'Delta', nome_completo: 'Delta FC', forca_geral: 60, prestigio: 58 },
].map((t) => ({
  ...t,
  estado: 'RJ',
  estadio: 'X',
  capacidade: 40000,
  cor_primaria: '#000',
  cor_secundaria: '#fff',
}));

const jogadores = [
  {
    id: 1,
    time_id: 'a',
    nome: 'Artilheiro A',
    idade: 28,
    posicao: 'ATA',
    overall: 82,
    atributos: {
      tecnicos: {
        dominio: 10,
        passe: 10,
        chute: 18,
        cabeceio: 10,
        drible: 10,
        lancamentos: 10,
        bola_parada: 10,
      },
      mentais: {
        leitura_jogo: 10,
        cobertura: 10,
        criatividade: 10,
        agressividade: 10,
        lideranca: 10,
        pressao: 10,
      },
      fisicos: { fora_por_lesao: 10, velocidade: 10, forca: 10 },
    },
    energia: 100,
    status_escalacao: 'TITULAR',
    valor_mercado: 1,
  },
  {
    id: 2,
    time_id: 'c',
    nome: 'Herói Zebra',
    idade: 24,
    posicao: 'MEI',
    overall: 71,
    atributos: {
      tecnicos: {
        dominio: 10,
        passe: 10,
        chute: 14,
        cabeceio: 10,
        drible: 10,
        lancamentos: 10,
        bola_parada: 10,
      },
      mentais: {
        leitura_jogo: 10,
        cobertura: 10,
        criatividade: 10,
        agressividade: 10,
        lideranca: 10,
        pressao: 10,
      },
      fisicos: { fora_por_lesao: 10, velocidade: 10, forca: 10 },
    },
    energia: 100,
    status_escalacao: 'TITULAR',
    valor_mercado: 1,
  },
];

const estado = {
  temporadaAno: 2026,
  dataAtualISO: '2026-05-01',
  rodadaAtual: 5,
  tabela: ordenarTabela([
    {
      time_id: 'a',
      pontos: 12,
      jogos: 5,
      vitorias: 4,
      empates: 0,
      derrotas: 1,
      gols_pro: 10,
      gols_contra: 4,
      saldo_gols: 6,
    },
    {
      time_id: 'b',
      pontos: 10,
      jogos: 5,
      vitorias: 3,
      empates: 1,
      derrotas: 1,
      gols_pro: 8,
      gols_contra: 5,
      saldo_gols: 3,
    },
    {
      time_id: 'c',
      pontos: 7,
      jogos: 5,
      vitorias: 2,
      empates: 1,
      derrotas: 2,
      gols_pro: 6,
      gols_contra: 7,
      saldo_gols: -1,
    },
    {
      time_id: 'd',
      pontos: 2,
      jogos: 5,
      vitorias: 0,
      empates: 2,
      derrotas: 3,
      gols_pro: 3,
      gols_contra: 9,
      saldo_gols: -6,
    },
  ]),
  partidas: [
    {
      id: 1,
      rodada: 5,
      mandanteId: 'c',
      visitanteId: 'a',
      dataISO: '2026-05-01',
      finalizado: true,
      golsMandante: 2,
      golsVisitante: 0,
      ehDoUsuario: false,
      desempenhoJogadores: [
        { jogadorId: 2, timeId: 'c', gols: 2, amarelos: 0, vermelho: false },
      ],
    },
    {
      id: 2,
      rodada: 5,
      mandanteId: 'b',
      visitanteId: 'd',
      dataISO: '2026-05-01',
      finalizado: true,
      golsMandante: 3,
      golsVisitante: 1,
      ehDoUsuario: true,
      desempenhoJogadores: [
        { jogadorId: 1, timeId: 'a', gols: 0, amarelos: 0, vermelho: false },
      ],
    },
  ],
};

const ctx = montarContextoEncerramentoRodada({
  estado,
  rodada: 5,
  clubeId: 'b',
  times,
  jogadores,
});

assert.equal(ctx.temZebra, true);
assert.equal(ctx.vencedorZebraId, 'c');
assert.equal(ctx.perdedorZebraId, 'a');
assert.equal(ctx.destaqueJogadorId, 2);
assert.equal(ctx.golsRodada, 6);
assert.ok(ctx.placarDestaque.includes('2x0') || ctx.placarDestaque.includes('3x1'));

const noticias = gerarNoticiasEncerramentoRodada(ctx, 42);
assert.ok(noticias.length >= 3);
assert.ok(noticias.some((n) => n.id.includes('tabela')));
assert.ok(noticias.some((n) => n.id.includes('zebra')));
assert.ok(noticias.some((n) => n.id.includes('craque')));

for (const n of noticias) {
  assert.ok(/⟦c:/.test(n.texto) || /⟦j:/.test(n.texto), `esperado marcador em: ${n.texto}`);
  const toks = tokenizarNoticia(n.texto);
  assert.ok(toks.some((t) => t.tipo === 'clube' || t.tipo === 'jogador'));
}

console.log('smoke-noticias-encerramento: OK', {
  templates: TEMPLATES_ENCERRAMENTO_RODADA.length,
  geradas: noticias.length,
  ids: noticias.map((n) => n.id),
});
