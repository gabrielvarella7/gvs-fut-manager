import {
  multChanceLesaoFisiologista,
  multDuracaoFisioterapeuta,
  multFadigaPreparadorFisico,
  nivelStaff,
} from './staffEfeitos';
import type { EstadoMundoClube } from '../types/mundoClube';
import type { ProfissionalCorpoTecnico } from '../types/training';

export function corpoTecnicoDeMundo(mundo: EstadoMundoClube): ProfissionalCorpoTecnico[] {
  const prep = nivelStaff(mundo, 'PREPARADOR_FISICO');
  const fisio = nivelStaff(mundo, 'FISIOLOGISTA');
  const fisiot = nivelStaff(mundo, 'FISIOTERAPEUTA');
  const med = nivelStaff(mundo, 'MEDICO');

  return [
    {
      cargo: 'PREPARADOR_FISICO',
      nivel: prep,
      efeitos: {
        multiplicador_fadiga_jogo: multFadigaPreparadorFisico(prep),
        multiplicador_chance_lesao: 1,
        multiplicador_tempo_fora: 1,
        preservacao_atributos_pct: 85,
      },
    },
    {
      cargo: 'FISIOLOGISTA',
      nivel: fisio,
      efeitos: {
        multiplicador_fadiga_jogo: 1,
        multiplicador_chance_lesao: multChanceLesaoFisiologista(fisio),
        multiplicador_tempo_fora: 1,
        preservacao_atributos_pct: 85,
      },
    },
    {
      cargo: 'FISIOTERAPEUTA',
      nivel: fisiot,
      efeitos: {
        multiplicador_fadiga_jogo: 1,
        multiplicador_chance_lesao: 1,
        multiplicador_tempo_fora: multDuracaoFisioterapeuta(fisiot),
        preservacao_atributos_pct: 85,
      },
    },
    {
      cargo: 'MEDICO',
      nivel: med,
      efeitos: {
        multiplicador_fadiga_jogo: 1,
        multiplicador_chance_lesao: 1,
        multiplicador_tempo_fora: 1,
        preservacao_atributos_pct: Math.max(55, Math.min(98, 52 + med * 2.4)),
      },
    },
  ];
}