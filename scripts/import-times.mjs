import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? join(process.env.USERPROFILE ?? '', 'Downloads', 'times.json');
const outDir = join(root, 'public', 'database');
mkdirSync(outDir, { recursive: true });

const ESTADO_POR_CIDADE = {
  'Rio de Janeiro': 'RJ',
  'São Paulo': 'SP',
  'Belo Horizonte': 'MG',
  Curitiba: 'PR',
  Salvador: 'BA',
  'Porto Alegre': 'RS',
  Chapecó: 'SC',
  Belém: 'PA',
  Santos: 'SP',
  Mirassol: 'SP',
  'Bragança Paulista': 'SP',
};

const raw = JSON.parse(readFileSync(src, 'utf8'));
const times = raw.map((t) => ({
  id: t.nome_curto,
  slug: t.id,
  nome: t.nome_curto,
  nome_completo: t.nome,
  estado: ESTADO_POR_CIDADE[t.cidade] ?? 'BR',
  cidade: t.cidade,
  estadio: t.estadio,
  capacidade: 35000,
  cor_primaria: t.cor_primaria,
  cor_secundaria: t.cor_secundaria,
  forca_geral: t.prestigio,
  esquema_tatico_padrao: t.esquema_tatico_padrao,
}));

writeFileSync(join(outDir, 'times.json'), `${JSON.stringify(times, null, 2)}\n`, 'utf8');
console.log(`Importados ${times.length} times → public/database/times.json`);