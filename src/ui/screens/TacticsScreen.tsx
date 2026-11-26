import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import { escalacaoAssistenteMelhorOverall } from '../../career/assistenteTecnico';
import { idsEscalacaoPadrao } from '../../career/lineup';
import { ordenarElenco } from '../../career/ordenarElenco';
import { layoutCampinho } from '../../data/campinhoCoords';
import {
  gradePadrao,
  gradesIguais,
  moverSlotNaGrade,
  type CelulaGrade,
} from '../../data/gradeCampinho';
import { LISTA_ESQUEMAS, RESUMO_ESQUEMAS } from '../../data/esquemasTaticos';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn } from '../cm/CmShell';
import { TacticPitch } from '../tactics/TacticPitch';
import { TacticSquadPanel } from '../tactics/TacticSquadPanel';
import type { EsquemaTatico, Jogador } from '../../types/schema';

export type SelecaoTatica = EsquemaTatico | 'PERSONALIZADO';
type AbaTatica = 'esquemas' | 'jogadores';

export function TacticsScreen() {
  const esquemaAtual = useGameStore((s) => s.esquemaAtual);
  const alinhamentoSalvo = useGameStore((s) => s.alinhamento11);
  const gradeSalva = useGameStore((s) => s.gradeTatica11);
  const personalizadoSalvo = useGameStore((s) => s.usoTaticaPersonalizada);
  const commitEscolha = useGameStore((s) => s.commitEscolhaTatica);
  const partidaRetorno = useGameStore((s) => s.partidaRetornoTatica);
  const voltarPartida = useGameStore((s) => s.voltarDaTaticaParaPartida);
  const perfil = useGameStore((s) => s.perfil);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timeUsuarioId = useGameStore((s) => s.timeUsuarioId);
  const timesFicticios = useGameStore((s) => s.timesFicticios);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);

  const [selecao, setSelecao] = useState<SelecaoTatica>(
    personalizadoSalvo ? 'PERSONALIZADO' : esquemaAtual,
  );
  const [esquemaBase, setEsquemaBase] = useState<EsquemaTatico>(esquemaAtual);
  const [slotIds, setSlotIds] = useState<number[]>([]);
  const [grade11, setGrade11] = useState<CelulaGrade[]>([]);
  const [aba, setAba] = useState<AbaTatica>('jogadores');
  const [slotSubs, setSlotSubs] = useState<number | null>(null);
  const [reservaSubs, setReservaSubs] = useState<number | null>(null);
  const [arrastandoJogadorId, setArrastandoJogadorId] = useState<number | null>(null);
  const [slotAguardandoReserva, setSlotAguardandoReserva] = useState<number | null>(null);

  const esquemaGrafico = selecao === 'PERSONALIZADO' ? esquemaBase : selecao;

  const elenco: Jogador[] = useMemo(() => {
    if (clubeRealId) {
      return ordenarElenco(jogadoresReais.filter((j) => j.time_id === clubeRealId));
    }
    const fic = getTimeFicticio(timesFicticios, timeUsuarioId ?? '');
    return ordenarElenco(fic?.jogadores ?? []);
  }, [clubeRealId, jogadoresReais, timesFicticios, timeUsuarioId]);

  const idsPadrao = useCallback(
    (esq: EsquemaTatico) => idsEscalacaoPadrao(elenco, esq),
    [elenco],
  );

  useEffect(() => {
    const esq = esquemaAtual;
    setEsquemaBase(esq);
    if (alinhamentoSalvo?.length === 11) {
      setSlotIds(alinhamentoSalvo);
    }
    if (personalizadoSalvo && gradeSalva?.length === 11) {
      setSelecao('PERSONALIZADO');
      setGrade11(gradeSalva.map((c) => ({ ...c })));
    } else if (!personalizadoSalvo) {
      setSelecao(esquemaAtual);
      setGrade11(gradePadrao(esq));
    }
    // gradeSalva lido só quando muda esquema/alinhamento/modo — não a cada auto-save
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gradeSalva omitido de propósito
  }, [esquemaAtual, alinhamentoSalvo, personalizadoSalvo]);

  useEffect(() => {
    if (elenco.length === 0) return;
    if (alinhamentoSalvo?.length === 11) return;
    setSlotIds((prev) => (prev.length === 11 ? prev : idsPadrao(esquemaAtual)));
  }, [elenco.length, alinhamentoSalvo, esquemaAtual, idsPadrao]);

  const entrarPersonalizado = useCallback(
    (esquemaRef?: EsquemaTatico) => {
      setSelecao('PERSONALIZADO');
      setEsquemaBase((b) => esquemaRef ?? (selecao !== 'PERSONALIZADO' ? (selecao as EsquemaTatico) : b));
    },
    [selecao],
  );

  const escolherEsquema = (e: EsquemaTatico) => {
    setSelecao(e);
    setEsquemaBase(e);
    setGrade11(gradePadrao(e));
    setSlotIds(idsPadrao(e));
  };

  const escolherPersonalizado = () => {
    if (grade11.length !== 11) {
      setGrade11(gradePadrao(esquemaGrafico));
    }
    setSelecao('PERSONALIZADO');
  };

  const trocarJogadores = (a: number, b: number) => {
    const next = [...slotIds];
    [next[a], next[b]] = [next[b], next[a]];
    const personalizado = true;
    entrarPersonalizado();
    setSlotIds(next);
    persistirLineup(next, grade11, 'PERSONALIZADO', esquemaBase, personalizado);
  };

  const persistirLineup = useCallback(
    (
      ids: number[],
      grade: CelulaGrade[],
      sel: SelecaoTatica,
      base: EsquemaTatico,
      personalizado: boolean,
    ) => {
      commitEscolha({
        esquema: personalizado ? base : (sel as EsquemaTatico),
        alinhamento11: ids,
        gradeTatica11: personalizado ? grade : null,
        personalizado,
      });
    },
    [commitEscolha],
  );

  const aplicarMelhorOverall = () => {
    const esq = esquemaGrafico;
    const ids = escalacaoAssistenteMelhorOverall(elenco, esq);
    if (ids.length < 11) return;
    const grade = gradePadrao(esq);
    setSlotIds(ids);
    setGrade11(grade);
    const personalizado = selecao === 'PERSONALIZADO';
    if (personalizado) entrarPersonalizado();
    persistirLineup(
      ids,
      grade,
      personalizado ? 'PERSONALIZADO' : esq,
      personalizado ? esquemaBase : esq,
      personalizado,
    );
  };

  const aplicarSubstituicao = (slot: number, jogadorId: number) => {
    const next = [...slotIds];
    const outroSlot = next.indexOf(jogadorId);
    const saida = next[slot];
    next[slot] = jogadorId;
    if (outroSlot >= 0 && outroSlot !== slot) next[outroSlot] = saida;
    setSelecao('PERSONALIZADO');
    entrarPersonalizado();
    setSlotIds(next);
    setSlotSubs(null);
    setReservaSubs(null);
    setArrastandoJogadorId(null);
    setSlotAguardandoReserva(null);
    persistirLineup(next, grade11, 'PERSONALIZADO', esquemaBase, true);
  };

  const onSlotElenco = (slot: number) => {
    if (reservaSubs != null) {
      aplicarSubstituicao(slot, reservaSubs);
      return;
    }
    setSlotSubs((s) => (s === slot ? null : slot));
    setReservaSubs(null);
  };

  const soltarJogadorNoSlot = (slot: number) => {
    if (arrastandoJogadorId != null) {
      aplicarSubstituicao(slot, arrastandoJogadorId);
      return;
    }
    setArrastandoJogadorId(null);
  };

  const arrastoSaiuDoCampo = (slot: number) => {
    const id = slotIds[slot];
    if (id == null) return;
    setSlotAguardandoReserva(slot);
    setArrastandoJogadorId(id);
    setSlotSubs(null);
    setReservaSubs(null);
  };

  const soltarReservaComCampo = (jogadorIdReserva: number) => {
    if (slotAguardandoReserva != null) {
      aplicarSubstituicao(slotAguardandoReserva, jogadorIdReserva);
    }
  };

  const onReservaElenco = (jogadorId: number) => {
    if (slotAguardandoReserva != null) {
      aplicarSubstituicao(slotAguardandoReserva, jogadorId);
      return;
    }
    if (slotSubs != null) {
      aplicarSubstituicao(slotSubs, jogadorId);
      return;
    }
    setReservaSubs((r) => (r === jogadorId ? null : jogadorId));
    setSlotSubs(null);
  };

  const moverSlotGrade = (slot: number, destino: CelulaGrade) => {
    const slots = layoutCampinho(esquemaGrafico);
    if (slots[slot]?.pos === 'GOL' || destino.gol) return;
    const d = destino;
    const novaGrade = moverSlotNaGrade(grade11, slot, d);
    setGrade11(novaGrade);
    entrarPersonalizado();
    persistirLineup(slotIds, novaGrade, 'PERSONALIZADO', esquemaBase, true);
  };

  const hashSlots = JSON.stringify(slotIds);
  const hashSalvo = JSON.stringify(alinhamentoSalvo ?? []);
  const esquemaPendente = selecao !== 'PERSONALIZADO' && selecao !== esquemaAtual;
  const lineupPendente = hashSlots !== hashSalvo;
  const modoPendente = (selecao === 'PERSONALIZADO') !== personalizadoSalvo;
  const gradeReferenciaSalva =
    personalizadoSalvo && gradeSalva?.length === 11
      ? gradeSalva
      : gradePadrao(esquemaBase);
  const gradePendente = !gradesIguais(grade11, gradeReferenciaSalva);
  const escolhaPendente = esquemaPendente || lineupPendente || modoPendente || gradePendente;

  const salvarEscolha = () => {
    const personalizado = selecao === 'PERSONALIZADO';
    commitEscolha({
      esquema: personalizado ? esquemaBase : selecao,
      alinhamento11: slotIds,
      gradeTatica11: personalizado ? grade11 : null,
      personalizado,
    });
    if (partidaRetorno) voltarPartida();
  };

  const rotuloCampo =
    selecao === 'PERSONALIZADO' ? `Personalizado (${esquemaBase})` : selecao;

  return (
    <CmCareerShell
      titulo="Tática"
      subtitulo={
        perfil
          ? `Preferência: ${perfil.esquemaPreferido} · Em jogo: ${
              personalizadoSalvo ? `Personalizado (${esquemaAtual})` : esquemaAtual
            }`
          : `Em jogo: ${esquemaAtual}`
      }
      escolhaPendente={escolhaPendente}
      onSalvarEscolha={salvarEscolha}
      exibirSalvarEscolha
      rotuloSalvarEscolha="Salvar tática"
      acoesExtras={
        partidaRetorno ? (
          <CmBtn
            variant="ghost"
            onClick={voltarPartida}
          >
            Voltar à partida
          </CmBtn>
        ) : undefined
      }
    >
      <nav className="mb-4 flex gap-1 border-b border-zinc-800 pb-2">
        {(
          [
            { id: 'jogadores' as const, label: 'Jogadores' },
            { id: 'esquemas' as const, label: 'Esquemas' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba(t.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              aba === t.id
                ? 'bg-emerald-900 text-emerald-100'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {aba === 'jogadores' && elenco.length >= 11 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <CmBtn variant="ghost" type="button" onClick={aplicarMelhorOverall}>
            Assistente escolhe os melhores
          </CmBtn>
          <span className="self-center text-xs text-zinc-500">
            Maior OVR em cada posição do esquema {rotuloCampo} (exclui lesionados).
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="w-full shrink-0 lg:w-56 xl:w-60">
          {aba === 'esquemas' ? (
          <ul className="flex max-h-[min(72vh,520px)] flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
            {LISTA_ESQUEMAS.map((e) => (
              <li key={e}>
                <button
                  type="button"
                  onClick={() => escolherEsquema(e)}
                  className={`w-full min-w-[7.5rem] rounded border px-3 py-2 text-left lg:min-w-0 ${
                    selecao === e
                      ? 'border-emerald-500 bg-emerald-950 text-emerald-100'
                      : !personalizadoSalvo && e === esquemaAtual
                        ? 'border-zinc-600 bg-zinc-800/80 text-zinc-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-base font-semibold">{e}</span>
                  <span className="mt-0.5 block text-[10px] leading-tight opacity-75">
                    {RESUMO_ESQUEMAS[e]}
                  </span>
                </button>
              </li>
            ))}
            <li className="pt-1 lg:border-t lg:border-zinc-800">
              <button
                type="button"
                onClick={escolherPersonalizado}
                className={`w-full min-w-[7.5rem] rounded border px-3 py-2 text-left lg:min-w-0 ${
                  selecao === 'PERSONALIZADO'
                    ? 'border-amber-500 bg-amber-950/50 text-amber-100'
                    : personalizadoSalvo
                      ? 'border-zinc-600 bg-zinc-800/80 text-zinc-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <span className="text-base font-semibold">Personalizado</span>
                <span className="mt-0.5 block text-[10px] leading-tight opacity-75">
                  5 por linha · pontas + trio central
                </span>
              </button>
            </li>
          </ul>
          ) : (
            grade11.length === 11 &&
            slotIds.length === 11 && (
              <div className="max-h-[min(78vh,580px)] overflow-y-auto pr-1">
              <TacticSquadPanel
                elenco={elenco}
                slotIds={slotIds}
                grade11={grade11}
                esquema={esquemaGrafico}
                slotAtivo={slotSubs}
                reservaAtiva={reservaSubs}
                onSlotClick={onSlotElenco}
                onReservaClick={onReservaElenco}
                onArrastarJogador={(id) => {
                  setArrastandoJogadorId(id);
                  setSlotAguardandoReserva(null);
                }}
                arrastandoJogadorId={arrastandoJogadorId}
                slotAguardandoReserva={slotAguardandoReserva}
                onSoltarReservaComCampo={soltarReservaComCampo}
              />
              </div>
            )
          )}
        </aside>
        <div className="min-h-[300px] min-w-0 flex-1 overflow-hidden pb-2">
          {grade11.length === 11 && (
            <TacticPitch
              esquema={esquemaGrafico}
              rotulo={rotuloCampo}
              elenco={elenco}
              slotIds={slotIds}
              grade11={grade11}
              onTrocarJogadores={trocarJogadores}
              onMoverSlotGrade={moverSlotGrade}
              arrastandoJogadorId={arrastandoJogadorId}
              onSoltarJogadorNoSlot={soltarJogadorNoSlot}
              onArrastoElencoCancelado={() => {
                setArrastandoJogadorId(null);
                setSlotAguardandoReserva(null);
              }}
              onArrastoSaiuDoCampo={arrastoSaiuDoCampo}
            />
          )}
        </div>
      </div>
    </CmCareerShell>
  );
}