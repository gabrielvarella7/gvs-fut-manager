import { useEffect } from 'react';
import {
  diasAteProximoJogo,
  ehDiaDeJogo,
  formatarDataBr,
  posicaoDoTime,
  proximaPartidaUsuario,
} from '../../career/brasileirao';
import { montarFormaUsuario, podeAvancarUmDia } from '../../career/calendarioUsuario';
import { formatarDinheiro } from '../../career/playerUtils';
import { rumorPendenteResposta, rotuloTendenciaSaida } from '../../career/sondagemMercado';
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
  const jogarComAuxiliar = useGameStore((s) => s.jogarComAuxiliar);
  const garantirCalendario = useGameStore((s) => s.garantirCalendarioUsuario);
  const rumores = useGameStore((s) => s.mundoClube?.rumoresOfertas ?? []);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const responderSondagem = useGameStore((s) => s.responderSondagemEntrada);
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
  const podeAvancar =
    brasileirao && clubeRealId ? podeAvancarUmDia(brasileirao, clubeRealId).ok : true;
  const forma =
    brasileirao && clubeRealId
      ? montarFormaUsuario(brasileirao, clubeRealId, (id) =>
          timesReais.find((t) => t.id === id)?.nome ?? id,
        )
      : [];
  const ultimo = forma[0];
  const sondagensPendentes = rumores.filter(rumorPendenteResposta);

  useEffect(() => {
    garantirCalendario();
  }, [garantirCalendario]);

  return (
    <CmCareerShell
      titulo={clube?.nome_completo ?? 'Escritório'}
      subtitulo={`Técnico: ${perfil?.nome ?? '—'} · ${campeonato?.nome ?? 'Campeonato'} · Esquema: ${esquema}`}
    >
      {sondagensPendentes.length > 0 && (
        <CmPanel className="mb-4 border-amber-600/60 bg-amber-950/25">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Sondagens / mercado paralelo — resposta obrigatória
          </p>
          <ul className="mt-3 space-y-3">
            {sondagensPendentes.map((r) => {
              const jog = jogadoresReais.find((j) => j.id === r.jogadorId);
              return (
                <li key={r.id} className="rounded border border-amber-900/40 bg-zinc-950/50 p-3 text-sm">
                  <p className="text-zinc-100">
                    {r.texto}{' '}
                    <span className="text-zinc-400">(indicativo {formatarDinheiro(r.valorIndicativo)})</span>
                  </p>
                  <p className="mt-1 text-xs text-amber-200/90">
                    {rotuloTendenciaSaida(r.tendenciaSair ?? 50)}
                    {jog ? ` · ${jog.nome}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CmBtn
                      variant="primary"
                      onClick={() => responderSondagem(r.id, 'negociar', r.valorIndicativo)}
                    >
                      Aceitar negociar
                    </CmBtn>
                    <CmBtn variant="danger" onClick={() => responderSondagem(r.id, 'recusar')}>
                      Recusar
                    </CmBtn>
                    <CmBtn variant="ghost" onClick={() => irPara('transferencias')}>
                      Abrir transferências
                    </CmBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        </CmPanel>
      )}

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
              <div className="rounded border border-emerald-800/50 bg-emerald-950/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Forma — últimos 5 jogos
                </p>
                {forma.length > 0 ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {forma.map((f, i) => (
                        <span
                          key={`${f.dataISO}-${i}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold shadow-sm ${
                            f.sigla === 'V'
                              ? 'bg-emerald-700 text-emerald-50'
                              : f.sigla === 'D'
                                ? 'bg-red-900 text-red-100'
                                : 'bg-zinc-600 text-zinc-100'
                          }`}
                          title={`${f.placar} vs ${f.adversarioNome}`}
                        >
                          {f.sigla}
                        </span>
                      ))}
                    </div>
                    {ultimo && (
                      <p className="mt-3 text-base text-zinc-100">
                        Último: <strong className="text-emerald-300">{ultimo.placar}</strong> vs{' '}
                        <strong>{ultimo.adversarioNome}</strong>
                        {ultimo.emCasa ? ' (casa)' : ' (fora)'}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">Ainda sem jogos finalizados no campeonato.</p>
                )}
              </div>

              <p className="mt-4 text-xs uppercase tracking-wide text-zinc-500">Próximo jogo</p>
              <p className="mt-1 text-base text-zinc-100">
                Rodada {prox.rodada} · {formatarDataBr(prox.dataISO)} ·{' '}
                {emCasa ? 'Mandante' : 'Visitante'} vs{' '}
                <strong>{adversario?.nome_completo ?? advId}</strong>
              </p>

              {diaJogo ? (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-sm font-medium text-emerald-200">
                    Obrigatório disputar hoje — o calendário não avança sem o resultado.
                  </p>
                  <CmBtn onClick={() => irPara('partida')}>Jogar partida</CmBtn>
                  <CmBtn variant="ghost" onClick={jogarComAuxiliar}>
                    Mandar auxiliar (resultado direto)
                  </CmBtn>
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
            <CmBtn variant="ghost" onClick={avancarUmDia} disabled={!podeAvancar}>
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
          { label: 'Base', hint: 'Sub-20 / CT', onClick: () => irPara('base') },
          { label: 'Sub-23', hint: 'Aspirantes S23', onClick: () => irPara('sub23') },
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