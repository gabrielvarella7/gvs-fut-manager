import { LEGENDA_VISAO_GERAL } from '../../career/perfilJogador';
import { CmBtn } from '../cm/CmShell';

export function ModalVisaoAtributos({ onFechar }: { onFechar: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-labelledby="modal-visao-titulo"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <h2 id="modal-visao-titulo" className="text-lg font-semibold text-zinc-100">
          Visão geral dos atributos
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          O pentágono resume os 16 atributos do jogador (técnicos, mentais e físicos, escala 1–20),
          a posição em campo e o overall — útil para comparar rapidamente com a referência da função.
        </p>
        <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
          {LEGENDA_VISAO_GERAL.map((l) => (
            <li key={l.sigla} className="text-sm">
              <span className="font-bold text-zinc-200">{l.sigla}</span>
              <span className="text-zinc-500"> — </span>
              <span className="text-zinc-300">{l.nome}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          Verde: destaque · Amarelo/laranja: médio · Vermelho: abaixo da média para a função.
        </p>
        <div className="mt-5 flex justify-end">
          <CmBtn variant="ghost" onClick={onFechar}>
            Fechar
          </CmBtn>
        </div>
      </div>
    </div>
  );
}