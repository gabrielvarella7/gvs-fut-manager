import {
  diasAteProximoJogo,
  ehDiaDeJogo,
  formatarDataBr,
  posicaoDoTime,
  proximaPartidaUsuario,
} from '../../career/brasileirao';
import { esquemaSugerido } from '../../data/esquemasTaticos';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmMenuList, CmPanel } from '../cm/CmShell';

export function OfficeHubScreen() {
  const perfil = useGameStore((s) => s.perfil);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const timesReais = useGameStore((s) => s.timesReais);
  const campeonato = useGameStore((s) => s.campeonato);
  const noticias = useGameStore((s) => s.noticias);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const irPara = useGameStore((s) => s.irPara);
  const avancarUmDia = useGameStore((s) => s.avancarUmDia);
  const avancarAteDiaDeJogo = useGameStore((s) => s.avancarAteDiaDeJogo);
  const esquema = useGameStore((s) =>
    esquemaSugerido({ atual: s.esquemaAtual, preferido: s.perfil?.esquemaPreferido }),
  );

  const clube = timesReais.find((t) => t.id === clubeRealId);
  const prox =
    brasileirao && clubeRealId
      ? proximaPartidaUsuario(brasileirao, clubeRealId)
      : null;
  const advId =
    prox && clubeRealId
      ? prox.mandanteId === clubeRealId
        ? prox.visitanteId
        : prox.mandanteId
      : null;
  const adversario = timesReais.find((t) => t.id === advId);
  const emCasa = prox?.mandanteId === clubeRealId;
  const diaJogo = brasileirao && clubeRealId && ehDiaDeJogo(brasileirao, clubeRealId);
  const diasRestantes =
    brasileirao && clubeRealId ? diasAteProximoJogo(brasileirao, clubeRealId) : 0;
  const posicao =
    brasileirao && clubeRealId ? posicaoDoTime(brasileirao.tabela, clubeRealId) : null;

  return (
    <CmCareerShell
      titulo={clube?.nome_completo ?? 'Escritório'}
      subtitulo={`Técnico: ${perfil?.nome ?? '—'} · ${campeonato?.nome ?? 'Campeonato'} · Esquema: ${esquema}`}
    >
      {brasileirao && (
        <CmPanel className="mb-4 border border-emerald-900/50">
          <p className="text-lg font-semibold text-emerald-300">
            {formatarDataBr(brasileirao.dataAtualISO)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Temporada {brasileirao.temporadaAno} · Rodada {brasileirao.rodadaAtual} de 38
            {posicao != null && (
              <>
                {' '}
                · <strong className="text-zinc-200">{posicao}º</strong> na tabela
              </>
            )}
          </p>

          {prox ? (
            <div className="mt-4 rounded-lg bg-zinc-900/80 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Próximo jogo</p>
              <p className="mt-1 text-base text-zinc-100">
                Rodada {prox.rodada} · {formatarDataBr(prox.dataISO)} ·{' '}
                {emCasa ? 'Mandante' : 'Visitante'} vs{' '}
                <strong>{adversario?.nome_completo ?? advId}</strong>
              </p>
              {diaJogo ? (
                <div className="mt-3">
                  <CmBtn onClick={() => irPara('partida')}>Jogar partida</CmBtn>
                </div>
              ) : (
                <p className="mt-2 text-sm text-amber-200/90">
                  Faltam {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} para a partida
                </p>
              )}
              <div className="mt-3">
                <CmBtn variant="ghost" onClick={() => irPara('relatorio_pre_jogo')}>
                  Relatório pré-jogo
                </CmBtn>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Temporada concluída — todos os jogos disputados.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <CmBtn variant="ghost" onClick={avancarUmDia}>
              Continuar (+1 dia)
            </CmBtn>
            {prox && !diaJogo && diasRestantes > 0 && (
              <CmBtn onClick={avancarAteDiaDeJogo}>Continuar até o jogo</CmBtn>
            )}
          </div>
        </CmPanel>
      )}

      <CmPanel className="mb-4">
        <p className="text-sm text-zinc-300">
          Estádio: <strong>{clube?.estadio}</strong> · Força do elenco:{' '}
          <strong>{clube?.forca_geral}</strong>
        </p>
      </CmPanel>

      <h2 className="mb-2 text-sm font-medium text-emerald-400">Atalhos</h2>
      <CmMenuList
        items={[
          { label: 'Elenco', hint: 'Plantel completo', onClick: () => irPara('elenco') },
          { label: 'Treinos', hint: 'Microciclos', onClick: () => irPara('treinos') },
          { label: 'Notícias', hint: String(noticias.length), onClick: () => irPara('noticias') },
          { label: 'Classificação', hint: posicao != null ? `${posicao}º` : '—', onClick: () => irPara('classificacao') },
          { label: 'Calendário', hint: '38 jogos', onClick: () => irPara('calendario') },
          { label: 'Transferências', hint: 'Mercado', onClick: () => irPara('transferencias') },
          { label: 'Staff', hint: 'Equipe · renovações', onClick: () => irPara('staff') },
          { label: 'Base', hint: 'Formação', onClick: () => irPara('base') },
          { label: 'Finanças', hint: 'Receitas', onClick: () => irPara('financas') },
          { label: 'Táticas', hint: esquema, onClick: () => irPara('tatica') },
          ...(prox
            ? [
                {
                  label: 'Relatório pré-jogo',
                  hint: adversario?.nome ?? 'Adversário',
                  onClick: () => irPara('relatorio_pre_jogo'),
                },
              ]
            : []),
        ]}
      />

      {noticias[0] && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-medium text-emerald-400">Última notícia</h2>
          <CmPanel>
            <p className="text-sm font-medium text-zinc-200">{noticias[0].titulo}</p>
            <p className="mt-2 text-sm text-zinc-400">{noticias[0].texto}</p>
          </CmPanel>
        </>
      )}
    </CmCareerShell>
  );
}