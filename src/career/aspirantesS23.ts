import { criarRng } from '../engine/matchEngine';
import type { EstadoAspirantesS23, AtletaSub23 } from '../types/aspirantesS23';
import { NOME_COMPETICAO_SUB23, TAMANHO_ELENCO_SUB23 } from '../types/aspirantesS23';
import type { LinhaTabela, Time } from '../types/schema';
import type { EstadoMundoClube } from '../types/mundoClube';
import {
  gerarConfrontosTurno,
  type PartidaCampeonato,
  type EstadoTemporada,
} from './brasileirao';
import type { ResultadoFormaUsuario } from './calendarioUsuario';
import {
  forcaElencoSub23,
  gerarElencoSub23Clube,
  proximoIdGlobal,
} from './sub23';
import { nivelDiretorBase } from './staffEfeitos';
import type { Jogador } from '../types/schema';
import type { NoticiaCarreira } from './types';
function linhaVazia(timeId: string): LinhaTabela {
  return {
    time_id: timeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gols_pro: 0,
    gols_contra: 0,
    saldo_gols: 0,
  };
}

function aplicarResultadoTabela(
  tabela: LinhaTabela[],
  mandanteId: string,
  visitanteId: string,
  gm: number,
  gv: number,
): LinhaTabela[] {
  return tabela.map((l) => {
    if (l.time_id !== mandanteId && l.time_id !== visitanteId) return l;
    const casa = l.time_id === mandanteId;
    const gf = casa ? gm : gv;
    const gc = casa ? gv : gm;
    const vitoria = gf > gc;
    const empate = gf === gc;
    return {
      ...l,
      jogos: l.jogos + 1,
      vitorias: l.vitorias + (vitoria ? 1 : 0),
      empates: l.empates + (empate ? 1 : 0),
      derrotas: l.derrotas + (!vitoria && !empate ? 1 : 0),
      gols_pro: l.gols_pro + gf,
      gols_contra: l.gols_contra + gc,
      saldo_gols: l.saldo_gols + (gf - gc),
      pontos: l.pontos + (vitoria ? 3 : empate ? 1 : 0),
    };
  });
}

/** Simula placar AI com base na força média do Sub-23. */
function simularPlacarS23(
  forcaM: number,
  forcaV: number,
  rnd: () => number,
): { gm: number; gv: number } {
  const diff = (forcaM - forcaV) / 40;
  const pCasa = 0.42 + diff * 0.22;
  const pEmp = 0.28;
  const roll = rnd();
  let gm: number;
  let gv: number;
  if (roll < pCasa) {
    gm = 1 + Math.floor(rnd() * 3);
    gv = Math.floor(rnd() * Math.min(2, gm));
  } else if (roll < pCasa + pEmp) {
    const n = Math.floor(rnd() * 3);
    gm = n;
    gv = n;
  } else {
    gv = 1 + Math.floor(rnd() * 3);
    gm = Math.floor(rnd() * Math.min(2, gv));
  }
  // Ruído leve
  if (rnd() < 0.12) gm += 1;
  if (rnd() < 0.1) gv += 1;
  return { gm, gv };
}

export function criarEstadoAspirantesS23(params: {
  times: Time[];
  jogadores: Jogador[];
  mundoUsuario: EstadoMundoClube | null;
  clubeUsuarioId: string | null;
  temporadaAno: number;
  seed: number;
}): EstadoAspirantesS23 {
  const ids = params.times.map((t) => t.id);
  const confrontos = gerarConfrontosTurno(ids);
  const partidas: PartidaCampeonato[] = [];
  let pid = 800_000;
  for (let r = 0; r < confrontos.length; r++) {
    const rodada = confrontos[r]!;
    for (const c of rodada) {
      partidas.push({
        id: pid++,
        rodada: r + 1,
        mandanteId: c.mandanteId,
        visitanteId: c.visitanteId,
        dataISO: `2026-${String(Math.min(12, 4 + Math.floor(r / 5))).padStart(2, '0')}-${String(1 + (r % 27)).padStart(2, '0')}`,
        finalizado: false,
        ehDoUsuario: false,
      });
    }
  }

  const elencos: Record<string, AtletaSub23[]> = {};
  let nextId = Math.max(500_000, proximoIdGlobal(params.jogadores, null));
  for (const time of params.times) {
    const qualidade =
      params.clubeUsuarioId === time.id && params.mundoUsuario ?
        params.mundoUsuario.base.qualidade
      : Math.max(8, Math.min(16, Math.round((time.prestigio ?? time.forca_geral) / 8)));
    const diretor =
      params.clubeUsuarioId === time.id ?
        nivelDiretorBase(params.mundoUsuario)
      : Math.max(8, Math.min(16, Math.round((time.prestigio ?? 70) / 7)));
    const elencoPro = params.jogadores.filter((j) => j.time_id === time.id);
    const { elenco, proximoId } = gerarElencoSub23Clube({
      time,
      qualidade,
      diretor,
      seed: params.seed ^ (time.id.charCodeAt(0) * 997 + time.id.length * 31),
      idInicio: nextId,
      rodada: 0,
      elencoPro,
    });
    elencos[time.id] = elenco;
    nextId = proximoId;
  }

  return {
    temporadaAno: params.temporadaAno,
    rodadaAtual: 1,
    partidas,
    tabela: ids.map(linhaVazia),
    elencos,
    ultimaRodadaBrSync: 0,
  };
}

export function normalizarAspirantesS23(
  estado: EstadoAspirantesS23 | null | undefined,
  times: Time[],
  jogadores: Jogador[],
  mundo: EstadoMundoClube | null,
  clubeId: string | null,
  temporadaAno: number,
): EstadoAspirantesS23 {
  if (!estado || Object.keys(estado.elencos ?? {}).length === 0) {
    return criarEstadoAspirantesS23({
      times,
      jogadores,
      mundoUsuario: mundo,
      clubeUsuarioId: clubeId,
      temporadaAno,
      seed: temporadaAno * 1009 + times.length,
    });
  }
  // Garante 22 por clube (migração / saves).
  const elencos = { ...estado.elencos };
  let nextId = proximoIdGlobal(jogadores, estado);
  for (const time of times) {
    let elenco = [...(elencos[time.id] ?? [])];
    if (elenco.length < TAMANHO_ELENCO_SUB23) {
      const qualidade = mundo && clubeId === time.id ? mundo.base.qualidade : 12;
      const diretor = mundo && clubeId === time.id ? nivelDiretorBase(mundo) : 10;
      const falta = TAMANHO_ELENCO_SUB23 - elenco.length;
      const elencoPro = jogadores.filter((j) => j.time_id === time.id);
      const gerado = gerarElencoSub23Clube({
        time,
        qualidade,
        diretor,
        seed: nextId * 13,
        idInicio: nextId,
        elencoPro,
      });
      elenco = [...elenco, ...gerado.elenco.slice(0, falta)];
      nextId = gerado.proximoId;
    }
    if (elenco.length > TAMANHO_ELENCO_SUB23) {
      elenco = elenco.slice(0, TAMANHO_ELENCO_SUB23);
    }
    elencos[time.id] = elenco;
  }
  return { ...estado, elencos };
}

/**
 * Avança rodadas do Campeonato de Aspirantes até igualar a rodada do Brasileirão.
 * 100% AI — usuário só observa.
 */
export function sincronizarAspirantesComBrasileirao(
  aspirantes: EstadoAspirantesS23,
  brasileirao: EstadoTemporada,
  seed: number,
  clubeUsuarioId?: string | null,
  nomesTimes?: Map<string, string>,
): { aspirantes: EstadoAspirantesS23; noticias: NoticiaCarreira[] } {
  const alvo = Math.min(brasileirao.rodadaAtual, 38);
  const ja = aspirantes.ultimaRodadaBrSync ?? 0;
  if (alvo <= ja) return { aspirantes, noticias: [] };

  let partidas = [...aspirantes.partidas];
  let tabela = [...aspirantes.tabela];
  let rodadaAtual = aspirantes.rodadaAtual;
  const noticias: NoticiaCarreira[] = [];
  const rnd = criarRng(seed ^ alvo ^ 0x523);

  for (let r = ja + 1; r <= alvo; r++) {
    const daRodada = partidas.filter((p) => p.rodada === r && !p.finalizado);
    for (const p of daRodada) {
      const elencoM = aspirantes.elencos[p.mandanteId] ?? [];
      const elencoV = aspirantes.elencos[p.visitanteId] ?? [];
      const { gm, gv } = simularPlacarS23(
        forcaElencoSub23(elencoM),
        forcaElencoSub23(elencoV),
        rnd,
      );
      partidas = partidas.map((x) =>
        x.id === p.id ?
          { ...x, finalizado: true, golsMandante: gm, golsVisitante: gv }
        : x,
      );
      tabela = aplicarResultadoTabela(tabela, p.mandanteId, p.visitanteId, gm, gv);
    }
    rodadaAtual = Math.min(38, r + 1);

    if (clubeUsuarioId) {
      const jogoUser = partidas.find(
        (p) =>
          p.rodada === r &&
          p.finalizado &&
          (p.mandanteId === clubeUsuarioId || p.visitanteId === clubeUsuarioId),
      );
      if (jogoUser) {
        const casa = jogoUser.mandanteId === clubeUsuarioId;
        const gf = casa ? (jogoUser.golsMandante ?? 0) : (jogoUser.golsVisitante ?? 0);
        const gc = casa ? (jogoUser.golsVisitante ?? 0) : (jogoUser.golsMandante ?? 0);
        const advId = casa ? jogoUser.visitanteId : jogoUser.mandanteId;
        const advNome = nomesTimes?.get(advId) ?? advId;
        noticias.push({
          id: `aspirantes_jogo_${r}_${clubeUsuarioId}`,
          data: new Date().toISOString(),
          titulo: `${NOME_COMPETICAO_SUB23} · rodada ${r}`,
          texto: `Sub-23 ${casa ? 'mandante' : 'visitante'} vs ${advNome}: ${gf}×${gc} (disputa controlada pela IA).`,
        });
      }
    }
  }

  if (alvo > 0 && alvo % 5 === 0) {
    const lider = [...tabela].sort(
      (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols,
    )[0];
    if (lider) {
      const nomeLider = nomesTimes?.get(lider.time_id) ?? lider.time_id;
      noticias.push({
        id: `aspirantes_lider_${alvo}`,
        data: new Date().toISOString(),
        titulo: NOME_COMPETICAO_SUB23,
        texto: `Após a rodada ${alvo}, ${nomeLider} lidera com ${lider.pontos} pts.`,
      });
    }
  }

  return {
    aspirantes: {
      ...aspirantes,
      partidas,
      tabela,
      rodadaAtual,
      ultimaRodadaBrSync: alvo,
    },
    noticias,
  };
}

export function elencoSub23DoClube(
  aspirantes: EstadoAspirantesS23 | null | undefined,
  clubeId: string,
): AtletaSub23[] {
  return aspirantes?.elencos[clubeId] ?? [];
}

export function posicaoTabelaAspirantes(
  tabela: LinhaTabela[],
  clubeId: string,
): number {
  const ordenada = [...tabela].sort(
    (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols || b.gols_pro - a.gols_pro,
  );
  const idx = ordenada.findIndex((l) => l.time_id === clubeId);
  return idx >= 0 ? idx + 1 : 0;
}

export function proximaPartidaAspirantes(
  aspirantes: EstadoAspirantesS23,
  clubeId: string,
): PartidaCampeonato | null {
  return (
    aspirantes.partidas.find(
      (p) =>
        !p.finalizado && (p.mandanteId === clubeId || p.visitanteId === clubeId),
    ) ?? null
  );
}

/** Jogos do clube no calendário Sub-23 (espelho do Brasileirão). */
export function partidasClubeAspirantes(
  aspirantes: EstadoAspirantesS23,
  clubeId: string,
): PartidaCampeonato[] {
  return aspirantes.partidas
    .filter((p) => p.mandanteId === clubeId || p.visitanteId === clubeId)
    .sort((a, b) => a.rodada - b.rodada);
}

/** Forma recente do Sub-23 (últimos jogos finalizados do clube). */
export function montarFormaSub23(
  aspirantes: EstadoAspirantesS23,
  clubeId: string,
  nomeAdversario: (id: string) => string,
  limite = 5,
): ResultadoFormaUsuario[] {
  return aspirantes.partidas
    .filter(
      (p) =>
        p.finalizado && (p.mandanteId === clubeId || p.visitanteId === clubeId),
    )
    .sort((a, b) => b.dataISO.localeCompare(a.dataISO) || b.rodada - a.rodada)
    .slice(0, limite)
    .map((p) => {
      const emCasa = p.mandanteId === clubeId;
      const gm = p.golsMandante ?? 0;
      const gv = p.golsVisitante ?? 0;
      const gp = emCasa ? gm : gv;
      const gc = emCasa ? gv : gm;
      const adv = emCasa ? p.visitanteId : p.mandanteId;
      let sigla: 'V' | 'E' | 'D' = 'E';
      if (gp > gc) sigla = 'V';
      else if (gp < gc) sigla = 'D';
      return {
        sigla,
        placar: `${gp}×${gc}`,
        adversarioNome: nomeAdversario(adv),
        emCasa,
        dataISO: p.dataISO,
      };
    });
}
