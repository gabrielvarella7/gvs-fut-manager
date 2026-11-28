import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, FastForward, Play } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { executarIrParaProximoDia } from '../../engine/dayAdvanceEngine';

interface TopNavigationBarProps {
  clubeNome: string;
  clubeCorPrimaria: string;
  dataAtualISO: string;
  timeUsuarioId: string;
  rodadaAtual?: number;
  dataProximoJogoUsuarioISO: string | null;
  jogoDoDiaId?: number;
  coletivaPendente?: boolean;
  onDataAtualizada: (novaDataISO: string) => void;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  clubeNome,
  clubeCorPrimaria,
  dataAtualISO,
  timeUsuarioId,
  rodadaAtual = 1,
  dataProximoJogoUsuarioISO,
  jogoDoDiaId,
  coletivaPendente = false,
  onDataAtualizada,
}) => {
  const { atual, historicoPassado, historicoFuturo, voltar, avancar, navegarPara } =
    useNavigationStore();

  const [processandoDia, setProcessandoDia] = useState(false);

  const podeVoltar = historicoPassado.length > 0;
  const podeAvancar = historicoFuturo.length > 0;
  const ehDiaDeJogo = dataProximoJogoUsuarioISO === dataAtualISO;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.altKey && e.key === 'ArrowLeft' && podeVoltar) {
        e.preventDefault();
        voltar();
      } else if (e.altKey && e.key === 'ArrowRight' && podeAvancar) {
        e.preventDefault();
        avancar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [podeVoltar, podeAvancar, voltar, avancar]);

  const handleProximoDia = async () => {
    if (processandoDia) return;
    setProcessandoDia(true);

    try {
      const resultado = await executarIrParaProximoDia({
        dataAtualISO,
        timeUsuarioId,
        rodadaAtual,
        coletivaPendente,
        dataProximoJogoUsuarioISO,
        jogoDoDiaId,
      });

      if (resultado.novaDataISO !== dataAtualISO) {
        onDataAtualizada(resultado.novaDataISO);
      }

      if (resultado.acaoObrigatoria === 'COLETIVA_PENDENTE') {
        navegarPara({ tela: 'COLETIVA_POS_JOGO', titulo: 'Coletiva de Imprensa' });
      } else if (resultado.acaoObrigatoria === 'IR_PARA_JOGO') {
        navegarPara({
          tela: 'PRE_JOGO',
          parametroId: resultado.jogoDoDiaId ?? null,
          titulo: 'Dia de Jogo — Preleção & Escalação',
        });
      }
    } finally {
      setProcessandoDia(false);
    }
  };

  const formatarDataPTBR = (iso: string) => {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(ano, mes - 1, dia));
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 border-b border-slate-700 shadow-md select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={voltar}
            disabled={!podeVoltar}
            title={
              podeVoltar
                ? `Voltar para: ${historicoPassado[historicoPassado.length - 1].titulo}`
                : 'Nenhuma janela anterior'
            }
            className={`p-1.5 rounded-md transition-colors ${
              podeVoltar
                ? 'hover:bg-slate-700 text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={avancar}
            disabled={!podeAvancar}
            title={
              podeAvancar
                ? `Avançar para: ${historicoFuturo[0].titulo}`
                : 'Nenhuma janela posterior'
            }
            className={`p-1.5 rounded-md transition-colors ${
              podeAvancar
                ? 'hover:bg-slate-700 text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full border border-white/40"
            style={{ backgroundColor: clubeCorPrimaria || '#10b981' }}
          />
          <span className="font-bold text-sm tracking-wide uppercase text-slate-200">
            {clubeNome}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-medium text-emerald-400">{atual.titulo}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="capitalize">{formatarDataPTBR(dataAtualISO)}</span>
        </div>

        <button
          type="button"
          onClick={handleProximoDia}
          disabled={processandoDia || atual.tela === 'PARTIDA_AO_VIVO'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow transition-all cursor-pointer ${
            atual.tela === 'PARTIDA_AO_VIVO'
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : coletivaPendente
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : ehDiaDeJogo
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-pulse'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {coletivaPendente ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Responder Coletiva</span>
            </>
          ) : ehDiaDeJogo ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ir para o Jogo</span>
            </>
          ) : (
            <>
              <FastForward className="w-3.5 h-3.5 fill-current" />
              <span>{processandoDia ? 'Avançando...' : 'Ir para o Próximo Dia'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
