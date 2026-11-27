import { useEffect, useMemo, useState } from 'react';
import { ordenarElenco } from '../../career/ordenarElenco';
import {
  arredondarOfertaMonetaria,
  formatarDinheiro,
  formatarDinheiroExtenso,
  parseValorMonetario,
  valorMercado,
} from '../../career/playerUtils';
import { descricaoRiscoMercado, getGeneticaSegura, tierPropensao } from '../../career/genetica';
import { obterNivelRivalidade } from '../../career/mercadoTransferencias';
import { pretensaoClubeVendedor, pretensaoSalarioJogador } from '../../career/transfers';
import { rotuloTendenciaSaida, rumorPendenteResposta } from '../../career/sondagemMercado';
import type { NegociacaoTransferencia } from '../../career/types';
import type { Jogador, Posicao } from '../../types/schema';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

type Aba = 'comprar' | 'vender' | 'negociacoes';

const ITENS_POR_PAGINA = 7;

const POSICOES: Array<Posicao | 'TODAS'> = [
  'TODAS',
  'GOL',
  'ZAG',
  'LAT',
  'VOL',
  'MEI',
  'ATA',
];

export function TransfersScreen() {
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const financas = useGameStore((s) => s.financas);
  const negociacoes = useGameStore((s) => s.negociacoesTransferencia);
  const iniciarCompra = useGameStore((s) => s.iniciarNegociacaoCompra);
  const iniciarVenda = useGameStore((s) => s.iniciarNegociacaoVenda);
  const atualizarOferta = useGameStore((s) => s.atualizarOfertaNegociacao);
  const enviarOferta = useGameStore((s) => s.enviarOfertaTransferencia);
  const aceitarContra = useGameStore((s) => s.aceitarContraproposta);
  const cancelar = useGameStore((s) => s.cancelarNegociacao);
  const responderSondagem = useGameStore((s) => s.responderSondagemEntrada);
  const apresentarAoJogador = useGameStore((s) => s.apresentarOfertaAoJogador);
  const rumores = useGameStore((s) => s.mundoClube?.rumoresOfertas ?? []);

  const [aba, setAba] = useState<Aba>('comprar');
  const [busca, setBusca] = useState('');
  const [posicao, setPosicao] = useState<Posicao | 'TODAS'>('TODAS');
  const [negociacaoAtiva, setNegociacaoAtiva] = useState<string | null>(null);
  const [visiveisCompra, setVisiveisCompra] = useState(ITENS_POR_PAGINA);
  const [visiveisVenda, setVisiveisVenda] = useState(ITENS_POR_PAGINA);

  const nomeClube = timesReais.find((t) => t.id === clubeRealId)?.nome ?? 'Seu clube';
  const elencoProprio = useMemo(
    () =>
      clubeRealId
        ? ordenarElenco(jogadoresReais.filter((j) => j.time_id === clubeRealId))
        : [],
    [clubeRealId, jogadoresReais],
  );

  const mercado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordenarElenco(
      jogadoresReais.filter((j) => {
        if (!clubeRealId || j.time_id === clubeRealId) return false;
        if (posicao !== 'TODAS' && j.posicao !== posicao) return false;
        if (q && !j.nome.toLowerCase().includes(q)) return false;
        return true;
      }),
    );
  }, [busca, clubeRealId, jogadoresReais, posicao]);

  useEffect(() => {
    setVisiveisCompra(ITENS_POR_PAGINA);
  }, [busca, posicao]);

  useEffect(() => {
    setVisiveisVenda(ITENS_POR_PAGINA);
  }, [elencoProprio.length]);

  const mercadoVisivel = mercado.slice(0, visiveisCompra);
  const restantesCompra = mercado.length - visiveisCompra;
  const elencoVendaVisivel = elencoProprio.slice(0, visiveisVenda);
  const restantesVenda = elencoProprio.length - visiveisVenda;

  const negAtiva = negociacoes.find((n) => n.id === negociacaoAtiva) ?? negociacoes[0] ?? null;

  if (!clubeRealId || !financas) {
    return (
      <CmCareerShell titulo="Transferências" subtitulo="Mercado">
        <CmPanel>
          <p className="text-sm text-zinc-300">
            Disponível apenas na carreira profissional, depois de assinar com um clube do Brasileirão.
          </p>
        </CmPanel>
      </CmCareerShell>
    );
  }

  return (
    <CmCareerShell
      titulo="Transferências"
      subtitulo={`${nomeClube} · Caixa ${formatarDinheiro(financas.saldo_caixa)}`}
    >
      {rumores.filter(rumorPendenteResposta).length > 0 && (
        <CmPanel className="mb-4 border-amber-600/60 bg-amber-950/30">
          <p className="text-xs font-semibold uppercase text-amber-200">
            Proposta obrigatória — responda para continuar
          </p>
          <ul className="mt-3 space-y-3">
            {rumores.filter(rumorPendenteResposta).map((r) => {
              const jog = jogadoresReais.find((j) => j.id === r.jogadorId);
              return (
                <li key={r.id} className="rounded border border-amber-900/50 bg-zinc-950/40 p-3 text-sm">
                  <p className="text-zinc-100">{r.texto}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Indicativo {formatarDinheiro(r.valorIndicativo)} ·{' '}
                    {rotuloTendenciaSaida(r.tendenciaSair ?? 50)}
                    {jog ? ` · ${jog.nome} (${jog.overall} OVR)` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CmBtn
                      variant="primary"
                      onClick={() => responderSondagem(r.id, 'negociar', r.valorIndicativo)}
                    >
                      Aceitar negociar
                    </CmBtn>
                    <CmBtn variant="danger" onClick={() => responderSondagem(r.id, 'recusar')}>
                      Recusar sondagem
                    </CmBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        </CmPanel>
      )}
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
        {([
          ['comprar', 'Comprar'],
          ['vender', 'Vender'],
          ['negociacoes', `Negociações (${negociacoes.filter((n) => n.status !== 'concluida').length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              aba === id
                ? 'bg-emerald-900 text-emerald-100'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {aba === 'comprar' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Buscar jogador…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="min-w-[200px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <select
              value={posicao}
              onChange={(e) => setPosicao(e.target.value as Posicao | 'TODAS')}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              {POSICOES.map((p) => (
                <option key={p} value={p}>
                  {p === 'TODAS' ? 'Todas posições' : p}
                </option>
              ))}
            </select>
          </div>
          <ListaMercado
            jogadores={mercadoVisivel}
            timesReais={timesReais}
            onComprar={(id) => {
              const nid = iniciarCompra(id);
              if (nid) {
                setNegociacaoAtiva(nid);
                setAba('negociacoes');
              }
            }}
          />
          {restantesCompra > 0 && (
            <div className="mt-4 flex justify-center">
              <CmBtn variant="ghost" onClick={() => setVisiveisCompra((v) => v + ITENS_POR_PAGINA)}>
                Mais jogadores (+{Math.min(ITENS_POR_PAGINA, restantesCompra)})
              </CmBtn>
            </div>
          )}
        </>
      )}

      {aba === 'vender' && (
        <>
          <ListaVenda
            elenco={elencoVendaVisivel}
            onVender={(id, valor) => {
              const nid = iniciarVenda(id, valor);
              if (nid) {
                setNegociacaoAtiva(nid);
                setAba('negociacoes');
              }
            }}
          />
          {restantesVenda > 0 && (
            <div className="mt-4 flex justify-center">
              <CmBtn variant="ghost" onClick={() => setVisiveisVenda((v) => v + ITENS_POR_PAGINA)}>
                Mais do elenco (+{Math.min(ITENS_POR_PAGINA, restantesVenda)})
              </CmBtn>
            </div>
          )}
        </>
      )}

      {aba === 'negociacoes' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
            {negociacoes.length === 0 ? (
              <li className="p-4 text-sm text-zinc-500">Nenhuma negociação aberta.</li>
            ) : (
              negociacoes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setNegociacaoAtiva(n.id)}
                    className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm ${
                      negAtiva?.id === n.id ? 'bg-emerald-950/50' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <span className="font-medium text-zinc-100">
                      {rotuloNegociacao(n, jogadoresReais, timesReais)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {n.tipo === 'compra' ? 'Compra' : 'Venda'} · {n.status.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {negAtiva ? (
            <PainelNegociacao
              neg={negAtiva}
              jogadores={jogadoresReais}
              times={timesReais}
              caixa={financas.saldo_caixa}
              onAtualizar={(patch) => atualizarOferta(negAtiva.id, patch)}
              onEnviar={() => enviarOferta(negAtiva.id)}
              onAceitar={() => aceitarContra(negAtiva.id)}
              onApresentarJogador={() => apresentarAoJogador(negAtiva.id)}
              onCancelar={() => {
                cancelar(negAtiva.id);
                setNegociacaoAtiva(null);
              }}
            />
          ) : (
            <CmPanel>
              <p className="text-sm text-zinc-500">Selecione uma negociação ou inicie uma compra/venda.</p>
            </CmPanel>
          )}
        </div>
      )}
    </CmCareerShell>
  );
}

function rotuloNegociacao(
  n: NegociacaoTransferencia,
  jogadores: Jogador[],
  times: { id: string; nome: string }[],
) {
  const j = jogadores.find((x) => x.id === n.jogadorId);
  const clube = times.find((t) => t.id === (n.tipo === 'compra' ? n.timeVendedorId : n.timeCompradorId));
  return `${j?.nome ?? 'Jogador'}${clube ? ` · ${clube.nome}` : ''}`;
}

function ListaMercado({
  jogadores,
  timesReais,
  onComprar,
}: {
  jogadores: Jogador[];
  timesReais: { id: string; nome: string }[];
  onComprar: (id: number) => void;
}) {
  if (jogadores.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhum atleta encontrado.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
      {jogadores.map((j) => {
        const time = timesReais.find((t) => t.id === j.time_id);
        const risco = descricaoRiscoMercado(j);
        const g = getGeneticaSegura(j);
        const tier = tierPropensao(g.propensao_lesao);
        return (
          <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-zinc-100">{j.nome}</p>
              <p className="text-xs text-zinc-500">
                {time?.nome} · {j.posicao} · OVR {j.overall} · {formatarDinheiro(valorMercado(j))}
                {tier === 'DE_VIDRO' ? ' · risco físico' : ''}
                {j.idade <= 22 && g.potencial_maximo - j.overall >= 8 ? ' · teto alto' : ''}
              </p>
              {risco && <p className="text-[10px] text-amber-500/90">{risco}</p>}
            </div>
            <CmBtn variant="primary" onClick={() => onComprar(j.id)}>
              Negociar
            </CmBtn>
          </li>
        );
      })}
    </ul>
  );
}

function ListaVenda({
  elenco,
  onVender,
}: {
  elenco: Jogador[];
  onVender: (id: number, valor: number) => void;
}) {
  const [valores, setValores] = useState<Record<number, string>>({});
  return (
    <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
      {elenco.map((j) => {
        const sugerido = pretensaoClubeVendedor(j);
        const bruto = valores[j.id] ?? formatarDinheiroExtenso(sugerido);
        return (
          <li key={j.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium text-zinc-100">{j.nome}</p>
              <p className="text-xs text-zinc-500">
                {j.posicao} · OVR {j.overall} · Mercado {formatarDinheiroExtenso(valorMercado(j))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-zinc-500">
                Valor mínimo
                <input
                  type="text"
                  inputMode="numeric"
                  value={bruto}
                  onChange={(e) => setValores((v) => ({ ...v, [j.id]: e.target.value }))}
                  onBlur={() =>
                    setValores((v) => ({
                      ...v,
                      [j.id]: formatarDinheiroExtenso(
                        arredondarOfertaMonetaria(parseValorMonetario(v[j.id] ?? bruto)),
                      ),
                    }))
                  }
                  className="mt-1 block w-44 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 tabular-nums"
                />
              </label>
              <CmBtn
                variant="ghost"
                onClick={() =>
                  onVender(
                    j.id,
                    arredondarOfertaMonetaria(parseValorMonetario(bruto) || sugerido),
                  )
                }
              >
                Colocar no mercado
              </CmBtn>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PainelNegociacao({
  neg,
  jogadores,
  times,
  caixa,
  onAtualizar,
  onEnviar,
  onAceitar,
  onApresentarJogador,
  onCancelar,
}: {
  neg: NegociacaoTransferencia;
  jogadores: Jogador[];
  times: { id: string; nome: string }[];
  caixa: number;
  onAtualizar: (p: Partial<NegociacaoTransferencia['ofertaAtual']>) => void;
  onEnviar: () => void;
  onAceitar: () => void;
  onApresentarJogador: () => void;
  onCancelar: () => void;
}) {
  const j = jogadores.find((x) => x.id === neg.jogadorId);
  if (!j) return null;

  const podeEditar = neg.status === 'rascunho' || neg.status === 'contra_proposta';
  const vendedor = times.find((t) => t.id === neg.timeVendedorId);
  const comprador = times.find((t) => t.id === neg.timeCompradorId);
  const rivalidade =
    neg.tipo === 'compra'
      ? obterNivelRivalidade(j.time_id, neg.timeCompradorId)
      : obterNivelRivalidade(j.time_id, neg.timeCompradorId || '');

  const rotuloRival: Record<string, string> = {
    NENHUMA: '',
    ESTADUAL_MODERADA: 'Rival estadual — ágio na taxa',
    ARQUIRIVAL_HISTORICO: 'Arquirrival — taxa e salários mais altos',
  };

  return (
    <CmPanel>
      <h2 className="text-lg font-semibold text-emerald-100">{j.nome}</h2>
      {rivalidade !== 'NENHUMA' && (
        <p className="mt-1 text-xs text-amber-300/90">{rotuloRival[rivalidade]}</p>
      )}
      {neg.tipo === 'compra' && (
        <p className="mt-0.5 text-[10px] text-zinc-600">
          Rodada com empresário: {neg.rodadaNegociacao ?? 1}/3
        </p>
      )}
      <p className="mt-1 text-sm text-zinc-400">
        {neg.tipo === 'compra' ? `Clube: ${vendedor?.nome ?? '—'}` : `Comprador: ${comprador?.nome ?? 'a definir'}`} · OVR{' '}
        {j.overall}
        {j.suscetibilidade && (
          <>
            {' '}
            · {j.suscetibilidade.camada.replace(/_/g, ' ').toLowerCase()} ({j.suscetibilidade.indice})
          </>
        )}
      </p>
      {j.suscetibilidade && (
        <p className="mt-1 text-xs text-zinc-500">{j.suscetibilidade.motivo_principal}</p>
      )}
      <p className="mt-3 rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
        {neg.mensagem}
      </p>
      {neg.tendenciaAceitarSaida != null && (
        <p className="mt-2 text-sm text-amber-200/90">
          Disposição do atleta: {rotuloTendenciaSaida(neg.tendenciaAceitarSaida)} (
          {neg.tendenciaAceitarSaida}%)
        </p>
      )}
      {neg.status === 'em_analise' && (
        <p className="mt-2 text-xs text-zinc-500">
          Negociação em andamento — avance dias no escritório para o clube responder
          {neg.diasRestantesFase != null ? ` (${neg.diasRestantesFase} dia(s) restantes nesta fase).` : '.'}
        </p>
      )}

      {(neg.contraOfertaClube || neg.contraOfertaJogador) && (
        <div className="mt-3">
          {neg.contraOfertaClube && (
            <p className="text-sm text-amber-200/90">
              Clube pede {formatarDinheiroExtenso(neg.contraOfertaClube.valorTransferencia)} na taxa.
            </p>
          )}
          {neg.contraOfertaJogador && (
            <p className="text-sm text-amber-200/90">
              Jogador pede CLT {formatarDinheiroExtenso(neg.contraOfertaJogador.salarioCltMensal)} + imagem{' '}
              {formatarDinheiroExtenso(neg.contraOfertaJogador.direitoImagemMensal)} · luvas{' '}
              {formatarDinheiroExtenso(neg.contraOfertaJogador.luvas)}.
            </p>
          )}
        </div>
      )}

      {neg.tipo === 'compra' && podeEditar && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CampoDinheiro
            label="Taxa de transferência"
            hint={`Pretensão do clube: ${formatarDinheiroExtenso(pretensaoClubeVendedor(j))}`}
            value={neg.ofertaAtual.valorTransferencia}
            onChange={(v) => onAtualizar({ valorTransferencia: v })}
          />
          <CampoNumero
            label="% direitos econômicos"
            hint={`Máx. clube ${j.contrato?.percentual_direitos_clube ?? 100}%`}
            value={neg.ofertaAtual.percentualDireitos}
            onChange={(v) => onAtualizar({ percentualDireitos: Math.max(10, Math.min(100, v)) })}
          />
          <CampoDinheiro
            label="Salário CLT (mês)"
            hint={`Pacote atual do jogador: ${formatarDinheiroExtenso(pretensaoSalarioJogador(j))}`}
            value={neg.ofertaAtual.salarioCltMensal}
            onChange={(v) => onAtualizar({ salarioCltMensal: v })}
          />
          <CampoDinheiro
            label="Direito de imagem (mês)"
            hint="Máx. 40% do pacote (Lei Pelé)"
            value={neg.ofertaAtual.direitoImagemMensal}
            onChange={(v) => onAtualizar({ direitoImagemMensal: v })}
          />
          <CampoDinheiro
            label="Luvas (única)"
            value={neg.ofertaAtual.luvas}
            onChange={(v) => onAtualizar({ luvas: v })}
          />
          <CampoNumero
            label="Duração (meses)"
            hint="3 a 60"
            value={neg.ofertaAtual.duracaoMeses}
            onChange={(v) => onAtualizar({ duracaoMeses: Math.max(3, Math.min(60, v)) })}
          />
          <label className="col-span-full flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={!!neg.ofertaAtual.isPreContrato}
              onChange={(e) => onAtualizar({ isPreContrato: e.target.checked })}
              className="h-4 w-4"
            />
            Pré-contrato Lei Pelé (sem taxa ao clube — só com ≤ 6 meses no vínculo atual)
            {j.contrato && j.contrato.meses_restantes > 6 && (
              <span className="ml-1 text-zinc-500">
                · vínculo atual: {j.contrato.meses_restantes} meses (use compra normal com taxa)
              </span>
            )}
          </label>
        </div>
      )}

      {neg.tipo === 'venda' && neg.status === 'rascunho' && (
        <div className="mt-4">
          <CampoDinheiro
            label="Valor mínimo pedido"
            hint={`Referência de mercado: ${formatarDinheiroExtenso(pretensaoClubeVendedor(j))}`}
            value={neg.ofertaAtual.valorTransferencia}
            onChange={(v) => onAtualizar({ valorTransferencia: v })}
          />
        </div>
      )}

      {neg.tipo === 'compra' && (
        <p className="mt-2 text-xs text-zinc-500">
          Multa nacional (ref.): {formatarDinheiroExtenso(j.contrato?.multa_nacional ?? 0)} · Custo estimado (taxa +
          luvas): {formatarDinheiroExtenso(neg.ofertaAtual.valorTransferencia + neg.ofertaAtual.luvas)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {podeEditar && (
          <CmBtn variant="primary" onClick={onEnviar}>
            {neg.tipo === 'compra' ? 'Enviar oferta' : 'Buscar comprador'}
          </CmBtn>
        )}
        {neg.status === 'contra_proposta' && (
          <CmBtn variant="primary" onClick={onAceitar}>
            Aceitar contra-proposta
          </CmBtn>
        )}
        {neg.status === 'aguardando_jogador' && (
          <CmBtn variant="primary" onClick={onApresentarJogador}>
            Apresentar proposta ao jogador
          </CmBtn>
        )}
        <CmBtn variant="ghost" onClick={onCancelar}>
          Cancelar
        </CmBtn>
      </div>
    </CmPanel>
  );
}

function CampoNumero({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      {hint && <span className="block text-[10px] text-zinc-600">{hint}</span>}
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
        className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
      />
    </label>
  );
}

function CampoDinheiro({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [focado, setFocado] = useState(false);
  const [texto, setTexto] = useState(() => formatarDinheiroExtenso(value));

  const aplicar = (raw: string) => {
    const arredondado = arredondarOfertaMonetaria(parseValorMonetario(raw));
    onChange(arredondado);
    return formatarDinheiroExtenso(arredondado);
  };

  return (
    <label className="block text-xs text-zinc-500">
      {label}
      {hint && <span className="block text-[10px] text-zinc-600">{hint}</span>}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={focado ? texto : formatarDinheiroExtenso(value)}
        placeholder="R$ 0"
        onFocus={() => {
          setFocado(true);
          setTexto(value > 0 ? value.toLocaleString('pt-BR') : '');
        }}
        onBlur={() => {
          setFocado(false);
          setTexto(aplicar(texto));
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(arredondarOfertaMonetaria(parseValorMonetario(e.target.value)));
        }}
        className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 tabular-nums"
      />
      <span className="mt-0.5 block text-[10px] text-zinc-600">
        Referência curta: {formatarDinheiro(value)}
      </span>
    </label>
  );
}
