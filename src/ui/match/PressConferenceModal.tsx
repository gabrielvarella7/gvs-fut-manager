import { useState } from 'react';
import type {
  ColetivaPosJogo,
  OpcaoRespostaColetiva,
  ResultadoColetiva,
} from '../../engine/pressConferenceEngine';
import { CmBtn } from '../cm/CmShell';

type Props = {
  coletiva: ColetivaPosJogo;
  onEscolher: (opcao: OpcaoRespostaColetiva) => ResultadoColetiva;
  onContinuar: () => void;
};

function tomCor(tom: OpcaoRespostaColetiva['tom']): string {
  if (tom === 'MOTIVADORA') return 'border-emerald-700/70 hover:bg-emerald-950/50';
  if (tom === 'CRITICA') return 'border-rose-800/70 hover:bg-rose-950/40';
  return 'border-zinc-600 hover:bg-zinc-800/80';
}

function tomLabel(tom: OpcaoRespostaColetiva['tom']): string {
  if (tom === 'MOTIVADORA') return 'Motivadora';
  if (tom === 'CRITICA') return 'Crítica';
  return 'Neutra';
}

export function PressConferenceModal({ coletiva, onEscolher, onContinuar }: Props) {
  const [resultado, setResultado] = useState<ResultadoColetiva | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-labelledby="coletiva-titulo"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Coletiva pós-jogo</p>
        <h2 id="coletiva-titulo" className="mt-1 text-lg font-semibold text-emerald-50">
          Imprensa — {coletiva.clubeSigla}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Foco: {coletiva.jogadorAlvo.nome} · nota {coletiva.jogadorAlvo.notaPartida.toFixed(1)} ·{' '}
          {coletiva.contextoResultado.toLowerCase()}
        </p>

        <blockquote className="mt-4 rounded border-l-2 border-sky-600 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
          {coletiva.perguntaImprensa}
        </blockquote>

        {!resultado ? (
          <ul className="mt-4 space-y-2">
            {coletiva.opcoes.map((op) => (
              <li key={op.id}>
                <button
                  type="button"
                  onClick={() => setResultado(onEscolher(op))}
                  className={`w-full rounded border px-3 py-2.5 text-left text-sm text-zinc-100 transition ${tomCor(op.tom)}`}
                >
                  <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {tomLabel(op.tom)}
                  </span>
                  {op.rotuloBotao}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded border border-zinc-700 bg-zinc-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">
                Manchete
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{resultado.mancheteGerada}</p>
            </div>
            <p className="text-sm text-zinc-300">{resultado.reacaoJogadorTexto}</p>
            <p className="text-xs text-zinc-500">
              Moral {coletiva.jogadorAlvo.nome}:{' '}
              <span className="tabular-nums text-zinc-300">
                {resultado.deltaMoralJogador >= 0 ? '+' : ''}
                {resultado.deltaMoralJogador}
              </span>
              {' · '}
              Elenco:{' '}
              <span className="tabular-nums text-zinc-300">
                {resultado.deltaMoralElenco >= 0 ? '+' : ''}
                {resultado.deltaMoralElenco}
              </span>
              {resultado.efeitoInesperado ? (
                <span className="ml-2 text-amber-400">Efeito inesperado</span>
              ) : null}
            </p>
            <div className="flex justify-end pt-1">
              <CmBtn variant="primary" onClick={onContinuar}>
                Continuar
              </CmBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
