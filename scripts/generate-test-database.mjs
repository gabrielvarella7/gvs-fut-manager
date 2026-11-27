/**
 * Regenera jogadores.json a partir de public/database/times.json
 * (30 atletas por clube: 11 titulares + 11 reservas + 8 fora da lista).
 * Não sobrescreve campeonato.json nem times.json se já existirem.
 * Rodar: npm run db:seed
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'database');
mkdirSync(outDir, { recursive: true });

const TITULARES = 11;
const RESERVAS = 11;
/** 11+11+8 = 30 */
const SQUAD_TEMPLATE = [
  ['GOL', 3],
  ['ZAG', 5],
  ['LAT', 5],
  ['VOL', 4],
  ['MEI', 7],
  ['ATA', 6],
];

const timesPath = join(outDir, 'times.json');
if (!existsSync(timesPath)) {
  console.error('times.json não encontrado em public/database/. Cole o Arquivo 2 antes de rodar o seed.');
  process.exit(1);
}

const times = JSON.parse(readFileSync(timesPath, 'utf8'));

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const ESCALA = 20;
function clamp(n) {
  return Math.max(1, Math.min(ESCALA, Math.round(n)));
}
function legado20(n) {
  return clamp(n / 5);
}
function jitter(id, base, salt = 0) {
  const v = (((id * 1103515245 + salt + 12345) >>> 0) % 7) - 3;
  return clamp(base + v);
}

function attrFor(pos, forcaGeral, rnd, id, idade) {
  const base = 50 + forcaGeral * 0.38;
  const bias = {
    GOL: { defesa: 22, passe: 4, chute: -8, velocidade: -2 },
    ZAG: { defesa: 18, passe: 2, chute: -6, velocidade: 0 },
    LAT: { defesa: 10, passe: 4, chute: -2, velocidade: 10 },
    VOL: { defesa: 8, passe: 6, chute: 0, velocidade: 4 },
    MEI: { defesa: -2, passe: 12, chute: 4, velocidade: 4 },
    ATA: { defesa: -12, passe: 4, chute: 14, velocidade: 8 },
  }[pos];
  const jitterLeg = () => Math.round((rnd() - 0.5) * 14);
  const clamp99 = (n) => Math.max(40, Math.min(96, Math.round(n)));
  const legado = {
    defesa: clamp99(base + bias.defesa + jitterLeg()),
    passe: clamp99(base + bias.passe + jitterLeg()),
    chute: clamp99(base + bias.chute + jitterLeg()),
    velocidade: clamp99(base + bias.velocidade + jitterLeg()),
  };
  const d = legado20(legado.defesa);
  const p = legado20(legado.passe);
  const c = legado20(legado.chute);
  const v = legado20(legado.velocidade);
  const b = (d + p + c + v) / 4;
  return {
    tecnicos: {
      dominio: jitter(id, pos === 'GOL' || pos === 'MEI' ? p + 1 : p, 1),
      passe: p,
      chute: c,
      cabeceio: jitter(id, pos === 'ZAG' || pos === 'ATA' ? Math.max(d, c) : Math.round((d + c) / 2 - 1), 2),
      drible: jitter(id, pos === 'ATA' || pos === 'LAT' || pos === 'MEI' ? v : Math.round(v - 2), 3),
      lancamentos: jitter(id, pos === 'GOL' || pos === 'VOL' || pos === 'ZAG' ? p + 1 : p - 1, 4),
      bola_parada: jitter(id, pos === 'ATA' || pos === 'MEI' ? c + 1 : Math.round((c + p) / 2), 5),
    },
    mentais: {
      leitura_jogo: jitter(id, Math.round(d * 0.45 + p * 0.45 + (idade > 28 ? 2 : 0)), 6),
      cobertura: jitter(id, pos === 'GOL' || pos === 'ZAG' || pos === 'VOL' ? d + 1 : d, 7),
      criatividade: jitter(id, pos === 'MEI' || pos === 'ATA' ? p : Math.round(p - 1), 8),
      agressividade: jitter(id, pos === 'VOL' || pos === 'ZAG' ? b + 1 : Math.round(b - 1), 9),
      lideranca: jitter(id, Math.round(b + (idade >= 30 ? 2 : idade >= 26 ? 1 : -1)), 10),
      pressao: jitter(id, Math.round(b + (c >= 14 ? 1 : 0)), 11),
    },
    fisicos: {
      fora_por_lesao: jitter(
        id,
        idade >= 32 ? b - 2 : idade >= 29 ? b - 1 : idade <= 21 ? b : b + 1,
        12,
      ),
      velocidade: v,
      forca: jitter(id, pos === 'ZAG' || pos === 'VOL' || pos === 'GOL' ? d : Math.round((d + v) / 2), 13),
    },
  };
}

function overallFrom(pos, atributos) {
  const flat = { ...atributos.tecnicos, ...atributos.mentais, ...atributos.fisicos };
  const vals = Object.values(flat);
  const media = vals.reduce((s, n) => s + n, 0) / vals.length;
  return Math.max(40, Math.min(96, Math.round(media * 4.75)));
}

const jogadores = [];
let nextId = 1000;

for (const time of times) {
  const forca = time.forca_geral ?? time.prestigio ?? 75;
  const rnd = seededRand(time.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  let slot = 0;
  for (const [pos, count] of SQUAD_TEMPLATE) {
    for (let i = 0; i < count; i++) {
      nextId += 1;
      slot += 1;
      let status = 'NAO_RELACIONADO';
      if (slot <= TITULARES) status = 'TITULAR';
      else if (slot <= TITULARES + RESERVAS) status = 'RESERVA';
      const idade = 18 + Math.floor(rnd() * 20);
      const atributos = attrFor(pos, forca, rnd, nextId, idade);
      jogadores.push({
        id: nextId,
        time_id: time.id,
        nome: `Atleta ${time.nome ?? time.nome_curto} ${slot}`,
        idade,
        posicao: pos,
        atributos,
        overall: overallFrom(pos, atributos),
        energia: 100,
        status_escalacao: status,
      });
    }
  }
}

writeFileSync(join(outDir, 'jogadores.json'), `${JSON.stringify(jogadores, null, 2)}\n`, 'utf8');

console.log(`OK: ${times.length} times, ${jogadores.length} jogadores → ${outDir}/jogadores.json`);