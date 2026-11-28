import { db } from '../db/database';
import type { JogoCalendario, LinhaTabela, Time } from '../types/schema';

export interface JogoCalendarioComData extends JogoCalendario {
  temporada: number;
  data_iso: string;
  dia_semana_nome: string;
}

const NOMES_DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

function criarDataUTC(ano: number, mes1a12: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes1a12 - 1, dia));
}

function formatarISO(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

function somarDias(dt: Date, dias: number): Date {
  const copia = new Date(dt.getTime());
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
}

function diferencaDiasCorridos(isoA: string, isoB: string): number {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round(Math.abs(b - a) / 86_400_000);
}

export function obterDomingoUltimaSemanaJaneiro(ano: number): Date {
  const dia31Jan = criarDataUTC(ano, 1, 31);
  return somarDias(dia31Jan, -dia31Jan.getUTCDay());
}

export function obterDomingoPrimeiraSemanaDezembro(ano: number): Date {
  const dia1Dez = criarDataUTC(ano, 12, 1);
  const diaSemana = dia1Dez.getUTCDay();
  return somarDias(dia1Dez, diaSemana === 0 ? 0 : 7 - diaSemana);
}

interface JanelaRodada {
  rodada: number;
  tipo: 'FIM_DE_SEMANA' | 'MEIO_DE_SEMANA' | 'RODADA_FINAL';
  datasCandidatasISO: string[];
}

export function gerarJanelasDatasBrasileirao(ano: number): JanelaRodada[] {
  const domAbertura = obterDomingoUltimaSemanaJaneiro(ano);
  const domEncerramento = obterDomingoPrimeiraSemanaDezembro(ano);

  const todosDomingos: Date[] = [];
  let cursor = new Date(domAbertura.getTime());
  while (cursor.getTime() <= domEncerramento.getTime()) {
    todosDomingos.push(new Date(cursor.getTime()));
    cursor = somarDias(cursor, 7);
  }

  const totalFdsDesejado = 32;
  const indicesFds = new Set<number>([0, todosDomingos.length - 1]);
  const passo = (todosDomingos.length - 1) / (totalFdsDesejado - 1);
  for (let i = 1; i < totalFdsDesejado - 1; i++) {
    indicesFds.add(Math.round(i * passo));
  }
  let candidato = 1;
  while (indicesFds.size < totalFdsDesejado && candidato < todosDomingos.length - 1) {
    indicesFds.add(candidato++);
  }

  const domingosEscolhidos = Array.from(indicesFds)
    .sort((a, b) => a - b)
    .map((idx) => todosDomingos[idx]);

  const semanasComMeioDeSemana = new Set<number>([4, 9, 14, 19, 24, 28]);
  const janelas: JanelaRodada[] = [];
  let numeroRodada = 1;

  for (let i = 0; i < domingosEscolhidos.length; i++) {
    const dom = domingosEscolhidos[i];
    const sab = somarDias(dom, -1);
    const ehUltimaRodada = i === domingosEscolhidos.length - 1;

    if (ehUltimaRodada) {
      janelas.push({
        rodada: numeroRodada++,
        tipo: 'RODADA_FINAL',
        datasCandidatasISO: [formatarISO(dom)],
      });
    } else {
      janelas.push({
        rodada: numeroRodada++,
        tipo: 'FIM_DE_SEMANA',
        datasCandidatasISO: [formatarISO(sab), formatarISO(dom)],
      });
    }

    if (semanasComMeioDeSemana.has(i) && numeroRodada <= 37) {
      janelas.push({
        rodada: numeroRodada++,
        tipo: 'MEIO_DE_SEMANA',
        datasCandidatasISO: [
          formatarISO(somarDias(dom, 2)),
          formatarISO(somarDias(dom, 3)),
          formatarISO(somarDias(dom, 4)),
        ],
      });
    }
  }

  return janelas.slice(0, 38);
}

export function gerarCalendarioCompletoTemporada(
  ano: number,
  times: Time[],
  idInicial = 1
): JogoCalendarioComData[] {
  const lista = [...times].sort(() => Math.random() - 0.5);
  const n = lista.length;
  const rodadasConfrontos: Array<Array<{ mandante: string; visitante: string }>> = [];

  const fixo = lista[0];
  const rotativos = lista.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const jogosRodada: Array<{ mandante: string; visitante: string }> = [];
    const rivalFixo = rotativos[r % rotativos.length];
    jogosRodada.push(
      r % 2 === 0
        ? { mandante: fixo.id, visitante: rivalFixo.id }
        : { mandante: rivalFixo.id, visitante: fixo.id }
    );

    for (let i = 1; i < n / 2; i++) {
      const timeA = rotativos[(r + i) % rotativos.length];
      const timeB = rotativos[(r + rotativos.length - i) % rotativos.length];
      jogosRodada.push(
        i % 2 === 0
          ? { mandante: timeA.id, visitante: timeB.id }
          : { mandante: timeB.id, visitante: timeA.id }
      );
    }
    rodadasConfrontos.push(jogosRodada);
  }

  for (let r = 0; r < n - 1; r++) {
    rodadasConfrontos.push(
      rodadasConfrontos[r].map((j) => ({ mandante: j.visitante, visitante: j.mandante }))
    );
  }

  const janelas = gerarJanelasDatasBrasileirao(ano);
  const ultimoJogoPorClube = new Map<string, string>();
  const calendarioFinal: JogoCalendarioComData[] = [];
  let seqId = idInicial;

  for (let idx = 0; idx < 38; idx++) {
    const janela = janelas[idx];
    const jogosDaRodada = rodadasConfrontos[idx];

    jogosDaRodada.forEach((confronto, posJogo) => {
      let dataEscolhida = janela.datasCandidatasISO[janela.datasCandidatasISO.length - 1];

      for (const dataCand of janela.datasCandidatasISO) {
        const ultMand = ultimoJogoPorClube.get(confronto.mandante);
        const ultVis = ultimoJogoPorClube.get(confronto.visitante);
        const okMand = !ultMand || diferencaDiasCorridos(ultMand, dataCand) >= 3;
        const okVis = !ultVis || diferencaDiasCorridos(ultVis, dataCand) >= 3;

        if (okMand && okVis) {
          dataEscolhida = dataCand;
          if (posJogo < 4) break;
        }
      }

      ultimoJogoPorClube.set(confronto.mandante, dataEscolhida);
      ultimoJogoPorClube.set(confronto.visitante, dataEscolhida);

      const dtObj = new Date(`${dataEscolhida}T12:00:00Z`);
      calendarioFinal.push({
        id: seqId++,
        temporada: ano,
        rodada: janela.rodada,
        mandante_id: confronto.mandante,
        visitante_id: confronto.visitante,
        gols_mandante: null,
        gols_visitante: null,
        finalizado: false,
        data_iso: dataEscolhida,
        dia_semana_nome: NOMES_DIAS_SEMANA[dtObj.getUTCDay()],
      });
    });
  }

  return calendarioFinal;
}

export async function verificarEIniciarNovaTemporada(dataAtualISO: string): Promise<boolean> {
  const anoAtualSave = Number(dataAtualISO.slice(0, 4));
  const jogosExistentes = await db.calendario.toArray();

  const jaTemJogosDoAno = jogosExistentes.some((j: any) =>
    String(j.data_iso || '').startsWith(`${anoAtualSave}-`)
  );
  if (jaTemJogosDoAno) return false;

  const todosFinalizados =
    jogosExistentes.length > 0 && jogosExistentes.every((j) => j.finalizado);
  if (!todosFinalizados) return false;

  await db.transaction(
    'rw',
    [db.times, db.tabela, db.calendario, db.jogadores, db.meta],
    async () => {
      const times = await db.times.toArray();
      const jogadores = await db.jogadores.toArray();

      const jogadoresNovaTemporada = jogadores.map((j) => ({
        ...j,
        idade: j.idade + 1,
        energia: 100,
      }));
      await db.jogadores.bulkPut(jogadoresNovaTemporada);

      const novaTabela: LinhaTabela[] = times.map((t) => ({
        time_id: t.id,
        pontos: 0,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        gols_pro: 0,
        gols_contra: 0,
        saldo_gols: 0,
      }));
      await db.tabela.clear();
      await db.tabela.bulkPut(novaTabela);

      const novoCalendario = gerarCalendarioCompletoTemporada(anoAtualSave, times, 1);
      await db.calendario.clear();
      await db.calendario.bulkPut(novoCalendario);

      const meta = await db.meta.get('ativo');
      if (meta) {
        await db.meta.put({ ...meta, rodada_atual: 1 });
      }
    }
  );

  return true;
}
