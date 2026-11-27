import { useEffect, type ReactNode } from 'react';
import type { TelaJogo } from '../../career/types';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmShell } from './CmShell';

const NAV_PRO: { tela: TelaJogo; label: string }[] = [
  { tela: 'escritorio', label: 'Escritório' },
  { tela: 'elenco', label: 'Elenco' },
  { tela: 'treinos', label: 'Treinos' },
  { tela: 'noticias', label: 'Notícias' },
  { tela: 'transferencias', label: 'Transferências' },
  { tela: 'financas', label: 'Finanças' },
  { tela: 'classificacao', label: 'Tabela' },
  { tela: 'calendario', label: 'Calendário' },
  { tela: 'tatica', label: 'Táticas' },
];

const NAV_AMADOR: { tela: TelaJogo; label: string }[] = [
  { tela: 'hub_torneio', label: 'Torneio' },
  { tela: 'elenco', label: 'Elenco' },
  { tela: 'tatica', label: 'Táticas' },
];

type Props = {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  mostrarNav?: boolean;
  escolhaPendente?: boolean;
  onSalvarEscolha?: () => void;
  /** Exibe o botão de salvar escolha mesmo sem alterações pendentes (ex.: tela de tática). */
  exibirSalvarEscolha?: boolean;
  rotuloSalvarEscolha?: string;
  acoesExtras?: ReactNode;
};

export function CmCareerShell({
  titulo,
  subtitulo,
  children,
  mostrarNav = true,
  escolhaPendente,
  onSalvarEscolha,
  exibirSalvarEscolha = false,
  rotuloSalvarEscolha = 'Salvar escolha',
  acoesExtras,
}: Props) {
  const tela = useGameStore((s) => s.tela);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const irPara = useGameStore((s) => s.irPara);
  const salvar = useGameStore((s) => s.salvarCarreira);
  const sair = useGameStore((s) => s.sairParaMenu);
  const avisoSalvo = useGameStore((s) => s.avisoSalvo);
  const limparAviso = useGameStore((s) => s.limparAvisoSalvo);
  const noticias = useGameStore((s) => s.noticias);
  const noticiasVistasIds = useGameStore((s) => s.noticiasVistasIds);
  const vistas = new Set(noticiasVistasIds);
  const noticiasNovas = noticias.filter((n) => !vistas.has(n.id)).length;

  const nav = clubeRealId ? NAV_PRO : NAV_AMADOR;

  useEffect(() => {
    if (!avisoSalvo) return;
    const t = window.setTimeout(limparAviso, 3500);
    return () => window.clearTimeout(t);
  }, [avisoSalvo, limparAviso]);

  return (
    <CmShell
      titulo={titulo}
      subtitulo={subtitulo}
      rodape={
        <div className="flex flex-col gap-3">
          {mostrarNav && (
            <nav className="flex flex-wrap gap-1 border-b border-zinc-800 pb-3">
              {nav.map((item) => (
                <button
                  key={item.tela}
                  type="button"
                  onClick={() => irPara(item.tela)}
                  className={`relative rounded px-2 py-1 text-xs font-medium ${
                    tela === item.tela
                      ? 'bg-emerald-900 text-emerald-100'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                  {item.tela === 'noticias' && noticiasNovas > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-400 px-1 text-[9px] font-bold text-slate-950"
                      aria-label={`${noticiasNovas} notícias novas`}
                    >
                      {noticiasNovas > 9 ? '9+' : noticiasNovas}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
          <div
            className="min-h-[2.75rem] empty:hidden"
            aria-live="polite"
            aria-atomic="true"
          >
            {avisoSalvo && (
              <p className="rounded border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">
                {avisoSalvo}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {acoesExtras}
            {(exibirSalvarEscolha || escolhaPendente) && onSalvarEscolha && (
              <CmBtn
                variant={exibirSalvarEscolha || escolhaPendente ? 'primary' : 'ghost'}
                onClick={onSalvarEscolha}
              >
                {rotuloSalvarEscolha}
              </CmBtn>
            )}
            <CmBtn variant="ghost" onClick={salvar}>
              Salvar jogo
            </CmBtn>
            <CmBtn variant="danger" onClick={sair}>
              Sair
            </CmBtn>
          </div>
        </div>
      }
    >
      {children}
    </CmShell>
  );
}
