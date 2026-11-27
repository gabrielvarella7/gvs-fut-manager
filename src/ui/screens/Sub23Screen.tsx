import { useMemo, useState } from 'react';
import {
  elencoSub23DoClube,
  posicaoTabelaAspirantes,
  proximaPartidaAspirantes,
} from '../../career/aspirantesS23';
import { plantelProfissionalCount, rotuloTierBase } from '../../career/youthAcademy';
import {
  MSG_PLANTEL_CHEIO_SUBIR,
  TAMANHO_ELENCO_SUB23,
  TETO_PLANTEL_PRO_SUB23,
} from '../../types/aspirantesS23';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

export function Sub23Screen() {
  const clubeId = useGameStore((s) => s.clubeRealId);
  const times = useGameStore((s) => s.timesReais);
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const jogadores = useGameStore((s) => s.jogadoresReais);
  const promover = useGameStore((s) => s.promoverSub23);
  const irPara = useGameStore((s) => s.irPara);
  const [aviso, setAviso] = useState<string | null>(null);

  const clube = times.find((t) => t.id === clubeId);
  const elenco = useMemo(
    () =>
      clubeId ? [...elencoSub23DoClube(aspirantes, clubeId)].sort((a, b) => b.overall - a.overall) : [],
    [aspirantes, clubeId],
  );
  const plantel = clubeId ? plantelProfissionalCount(jogadores, clubeId) : 0;
  const plantelCheio = plantel >= TETO_PLANTEL_PRO_SUB23;
  const pos = aspirantes && clubeId ? posicaoTabelaAspirantes(aspirantes.tabela, clubeId) : 0;
  const prox = aspirantes && clubeId ? proximaPartidaAspirantes(aspirantes, clubeId) : null;
  const adv =
    prox && clubeId ?
      times.find((t) => t.id === (prox.mandanteId === clubeId ? prox.visitanteId : prox.mandanteId))
    : null;

  const tabelaOrdenada = useMemo(() => {
    if (!aspirantes) return [];
    return [...aspirantes.tabela].sort(
      (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols || b.gols_pro - a.gols_pro,
    );
  }, [aspirantes]);

  const nomeTime = (id: string) => times.find((t) => t.id === id)?.nome ?? id;

  return (
    <CmCareerShell
      titulo="Sub-23 · Aspirantes"
      subtitulo="Campeonato de Aspirantes S23 — elenco IA (22 atletas)"
    >
      {!aspirantes || !clubeId ? (
        <CmPanel className="text-sm text-zinc-400">
          Assuma um clube profissional para gerenciar o Sub-23.
        </CmPanel>
      ) : (
        <>
          <CmPanel className="mb-4">
            <p className="text-xs text-zinc-500">{clube?.nome_completo}</p>
            <p className="text-lg font-semibold text-zinc-100">
              Elenco {elenco.length}/{TAMANHO_ELENCO_SUB23}
              {pos > 0 && (
                <span className="ml-2 text-sm font-normal text-emerald-400">
                  · {pos}º no Aspirantes
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Plantel profissional {plantel}/{TETO_PLANTEL_PRO_SUB23} · disputa 100% pela IA
            </p>
            {plantelCheio && (
              <p className="mt-2 text-sm text-amber-200">{MSG_PLANTEL_CHEIO_SUBIR}</p>
            )}
            {prox && (
              <p className="mt-2 text-sm text-zinc-300">
                Próximo: rodada {prox.rodada} vs {adv?.nome_completo ?? 'adversário'} (
                {prox.mandanteId === clubeId ? 'casa' : 'fora'})
              </p>
            )}
            {aviso && <p className="mt-2 text-sm text-amber-200">{aviso}</p>}
          </CmPanel>

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Elenco Sub-23</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Ao promover, um novo aspirante entra automaticamente (sempre 22).
            {plantelCheio ?
              ` ${MSG_PLANTEL_CHEIO_SUBIR}`
            : ' Escolha um atleta para subir ao profissional.'}
          </p>
          <ul className="mb-6 space-y-2">
            {elenco.map((a) => (
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
                    {plantelCheio ? 'Plantel cheio' : 'Subir ao profissional'}
                  </CmBtn>
                </div>
              </CmPanel>
            ))}
          </ul>

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">
            Classificação · Aspirantes S23
          </h2>
          <div className="overflow-x-auto rounded border border-zinc-700">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-zinc-800 text-zinc-400">
                <tr>
                  <th className="p-2">#</th>
                  <th>Clube</th>
                  <th>P</th>
                  <th>J</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>SG</th>
                </tr>
              </thead>
              <tbody>
                {tabelaOrdenada.map((l, i) => (
                  <tr
                    key={l.time_id}
                    className={`border-t border-zinc-800 ${
                      l.time_id === clubeId ? 'bg-emerald-950/40 text-emerald-100' : ''
                    }`}
                  >
                    <td className="p-2">{i + 1}</td>
                    <td>{nomeTime(l.time_id)}</td>
                    <td className="font-semibold">{l.pontos}</td>
                    <td>{l.jogos}</td>
                    <td>{l.vitorias}</td>
                    <td>{l.empates}</td>
                    <td>{l.derrotas}</td>
                    <td>{l.saldo_gols}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <CmBtn variant="ghost" onClick={() => irPara('elenco')}>
              Ir ao plantel profissional (dispensa / vendas)
            </CmBtn>
          </div>
        </>
      )}
    </CmCareerShell>
  );
}
