import { classesZonaTabela, LEGENDA_ZONAS, zonaNaPosicao } from '../../career/classificacaoZonas';
import { formatarDataBr, ordenarTabela } from '../../career/brasileirao';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

export function ClassificationScreen() {
  const campeonato = useGameStore((s) => s.campeonato);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);

  const tabela = brasileirao ? ordenarTabela(brasileirao.tabela, campeonato) : [];
  const porNome = new Map(timesReais.map((t) => [t.id, t.nome]));

  return (
    <CmCareerShell
      titulo="Classificação"
      subtitulo={
        brasileirao
          ? `${campeonato?.nome ?? 'Brasileirão'} · Rodada ${brasileirao.rodadaAtual}/38 · ${formatarDataBr(brasileirao.dataAtualISO)}`
          : 'Brasileirão'
      }
    >
      <CmPanel className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-xs uppercase text-zinc-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2">Clube</th>
              <th className="py-2 text-center">P</th>
              <th className="py-2 text-center">J</th>
              <th className="py-2 text-center">V</th>
              <th className="py-2 text-center">E</th>
              <th className="py-2 text-center">D</th>
              <th className="py-2 text-center">GP</th>
              <th className="py-2 text-center">GC</th>
              <th className="py-2 text-center">SG</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((l, i) => {
              const pos = i + 1;
              const destaque = l.time_id === clubeRealId;
              const zona = zonaNaPosicao(pos, campeonato);
              const classes = classesZonaTabela(zona);
              return (
                <tr
                  key={l.time_id}
                  className={`border-b border-zinc-800 ${classes.linha} ${
                    destaque ? 'ring-1 ring-inset ring-emerald-700/50' : ''
                  }`}
                >
                  <td className={`py-2 pr-2 ${classes.posicao}`}>{pos}</td>
                  <td className="py-2 font-medium text-zinc-100">
                    {porNome.get(l.time_id) ?? l.time_id}
                  </td>
                  <td className="py-2 text-center font-semibold">{l.pontos}</td>
                  <td className="py-2 text-center">{l.jogos}</td>
                  <td className="py-2 text-center">{l.vitorias}</td>
                  <td className="py-2 text-center">{l.empates}</td>
                  <td className="py-2 text-center">{l.derrotas}</td>
                  <td className="py-2 text-center">{l.gols_pro}</td>
                  <td className="py-2 text-center">{l.gols_contra}</td>
                  <td className="py-2 text-center">{l.saldo_gols}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CmPanel>
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
        {LEGENDA_ZONAS.map((item) => (
          <li key={item.texto} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${item.cor}`} />
            {item.texto}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-600">
        Ordem: pontos, vitórias, saldo de gols, gols marcados.
      </p>
    </CmCareerShell>
  );
}