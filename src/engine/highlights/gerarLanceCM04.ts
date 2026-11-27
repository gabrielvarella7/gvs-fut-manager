/**
 * CM 03/04 discrete-tick highlight sim.
 * Port of Gabriel’s esse_d627.ts (truncated reference completed for POS_CHUTE /
 * frame snapshot / return). Adapted to HighlightRoster + SimulationFrame.
 */
import type { Posicao } from '../../types/schema';
import type {
  HighlightClip,
  HighlightEntity,
  HighlightEventType,
  HighlightLanceMeta,
  HighlightRoster,
  HighlightRosterPlayer,
  SimulationFrame,
} from './types';

export type TipoDesfechoLance =
  | 'GOL'
  | 'DEFESA_DIFICIL'
  | 'TRAVE'
  | 'CHUTE_FORA'
  | 'CONTRA_ATAQUE_GOL';

export type FaseOrganica =
  | 'CONSTRUCAO'
  | 'PROGRESSAO'
  | 'ULTIMO_TERCO'
  | 'FINALIZACAO'
  | 'ENCERRAMENTO';

export interface Ponto2D {
  x: number;
  y: number;
}

export interface FrameJogador {
  id: number;
  numero: number;
  nomeCurto: string;
  time: 'MANDANTE' | 'VISITANTE';
  x: number;
  y: number;
  temBola: boolean;
}

export interface FrameBola {
  x: number;
  y: number;
  z: number;
  estado: 'CONDUCAO' | 'PASSE' | 'CHUTE' | 'DEFESA' | 'GOL';
}

export interface KeyframeLance {
  tempoSegundos: number;
  bola: FrameBola;
  jogadores: FrameJogador[];
  narracaoInstantanea?: string;
  faseOrganica: FaseOrganica;
}

export interface LanceHighlightCompleto {
  id: string;
  minutoCongelado: number;
  segundoTempo: boolean;
  timeAtacante: 'MANDANTE' | 'VISITANTE';
  desfecho: TipoDesfechoLance;
  duracaoTotalSegundos: number;
  frames: KeyframeLance[];
  autorId?: number;
  assistenteId?: number;
}

interface AgenteSimulacao {
  id: number;
  numero: number;
  nomeCurto: string;
  time: 'MANDANTE' | 'VISITANTE';
  posicao: Posicao;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  atributos: {
    velocidade: number;
    passe: number;
    chute: number;
    defesa: number;
  };
}

/** Tactical slots: attacking left→right. Mirror for the other side. */
const SLOTS_TATICOS: Record<Posicao, Ponto2D[]> = {
  GOL: [{ x: 4, y: 50 }],
  ZAG: [
    { x: 20, y: 34 },
    { x: 20, y: 66 },
    { x: 18, y: 50 },
  ],
  LAT: [
    { x: 25, y: 14 },
    { x: 25, y: 86 },
  ],
  VOL: [
    { x: 38, y: 40 },
    { x: 38, y: 60 },
    { x: 36, y: 50 },
  ],
  MEI: [
    { x: 54, y: 26 },
    { x: 54, y: 74 },
    { x: 56, y: 50 },
  ],
  ATA: [
    { x: 72, y: 24 },
    { x: 72, y: 76 },
    { x: 75, y: 50 },
  ],
};

const POSICOES: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

export const CM04_TICKS_PER_SECOND = 20;
const DT = 1 / CM04_TICKS_PER_SECOND;
const MAX_TEMPO = 8.0;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distancia(a: Ponto2D, b: Ponto2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatarNomeCurto(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length === 1) return partes[0]!.slice(0, 11);
  const ultimo = partes[partes.length - 1]!;
  return ultimo.length >= 3 ? ultimo.slice(0, 11) : partes[0]!.slice(0, 11);
}

function normalizarPosicao(raw: string | undefined): Posicao {
  const u = (raw ?? 'MEI').toUpperCase();
  return (POSICOES.includes(u as Posicao) ? u : 'MEI') as Posicao;
}

/** Deterministic PRNG (mulberry32) — stable clips from minute + ids. */
function criarRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function attrsFromPlayer(p: HighlightRosterPlayer): AgenteSimulacao['atributos'] {
  const ovr = 55 + (p.numero % 30);
  return {
    velocidade: ovr,
    passe: ovr,
    chute: ovr,
    defesa: p.posicao === 'GOL' || p.posicao === 'ZAG' ? ovr + 5 : ovr - 10,
  };
}

function instanciarAgentes(
  titulares: HighlightRosterPlayer[],
  lado: 'MANDANTE' | 'VISITANTE',
  atacaParaDireita: boolean,
): AgenteSimulacao[] {
  const contadores: Record<Posicao, number> = {
    GOL: 0,
    ZAG: 0,
    LAT: 0,
    VOL: 0,
    MEI: 0,
    ATA: 0,
  };

  return titulares.slice(0, 11).map((jog, idx) => {
    const posicao = normalizarPosicao(jog.posicao);
    const slots = SLOTS_TATICOS[posicao] || SLOTS_TATICOS.MEI;
    const indiceSlot = contadores[posicao] % slots.length;
    contadores[posicao]++;

    const jitterY =
      contadores[posicao] > slots.length ? (idx % 2 === 0 ? -6 : 6) : 0;
    const rawX = slots[indiceSlot]!.x;
    const rawY = clamp(slots[indiceSlot]!.y + jitterY, 10, 90);

    const x = atacaParaDireita ? rawX : 100 - rawX;
    const y = atacaParaDireita ? rawY : 100 - rawY;

    return {
      id: jog.id,
      numero: jog.numero || idx + 1,
      nomeCurto: formatarNomeCurto(jog.nome),
      time: lado,
      posicao,
      baseX: x,
      baseY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      atributos: attrsFromPlayer({ ...jog, posicao }),
    };
  });
}

function progressoAtaque(bolaX: number, atacanteVaiParaDireita: boolean): number {
  return atacanteVaiParaDireita ? bolaX / 100 : (100 - bolaX) / 100;
}

function faseOrganicaDe(
  fase: 'TROCA_PASSES' | 'CHUTE_EM_CURSO' | 'POS_CHUTE',
  progressoBola: number,
  indicePasse: number,
  cadeiaLen: number,
): FaseOrganica {
  if (fase === 'POS_CHUTE') return 'ENCERRAMENTO';
  if (fase === 'CHUTE_EM_CURSO') return 'FINALIZACAO';
  if (indicePasse >= cadeiaLen - 1 || progressoBola > 0.72) return 'ULTIMO_TERCO';
  if (progressoBola > 0.42 || indicePasse >= 1) return 'PROGRESSAO';
  return 'CONSTRUCAO';
}

/**
 * Full CM04 physical timeline. Match minute stays FROZEN for the clip (6–8.5s).
 */
export function gerarLanceHighlightCM04(params: {
  minuto: number;
  segundoTempo: boolean;
  mandanteTitulares: HighlightRosterPlayer[];
  visitanteTitulares: HighlightRosterPlayer[];
  timeAtacante: 'MANDANTE' | 'VISITANTE';
  desfecho: TipoDesfechoLance;
  autorId?: number;
  assistenteId?: number;
  seed?: number;
}): LanceHighlightCompleto {
  const {
    minuto,
    segundoTempo,
    mandanteTitulares,
    visitanteTitulares,
    timeAtacante,
    desfecho,
    autorId,
    assistenteId,
  } = params;

  const rnd = criarRng(
    params.seed ??
      (Math.floor(minuto * 1000) ^
        (autorId ?? 0) * 2654435761 ^
        (assistenteId ?? 7) * 1597334677),
  );

  // 1st half: home attacks → (x=100); 2nd half: sides flip.
  const mandanteAtacaDireita = !segundoTempo;
  const atacanteVaiParaDireita =
    timeAtacante === 'MANDANTE' ? mandanteAtacaDireita : !mandanteAtacaDireita;
  const dir = atacanteVaiParaDireita ? 1 : -1;
  const golAlvoX = atacanteVaiParaDireita ? 98.5 : 1.5;

  const agentesMandante = instanciarAgentes(
    mandanteTitulares,
    'MANDANTE',
    mandanteAtacaDireita,
  );
  const agentesVisitante = instanciarAgentes(
    visitanteTitulares,
    'VISITANTE',
    !mandanteAtacaDireita,
  );
  const todosAgentes = [...agentesMandante, ...agentesVisitante];

  const atacantes =
    timeAtacante === 'MANDANTE' ? agentesMandante : agentesVisitante;
  const defensores =
    timeAtacante === 'MANDANTE' ? agentesVisitante : agentesMandante;

  const finalizador =
    atacantes.find((a) => a.id === autorId) ||
    atacantes.find((a) => a.posicao === 'ATA') ||
    atacantes[atacantes.length - 1]!;

  const garcom =
    atacantes.find((a) => a.id === assistenteId && a.id !== finalizador.id) ||
    atacantes.find((a) => a.posicao === 'MEI' && a.id !== finalizador.id) ||
    atacantes[Math.max(1, atacantes.length - 3)]!;

  const goleiroRival =
    defensores.find((d) => d.posicao === 'GOL') || defensores[0]!;

  const volantesOuMeias = atacantes.filter(
    (a) =>
      (a.posicao === 'VOL' || a.posicao === 'MEI' || a.posicao === 'LAT') &&
      a.id !== finalizador.id,
  );
  let portador: AgenteSimulacao | null = volantesOuMeias[0] || atacantes[4]!;

  portador.x = 50 - dir * 10;
  portador.y = 35 + rnd() * 30;

  const bola: FrameBola = {
    x: portador.x,
    y: portador.y,
    z: 0,
    estado: 'CONDUCAO',
  };

  const candidatosPasse = volantesOuMeias.filter((a) => a.id !== portador!.id);
  const segundoPassador = candidatosPasse[0] || garcom;
  const terceiroPassador =
    candidatosPasse.find((a) => a.id !== segundoPassador.id) || garcom;

  const cadeiaDePasses: AgenteSimulacao[] = [segundoPassador];
  if (
    terceiroPassador.id !== segundoPassador.id &&
    terceiroPassador.id !== garcom.id
  ) {
    cadeiaDePasses.push(terceiroPassador);
  }
  if (garcom.id !== cadeiaDePasses[cadeiaDePasses.length - 1]!.id) {
    cadeiaDePasses.push(garcom);
  }
  cadeiaDePasses.push(finalizador);

  // 2–3 support runners (not on the primary pass chain)
  const apoios = atacantes
    .filter(
      (a) =>
        a.id !== finalizador.id &&
        a.id !== garcom.id &&
        a.posicao !== 'GOL' &&
        a.posicao !== 'ZAG' &&
        !cadeiaDePasses.some((c) => c.id === a.id),
    )
    .slice(0, 3);

  let indicePasseAtual = 0;
  let alvoPasse: AgenteSimulacao | null = null;
  let pontoDestinoPasse: Ponto2D | null = null;
  let timerAcao = 0.65;
  let fase: 'TROCA_PASSES' | 'CHUTE_EM_CURSO' | 'POS_CHUTE' = 'TROCA_PASSES';
  let alvoChute: Ponto2D = { x: golAlvoX, y: 50 };
  let narracaoPendente: string | undefined = `${portador.nomeCurto} domina e inicia a jogada...`;
  let encerrar = false;

  const frames: KeyframeLance[] = [];
  // Allow a short overrun so CHUTE → POS_CHUTE → ENCERRAMENTO can finish.
  const hardCap = MAX_TEMPO + 2.5;

  for (let t = 0; t <= hardCap + 1e-9; t = Number((t + DT).toFixed(2))) {
    const progressoBola = progressoAtaque(bola.x, atacanteVaiParaDireita);
    const deslocamentoEixoY = (bola.y - 50) * 0.34;

    // Nearest + second cover among outfield defenders
    const marcadores = defensores
      .filter((d) => d.posicao !== 'GOL')
      .map((d) => ({
        d,
        dist: portador ? distancia(d, portador) : distancia(d, bola),
      }))
      .sort((a, b) => a.dist - b.dist);
    const pressorId = marcadores[0]?.d.id;
    const coberturaId = marcadores[1]?.d.id;

    for (const ag of todosAgentes) {
      const ehDoTimeAtacante = ag.time === timeAtacante;
      let targetX = ag.baseX;
      let targetY = ag.baseY;

      if (ag.posicao === 'GOL') {
        targetX = ag.baseX;
        targetY = clamp(50 + (bola.y - 50) * 0.18, 43, 57);
      } else if (ehDoTimeAtacante) {
        const fatorAvanco =
          ag.posicao === 'ZAG'
            ? 22
            : ag.posicao === 'LAT'
              ? 32
              : ag.posicao === 'VOL'
                ? 28
                : ag.posicao === 'MEI'
                  ? 26
                  : 20;

        targetX = clamp(ag.baseX + dir * (progressoBola * fatorAvanco), 12, 93);
        targetY = clamp(ag.baseY + deslocamentoEixoY * 0.75, 8, 92);

        if (ag.id === finalizador.id && indicePasseAtual >= cadeiaDePasses.length - 2) {
          targetX = clamp(golAlvoX - dir * 13, 10, 90);
          targetY = clamp(50 + (ag.baseY > 50 ? 11 : -11), 32, 68);
        }

        if (ag.id === garcom.id && indicePasseAtual >= cadeiaDePasses.length - 3) {
          targetX = clamp(golAlvoX - dir * 24, 15, 85);
          targetY = clamp(ag.baseY < 50 ? 28 : 72, 18, 82);
        }

        // Support runners offer angles ahead of the ball
        const apoioIdx = apoios.findIndex((a) => a.id === ag.id);
        if (apoioIdx >= 0 && fase === 'TROCA_PASSES') {
          const lat = apoioIdx % 2 === 0 ? -1 : 1;
          targetX = clamp(bola.x + dir * (10 + apoioIdx * 4), 14, 90);
          targetY = clamp(50 + lat * (18 + apoioIdx * 6) + deslocamentoEixoY * 0.4, 10, 90);
        }
      } else {
        const recuoDefensivo =
          ag.posicao === 'ZAG'
            ? 14
            : ag.posicao === 'LAT'
              ? 18
              : ag.posicao === 'VOL'
                ? 22
                : ag.posicao === 'MEI'
                  ? 25
                  : 20;

        targetX = clamp(ag.baseX + dir * (progressoBola * recuoDefensivo), 8, 92);
        targetY = clamp(
          50 + (ag.baseY - 50) * 0.78 + deslocamentoEixoY * 0.9,
          12,
          88,
        );
      }

      if (fase === 'TROCA_PASSES') {
        if (bola.estado === 'CONDUCAO' && portador && ag.id === portador.id) {
          const ladoConducao = ag.y > 50 ? -0.35 : 0.35;
          targetX = clamp(ag.x + dir * 7, 15, 88);
          targetY = clamp(ag.y + ladoConducao * 8, 12, 88);
        } else if (
          bola.estado === 'PASSE' &&
          alvoPasse &&
          ag.id === alvoPasse.id &&
          pontoDestinoPasse
        ) {
          targetX = pontoDestinoPasse.x;
          targetY = pontoDestinoPasse.y;
        } else if (!ehDoTimeAtacante && portador) {
          if (ag.id === pressorId) {
            targetX = portador.x + dir * 2.2;
            targetY = portador.y + (ag.y - portador.y) * 0.3;
          } else if (ag.id === coberturaId) {
            // Second cover — shade passing lane toward goal
            targetX = clamp(portador.x + dir * 6, 8, 92);
            targetY = clamp((portador.y + 50) / 2, 16, 84);
          }
        }
      }

      const dx = targetX - ag.x;
      const dy = targetY - ag.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.15) {
        const velBase = 6.5 + (ag.atributos.velocidade / 100) * 4.5;
        const sprint =
          (alvoPasse && ag.id === alvoPasse.id) ||
          ag.id === finalizador.id ||
          ag.id === pressorId
            ? 1.25
            : 0.85;
        const passo = Math.min(dist, velBase * sprint * DT);
        ag.x += (dx / dist) * passo;
        ag.y += (dy / dist) * passo;
      }
    }

    if (fase === 'TROCA_PASSES') {
      if (bola.estado === 'CONDUCAO' && portador) {
        bola.x = portador.x + dir * 0.8;
        bola.y = portador.y;
        bola.z = 0;
        timerAcao -= DT;

        if (timerAcao <= 0) {
          if (indicePasseAtual < cadeiaDePasses.length) {
            const proximoReceptor = cadeiaDePasses[indicePasseAtual]!;
            indicePasseAtual++;

            const avancoPasse =
              proximoReceptor.id === finalizador.id ? dir * 4.5 : dir * 2.5;
            pontoDestinoPasse = {
              x: clamp(proximoReceptor.x + avancoPasse, 10, 92),
              y: clamp(proximoReceptor.y + (rnd() - 0.5) * 4, 12, 88),
            };
            alvoPasse = proximoReceptor;
            bola.estado = 'PASSE';

            const ehInversao = Math.abs(pontoDestinoPasse.y - bola.y) > 32;
            const ehEnfiada = proximoReceptor.id === finalizador.id;
            narracaoPendente = ehEnfiada
              ? `${portador.nomeCurto} acha lindo passe em profundidade para ${proximoReceptor.nomeCurto}!`
              : ehInversao
                ? `${portador.nomeCurto} vira o jogo buscando ${proximoReceptor.nomeCurto}.`
                : `${portador.nomeCurto} toca para ${proximoReceptor.nomeCurto}.`;

            portador = null;
          } else {
            fase = 'CHUTE_EM_CURSO';
            bola.estado = 'CHUTE';
            const cantoY = portador.y < 50 ? 53.5 : 46.5;

            if (desfecho === 'GOL' || desfecho === 'CONTRA_ATAQUE_GOL') {
              alvoChute = { x: golAlvoX + dir * 1.8, y: cantoY };
            } else if (desfecho === 'DEFESA_DIFICIL') {
              alvoChute = { x: goleiroRival.x, y: cantoY };
            } else if (desfecho === 'TRAVE') {
              alvoChute = { x: golAlvoX, y: portador.y < 50 ? 55.2 : 44.8 };
            } else {
              alvoChute = {
                x: golAlvoX + dir * 2,
                y: portador.y < 50 ? 61 : 39,
              };
            }

            narracaoPendente = `${portador.nomeCurto} puxa para a perna boa e solta a bomba!`;
            portador = null;
          }
        }
      } else if (bola.estado === 'PASSE' && alvoPasse && pontoDestinoPasse) {
        const dx = pontoDestinoPasse.x - bola.x;
        const dy = pontoDestinoPasse.y - bola.y;
        const dist = Math.hypot(dx, dy);
        const velPasse = 26;

        bola.z = dist > 12 ? Math.sin(Math.min(1, dist / 35) * Math.PI) * 1.4 : 0;

        if (dist <= velPasse * DT * 1.2) {
          bola.x = alvoPasse.x;
          bola.y = alvoPasse.y;
          bola.z = 0;
          bola.estado = 'CONDUCAO';
          portador = alvoPasse;
          alvoPasse = null;
          pontoDestinoPasse = null;
          timerAcao =
            portador.id === finalizador.id ? 0.35 : 0.6 + rnd() * 0.25;
        } else {
          bola.x += (dx / dist) * velPasse * DT;
          bola.y += (dy / dist) * velPasse * DT;
        }
      }
    } else if (fase === 'CHUTE_EM_CURSO') {
      const dx = alvoChute.x - bola.x;
      const dy = alvoChute.y - bola.y;
      const dist = Math.hypot(dx, dy);
      const velChute = 42;

      goleiroRival.y += clamp(alvoChute.y - goleiroRival.y, -0.45, 0.45);

      if (dist <= velChute * DT * 1.1) {
        bola.x = alvoChute.x;
        bola.y = alvoChute.y;
        fase = 'POS_CHUTE';
        timerAcao = 1.3;

        if (desfecho === 'GOL' || desfecho === 'CONTRA_ATAQUE_GOL') {
          bola.estado = 'GOL';
          narracaoPendente = `GOOOOOOL! ${finalizador.nomeCurto} manda no fundo da rede!`;
        } else if (desfecho === 'DEFESA_DIFICIL') {
          bola.estado = 'DEFESA';
          alvoChute = {
            x: goleiroRival.x - dir * 5,
            y: goleiroRival.y + (rnd() > 0.5 ? 9 : -9),
          };
          narracaoPendente = `ESPALMA ${goleiroRival.nomeCurto}! Que defesaça!`;
        } else if (desfecho === 'TRAVE') {
          bola.estado = 'DEFESA';
          alvoChute = {
            x: golAlvoX - dir * 4,
            y: 50 + (rnd() - 0.5) * 14,
          };
          narracaoPendente = `NA TRAVE! A bola explode no poste e volta para o campo!`;
        } else {
          bola.estado = 'DEFESA';
          narracaoPendente = `PRA FORA! Passou tirando tinta da trave!`;
        }
      } else {
        bola.x += (dx / dist) * velChute * DT;
        bola.y += (dy / dist) * velChute * DT;
        bola.z = Math.sin(Math.min(1, dist / 25) * Math.PI) * 2.2;
      }
    } else if (fase === 'POS_CHUTE') {
      // Rebound / settle after the outcome, then ENCERRAMENTO
      if (
        bola.estado === 'DEFESA' &&
        (desfecho === 'DEFESA_DIFICIL' || desfecho === 'TRAVE')
      ) {
        const dx = alvoChute.x - bola.x;
        const dy = alvoChute.y - bola.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.4) {
          const velReb = 16;
          bola.x += (dx / dist) * velReb * DT;
          bola.y += (dy / dist) * velReb * DT;
          bola.z = Math.max(0, bola.z - 3 * DT);
        } else {
          bola.z = 0;
        }
      } else {
        bola.z = Math.max(0, bola.z - 4 * DT);
      }

      timerAcao -= DT;
      if (timerAcao <= 0) {
        encerrar = true;
        narracaoPendente = narracaoPendente ?? 'ENCERRAMENTO';
      }
    }

    const portadorId = portador?.id;
    const organica = faseOrganicaDe(
      fase,
      progressoBola,
      indicePasseAtual,
      cadeiaDePasses.length,
    );

    frames.push({
      tempoSegundos: t,
      bola: { ...bola },
      jogadores: todosAgentes.map((ag) => ({
        id: ag.id,
        numero: ag.numero,
        nomeCurto: ag.nomeCurto,
        time: ag.time,
        x: ag.x,
        y: ag.y,
        temBola: portadorId === ag.id && bola.estado === 'CONDUCAO',
      })),
      ...(narracaoPendente ? { narracaoInstantanea: narracaoPendente } : {}),
      faseOrganica: encerrar ? 'ENCERRAMENTO' : organica,
    });
    narracaoPendente = undefined;

    if (encerrar) break;

    // If still constructing past MAX_TEMPO, force a shot so the clip can close.
    if (
      t >= MAX_TEMPO &&
      fase === 'TROCA_PASSES' &&
      bola.estado === 'CONDUCAO' &&
      portador
    ) {
      fase = 'CHUTE_EM_CURSO';
      bola.estado = 'CHUTE';
      const cantoY = portador.y < 50 ? 53.5 : 46.5;
      if (desfecho === 'GOL' || desfecho === 'CONTRA_ATAQUE_GOL') {
        alvoChute = { x: golAlvoX + dir * 1.8, y: cantoY };
      } else if (desfecho === 'DEFESA_DIFICIL') {
        alvoChute = { x: goleiroRival.x, y: cantoY };
      } else if (desfecho === 'TRAVE') {
        alvoChute = { x: golAlvoX, y: portador.y < 50 ? 55.2 : 44.8 };
      } else {
        alvoChute = { x: golAlvoX + dir * 2, y: portador.y < 50 ? 61 : 39 };
      }
      narracaoPendente = `${portador.nomeCurto} arrisca de longe!`;
      portador = null;
    }
  }

  // Guarantee ENCERRAMENTO on the tail even if the hard cap hit mid-shot.
  if (frames.length > 0 && frames[frames.length - 1]!.faseOrganica !== 'ENCERRAMENTO') {
    const last = frames[frames.length - 1]!;
    frames.push({
      ...last,
      tempoSegundos: Number((last.tempoSegundos + DT).toFixed(2)),
      faseOrganica: 'ENCERRAMENTO',
      narracaoInstantanea: last.narracaoInstantanea ?? 'ENCERRAMENTO',
    });
  }

  return {
    id: `hl-${minuto}-${timeAtacante}-${desfecho}`,
    minutoCongelado: Math.floor(minuto),
    segundoTempo,
    timeAtacante,
    desfecho,
    duracaoTotalSegundos: frames[frames.length - 1]?.tempoSegundos ?? MAX_TEMPO,
    frames,
    autorId: finalizador.id,
    assistenteId: garcom.id,
  };
}

export function desfechoFromLance(opts: {
  tipo: string;
  highlight?: HighlightLanceMeta | null;
}): TipoDesfechoLance {
  if (opts.tipo === 'gol') return 'GOL';
  if (opts.highlight?.woodwork) return 'TRAVE';
  if (opts.highlight?.hardSave || opts.tipo === 'defesa') return 'DEFESA_DIFICIL';
  return 'CHUTE_FORA';
}

/** Map CM04 keyframes → SimulationFrame[] with FROZEN match clock. */
export function lanceToSimulationFrames(
  lance: LanceHighlightCompleto,
): SimulationFrame[] {
  let lastBanner: string | undefined;
  return lance.frames.map((kf) => {
    if (kf.narracaoInstantanea) lastBanner = kf.narracaoInstantanea;
    const entities: HighlightEntity[] = kf.jogadores.map((j) => ({
      id: j.id,
      nome: j.nomeCurto,
      numero: j.numero,
      lado: j.time === 'MANDANTE' ? 'H' : 'A',
      x: j.x,
      y: j.y,
      temBola: j.temBola,
    }));
    return {
      clock: lance.minutoCongelado,
      ball: { x: kf.bola.x, y: kf.bola.y, z: kf.bola.z },
      entities,
      banner: lastBanner,
      faseOrganica: kf.faseOrganica,
    };
  });
}

export function buildCm04HighlightClip(opts: {
  event: HighlightEventType;
  minuto: number;
  roster: HighlightRoster;
  attackingHome: boolean;
  autorId?: number;
  assistenteId?: number;
  assistenteNome?: string;
  highlight?: HighlightLanceMeta | null;
  tipoLance: string;
}): HighlightClip {
  const segundoTempo = opts.minuto > 45;
  const timeAtacante: 'MANDANTE' | 'VISITANTE' = opts.attackingHome
    ? 'MANDANTE'
    : 'VISITANTE';

  let assistenteId = opts.assistenteId;
  if (assistenteId == null && opts.assistenteNome) {
    const side =
      timeAtacante === 'MANDANTE' ? opts.roster.mandante : opts.roster.visitante;
    const hit = side.find(
      (p) =>
        p.nome === opts.assistenteNome ||
        p.nome.endsWith(opts.assistenteNome!) ||
        opts.assistenteNome!.endsWith(p.nome.split(' ').pop() ?? ''),
    );
    assistenteId = hit?.id;
  }

  const lance = gerarLanceHighlightCM04({
    minuto: opts.minuto,
    segundoTempo,
    mandanteTitulares: opts.roster.mandante,
    visitanteTitulares: opts.roster.visitante,
    timeAtacante,
    desfecho: desfechoFromLance({
      tipo: opts.tipoLance,
      highlight: opts.highlight,
    }),
    autorId: opts.autorId,
    assistenteId,
    seed: Math.floor(opts.minuto * 997) ^ (opts.autorId ?? 13),
  });

  return {
    event: opts.event,
    frames: lanceToSimulationFrames(lance),
    clockAtEvent: lance.minutoCongelado,
  };
}
