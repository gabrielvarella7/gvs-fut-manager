import { getTimeFicticio } from '../../career/fictionalLeague';
import { mediaAtributosGrupo } from '../../career/atributosJogador';
import { ordenarElenco } from '../../career/ordenarElenco';
import { formatarDinheiro, salarioMensal, valorMercado } from '../../career/playerUtils';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import type { Jogador } from '../../types/schema';

export function SquadScreen() {
  const timeId = useGameStore((s) => s.timeUsuarioId);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const times = useGameStore((s) => s.timesFicticios);
  const timesReais = useGameStore((s) => s.timesReais);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const abrirPerfil = useGameStore((s) => s.abrirPerfilJogador);

  const timeFic = getTimeFicticio(times, timeId ?? '');
  const timeReal = timesReais.find((t) => t.id === clubeRealId);
  const elencoFic = timeFic?.jogadores ?? [];
  const elencoReal = clubeRealId
    ? ordenarElenco(jogadoresReais.filter((j) => j.time_id === clubeRealId))
    : [];

  const titulo = timeReal?.nome_completo ?? timeFic?.nome ?? 'Elenco';
  const elenco = clubeRealId ? elencoReal : ordenarElenco(elencoFic);

  return (
    <CmCareerShell
      titulo={`Elenco — ${titulo}`}
      subtitulo="Médias técnicos / mentais / físicos (1–20), valor e salário"
    >
      <SquadTable
        elenco={elenco}
        showFinance={!!clubeRealId || elencoFic.length > 0}
        onJogador={(id) => abrirPerfil(id)}
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
  onJogador,
}: {
  elenco: Jogador[];
  showFinance: boolean;
  onJogador: (id: number) => void;
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
              <td className="text-emerald-400">{j.overall}</td>
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
                {j.lesao && j.lesao.diasRestantes > 0 ?
                  <span className="text-rose-400" title={j.lesao.descricao}>
                    LES {j.lesao.diasRestantes}d
                  </span>
                : j.status_escalacao.slice(0, 3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}