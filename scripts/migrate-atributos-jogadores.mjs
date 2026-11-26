/**
 * Converte public/database/jogadores.json do formato antigo (4 attrs) para
 * técnicos / mentais / físicos (1–20).
 * Rodar: node scripts/migrate-atributos-jogadores.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'public', 'database', 'jogadores.json');

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

function isLegado(a) {
  return a && typeof a === 'object' && 'defesa' in a && !('tecnicos' in a);
}

function converter(posicao, legado, id, idade) {
  const d = legado20(legado.defesa);
  const p = legado20(legado.passe);
  const c = legado20(legado.chute);
  const v = legado20(legado.velocidade);
  const base = (d + p + c + v) / 4;

  const tecnicos = {
    dominio: jitter(id, posicao === 'GOL' || posicao === 'MEI' ? p + 1 : p, 1),
    passe: p,
    chute: c,
    cabeceio: jitter(id, posicao === 'ZAG' || posicao === 'ATA' ? Math.max(d, c) : Math.round((d + c) / 2 - 1), 2),
    drible: jitter(id, posicao === 'ATA' || posicao === 'LAT' || posicao === 'MEI' ? v : Math.round(v - 2), 3),
    lancamentos: jitter(id, posicao === 'GOL' || posicao === 'VOL' || posicao === 'ZAG' ? p + 1 : p - 1, 4),
    bola_parada: jitter(id, posicao === 'ATA' || posicao === 'MEI' ? c + 1 : Math.round((c + p) / 2), 5),
  };

  const mentais = {
    leitura_jogo: jitter(id, Math.round(d * 0.45 + p * 0.45 + (idade > 28 ? 2 : 0)), 6),
    cobertura: jitter(id, posicao === 'GOL' || posicao === 'ZAG' || posicao === 'VOL' ? d + 1 : d, 7),
    criatividade: jitter(id, posicao === 'MEI' || posicao === 'ATA' ? p : Math.round(p - 1), 8),
    agressividade: jitter(id, posicao === 'VOL' || posicao === 'ZAG' ? base + 1 : Math.round(base - 1), 9),
    lideranca: jitter(id, Math.round(base + (idade >= 30 ? 2 : idade >= 26 ? 1 : -1)), 10),
    pressao: jitter(id, Math.round(base + (c >= 14 ? 1 : 0)), 11),
  };

  const lesaoBase = idade >= 32 ? base - 2 : idade >= 29 ? base - 1 : idade <= 21 ? base : base + 1;

  const fisicos = {
    fora_por_lesao: jitter(id, lesaoBase, 12),
    velocidade: v,
    forca: jitter(id, posicao === 'ZAG' || posicao === 'VOL' || posicao === 'GOL' ? d : Math.round((d + v) / 2), 13),
  };

  return { tecnicos, mentais, fisicos };
}

function overall(posicao, atributos) {
  const pesos = {
    GOL: { cobertura: 1.3, dominio: 1.4 },
    ZAG: { cobertura: 1.4, cabeceio: 1.3 },
    ATA: { chute: 1.3, velocidade: 1.15 },
  }[posicao] ?? {};
  const flat = { ...atributos.tecnicos, ...atributos.mentais, ...atributos.fisicos };
  let soma = 0;
  let pt = 0;
  for (const [k, val] of Object.entries(flat)) {
    const w = pesos[k] ?? 1;
    soma += val * w;
    pt += w;
  }
  return Math.max(40, Math.min(96, Math.round((soma / pt) * 4.75)));
}

const lista = JSON.parse(readFileSync(path, 'utf8'));
let migrados = 0;

for (const j of lista) {
  if (!isLegado(j.atributos)) continue;
  j.atributos = converter(j.posicao, j.atributos, j.id, j.idade);
  if (!j.overall) j.overall = overall(j.posicao, j.atributos);
  migrados += 1;
}

writeFileSync(path, `${JSON.stringify(lista, null, 2)}\n`, 'utf8');
console.log(`OK: ${migrados} jogadores migrados → ${path}`);