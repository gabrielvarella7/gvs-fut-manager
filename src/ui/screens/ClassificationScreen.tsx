import { classesZonaTabela, LEGENDA_ZONAS, zonaNaPosicao } from '../../career/classificacaoZonas';
import { formatarDataBr, ordenarTabela } from '../../career/brasileirao';
import { rotuloCompeticaoSub23 } from '../../types/aspirantesS23';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

export function ClassificationScreen() {
  const campeonato = useGameStore((s) => s.campeonato);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const modoSub23 = useGameStore((s) => s.modoSub23);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);

  const nomeComp = modoSub23
    ? rotuloCompeticaoSub23(campeonato?.nome)
    : (campeonato?.nome ?? 'Brasileirão');

  const tabela = modoSub23
    ? aspirantes
      ? [...aspirantes.tabela].sort(
          (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols || b.gols_pro - a.gols_pro,
        )
      : []
    : brasileirao
      ? ordenarTabela(brasileirao.tabela, campeonato)
      : [];

  const porNome = new Map(timesReais.map((t) => [t.id, t.nome]));
  const rodada = modoSub23 ? aspirantes?.rodadaAtual : brasileirao?.rodadaAtual;
  const dataISO = !modoSub23 ? brasileirao?.dataAtualISO : undefined;

  return (
    <CmCareerShell
      titulo="Classificação"
      subtitulo={
        rodada != null
          ? `${nomeComp} · Rodada ${rodada}/38${dataISO ? ` · ${formatarDataBr(dataISO)}` : ''}`
          : nomeComp
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
              const zona = modoSub23 ? null : zonaNaPosicao(pos, campeonato);
              const classes = zona ? classesZonaTabela(zona) : { linha: '', posicao: '' };
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
                    {modoSub23 ? ' Sub23' : ''}
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
      {!modoSub23 && (
        <ul className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
          {LEGENDA_ZONAS.map((item) => (
            <li key={item.texto} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.cor}`} />
              {item.texto}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-zinc-600">
        Ordem: pontos, vitórias, saldo de gols, gols marcados.
        {modoSub23 ? ' · Mesmas zonas do Brasileirão profissional, disputado entre elencos Sub23.' : ''}
      </p>
    </CmCareerShell>
  );
}
