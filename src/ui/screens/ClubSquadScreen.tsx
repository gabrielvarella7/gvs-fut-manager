import { useMemo, useState } from 'react';
import { mediaAtributosGrupo } from '../../career/atributosJogador';
import { elencoSub23DoClube } from '../../career/aspirantesS23';
import { corClasseEnergia, overallEfetivoPorEnergia } from '../../career/energia';
import {
  direcaoInicialColuna,
  ordenarElenco,
  ordenarElencoPorColuna,
  type ElencoSortColuna,
  type ElencoSortDirecao,
} from '../../career/ordenarElenco';
import { formatarDinheiro, salarioMensal, valorMercado } from '../../career/playerUtils';
import { rotuloTierBase } from '../../career/youthAcademy';
import { TAMANHO_ELENCO_SUB23 } from '../../types/aspirantesS23';
import type { AtletaSub23 } from '../../types/aspirantesS23';
import type { Jogador } from '../../types/schema';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';
import { ClubNameLink } from '../components/ClubNameLink';
import { PlayerNameLink } from '../components/PlayerNameLink';
import {
  FILTERS_VAZIOS,
  PlayerListToolbar,
  SortableTh,
  filtrarPlayerList,
  jogadorAccessors,
  jovemAccessors,
  SORT_JOVEM,
  usePlayerListQuery,
  type PlayerListFiltersState,
} from '../playerList';

/**
 * Elenco de outro clube (aberto pelo nome na tabela, calendário, mercado…).
 * Em modo Sub23 mostra o plantel S23; no profissional, o elenco pro.
 * Atletas clicáveis → atributos; rivais têm “Fazer proposta”.
 */
export function ClubSquadScreen() {
  const visitadoId = useGameStore((s) => s.elencoVisitadoClubeId);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const modoSub23 = useGameStore((s) => s.modoSub23);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const fechar = useGameStore((s) => s.fecharElencoClube);
  const iniciarCompra = useGameStore((s) => s.iniciarNegociacaoCompra);
  const irPara = useGameStore((s) => s.irPara);

  const time = timesReais.find((t) => t.id === visitadoId);
  const proprio = visitadoId === clubeRealId;

  const elencoPro = useMemo(
    () =>
      visitadoId
        ? ordenarElenco(jogadoresReais.filter((j) => j.time_id === visitadoId))
        : [],
    [jogadoresReais, visitadoId],
  );

  const elencoS23 = useMemo(
    () => (visitadoId ? elencoSub23DoClube(aspirantes, visitadoId) : []),
    [aspirantes, visitadoId],
  );

  if (!visitadoId || !time) {
    return (
      <CmCareerShell
        titulo="Elenco do clube"
        acoesExtras={
          <CmBtn variant="ghost" onClick={fechar}>
            Voltar
          </CmBtn>
        }
      >
        <CmPanel className="text-sm text-zinc-400">Clube não encontrado.</CmPanel>
      </CmCareerShell>
    );
  }

  const titulo = modoSub23
    ? `Elenco Sub23 — ${time.nome_completo}`
    : `Elenco — ${time.nome_completo}`;

  const fazerProposta = (jogadorId: number) => {
    iniciarCompra(jogadorId);
    irPara('transferencias');
  };

  return (
    <CmCareerShell
      titulo={titulo}
      subtitulo={
        modoSub23
          ? `${elencoS23.length}/${TAMANHO_ELENCO_SUB23} atletas · visualização`
          : `${elencoPro.length} atletas · ${proprio ? 'seu clube' : 'clube rival'}`
      }
      acoesExtras={
        <CmBtn variant="ghost" onClick={fechar}>
          Voltar
        </CmBtn>
      }
    >
      <CmPanel className="mb-4">
        <p className="text-xs text-zinc-500">Clube</p>
        <p className="mt-1 text-sm text-zinc-200">
          <ClubNameLink clubeId={time.id}>{time.nome_completo}</ClubNameLink>
          {proprio ? ' · seu plantel' : ''}
        </p>
        {!proprio && !modoSub23 && (
          <p className="mt-1 text-xs text-zinc-500">
            Clique no atleta para ver atributos. Use <strong className="text-zinc-300">Fazer proposta</strong>{' '}
            para iniciar negociação de compra.
          </p>
        )}
        {modoSub23 && (
          <p className="mt-1 text-xs text-sky-300/90">
            Modo Sub23 — somente visualização. Transferências são do plantel profissional.
          </p>
        )}
      </CmPanel>

      {modoSub23 ? (
        <Sub23VisitTable elenco={elencoS23} />
      ) : (
        <ProVisitTable
          elenco={elencoPro}
          showProposta={!proprio && !!clubeRealId}
          onProposta={fazerProposta}
        />
      )}
    </CmCareerShell>
  );
}

function ProVisitTable({
  elenco,
  showProposta,
  onProposta,
}: {
  elenco: Jogador[];
  showProposta: boolean;
  onProposta: (id: number) => void;
}) {
  const [filters, setFilters] = useState<PlayerListFiltersState>(FILTERS_VAZIOS);
  const [sortCol, setSortCol] = useState<ElencoSortColuna | null>(null);
  const [sortDir, setSortDir] = useState<ElencoSortDirecao>('asc');

  const filtrados = useMemo(
    () => filtrarPlayerList(elenco, jogadorAccessors, filters),
    [elenco, filters],
  );
  const ordenados = useMemo(() => {
    if (!sortCol) return filtrados;
    return ordenarElencoPorColuna(filtrados, sortCol, sortDir);
  }, [filtrados, sortCol, sortDir]);

  const onSort = (coluna: ElencoSortColuna) => {
    if (sortCol === coluna) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortCol(coluna);
    setSortDir(direcaoInicialColuna(coluna));
  };

  return (
    <div>
      <PlayerListToolbar
        filters={filters}
        onFiltersChange={setFilters}
        enabledFilters={['busca', 'posicao', 'ovr', 'idade', 'valor']}
        hideSortControls
        shown={ordenados.length}
        total={elenco.length}
      />
      <div className="overflow-x-auto rounded border border-zinc-700">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <SortableTh
                sortId="nome"
                ativa={sortCol === 'nome'}
                direcao={sortDir}
                onSort={() => onSort('nome')}
                className="p-2"
              >
                Nome
              </SortableTh>
              <SortableTh sortId="pos" ativa={sortCol === 'pos'} direcao={sortDir} onSort={() => onSort('pos')}>
                Pos
              </SortableTh>
              <SortableTh
                sortId="idade"
                ativa={sortCol === 'idade'}
                direcao={sortDir}
                onSort={() => onSort('idade')}
              >
                Id
              </SortableTh>
              <SortableTh sortId="ovr" ativa={sortCol === 'ovr'} direcao={sortDir} onSort={() => onSort('ovr')}>
                OVR
              </SortableTh>
              <SortableTh
                sortId="energia"
                ativa={sortCol === 'energia'}
                direcao={sortDir}
                onSort={() => onSort('energia')}
              >
                Energia
              </SortableTh>
              <SortableTh sortId="tec" ativa={sortCol === 'tec'} direcao={sortDir} onSort={() => onSort('tec')}>
                Téc
              </SortableTh>
              <SortableTh sortId="men" ativa={sortCol === 'men'} direcao={sortDir} onSort={() => onSort('men')}>
                Men
              </SortableTh>
              <SortableTh sortId="fis" ativa={sortCol === 'fis'} direcao={sortDir} onSort={() => onSort('fis')}>
                Fís
              </SortableTh>
              <SortableTh
                sortId="valor"
                ativa={sortCol === 'valor'}
                direcao={sortDir}
                onSort={() => onSort('valor')}
              >
                Valor
              </SortableTh>
              <SortableTh
                sortId="salario"
                ativa={sortCol === 'salario'}
                direcao={sortDir}
                onSort={() => onSort('salario')}
              >
                Salário/mês
              </SortableTh>
              <SortableTh
                sortId="status"
                ativa={sortCol === 'status'}
                direcao={sortDir}
                onSort={() => onSort('status')}
              >
                Status
              </SortableTh>
              {showProposta && <th className="p-2">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((j) => (
              <tr key={j.id} className="border-t border-zinc-800 hover:bg-zinc-900">
                <td className="p-2">
                  <PlayerNameLink jogadorId={j.id}>{j.nome}</PlayerNameLink>
                </td>
                <td>{j.posicao}</td>
                <td>{j.idade}</td>
                <td className="text-emerald-400">
                  {j.overall}
                  {j.energia < 92 && (
                    <span className="ml-1 text-[10px] text-zinc-500" title="OVR efetivo pela energia">
                      →{overallEfetivoPorEnergia(j.overall, j.energia)}
                    </span>
                  )}
                </td>
                <td className={corClasseEnergia(j.energia)}>{Math.round(j.energia)}%</td>
                <td>{mediaAtributosGrupo(j.atributos, 'tecnicos')}</td>
                <td>{mediaAtributosGrupo(j.atributos, 'mentais')}</td>
                <td>{mediaAtributosGrupo(j.atributos, 'fisicos')}</td>
                <td>{formatarDinheiro(valorMercado(j))}</td>
                <td>{formatarDinheiro(salarioMensal(j))}</td>
                <td className="text-zinc-500">{j.status_escalacao.slice(0, 3)}</td>
                {showProposta && (
                  <td className="p-2">
                    <CmBtn variant="primary" onClick={() => onProposta(j.id)}>
                      Fazer proposta
                    </CmBtn>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {elenco.length === 0 && (
        <p className="mt-3 text-sm text-amber-200/90">Nenhum jogador neste clube.</p>
      )}
      {elenco.length > 0 && ordenados.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">Nenhum jogador com esses filtros.</p>
      )}
    </div>
  );
}

function Sub23VisitTable({ elenco }: { elenco: AtletaSub23[] }) {
  const query = usePlayerListQuery(elenco, jovemAccessors, SORT_JOVEM, {
    id: 'ovr',
    dir: 'desc',
  });

  return (
    <div>
      <PlayerListToolbar
        filters={query.filters}
        onFiltersChange={query.setFilters}
        enabledFilters={['busca', 'posicao', 'ovr', 'idade']}
        sortOptions={SORT_JOVEM}
        sort={query.sort}
        onSortKeyChange={query.setSortKey}
        onSortDirChange={query.setSortDir}
        shown={query.shown}
        total={query.total}
      />
      <div className="overflow-x-auto rounded border border-zinc-700">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="p-2">Nome</th>
              <th>Pos</th>
              <th>Id</th>
              <th>OVR</th>
              <th>Téc</th>
              <th>Men</th>
              <th>Fís</th>
              <th>Teto</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {query.result.map((a) => (
              <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-900">
                <td className="p-2">
                  <PlayerNameLink jogadorId={a.id}>{a.nome}</PlayerNameLink>
                </td>
                <td>{a.posicao}</td>
                <td>{a.idade}</td>
                <td className="text-emerald-400">{a.overall}</td>
                <td>{mediaAtributosGrupo(a.atributos, 'tecnicos')}</td>
                <td>{mediaAtributosGrupo(a.atributos, 'mentais')}</td>
                <td>{mediaAtributosGrupo(a.atributos, 'fisicos')}</td>
                <td>~{a.potencialOvr}</td>
                <td className="text-zinc-400">
                  {rotuloTierBase(a.tier)}
                  {a.precoceEstagnado ? ' · precoce' : ''}
                  {a.diamanteBruto ? ' · diamante' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {elenco.length === 0 && (
        <p className="mt-3 text-sm text-amber-200/90">Nenhum atleta Sub-23 neste clube.</p>
      )}
      {elenco.length > 0 && query.shown === 0 && (
        <p className="mt-3 text-sm text-zinc-500">Nenhum atleta com esses filtros.</p>
      )}
    </div>
  );
}
