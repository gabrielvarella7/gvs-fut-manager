import type { VisaoGeralAtributos } from '../../career/perfilJogador';
import { LEGENDA_VISAO_GERAL, corNotaAtributo } from '../../career/perfilJogador';

const ORDEM: (keyof VisaoGeralAtributos)[] = ['ATT', 'CRE', 'DEF', 'TAC', 'TEC'];

const CX = 120;
const CY = 115;
const RAIO_MAX = 72;

function ponto(anguloDeg: number, valor: number, max = 99): { x: number; y: number } {
  const rad = ((anguloDeg - 90) * Math.PI) / 180;
  const r = (valor / max) * RAIO_MAX;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function poligono(valores: VisaoGeralAtributos): string {
  const passos = 360 / ORDEM.length;
  return ORDEM.map((k, i) => {
    const p = ponto(i * passos, valores[k]);
    return `${p.x},${p.y}`;
  }).join(' ');
}

function grade(nivel: number): string {
  const passos = 360 / ORDEM.length;
  return ORDEM.map((_, i) => {
    const p = ponto(i * passos, nivel);
    return `${p.x},${p.y}`;
  }).join(' ');
}

export function AtributosRadar({
  jogador,
  referencia,
}: {
  jogador: VisaoGeralAtributos;
  referencia?: VisaoGeralAtributos;
}) {
  const passos = 360 / ORDEM.length;

  return (
    <div className="w-full max-w-xs">
      <svg viewBox="0 0 240 230" className="mx-auto w-full" role="img" aria-label="Gráfico de atributos">
        {[25, 50, 75, 99].map((n) => (
          <polygon
            key={n}
            points={grade(n)}
            fill="none"
            stroke="rgba(113,113,122,0.35)"
            strokeWidth={n === 99 ? 1.2 : 0.8}
          />
        ))}
        {ORDEM.map((_, i) => {
          const p = ponto(i * passos, 99);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(113,113,122,0.35)"
              strokeWidth={0.8}
            />
          );
        })}
        {referencia && (
          <polygon
            points={poligono(referencia)}
            fill="rgba(180, 83, 9, 0.08)"
            stroke="rgba(217, 119, 6, 0.75)"
            strokeWidth={1.5}
          />
        )}
        <polygon
          points={poligono(jogador)}
          fill="rgba(16, 185, 129, 0.35)"
          stroke="rgba(52, 211, 153, 0.95)"
          strokeWidth={1.5}
        />
        {ORDEM.map((k, i) => {
          const labelPos = ponto(i * passos, 99 + 14);
          const cor = corNotaAtributo(jogador[k]);
          return (
            <g key={k}>
              <rect
                x={labelPos.x - 26}
                y={labelPos.y - 11}
                width={52}
                height={22}
                rx={4}
                fill={cor}
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 4}
                textAnchor="middle"
                fill="#18181b"
                fontSize={11}
                fontWeight={700}
              >
                {k} {jogador[k]}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 hidden text-xs text-zinc-500 sm:block">
        {LEGENDA_VISAO_GERAL.map((l) => (
          <li key={l.sigla}>
            <span className="font-semibold text-zinc-400">{l.sigla}</span> — {l.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}