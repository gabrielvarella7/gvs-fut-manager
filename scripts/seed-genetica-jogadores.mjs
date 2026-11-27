/**
 * Seed de genética em public/database/jogadores.json
 * Blueprint Gemini (overrides famosos + distribuição etária).
 *
 * Uso: node scripts/seed-genetica-jogadores.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../public/database/jogadores.json');
const jogadores = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const OVERRIDES_GENETICA = {
  'Vitor Roque': {
    potencial_maximo: 91,
    fator_absorcao: 1.38,
    propensao_lesao: 0.78,
    perfil_scout: 'Fenômeno físico com teto de classe mundial.',
  },
  'Jair Cunha': {
    potencial_maximo: 87,
    fator_absorcao: 1.28,
    propensao_lesao: 0.85,
    perfil_scout: 'Zagueiro de altíssima projeção internacional.',
  },
  'Breno Bidon': {
    potencial_maximo: 86,
    fator_absorcao: 1.3,
    propensao_lesao: 0.82,
    perfil_scout: 'Meio-campista de rápida assimilação tática.',
  },
  Rayan: {
    potencial_maximo: 86,
    fator_absorcao: 1.26,
    propensao_lesao: 0.88,
    perfil_scout: 'Atacante explosivo com grande margem de evolução.',
  },
  'Pedro Morisco': {
    potencial_maximo: 85,
    fator_absorcao: 1.25,
    propensao_lesao: 0.72,
    perfil_scout: 'Goleiro seguro com excelente resposta aos treinos.',
  },
  'Lucas Ronier': {
    potencial_maximo: 85,
    fator_absorcao: 1.27,
    propensao_lesao: 0.84,
    perfil_scout: 'Ponta agudo com alto teto técnico.',
  },
  'Álvaro Montoro': {
    potencial_maximo: 87,
    fator_absorcao: 1.34,
    propensao_lesao: 0.86,
    perfil_scout: 'Joia criativa com potencial de seleção.',
  },
  Neymar: {
    potencial_maximo: 94,
    fator_absorcao: 1.15,
    propensao_lesao: 1.95,
    perfil_scout: 'Gênio técnico, porém com altíssima fragilidade muscular.',
  },
  Pedro: {
    potencial_maximo: 82,
    fator_absorcao: 1.1,
    propensao_lesao: 1.45,
    perfil_scout: 'Artilheiro letal; requer monitoramento de joelho/musculatura.',
  },
  'Nicolás de la Cruz': {
    potencial_maximo: 84,
    fator_absorcao: 1.15,
    propensao_lesao: 1.62,
    perfil_scout: 'Motor do meio-campo, mas propenso a desgaste muscular.',
  },
  'Rodrigo Caio': {
    potencial_maximo: 78,
    fator_absorcao: 0.85,
    propensao_lesao: 2.05,
    perfil_scout: 'Leitura tática impecável, histórico médico crítico.',
  },
  'Alexandre Pato': {
    potencial_maximo: 78,
    fator_absorcao: 0.8,
    propensao_lesao: 1.88,
    perfil_scout: 'Talento técnico evidente com baixa resistência física.',
  },
  Fábio: {
    potencial_maximo: 84,
    fator_absorcao: 0.9,
    propensao_lesao: 0.52,
    perfil_scout: 'Longevidade rara e estrutura física inquebrável.',
  },
  Hulk: {
    potencial_maximo: 85,
    fator_absorcao: 1.05,
    propensao_lesao: 0.64,
    perfil_scout: 'Portento físico com recuperação muscular acima da média.',
  },
};

function pseudoRandom(seed) {
  const x = Math.sin(seed * 9999.91) * 10000;
  return x - Math.floor(x);
}

const atualizados = jogadores.map((j) => {
  if (OVERRIDES_GENETICA[j.nome]) {
    return { ...j, genetica: OVERRIDES_GENETICA[j.nome] };
  }

  const r1 = pseudoRandom(j.id * 3 + 1);
  const r2 = pseudoRandom(j.id * 7 + 2);
  const r3 = pseudoRandom(j.id * 11 + 3);

  let margemPotencial = 0;
  if (j.idade <= 20) margemPotencial = Math.round(3 + r1 * 15);
  else if (j.idade <= 23) margemPotencial = Math.round(2 + r1 * 10);
  else if (j.idade <= 27) margemPotencial = Math.round(r1 * 5);
  else margemPotencial = Math.round(r1 * 2);

  const potencial_maximo = Math.min(96, Math.max(j.overall, j.overall + margemPotencial));
  const fator_absorcao = Number((0.65 + r2 * 0.8).toFixed(2));

  let propensao = 0.75 + r3 * 0.55;
  if (r3 > 0.88) propensao = 1.45 + (r3 - 0.88) * 5.5;
  if (r3 < 0.12) propensao = 0.5 + r3 * 1.8;
  const propensao_lesao = Number(Math.min(2.2, Math.max(0.5, propensao)).toFixed(2));

  let perfil_scout = 'Resposta física e evolução dentro da média da liga.';
  if (propensao_lesao >= 1.55) {
    perfil_scout = 'Alerta médico: fibras musculares propensas a estiramentos recorrentes.';
  } else if (potencial_maximo - j.overall >= 11 && fator_absorcao >= 1.2) {
    perfil_scout = 'Potencial de elite: absorve treinos com velocidade impressionante.';
  } else if (j.idade <= 22 && potencial_maximo - j.overall <= 3) {
    perfil_scout = 'Próximo do limite técnico; evolução futura tende a ser discreta.';
  } else if (propensao_lesao <= 0.72) {
    perfil_scout = 'Constituição privilegiada: suporta alta carga sem desgastar.';
  }

  return {
    ...j,
    genetica: {
      potencial_maximo,
      fator_absorcao: Math.min(1.45, Math.max(0.65, fator_absorcao)),
      propensao_lesao,
      perfil_scout,
    },
  };
});

fs.writeFileSync(dbPath, JSON.stringify(atualizados), 'utf-8');
console.log(`Genética aplicada em ${atualizados.length} atletas (${Object.keys(OVERRIDES_GENETICA).length} overrides).`);
