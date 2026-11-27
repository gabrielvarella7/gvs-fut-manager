import { useState } from 'react';
import { formatarDataBr } from '../../career/brasileirao';
import { partidasClubeAspirantes } from '../../career/aspirantesS23';
import { rotuloCompeticaoSub23 } from '../../types/aspirantesS23';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';
import { ClubNameLink } from '../components/ClubNameLink';

const JOGOS_POR_PAGINA = 7;

export function CalendarScreen() {
  const campeonato = useGameStore((s) => s.campeonato);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const modoSub23 = useGameStore((s) => s.modoSub23);

  const clube = timesReais.find((t) => t.id === clubeRealId);
  const porNome = new Map(timesReais.map((t) => [t.id, t.nome]));
  const nomeComp = modoSub23
    ? rotuloCompeticaoSub23(campeonato?.nome)
    : (campeonato?.nome ?? 'Brasileirão');

  const meusJogos = modoSub23
    ? aspirantes && clubeRealId
      ? partidasClubeAspirantes(aspirantes, clubeRealId)
      : []
    : (brasileirao?.partidas
        .filter((p) => p.ehDoUsuario)
        .sort((a, b) => a.rodada - b.rodada) ?? []);

  const [visiveis, setVisiveis] = useState(JOGOS_POR_PAGINA);
  const jogosVisiveis = meusJogos.slice(0, visiveis);
  const restantes = meusJogos.length - visiveis;

  return (
    <CmCareerShell
      titulo="Calendário"
      subtitulo={
        clube
          ? `${clube.nome} — ${nomeComp}${
              !modoSub23 && brasileirao?.dataAtualISO
                ? ` · ${formatarDataBr(brasileirao.dataAtualISO)}`
                : ''
            }`
          : 'Competições'
      }
    >
      <CmPanel className="mb-4">
        <p className="text-sm text-zinc-300">
          {meusJogos.length} jogos no campeonato (ida e volta contra os 19 adversários)
          {modoSub23 ? ' Sub23.' : '.'}
        </p>
        {modoSub23 && (
          <p className="mt-1 text-xs text-sky-300">
            Resultados atualizados pela IA junto com o calendário profissional.
          </p>
        )}
      </CmPanel>

      <ul className="space-y-2">
        {jogosVisiveis.map((p) => {
          const casa = p.mandanteId === clubeRealId;
          const adv = casa ? p.visitanteId : p.mandanteId;
          const placar =
            p.finalizado && p.golsMandante != null && p.golsVisitante != null
              ? ` ${p.golsMandante}×${p.golsVisitante}`
              : '';
          const proximoAberto =
            !p.finalizado && !meusJogos.some((j) => !j.finalizado && j.rodada < p.rodada);

          return (
            <li key={p.id}>
              <CmPanel
                className={
                  proximoAberto ? 'border border-emerald-800/60' : p.finalizado ? 'opacity-75' : ''
                }
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-100">
                    Rodada {p.rodada} · {formatarDataBr(p.dataISO)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {p.finalizado ? 'Encerrado' : proximoAberto ? 'Próximo' : 'Agendado'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-300">
                  {casa ? 'Casa' : 'Fora'} vs{' '}
                  <ClubNameLink clubeId={adv} className="font-semibold text-sky-200 underline-offset-2 hover:underline">
                    {porNome.get(adv) ?? adv}
                    {modoSub23 ? ' Sub23' : ''}
                  </ClubNameLink>
                  {placar && <span className="text-emerald-300">{placar}</span>}
                </p>
              </CmPanel>
            </li>
          );
        })}
      </ul>

      {restantes > 0 && (
        <div className="mt-4 flex justify-center">
          <CmBtn variant="ghost" onClick={() => setVisiveis((v) => v + JOGOS_POR_PAGINA)}>
            Próximos jogos (+{Math.min(JOGOS_POR_PAGINA, restantes)})
          </CmBtn>
        </div>
      )}
    </CmCareerShell>
  );
}
