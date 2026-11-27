import { useMemo, useState } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import { mediaAtributosGrupo } from '../../career/atributosJogador';
import { corClasseEnergia, overallEfetivoPorEnergia } from '../../career/energia';
import { ordenarElenco } from '../../career/ordenarElenco';
import { formatarDinheiro, salarioMensal, valorMercado } from '../../career/playerUtils';
import { plantelProfissionalCount, rotuloTierBase } from '../../career/youthAcademy';
import { elencoSub23DoClube } from '../../career/aspirantesS23';
import {
  MSG_PLANTEL_CHEIO_SUBIR,
  TAMANHO_ELENCO_SUB23,
  TETO_PLANTEL_PRO_SUB23,
} from '../../types/aspirantesS23';
import type { OfertaDispensa } from '../../types/aspirantesS23';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';
import type { Jogador } from '../../types/schema';

export function SquadScreen() {
  const timeId = useGameStore((s) => s.timeUsuarioId);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const times = useGameStore((s) => s.timesFicticios);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const modoSub23 = useGameStore((s) => s.modoSub23);
  const abrirPerfil = useGameStore((s) => s.abrirPerfilJogador);
  const simularOferta = useGameStore((s) => s.simularOfertaDispensa);
  const tentarDispensa = useGameStore((s) => s.tentarDispensa);
  const confirmarIntegral = useGameStore((s) => s.confirmarDispensaIntegral);
  const promover = useGameStore((s) => s.promoverSub23);
  const entrarModoSub23 = useGameStore((s) => s.entrarModoSub23);
  const sairModoSub23 = useGameStore((s) => s.sairModoSub23);

  const [oferta, setOferta] = useState<OfertaDispensa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recusaPendente, setRecusaPendente] = useState<number | null>(null);

  const timeFic = getTimeFicticio(times, timeId ?? '');
  const timeReal = timesReais.find((t) => t.id === clubeRealId);
  const elencoFic = timeFic?.jogadores ?? [];
  const elencoReal = clubeRealId
    ? ordenarElenco(jogadoresReais.filter((j) => j.time_id === clubeRealId))
    : [];

  const plantel = clubeRealId ? plantelProfissionalCount(jogadoresReais, clubeRealId) : 0;
  const plantelCheio = plantel >= TETO_PLANTEL_PRO_SUB23;

  const elencoS23 = useMemo(
    () =>
      clubeRealId
        ? [...elencoSub23DoClube(aspirantes, clubeRealId)].sort((a, b) => b.overall - a.overall)
        : [],
    [aspirantes, clubeRealId],
  );

  if (modoSub23 && clubeRealId) {
    return (
      <CmCareerShell
        titulo={`Elenco Sub23 — ${timeReal?.nome_completo ?? 'Clube'}`}
        subtitulo={`${elencoS23.length}/${TAMANHO_ELENCO_SUB23} atletas · plantel pro ${plantel}/${TETO_PLANTEL_PRO_SUB23} · IA gerencia`}
      >
        <CmPanel className="mb-4">
          <p className="text-xs text-zinc-500">Única ação do modo Sub23</p>
          <p className="mt-1 text-sm text-zinc-300">
            Ao promover, um novo aspirante entra automaticamente (sempre 22).
            {plantelCheio ? ` ${MSG_PLANTEL_CHEIO_SUBIR}` : ''}
          </p>
          {plantelCheio && (
            <div className="mt-2">
              <CmBtn variant="ghost" onClick={sairModoSub23}>
                Voltar ao profissional (liberar vaga)
              </CmBtn>
            </div>
          )}
          {aviso && <p className="mt-2 text-sm text-amber-200">{aviso}</p>}
        </CmPanel>

        <ul className="space-y-2">
          {elencoS23.map((a) => (
            <CmPanel key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-100">
                    {a.nome}{' '}
                    <span className="text-xs font-normal text-zinc-500">
                      {a.idade} · {a.posicao}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    OVR {a.overall} · teto ~{a.potencialOvr} · {rotuloTierBase(a.tier)}
                    {a.precoceEstagnado ? ' · precoce' : ''}
                    {a.diamanteBruto ? ' · diamante bruto' : ''}
                  </p>
                </div>
                <CmBtn
                  variant="primary"
                  disabled={plantelCheio}
                  onClick={() => {
                    if (plantelCheio) {
                      setAviso(MSG_PLANTEL_CHEIO_SUBIR);
                      return;
                    }
                    const err = promover(a.id);
                    setAviso(err);
                  }}
                >
                  {plantelCheio ? 'Plantel cheio' : 'Subir profissional'}
                </CmBtn>
              </div>
            </CmPanel>
          ))}
        </ul>
        {elencoS23.length === 0 && (
          <p className="mt-4 text-sm text-amber-200/90">Nenhum atleta no Sub-23 deste clube.</p>
        )}
      </CmCareerShell>
    );
  }

  const titulo = timeReal?.nome_completo ?? timeFic?.nome ?? 'Elenco';
  const elenco = clubeRealId ? elencoReal : ordenarElenco(elencoFic);

  return (
    <CmCareerShell
      titulo={`Elenco — ${titulo}`}
      subtitulo={
        clubeRealId ?
          `Plantel ${plantel}/${TETO_PLANTEL_PRO_SUB23} · energia, valor e dispensa`
        : 'Energia, médias técnicos / mentais / físicos (1–20), valor e salário'
      }
    >
      {clubeRealId && (
        <CmPanel className="mb-4">
          <p className="text-xs text-zinc-500">Gestão de plantel</p>
          <p className="mt-1 text-sm text-zinc-300">
            Para liberar vaga e subir alguém do Sub-23, venda ou dispense um atleta.
          </p>
          <div className="mt-2">
            <CmBtn variant="ghost" onClick={entrarModoSub23}>
              Abrir Sub23
            </CmBtn>
          </div>
          {aviso && <p className="mt-2 text-sm text-amber-200">{aviso}</p>}
          {oferta && (
            <div className="mt-3 rounded border border-amber-800/50 bg-amber-950/20 p-3 text-sm">
              <p className="text-amber-100">{oferta.mensagem}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CmBtn
                  variant="primary"
                  onClick={() => {
                    const err = tentarDispensa(oferta.jogadorId);
                    if (err && err.includes('recusou')) {
                      setRecusaPendente(oferta.jogadorId);
                      setAviso(err);
                    } else if (err) {
                      setAviso(err);
                      setOferta(null);
                    } else {
                      setAviso('Dispensa concluída (acordo 50%).');
                      setOferta(null);
                      setRecusaPendente(null);
                    }
                  }}
                >
                  Oferecer acordo (50%)
                </CmBtn>
                <CmBtn variant="ghost" onClick={() => setOferta(null)}>
                  Cancelar
                </CmBtn>
              </div>
            </div>
          )}
          {recusaPendente != null && (
            <div className="mt-3 rounded border border-rose-800/50 bg-rose-950/20 p-3 text-sm">
              <p className="text-rose-100">
                Jogador recusou o acordo. Pagar rescisão integral para encerrar?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CmBtn
                  variant="danger"
                  onClick={() => {
                    const err = confirmarIntegral(recusaPendente);
                    setAviso(err ?? 'Dispensa integral concluída.');
                    setRecusaPendente(null);
                    setOferta(null);
                  }}
                >
                  Pagar integral
                </CmBtn>
                <CmBtn
                  variant="ghost"
                  onClick={() => {
                    setRecusaPendente(null);
                    setOferta(null);
                  }}
                >
                  Manter no elenco
                </CmBtn>
              </div>
            </div>
          )}
        </CmPanel>
      )}

      <SquadTable
        elenco={elenco}
        showFinance={!!clubeRealId || elencoFic.length > 0}
        showDispensa={!!clubeRealId}
        onJogador={(id) => abrirPerfil(id)}
        onDispensa={(id) => {
          const o = simularOferta(id);
          if (!o) {
            setAviso('Não há contrato válido para dispensa.');
            return;
          }
          setOferta(o);
          setRecusaPendente(null);
          setAviso(null);
        }}
      />
      {clubeRealId && elencoReal.length === 0 && (
        <p className="mt-4 text-sm text-amber-200/90">Nenhum jogador encontrado para este clube.</p>
      )}
    </CmCareerShell>
  );
}

function SquadTable({
  elenco,
  showFinance,
  showDispensa,
  onJogador,
  onDispensa,
}: {
  elenco: Jogador[];
  showFinance: boolean;
  showDispensa?: boolean;
  onJogador: (id: number) => void;
  onDispensa?: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-700">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-zinc-800 text-zinc-400">
          <tr>
            <th className="p-2">Nome</th>
            <th>Pos</th>
            <th>Id</th>
            <th>OVR</th>
            <th>Energia</th>
            <th>Téc</th>
            <th>Men</th>
            <th>Fís</th>
            {showFinance && (
              <>
                <th>Valor</th>
                <th>Salário/mês</th>
              </>
            )}
            <th>Status</th>
            {showDispensa && <th>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {elenco.map((j) => (
            <tr key={j.id} className="border-t border-zinc-800 hover:bg-zinc-900">
              <td className="p-2">
                <button
                  type="button"
                  onClick={() => onJogador(j.id)}
                  className="font-medium text-emerald-100 underline-offset-2 hover:text-emerald-50 hover:underline"
                >
                  {j.nome}
                </button>
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
              {showFinance && (
                <>
                  <td>{formatarDinheiro(valorMercado(j))}</td>
                  <td>{formatarDinheiro(salarioMensal(j))}</td>
                </>
              )}
              <td className="text-zinc-500">
                {j.lesao && j.lesao.diasRestantes > 0 && j.energia < 60 ?
                  <span
                    className="text-rose-400"
                    title={`${j.lesao.descricao} · energia ${Math.round(j.energia)}% — não pode jogar`}
                  >
                    FORA
                  </span>
                : j.lesao && j.lesao.diasRestantes > 0 ?
                  <span className="text-amber-400" title={j.lesao.descricao}>
                    LES {j.lesao.diasRestantes}d
                  </span>
                : j.status_escalacao.slice(0, 3)}
              </td>
              {showDispensa && onDispensa && (
                <td>
                  <button
                    type="button"
                    className="text-rose-300 hover:text-rose-200"
                    onClick={() => onDispensa(j.id)}
                  >
                    Dispensar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
