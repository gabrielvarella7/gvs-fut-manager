/**
 * Smoke: filter + sort de listas de jogadores (elenco / mercado / base).
 * Run: npx --yes tsx scripts/smoke-elenco-sort.mjs
 */
import assert from 'node:assert/strict';
import {
  direcaoInicialColuna,
  ordenarElencoPorColuna,
} from '../src/career/ordenarElenco.ts';
import {
  aplicarPlayerListQuery,
  filtrarPlayerList,
  parseFiltroValor,
} from '../src/ui/playerList/playerListQuery.ts';
import { jogadorAccessors, SORT_VENDER } from '../src/ui/playerList/presets.ts';

function attrs(n) {
  return {
    tecnicos: {
      dominio: n,
      passe: n,
      chute: n,
      cabeceio: n,
      drible: n,
      lancamentos: n,
      bola_parada: n,
    },
    mentais: {
      leitura_jogo: n,
      cobertura: n,
      criatividade: n,
      agressividade: n,
      lideranca: n,
      pressao: n,
    },
    fisicos: {
      fora_por_lesao: n,
      velocidade: n,
      forca: n,
    },
  };
}

function jogador(parcial) {
  return {
    id: parcial.id,
    nome: parcial.nome,
    posicao: parcial.posicao ?? 'MEI',
    idade: parcial.idade ?? 25,
    overall: parcial.overall ?? 70,
    energia: parcial.energia ?? 100,
    time_id: 't1',
    status_escalacao: parcial.status_escalacao ?? 'RESERVA',
    atributos: {
      tecnicos: attrs(parcial.tec ?? 10).tecnicos,
      mentais: attrs(parcial.men ?? 10).mentais,
      fisicos: attrs(parcial.fis ?? 10).fisicos,
    },
    valor_mercado: parcial.valor ?? 1_000_000,
    salario_mensal: parcial.salario ?? 50_000,
    lesao: parcial.lesao ?? null,
  };
}

const elenco = [
  jogador({
    id: 1,
    nome: 'Carlos',
    posicao: 'ATA',
    idade: 30,
    overall: 80,
    energia: 60,
    tec: 14,
    men: 12,
    fis: 11,
    valor: 8_000_000,
    salario: 200_000,
    status_escalacao: 'TITULAR',
  }),
  jogador({
    id: 2,
    nome: 'Bruno',
    posicao: 'GOL',
    idade: 22,
    overall: 72,
    energia: 95,
    tec: 8,
    men: 15,
    fis: 13,
    valor: 2_000_000,
    salario: 40_000,
    status_escalacao: 'RESERVA',
  }),
  jogador({
    id: 3,
    nome: 'André',
    posicao: 'ZAG',
    idade: 27,
    overall: 76,
    energia: 40,
    tec: 11,
    men: 10,
    fis: 16,
    valor: 5_000_000,
    salario: 120_000,
    status_escalacao: 'NAO_RELACIONADO',
    lesao: { descricao: 'joelho', diasRestantes: 5 },
  }),
];

assert.equal(direcaoInicialColuna('nome'), 'asc');
assert.equal(direcaoInicialColuna('ovr'), 'desc');

assert.deepEqual(
  ordenarElencoPorColuna(elenco, 'nome', 'asc').map((j) => j.nome),
  ['André', 'Bruno', 'Carlos'],
);
assert.deepEqual(
  ordenarElencoPorColuna(elenco, 'ovr', 'desc').map((j) => j.overall),
  [80, 76, 72],
);
assert.deepEqual(
  ordenarElencoPorColuna(elenco, 'status', 'asc').map((j) => j.nome),
  ['Carlos', 'Bruno', 'André'],
);

assert.equal(parseFiltroValor('2M'), 2_000_000);
assert.equal(parseFiltroValor('R$ 1.500.000'), 1_500_000);

const filtersBase = {
  busca: '',
  posicao: 'TODAS',
  ovrMin: '',
  ovrMax: '',
  valorMin: '',
  valorMax: '',
  idadeMin: '',
  idadeMax: '',
};

const soGol = filtrarPlayerList(elenco, jogadorAccessors, {
  ...filtersBase,
  posicao: 'GOL',
});
assert.deepEqual(
  soGol.map((j) => j.nome),
  ['Bruno'],
);

const ovrAlto = filtrarPlayerList(elenco, jogadorAccessors, {
  ...filtersBase,
  ovrMin: '75',
});
assert.deepEqual(
  ovrAlto.map((j) => j.nome).sort(),
  ['André', 'Carlos'],
);

const valorFaixa = filtrarPlayerList(elenco, jogadorAccessors, {
  ...filtersBase,
  valorMin: '3M',
  valorMax: '6M',
});
assert.deepEqual(
  valorFaixa.map((j) => j.nome),
  ['André'],
);

const vender = aplicarPlayerListQuery(
  elenco,
  jogadorAccessors,
  { ...filtersBase, posicao: 'ATA' },
  { id: 'valor', dir: 'desc' },
  SORT_VENDER,
);
assert.deepEqual(
  vender.map((j) => j.nome),
  ['Carlos'],
);

console.log('smoke-elenco-sort: ok');
