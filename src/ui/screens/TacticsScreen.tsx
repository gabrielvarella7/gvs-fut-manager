import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import {
  bloqueadoPorLesaoComEnergiaBaixa,
  mensagemBloqueioLesaoEnergia,
  sanitizarAlinhamento11,
} from '../../career/aptidaoEscalacao';
import { escalacaoAssistenteMelhorOverall } from '../../career/assistenteTecnico';
import {
  idsBancoPadrao,
  idsEscalacaoPadrao,
  RESERVAS_PARTIDA,
  validarRelacionadosPartida,
} from '../../career/lineup';
import { ordenarElenco } from '../../career/ordenarElenco';
import { layoutCampinho } from '../../data/campinhoCoords';
import {
  gradePadrao,
  gradesIguais,
  moverSlotNaGrade,
  type CelulaGrade,
} from '../../data/gradeCampinho';
import { LISTA_ESQUEMAS, RESUMO_ESQUEMAS, SLOTS_POR_ESQUEMA } from '../../data/esquemasTaticos';
import { formacaoIdDeEsquema, previewAlertasTatica } from '../../engine/tacticsEngine';
import { useGameStore } from '../../store/useGameStore';
import type {
  ConfiguracaoTaticaClube,
  EstiloJogoId,
  InstrucoesColetivas,
} from '../../types/tactics';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn } from '../cm/CmShell';
import { TacticPitch } from '../tactics/TacticPitch';
import { TacticSquadPanel } from '../tactics/TacticSquadPanel';
import type { EsquemaTatico, Jogador } from '../../types/schema';

export type SelecaoTatica = EsquemaTatico | 'PERSONALIZADO';
type AbaTatica = 'esquemas' | 'jogadores' | 'filosofia';

function TacticsSub23ReadOnly() {
  const esquemaAtual = useGameStore((s) => s.esquemaAtual);
  return (
    <CmCareerShell
      titulo="Táticas Sub23"
      subtitulo="Somente leitura — a IA define escalação e esquema do Sub-23"
    >
      <div className="rounded border border-sky-900/50 bg-sky-950/20 p-4 text-sm text-zinc-300">
        <p className="font-medium text-sky-100">Você não gerencia táticas do Sub-23.</p>
        <p className="mt-2 text-zinc-400">
          Escalação, formação e instruções são escolhidas automaticamente pela IA em cada partida do
          Brasileirão Sub23. Use Elenco para promover atletas ao profissional.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Esquema de referência do clube profissional: {esquemaAtual}
        </p>
      </div>
    </CmCareerShell>
  );
}

export function TacticsScreen() {
  const modoSub23 = useGameStore((s) => s.modoSub23);
  if (modoSub23) return <TacticsSub23ReadOnly />;
  return <TacticsScreenPro />;
}

function TacticsScreenPro() {
  const esquemaAtual = useGameStore((s) => s.esquemaAtual);
  const alinhamentoSalvo = useGameStore((s) => s.alinhamento11);
  const bancoSalvo = useGameStore((s) => s.banco11);
  const gradeSalva = useGameStore((s) => s.gradeTatica11);
  const personalizadoSalvo = useGameStore((s) => s.usoTaticaPersonalizada);
  const commitEscolha = useGameStore((s) => s.commitEscolhaTatica);
  const avisoSalvo = useGameStore((s) => s.avisoSalvo);
  const partidaRetorno = useGameStore((s) => s.partidaRetornoTatica);
  const voltarPartida = useGameStore((s) => s.voltarDaTaticaParaPartida);
  const perfil = useGameStore((s) => s.perfil);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timeUsuarioId = useGameStore((s) => s.timeUsuarioId);
  const timesFicticios = useGameStore((s) => s.timesFicticios);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const dbTaticas = useGameStore((s) => s.dbTaticas);
  const configSalva = useGameStore((s) => s.configTatica);
  const [configLocal, setConfigLocal] = useState<ConfiguracaoTaticaClube>(configSalva);

  const [selecao, setSelecao] = useState<SelecaoTatica>(
    personalizadoSalvo ? 'PERSONALIZADO' : esquemaAtual,
  );
  const [esquemaBase, setEsquemaBase] = useState<EsquemaTatico>(esquemaAtual);
  const [slotIds, setSlotIds] = useState<number[]>([]);
  const [bancoIds, setBancoIds] = useState<number[]>([]);
  const [grade11, setGrade11] = useState<CelulaGrade[]>([]);
  const [aba, setAba] = useState<AbaTatica>('jogadores');
  const [slotSubs, setSlotSubs] = useState<number | null>(null);
  const [reservaSubs, setReservaSubs] = useState<number | null>(null);
  const [arrastandoJogadorId, setArrastandoJogadorId] = useState<number | null>(null);
  const [slotAguardandoReserva, setSlotAguardandoReserva] = useState<number | null>(null);

  useEffect(() => {
    setConfigLocal(configSalva);
  }, [configSalva]);

  const esquemaGrafico = selecao === 'PERSONALIZADO' ? esquemaBase : selecao;

  const configParaEsquema = useCallback(
    (esq: EsquemaTatico, cfg: ConfiguracaoTaticaClube) => ({
      ...cfg,
      formacao_id: formacaoIdDeEsquema(esq),
    }),
    [],
  );

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
    if (bancoSalvo?.length) {
      setBancoIds(bancoSalvo.filter((id) => id > 0));
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
  }, [esquemaAtual, alinhamentoSalvo, bancoSalvo, personalizadoSalvo]);

  useEffect(() => {
    if (elenco.length === 0) return;
    if (alinhamentoSalvo?.length === 11) return;
    setSlotIds((prev) => (prev.length === 11 ? prev : idsPadrao(esquemaAtual)));
  }, [elenco.length, alinhamentoSalvo, esquemaAtual, idsPadrao]);

  /** Mantém banco sem ids que viraram titulares. */
  useEffect(() => {
    const tit = new Set(slotIds.filter((id) => id > 0));
    setBancoIds((prev) => {
      const next = prev.filter((id) => id > 0 && !tit.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [slotIds]);

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
    const ids = idsPadrao(e);
    setSlotIds(ids);
    setBancoIds(idsBancoPadrao(elenco, ids));
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
    persistirLineup(next, bancoIds, grade11, 'PERSONALIZADO', esquemaBase, personalizado);
  };

  const persistirLineup = useCallback(
    (
      ids: number[],
      banco: number[],
      grade: CelulaGrade[],
      sel: SelecaoTatica,
      base: EsquemaTatico,
      personalizado: boolean,
    ) => {
      const esq = personalizado ? base : (sel as EsquemaTatico);
      const tit = new Set(ids.filter((id) => id > 0));
      const bancoLimpo = banco.filter((id) => id > 0 && !tit.has(id)).slice(0, RESERVAS_PARTIDA);
      commitEscolha({
        esquema: esq,
        alinhamento11: ids,
        banco11: bancoLimpo,
        gradeTatica11: personalizado ? grade : null,
        personalizado,
        configTatica: configParaEsquema(esq, configLocal),
      });
    },
    [commitEscolha, configLocal, configParaEsquema],
  );

  const titulares = useMemo(() => {
    if (slotIds.length !== 11) return [];
    return slotIds
      .map((id) => elenco.find((j) => j.id === id))
      .filter((j): j is Jogador => j != null);
  }, [slotIds, elenco]);

  const alertasAdequacao = useMemo(() => {
    if (!dbTaticas || titulares.length < 11) {
      return ['Escale 11 titulares para avaliar a adequação tática.'];
    }
    const cfg = configParaEsquema(esquemaGrafico, configLocal);
  return previewAlertasTatica(dbTaticas, cfg, titulares, SLOTS_POR_ESQUEMA[esquemaGrafico]);
  }, [dbTaticas, titulares, configLocal, esquemaGrafico, configParaEsquema]);

  const patchInstrucao = <K extends keyof InstrucoesColetivas>(
    chave: K,
    valor: InstrucoesColetivas[K],
  ) => {
    setConfigLocal((c) => ({
      ...c,
      instrucoes: { ...c.instrucoes, [chave]: valor },
    }));
  };

  const aplicarMelhorOverall = () => {
    const esq = esquemaGrafico;
    const ids = escalacaoAssistenteMelhorOverall(elenco, esq);
    if (ids.length < 11) return;
    const grade = gradePadrao(esq);
    const banco = idsBancoPadrao(elenco, ids);
    setSlotIds(ids);
    setBancoIds(banco);
    setGrade11(grade);
    const personalizado = selecao === 'PERSONALIZADO';
    if (personalizado) entrarPersonalizado();
    persistirLineup(
      ids,
      banco,
      grade,
      personalizado ? 'PERSONALIZADO' : esq,
      personalizado ? esquemaBase : esq,
      personalizado,
    );
  };

  const toggleBanco = (jogadorId: number) => {
    if (slotIds.includes(jogadorId)) return;
    setBancoIds((prev) => {
      if (prev.includes(jogadorId)) {
        const next = prev.filter((id) => id !== jogadorId);
        persistirLineup(slotIds, next, grade11, selecao, esquemaBase, selecao === 'PERSONALIZADO');
        return next;
      }
      const entrando = elenco.find((j) => j.id === jogadorId);
      if (entrando && bloqueadoPorLesaoComEnergiaBaixa(entrando)) {
        const msg = mensagemBloqueioLesaoEnergia(entrando);
        if (msg) useGameStore.setState({ avisoSalvo: msg });
        return prev;
      }
      if (prev.length >= RESERVAS_PARTIDA) return prev;
      const next = [...prev, jogadorId];
      persistirLineup(slotIds, next, grade11, selecao, esquemaBase, selecao === 'PERSONALIZADO');
      return next;
    });
  };

  const aplicarSubstituicao = (slot: number, jogadorId: number) => {
    const entrando = elenco.find((j) => j.id === jogadorId);
    if (entrando && bloqueadoPorLesaoComEnergiaBaixa(entrando)) {
      const msg = mensagemBloqueioLesaoEnergia(entrando);
      if (msg) useGameStore.setState({ avisoSalvo: msg });
      return;
    }
    const next = [...slotIds];
    const outroSlot = next.indexOf(jogadorId);
    const saida = next[slot];
    next[slot] = jogadorId;
    if (outroSlot >= 0 && outroSlot !== slot) next[outroSlot] = saida;
    // Quem saiu do campo volta ao banco se couber.
    let banco = bancoIds.filter((id) => id !== jogadorId);
    if (saida && saida > 0 && !next.includes(saida) && !banco.includes(saida)) {
      if (banco.length < RESERVAS_PARTIDA) banco = [...banco, saida];
    }
    setSelecao('PERSONALIZADO');
    entrarPersonalizado();
    setSlotIds(next);
    setBancoIds(banco);
    setSlotSubs(null);
    setReservaSubs(null);
    setArrastandoJogadorId(null);
    setSlotAguardandoReserva(null);
    persistirLineup(next, banco, grade11, 'PERSONALIZADO', esquemaBase, true);
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
    persistirLineup(slotIds, bancoIds, novaGrade, 'PERSONALIZADO', esquemaBase, true);
  };

  const hashSlots = JSON.stringify(slotIds);
  const hashSalvo = JSON.stringify(alinhamentoSalvo ?? []);
  const hashBanco = JSON.stringify(bancoIds);
  const hashBancoSalvo = JSON.stringify(bancoSalvo ?? []);
  const esquemaPendente = selecao !== 'PERSONALIZADO' && selecao !== esquemaAtual;
  const lineupPendente = hashSlots !== hashSalvo || hashBanco !== hashBancoSalvo;
  const modoPendente = (selecao === 'PERSONALIZADO') !== personalizadoSalvo;
  const gradeReferenciaSalva =
    personalizadoSalvo && gradeSalva?.length === 11
      ? gradeSalva
      : gradePadrao(esquemaBase);
  const gradePendente = !gradesIguais(grade11, gradeReferenciaSalva);
  const configPendente =
    JSON.stringify(configParaEsquema(esquemaGrafico, configLocal)) !==
    JSON.stringify(configParaEsquema(esquemaAtual, configSalva));
  const escolhaPendente =
    esquemaPendente || lineupPendente || modoPendente || gradePendente || configPendente;

  const checkRelacionados = validarRelacionadosPartida(slotIds, bancoIds);

  const salvarEscolha = () => {
    const personalizado = selecao === 'PERSONALIZADO';
    const esq = personalizado ? esquemaBase : (selecao as EsquemaTatico);
    const { ids: alinhamentoLimpo, trocas } = sanitizarAlinhamento11(elenco, slotIds);
    if (trocas.length > 0) {
      useGameStore.setState({
        avisoSalvo: trocas
          .map((t) => `${t.saiu} → ${t.entrou}: ${t.motivo}`)
          .join(' '),
      });
      setSlotIds(alinhamentoLimpo);
    }
    commitEscolha({
      esquema: esq,
      alinhamento11: alinhamentoLimpo,
      banco11: bancoIds,
      gradeTatica11: personalizado ? grade11 : null,
      personalizado,
      configTatica: configParaEsquema(esq, configLocal),
    });
    const ok = validarRelacionadosPartida(alinhamentoLimpo, bancoIds).ok;
    if (partidaRetorno && ok) voltarPartida();
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
            { id: 'filosofia' as const, label: 'Estilo & instruções' },
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

      {!checkRelacionados.ok && (
        <div className="mb-4 rounded-lg border border-rose-700/60 bg-rose-950/30 p-3">
          <p className="text-sm font-medium text-rose-100">
            {checkRelacionados.motivo ??
              'Relacione 11 titulares e 11 reservas antes de iniciar a partida.'}
          </p>
          <p className="mt-1 text-xs text-rose-200/80">
            Agora: {checkRelacionados.titulares}/11 titulares · {checkRelacionados.reservas}/11
            reservas.
          </p>
        </div>
      )}
      {avisoSalvo && avisoSalvo.toLowerCase().includes('reserva') && (
        <p className="mb-3 text-xs text-amber-200/90">{avisoSalvo}</p>
      )}

      <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          Adequação do elenco à tática
        </p>
        <ul className="space-y-1 text-sm text-zinc-300">
          {alertasAdequacao.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="text-amber-500" aria-hidden>
                •
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {aba === 'filosofia' && dbTaticas && (
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <fieldset className="rounded border border-zinc-700 p-3">
            <legend className="px-1 text-sm font-medium text-zinc-200">Estilo de jogo</legend>
            <div className="mt-2 flex flex-col gap-1">
              {dbTaticas.estilos_jogo.map((e) => (
                <label
                  key={e.id}
                  className={`cursor-pointer rounded border px-2 py-1.5 text-sm ${
                    configLocal.estilo_jogo_id === e.id
                      ? 'border-emerald-500 bg-emerald-950/80 text-emerald-100'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="estilo"
                    className="sr-only"
                    checked={configLocal.estilo_jogo_id === e.id}
                    onChange={() =>
                      setConfigLocal((c) => ({ ...c, estilo_jogo_id: e.id as EstiloJogoId }))
                    }
                  />
                  <span className="font-medium">{e.nome}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{e.descricao}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="rounded border border-zinc-700 p-3 text-sm text-zinc-300">
            <legend className="px-1 font-medium text-zinc-200">Instruções coletivas</legend>
            <label className="mt-2 block">
              Altura da linha
              <select
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                value={configLocal.instrucoes.altura_linha}
                onChange={(ev) => patchInstrucao('altura_linha', ev.target.value as InstrucoesColetivas['altura_linha'])}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="MUITO_ALTA">Muito alta</option>
              </select>
            </label>
            <label className="mt-2 block">
              Marcação
              <select
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                value={configLocal.instrucoes.intensidade_marcacao}
                onChange={(ev) =>
                  patchInstrucao(
                    'intensidade_marcacao',
                    ev.target.value as InstrucoesColetivas['intensidade_marcacao'],
                  )
                }
              >
                <option value="CONTER">Conter</option>
                <option value="EQUILIBRADA">Equilibrada</option>
                <option value="PRESSAO_ALTA">Pressão alta</option>
                <option value="SUFOCANTE">Sufocante</option>
              </select>
            </label>
            <label className="mt-2 block">
              Ritmo
              <select
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                value={configLocal.instrucoes.ritmo_jogo}
                onChange={(ev) =>
                  patchInstrucao('ritmo_jogo', ev.target.value as InstrucoesColetivas['ritmo_jogo'])
                }
              >
                <option value="LENTO_CADENCIADO">Lento</option>
                <option value="NORMAL">Normal</option>
                <option value="ACELERADO">Acelerado</option>
              </select>
            </label>
            <label className="mt-2 block">
              Largura no ataque
              <select
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                value={configLocal.instrucoes.largura_ataque}
                onChange={(ev) =>
                  patchInstrucao(
                    'largura_ataque',
                    ev.target.value as InstrucoesColetivas['largura_ataque'],
                  )
                }
              >
                <option value="FUNIL_CENTRAL">Funil central</option>
                <option value="EQUILIBRADA">Equilibrada</option>
                <option value="BEM_ABERTO">Bem aberto</option>
              </select>
            </label>
            <label className="mt-2 block">
              Foco nos passes
              <select
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                value={configLocal.instrucoes.foco_passes}
                onChange={(ev) =>
                  patchInstrucao('foco_passes', ev.target.value as InstrucoesColetivas['foco_passes'])
                }
              >
                <option value="MISTO">Misto</option>
                <option value="CURTOS_NO_PE">Curtos no pé</option>
                <option value="BOLAS_LONGAS">Bolas longas</option>
              </select>
            </label>
          </fieldset>
        </div>
      )}

      {aba === 'jogadores' && elenco.length >= 11 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <CmBtn variant="ghost" onClick={aplicarMelhorOverall}>
            Assistente escolhe os melhores (11+11)
          </CmBtn>
          <span className="self-center text-xs text-zinc-500">
            11 titulares + 11 reservas ({rotuloCampo}); exclui lesão com energia &lt;60%.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="w-full shrink-0 lg:w-56 xl:w-60">
          {aba === 'filosofia' ? (
            <p className="text-sm text-zinc-500">
              Use a aba ao lado do campo para trocar esquema e escalar — os alertas acima refletem a adequação em tempo real.
            </p>
          ) : aba === 'esquemas' ? (
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
                bancoIds={bancoIds}
                grade11={grade11}
                esquema={esquemaGrafico}
                slotAtivo={slotSubs}
                reservaAtiva={reservaSubs}
                onSlotClick={onSlotElenco}
                onReservaClick={onReservaElenco}
                onToggleBanco={toggleBanco}
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