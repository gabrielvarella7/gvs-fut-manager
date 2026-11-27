import { sortearNomesAmadores } from '../data/clubesAmadores';
import { embaralharNomesVarzea } from '../data/jogadoresVarzea';
import { LISTA_ESQUEMAS } from '../data/esquemasTaticos';
import { gerarAtributosNovos, overallDeAtributos } from './atributosJogador';
import { gerarGeneticaAtleta } from './genetica';
import { SLOTS_PLANTEL_30, statusEscalacaoPorSlot } from './plantelEstrutura';
import type { Jogador } from '../types/schema';
import type { TimeFicticio, JogoTorneio, DesempenhoTorneio } from './types';
import { criarRng } from '../engine/matchEngine';

/** IDs do torneio amador (evitam colisão com partidas do Brasileirão, que começam em 1). */
export const ID_TORNEIO_AMADOR_BASE = 9000;

export function idPartidaTorneio(rodada: 1 | 2 | 3): number {
  return ID_TORNEIO_AMADOR_BASE + rodada;
}

/** Saves antigos usavam id 1–3; migra sem perder placares. */
export function migrarIdsTorneioAmador(jogos: JogoTorneio[]): JogoTorneio[] {
  if (jogos.length === 0) return jogos;
  const maxId = Math.max(...jogos.map((j) => j.id));
  if (maxId >= ID_TORNEIO_AMADOR_BASE) return jogos;
  return jogos.map((j) => ({ ...j, id: idPartidaTorneio(j.rodada) }));
}

export function proximoJogoTorneioAmador(jogos: JogoTorneio[]): JogoTorneio | null {
  return (
    [...jogos]
      .filter((j) => j.ehDoUsuario && !j.finalizado)
      .sort((a, b) => a.rodada - b.rodada)[0] ?? null
  );
}

/** 11 titulares + 11 reservas + 8 fora da lista (= 30). */
const SQUAD = SLOTS_PLANTEL_30;

export function gerarTimesFicticios(seed: number, qtd = 8): TimeFicticio[] {
  const rnd = criarRng(seed);
  const nomes = sortearNomesAmadores(seed, qtd);
  const nomesJogadores = embaralharNomesVarzea(seed ^ 0x9e3779b9);
  let indiceNome = 0;
  const proximoNome = () => {
    const nome = nomesJogadores[indiceNome % nomesJogadores.length];
    indiceNome += 1;
    return nome;
  };
  const times: TimeFicticio[] = [];

  for (let i = 0; i < qtd; i++) {
    const nome = nomes[i] ?? `Clube Amador ${i + 1}`;
    const forca = 58 + Math.floor(rnd() * 14);
    const id = `FIC_${String(i + 1).padStart(2, '0')}`;
    const jogadores: Jogador[] = [];
    let pid = 5000 + i * 100;

    SQUAD.forEach((pos, idx) => {
      pid += 1;
      const base = forca + (rnd() - 0.5) * 16;
      const idade = 20 + Math.floor(rnd() * 12);
      const atributos = gerarAtributosNovos(pos, base, pid, idade, rnd);
      const overall = overallDeAtributos(pos, atributos);
      jogadores.push({
        id: pid,
        time_id: id,
        nome: proximoNome(),
        idade,
        posicao: pos,
        atributos,
        overall,
        energia: 100,
        status_escalacao: statusEscalacaoPorSlot(idx),
        valor_mercado: overall * overall * 800,
        salario_mensal: Math.round(overall * 450 + rnd() * 2000),
        nacionalidade: 'Brasil',
        genetica: gerarGeneticaAtleta({ id: pid, idade, overall, rnd }),
      });
    });

    times.push({
      id,
      nome,
      forca,
      esquema: LISTA_ESQUEMAS[Math.floor(rnd() * LISTA_ESQUEMAS.length)],
      jogadores,
    });
  }

  return times;
}

export function montarCalendarioUsuario(
  timeUsuarioId: string,
  adversarios: string[],
  seed?: number,
): JogoTorneio[] {
  const lista = adversarios.filter((id) => id !== timeUsuarioId);
  const rnd = criarRng(seed ?? Date.now());
  const embaralhados = [...lista];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }
  const oponentes = embaralhados.slice(0, 3);
  return oponentes.map((visitanteId, i) => ({
    id: idPartidaTorneio((i + 1) as 1 | 2 | 3),
    rodada: (i + 1) as 1 | 2 | 3,
    mandanteId: timeUsuarioId,
    visitanteId,
    finalizado: false,
    ehDoUsuario: true,
  }));
}

export function calcularDesempenho(jogos: JogoTorneio[], timeUsuarioId: string): DesempenhoTorneio {
  let pontos = 0;
  let vitorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golsPro = 0;
  let golsContra = 0;

  for (const j of jogos.filter((x) => x.finalizado && x.ehDoUsuario)) {
    const casa = j.mandanteId === timeUsuarioId;
    const gp = casa ? (j.golsMandante ?? 0) : (j.golsVisitante ?? 0);
    const gc = casa ? (j.golsVisitante ?? 0) : (j.golsMandante ?? 0);
    golsPro += gp;
    golsContra += gc;
    if (gp > gc) {
      vitorias += 1;
      pontos += 3;
    } else if (gp === gc) {
      empates += 1;
      pontos += 1;
    } else {
      derrotas += 1;
    }
  }

  const nota =
    pontos * 2 + vitorias * 1.5 + (golsPro - golsContra) * 0.4 + (empates > 0 ? 0.5 : 0);

  return { pontos, vitorias, empates, derrotas, golsPro, golsContra, nota };
}

export function gerarPropostas(
  desempenho: DesempenhoTorneio,
  timesReais: { id: string; nome: string; forca_geral: number }[],
): import('./types').PropostaClube[] {
  const ordenados = [...timesReais].sort((a, b) => b.forca_geral - a.forca_geral);
  const maxNota = 12;
  const ratio = Math.min(1, desempenho.nota / maxNota);

  let inicio = Math.floor((1 - ratio) * (ordenados.length - 4));
  inicio = Math.max(0, Math.min(inicio, ordenados.length - 3));
  const faixa = ordenados.slice(inicio, inicio + 4);

  return faixa.map((t) => ({
    timeId: t.id,
    timeNome: t.nome,
    forca: t.forca_geral,
    mensagem:
      desempenho.vitorias >= 2
        ? `Diretoria do ${t.nome} impressionada com seu torneio. Proposta de contrato.`
        : desempenho.empates >= 2
          ? `O ${t.nome} vê potencial e oferece chance no elenco.`
          : `O ${t.nome} busca técnico para projeto de médio prazo.`,
  }));
}

/** Propostas só dos clubes mais fracos — carreira sem torneio inicial. */
export function gerarPropostasPioresTimes(
  timesReais: { id: string; nome: string; forca_geral: number }[],
  quantidade = 4,
): import('./types').PropostaClube[] {
  const piores = [...timesReais].sort((a, b) => a.forca_geral - b.forca_geral).slice(0, quantidade);
  return piores.map((t) => ({
    timeId: t.id,
    timeNome: t.nome,
    forca: t.forca_geral,
    mensagem: `O ${t.nome} (um dos clubes mais modestos da Série A) oferece chance a um técnico iniciante sem passar pelo torneio amador.`,
  }));
}

export function getTimeFicticio(
  times: TimeFicticio[],
  id: string,
): TimeFicticio | undefined {
  return times.find((t) => t.id === id);
}
