import { useEffect } from 'react';
import { getTimeFicticio } from '../../career/fictionalLeague';
import { esquemaSugerido } from '../../data/esquemasTaticos';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmMenuList, CmPanel } from '../cm/CmShell';

export function TournamentHubScreen() {
  const perfil = useGameStore((s) => s.perfil);
  const timeUsuarioId = useGameStore((s) => s.timeUsuarioId);
  const times = useGameStore((s) => s.timesFicticios);
  const jogos = useGameStore((s) => s.jogos);
  const desempenho = useGameStore((s) => s.desempenho);
  const torneioConcluido = useGameStore((s) => s.torneioConcluido);
  const irPara = useGameStore((s) => s.irPara);
  const finalizar = useGameStore((s) => s.finalizarTorneioSePronto);
  const limparAviso = useGameStore((s) => s.limparAvisoSalvo);
  const avisoSalvo = useGameStore((s) => s.avisoSalvo);
  const esquema = useGameStore((s) =>
    esquemaSugerido({ atual: s.esquemaAtual, preferido: s.perfil?.esquemaPreferido }),
  );

  const time = getTimeFicticio(times, timeUsuarioId ?? '');
  const proximo = jogos.find((j) => j.ehDoUsuario && !j.finalizado);

  const jogar = () => {
    if (proximo) irPara('partida');
  };

  const checarFim = () => {
    finalizar();
  };

  useEffect(() => {
    if (!avisoSalvo) return;
    const t = window.setTimeout(limparAviso, 3500);
    return () => window.clearTimeout(t);
  }, [avisoSalvo, limparAviso]);

  return (
    <CmCareerShell
      titulo={time?.nome ?? 'Seu clube'}
      subtitulo={`Técnico: ${perfil?.nome} · Esquema em jogo: ${esquema}`}
      acoesExtras={
        <>
          {torneioConcluido ? (
            <CmBtn onClick={() => irPara('propostas')}>Ver propostas</CmBtn>
          ) : proximo ? (
            <CmBtn onClick={jogar}>Jogar rodada {proximo.rodada}</CmBtn>
          ) : (
            <CmBtn onClick={checarFim}>Encerrar torneio</CmBtn>
          )}
        </>
      }
    >
      <CmPanel className="mb-4">
        <p className="text-sm text-zinc-300">
          Pontos: <strong>{desempenho.pontos}</strong> · V-D-E: {desempenho.vitorias}-{desempenho.derrotas}-
          {desempenho.empates} · SG: {desempenho.golsPro - desempenho.golsContra}
        </p>
        <p className="text-xs text-zinc-500">Nota para propostas: {desempenho.nota.toFixed(1)}</p>
      </CmPanel>

      <h2 className="mb-2 text-sm font-medium text-emerald-400">Seus jogos</h2>
      <CmMenuList
        items={jogos
          .filter((j) => j.ehDoUsuario)
          .map((j) => {
            const adv =
              getTimeFicticio(times, j.visitanteId)?.nome ??
              getTimeFicticio(times, j.mandanteId)?.nome ??
              '?';
            const placar =
              j.finalizado && j.golsMandante != null
                ? `${j.golsMandante} x ${j.golsVisitante}`
                : '—';
            const ehProxima = proximo?.id === j.id;
            return {
              label: `Rodada ${j.rodada} vs ${adv}`,
              hint: placar,
              onClick: () => {
                if (ehProxima) irPara('partida');
              },
              disabled: j.finalizado || !ehProxima,
            };
          })}
      />
    </CmCareerShell>
  );
}