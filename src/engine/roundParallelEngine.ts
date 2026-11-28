import { db } from '../db/database';
import type { JogoCalendario, Jogador, LinhaTabela, Time } from '../types/schema';
import { attr20ParaPct } from '../utils/attributeScale20';
import {
  analisarEcossistemaTaticoConfronto,
  sortearEsquemaTreinadorCPU,
} from './unifiedEcosystemEngine';
import {
  calcularValorMercadoComBonusRankings,
  criarEstatisticaJogadorVazia,
  type EstatisticasTemporadaJogador,
} from './playerRankingsAndValuation';

export interface ResultadoJogoDetalhadoEcossistema {
  jogoId: number;
  mandanteId: string;
  visitanteId: string;
  golsMandante: number;
  golsVisitante: number;
  xgMandante: number;
  xgVisitante: number;
  xgotMandante: number;
  xgotVisitante: number;
  posseMandantePct: number;
  eventosIndividuais: Array<{
    jogadorId: number;
    timeId: string;
    minutos: number;
    notaSofascore: number;
    gols: number;
    xgMarcados: number;
    assistencias: number;
    xaAssistido: number;
    distanciaKm: number;
    sprints: number;
    velMaxKmh: number;
    golsPenalti: number;
    golsFalta: number;
    finalizacoes: number;
    finalizacoesNoGol: number;
    grandesChancesPerdidas: number;
    grandesChancesCriadas: number;
    passesCertos: number;
    passesDecisivos: number;
    bolasLongasCertas: number;
    driblesCertos: number;
    penaltisSofridos: number;
    desarmes: number;
    interceptacoes: number;
    cortes: number;
    perdaPosse: number;
    amarelo: boolean;
    vermelho: boolean;
    defesasGoleiro: number;
    xgotSofridoGoleiro: number;
    golsSofridosGoleiro: number;
  }>;
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sortearPonderado<T>(itens: T[], pesos: number[]): T {
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (soma <= 0) return itens[0];
  let r = Math.random() * soma;
  for (let i = 0; i < itens.length; i++) {
    r -= pesos[i];
    if (r <= 0) return itens[i];
  }
  return itens[itens.length - 1];
}

export function simularPartidaCompletaEcossistema(params: {
  jogo: JogoCalendario;
  mandante: Time;
  visitante: Time;
  elencoMandante: Jogador[];
  elencoVisitante: Jogador[];
}): ResultadoJogoDetalhadoEcossistema {
  const { jogo, mandante, visitante, elencoMandante, elencoVisitante } = params;

  const esquemaMand = sortearEsquemaTreinadorCPU(mandante.esquema_tatico_padrao || '4-3-3');
  const esquemaVis = sortearEsquemaTreinadorCPU(visitante.esquema_tatico_padrao || '4-3-3');

  const selecionar11 = (elenco: Jogador[], esquema: string): Jogador[] => {
    const tit = elenco.filter((j) => j.status_escalacao === 'TITULAR').slice(0, 11);
    const base = tit.length === 11 ? tit : [...elenco].sort((a, b) => b.overall - a.overall).slice(0, 11);
    if (esquema === '2-4-4') {
      return base.map((j, idx) => (idx === 3 || idx === 4 ? { ...j, posicao: 'ATA' } : j));
    }
    if (esquema === '4-2-4') {
      return base.map((j, idx) => (idx === 6 ? { ...j, posicao: 'ATA' } : j));
    }
    return base;
  };

  const titMand = selecionar11(elencoMandante, esquemaMand);
  const titVis = selecionar11(elencoVisitante, esquemaVis);

  const ecoMand = analisarEcossistemaTaticoConfronto({
    titularesProprios: titMand,
    titularesAdversario: titVis,
  });

  const ecoVis = analisarEcossistemaTaticoConfronto({
    titularesProprios: titVis,
    titularesAdversario: titMand,
  });

  const mediaForca = (lista: Jogador[]) =>
    lista.reduce((s, j) => s + j.overall, 0) / Math.max(1, lista.length);

  const forcaMand = mediaForca(titMand) + 2.5;
  const forcaVis = mediaForca(titVis);

  const posseBrutaMand =
    50 +
    (forcaMand - forcaVis) * 1.15 +
    (ecoMand.multiplicadorPosse - ecoVis.multiplicadorPosse) * 28 +
    randFloat(-4, 4);
  const posseMandantePct = Math.round(Math.max(30, Math.min(70, posseBrutaMand)));
  const posseVisitantePct = 100 - posseMandantePct;

  const finMand = Math.max(
    4,
    Math.round((11.5 + (forcaMand - forcaVis) * 0.45) * ecoMand.multiplicadorGolsPro * ecoVis.multiplicadorGolsSofridos)
  );
  const finVis = Math.max(
    4,
    Math.round((10.5 + (forcaVis - forcaMand) * 0.45) * ecoVis.multiplicadorGolsPro * ecoMand.multiplicadorGolsSofridos)
  );

  const resolverChutesTime = (
    titulares: Jogador[],
    rivalTitulares: Jogador[],
    qtdChutes: number,
    possePct: number,
    multSprints: number,
    timeId: string
  ) => {
    const goleiroRival = rivalTitulares.find((j) => j.posicao === 'GOL') || rivalTitulares[0];
    const fatorDefGoleiro = attr20ParaPct(goleiroRival?.atributos.defesa ?? 15) / 80;

    let golsTime = 0, xgTotal = 0, xgotTotal = 0, xgotSofridoRival = 0, defesasGoleiroRival = 0;
    const statsPorJogador = new Map<number, ResultadoJogoDetalhadoEcossistema['eventosIndividuais'][number]>();

    for (const j of titulares) {
      const ehGol = j.posicao === 'GOL';
      const velPct = attr20ParaPct(j.atributos.velocidade);
      const pasPct = attr20ParaPct(j.atributos.passe);
      const defPct = attr20ParaPct(j.atributos.defesa);

      const fatorPosDist =
        ehGol ? 0.38 : j.posicao === 'VOL' || j.posicao === 'MEI' ? 1.08 : j.posicao === 'LAT' ? 1.05 : 0.94;
      const distanciaKm = Number(
        ((ehGol ? 4.4 : 10.4) * fatorPosDist * (0.92 + velPct / 900) * (possePct < 45 ? 1.04 : 0.99) * randFloat(0.94, 1.06)).toFixed(2)
      );
      const sprints = ehGol
        ? randInt(0, 2)
        : Math.max(4, Math.round((13 + (velPct - 65) * 0.42) * multSprints * (j.posicao === 'LAT' || j.posicao === 'ATA' ? 1.24 : 0.88) * randFloat(0.85, 1.15)));
      const velMaxKmh = Number((27.5 + (velPct / 100) * 8.6 + randFloat(-0.6, 0.8)).toFixed(1));
      const passesBase = ehGol
        ? randInt(16, 28)
        : Math.round((38 * (possePct / 50)) * (j.posicao === 'ZAG' || j.posicao === 'VOL' || j.posicao === 'MEI' ? 1.22 : 0.78) * (0.85 + pasPct / 400) * randFloat(0.85, 1.15));

      statsPorJogador.set(j.id, {
        jogadorId: j.id,
        timeId,
        minutos: 90,
        notaSofascore: 6.55,
        gols: 0,
        xgMarcados: 0,
        assistencias: 0,
        xaAssistido: 0,
        distanciaKm,
        sprints,
        velMaxKmh,
        golsPenalti: 0,
        golsFalta: 0,
        finalizacoes: 0,
        finalizacoesNoGol: 0,
        grandesChancesPerdidas: 0,
        grandesChancesCriadas: 0,
        passesCertos: passesBase,
        passesDecisivos: 0,
        bolasLongasCertas: Math.max(0, Math.round((pasPct / 30) * randFloat(0.3, 1.4))),
        driblesCertos: ehGol ? 0 : Math.max(0, Math.round(((velPct + pasPct - 110) / 26) * randFloat(0.4, 1.6))),
        penaltisSofridos: 0,
        desarmes: ehGol ? 0 : Math.max(0, Math.round((defPct / 36) * randFloat(0.5, 1.5))),
        interceptacoes: ehGol ? 0 : Math.max(0, Math.round(((defPct + pasPct) / 85) * randFloat(0.4, 1.5))),
        cortes: ehGol ? randInt(0, 2) : Math.max(0, Math.round((defPct / 28) * (j.posicao === 'ZAG' ? 2.0 : 0.7) * randFloat(0.5, 1.5))),
        perdaPosse: ehGol ? randInt(2, 6) : Math.max(3, Math.round((13 - pasPct / 12) * randFloat(0.7, 1.3))),
        amarelo: Math.random() < (j.posicao === 'VOL' || j.posicao === 'ZAG' ? 0.16 : 0.08),
        vermelho: Math.random() < 0.008,
        defesasGoleiro: 0,
        xgotSofridoGoleiro: 0,
        golsSofridosGoleiro: 0,
      });
    }

    const linhas = titulares.filter((j) => j.posicao !== 'GOL');
    const pesosChute = linhas.map((j) =>
      Math.pow(attr20ParaPct(j.atributos.chute) / 50, 2.4) *
      (j.posicao === 'ATA' ? 2.8 : j.posicao === 'MEI' ? 1.7 : j.posicao === 'VOL' ? 0.7 : 0.45)
    );
    const pesosPasse = linhas.map((j) =>
      Math.pow(attr20ParaPct(j.atributos.passe) / 50, 2.3) *
      (j.posicao === 'MEI' ? 2.6 : j.posicao === 'LAT' ? 1.5 : j.posicao === 'VOL' ? 1.3 : 0.8)
    );

    for (let c = 0; c < qtdChutes; c++) {
      const finalizador = sortearPonderado(linhas, pesosChute);
      let criador = sortearPonderado(linhas, pesosPasse);
      if (criador.id === finalizador.id && linhas.length > 1) {
        criador = linhas[(linhas.indexOf(finalizador) + 1) % linhas.length];
      }

      const stFin = statsPorJogador.get(finalizador.id)!;
      const stCri = statsPorJogador.get(criador.id)!;
      const chutePct = attr20ParaPct(finalizador.atributos.chute);

      const ehGrandeChance = Math.random() < 0.24;
      const xg = Number((ehGrandeChance ? randFloat(0.28, 0.56) : randFloat(0.03, 0.19)).toFixed(2));

      xgTotal += xg;
      stFin.finalizacoes += 1;
      stFin.xgMarcados = Number((stFin.xgMarcados + xg).toFixed(2));
      stCri.passesDecisivos += 1;
      stCri.xaAssistido = Number((stCri.xaAssistido + xg).toFixed(2));
      if (ehGrandeChance) stCri.grandesChancesCriadas += 1;

      const foiNoAlvo = Math.random() < Math.min(0.75, 0.28 + (chutePct - 60) * 0.008 + xg * 0.4);

      if (foiNoAlvo) {
        stFin.finalizacoesNoGol += 1;
        const xgot = Number((xg * (0.85 + (chutePct / 100) * 0.55)).toFixed(2));
        xgotTotal += xgot;
        xgotSofridoRival += xgot;

        const probGol = Math.min(0.88, (xgot * 0.92) / fatorDefGoleiro);
        if (Math.random() < probGol) {
          golsTime += 1;
          stFin.gols += 1;
          stCri.assistencias += 1;
        } else {
          defesasGoleiroRival += 1;
          if (ehGrandeChance) stFin.grandesChancesPerdidas += 1;
        }
      } else if (ehGrandeChance) {
        stFin.grandesChancesPerdidas += 1;
      }
    }

    for (const st of statsPorJogador.values()) {
      let nota = 6.50 + st.gols * 0.85 + st.assistencias * 0.55 + st.passesDecisivos * 0.16;
      nota += st.grandesChancesCriadas * 0.22 + st.driblesCertos * 0.07;
      nota += (st.desarmes + st.interceptacoes) * 0.08 + st.cortes * 0.04;
      nota -= st.grandesChancesPerdidas * 0.28 + (st.amarelo ? 0.25 : 0) + (st.vermelho ? 1.25 : 0);
      st.notaSofascore = Number(Math.max(5.2, Math.min(9.9, nota)).toFixed(2));
    }

    return {
      golsTime,
      xgTotal: Number(xgTotal.toFixed(2)),
      xgotTotal: Number(xgotTotal.toFixed(2)),
      xgotSofridoRival: Number(xgotSofridoRival.toFixed(2)),
      defesasGoleiroRival,
      goleiroRivalId: goleiroRival?.id,
      statsPorJogador,
    };
  };

  const resMand = resolverChutesTime(titMand, titVis, finMand, posseMandantePct, ecoMand.multiplicadorSprintsProprios, mandante.id);
  const resVis = resolverChutesTime(titVis, titMand, finVis, posseVisitantePct, ecoVis.multiplicadorSprintsProprios, visitante.id);

  if (resVis.goleiroRivalId && resMand.statsPorJogador.has(resVis.goleiroRivalId)) {
    const stGolMand = resMand.statsPorJogador.get(resVis.goleiroRivalId)!;
    stGolMand.defesasGoleiro = resVis.defesasGoleiroRival;
    stGolMand.xgotSofridoGoleiro = resVis.xgotSofridoRival;
    stGolMand.golsSofridosGoleiro = resVis.golsTime;
  }

  if (resMand.goleiroRivalId && resVis.statsPorJogador.has(resMand.goleiroRivalId)) {
    const stGolVis = resVis.statsPorJogador.get(resMand.goleiroRivalId)!;
    stGolVis.defesasGoleiro = resMand.defesasGoleiroRival;
    stGolVis.xgotSofridoGoleiro = resMand.xgotSofridoRival;
    stGolVis.golsSofridosGoleiro = resMand.golsTime;
  }

  return {
    jogoId: jogo.id!,
    mandanteId: mandante.id,
    visitanteId: visitante.id,
    golsMandante: resMand.golsTime,
    golsVisitante: resVis.golsTime,
    xgMandante: resMand.xgTotal,
    xgVisitante: resVis.xgTotal,
    xgotMandante: resMand.xgotTotal,
    xgotVisitante: resVis.xgotTotal,
    posseMandantePct,
    eventosIndividuais: [
      ...Array.from(resMand.statsPorJogador.values()),
      ...Array.from(resVis.statsPorJogador.values()),
    ],
  };
}

export async function simularJogosParalelosDaData(params: {
  dataAtualISO: string;
  timeUsuarioId: string;
  rodadaAtual: number;
  estatisticasJogadoresAtuais: Map<number, EstatisticasTemporadaJogador>;
}): Promise<Map<number, EstatisticasTemporadaJogador>> {
  const { dataAtualISO, timeUsuarioId, rodadaAtual, estatisticasJogadoresAtuais } = params;

  const jogosDoDia = (await db.calendario.toArray()).filter(
    (j: any) =>
      !j.finalizado &&
      j.data_iso === dataAtualISO &&
      j.mandante_id !== timeUsuarioId &&
      j.visitante_id !== timeUsuarioId
  );

  if (jogosDoDia.length === 0) return estatisticasJogadoresAtuais;

  const times = await db.times.toArray();
  const jogadores = await db.jogadores.toArray();
  const tabela = await db.tabela.toArray();

  const mapaTimes = new Map<string, Time>();
  times.forEach((t) => mapaTimes.set(t.id, t));

  const mapaTabela = new Map<string, LinhaTabela>();
  tabela.forEach((l) => mapaTabela.set(l.time_id, { ...l }));

  const jogosAtualizados: JogoCalendario[] = [];

  for (const jogo of jogosDoDia) {
    const mand = mapaTimes.get(jogo.mandante_id);
    const vis = mapaTimes.get(jogo.visitante_id);
    if (!mand || !vis) continue;

    const res = simularPartidaCompletaEcossistema({
      jogo,
      mandante: mand,
      visitante: vis,
      elencoMandante: jogadores.filter((j) => j.time_id === mand.id),
      elencoVisitante: jogadores.filter((j) => j.time_id === vis.id),
    });

    jogosAtualizados.push({
      ...jogo,
      gols_mandante: res.golsMandante,
      gols_visitante: res.golsVisitante,
      finalizado: true,
    });

    const lMand = mapaTabela.get(mand.id);
    const lVis = mapaTabela.get(vis.id);
    if (lMand && lVis) {
      lMand.jogos += 1;
      lVis.jogos += 1;
      lMand.gols_pro += res.golsMandante;
      lMand.gols_contra += res.golsVisitante;
      lVis.gols_pro += res.golsVisitante;
      lVis.gols_contra += res.golsMandante;

      if (res.golsMandante > res.golsVisitante) {
        lMand.vitorias += 1;
        lMand.pontos += 3;
        lVis.derrotas += 1;
      } else if (res.golsVisitante > res.golsMandante) {
        lVis.vitorias += 1;
        lVis.pontos += 3;
        lMand.derrotas += 1;
      } else {
        lMand.empates += 1;
        lMand.pontos += 1;
        lVis.empates += 1;
        lVis.pontos += 1;
      }
      lMand.saldo_gols = lMand.gols_pro - lMand.gols_contra;
      lVis.saldo_gols = lVis.gols_pro - lVis.gols_contra;
    }

    for (const ev of res.eventosIndividuais) {
      const atual =
        estatisticasJogadoresAtuais.get(ev.jogadorId) ??
        criarEstatisticaJogadorVazia(ev.jogadorId, ev.timeId);

      atual.jogos_disputados += 1;
      atual.minutos_jogados += ev.minutos;
      atual.soma_notas_sofascore = Number((atual.soma_notas_sofascore + ev.notaSofascore).toFixed(2));
      atual.gols += ev.gols;
      atual.xg_marcados = Number((atual.xg_marcados + ev.xgMarcados).toFixed(2));
      atual.assistencias += ev.assistencias;
      atual.xa_assistido = Number((atual.xa_assistido + ev.xaAssistido).toFixed(2));
      atual.distancia_total_km = Number((atual.distancia_total_km + ev.distanciaKm).toFixed(2));
      atual.sprints_totais += ev.sprints;
      atual.velocidade_maxima_kmh = Math.max(atual.velocidade_maxima_kmh, ev.velMaxKmh);
      atual.finalizacoes += ev.finalizacoes;
      atual.finalizacoes_no_gol += ev.finalizacoesNoGol;
      atual.grandes_chances_perdidas += ev.grandesChancesPerdidas;
      atual.grandes_chances_criadas += ev.grandesChancesCriadas;
      atual.passes_certos += ev.passesCertos;
      atual.passes_decisivos += ev.passesDecisivos;
      atual.bolas_longas_certas += ev.bolasLongasCertas;
      atual.dribles_certos += ev.driblesCertos;
      atual.desarmes += ev.desarmes;
      atual.interceptacoes += ev.interceptacoes;
      atual.cortes += ev.cortes;
      atual.perda_posse_bola += ev.perdaPosse;
      atual.cartoes_amarelos += ev.amarelo ? 1 : 0;
      atual.cartoes_vermelhos += ev.vermelho ? 1 : 0;
      atual.defesas_totais += ev.defesasGoleiro;
      atual.xgot_sofrido = Number((atual.xgot_sofrido + ev.xgotSofridoGoleiro).toFixed(2));
      atual.gols_sofridos_goleiro += ev.golsSofridosGoleiro;

      estatisticasJogadoresAtuais.set(ev.jogadorId, atual);
    }
  }

  const novosValores = calcularValorMercadoComBonusRankings({
    jogadores,
    estatisticasJogadores: Array.from(estatisticasJogadoresAtuais.values()),
    rodadaAtual,
  });

  const jogadoresComNovoValor = jogadores.map((j: any) => {
    const novoValor = novosValores.get(j.id);
    if (!novoValor || novoValor === j.valor_mercado) return j;
    return {
      ...j,
      valor_mercado_base: j.valor_mercado_base ?? j.valor_mercado,
      valor_mercado: novoValor,
    };
  });

  await db.transaction('rw', [db.calendario, db.tabela, db.jogadores], async () => {
    await db.calendario.bulkPut(jogosAtualizados);
    await db.tabela.bulkPut(Array.from(mapaTabela.values()));
    await db.jogadores.bulkPut(jogadoresComNovoValor);
  });

  return estatisticasJogadoresAtuais;
}
