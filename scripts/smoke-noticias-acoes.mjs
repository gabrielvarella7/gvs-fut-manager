/**
 * Smoke: CTAs de notícias (lesão / indicação / plantel curto).
 * Run: npm run smoke:noticias-acoes
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = `
import {
  acoesLesaoCampo,
  acoesProspectoBase,
  resolverAcoesNoticia,
  rotuloAcaoNoticia,
} from './src/career/noticiasAcoes.ts';
import { textoSemMarcadores } from './src/career/noticiasMarkup.ts';

const lesao = {
  id: 'lesao_campo_42_1',
  data: '2026-11-27',
  titulo: 'Lesão em campo: Lucas',
  texto: 'Lucas saiu com estresse.',
  acoes: acoesLesaoCampo(42),
};
const gotejo = {
  id: 'gotejo_3_99',
  data: '2026-11-27',
  titulo: 'Indicação da base',
  texto: 'Diretor indica Falcão',
  acoes: acoesProspectoBase(99),
};
const criseOld = {
  id: 'crise_base_5_77',
  data: '2026-11-27',
  titulo: 'Alerta · plantel curto',
  texto: 'Plantel curto. Sugere Léo',
};

const treino = {
  id: 'lesao_treino_55_2026-03-01',
  data: '2026-03-01',
  titulo: 'Baixa no treino — ⟦j:55|Pedro⟧',
  texto: '⟦j:55|Pedro⟧: estiramento (moderada). Previsão de 19 dias.',
};
const lesaoDia = {
  id: 'lesao_12_999',
  data: '2026-03-01',
  titulo: 'Lesão: ⟦j:12|Ana⟧',
  texto: '⟦j:12|Ana⟧: contratura (leve). Previsão de 5 dias.',
};

const a1 = resolverAcoesNoticia(lesao);
const a2 = resolverAcoesNoticia(gotejo);
const a3 = resolverAcoesNoticia(criseOld);
const a4 = resolverAcoesNoticia(treino);
const a5 = resolverAcoesNoticia(lesaoDia);

if (!a1.some((x) => x.tipo === 'ver_jogador' && x.jogadorId === 42)) throw new Error('lesao ver');
if (!a1.some((x) => x.tipo === 'departamento_medico')) throw new Error('lesao medico');
if (!a2.some((x) => x.tipo === 'promover_base' && x.jogadorId === 99)) throw new Error('gotejo promo');
if (!a2.some((x) => x.tipo === 'dispensar')) throw new Error('gotejo dismiss');
if (!a3.some((x) => x.tipo === 'promover_base' && x.jogadorId === 77)) throw new Error('crise derive');
if (!a4.some((x) => x.tipo === 'ver_jogador' && x.jogadorId === 55)) throw new Error('treino ver');
if (!a5.some((x) => x.tipo === 'departamento_medico' && x.jogadorId === 12)) throw new Error('dia medico');
if (rotuloAcaoNoticia({ tipo: 'promover_base' }) !== 'Promover') throw new Error('rotulo');
if (textoSemMarcadores('⟦j:1|Ana⟧') !== 'Ana') throw new Error('markup');
console.log('smoke-noticias-acoes: OK');
`;

const r = spawnSync('npx', ['--yes', 'tsx', '-e', code], {
  cwd: root,
  encoding: 'utf8',
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status ?? 1);
