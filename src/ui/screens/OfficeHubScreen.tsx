import { useEffect } from 'react';
import {
  diasAteProximoJogo,
  ehDiaDeJogo,
  formatarDataBr,
  posicaoDoTime,
  proximaPartidaUsuario,
} from '../../career/brasileirao';
import {
  montarFormaSub23,
  posicaoTabelaAspirantes,
  proximaPartidaAspirantes,
} from '../../career/aspirantesS23';
import { montarFormaUsuario, podeAvancarUmDia } from '../../career/calendarioUsuario';
import { formatarDinheiro } from '../../career/playerUtils';
import { rumorPendenteResposta, rotuloTendenciaSaida } from '../../career/sondagemMercado';
import { esquemaSugerido } from '../../data/esquemasTaticos';
import { rotuloCompeticaoSub23, TAMANHO_ELENCO_SUB23 } from '../../types/aspirantesS23';
import { elencoSub23DoClube } from '../../career/aspirantesS23';
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
  const aspirantes = useGameStore((s) => s.aspirantesS23);
  const modoSub23 = useGameStore((s) => s.modoSub23);
  const irPara = useGameStore((s) => s.irPara);
  const entrarModoSub23 = useGameStore((s) => s.entrarModoSub23);
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
  const nomeCompS23 = rotuloCompeticaoSub23(campeonato?.nome);

  const proxPro =
    brasileirao && clubeRealId
      ? proximaPartidaUsuario(brasileirao, clubeRealId)
      : null;
  const proxS23 =
    aspirantes && clubeRealId ? proximaPartidaAspirantes(aspirantes, clubeRealId) : null;
  const prox = modoSub23 ? proxS23 : proxPro;

  const advId =
    prox && clubeRealId
      ? prox.mandanteId === clubeRealId
        ? prox.visitanteId
        : prox.mandanteId
      : null;
  const adversario = timesReais.find((t) => t.id === advId);
  const emCasa = prox?.mandanteId === clubeRealId;
  const diaJogo =
    !modoSub23 && brasileirao && clubeRealId && ehDiaDeJogo(brasileirao, clubeRealId);
  const diasRestantes =
    !modoSub23 && brasileirao && clubeRealId
      ? diasAteProximoJogo(brasileirao, clubeRealId)
      : 0;
  const posicaoPro =
    brasileirao && clubeRealId ? posicaoDoTime(brasileirao.tabela, clubeRealId) : null;
  const posicaoS23 =
    aspirantes && clubeRealId ? posicaoTabelaAspirantes(aspirantes.tabela, clubeRealId) : null;
  const posicao = modoSub23 ? posicaoS23 : posicaoPro;
  const podeAvancar =
    !modoSub23 &&
    brasileirao &&
    clubeRealId &&
    podeAvancarUmDia(brasileirao, clubeRealId).ok;
  const formaPro =
    brasileirao && clubeRealId
      ? montarFormaUsuario(brasileirao, clubeRealId, (id) =>
          timesReais.find((t) => t.id === id)?.nome ?? id,
        )
      : [];
  const formaS23 =
    aspirantes && clubeRealId
      ? montarFormaSub23(aspirantes, clubeRealId, (id) =>
          timesReais.find((t) => t.id === id)?.nome ?? id,
        )
      : [];
  const forma = modoSub23 ? formaS23 : formaPro;
  const ultimo = forma[0];
  const sondagensPendentes = modoSub23 ? [] : rumores.filter(rumorPendenteResposta);
  const elencoS23 =
    modoSub23 && clubeRealId ? elencoSub23DoClube(aspirantes, clubeRealId) : [];

  useEffect(() => {
    if (!modoSub23) garantirCalendario();
  }, [garantirCalendario, modoSub23]);

  const noticiasS23 = noticias.filter(
    (n) =>
      /sub23|aspirantes|s23/i.test(n.id) ||
      /sub23|aspirantes|s23/i.test(n.titulo) ||
      /sub-23|sub23/i.test(n.texto),
  );
  const noticiaDestaque = modoSub23 ? (noticiasS23[0] ?? noticias[0]) : noticias[0];

  return (
    <CmCareerShell
      titulo={clube?.nome_completo ?? 'Escritório'}
      subtitulo={
        modoSub23
          ? `Sub-23 · ${nomeCompS23} · IA gerencia elenco e partidas`
          : `Técnico: ${perfil?.nome ?? '—'} · ${campeonato?.nome ?? 'Campeonato'} · Esquema: ${esquema}`
      }
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

      {(modoSub23 ? aspirantes : brasileirao) && (
        <CmPanel className="mb-4 border border-emerald-900/50">
          <p className="text-lg font-semibold text-emerald-300">
            {modoSub23
              ? `${nomeCompS23} · temporada ${aspirantes!.temporadaAno}`
              : formatarDataBr(brasileirao!.dataAtualISO)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {modoSub23 ? (
              <>
                Rodada {aspirantes!.rodadaAtual} de 38
                {posicao != null && posicao > 0 && (
                  <>
                    {' '}
                    · <strong className="text-zinc-200">{posicao}º</strong> na tabela
                  </>
                )}
                {' '}
                · elenco {elencoS23.length}/{TAMANHO_ELENCO_SUB23}
              </>
            ) : (
              <>
                Temporada {brasileirao!.temporadaAno} · Rodada {brasileirao!.rodadaAtual} de 38
                {posicao != null && (
                  <>
                    {' '}
                    · <strong className="text-zinc-200">{posicao}º</strong> na tabela
                  </>
                )}
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
                              ? 'bg-green-600 text-green-50'
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
                Rodada {prox.rodada}
                {'dataISO' in prox && prox.dataISO ? ` · ${formatarDataBr(prox.dataISO)}` : ''} ·{' '}
                {emCasa ? 'Mandante' : 'Visitante'} vs{' '}
                <strong>{adversario?.nome_completo ?? advId}</strong>
                {modoSub23 ? ' (Sub23)' : ''}
              </p>

              {modoSub23 ? (
                <p className="mt-3 text-sm text-sky-200">
                  Partida disputada automaticamente pela IA — acompanhe em Tabela e Calendário.
                </p>
              ) : diaJogo ? (
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
              {!modoSub23 && (
                <div className="mt-3">
                  <CmBtn variant="ghost" onClick={() => irPara('relatorio_pre_jogo')}>
                    Relatório pré-jogo
                  </CmBtn>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Temporada concluída — todos os jogos disputados.</p>
          )}

          {!modoSub23 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <CmBtn variant="ghost" onClick={avancarUmDia} disabled={!podeAvancar}>
                Continuar (+1 dia)
              </CmBtn>
              {prox && !diaJogo && diasRestantes > 0 && (
                <CmBtn onClick={avancarAteDiaDeJogo}>Continuar até o jogo</CmBtn>
              )}
            </div>
          )}
        </CmPanel>
      )}

      <CmPanel className="mb-4">
        <p className="text-sm text-zinc-300">
          Estádio: <strong>{clube?.estadio}</strong>
          {!modoSub23 && (
            <>
              {' '}
              · Força do elenco: <strong>{clube?.forca_geral}</strong>
            </>
          )}
          {modoSub23 && (
            <>
              {' '}
              · Disputa 100% pela IA · promoção em Elenco
            </>
          )}
        </p>
      </CmPanel>

      <h2 className="mb-2 text-sm font-medium text-emerald-400">Atalhos</h2>
      <CmMenuList
        items={
          modoSub23
            ? [
                { label: 'Elenco Sub23', hint: 'Promover atletas', onClick: () => irPara('elenco') },
                { label: 'Tabela', hint: posicao != null && posicao > 0 ? `${posicao}º` : '—', onClick: () => irPara('classificacao') },
                { label: 'Calendário', hint: '38 jogos Sub23', onClick: () => irPara('calendario') },
                { label: 'Notícias', hint: String(noticiasS23.length || noticias.length), onClick: () => irPara('noticias') },
                { label: 'Táticas', hint: 'Somente leitura (IA)', onClick: () => irPara('tatica') },
                { label: 'Treinos', hint: 'Somente leitura (IA)', onClick: () => irPara('treinos') },
                { label: 'Transferências', hint: 'Somente leitura', onClick: () => irPara('transferencias') },
                { label: 'Finanças', hint: 'Somente leitura', onClick: () => irPara('financas') },
              ]
            : [
                { label: 'Elenco', hint: 'Plantel completo', onClick: () => irPara('elenco') },
                { label: 'Treinos', hint: 'Microciclos', onClick: () => irPara('treinos') },
                { label: 'Notícias', hint: String(noticias.length), onClick: () => irPara('noticias') },
                { label: 'Classificação', hint: posicao != null ? `${posicao}º` : '—', onClick: () => irPara('classificacao') },
                { label: 'Calendário', hint: '38 jogos', onClick: () => irPara('calendario') },
                { label: 'Transferências', hint: 'Mercado', onClick: () => irPara('transferencias') },
                { label: 'Staff', hint: 'Equipe · renovações', onClick: () => irPara('staff') },
                { label: 'Base', hint: 'Sub-20 / CT', onClick: () => irPara('base') },
                { label: 'Sub23', hint: nomeCompS23, onClick: entrarModoSub23 },
                { label: 'Finanças', hint: 'Receitas', onClick: () => irPara('financas') },
                { label: 'Táticas', hint: esquema, onClick: () => irPara('tatica') },
                ...(proxPro
                  ? [
                      {
                        label: 'Relatório pré-jogo',
                        hint: adversario?.nome ?? 'Adversário',
                        onClick: () => irPara('relatorio_pre_jogo'),
                      },
                    ]
                  : []),
              ]
        }
      />

      {noticiaDestaque && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-medium text-emerald-400">Última notícia</h2>
          <CmPanel>
            <p className="text-sm font-medium text-zinc-200">{noticiaDestaque.titulo}</p>
            <p className="mt-2 text-sm text-zinc-400">{noticiaDestaque.texto}</p>
          </CmPanel>
        </>
      )}
    </CmCareerShell>
  );
}
