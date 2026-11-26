import type { EsquemaTatico } from '../types/schema';

export interface DicaSessaoTreino {
  sessaoPrincipalId: string;
  sessaoSecundariaId: string;
  motivo: string;
}

const RETRANCA: EsquemaTatico[] = ['5-4-1', '6-3-1'];

/** Sugestão rápida de microciclo conforme o perfil do próximo adversário. */
export function sugerirSessoesProximoAdversario(
  esquemaAdversario: EsquemaTatico | undefined,
  jogoFora: boolean,
): DicaSessaoTreino {
  if (esquemaAdversario && RETRANCA.includes(esquemaAdversario)) {
    return {
      sessaoPrincipalId: 'FINALIZACAO_INFILTRACAO',
      sessaoSecundariaId: 'BOLA_PARADA_OFENSIVA',
      motivo:
        'Adversário em bloco baixo — trabalhe penetração no último terço e bolas paradas ofensivas (+finalização / perigo em escanteios).',
    };
  }
  if (jogoFora) {
    return {
      sessaoPrincipalId: 'TRANSICAO_CONTRA_ATAQUE',
      sessaoSecundariaId: 'PREVENCAO_LESOES',
      motivo:
        'Jogo fora — priorize transição rápida e gestão de carga para o contra-ataque direto.',
    };
  }
  return {
    sessaoPrincipalId: 'BOLA_PARADA_DEFENSIVA',
    sessaoSecundariaId: 'ORGANIZACAO_DEFENSIVA',
    motivo:
      'Mandante — reforce defesa de bolas paradas e compactação (útil contra rivais fortes no jogo aéreo).',
  };
}