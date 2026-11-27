import type { AtletaSub23 } from '../types/aspirantesS23';
import type { JovemSub20 } from '../types/mundoClube';
import type { Jogador } from '../types/schema';
import type { EstadoAspirantesS23 } from '../types/aspirantesS23';
import type { EstadoMundoClube } from '../types/mundoClube';
import type { TimeFicticio } from './types';

/** Vista somente-leitura de atleta Sub-23 como Jogador (perfil / atributos). */
export function atletaSub23ComoVista(a: AtletaSub23): Jogador {
  return {
    id: a.id,
    time_id: a.time_id,
    nome: a.nome,
    idade: a.idade,
    posicao: a.posicao,
    atributos: a.atributos,
    overall: a.overall,
    energia: 100,
    status_escalacao: 'NAO_RELACIONADO',
    valor_mercado: 0,
    salario_mensal: 0,
    nacionalidade: 'Brasil',
    genetica: a.genetica,
    formacaoBase: {
      foco: 'EQUILIBRADO',
      promovidoRodada: a.entradaRodada,
      potencialOvr: a.potencialOvr,
      tier: a.tier,
      precoceEstagnado: a.precoceEstagnado,
      diamanteBruto: a.diamanteBruto,
      criaDaCasa: true,
      minutosProfissional: 0,
      rodadasBancoSeguidas: 0,
      bonsJogosSeguidos: 0,
      pressaoEmpresario: false,
    },
  };
}

/** Vista somente-leitura de jovem Sub-20 como Jogador. */
export function jovemSub20ComoVista(j: JovemSub20, timeId: string): Jogador {
  return {
    id: j.id,
    time_id: timeId,
    nome: j.nome,
    idade: j.idade,
    posicao: j.posicao,
    atributos: j.atributos,
    overall: j.overall,
    energia: 100,
    status_escalacao: 'NAO_RELACIONADO',
    valor_mercado: 0,
    salario_mensal: 0,
    nacionalidade: 'Brasil',
    genetica: j.genetica,
    formacaoBase: {
      foco: j.focoGeracao,
      promovidoRodada: j.entradaRodada,
      potencialOvr: j.potencialOvr,
      tier: j.tier,
      precoceEstagnado: j.precoceEstagnado,
      diamanteBruto: j.diamanteBruto,
      criaDaCasa: true,
      minutosProfissional: 0,
      rodadasBancoSeguidas: 0,
      bonsJogosSeguidos: 0,
      pressaoEmpresario: false,
    },
  };
}

export type OrigemVistaJogador = 'pro' | 'ficticio' | 'sub23' | 'sub20';

export function resolverJogadorPorId(params: {
  id: number;
  jogadoresReais: Jogador[];
  timesFicticios: TimeFicticio[];
  aspirantes: EstadoAspirantesS23 | null;
  mundo: EstadoMundoClube | null;
  clubeRealId: string | null;
}): { jogador: Jogador; origem: OrigemVistaJogador } | null {
  const pro = params.jogadoresReais.find((j) => j.id === params.id);
  if (pro) return { jogador: pro, origem: 'pro' };

  const fic = params.timesFicticios.flatMap((t) => t.jogadores).find((j) => j.id === params.id);
  if (fic) return { jogador: fic, origem: 'ficticio' };

  if (params.aspirantes) {
    for (const elenco of Object.values(params.aspirantes.elencos)) {
      const a = elenco.find((x) => x.id === params.id);
      if (a) return { jogador: atletaSub23ComoVista(a), origem: 'sub23' };
    }
  }

  const sub20 = params.mundo?.base?.elencoSub20?.find((j) => j.id === params.id);
  if (sub20 && params.clubeRealId) {
    return { jogador: jovemSub20ComoVista(sub20, params.clubeRealId), origem: 'sub20' };
  }

  return null;
}
